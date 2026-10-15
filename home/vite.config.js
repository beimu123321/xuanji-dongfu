import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发期把 /api 与 /uploads 代理到服务端，生产由 Nginx 反向代理（见文档 7.3）
const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy,
  },
  // 生产构建的本地冒烟：预览时同样代理接口，使 `pnpm preview` 能连到真实数据
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // 资源分包：three 单独成块，首屏只加载必要代码（文档 8.2）
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          vendor: ['react', 'react-dom', 'zustand', 'gsap'],
        },
      },
    },
  },
});
