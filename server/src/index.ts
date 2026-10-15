/**
 * 服务端入口
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { createApp } from './app';
import { initStore } from './lib/store';

// 依次尝试加载 server/.env 与工作目录 .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const PORT = Number(process.env.PORT || 3000);

initStore();

const app = createApp();

const server = app.listen(PORT, () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  console.log('');
  console.log('  ╭──────────────────────────────────────────╮');
  console.log('  │            玄 玑 洞 府 · 服 务 端          │');
  console.log('  ╰──────────────────────────────────────────╯');
  console.log(`  洞府禁制已开启  http://localhost:${PORT}`);
  console.log(`  健康探针        http://localhost:${PORT}/api/health`);
  console.log(`  默认道号        ${username}`);
  console.log('');
});

/** 优雅退出：避免开发期端口占用 */
function shutdown(signal: string): void {
  console.log(`\n[server] 收到 ${signal}，正在关闭洞府…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
