/**
 * 人物模型自动适配：正脸朝向 + 手臂姿势
 *
 * 用户上传的 GLB 千奇百怪（Tripo / Mixamo / 各版本 Blender 导出），
 * 常见的两类问题：
 *   1. 朝向不一致——有的面朝 +z，有的面朝 +x，甚至面朝 -z；
 *   2. 姿势是 T-pose（双臂平举）——放进洞府里很违和。
 *
 * 这里用纯几何判据自动把两者都修好，判据全部来自顶点位置，不依赖命名与骨骼：
 *
 * 朝向：
 *   a. 肩带（身高 68%~84%）里，水平跨度更大的那条轴就是「左右轴」——
 *      手臂摊开时这一侧的跨度远大于另一侧（人形正面本来就是瘦长的）。
 *   b. 另一条水平轴即「前后轴」。正脸一侧的面部与胸口曲面更碎、顶点更密
 *      （鼻、眼、唇、衣襟），且上半身质心会向正前方偏移；综合两者的符号定正负。
 *   c. 由正脸所在轴换算成「绕 Y 转多少度后面朝镜头（+z）」。
 *
 * 姿势：
 *   仅在检测到 T-pose（左右轴跨度 / 前后轴跨度 > ARM_SPREAD_RATIO）时收臂：
 *   把肩带内偏离躯干的顶点绕「前后轴」旋一个固定角度，绕肩关节为轴，
 *   于是手臂从平举收成自然下垂。角度与枢轴都从实测分位数取，不写死坐标。
 *
 * 几何会被就地修改，调用方必须传入**克隆出来的**网格（本模块只做修改，
 * 不负责克隆；同一 URL 的形变结果由调用方缓存复用）。
 */
import * as THREE from 'three';

/** 身高归一化后的躯干带（腰腹，用于量躯干半宽） */
const TORSO_BAND = [0.45, 0.62];
/** 身高归一化后的肩/臂带 */
const ARM_BAND = [0.68, 0.84];
/** 头/胸带：用来判断正脸在哪一侧 */
const FACE_BAND = [0.6, 0.97];
/** 左右跨度 / 前后跨度 超过这个比值就认为是在摊手 */
const ARM_SPREAD_RATIO = 1.8;
/** 收臂角度：绕前后轴旋转，把平举的手臂压到身侧。
 *  60° 只把手臂压到「斜下 30°」，看着仍像摊手；77° 才真正垂到身侧，
 *  肩部的拉伸在低模上几乎看不出来。 */
const ARM_FOLD_ANGLE = 1.34; // ≈ 77°

/** 收集场景里所有带几何的网格，返回 [{ mesh, geometry }] */
function collectMeshes(root) {
  const out = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry && obj.geometry.attributes.position) out.push(obj);
  });
  return out;
}

/** 由顶点数组求出 y 的范围与高度；顺便给出整体包围盒 */
function measure(positions) {
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    const y = positions[i];
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  return { yMin, yMax, height: yMax - yMin };
}

/**
 * 分析模型朝向与姿势。
 * @param {THREE.Object3D} root useGLTF 取出的场景（或其克隆）
 * @returns {{ok:boolean, lrAxis:'x'|'z', fbAxis:'x'|'z', frontSign:1|-1,
 *            autoYaw:number, armSpread:boolean, shoulderY:number, torsoHalf:number, height:number}|null}
 */
