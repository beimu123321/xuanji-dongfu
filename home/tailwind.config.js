/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 国风水彩调（来源：参考图采样，见 src/theme/palette.js / README）。
        // 语义名沿用文档 3.1.1，色值整体由「墨玄夜色调」翻亮为「青绿水彩白昼」：
        // 底色三阶变浅（云雾白→薄荷），文字两阶变深（深青→中青灰），金变赭金一档。
        moxuan: '#EEF5EC', // 云雾白：全屏底 / 遮罩
        xuanqing: '#E1EFE6', // 玄青（浅）：面板底
        xuanqingDeep: '#D6E9DE',
        xuanqingMid: '#C2DDD0', // 玄青（最浅）：轨道 / 内衬
        gold: '#8A6F32', // 赭金：点缀文字与细线（浅底上要压深才读得清）
        goldLight: '#C9A961',
        jade: '#16504A', // 深青墨：正文主色
        stone: '#4E7370', // 青灰：次要文字
        pine: '#4C8A63', // 松绿
      },
      fontFamily: {
        kai: ['霞鹜文楷', 'LXGW WenKai', '思源宋体', 'Noto Serif SC', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        inkRise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        inkFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.4)', opacity: '0.75' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-14px,0)' },
          '100%': { transform: 'translate3d(0,0,0)' },
        },
      },
      animation: {
        inkRise: 'inkRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        inkFade: 'inkFade 0.8s ease both',
        breathe: 'breathe 4.2s ease-in-out infinite',
        spinSlow: 'spinSlow 22s linear infinite',
        ripple: 'ripple 1.1s ease-out forwards',
        drift: 'drift 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
