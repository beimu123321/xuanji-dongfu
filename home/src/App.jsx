/**
 * 玄玑洞府 · 3D 主页根组件
 * 负责：WebGL 能力探测与降级、场景装配、加载档位解锁、覆盖层编排。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { SCENES, useDongfuStore } from './store/useDongfuStore';
import PALETTE from './theme/palette';
import CameraRig from './three/CameraRig';
import BaguaGround from './three/BaguaGround';
import WatercolorBackdrop from './three/WatercolorBackdrop';
import InkParticles from './three/InkParticles';

import GateScene from './scenes/GateScene';
import HallScene from './scenes/HallScene';
import ProfileScene from './scenes/ProfileScene';
import ExpScene from './scenes/ExpScene';
import ProjectScene from './scenes/ProjectScene';
import ContactScene from './scenes/ContactScene';

import GateLoader from './components/GateLoader';
import Hud from './components/Hud';
import MobileNav from './components/MobileNav';
import Toast from './components/Toast';
import FortuneModal from './components/FortuneModal';
import InkFallback from './components/InkFallback';
import ProfilePanel from './components/panels/ProfilePanel';
import ExperiencePanel from './components/panels/ExperiencePanel';
import ProjectPanel from './components/panels/ProjectPanel';
import ContactPanel from './components/panels/ContactPanel';

/**
 * 只挂载当前场景，以及转场中的上一个场景（文档 3.8.1 的镜头平移需要旧场景在场）。
 *
 * 六处洞府同属一座山体，若全部常驻，相邻区域会串进当前镜头：
 * 前厅会看见丹器馆藏的法宝与筑基概况的另一尊虚影，丹器馆藏又会看见传讯玉符的玉牌。
 */
function useSceneVisibility(scene) {
  const [visible, setVisible] = useState(() => [scene]);
  const timerRef = useRef(null);

  useEffect(() => {
    setVisible((prev) => (prev.includes(scene) ? prev : [...prev, scene]));
    window.clearTimeout(timerRef.current);
    // 与镜头转场时长（1.2s）对齐，转场收尾后再卸下旧场景
    timerRef.current = window.setTimeout(() => setVisible([scene]), 1300);
    return () => window.clearTimeout(timerRef.current);
  }, [scene]);

  return visible;
}

