import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useDongfuStore } from './store/useDongfuStore';
import './index.css';

// 开发期调试钩子：可在控制台直接切换场景，如 __xuanjiStore.getState().goTo('project')
if (import.meta.env.DEV) {
  window.__xuanjiStore = useDongfuStore;
}

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 隐藏首屏占位（关键 CSS 内联，见 index.html）
window.requestAnimationFrame(() => {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    splash.classList.add('hide');
    window.setTimeout(() => splash.remove(), 700);
  }
});
