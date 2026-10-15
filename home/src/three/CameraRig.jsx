/**
 * 镜头控制系统（文档 3.8.1）
 * - GSAP 插值相机 position 与 lookAt，统一缓动 power2.inOut
 * - 前厅待机时绕虚拟形象缓慢公转（周期 20s，偏移 ±15°）
 * - 鼠标移动时镜头轻微跟随偏移
 * - 精简模式下关闭待机公转与跟随
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { SCENES, useDongfuStore } from '../store/useDongfuStore';

/** 各场景镜头关键帧：[相机位置, 注视点] */
export const CAMERA_KEYS = {
  [SCENES.GATE]: { pos: [0, 2.6, 15.5], target: [0, 2.3, 8.4] },
  [SCENES.HALL]: { pos: [0, 2.15, 7.4], target: [0, 1.42, 0] },
  [SCENES.PROFILE]: { pos: [-2.6, 3.2, 4.6], target: [-7.0, 3.2, 0.2] },
  [SCENES.EXPERIENCE]: { pos: [2.5, 2.2, 4.9], target: [6.8, 2.05, 0.2] },
  [SCENES.PROJECT]: { pos: [0, 2.7, -6.2], target: [0, 1.95, -12.2] },
  [SCENES.CONTACT]: { pos: [0, 2.95, -14.4], target: [0, 2.8, -20.6] },
};

const ORBIT_PERIOD = 20; // 秒
const ORBIT_AMPLITUDE = (15 * Math.PI) / 180; // ±15°

/** 把关键帧展开为 GSAP 可插值的扁平对象 */
function toFlat(key) {
  return {
    x: key.pos[0],
    y: key.pos[1],
    z: key.pos[2],
    tx: key.target[0],
    ty: key.target[1],
    tz: key.target[2],
  };
}

export default function CameraRig() {
  const scene = useDongfuStore((s) => s.scene);
  const transitioning = useDongfuStore((s) => s.transitioning);
  const liteMode = useDongfuStore((s) => s.liteMode);
  const { camera } = useThree();

  // GSAP 驱动的基准值
  const base = useRef(toFlat(CAMERA_KEYS[SCENES.GATE]));
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  // 场景切换 → 镜头转场（1.2s，带运动模糊观感的快速插值）
  useEffect(() => {
    const key = CAMERA_KEYS[scene] || CAMERA_KEYS[SCENES.HALL];
    const tween = gsap.to(base.current, {
      x: key.pos[0],
      y: key.pos[1],
      z: key.pos[2],
      tx: key.target[0],
      ty: key.target[1],
      tz: key.target[2],
      duration: 1.2,
      ease: 'power2.inOut',
      overwrite: true,
    });
    return () => {
      tween.kill();
    };
  }, [scene]);

  // 开发期调试钩子：便于在浏览器中检视镜头落点（生产构建会被剔除）
  useEffect(() => {
    if (import.meta.env.DEV) window.__xuanjiCamera = camera;
  }, [camera]);

  // 鼠标位置归一化
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // 待机公转（仅前厅，且非转场、非精简模式）
    let angle = 0;
    if (scene === SCENES.HALL && !transitioning && !liteMode) {
      angle = Math.sin((t / ORBIT_PERIOD) * Math.PI * 2) * ORBIT_AMPLITUDE;
    }

    // 平滑鼠标跟随
    const followEnabled = !liteMode && !transitioning;
    const k = Math.min(1, delta * 3.2);
    smooth.current.x += ((followEnabled ? pointer.current.x : 0) - smooth.current.x) * k;
    smooth.current.y += ((followEnabled ? pointer.current.y : 0) - smooth.current.y) * k;

    const dx = base.current.x - base.current.tx;
    const dz = base.current.z - base.current.tz;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const rx = dx * ca + dz * sa;
    const rz = -dx * sa + dz * ca;

    const px = base.current.tx + rx + smooth.current.x * 0.55;
    const py = base.current.y - smooth.current.y * 0.28;
    const pz = base.current.tz + rz;

    camera.position.set(px, py, pz);
    camera.lookAt(
      base.current.tx + smooth.current.x * 0.7,
      base.current.ty - smooth.current.y * 0.35,
      base.current.tz,
    );
  });

  return null;
}
