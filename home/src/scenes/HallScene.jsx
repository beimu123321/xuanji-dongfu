/**
 * 场景二：洞府前厅（文档 3.3）
 * 虚拟形象居中，五枚玉简环绕；点击玉简触发镜头转场。
 */
import { useCallback, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import Avatar from '../three/Avatar';
import RuneSlip from '../three/RuneSlip';
import HallDecor from '../three/HallDecor';
import { getPlaqueTexture } from '../utils/textures';
import { NAV_ITEMS, useDongfuStore } from '../store/useDongfuStore';
import { useViewportTier } from '../hooks/useViewportTier';

/**
 * 玉简阵列：以虚影为心的扁椭圆环（文档 3.3.3「五枚玉简围绕虚拟形象均匀分布」）。
 *
 * 相对正圆有三处调整，都是为了让五枚玉简在镜头公转的每个相位都彼此不遮挡：
 * 1. 纵深压扁（RZ 远小于 RX）。环越深，靠前的玉简越近、越大，
 *    镜头公转 ±15° 时它与相邻那枚会在画面上挤到一起。
 * 2. 正后方一枚抬到虚影头顶之上——否则它正落在虚影之后，会被虚影与正前方那枚叠住。
 * 3. 玉简正面朝向镜头，仅作轻微外张；一律朝外会让侧后两枚近乎侧对镜头、被压成窄边。
 */
const RING_RX = 5.0;
const RING_RZ = 0.7;
const RING_Y = 1.62;

/**
 * 正后方一枚的抬升高度。
 * 虚影最高处约 2.23，按透视放大到玉简所处景深约合 2.25，故抬到 3.0 留出余量。
 */
const BEHIND_Y = 3.0;

export default function HallScene({ inkDensity, dayNight }) {
  const goTo = useDongfuStore((s) => s.goTo);
  const showToast = useDongfuStore((s) => s.showToast);
  const setHoverNav = useDongfuStore((s) => s.setHoverNav);
  const profile = useDongfuStore((s) => s.data.profile);
  const siteName = useDongfuStore((s) => s.data.settings?.basic?.siteName) || '玄玑洞府';
  // 精简模式下云鸟减半，省下的是软件渲染时最吃帧的透明面片
  const liteMode = useDongfuStore((s) => s.liteMode);

  // 窄屏由底部导航承担导航（文档 3.8.2），此时不挂玉简环
  const { narrow, ringScale } = useViewportTier();

  const plaque = useMemo(() => getPlaqueTexture(siteName), [siteName]);

  const greetings = useMemo(
    () => (profile?.greetings && profile.greetings.length > 0 ? profile.greetings : ['道友安好。']),
    [profile],
  );

  const handleGreet = useCallback(() => {
    const text = greetings[Math.floor(Math.random() * greetings.length)];
    showToast(text);
  }, [greetings, showToast]);

  const runes = useMemo(() => {
    if (narrow) return [];
    const rx = RING_RX * ringScale;
    const rz = RING_RZ * ringScale;
    return NAV_ITEMS.map((item, i) => {
      const angle = (i / NAV_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
      const nx = Math.cos(angle);
      // 正后方一枚（angle = -90°）恰在虚影之后，须抬高才不会被虚影遮挡
      const behind = Math.abs(Math.sin(angle) + 1) < 1e-6;
      return {
        ...item,
        position: [
          nx * rx,
          // 内侧略高、外侧略低，与抬起的后位玉简合成一道对称的穹顶轮廓
          behind ? BEHIND_Y : RING_Y + 0.06 - 0.16 * nx * nx,
          Math.sin(angle) * rz,
        ],
        // 朝镜头的基础上微微外张；以「相对正前方的偏角」计算，左右才严格对称
        rotation: [0, 0.14 * (Math.PI / 2 - angle), 0],
        seed: i * 1.7,
      };
    });
  }, [narrow, ringScale]);

  return (
    <group>
      <Suspense fallback={null}>
        <Avatar
          position={[0, 0, 0]}
          inkDensity={inkDensity}
          dayNight={dayNight}
          onGreet={handleGreet}
        />
      </Suspense>

      {runes.map((rune) => (
        <RuneSlip
          key={rune.key}
          label={rune.label}
          position={rune.position}
          rotation={rune.rotation}
          floatSeed={rune.seed}
          disabled={rune.comingSoon}
          width={0.6}
          height={1.12}
          onClick={() => {
            if (rune.comingSoon) {
              showToast('修行手札 · 尚在参悟');
              return;
            }
            goTo(rune.key);
          }}
          onHoverChange={(hovered) => setHoverNav(hovered ? rune.label : null)}
        />
      ))}

      {/* 中央灵光柱。亮景下改用普通混合，并把浓度提上来才看得见 */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.9, 1.6, 6.4, 18, 1, true]} />
        <meshBasicMaterial
          color="#E8C883"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/*
        洞府匾额（悬于虚影后上方，前厅的题名凭此可辨）。
        窄屏视高有限，原尺寸的匾额会吃掉近三分之一画面并与左上角题名挤在一处，故整体收小。
        贴图自带木框 + 回纹带 + 四角云头，故面片直接铺满整块底板，
        底板只作为侧面的木色，不再另加边框。
      */}
      <group position={[0, narrow ? 4.24 : 4.7, -3.2]} scale={narrow ? 0.62 : 1}>
        <mesh>
          <boxGeometry args={[4.4, 1.0, 0.16]} />
          <meshBasicMaterial color="#4A3218" />
        </mesh>
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[4.4, 1.0]} />
          <meshBasicMaterial map={plaque} transparent toneMapped={false} />
        </mesh>
      </group>

      {/* 前厅点缀：祥云、飞鸟、花草 */}
      <HallDecor liteMode={liteMode} />
    </group>
  );
}
