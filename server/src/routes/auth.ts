/**
 * 鉴权接口（文档 5.3.1）
 * POST /api/auth/login   管理员登录（公开）
 * POST /api/auth/logout  退出登录（鉴权）
 * GET  /api/auth/profile 获取当前管理员信息（鉴权）
 * PUT  /api/auth/password 修改禁制密码（鉴权）
 * GET  /api/auth/logs    登录日志（鉴权）
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, signToken } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { getDb, logLogin, logOperation, now, persist } from '../lib/store';

const router = Router();

function clientIp(req: { headers: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '未知';
}

router.post(
  '/login',
  asyncHandler((req, res) => {
    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    const ua = String(req.headers['user-agent'] || '');

    if (!username || !password) {
      throw ApiError.badRequest('道号与禁制密码不可为空');
    }

    const db = getDb();
    const admin = db.admin.find((a) => a.username === String(username).trim());

    if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
      logLogin(String(username), clientIp(req), ua, false);
      persist();
      throw ApiError.unauthorized('禁制密码有误，请重试');
    }

    const token = signToken({ id: admin.id, username: admin.username }, db.settings.security.jwtExpiresIn);
    logLogin(admin.username, clientIp(req), ua, true);
    logOperation('开启禁制', '登录洞府', admin.username);
    persist();

    ok(res, {
      token,
      admin: { id: admin.id, username: admin.username },
      expiresIn: db.settings.security.jwtExpiresIn,
    }, '禁制已开启');
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler((req, res) => {
    if (req.admin) logOperation('关闭禁制', '退出洞府', req.admin.username);
    persist();
    ok(res, {}, '已退出洞府');
  }),
);

router.get(
  '/profile',
  requireAuth,
  asyncHandler((req, res) => {
    const admin = getDb().admin.find((a) => a.id === req.admin?.id);
    if (!admin) throw ApiError.notFound('管理员不存在');
    ok(res, {
      id: admin.id,
      username: admin.username,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    });
  }),
);

router.put(
  '/password',
  requireAuth,
  asyncHandler((req, res) => {
    const { oldPassword, newPassword } = (req.body || {}) as {
      oldPassword?: string;
      newPassword?: string;
    };
    if (!oldPassword || !newPassword) throw ApiError.badRequest('原密码与新密码均不可为空');
    if (String(newPassword).length < 6) throw ApiError.badRequest('新密码不得少于 6 位');

    const db = getDb();
    const admin = db.admin.find((a) => a.id === req.admin?.id);
    if (!admin) throw ApiError.notFound('管理员不存在');
    if (!bcrypt.compareSync(String(oldPassword), admin.password_hash)) {
      throw ApiError.badRequest('原禁制密码有误');
    }

    admin.password_hash = bcrypt.hashSync(String(newPassword), 10);
    admin.updated_at = now();
    logOperation('更换禁制', '管理员密码', admin.username);
    persist();
    ok(res, {}, '禁制已更换');
  }),
);

router.get(
  '/logs',
  requireAuth,
  asyncHandler((_req, res) => {
    ok(res, { list: getDb().loginLogs });
  }),
);

export default router;
