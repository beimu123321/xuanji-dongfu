/**
 * 前厅点缀：祥云、飞鸟、花草。
 *
 * 原先前厅只有虚影 + 五枚玉简 + 地面，横向空得很。这里补三样远景/近景：
 *   · 云   —— 中景横铺的祥云，缓慢漂移，始终朝向镜头
 *   · 鸟   —— 高处两群远山雀，沿各自的圆轨迹盘旋
 *   · 花草 —— 地面上成丛的草叶与几片荷叶，随呼吸轻摆
 *
 * 全部走程序化贴图与合并几何，不引额外静态资源；
 * 布局用固定 seed 的伪随机生成，重渲染不会跳位。
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getBirdTexture, getCloudTexture } from '../utils/textures';

/** 确定性伪随机：同一 seed 每次渲染出的布局一致 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------- 云 ------------------------------- */

function Clouds({ liteMode }) {
  const tex = useMemo(() => getCloudTexture(), []);
  const camera = useThree((s) => s.camera);
  const groupRef = useRef(null);

  const items = useMemo(() => {
    const rand = mulberry32(0x5c10ad);
    const n = liteMode ? 4 : 7;
    return Array.from({ length: n }, () => ({
      x: (rand() - 0.5) * 34,
      y: 3.4 + rand() * 4.6,
      z: -8 - rand() * 15,
      w: 5.5 + rand() * 5.5,
      drift: 0.05 + rand() * 0.08,
      phase: rand() * Math.PI * 2,
      opacity: 0.42 + rand() * 0.3,
    }));
  }, [liteMode]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.children.forEach((child, i) => {
      const it = items[i];
      child.position.x = it.x + Math.sin(t * it.drift + it.phase) * 3.4;
      child.position.y = it.y + Math.sin(t * it.drift * 0.6 + it.phase) * 0.45;
      // 云是面片，必须始终正对镜头，否则镜头公转时会看到它变成一条线
      child.quaternion.copy(camera.quaternion);
    });
  });

  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y, it.z]} scale={[it.w, it.w * 0.46, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={it.opacity}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------- 鸟 ------------------------------- */

function Birds({ liteMode }) {
  const tex = useMemo(() => getBirdTexture(), []);
  const camera = useThree((s) => s.camera);
  const groupRef = useRef(null);

  const flocks = useMemo(() => {
    const rand = mulberry32(0x4207);
    const n = liteMode ? 1 : 2;
    return Array.from({ length: n }, (_, i) => ({
      cx: (rand() - 0.5) * 9,
      cy: 5.3 + i * 1.35 + rand() * 1.1,
      cz: -11.5 - rand() * 5,
      rx: 9 + rand() * 5,
      rz: 3.5 + rand() * 2.5,
      speed: (0.05 + rand() * 0.04) * (i % 2 === 0 ? 1 : -1),
      phase: rand() * Math.PI * 2,
      w: 5.2 + rand() * 2.6,
      opacity: 0.52 + rand() * 0.25,
    }));
  }, [liteMode]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.children.forEach((child, i) => {
      const f = flocks[i];
      const ang = f.phase + t * f.speed;
      child.position.set(f.cx + Math.cos(ang) * f.rx, f.cy + Math.sin(ang * 1.7) * 0.35, f.cz + Math.sin(ang) * f.rz);
      child.quaternion.copy(camera.quaternion);
    });
  });

  return (
    <group ref={groupRef}>
      {flocks.map((f, i) => (
        <mesh key={i} position={[f.cx + f.rx, f.cy, f.cz]} scale={[f.w, f.w * 0.5, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={f.opacity}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------ 花草 ------------------------------ */

/**
 * 一丛草：7 片叶子合并成一个几何体（一次 draw call）。
 * 每片叶子三排顶点（根 / 中段 / 尖），顶宽收到根宽的 12% 形成叶尖，
 * 中段与尖端各带一点 z 偏移做出弯势；顶点色从根部深青绿渐变到叶尖浅绿。
 */
function grassTuftGeometry(seed) {
  const rand = mulberry32(seed);
  const positions = [];
  const colors = [];
  const indices = [];
  const base = new THREE.Color('#4E8F63');
  const tip = new THREE.Color('#A6DDA9');
  const v = new THREE.Vector3();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  let vi = 0;

  for (let b = 0; b < 7; b += 1) {
    const hgt = 0.32 + rand() * 0.5;
    const hw = 0.018 + rand() * 0.015;
    const yaw = rand() * Math.PI * 2;
    const tilt = (rand() - 0.5) * 0.6;
    const ox = (rand() - 0.5) * 0.2;
    const oz = (rand() - 0.5) * 0.2;
    const bend = (rand() - 0.5) * 0.34;
    e.set(tilt, yaw, 0);

    const rows = [
      { y: 0, w: hw, z: 0 },
      { y: hgt * 0.55, w: hw * 0.6, z: bend * 0.3 },
      { y: hgt, w: hw * 0.12, z: bend },
    ];
    rows.forEach((row) => {
      [-1, 1].forEach((side) => {
        v.set(side * row.w, row.y, row.z).applyEuler(e);
        positions.push(v.x + ox, v.y, v.z + oz);
        c.copy(base).lerp(tip, Math.min(1, row.y / hgt + (rand() - 0.5) * 0.18));
        colors.push(c.r, c.g, c.b);
      });
    });

    const o = vi;
    indices.push(o + 0, o + 1, o + 3, o + 0, o + 3, o + 2);
    indices.push(o + 2, o + 3, o + 5, o + 2, o + 5, o + 4);
    vi += 6;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function Tuft({ x, z, scale, seed, swaySpeed, swayPhase }) {
  const geo = useMemo(() => grassTuftGeometry(seed), [seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * swaySpeed + swayPhase) * 0.055;
    ref.current.rotation.x = Math.cos(t * swaySpeed * 0.8 + swayPhase) * 0.04;
  });
  return (
    <mesh ref={ref} geometry={geo} position={[x, 0, z]} scale={scale}>
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function Plants({ liteMode }) {
  // 成丛分布：先撒几个丛心，再在丛心周围散几株。
  // 均匀撒点会变成一圈孤零零的草，成丛才像地被。
  const layout = useMemo(() => {
    const rand = mulberry32(0x9e37);
    const clusters = liteMode ? 6 : 11;
    const per = liteMode ? 2 : 3;
    const tufts = [];
    for (let c = 0; c < clusters; c += 1) {
      const a0 = (c / clusters) * Math.PI * 2 + rand() * 0.7;
      const r0 = 2.0 + rand() * 8.6;
      const cx = Math.cos(a0) * r0;
      const cz = Math.sin(a0) * r0 * 0.8;
      for (let k = 0; k < per; k += 1) {
        tufts.push({
          x: cx + (rand() - 0.5) * 1.15,
          z: cz + (rand() - 0.5) * 1.15,
          scale: 0.75 + rand() * 0.8,
          seed: 1000 + c * 53 + k * 17,
          swaySpeed: 0.5 + rand() * 0.5,
          swayPhase: rand() * Math.PI * 2,
        });
      }
    }
    return tufts;
  }, [liteMode]);

  // 荷叶：留一道缺口（thetaStart/thetaLength 少画一段），
  // 实心圆片在俯视机位下会读成"地上的一摊绿水"
  const pads = useMemo(() => {
    const rand = mulberry32(0x77aa);
    return Array.from({ length: liteMode ? 4 : 9 }, (_, i) => {
      const a = rand() * Math.PI * 2;
      const r = 2.4 + rand() * 5.2;
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r * 0.85,
        s: 0.16 + rand() * 0.14,
        rot: rand() * Math.PI,
        key: i,
      };
    });
  }, [liteMode]);

  return (
    <group>
      {layout.map((t) => (
        <Tuft key={t.seed} {...t} />
      ))}
      {pads.map((p) => (
        <group key={p.key} position={[p.x, 0.035, p.z]} rotation={[-Math.PI / 2, 0, p.rot]}>
          <mesh>
            <circleGeometry args={[p.s, 14, 0.34, Math.PI * 2 - 0.68]} />
            <meshBasicMaterial
              color="#63A87C"
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0, -0.004]}>
            <circleGeometry args={[p.s * 1.06, 14, 0.34, Math.PI * 2 - 0.68]} />
            <meshBasicMaterial
              color="#3F7C5C"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function HallDecor({ liteMode = false }) {
  return (
    <group>
      <Clouds liteMode={liteMode} />
      <Birds liteMode={liteMode} />
      <Plants liteMode={liteMode} />
    </group>
  );
}
