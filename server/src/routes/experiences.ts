/**
 * 修行履历接口（文档 5.3.3 + 4.6）
 * GET    /api/experiences            列表（公开；管理员可见全量，游客仅见上架）
 * POST   /api/experiences            新增（鉴权）
 * PUT    /api/experiences/:id        编辑（鉴权）
 * DELETE /api/experiences/:id        删除（鉴权）
 * POST   /api/experiences/batch      批量删除 / 批量上下架（鉴权）
 * POST   /api/experiences/sort       拖拽排序（鉴权）
 */
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { getDb, logOperation, nextId, now, persist } from '../lib/store';
import type { ExperienceRow } from '../lib/types';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('无效的 ID');
  return id;
}

/** 校验并抽取可写字段 */
function pickFields(body: Record<string, unknown>): Partial<ExperienceRow> {
  const out: Partial<ExperienceRow> = {};

  if (body.sect_name !== undefined) {
    const v = String(body.sect_name).trim();
    if (v.length === 0) throw ApiError.badRequest('宗门名称不可为空');
    if (v.length > 100) throw ApiError.badRequest('宗门名称不得超过 100 字');
    out.sect_name = v;
  }

  if (body.position !== undefined) {
    const v = String(body.position).trim();
    if (v.length === 0) throw ApiError.badRequest('司职不可为空');
    if (v.length > 50) throw ApiError.badRequest('司职不得超过 50 字');
    out.position = v;
  }

  if (body.start_date !== undefined) {
    const v = String(body.start_date).trim();
    if (!DATE_RE.test(v)) throw ApiError.badRequest('修行开始时间格式应为 YYYY-MM-DD');
    out.start_date = v;
  }

  if (body.end_date !== undefined) {
    const v = String(body.end_date ?? '').trim();
    if (v.length > 0 && !DATE_RE.test(v)) throw ApiError.badRequest('修行结束时间格式应为 YYYY-MM-DD');
    out.end_date = v;
  }

  if (body.duties !== undefined) out.duties = String(body.duties).slice(0, 20000);
  if (body.achievements !== undefined) out.achievements = String(body.achievements).slice(0, 20000);

  if (body.sort !== undefined) {
    const v = Number(body.sort);
    if (!Number.isFinite(v)) throw ApiError.badRequest('排序权重须为数字');
    out.sort = Math.trunc(v);
  }

  if (body.status !== undefined) {
    const v = Number(body.status);
    if (v !== 0 && v !== 1) throw ApiError.badRequest('状态仅可为 0（下架）或 1（上架）');
    out.status = v;
  }

  return out;
}

function assertDates(start?: string, end?: string): void {
  if (start && end && end.length > 0 && end < start) {
    throw ApiError.badRequest('修行结束时间不得早于开始时间');
  }
}

router.get(
  '/',
  optionalAuth,
  asyncHandler((req, res) => {
    const db = getDb();
    const isAdmin = Boolean(req.admin);
    const list = db.experiences
      .filter((e) => isAdmin || e.status === 1)
      .slice()
      .sort((a, b) => (a.sort === b.sort ? b.id - a.id : a.sort - b.sort));
    ok(res, { list, total: list.length });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler((req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const fields = pickFields(body);
    if (!fields.sect_name) throw ApiError.badRequest('宗门名称不可为空');
    if (!fields.position) throw ApiError.badRequest('司职不可为空');
    if (!fields.start_date) throw ApiError.badRequest('修行开始时间不可为空');
    assertDates(fields.start_date, fields.end_date);

    const db = getDb();
    const row: ExperienceRow = {
      id: nextId('experience'),
      sect_name: fields.sect_name,
      position: fields.position,
      start_date: fields.start_date,
      end_date: fields.end_date ?? '',
      duties: fields.duties ?? '',
      achievements: fields.achievements ?? '',
      sort: fields.sort ?? db.experiences.length + 1,
      status: fields.status ?? 1,
      created_at: now(),
      updated_at: now(),
    };
    db.experiences.push(row);
    logOperation('新增履历', row.sect_name, req.admin?.username);
    persist();
    ok(res, row, '履历已铭刻');
  }),
);

router.put(
  '/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const db = getDb();
    const row = db.experiences.find((e) => e.id === id);
    if (!row) throw ApiError.notFound('该段履历不存在');

    const fields = pickFields((req.body || {}) as Record<string, unknown>);
    assertDates(fields.start_date ?? row.start_date, fields.end_date ?? row.end_date);

    Object.assign(row, fields, { updated_at: now() });
    logOperation('修订履历', row.sect_name, req.admin?.username);
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
    const index = db.experiences.findIndex((e) => e.id === id);
    if (index === -1) throw ApiError.notFound('该段履历不存在');
    const [removed] = db.experiences.splice(index, 1);
    logOperation('移除履历', removed.sect_name, req.admin?.username);
    persist();
    ok(res, { id }, '已移除');
  }),
);

router.post(
  '/batch',
  requireAuth,
  asyncHandler((req, res) => {
    const { ids, action } = (req.body || {}) as { ids?: unknown; action?: string };
    if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('请先勾选履历');
    const idList = ids.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
    if (idList.length === 0) throw ApiError.badRequest('无效的 ID 列表');

    const db = getDb();
    if (action === 'delete') {
      db.experiences = db.experiences.filter((e) => !idList.includes(e.id));
      logOperation('批量移除履历', `${idList.length} 条`, req.admin?.username);
    } else if (action === 'online' || action === 'offline') {
      const status = action === 'online' ? 1 : 0;
      db.experiences.forEach((e) => {
        if (idList.includes(e.id)) {
          e.status = status;
          e.updated_at = now();
        }
      });
      logOperation(action === 'online' ? '批量上架履历' : '批量下架履历', `${idList.length} 条`, req.admin?.username);
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
      const id = Number(raw);
      const row = db.experiences.find((e) => e.id === id);
      if (row) {
        row.sort = index + 1;
        row.updated_at = now();
      }
    });
    logOperation('调整排序', '修行履历', req.admin?.username);
    persist();
    ok(res, {}, '顺序已定');
  }),
);

export default router;
