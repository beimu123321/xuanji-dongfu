/**
 * 虚拟形象（人物模型，可由后台「外观设置 → 人物形象」替换）
 *
 * 模型来源：后端上传的 GLB；未上传时用内置的 avatar-tripo.glb
 * （原为 43MB / 149 万三角形的 Tripo 生成模型，经减面管线压到
 *  5.2 万顶点 / 11 万三角形 / 3.14MB）。
 *
 * 风格对齐：模型自带 PBR 贴图，此处统一染一层「生宣暖白」色调并压低金属度，
 * 使之融进青绿水彩画面；夜间模式再把色调压暗一档。
 *
 * 自动适配（见 modelAutoPose.js）：上传的模型朝向、姿势千差万别，
 * 这里用纯几何判据把正脸拧到镜头方向，并在检测到 T-pose 时把手臂收到身侧。
 * 判不准时后台「外观设置」里还有朝向微调滑块可以兜底。
 *
 * 加载方式：**命令式加载，不用 useGLTF 的 Suspense**。
 * 人物模型是异步到位的（先渲染内置模型，接口设置到达后才换成上传的模型）。
 * useGLTF 在「URL 中途切换」时会让组件进入挂起态，而在 R3F 的自定义渲染树里
 * 这种二次挂起不会随 promise 兑现而恢复——表现为模型彻底不显示且毫无报错。
 * 因此这里走 GLTFLoader.loadAsync + 模块级 Promise 缓存，加载期间保留上一个模型，
 * 到位后再整体替换，全程不挂起。
 *
 * 动效：待机呼吸、微摆、悬停放大、点击抱拳行礼 + 随机问候。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useDongfuStore } from '../store/useDongfuStore';
import PALETTE from '../theme/palette';
import { analyzeModel, foldArms, yawToCamera } from './modelAutoPose';

const MODEL_URL = `${import.meta.env.BASE_URL}models/avatar-tripo.glb`;

// 模型原始高度 1.0（y ∈ [-0.5, 0.5]），放大到与洞府尺度相称，
// 并整体上移半个身位，让脚底落在 y=0 的地面上。
// 2.4 是相机在前厅机位（距 7.4、fov 52°）下的观感值：再小会被五枚玉简的氛围压住。
const MODEL_SCALE = 2.4;
const MODEL_LIFT = 0.5 * MODEL_SCALE;

/** 昼：生宣暖白；夜：压暗偏青，与 inkToon 的 uLight=0.74 观感对齐 */
const TINT_DAY = new THREE.Color(PALETTE.paper);
const TINT_NIGHT = new THREE.Color('#B9CFC6');

/**
 * 形变结果按「源几何」缓存：前厅与道籍卷轴前各有一个 Avatar，
 * 共用同一份缓存几何，避免同一次收臂算两遍。
 */
const posedGeoCache = new WeakMap();

/** GLB 场景按 URL 缓存：切场景、双实例、来回切换模型都不重复请求 */
const gltfCache = new Map();

function loadGltfScene(url) {
  let pending = gltfCache.get(url);
  if (!pending) {
    pending = new GLTFLoader()
      .loadAsync(url)
      .then((gltf) => gltf.scene)
      .catch((err) => {
        // 加载失败不应拖垮整个洞府：记一条警告，界面回落为「只有脚下灵光」
        console.warn('[avatar] 人物模型加载失败：', url, err);
        throw err;
      });
    gltfCache.set(url, pending);
  }
  return pending;
}

// 预热内置模型（首屏即可直接拿到场景）
loadGltfScene(MODEL_URL);

