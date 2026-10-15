/**
 * 彩蛋：灵签
 */
import { useDongfuStore } from '../store/useDongfuStore';

export default function FortuneModal() {
  const fortune = useDongfuStore((s) => s.fortune);
  const closeFortune = useDongfuStore((s) => s.closeFortune);

  if (!fortune) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-moxuan/72 px-5 backdrop-blur-[2px]"
      onClick={closeFortune}
      role="presentation"
    >
      <div
        className="ink-panel gold-frame relative w-[min(92vw,360px)] animate-inkRise rounded-sm px-7 py-8 text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="灵签"
      >
        <p className="text-[11.5px] tracking-[0.36em] text-stone/75">洞府灵签</p>
        <div className="my-5 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gold/40" />
          <span className="font-kai text-[26px] tracking-[0.3em] text-gold text-gold-glow">{fortune.level}</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <p className="text-[14px] leading-[2] tracking-[0.1em] text-jade/90">{fortune.text}</p>
        <button type="button" onClick={closeFortune} className="btn-ghost mt-7 w-full rounded-sm py-2 text-[13px] tracking-[0.28em]">
          收下此签
        </button>
      </div>
    </div>
  );
}
