/**
 * 全局 HUD（文档 3.8.2）
 * 右上：修为值彩蛋 + 灵签 / 昼夜 / 精简模式
 * 右下：御剑归宗
 * 底部居中：玉简悬停提示（置于底部，避让前厅后上方的洞府匾额）
 */
import { realmOf, SCENES, useDongfuStore } from '../store/useDongfuStore';
import { useViewportTier } from '../hooks/useViewportTier';

export default function Hud() {
  const scene = useDongfuStore((s) => s.scene);
  const cultivation = useDongfuStore((s) => s.cultivation);
  const liteMode = useDongfuStore((s) => s.liteMode);
  const dayNight = useDongfuStore((s) => s.dayNight);
  const toggleLite = useDongfuStore((s) => s.toggleLite);
  const toggleDayNight = useDongfuStore((s) => s.toggleDayNight);
  const drawFortune = useDongfuStore((s) => s.drawFortune);
  const goHome = useDongfuStore((s) => s.goHome);
  const hoverNav = useDongfuStore((s) => s.hoverNav);
  const hoverContact = useDongfuStore((s) => s.hoverContact);
  const siteName = useDongfuStore((s) => s.data.settings?.basic?.siteName) || '玄玑洞府';
  const subtitle = useDongfuStore((s) => s.data.settings?.basic?.siteSubtitle) || '';
  const easterEgg = useDongfuStore((s) => s.data.settings?.basic?.easterEgg);
  const { narrow } = useViewportTier();

  if (scene === SCENES.GATE) return null;

  const showCultivation = easterEgg?.cultivation !== false;
  const showFortune = easterEgg?.fortune !== false;
  const showDayNight = easterEgg?.dayNight !== false;

  return (
    <>
      {/* 顶部左侧：洞府题名 */}
      <header className="pointer-events-none fixed left-4 top-4 z-40 md:left-8 md:top-6">
        <h1 className="font-kai text-[19px] tracking-[0.42em] text-jade/95 text-gold-glow md:text-[22px]">
          {siteName}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[11.5px] tracking-[0.26em] text-stone/75">{subtitle}</p>
        )}
      </header>

      {/* 顶部右侧：彩蛋与开关 */}
      <div className="fixed right-4 top-4 z-40 flex flex-col items-end gap-2 md:right-8 md:top-6">
        {showCultivation && (
          <div className="ink-panel relative rounded-sm px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] tracking-[0.2em] text-stone/80">修为</span>
              <span className="font-kai text-[13px] tracking-[0.14em] text-gold">{realmOf(cultivation)}</span>
            </div>
            <div className="mt-1.5 h-[3px] w-[104px] overflow-hidden rounded-full bg-xuanqingMid/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/50 to-goldLight transition-[width] duration-500"
                style={{ width: `${cultivation}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {showFortune && (
            <button
              type="button"
              onClick={drawFortune}
              className="btn-ghost rounded-sm px-2.5 py-[5px] text-[12px] tracking-[0.16em]"
              title="求取灵签"
            >
              灵签
            </button>
          )}
          {showDayNight && (
            <button
              type="button"
              onClick={toggleDayNight}
              className="btn-ghost rounded-sm px-2.5 py-[5px] text-[12px] tracking-[0.16em]"
              title="昼夜轮转"
            >
              {dayNight === 'night' ? '夜' : '昼'}
            </button>
          )}
          <button
            type="button"
            onClick={toggleLite}
            className={`btn-ghost rounded-sm px-2.5 py-[5px] text-[12px] tracking-[0.16em] ${liteMode ? 'active' : ''}`}
            title="关闭粒子与镜头动画"
          >
            {liteMode ? '精简中' : '精简模式'}
          </button>
        </div>
      </div>

      {/* 玉简悬停提示（前厅置于底部，避让后上方的洞府匾额） */}
      {hoverNav && (
        <div className="pointer-events-none fixed bottom-[76px] left-1/2 z-40 -translate-x-1/2 animate-inkFade">
          <span className="rounded-sm border border-gold/35 bg-moxuan/85 px-3 py-[3px] text-[12px] tracking-[0.24em] text-gold">
            {hoverNav}
          </span>
        </div>
      )}

      {/* 传讯玉符悬停：浮现对应账号（文档 3.7.3）。置于顶部，避让底部信息卡 */}
      {hoverContact && (
        <div className="pointer-events-none fixed left-1/2 top-[72px] z-40 -translate-x-1/2 animate-inkFade">
          <span className="rounded-sm border border-gold/35 bg-moxuan/88 px-3 py-[3px] text-[12px] tracking-[0.16em] text-gold">
            {hoverContact.label}
            <span className="ml-2 font-mono text-[11.5px] text-jade/90">{hoverContact.value}</span>
          </span>
        </div>
      )}

      {/* 右下：御剑归宗（窄屏由底部导航的「归宗」承担） */}
      {scene !== SCENES.HALL && !narrow && (
        <button
          type="button"
          onClick={goHome}
          className="btn-ghost fixed bottom-4 right-4 z-40 rounded-sm px-4 py-2 text-[13px] tracking-[0.26em] md:bottom-6 md:right-8"
        >
          御剑归宗
        </button>
      )}
    </>
  );
}
