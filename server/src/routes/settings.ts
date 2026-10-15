/**
 * 洞府禁制 / 系统设置（文档 4.9）
 * GET /api/settings             读取全部设置（公开，前端渲染需要）
 * PUT /api/settings/basic       基础设置（鉴权）
 * PUT /api/settings/appearance  外观设置（鉴权）
 * PUT /api/settings/security    账号安全设置（鉴权）
 */
import { Router } from 'express';
import { requireAuth } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { getDb, logOperation, persist } from '../lib/store';
import type { SettingsRow } from '../lib/types';

const router = Router();

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DURATION_RE = /^\d+\s*(s|m|h|d)$/i;

function clamp01to100(v: unknown, field: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw ApiError.badRequest(`${field}须为 0-100 之间的数字`);
  return Math.round(n);
}

router.get(
  '/',
  asyncHandler((_req, res) => {
    ok(res, getDb().settings);
  }),
);

router.put(
  '/basic',
  requireAuth,
  asyncHandler((req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const basic = getDb().settings.basic;

    if (body.siteName !== undefined) {
      const v = String(body.siteName).trim();
      if (v.length === 0) throw ApiError.badRequest('洞府名称不可为空');
      if (v.length > 50) throw ApiError.badRequest('洞府名称不得超过 50 字');
      basic.siteName = v;
    }

    if (body.siteSubtitle !== undefined) basic.siteSubtitle = String(body.siteSubtitle).trim().slice(0, 100);

    if (body.loadingTexts !== undefined) {
      if (!Array.isArray(body.loadingTexts)) throw ApiError.badRequest('加载文案须为数组');
      const texts = body.loadingTexts.map((t) => String(t ?? '').trim()).slice(0, 5);
      if (texts.length !== 3 || texts.some((t) => t.length === 0)) {
        throw ApiError.badRequest('加载文案需恰好三段，分别对应 0-30% / 30-70% / 70-100%');
      }
      basic.loadingTexts = texts;
    }

    if (body.welcome !== undefined) basic.welcome = String(body.welcome).trim().slice(0, 200);

    if (body.easterEgg !== undefined) {
      const egg = (body.easterEgg || {}) as Record<string, unknown>;
      basic.easterEgg = {
        cultivation: egg.cultivation === undefined ? basic.easterEgg.cultivation : Boolean(egg.cultivation),
        fortune: egg.fortune === undefined ? basic.easterEgg.fortune : Boolean(egg.fortune),
        dayNight: egg.dayNight === undefined ? basic.easterEgg.dayNight : Boolean(egg.dayNight),
      };
    }

    logOperation('更新设置', '基础设置', req.admin?.username);
    persist();
    ok(res, getDb().settings, '修为已更新');
  }),
);

router.put(
  '/appearance',
  requireAuth,
  asyncHandler((req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const appearance = getDb().settings.appearance;

    if (body.primaryColor !== undefined) {
      const v = String(body.primaryColor).trim();
      if (!HEX_RE.test(v)) throw ApiError.badRequest('主题色调须为合法十六进制色值，例如 #C9A961');
      appearance.primaryColor = v;
    }

    if (body.inkDensity !== undefined) appearance.inkDensity = clamp01to100(body.inkDensity, '水墨浓度');
    if (body.particleStrength !== undefined) {
      appearance.particleStrength = clamp01to100(body.particleStrength, '粒子效果强度');
    }

    if (body.dayNightMode !== undefined) {
      const v = String(body.dayNightMode);
      if (!['auto', 'day', 'night'].includes(v)) throw ApiError.badRequest('昼夜模式仅可为 auto / day / night');
      appearance.dayNightMode = v as SettingsRow['appearance']['dayNightMode'];
    }

    if (body.liteModeDefault !== undefined) appearance.liteModeDefault = Boolean(body.liteModeDefault);

    if (body.avatarModel !== undefined) {
      const v = String(body.avatarModel ?? '').trim();
      // 只接受本机上传目录里的 .glb，或显式清空（回归内置模型）
      if (v !== '' && !/^\/uploads\/models\/[\w.-]+\.glb$/.test(v)) {
        throw ApiError.badRequest('人物模型须为上传得到的 .glb 地址');
      }
      appearance.avatarModel = v;
    }

    if (body.avatarYaw !== undefined) {
      const n = Number(body.avatarYaw);
      if (!Number.isFinite(n) || n < -180 || n > 180) throw ApiError.badRequest('人物朝向须为 -180 到 180 之间的角度');
      appearance.avatarYaw = Math.round(n);
    }

    if (body.avatarPose !== undefined) {
      const v = String(body.avatarPose);
      if (!['auto', 'raw'].includes(v)) throw ApiError.badRequest('手臂姿势仅可为 auto / raw');
      appearance.avatarPose = v as SettingsRow['appearance']['avatarPose'];
    }

    logOperation('更新设置', '外观设置', req.admin?.username);
    persist();
    ok(res, getDb().settings, '修为已更新');
  }),
);

router.put(
  '/security',
  requireAuth,
  asyncHandler((req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const security = getDb().settings.security;

    if (body.jwtExpiresIn !== undefined) {
      const v = String(body.jwtExpiresIn).trim();
      if (!DURATION_RE.test(v)) throw ApiError.badRequest('JWT 有效期格式形如 7d / 12h / 30m');
      security.jwtExpiresIn = v;
    }

    logOperation('更新设置', '禁制有效期', req.admin?.username);
    persist();
    ok(res, getDb().settings, '修为已更新');
  }),
);

export default router;
