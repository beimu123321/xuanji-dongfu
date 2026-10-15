/**
 * 场景一：山门候客（文档 3.2）
 * 3D 部分：石门 + 门心玉简 + 门前灵雾；进度与按钮由 2D 覆盖层承载。
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import StoneGate from '../three/StoneGate';
import { getGlowTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

export default function GateScene({ open, siteName }) {
  const liteMode = useDongfuStore((s) => s.liteMode);
  const glow = useMemo(() => getGlowTexture(), []);

  return (
    <group>
      <StoneGate open={open} position={[0, 0, 8.4]} siteName={siteName} />

      {/* 门前灵雾。提亮后改用普通混合：AdditiveBlending 的白雾压在亮景上只会发灰 */}
      {!liteMode && (
        <>
          <mesh position={[0, 1.1, 7.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[16, 12]} />
            <meshBasicMaterial
              map={glow}
              color="#BFE3DC"
              transparent
              opacity={0.42}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 4.6, 8.0]}>
            <planeGeometry args={[14, 8]} />
            <meshBasicMaterial
              map={glow}
              color="#F3E4BC"
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* 门前石阶 */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -0.12 - i * 0.22, 9.8 + i * 0.9]}>
          <boxGeometry args={[7.2 - i * 0.7, 0.22, 0.9]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#E4EEDF' : '#D3E3D6'} />
        </mesh>
      ))}
    </group>
  );
}
