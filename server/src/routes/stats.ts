/**
 * 洞府总览 / 数据统计（文档 4.4）
 * GET  /api/stats/overview  仪表盘聚合数据（鉴权）
 * POST /api/stats/visit     记一次来访（公开，前端首屏调用）
 */
import { Router } from 'express';
import { requireAuth } from '../lib/auth';
import { asyncHandler, ok } from '../lib/http';
import { dateKey, getDb, persist, rollDailyStats } from '../lib/store';

const router = Router();

/** 近 N 日趋势 */
function trend(days: number): { date: string; count: number }[] {
  const daily = getDb().stats.daily;
  return daily.slice(Math.max(0, daily.length - days));
}

router.post(
  '/visit',
  asyncHandler((_req, res) => {
    const db = getDb();
    rollDailyStats();
    db.stats.total += 1;
    db.stats.today += 1;
    const last = db.stats.daily[db.stats.daily.length - 1];
    if (last && last.date === dateKey()) last.count += 1;
    persist();
    ok(res, { total: db.stats.total, today: db.stats.today });
  }),
);

router.get(
  '/overview',
  requireAuth,
  asyncHandler((_req, res) => {
    const db = getDb();
    rollDailyStats();

    // 功法分类占比（按项目技术栈统计）
    const techCounter = new Map<string, number>();
    db.projects.forEach((p) => {
      p.tech_stack.forEach((t) => {
        techCounter.set(t, (techCounter.get(t) || 0) + 1);
      });
    });
    const techDistribution = Array.from(techCounter.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 品阶分布
    const levelCounter = new Map<string, number>();
    db.projects.forEach((p) => levelCounter.set(p.level, (levelCounter.get(p.level) || 0) + 1));
    const levelDistribution = Array.from(levelCounter.entries()).map(([name, value]) => ({ name, value }));

    ok(res, {
      cards: {
        visits: { total: db.stats.total, today: db.stats.today },
        projectViews: db.stats.projectViews,
        contactClicks: db.stats.contactClicks,
        collections: db.projects.length,
        onlineProjects: db.projects.filter((p) => p.status === 1).length,
        experiences: db.experiences.length,
        contacts: db.contacts.length,
      },
      trend7: trend(7),
      trend30: trend(30),
      techDistribution,
      levelDistribution,
      recentOperations: db.operations.slice(0, 8),
      topProjects: db.projects
        .slice()
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .map((p) => ({ id: p.id, name: p.name, views: p.views, category: p.category })),
    });
  }),
);

export default router;
