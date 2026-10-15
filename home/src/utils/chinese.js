/**
 * 中文数字工具：面板与卷轴贴图共用，避免重复实现。
 */

/** 阿拉伯数字转中文（0-999，满足骨龄展示） */
export function numberToChinese(input) {
  const num = Number(input);
  if (!Number.isFinite(num) || num < 0) return String(input ?? '');
  const digits = '零一二三四五六七八九';
  if (num === 0) return '零';
  if (num < 10) return digits[num];
  if (num < 20) return `十${num % 10 === 0 ? '' : digits[num % 10]}`;
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${digits[tens]}十${ones === 0 ? '' : digits[ones]}`;
  }
  const hundreds = Math.floor(num / 100);
  const rest = num % 100;
  if (rest === 0) return `${digits[hundreds]}百`;
  if (rest < 10) return `${digits[hundreds]}百零${digits[rest]}`;
  return `${digits[hundreds]}百${numberToChinese(rest)}`;
}
