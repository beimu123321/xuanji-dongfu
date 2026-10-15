/**
 * Express 应用装配
 */
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import experiencesRouter from './routes/experiences';
import projectsRouter from './routes/projects';
import contactsRouter from './routes/contacts';
import settingsRouter from './routes/settings';
import statsRouter from './routes/stats';
import uploadRouter from './routes/upload';
import { errorHandler, notFoundHandler, ok } from './lib/http';

export function createApp(): express.Express {
  const app = express();

  // 跨域：默认放开，可通过 CORS_ORIGIN 收窄
  const origin = process.env.CORS_ORIGIN || '*';
  app.use(
    cors({
      origin: origin === '*' ? true : origin.split(',').map((s) => s.trim()),
      credentials: false,
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 静态资源：上传的图片
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d' }));

  // 健康检查
  app.get('/api/health', (_req, res) => {
    ok(res, { status: 'up', time: new Date().toISOString() }, '洞府安好');
  });

  // 业务路由
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/experiences', experiencesRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/upload', uploadRouter);

  // 404 与统一错误处理
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
