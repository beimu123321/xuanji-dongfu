/**
 * 丹器馆藏接口（文档 5.3.4 + 4.7）
 * GET    /api/projects               列表（公开；管理员可见全量）
 * GET    /api/projects/:id           详情（公开）
 * POST   /api/projects               新增（鉴权）
 * PUT    /api/projects/:id           编辑（鉴权）
 * DELETE /api/projects/:id           删除（鉴权）
 * POST   /api/projects/:id/view      记一次品鉴（公开）
 * POST   /api/projects/batch         批量删除 / 上下架（鉴权）
 * POST   /api/projects/sort          拖拽排序（鉴权）
 * POST   /api/projects/import-github 一键导入 GitHub 项目（鉴权）
 */
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../lib/auth';
import { ApiError, asyncHandler, ok } from '../lib/http';
import { getDb, logOperation, nextId, now, persist } from '../lib/store';
import type { ProjectRow } from '../lib/types';

const router = Router();

const LEVELS = ['入门', '进阶', '高阶'];

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('无效的 ID');
  return id;
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length > 0)
    .slice(0, 30);
}

function pickFields(body: Record<string, unknown>): Partial<ProjectRow> {
  const out: Partial<ProjectRow> = {};

  if (body.name !== undefined) {
    const v = String(body.name).trim();
    if (v.length === 0) throw ApiError.badRequest('法宝名不可为空');
    if (v.length > 100) throw ApiError.badRequest('法宝名不得超过 100 字');
    out.name = v;
  }

  if (body.level !== undefined) {
    const v = String(body.level).trim();
    if (!LEVELS.includes(v)) throw ApiError.badRequest('品阶仅可为：入门 / 进阶 / 高阶');
    out.level = v;
  }

  if (body.category !== undefined) {
    const v = String(body.category).trim();
    if (v.length > 50) throw ApiError.badRequest('分类不得超过 50 字');
    out.category = v;
  }

  if (body.tech_stack !== undefined) out.tech_stack = normalizeTags(body.tech_stack);
  if (body.description !== undefined) out.description = String(body.description).slice(0, 20000);

  if (body.github_url !== undefined) {
    const v = String(body.github_url).trim();
    if (v.length > 0 && !/^https?:\/\//i.test(v)) throw ApiError.badRequest('祭炼之地须为 http(s) 开头的链接');
    out.github_url = v.slice(0, 255);
  }

  if (body.cover_url !== undefined) out.cover_url = String(body.cover_url).trim().slice(0, 255);

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

router.get(
  '/',
  optionalAuth,
  asyncHandler((req, res) => {
    const db = getDb();
    const isAdmin = Boolean(req.admin);
    const { category, level, status, keyword } = req.query as Record<string, string | undefined>;

    let list = db.projects.filter((p) => isAdmin || p.status === 1);
    if (category) list = list.filter((p) => p.category === category);
    if (level) list = list.filter((p) => p.level === level);
    if (status !== undefined && status !== '' && isAdmin) list = list.filter((p) => String(p.status) === status);
    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.tech_stack.some((t) => t.toLowerCase().includes(kw)),
      );
    }

    list = list.slice().sort((a, b) => (a.sort === b.sort ? b.id - a.id : a.sort - b.sort));

    // 供筛选面板使用的可选值
    const categories = Array.from(new Set(db.projects.filter((p) => isAdmin || p.status === 1).map((p) => p.category).filter(Boolean)));

    ok(res, { list, total: list.length, categories, levels: LEVELS });
  }),
);

router.get(
  '/:id',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const row = getDb().projects.find((p) => p.id === id);
    if (!row) throw ApiError.notFound('该件法宝不存在');
    ok(res, row);
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler((req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const fields = pickFields(body);
    if (!fields.name) throw ApiError.badRequest('法宝名不可为空');

    const db = getDb();
    const row: ProjectRow = {
      id: nextId('project'),
      name: fields.name,
      level: fields.level ?? '入门',
      category: fields.category ?? '前端',
      tech_stack: fields.tech_stack ?? [],
      description: fields.description ?? '',
      github_url: fields.github_url ?? '',
      cover_url: fields.cover_url ?? '',
      sort: fields.sort ?? db.projects.length + 1,
      status: fields.status ?? 1,
      views: 0,
      created_at: now(),
      updated_at: now(),
    };
    db.projects.push(row);
    logOperation('新增丹器', row.name, req.admin?.username);
    persist();
    ok(res, row, '丹器已入库');
  }),
);

