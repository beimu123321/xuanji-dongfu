/**
 * 个人信息接口（文档 5.3.2）
 * GET /api/profile  获取筑基档案（公开）
 * PUT /api/profile  更新筑基档案（鉴权）
 */
import { Router } from 'express';
import { requireAuth } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { getDb, logOperation, now, persist } from '../lib/store';
import type { CultivationLevel, TechItem } from '../lib/types';

const router = Router();

const LEVELS: CultivationLevel[] = ['炼气', '筑基', '金丹'];

/** 归一化主修功法数组 */
function normalizeTechStack(input: unknown): TechItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      if (typeof raw === 'string') {
        return { name: raw.trim(), level: '筑基' as CultivationLevel };
      }
      const item = (raw || {}) as { name?: unknown; level?: unknown };
      const name = String(item.name ?? '').trim();
      const level = LEVELS.includes(item.level as CultivationLevel)
        ? (item.level as CultivationLevel)
        : '筑基';
      return { name, level };
    })
    .filter((item) => item.name.length > 0)
    .slice(0, 30);
}

/** 归一化问候语数组 */
function normalizeGreetings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => String(s ?? '').trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

router.get(
  '/',
  asyncHandler((_req, res) => {
    ok(res, getDb().profile);
  }),
);

router.put(
  '/',
  requireAuth,
  asyncHandler((req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const profile = getDb().profile;

    if (body.dao_name !== undefined) {
      const name = String(body.dao_name).trim();
      if (name.length === 0) throw ApiError.badRequest('道号不可为空');
      if (name.length > 50) throw ApiError.badRequest('道号不得超过 50 字');
      profile.dao_name = name;
    }

    if (body.bone_age !== undefined) {
      const age = Number(body.bone_age);
      if (!Number.isFinite(age) || age < 0 || age > 999) throw ApiError.badRequest('骨龄须为 0-999 之间的数字');
      profile.bone_age = Math.floor(age);
    }

    if (body.location !== undefined) profile.location = String(body.location).trim().slice(0, 100);
    if (body.realm !== undefined) profile.realm = String(body.realm).trim().slice(0, 50);
    if (body.motto !== undefined) profile.motto = String(body.motto).trim().slice(0, 1000);
    if (body.avatar_url !== undefined) profile.avatar_url = String(body.avatar_url).trim().slice(0, 255);
    if (body.tech_stack !== undefined) profile.tech_stack = normalizeTechStack(body.tech_stack);
    if (body.greetings !== undefined) {
      const list = normalizeGreetings(body.greetings);
      if (list.length > 0) profile.greetings = list;
    }
    if (body.particle_strength !== undefined) {
      const v = Number(body.particle_strength);
      if (!Number.isFinite(v) || v < 0 || v > 100) throw ApiError.badRequest('粒子强度须为 0-100');
      profile.particle_strength = Math.round(v);
    }

    profile.updated_at = now();
    logOperation('更新修为', '筑基档案', req.admin?.username);
    persist();
    ok(res, profile, '修为已更新');
  }),
);

export default router;