/** 命令式取模型场景：url 变化时保留旧场景，新场景到位后再替换 */
function useGltfScene(url) {
  const [scene, setScene] = useState(null);

  useEffect(() => {
    let alive = true;
    loadGltfScene(url)
      .then((next) => {
        if (alive) setScene(next);
      })
      .catch((err) => {
        console.warn('[avatar] 人物模型加载失败：', err);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return scene;
}

export default function Avatar({
  position = [0, 0, 0],
  faceCamera = true,
  inkDensity = 0.6,
  dayNight = 'day',
  interactive = true,
  onGreet,
}) {
  // 人物模型与朝向全部走后端「外观设置」：未上传模型时回落到内置模型，
  // 未设朝向微调时用几何自动定向。
  const appearance = useDongfuStore((s) => s.data.settings?.appearance);
  const url = appearance?.avatarModel || MODEL_URL;
  const yawAdjust = ((Number(appearance?.avatarYaw) || 0) * Math.PI) / 180;
  const wantFold = (appearance?.avatarPose || 'auto') !== 'raw';

  const scene = useGltfScene(url);
  const liteMode = useDongfuStore((s) => s.liteMode);
  const innerRef = useRef(null);
  const outerRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const camera = useThree((s) => s.camera);

  // 材质接管：clone 一份再改，避免污染 loader 的共享缓存
  //（前厅与道籍卷轴前各有一个 Avatar，共用同一份缓存场景）。
  // clone(true) 共享几何与材质引用，收臂要写顶点，故几何也要各自 clone 一份，
  // 且同一份源几何的形变结果进 WeakMap 缓存，两个实例共用。
  const model = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone(true);
    const analysis = analyzeModel(clone);

    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      const tweak = (m) => {
        const c = m.clone();
        c.metalness = 0.06;
        c.roughness = 0.82;
        c.envMapIntensity = 0.4;
        c.color.copy(TINT_DAY);
        // 模型来自 AI 生成导出，不保证三角形绕序；双面渲染确保任何角度都不破面。
        // （单面渲染时若绕序反了，正面全被剔除，模型会整体消失。）
        c.side = THREE.DoubleSide;
        return c;
      };
      // 注意：单材质的 mesh 绝不能包成数组再塞回去——three 的渲染与射线拾取都会
      // 按 geometry.groups 逐组取材质，groups 为空时一个 draw item 都不会产生，
      // 表现为「模型挂载正常、变换正确、就是不渲染也点不到」。
      obj.material = Array.isArray(obj.material) ? obj.material.map(tweak) : tweak(obj.material);

      if (wantFold && analysis && analysis.armSpread) {
        const src = obj.geometry;
        let posed = posedGeoCache.get(src);
        if (!posed) {
          posed = src.clone();
          foldArms([{ isMesh: true, geometry: posed }], analysis);
          posedGeoCache.set(src, posed);
        }
        obj.geometry = posed;
      }
    });
    return { clone, analysis };
  }, [scene, wantFold]);

  useEffect(() => {
    if (!model) return undefined;
    return () => {
      model.clone.traverse((obj) => {
        if (!obj.isMesh) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose());
      });
    };
  }, [model]);

  // 姿态把模型拧到正面朝镜头。公转 ±15° 时人物会跟着轻轻侧头，观感更自然
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    if (!outerRef.current || !model) return;
    if (faceCamera) {
      outerRef.current.getWorldPosition(worldPos);
      const base = yawToCamera(model.analysis, worldPos, camera.position);
      // 平滑跟随，避免切场景时「唰」地一下转过去
      const target = base + yawAdjust;
      const cur = outerRef.current.rotation.y;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      outerRef.current.rotation.y = cur + diff * Math.min(1, delta * 3);
    } else {
      outerRef.current.rotation.y = (model.analysis ? model.analysis.autoYaw : 0) + yawAdjust;
    }
  });

  // 待机动画与昼夜色调。
  // 注意：innerRef 上同时挂着 scale（MODEL_SCALE × 悬停缩放）与 position（抬升 + 呼吸），
  // 所有写入口都必须在此基础上叠加，不能直接 setScalar/set，否则会把模型的尺寸与站位抹掉。
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (innerRef.current) {
      if (liteMode) {
        innerRef.current.position.y = MODEL_LIFT;
        innerRef.current.rotation.z = 0;
      } else {
        innerRef.current.position.y = MODEL_LIFT + Math.sin(t * 1.1) * 0.02;
        innerRef.current.rotation.z = Math.sin(t * 0.6) * 0.01;
      }
    }

    if (!model) return;
    const target = dayNight === 'day' ? TINT_DAY : TINT_NIGHT;
    const k = Math.min(1, delta * 1.6);
    model.clone.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.isMeshStandardMaterial) m.color.lerp(target, k);
      });
    });
  });

  // 悬停：在基础缩放上轻微放大
  const scaleRef = useRef(1);
  useFrame((_, delta) => {
    const want = hovered && interactive ? 1.04 : 1;
    const k = Math.min(1, delta * 6);
    scaleRef.current += (want - scaleRef.current) * k;
    innerRef.current?.scale.setScalar(MODEL_SCALE * scaleRef.current);
  });

  /** 抱拳行礼：俯身一拜 + 随机问候 */
  const handleClick = (event) => {
    if (!interactive) return;
    event.stopPropagation();
    const node = innerRef.current;
    if (node && !liteMode) {
      gsap.killTweensOf(node.rotation);
      gsap.killTweensOf(node.position);
      const tl = gsap.timeline();
      tl.to(node.rotation, { x: 0.42, duration: 0.42, ease: 'power2.out' })
        .to(node.rotation, { x: 0, duration: 0.55, ease: 'power2.inOut' })
        .to(node.position, { y: MODEL_LIFT - 0.08, duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0);
    }
    onGreet?.();
  };

  return (
    <group
      ref={outerRef}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      {model && (
        <group ref={innerRef} scale={MODEL_SCALE} position={[0, MODEL_LIFT, 0]}>
          <primitive object={model.clone} />
        </group>
      )}

      {/* 脚下灵光 */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.86, 40]} />
        <meshBasicMaterial
          color={PALETTE.gold}
          transparent
          opacity={hovered && interactive ? 0.42 : 0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
