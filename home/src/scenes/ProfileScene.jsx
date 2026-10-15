/**
 * 场景三：筑基概况（文档 3.4）
 * 左侧石壁浮现暗金卷轴，右侧立有简化版虚拟形象全身像，周身萦绕淡墨粒子。
 */
import { useMemo, Suspense, useEffect } from 'react';
import * as THREE from 'three';
import Avatar from '../three/Avatar';
import InkParticles from '../three/InkParticles';
import { getScrollTexture, getWallTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

const WALL_X = -8.2;

export default function ProfileScene({ inkDensity, dayNight }) {
  const showToast = useDongfuStore((s) => s.showToast);
  const profile = useDongfuStore((s) => s.data.profile);
  // 档案变化时重绘卷轴贴图（贴图内部按内容签名缓存）
  const scrollTexture = useMemo(() => getScrollTexture(profile), [profile]);

  /**
   * 石壁：原先是一堵 0.6×10×18 的纯色扁墙，既没有内容、又悬在画面中间
   * （按机位反推，顶边落在屏幕 y≈34px、底边落在 y≈669px，上下都露在外面，
   *  像块浮着的板子），所以看着"背景没变"。
   *
   * 现在换成与丹器馆藏同一套青绿山水壁面，并按机位放大到 26×16：
   * 相机 [-2.6,3.2,4.6] → 注视 [-7.0,3.2,0.2]、fov 52°，壁面中心处景深 6.86，
   * 可视半高 3.35、半宽 5.86，26×16 足够把上下缘推出画外。
   * 横向仍留一道渐隐——壁面 z 负向那端（屏幕 x≈1150）会探出右侧详情卡，
   * 渐隐区正好落在卡片范围内，卡片尺寸变化时也不会重新露出硬边。
   *
   * ridgeScale 提到 2：壁面中心处景深只有 6.86（丹器馆藏是 13.3），
   * 且镜头以 45° 斜看壁面，贴图放大倍率更高，山脊加密后才不至于糊成色块。
   */
  const wallMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getWallTexture('danqi', { edgeFade: 0.2, edgeFadeV: 0.16, ridgeScale: 2 }),
        toneMapped: false,
        fog: false,
        transparent: true,
        depthWrite: true,
      }),
    [],
  );

  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);

  const greetings = profile?.greetings?.length ? profile.greetings : ['道友安好。'];

  return (
    <group>
      {/* 石壁（青绿山水壁面，四缘渐隐融进远景） */}
      <mesh position={[WALL_X + 0.3, 4.5, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMaterial}>
        <planeGeometry args={[26, 16]} />
      </mesh>

      {/* 卷轴（悬挂于石壁高处，避免被前方虚拟形象遮挡） */}
      <group position={[WALL_X + 0.36, 4.0, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[2.7, 3.6]} />
          <meshBasicMaterial map={scrollTexture} transparent toneMapped={false} />
        </mesh>
        {/* 卷轴轴杆 */}
        <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 3.1, 12]} />
          <meshBasicMaterial color="#6E5A2C" />
        </mesh>
        <mesh position={[0, -1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 3.1, 12]} />
          <meshBasicMaterial color="#6E5A2C" />
        </mesh>
        {/* 暗金边框 */}
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(2.7, 3.6)]} />
          <lineBasicMaterial color="#C9A961" transparent opacity={0.55} />
        </lineSegments>
      </group>

      {/* 简化版虚拟形象全身像（立于卷轴前方偏右） */}
      <group position={[-5.7, 0, 0.9]} rotation={[0, 0.5, 0]}>
        <Suspense fallback={null}>
          <Avatar
            inkDensity={Math.max(0.2, inkDensity - 0.15)}
            dayNight={dayNight}
            onGreet={() => showToast(greetings[Math.floor(Math.random() * greetings.length)])}
          />
        </Suspense>
      </group>

      {/* 淡墨粒子。亮景下灰白粒子看不见，换成暖金浮尘 */}
      <InkParticles
        count={46}
        area={{ x: 3.4, y: 4.6, z: 3.4 }}
        center={[-6.2, 3.0, 0.6]}
        color="#D8BE7C"
        speed={0.7}
      />
    </group>
  );
}