router.put(
  '/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const row = getDb().projects.find((p) => p.id === id);
    if (!row) throw ApiError.notFound('该件法宝不存在');
    Object.assign(row, pickFields((req.body || {}) as Record<string, unknown>), { updated_at: now() });
    logOperation('修订丹器', row.name, req.admin?.username);
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
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) throw ApiError.notFound('该件法宝不存在');
    const [removed] = db.projects.splice(index, 1);
    logOperation('移除丹器', removed.name, req.admin?.username);
    persist();
    ok(res, { id }, '已移除');
  }),
);

router.post(
  '/:id/view',
  asyncHandler((req, res) => {
    const id = parseId(req.params.id);
    const db = getDb();
    const row = db.projects.find((p) => p.id === id);
    if (!row) throw ApiError.notFound('该件法宝不存在');
    row.views += 1;
    db.stats.projectViews += 1;
    persist();
    ok(res, { id: row.id, views: row.views });
  }),
);

router.post(
  '/batch',
  requireAuth,
  asyncHandler((req, res) => {
    const { ids, action } = (req.body || {}) as { ids?: unknown; action?: string };
    if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('请先勾选法宝');
    const idList = ids.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
    if (idList.length === 0) throw ApiError.badRequest('无效的 ID 列表');

    const db = getDb();
    if (action === 'delete') {
      db.projects = db.projects.filter((p) => !idList.includes(p.id));
      logOperation('批量移除丹器', `${idList.length} 件`, req.admin?.username);
    } else if (action === 'online' || action === 'offline') {
      const status = action === 'online' ? 1 : 0;
      db.projects.forEach((p) => {
        if (idList.includes(p.id)) {
          p.status = status;
          p.updated_at = now();
        }
      });
      logOperation(action === 'online' ? '批量上架丹器' : '批量下架丹器', `${idList.length} 件`, req.admin?.username);
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
      const row = db.projects.find((p) => p.id === Number(raw));
      if (row) {
        row.sort = index + 1;
        row.updated_at = now();
      }
    });
    logOperation('调整排序', '丹器馆藏', req.admin?.username);
    persist();
    ok(res, {}, '顺序已定');
  }),
);

/**
 * 一键导入 GitHub 项目：抓取名称 / 描述 / 主要语言
 * 仓库不存在或网络不畅时给出明确提示，不静默失败。
 */
router.post(
  '/import-github',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { repo } = (req.body || {}) as { repo?: string };
    if (!repo || String(repo).trim().length === 0) throw ApiError.badRequest('请填写仓库地址或 owner/repo');

    const raw = String(repo).trim();
    const match = raw.match(/(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    if (!match) throw ApiError.badRequest('无法解析仓库地址，示例：https://github.com/facebook/react');

    const owner = match[1];
    const name = match[2];
    const api = `https://api.github.com/repos/${owner}/${name}`;

    let payload: { name?: string; description?: string; language?: string; html_url?: string; topics?: string[] };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(api, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'xuanji-dongfu' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) {
        throw ApiError.badRequest(
          resp.status === 404 ? '未寻得该处洞府（仓库不存在）' : `祭炼之地暂不可达（HTTP ${resp.status}）`,
        );
      }
      payload = (await resp.json()) as typeof payload;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.badRequest('灵脉不畅，无法连通祭炼之地，请稍后再试');
    }

    const tags = [payload.language, ...(payload.topics || [])].filter(Boolean) as string[];

    ok(
      res,
      {
        name: payload.name || name,
        description: payload.description || '',
        tech_stack: Array.from(new Set(tags)).slice(0, 10),
        github_url: payload.html_url || `https://github.com/${owner}/${name}`,
        level: '入门',
        category: '前端',
      },
      '已从祭炼之地取回信息',
    );
  }),
);

export default router;
