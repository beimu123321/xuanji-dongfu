/**
 * 传讯玉符面板（文档 3.7）
 */
import api from '../../api/client';
import { copyText, isLink, toHref } from '../../utils/clipboard';
import { useDongfuStore } from '../../store/useDongfuStore';

const ICONS = {
  email: '✉',
  github: '⌥',
  wechat: '❖',
  blog: '◈',
  qq: '❖',
  phone: '☏',
  twitter: '✧',
  link: '⛓',
};

export default function ContactPanel() {
  const contacts = useDongfuStore((s) => s.data.contacts);
  const showToast = useDongfuStore((s) => s.showToast);
  const goHome = useDongfuStore((s) => s.goHome);

  const handleActivate = async (contact) => {
    api.contactClick(contact.id).catch(() => {});
    if (isLink(contact.value)) {
      window.open(toHref(contact.value), '_blank', 'noopener,noreferrer');
      showToast('传讯已至');
      return;
    }
    const copied = await copyText(contact.value);
    showToast(copied ? `传讯已至 · ${contact.value}` : `传讯玉简：${contact.value}`);
  };

  return (
    <section className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 animate-inkRise px-4 pb-[62px] md:px-10 md:pb-7">
      <div className="ink-panel gold-frame relative mx-auto max-w-[880px] rounded-sm px-4 py-3">
        {/* 题名与退路并入一行，把高度让给上方悬空的四枚小玉符 */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-kai text-[15px] tracking-[0.26em] text-gold text-gold-glow">传讯玉符</h2>
          <p className="hidden text-[11.5px] tracking-[0.18em] text-stone/70 md:block">
            点击玉符即可传讯，或复制账号
          </p>
          <button
            type="button"
            onClick={goHome}
            className="btn-ghost shrink-0 rounded-sm px-3 py-[3px] text-[12px] tracking-[0.22em]"
          >
            退回前厅
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {contacts.length === 0 && (
            <p className="col-span-full py-3 text-center text-[13px] text-stone/70">玉符尚未炼制。</p>
          )}
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleActivate(contact)}
              className="group rounded-sm border border-gold/18 bg-xuanqingDeep/45 px-3 py-2 text-center transition-all hover:border-gold/60 hover:bg-gold/[0.08] hover:shadow-[0_0_20px_rgba(201,169,97,0.16)]"
            >
              <span className="block text-[17px] leading-none text-gold/80 transition group-hover:text-goldLight">
                {ICONS[contact.type] || '◈'}
              </span>
              <span className="mt-1.5 block font-kai text-[13.5px] leading-tight tracking-[0.14em] text-jade/95">
                {contact.label}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[11px] leading-tight text-stone/75" title={contact.value}>
                {contact.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