export function analyzeModel(root) {
  const meshes = collectMeshes(root);
  if (meshes.length === 0) return null;

  // ---- 全部顶点先过一遍，拿到身高 ----
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes.position.array;
    const m = measure(pos);
    if (m.yMin < yMin) yMin = m.yMin;
    if (m.yMax > yMax) yMax = m.yMax;
  }
  const height = yMax - yMin;
  if (!(height > 1e-6)) return null;

  const t = (y) => (y - yMin) / height;

  // ---- 肩带 / 躯干带的统计 ----
  const arm = { xMin: Infinity, xMax: -Infinity, zMin: Infinity, zMax: -Infinity, ySum: 0, count: 0 };
  const torso = { lrAbs: [] };
  // 正脸判据：上半身质心偏移 + 外法线分布（面部曲面更碎、朝外的面片更多）
  const face = { xSum: 0, xAbs: 0, zSum: 0, zAbs: 0, plusX: 0, minusX: 0, plusZ: 0, minusZ: 0 };

  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes.position.array;
    const nrm = mesh.geometry.attributes.normal;
    const normals = nrm ? nrm.array : null;
    const count = pos.length / 3;
    for (let i = 0; i < count; i++) {
      const x = pos[i * 3];
      const y = pos[i * 3 + 1];
      const z = pos[i * 3 + 2];
      const band = t(y);
      if (band >= ARM_BAND[0] && band < ARM_BAND[1]) {
        if (x < arm.xMin) arm.xMin = x;
        if (x > arm.xMax) arm.xMax = x;
        if (z < arm.zMin) arm.zMin = z;
        if (z > arm.zMax) arm.zMax = z;
        arm.ySum += y;
        arm.count += 1;
      } else if (band >= TORSO_BAND[0] && band < TORSO_BAND[1]) {
        torso.lrAbs.push(Math.abs(x), Math.abs(z));
      }
      if (band >= FACE_BAND[0] && band < FACE_BAND[1]) {
        face.xSum += x;
        face.xAbs += Math.abs(x);
        face.zSum += z;
        face.zAbs += Math.abs(z);
        if (normals) {
          const nx = normals[i * 3];
          const nz = normals[i * 3 + 2];
          if (nx > 0.55) face.plusX += 1;
          else if (nx < -0.55) face.minusX += 1;
          if (nz > 0.55) face.plusZ += 1;
          else if (nz < -0.55) face.minusZ += 1;
        }
      }
    }
  }

  if (arm.count < 200) return null;

  const spanX = arm.xMax - arm.xMin;
  const spanZ = arm.zMax - arm.zMin;
  // 左右轴 = 肩带里摊得更开的那条
  const lrAxis = spanZ >= spanX ? 'z' : 'x';
  const fbAxis = lrAxis === 'z' ? 'x' : 'z';

  // 躯干半宽：取躯干带 |坐标| 的 92 分位（避开裙摆的少量外扩点）
  torso.lrAbs.sort((a, b) => a - b);
  const torsoHalf = torso.lrAbs[Math.floor(torso.lrAbs.length * 0.92)] || 0;

  // ---- 正脸在哪一侧 ----
  let frontSign = 0;
  const fbSum = fbAxis === 'x' ? face.xSum : face.zSum;
  const fbAbs = fbAxis === 'x' ? face.xAbs : face.zAbs;
  if (fbAbs > 1e-9) {
    // 上半身质心朝正脸一侧偏（胸口、下颏比后脑、后背突出）
    const centroidBias = fbSum / fbAbs;
    // 外法线分布：鼻子/嘴唇/衣襟让正脸一侧的朝外面片更多
    const plus = fbAxis === 'x' ? face.plusX : face.plusZ;
    const minus = fbAxis === 'x' ? face.minusX : face.minusZ;
    const densityBias = plus + minus > 200 ? (plus - minus) / (plus + minus) : 0;
    frontSign = Math.sign(centroidBias * 0.45 + densityBias * 0.55);
  }
  if (frontSign === 0) frontSign = 1; // 判不出来时按模型原始朝向，交给后台微调

  // ---- 由正脸方向换算成「面朝 +z（镜头）」的 yaw ----
  let autoYaw = 0;
  if (fbAxis === 'x') {
    autoYaw = frontSign > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    autoYaw = frontSign > 0 ? 0 : Math.PI;
  }

  // ---- 是否在摊手 ----
  const lrSpan = lrAxis === 'z' ? spanZ : spanX;
  const fbSpan = lrAxis === 'z' ? spanX : spanZ;
  const armSpread = fbSpan > 1e-6 && lrSpan / fbSpan > ARM_SPREAD_RATIO;

  return {
    ok: true,
    lrAxis,
    fbAxis,
    frontSign,
    autoYaw,
    armSpread,
    shoulderY: arm.count > 0 ? arm.ySum / arm.count : 0,
    torsoHalf,
    height,
  };
}

/**
 * 收臂：把 T-pose 的手臂绕肩关节旋到身侧。
 * 只动肩带内、水平偏离躯干超过 1.25 倍躯干半宽的顶点（法线同步旋转）。
 *
 * @param {THREE.Object3D|THREE.Mesh[]} target 已克隆的场景（几何可安全就地修改），或网格数组
 * @param {ReturnType<typeof analyzeModel>} analysis
 * @returns {boolean} 是否真的改了顶点
 */
