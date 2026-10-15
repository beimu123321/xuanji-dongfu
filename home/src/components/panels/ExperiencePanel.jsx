/**
 * 修行履历面板（文档 3.5）
 * 与 3D 灵脉节点联动：悬停高亮、点击展开完整 Markdown 描述。
 */
import { useDongfuStore } from '../../store/useDongfuStore';
import MarkdownView from '../MarkdownView';

function formatRange(start, end) {
  const s = start || '——';
  const e = end && end.length > 0 ? end : '至今';
  return `${s} — ${e}`;
}

export default function ExperiencePanel() {
  const experiences = useDongfuStore((s) => s.data.experiences);
  const selectedId = useDongfuStore((s) => s.selectedExperienceId);
  const setSelected = useDongfuStore((s) => s.setSelectedExperience);
  const goHome = useDongfuStore((s) => s.goHome);

  return (
    <aside className="pointer-events-auto absolute left-4 top-1/2 z-30 w-[min(92vw,430px)] -translate-y-1/2 animate-inkRise md:left-10">
      <div className="ink-panel gold-frame relative rounded-sm p-5">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-kai text-[19px] tracking-[0.24em] text-gold text-gold-glow">修行履历</h2>
          <span className="text-[11.5px] tracking-[0.2em] text-stone/70">共 {experiences.length} 段</span>
        </header>

        <div className="thin-scroll max-h-[56vh] overflow-y-auto pr-1">
          {experiences.length === 0 && (
            <p className="py-6 text-center text-[13px] text-stone/70">灵脉未显，尚无履历载录。</p>
          )}

          <ol className="relative space-y-3 pl-5">
            <span className="absolute left-[6px] top-1 h-[calc(100%-8px)] w-px bg-gradient-to-b from-gold/45 via-gold/20 to-transparent" />
            {experiences.map((exp) => {
              const active = selectedId === exp.id;
              return (
                <li key={exp.id} className="relative">
                  <span
                    className={`absolute -left-[18px] top-[13px] h-[9px] w-[9px] rotate-45 border transition-all ${
                      active
                        ? 'border-goldLight bg-goldLight shadow-[0_0_12px_rgba(201,169,97,0.9)]'
                        : 'border-gold/60 bg-xuanqingDeep'
                    }`}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(active ? null : exp.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(active ? null : exp.id);
                      }
                    }}
                    className={`w-full cursor-pointer rounded-sm border px-3.5 py-3 text-left transition-all ${
                      active
                        ? 'border-gold/60 bg-gold/[0.08]'
                        : 'border-gold/12 bg-xuanqingDeep/40 hover:border-gold/40 hover:bg-gold/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-kai text-[15px] tracking-[0.12em] text-jade/95">{exp.sect_name}</span>
                      <span className="shrink-0 text-[11.5px] tracking-[0.1em] text-stone/75">
                        {formatRange(exp.start_date, exp.end_date)}
                      </span>
                    </div>
                    <div className="mt-1 text-[12.5px] tracking-[0.14em] text-gold/85">{exp.position}</div>

                    {active && (
                      <div className="mt-3 animate-inkFade border-t border-gold/15 pt-3">
                        <h4 className="mb-1.5 text-[12px] tracking-[0.2em] text-stone/85">执掌事务</h4>
                        <MarkdownView>{exp.duties || ''}</MarkdownView>
                        <h4 className="mb-1.5 mt-4 text-[12px] tracking-[0.2em] text-stone/85">修为精进</h4>
                        <MarkdownView>{exp.achievements || ''}</MarkdownView>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <button
          type="button"
          onClick={goHome}
          className="btn-ghost mt-4 w-full rounded-sm py-2 text-[13px] tracking-[0.28em]"
        >
          退回前厅
        </button>
      </div>
    </aside>
  );
}
