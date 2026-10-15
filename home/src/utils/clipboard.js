/**
 * 复制文本：优先使用 Clipboard API，不可用（非安全上下文 / 旧浏览器）时回落到 execCommand。
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyText(text) {
  const value = String(text ?? '');
  if (value.length === 0) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* 继续尝试回落方案 */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** 是否为可跳转的链接 */
export function isLink(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim());
}

/** 补全为完整链接 */
export function toHref(value) {
  const v = String(value ?? '').trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
  return v;
}
