/**
 * 窄屏底部悬浮导航栏（文档 3.8.2：替代 3D 玉简导航）
 *
 * 与 HallScene 的玉简环共用 useViewportTier 判据：两者恰有一个在场，
 * 不会出现前厅没有任何入口的空档。
 */
import { NAV_ITEMS, SCENES, useDongfuStore } from '../store/useDongfuStore';
import { useViewportTier } from '../hooks/useViewportTier';

export default function MobileNav() {
  const scene = useDongfuStore((s) => s.scene);
  const goTo = useDongfuStore((s) => s.goTo);
  const goHome = useDongfuStore((s) => s.goHome);
  const showToast = useDongfuStore((s) => s.showToast);
  const { narrow } = useViewportTier();

  if (scene === SCENES.GATE || !narrow) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/20 bg-moxuan/94 backdrop-blur-md">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = scene === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.comingSoon) {
                  showToast('修行手札 · 尚在参悟');
                  return;
                }
                goTo(item.key);
              }}
              className={`flex flex-1 flex-col items-center gap-[3px] py-2.5 text-[11px] tracking-[0.12em] transition-colors ${
                active ? 'text-gold' : item.comingSoon ? 'text-stone/45' : 'text-stone/80'
              }`}
            >
              <span className={`h-[3px] w-[3px] rotate-45 ${active ? 'bg-gold' : 'bg-transparent'}`} />
              {item.short}
            </button>
          );
        })}
        <button
          type="button"
          onClick={goHome}
          className={`flex flex-1 flex-col items-center gap-[3px] py-2.5 text-[11px] tracking-[0.12em] transition-colors ${
            scene === SCENES.HALL ? 'text-gold' : 'text-stone/80'
          }`}
        >
          <span className={`h-[3px] w-[3px] rotate-45 ${scene === SCENES.HALL ? 'bg-gold' : 'bg-transparent'}`} />
          归宗
        </button>
      </div>
    </nav>
  );
}
