/**
 * 筑基概况面板（文档 3.4.2）
 */
import { useDongfuStore } from '../../store/useDongfuStore';
import MarkdownView from '../MarkdownView';
import { numberToChinese } from '../../utils/chinese';

const LEVEL_STYLE = {
  金丹: 'border-gold/70 text-gold bg-gold/10',
  筑基: 'border-pine/60 text-pine bg-pine/10',
  炼气: 'border-stone/45 text-stone bg-stone/10',
};

export default function ProfilePanel() {
  const profile = useDongfuStore((s) => s.data.profile);
  const goHome = useDongfuStore((s) => s.goHome);

  if (!profile) {
    return (
      <PanelShell title="筑基档案">
        <p className="text-[13px] text-stone/80">档案尚未开启，请稍候…</p>
      </PanelShell>
    );
  }

  const techStack = Array.isArray(profile.tech_stack) ? profile.tech_stack : [];

  const rows = [
    { term: '道号', value: profile.dao_name },
    { term: '骨龄', value: `虚度${numberToChinese(profile.bone_age)}春秋` },
    { term: '修行地界', value: profile.location },
    { term: '修为境界', value: profile.realm },
  ];

  return (
    <PanelShell title="筑基档案" subtitle="个人信息">
      <div className="thin-scroll max-h-[46vh] overflow-y-auto pr-1">
        <dl className="divide-y divide-gold/10">
          {rows.map((row) => (
            <div key={row.term} className="flex items-start gap-4 py-2.5">
              <dt className="w-[74px] shrink-0 text-[12.5px] tracking-[0.18em] text-stone/85">{row.term}</dt>
              <dd className="text-[14px] leading-relaxed text-jade/95">{row.value || '——'}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <h4 className="mb-2 text-[12.5px] tracking-[0.2em] text-stone/85">主修功法</h4>
          <div className="flex flex-wrap gap-2">
            {techStack.length === 0 && <span className="text-[13px] text-stone/60">尚未载录</span>}
            {techStack.map((tech) => (
              <span
                key={`${tech.name}-${tech.level}`}
                className={`rounded-sm border px-2.5 py-[3px] text-[12.5px] tracking-[0.1em] ${
                  LEVEL_STYLE[tech.level] || LEVEL_STYLE['炼气']
                }`}
              >
                {tech.name}
                <span className="ml-1.5 text-[11px] opacity-70">{tech.level}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-gold/10 pt-4">
          <h4 className="mb-2 text-[12.5px] tracking-[0.2em] text-stone/85">道心所向</h4>
          <MarkdownView>{profile.motto || ''}</MarkdownView>
        </div>

        <p className="mt-4 text-[11.5px] tracking-[0.16em] text-stone/55">
          提示：点击虚拟形象，道友可抱拳行礼。
        </p>
      </div>

      <BackButton onClick={goHome} />
    </PanelShell>
  );
}

function PanelShell({ title, subtitle, children }) {
  return (
    <aside className="pointer-events-auto absolute right-4 top-1/2 z-30 w-[min(92vw,410px)] -translate-y-1/2 animate-inkRise md:right-10">
      <div className="ink-panel gold-frame relative rounded-sm p-5">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-kai text-[19px] tracking-[0.24em] text-gold text-gold-glow">{title}</h2>
          {subtitle && <span className="text-[11.5px] tracking-[0.2em] text-stone/70">{subtitle}</span>}
        </header>
        {children}
      </div>
    </aside>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost mt-4 w-full rounded-sm py-2 text-[13px] tracking-[0.28em]">
      退回前厅
    </button>
  );
}

export { PanelShell, BackButton };
