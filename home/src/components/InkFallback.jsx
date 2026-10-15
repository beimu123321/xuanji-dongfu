/**
 * 2D 水墨版主页（文档 8.3 降级方案）
 * 当浏览器不支持 WebGL 2.0 时自动启用，内容与 3D 版完全一致。
 */
import { useState } from 'react';
import api from '../api/client';
import { copyText, isLink, toHref } from '../utils/clipboard';
import { useDongfuStore } from '../store/useDongfuStore';
import MarkdownView from './MarkdownView';
import { numberToChinese } from '../utils/chinese';

const TABS = [
  { key: 'profile', label: '筑基概况' },
  { key: 'experience', label: '修行履历' },
  { key: 'project', label: '丹器馆藏' },
  { key: 'contact', label: '传讯玉符' },
];

export default function InkFallback() {
  const [tab, setTab] = useState('profile');
  const data = useDongfuStore((s) => s.data);
  const showToast = useDongfuStore((s) => s.showToast);
  const siteName = data.settings?.basic?.siteName || '玄玑洞府';

  return (
    <div className="h-full w-full overflow-y-auto bg-moxuan px-5 py-8 md:px-10">
      <header className="mx-auto mb-7 max-w-[900px] text-center">
        <h1 className="font-kai text-[26px] tracking-[0.42em] text-gold text-gold-glow">{siteName}</h1>
        <p className="mt-2 text-[12px] tracking-[0.24em] text-stone/75">
          当前设备未开启灵眼（WebGL），已转入简素画卷
        </p>
      </header>

      <nav className="mx-auto mb-6 flex max-w-[900px] flex-wrap justify-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`btn-ghost rounded-sm px-4 py-2 text-[13px] tracking-[0.2em] ${tab === item.key ? 'active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-[900px] space-y-4">
        {tab === 'profile' && data.profile && (
          <section className="ink-panel relative rounded-sm p-6">
            <dl className="divide-y divide-gold/10">
              {[
                ['道号', data.profile.dao_name],
                ['骨龄', `虚度${numberToChinese(data.profile.bone_age)}春秋`],
                ['修行地界', data.profile.location],
                ['修为境界', data.profile.realm],
              ].map(([term, value]) => (
                <div key={term} className="flex gap-4 py-3">
                  <dt className="w-[80px] shrink-0 text-[12.5px] tracking-[0.18em] text-stone/85">{term}</dt>
                  <dd className="text-[14px] text-jade/95">{value || '——'}</dd>
                </div>
              ))}
            </dl>
            <h4 className="mb-2 mt-5 text-[12.5px] tracking-[0.2em] text-stone/85">主修功法</h4>
            <div className="flex flex-wrap gap-2">
              {(data.profile.tech_stack || []).map((tech) => (
                <span key={tech.name} className="rounded-sm border border-gold/35 px-2.5 py-[3px] text-[12.5px] text-gold/90">
                  {tech.name}
                  <span className="ml-1.5 text-[11px] opacity-70">{tech.level}</span>
                </span>
              ))}
            </div>
            <h4 className="mb-2 mt-5 text-[12.5px] tracking-[0.2em] text-stone/85">道心所向</h4>
            <MarkdownView>{data.profile.motto || ''}</MarkdownView>
          </section>
        )}

        {tab === 'experience' &&
          data.experiences.map((exp) => (
            <section key={exp.id} className="ink-panel relative rounded-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-kai text-[16px] tracking-[0.16em] text-jade/95">{exp.sect_name}</h3>
                <span className="text-[12px] tracking-[0.12em] text-stone/75">
                  {exp.start_date} — {exp.end_date || '至今'}
                </span>
              </div>
              <p className="mt-1 text-[13px] tracking-[0.14em] text-gold/85">{exp.position}</p>
              <h4 className="mb-1 mt-4 text-[12px] tracking-[0.2em] text-stone/85">执掌事务</h4>
              <MarkdownView>{exp.duties || ''}</MarkdownView>
              <h4 className="mb-1 mt-4 text-[12px] tracking-[0.2em] text-stone/85">修为精进</h4>
              <MarkdownView>{exp.achievements || ''}</MarkdownView>
            </section>
          ))}

        {tab === 'project' &&
          data.projects.map((project) => (
            <section key={project.id} className="ink-panel relative rounded-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-kai text-[16px] tracking-[0.16em] text-jade/95">{project.name}</h3>
                <span className="text-[12px] tracking-[0.14em] text-gold/85">
                  {project.level} · {project.category}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(project.tech_stack || []).map((tech) => (
                  <span key={tech} className="rounded-sm border border-gold/22 px-2 py-[2px] text-[12px] text-jade/90">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="mt-3">
                <MarkdownView>{project.description || ''}</MarkdownView>
              </div>
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold mt-4 inline-block rounded-sm px-5 py-2 text-[13px] no-underline"
                >
                  祭炼之地
                </a>
              )}
            </section>
          ))}

        {tab === 'contact' && (
          <section className="ink-panel relative rounded-sm p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={async () => {
                    api.contactClick(contact.id).catch(() => {});
                    if (isLink(contact.value)) {
                      window.open(toHref(contact.value), '_blank', 'noopener,noreferrer');
                      showToast('传讯已至');
                      return;
                    }
                    const copied = await copyText(contact.value);
                    showToast(copied ? `传讯已至 · ${contact.value}` : contact.value);
                  }}
                  className="rounded-sm border border-gold/18 bg-xuanqingDeep/45 px-4 py-4 text-left transition hover:border-gold/60"
                >
                  <span className="block font-kai text-[14.5px] tracking-[0.16em] text-jade/95">{contact.label}</span>
                  <span className="mt-1 block truncate font-mono text-[12px] text-stone/80">{contact.value}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
