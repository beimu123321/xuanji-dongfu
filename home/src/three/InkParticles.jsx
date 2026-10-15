/**
 * 墨点粒子系统（文档 3.10）
 * 全局飘散模拟灵气流转，实例化渲染，数量上限 150。
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGlowTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

const MAX_PARTICLES = 150;

export default function InkParticles({
  count = 120,
  area = { x: 16, y: 7, z: 30 },
  center = [0, 3, -4],
  color = '#D8CDB4',
  speed = 1,
}) {
  const liteMode = useDongfuStore((s) => s.liteMode);
  const total = Math.max(10, Math.min(MAX_PARTICLES, Math.round(count)));

  const pointsRef = useRef(null);

  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(total * 3);
    const seedArray = new Float32Array(total * 4); // 速度、相位、半径抖动、竖向偏移

    for (let i = 0; i < total; i += 1) {
      positions[i * 3] = center[0] + (Math.random() - 0.5) * area.x;
      positions[i * 3 + 1] = center[1] + (Math.random() - 0.5) * area.y;
      positions[i * 3 + 2] = center[2] + (Math.random() - 0.5) * area.z;
      seedArray[i * 4] = 0.14 + Math.random() * 0.3;
      seedArray[i * 4 + 1] = Math.random() * Math.PI * 2;
      seedArray[i * 4 + 2] = 0.3 + Math.random() * 0.8;
      seedArray[i * 4 + 3] = Math.random() * area.y;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(center[0], center[1], center[2]),
      Math.max(area.x, area.y, area.z),
    );
    return { geometry: geo, seeds: seedArray };
  }, [total, area.x, area.y, area.z, center[0], center[1], center[2]]);

  useFrame((state, delta) => {
    if (liteMode || !pointsRef.current) return;
    const attr = geometry.getAttribute('position');
    const array = attr.array;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05) * speed;

    for (let i = 0; i < total; i += 1) {
      const i3 = i * 3;
      const i4 = i * 4;
      array[i3 + 1] += seeds[i4] * dt;
      array[i3] += Math.sin(t * 0.35 + seeds[i4 + 1]) * 0.006;
      array[i3 + 2] += Math.cos(t * 0.28 + seeds[i4 + 1]) * 0.006;

      const ceiling = center[1] + area.y / 2;
      const floor = center[1] - area.y / 2;
      if (array[i3 + 1] > ceiling) {
        array[i3 + 1] = floor;
        array[i3] = center[0] + (Math.random() - 0.5) * area.x;
        array[i3 + 2] = center[2] + (Math.random() - 0.5) * area.z;
      }
    }
    attr.needsUpdate = true;
  });

  // 精简模式下不渲染粒子
  if (liteMode) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.085}
        sizeAttenuation
        map={getGlowTexture()}
        color={color}
        transparent
        opacity={0.62}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
