import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 开发期把 /api 与 /uploads 代理到服务端，生产由 Nginx 反向代理（见文档 7.3）
const proxy = {
  '/api': { target: 'http://localhost:3000', changeOrigin: true },
  '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
};

export default defineConfig(({ mode }) => ({
  // 生产部署到 /admin 子路径（对应文档 7.3 的 Nginx 配置），开发期使用根路径
  base: mode === 'production' ? '/admin/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy,
  },
  // 生产构建的本地冒烟：预览时同样代理接口
  preview: {
    port: 4174,
    proxy,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['antd', '@ant-design/icons'],
          echarts: ['echarts'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}));