/** WebGL 2.0 能力探测（文档 8.3） */
function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    // 主动释放探测上下文
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const scene = useDongfuStore((s) => s.scene);
  const liteMode = useDongfuStore((s) => s.liteMode);
  const dayNight = useDongfuStore((s) => s.dayNight);
  const goTo = useDongfuStore((s) => s.goTo);
  const loadAll = useDongfuStore((s) => s.loadAll);
  const unlock = useDongfuStore((s) => s.unlock);
  const showToast = useDongfuStore((s) => s.showToast);
  const visit = useDongfuStore((s) => s.markVisit);
  const settings = useDongfuStore((s) => s.data.settings);
  const dataError = useDongfuStore((s) => s.dataError);

  const [webglSupported, setWebglSupported] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gatePhase, setGatePhase] = useState('loading'); // loading | opening | done
  const visibleScenes = useSceneVisibility(scene);

  const inkDensity = useMemo(() => {
    const raw = settings?.appearance?.inkDensity;
    return typeof raw === 'number' ? Math.max(0, Math.min(100, raw)) / 100 : 0.6;
  }, [settings]);

  const particleStrength = useMemo(() => {
    const raw = settings?.appearance?.particleStrength;
    return typeof raw === 'number' ? Math.max(0, Math.min(100, raw)) : 70;
  }, [settings]);

  // 首屏：能力探测 + 数据拉取 + 访问埋点
  useEffect(() => {
    setWebglSupported(detectWebGL());
    loadAll();
    visit();
  }, [loadAll, visit]);

  // 数据就绪即解锁第 1 档（基础 UI）
  useEffect(() => {
    if (settings) unlock(1);
  }, [settings, unlock]);

  // 3D 场景装配完成后解锁第 3 档（粒子与特效）
  useEffect(() => {
    const timer = window.setTimeout(() => unlock(3), 900);
    return () => window.clearTimeout(timer);
  }, [unlock]);

  // 弱网 / 接口异常提示（不阻断进入洞府）
  useEffect(() => {
    if (dataError) showToast('洞府数据未能取回，已以简素内容呈现');
  }, [dataError, showToast]);

  const handleEnter = useCallback(() => {
    if (gatePhase !== 'loading') return;
    setGateOpen(true);
    setGatePhase('opening');
    // 石门开启（1.5s）与镜头推进（1.2s）同步进行
    window.setTimeout(() => goTo(SCENES.HALL), 80);
    window.setTimeout(() => setGatePhase('done'), 1750);
  }, [gatePhase, goTo]);

  // 兜底：WebGL 不可用 → 2D 水墨版主页
  if (webglSupported === false) {
    return (
      <>
        <InkFallback />
        <Toast />
        <FortuneModal />
      </>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* 3D 洞府 */}
      <Canvas
        className="!absolute inset-0"
        dpr={[1, liteMode ? 1 : Math.min(window.devicePixelRatio || 1, 2)]}
        gl={{ antialias: !liteMode, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 52, near: 0.1, far: 90, position: [0, 2.6, 15.5] }}
        onCreated={({ gl }) => {
          gl.setClearColor(PALETTE.clear, 1);
          unlock(2);
        }}
        onPointerMissed={() => {
          // 点击空白处收起选中态
          const store = useDongfuStore.getState();
          store.clearSelection();
        }}
      >
        <color attach="background" args={[dayNight === 'night' ? '#7FAFA2' : PALETTE.clear]} />
        <fog
          attach="fog"
          args={[
            dayNight === 'night' ? '#8FB9AE' : PALETTE.fog,
            dayNight === 'night' ? PALETTE.fogNear + 4 : PALETTE.fogNear,
            PALETTE.fogFar,
          ]}
        />
        {/* 提亮：原先 0.6 / 0.5 的两盏灯是为墨玄夜色调的，青绿水彩下整体提到白昼水准；
            昼夜开关（右上角「昼/夜」）把整幅照度压回六成，山水入暮 */}
        <ambientLight intensity={dayNight === 'night' ? 1.35 : 2.2} />
        <hemisphereLight
          args={[PALETTE.sky, PALETTE.stoneDeep, dayNight === 'night' ? 0.95 : 1.6]}
        />
        <directionalLight position={[5, 9, 7]} intensity={dayNight === 'night' ? 1.05 : 1.7} />
        {/* 侧逆光带一点暖金，让青碧的调子里有夕阳的边 */}
        <directionalLight
          position={[-6, 4, -5]}
          intensity={dayNight === 'night' ? 0.32 : 0.55}
          color={PALETTE.goldLight}
        />

        <CameraRig />

        {/* 洞府地貌：地面常驻，远景换成水彩图（跟随昼夜换色调） */}
        <BaguaGround radius={30} inkDensity={inkDensity} dayNight={dayNight} />
        <WatercolorBackdrop night={dayNight === 'night'} />
        <InkParticles
          count={Math.round(40 + (particleStrength / 100) * 80)}
          area={{ x: 16, y: 7, z: 30 }}
          center={[0, 3, -4]}
          color="#D8BE7C"
          speed={1}
        />

        {/* 六大场景（按可见集合挂载，避免区域之间互相穿帮） */}
        {gatePhase !== 'done' && (
          <GateScene open={gateOpen} siteName={settings?.basic?.siteName || '玄玑洞府'} />
        )}
        {(gatePhase !== 'done' || visibleScenes.includes(SCENES.HALL)) && (
          <HallScene inkDensity={inkDensity} dayNight={dayNight} />
        )}
        {visibleScenes.includes(SCENES.PROFILE) && <ProfileScene inkDensity={inkDensity} dayNight={dayNight} />}
        {visibleScenes.includes(SCENES.EXPERIENCE) && <ExpScene inkDensity={inkDensity} dayNight={dayNight} />}
        {visibleScenes.includes(SCENES.PROJECT) && <ProjectScene inkDensity={inkDensity} dayNight={dayNight} />}
        {visibleScenes.includes(SCENES.CONTACT) && <ContactScene inkDensity={inkDensity} dayNight={dayNight} />}
      </Canvas>

      {/* 2D 覆盖层 */}
      {gatePhase !== 'done' && (
        <div
          className={`absolute inset-0 z-40 transition-opacity duration-[1400ms] ${
            gatePhase === 'opening' ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <GateLoader onEnter={handleEnter} />
        </div>
      )}

      <Hud />

      {scene === SCENES.PROFILE && <ProfilePanel />}
      {scene === SCENES.EXPERIENCE && <ExperiencePanel />}
      {scene === SCENES.PROJECT && <ProjectPanel />}
      {scene === SCENES.CONTACT && <ContactPanel />}

      <MobileNav />
      <Toast />
      <FortuneModal />
    </div>
  );
}
