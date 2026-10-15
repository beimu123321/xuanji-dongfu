/**
 * 丹器馆藏面板（文档 3.6）
 * 底部为分类筛选 + 法宝横向阵列；选中后右侧展开详情（含「祭炼之地」跳转）。
 */
import { useMemo } from 'react';
import api from '../../api/client';
import { useDongfuStore } from '../../store/useDongfuStore';
import MarkdownView from '../MarkdownView';

const LEVEL_STYLE = {
  高阶: 'border-[#B04A3C]/70 text-[#A04030] bg-[#B04A3C]/10',
  进阶: 'border-gold/60 text-gold bg-gold/10',
  入门: 'border-pine/55 text-pine bg-pine/10',
};

export default function ProjectPanel() {
  const projects = useDongfuStore((s) => s.data.projects);
  const selectedId = useDongfuStore((s) => s.selectedProjectId);
  const setSelected = useDongfuStore((s) => s.setSelectedProject);
  const activeCategory = useDongfuStore((s) => s.activeCategory);
  const setActiveCategory = useDongfuStore((s) => s.setActiveCategory);
  const goHome = useDongfuStore((s) => s.goHome);

  const categories = useMemo(() => {
    const set = new Set(projects.map((p) => p.category).filter(Boolean));
    return ['全部', ...Array.from(set)];
  }, [projects]);

  const visible = useMemo(
    () => (activeCategory === '全部' ? projects : projects.filter((p) => p.category === activeCategory)),
    [projects, activeCategory],
  );

  const selected = projects.find((p) => p.id === selectedId) || null;

  return (
    <>
      {/* 底部：筛选 + 阵列 */}
      <section className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 animate-inkRise px-4 pb-20 md:px-10 md:pb-16">
        <div className="ink-panel relative mx-auto max-w-[1180px] rounded-sm p-4">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-kai text-[18px] tracking-[0.24em] text-gold text-gold-glow">丹器馆藏</h2>
              <span className="text-[11.5px] tracking-[0.18em] text-stone/70">
                共 {visible.length} 件 · 拖拽场景可 360° 环绕
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`btn-ghost rounded-sm px-3 py-[5px] text-[12.5px] tracking-[0.16em] ${
                    activeCategory === cat ? 'active' : ''
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </header>

          {/* key 挂在分类上：切分类时整排卡片重新错峰淡入 */}
          <div key={activeCategory} className="thin-scroll flex gap-3 overflow-x-auto pb-1">
            {visible.length === 0 && (
              <p className="py-5 text-[13px] text-stone/70">此类丹器尚未入库。</p>
            )}
            {visible.map((project, i) => {
              const active = selectedId === project.id;
              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelected(active ? null : project.id);
                    api.projectView(project.id).catch(() => {});
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(active ? null : project.id);
                    }
                  }}
                  style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                  className={`w-[212px] shrink-0 animate-inkRise cursor-pointer rounded-sm border p-3 transition-all ${
                    active
                      ? 'border-gold/65 bg-gold/[0.09] shadow-[0_0_20px_rgba(201,169,97,0.18)]'
                      : 'border-gold/12 bg-xuanqingDeep/45 hover:border-gold/45 hover:bg-gold/[0.05]'
                  }`}
                >
                  <div className="relative mb-2.5 h-[92px] overflow-hidden rounded-sm border border-gold/15 bg-moxuan">
                    {project.cover_url ? (
                      <img src={project.cover_url} alt={project.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(201,169,97,0.16),transparent_65%)]">
                        <span className="font-kai text-[26px] tracking-[0.2em] text-gold/55">
                          {project.name.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <span
                      className={`absolute right-1.5 top-1.5 rounded-sm border px-1.5 py-[1px] text-[11px] tracking-[0.1em] ${
                        LEVEL_STYLE[project.level] || LEVEL_STYLE['入门']
                      }`}
                    >
                      {project.level}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-kai text-[14.5px] tracking-[0.1em] text-jade/95">{project.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-stone/70">{project.views}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(project.tech_stack || []).slice(0, 3).map((tech) => (
                      <span key={tech} className="rounded-sm border border-gold/18 px-1.5 py-[1px] text-[11px] text-stone/85">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goHome}
            className="btn-ghost mt-3 w-full rounded-sm py-2 text-[13px] tracking-[0.28em]"
          >
            退回前厅
          </button>
        </div>
      </section>

      {/* 右侧：法宝详情。
          top-32 而不是百分比：右上角 HUD（修为条 + 灵签/昼夜/精简三枚按钮）占掉
          顶部约 116px，卡片原先从 8%（≈64px）开始，正好压在按钮上。
          key 挂 selected.id —— 否则从一件法宝切到另一件时，React 复用同一个
          aside 节点，animate-inkRise 只在首次打开播一次，之后都是内容瞬变；
          修行履历的展开内容挂在各自的 <li> 下，切换节点天然重挂、每次都渐显，
          这里用 key 对齐同一观感。 */}
      {selected && (
        <aside
          key={selected.id}
          className="pointer-events-auto absolute right-4 top-32 z-30 w-[min(92vw,400px)] animate-inkRise md:right-10"
        >
          <div className="ink-panel gold-frame relative rounded-sm p-5">
            <header className="mb-3 flex items-baseline justify-between">
              <h3 className="font-kai text-[18px] tracking-[0.2em] text-gold text-gold-glow">{selected.name}</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[16px] leading-none text-stone/70 transition hover:text-gold"
                aria-label="关闭详情"
              >
                ✕
              </button>
            </header>

            <div className="thin-scroll max-h-[52vh] overflow-y-auto pr-1">
              {selected.cover_url && (
                <img
                  src={selected.cover_url}
                  alt={selected.name}
                  className="mb-3 w-full animate-inkFade rounded-sm border border-gold/20 object-cover"
                  loading="lazy"
                />
              )}

              <div
                className="mb-3 flex animate-inkFade flex-wrap gap-2 text-[12px]"
                style={{ animationDelay: '80ms' }}
              >
                <span className={`rounded-sm border px-2 py-[2px] ${LEVEL_STYLE[selected.level] || LEVEL_STYLE['入门']}`}>
                  {selected.level}
                </span>
                <span className="rounded-sm border border-gold/22 px-2 py-[2px] text-stone/85">{selected.category}</span>
                <span className="rounded-sm border border-gold/22 px-2 py-[2px] font-mono text-stone/85">
                  品鉴 {selected.views}
                </span>
              </div>

              <div className="animate-inkFade" style={{ animationDelay: '160ms' }}>
                <h4 className="mb-1.5 text-[12px] tracking-[0.2em] text-stone/85">炼制材料</h4>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(selected.tech_stack || []).length === 0 && <span className="text-[13px] text-stone/60">未载录</span>}
                  {(selected.tech_stack || []).map((tech) => (
                    <span key={tech} className="rounded-sm border border-gold/22 px-2 py-[2px] text-[12px] text-jade/90">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="animate-inkFade" style={{ animationDelay: '240ms' }}>
                <h4 className="mb-1.5 text-[12px] tracking-[0.2em] text-stone/85">法宝功用</h4>
                <MarkdownView>{selected.description || ''}</MarkdownView>
              </div>
            </div>

            {selected.github_url ? (
              <a
                href={selected.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold mt-4 block rounded-sm py-2 text-center text-[13px] no-underline"
              >
                祭炼之地
              </a>
            ) : (
              <p className="mt-4 text-center text-[12px] tracking-[0.16em] text-stone/55">此宝未留祭炼之地</p>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
