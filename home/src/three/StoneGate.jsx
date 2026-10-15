/**
 * 山门石门（文档 3.2）
 * 门心嵌一枚旋转玉简；点击「推门入府」后石门向两侧缓缓打开（1.5s）。
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { createInkMaterial } from '../shaders/inkToon';
import { getGlowTexture, getRuneTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

export default function StoneGate({ open = false, position = [0, 0, 8.4], siteName = '玄玑洞府' }) {
  const liteMode = useDongfuStore((s) => s.liteMode);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const runeRef = useRef(null);

  const stoneMaterial = useMemo(
    () =>
      createInkMaterial({
        color: '#E4EEDF',
        edgeColor: '#16504A',
        rimColor: '#C9A961',
        rimStrength: 0.22,
        ink: 0.75,
        opacity: 1,
        breathe: 0,
        transparent: false,
      }),
    [],
  );

  const runeTexture = useMemo(() => getRuneTexture(siteName, true), [siteName]);
  const glow = useMemo(() => getGlowTexture(), []);

  useEffect(
    () => () => {
      stoneMaterial.dispose();
    },
    [stoneMaterial],
  );

  // 开门动画
  useEffect(() => {
    if (!open) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const tl = gsap.timeline();
    tl.to(left.position, { x: -2.9, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(right.position, { x: 2.9, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(left.rotation, { y: -0.22, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(right.rotation, { y: 0.22, duration: 1.5, ease: 'power2.inOut' }, 0);

    if (runeRef.current) {
      gsap.to(runeRef.current.scale, { x: 0, y: 0, z: 0, duration: 0.6, ease: 'power2.in' });
      gsap.to(runeRef.current.position, { y: 3.2, duration: 1.5, ease: 'power2.inOut' }, 0);
    }

    return () => {
      tl.kill();
    };
  }, [open]);

  // 门心玉简旋转
  useFrame((state, delta) => {
    if (!runeRef.current || open) return;
    const speed = liteMode ? 0.12 : 0.5;
    runeRef.current.rotation.y += delta * speed;
    runeRef.current.position.y = 2.1 + (liteMode ? 0 : Math.sin(state.clock.elapsedTime * 1.1) * 0.06);
  });

  return (
    <group position={position}>
      {/* 门柱 */}
      <mesh position={[-2.35, 2.6, 0]} material={stoneMaterial}>
        <boxGeometry args={[0.62, 5.2, 0.8]} />
      </mesh>
      <mesh position={[2.35, 2.6, 0]} material={stoneMaterial}>
        <boxGeometry args={[0.62, 5.2, 0.8]} />
      </mesh>

      {/* 门楣 */}
      <mesh position={[0, 5.35, 0]} material={stoneMaterial}>
        <boxGeometry args={[5.6, 0.72, 0.9]} />
      </mesh>
      <mesh position={[0, 5.95, 0]} rotation={[0, 0, 0]} material={stoneMaterial}>
        <boxGeometry args={[6.4, 0.34, 1.1]} />
      </mesh>

      {/* 门扇 */}
      <group ref={leftRef} position={[-1.1, 2.4, 0]}>
        <mesh material={stoneMaterial}>
          <boxGeometry args={[2.16, 4.8, 0.28]} />
        </mesh>
      </group>
      <group ref={rightRef} position={[1.1, 2.4, 0]}>
        <mesh material={stoneMaterial}>
          <boxGeometry args={[2.16, 4.8, 0.28]} />
        </mesh>
      </group>

      {/* 门心玉简 */}
      <group ref={runeRef} position={[0, 2.1, 0.26]}>
        <mesh>
          <boxGeometry args={[0.72, 1.4, 0.06]} />
          <meshBasicMaterial map={runeTexture} transparent toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.06]}>
          <planeGeometry args={[2.1, 2.6]} />
          <meshBasicMaterial
            map={glow}
            color="#C9A961"
            transparent
            opacity={0.38}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