export function foldArms(target, analysis) {
  if (!analysis || !analysis.armSpread) return false;
  const meshes = Array.isArray(target) ? target : collectMeshes(target);
  const { lrAxis, fbAxis, torsoHalf, shoulderY } = analysis;
  if (!(torsoHalf > 1e-6)) return false;

  const reach = torsoHalf * 1.25;
  const axisVec = new THREE.Vector3(1, 0, 0);
  const pivot = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const n = new THREE.Vector3();
  let moved = false;

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    const nrmAttr = geo.attributes.normal;
    const pos = posAttr.array;
    const normals = nrmAttr ? nrmAttr.array : null;
    const count = pos.length / 3;

    // 高度带按本网格的 y 范围归一化（单网格模型与多网格模型都对）
    let gyMin = Infinity;
    let gyMax = -Infinity;
    for (let i = 1; i < pos.length; i += 3) {
      if (pos[i] < gyMin) gyMin = pos[i];
      if (pos[i] > gyMax) gyMax = pos[i];
    }
    const gHeight = gyMax - gyMin;
    if (!(gHeight > 1e-6)) continue;
    const shouldFold = (y) => (y - gyMin) / gHeight >= ARM_BAND[0] && (y - gyMin) / gHeight < ARM_BAND[1];

    for (let i = 0; i < count; i++) {
      const x = pos[i * 3];
      const y = pos[i * 3 + 1];
      const z = pos[i * 3 + 2];
      if (!shouldFold(y)) continue;
      const side = lrAxis === 'z' ? z : x;
      if (Math.abs(side) <= reach) continue; // 躯干，不碰

      // 过渡带：从躯干外缘平滑升到满角度。
      // 太窄（0.25 倍躯干半宽）会把肩头的剪切挤成一道折痕，
      // 太宽（1.1 倍）会让整条袖子弯成扇形；0.55 倍 ≈ 上臂近端的一小段。
      const raw = Math.min(1, (Math.abs(side) - reach) / (torsoHalf * 0.55));
      const w = raw * raw * (3 - 2 * raw);

      // 枢轴取在躯干外缘的肩关节处：枢轴上的顶点位移恒为 0，
      // 于是躯干与手臂之间天然连续，不会出现塌陷或自交。
      pivot.set(lrAxis === 'z' ? 0 : Math.sign(side) * torsoHalf, shoulderY, lrAxis === 'z' ? Math.sign(side) * torsoHalf : 0);
      offset.set(x - pivot.x, y - pivot.y, z - pivot.z);
      // 绕前后轴旋转：左右轴正侧的手臂往负 y 压，负侧往正 y 压，
      // 用「侧别 × 前后轴」当旋转轴，两侧就能用同一个正角度。
      axisVec.set(fbAxis === 'x' ? 1 : 0, 0, fbAxis === 'x' ? 0 : 1).multiplyScalar(Math.sign(side));
      quat.setFromAxisAngle(axisVec, ARM_FOLD_ANGLE * w);
      offset.applyQuaternion(quat); // ← 之前漏了这一行，四元数算完没作用回顶点
      pos[i * 3] = pivot.x + offset.x;
      pos[i * 3 + 1] = pivot.y + offset.y;
      pos[i * 3 + 2] = pivot.z + offset.z;
      if (normals) {
        n.set(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]).applyQuaternion(quat);
        normals[i * 3] = n.x;
        normals[i * 3 + 1] = n.y;
        normals[i * 3 + 2] = n.z;
      }
      moved = true;
    }
    if (moved) {
      posAttr.needsUpdate = true;
      if (nrmAttr) nrmAttr.needsUpdate = true;
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
    }
  }
  return moved;
}

/**
 * 面朝镜头所需的 yaw。
 * @param {ReturnType<typeof analyzeModel>} analysis
 * @param {THREE.Vector3} groupWorld 人物所在的世界坐标
 * @param {THREE.Vector3} camPos 相机世界坐标
 */
export function yawToCamera(analysis, groupWorld, camPos) {
  const dx = camPos.x - groupWorld.x;
  const dz = camPos.z - groupWorld.z;
  if (Math.hypot(dx, dz) < 1e-4) return analysis ? analysis.autoYaw : 0;
  const delta = Math.atan2(dx, dz); // 把局部 +z 拧到指向相机的水平方向
  return (analysis ? analysis.autoYaw : 0) + delta;
}
