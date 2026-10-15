/**
 * 洞府地面：暗金八卦纹路 + 水墨晕染底衬（文档 3.3.1）
 *
 * 提亮后地面是浅石色，两枚叠加层改用普通混合——原先的 AdditiveBlending 是为墨玄地面调的，
 * 在浅底上会把八卦与晕染洗成一片白。
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { getBaguaTexture, getInkNoiseTexture } from '../utils/textures';
import { PALETTE } from '../theme/palette';

export default function BaguaGround({ radius = 30, inkDensity = 0.6, dayNight = 'day' }) {
  const bagua = useMemo(() => getBaguaTexture(), []);
  const noise = useMemo(() => getInkNoiseTexture(), []);
  const night = dayNight === 'night';
  // 地面用 meshBasicMaterial（不随场景灯光），昼夜靠换底色实现
  const stoneColor = useMemo(() => (night ? '#9DBFA8' : PALETTE.stone), [night]);

  return (
    <group position={[0, -0.02, 0]}>
      {/* 石质地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <circleGeometry args={[radius, 72]} />
        <meshBasicMaterial color={stoneColor} />
      </mesh>

      {/* 水墨晕染 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[radius, 72]} />
        <meshBasicMaterial
          map={noise}
          transparent
          opacity={(night ? 0.26 : 0.18) + inkDensity * 0.22}
          depthWrite={false}
        />
      </mesh>

      {/* 八卦纹路 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[radius * 0.94, 72]} />
        <meshBasicMaterial
          map={bagua}
          transparent
          opacity={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
