/**
 * 山石为壁：低多边形岩壁 + 洞顶钟乳（文档 3.1.3 山石材质）
 * 使用固定种子的伪随机，保证每次进入洞府地貌一致。
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createInkMaterial } from '../shaders/inkToon';
import { useDongfuStore } from '../store/useDongfuStore';

/** mulberry32：确定性伪随机 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function InkMountains({ inkDensity = 0.6, dayNight = 'night' }) {
  const liteMode = useDongfuStore((s) => s.liteMode);

  const material = useMemo(
    () =>
      createInkMaterial({
        color: '#1E2A33',
        edgeColor: '#080B0E',
        rimColor: '#C9A961',
        rimStrength: 0.16,
        ink: inkDensity,
        opacity: 1,
        breathe: 0,
        transparent: false,
      }),
    [inkDensity],
  );

  const deepMaterial = useMemo(
    () =>
      createInkMaterial({
        color: '#141C23',
        edgeColor: '#05080A',
        rimColor: '#C9A961',
        rimStrength: 0.08,
        ink: Math.min(1, inkDensity + 0.2),
        opacity: 1,
        breathe: 0,
        transparent: false,
      }),
    [inkDensity],
  );

  useEffect(() => () => {
    material.dispose();
    deepMaterial.dispose();
  }, [material, deepMaterial]);

  // 岩壁
  const rocks = useMemo(() => {
    const rand = mulberry32(20261014);
    const list = [];
    const count = liteMode ? 22 : 40;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.18;
      const radius = 20 + rand() * 13;
      const height = 5 + rand() * 13;
      const radialSegments = 4 + Math.floor(rand() * 4);
      list.push({
        key: `rock-${i}`,
        position: [Math.cos(angle) * radius, height / 2 - 1.6, Math.sin(angle) * radius - 4],
        rotation: [0, rand() * Math.PI, (rand() - 0.5) * 0.12],
        scale: [1.4 + rand() * 3.2, height, 1.4 + rand() * 3.2],
        segments: radialSegments,
        deep: rand() > 0.55,
      });
    }
    return list;
  }, [liteMode]);

  // 洞顶钟乳
  const stalactites = useMemo(() => {
    const rand = mulberry32(77123);
    const list = [];
    const count = liteMode ? 10 : 18;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.4;
      const radius = 6 + rand() * 16;
      const length = 1.6 + rand() * 4.2;
      list.push({
        key: `stal-${i}`,
        position: [Math.cos(angle) * radius, 11 + rand() * 1.6 - length / 2, Math.sin(angle) * radius - 4],
        scale: [0.6 + rand() * 1.1, length, 0.6 + rand() * 1.1],
        segments: 4 + Math.floor(rand() * 3),
      });
    }
    return list;
  }, [liteMode]);

  // 昼夜光照系数
  const targetLight = dayNight === 'day' ? 1.18 : 0.72;
  const lightRef = useRef(targetLight);

  useFrame((_state, delta) => {
    lightRef.current += (targetLight - lightRef.current) * Math.min(1, delta * 1.6);
    material.uniforms.uLight.value = lightRef.current;
    deepMaterial.uniforms.uLight.value = lightRef.current;
  });

  return (
    <group>
      {rocks.map((rock) => (
        <mesh
          key={rock.key}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
          material={rock.deep ? deepMaterial : material}
        >
          <coneGeometry args={[1, 1, rock.segments, 1]} />
        </mesh>
      ))}

      {stalactites.map((stal) => (
        <mesh key={stal.key} position={stal.position} scale={stal.scale} material={deepMaterial}>
          <coneGeometry args={[1, 1, stal.segments, 1]} />
        </mesh>
      ))}

      {/* 洞顶 */}
      <mesh position={[0, 12.4, -4]} rotation={[Math.PI / 2, 0, 0]} material={deepMaterial}>
        <circleGeometry args={[36, 40]} />
      </mesh>
    </group>
  );
}
