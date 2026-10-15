/**
 * 传讯玉符接口（文档 4.8）
 * GET    /api/contacts            列表（公开；管理员可见全量）
 * POST   /api/contacts            新增（鉴权）
 * PUT    /api/contacts/:id        编辑（鉴权）
 * DELETE /api/contacts/:id        删除（鉴权）
 * POST   /api/contacts/:id/click  记一次传讯（公开）
 * POST   /api/contacts/batch      批量删除 / 显隐（鉴权）
 * POST   /api/contacts/sort       拖拽排序（鉴权）
 */
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { getDb, logOperation, nextId, now, persist } from '../lib/store';
import type { ContactRow } from '../lib/types';

const router = Router();

/** 内置玉符类型 */
const TYPES = ['email', 'github', 'wechat', 'blog', 'qq', 'phone', 'twitter', 'link'];

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('无效的 ID');
  return id;
}

function pickFields(body: Record<string, unknown>): Partial<ContactRow> {
  const out: Partial<ContactRow> = {};

  if (body.type !== undefined) {
    const v = String(body.type).trim().toLowerCase();
    if (v.length === 0) throw ApiError.badRequest('玉符类型不可为空');
    if (v.length > 50) throw ApiError.badRequest('玉符类型不得超过 50 字');
    out.type = v;
  }

  if (body.label !== undefined) {
    const v = String(body.label).trim();
    if (v.length === 0) throw ApiError.badRequest('显示名称不可为空');
    if (v.length > 50) throw ApiError.badRequest('显示名称不得超过 50 字');
    out.label = v;
  }

  if (body.value !== undefined) {
    const v = String(body.value).trim();
    if (v.length === 0) throw ApiError.badRequest('账号 / 链接不可为空');
    if (v.length > 255) throw ApiError.badRequest('账号 / 链接不得超过 255 字');
    out.value = v;
  }

  if (body.icon !== undefined) out.icon = String(body.icon).trim().slice(0, 100);

  if (body.sort !== undefined) {
    const v = Number(body.sort);
    if (!Number.isFinite(v)) throw ApiError.badRequest('排序权重须为数字');
    out.sort = Math.trunc(v);
  }

  if (body.status !== undefined) {
    const v = Number(body.status);
    if (v !== 0 && v !== 1) throw ApiError.badRequest('状态仅可为 0（隐藏）或 1（显示）');
    out.status = v;
  }

  return out;
}

router.get(
  '/',
  optionalAuth,
  asyncHandler((req, res) => {
    const db = getDb();
    const isAdmin = Boolean(req.admin);
    const list = db.contacts
      .filter((c) => isAdmin || c.status === 1)
      .slice()
      .sort((a, b) => (a.sort === b.sort ? a.id - b.id : a.sort - b.sort));
    ok(res, { list, total: list.length, types: TYPES });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler((req, res) => {
    const fields = pickFields((req.body || {}) as Record<string, unknown>);
    if (!fields.type) throw ApiError.badRequest('玉符类型不可为空');
    if (!fields.label) throw ApiError.badRequest('显示名称不可为空');
    if (!fields.value) throw ApiError.badRequest('账号 / 链接不可为空');

    const db = getDb();
    const row: ContactRow = {
      id: nextId('contact'),
      type: fields.type,
      label: fields.label,
      value: fields.value,
      icon: fields.icon ?? fields.type,
      sort: fields.sort ?? db.contacts.length + 1,
      status: fields.status ?? 1,
      clicks: 0,
      created_at: now(),
      updated_at: now(),
    };
    db.contacts.push(row);
    logOperation('新增玉符', row.label, req.admin?.username);
    persist();
    ok(res, row, '玉符已炼制');
  }),
);

router.put(
  '/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const row = getDb().contacts.find((c) => c.id === id);
    if (!row) throw ApiError.notFound('该枚玉符不存在');
    Object.assign(row, pickFields((req.body || {}) as Record<string, unknown>), { updated_at: now() });
    logOperation('修订玉符', row.label, req.admin?.username);
    persist();
    ok(res, row, '修为已更新');
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const db = getDb();
    const index = db.contacts.findIndex((c) => c.id === id);
    if (index === -1) throw ApiError.notFound('该枚玉符不存在');
    const [removed] = db.contacts.splice(index, 1);
    logOperation('移除玉符', removed.label, req.admin?.username);
    persist();
    ok(res, { id }, '已移除');
  }),
);

router.post(
  '/:id/click',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const db = getDb();
    const row = db.contacts.find((c) => c.id === id);
    if (!row) throw ApiError.notFound('该枚玉符不存在');
    row.clicks += 1;
    db.stats.contactClicks += 1;
    persist();
    ok(res, { id: row.id, clicks: row.clicks });
  }),
);

router.post(
  '/batch',
  requireAuth,
  asyncHandler((req, res) => {
    const { ids, action } = (req.body || {}) as { ids?: unknown; action?: string };
    if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('请先勾选玉符');
    const idList = ids.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
    if (idList.length === 0) throw ApiError.badRequest('无效的 ID 列表');

    const db = getDb();
    if (action === 'delete') {
      db.contacts = db.contacts.filter((c) => !idList.includes(c.id));
      logOperation('批量移除玉符', `${idList.length} 枚`, req.admin?.username);
    } else if (action === 'show' || action === 'hide') {
      const status = action === 'show' ? 1 : 0;
      db.contacts.forEach((c) => {
        if (idList.includes(c.id)) {
          c.status = status;
          c.updated_at = now();
        }
      });
      logOperation(action === 'show' ? '批量显示玉符' : '批量隐藏玉符', `${idList.length} 枚`, req.admin?.username);
    } else {
      throw ApiError.badRequest('不支持的操作类型');
    }

    persist();
    ok(res, { affected: idList.length }, '功成');
  }),
);

router.post(
  '/sort',
  requireAuth,
  asyncHandler((req, res) => {
    const { ids } = (req.body || {}) as { ids?: unknown };
    if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('排序列表不可为空');
    const db = getDb();
    ids.forEach((raw, index) => {
      const row = db.contacts.find((c) => c.id === Number(raw));
      if (row) {
        row.sort = index + 1;
        row.updated_at = now();
      }
    });
    logOperation('调整排序', '传讯玉符', req.admin?.username);
    persist();
    ok(res, {}, '顺序已定');
  }),
);

export default router;
