/**
 * 玄玑洞府 · 数据访问层
 *
 * 设计说明：
 * 文档第五章推荐使用 MySQL + Prisma。为了让项目「零配置即可运行」，
 * 此处实现了一个与文档表结构完全一致的文档型存储（JSON 落盘 + 原子写入），
 * 对外暴露的实体字段、约束、自增 ID 规则与 SQL 方案完全相同。
 * 若需切换到 MySQL，仅需替换本文件中的读写实现，路由层无需改动。
 * 对应的建表语句见 server/schema.sql。
 */
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type {
  AdminRow,
  ContactRow,
  DatabaseShape,
  ExperienceRow,
  LoginLogRow,
  OperationRow,
  ProfileRow,
  ProjectRow,
  SettingsRow,
  StatsRow,
} from './types';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TMP_FILE = path.join(DATA_DIR, 'db.json.tmp');

/* ------------------------------------------------------------------ */
/* 工具函数                                                             */
/* ------------------------------------------------------------------ */

/** 本地时区的 YYYY-MM-DD */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 当前 ISO 时间字符串 */
export function now(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* 种子数据                                                             */
/* ------------------------------------------------------------------ */

function buildSeedDaily(): { date: string; count: number }[] {
  // 真实起点：部署当日记为 0 访客，后续由 POST /api/stats/visit 真实累加
  return [{ date: dateKey(), count: 0 }];
}

function buildSeed(): DatabaseShape {
  const t = now();
  const ts = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  const experiences: ExperienceRow[] = [
    {
      id: 1,
      sect_name: '青云数术阁',
      position: '全栈炼器师',
      start_date: '2023-06-01',
      end_date: '',
      duties:
        '主理洞府前台阵法（前端架构）与后台禁制（服务端接口）之贯通；\n' +
        '以 React / TypeScript 铸阵基，以 Node.js 通灵脉；\n' +
        '统筹炼丹炉（CI/CD）火候，保障每日丹药（版本）如期出炉。',
      achievements:
        '- 重构三处上古残阵，首屏灵气凝聚（加载）提速 **62%**\n' +
        '- 自创「分层注灵法」，使新法器上手时辰由三日缩至半日\n' +
        '- 主持两届宗门技术论道，传道弟子二十余人',
      sort: 1,
      status: 1,
      created_at: ts(420),
      updated_at: ts(30),
    },
    {
      id: 2,
      sect_name: '听雨斋',
      position: '前端布阵师',
      start_date: '2021-09-01',
      end_date: '2023-05-20',
      duties:
        '掌门户可视化法阵（数据看板）之布置；\n' +
        '以 ECharts 绘灵脉走势，以 Ant Design 筑殿宇格局；\n' +
        '与炼器、丹房诸峰协同，共炼大型法器三件。',
      achievements:
        '- 独立完成洞府控制台，替代旧日手工符箓（Excel 报表）\n' +
        '- 沉淀通用阵图组件库，复用率逾 **七成**',
      sort: 2,
      status: 1,
      created_at: ts(760),
      updated_at: ts(400),
    },
    {
      id: 3,
      sect_name: '寒山书院',
      position: '见习阵法学徒',
      start_date: '2020-07-01',
      end_date: '2021-08-31',
      duties: '誊抄古籍（维护旧站）、修补符纹（样式与兼容性修缮）、\n协助师兄校对阵图（页面走查与联调）。',
      achievements: '- 于三月内通读宗门阵道总纲，独立承接小阵图修缮二十余处',
      sort: 3,
      status: 1,
      created_at: ts(1100),
      updated_at: ts(760),
    },
  ];

  const projects: ProjectRow[] = [
    {
      id: 1,
      name: '玄玑洞府',
      level: '高阶',
      category: '前端',
      tech_stack: ['React', 'Three.js', 'TypeScript', 'GSAP'],
      description:
        '以东方水墨为骨、低多边形为魂的个人洞府。\n' +
        '六大场景自由游历，镜头丝滑转场，全场景可交互；后台可视化配置全部内容。',
      github_url: 'https://github.com/xuanjizi/xuanji-dongfu',
      cover_url: '',
      sort: 1,
      status: 1,
      views: 0,
      created_at: ts(120),
      updated_at: ts(3),
    },
    {
      id: 2,
      name: '灵脉图鉴',
      level: '进阶',
      category: '可视化',
      tech_stack: ['ECharts', 'Vue3', 'Pinia'],
      description: '以灵脉（数据）为纲的动态图鉴，支持万级节点流畅渲染与多维下钻。',
      github_url: 'https://github.com/xuanjizi/lingmai-atlas',
      cover_url: '',
      sort: 2,
      status: 1,
      views: 0,
      created_at: ts(260),
      updated_at: ts(40),
    },
    {
      id: 3,
      name: '丹炉调度器',
      level: '高阶',
      category: '服务端',
      tech_stack: ['NestJS', 'Redis', 'MySQL', 'Docker'],
      description: '宗门丹药（任务）自动调度之器。支持优先级、重试、熔断与实时丹温（任务状态）观测。',
      github_url: 'https://github.com/xuanjizi/danlu-scheduler',
      cover_url: '',
      sort: 3,
      status: 1,
      views: 0,
      created_at: ts(300),
      updated_at: ts(60),
    },
    {
      id: 4,
      name: '御剑飞行手册',
      level: '入门',
      category: '工程化',
      tech_stack: ['Vite', 'pnpm', 'ESLint'],
      description: '前端工程化入门心法：从阵基（脚手架）到炼丹炉（构建流水线）的一站式指引。',
      github_url: 'https://github.com/xuanjizi/yujian-starter',
      cover_url: '',
      sort: 4,
      status: 1,
      views: 0,
      created_at: ts(180),
      updated_at: ts(90),
    },
    {
      id: 5,
      name: '符纹识别阵',
      level: '进阶',
      category: '硬件',
      tech_stack: ['Python', 'OpenCV', 'ESP32'],
      description: '以微末算力（单片机）辨识符纹（图形码），用于洞府禁制之自动开启。',
      github_url: 'https://github.com/xuanjizi/rune-scanner',
      cover_url: '',
      sort: 5,
      status: 1,
      views: 0,
      created_at: ts(340),
      updated_at: ts(150),
    },
    {
      id: 6,
      name: '静室心法',
      level: '入门',
      category: '运维',
      tech_stack: ['Nginx', 'Docker', 'Shell'],
      description: '一台薄云主机承载多座洞府（站点）之部署心法，含证书自动续期与日志归拢。',
      github_url: 'https://github.com/xuanjizi/jingshi-ops',
      cover_url: '',
      sort: 6,
      status: 1,
      views: 0,
      created_at: ts(220),
      updated_at: ts(100),
    },
  ];

  const contacts: ContactRow[] = [
    {
      id: 1,
      type: 'email',
      label: '飞符传书',
      value: 'xuanjizi@example.com',
      icon: 'mail',
      sort: 1,
      status: 1,
      clicks: 0,
      created_at: t,
      updated_at: t,
    },
    {
      id: 2,
      type: 'github',
      label: '神念印记',
      value: 'https://github.com/xuanjizi',
      icon: 'github',
      sort: 2,
      status: 1,
      clicks: 0,
      created_at: t,
      updated_at: t,
    },
    {
      id: 3,
      type: 'wechat',
      label: '传音玉简',
      value: 'xuanji_dongfu',
      icon: 'wechat',
      sort: 3,
      status: 1,
      clicks: 0,
      created_at: t,
      updated_at: t,
    },
    {
      id: 4,
      type: 'blog',
      label: '洞府门牌',
      value: 'https://blog.example.com',
      icon: 'link',
      sort: 4,
      status: 1,
      clicks: 0,
      created_at: t,
      updated_at: t,
    },
  ];

  const settings: SettingsRow = {
    basic: {
      siteName: '玄玑洞府',
      siteSubtitle: '以代码为器 · 以创意为丹',
      loadingTexts: ['道友请少待…', '洞府禁制正在开启…', '即将入府…'],
      welcome: '道友远来，洞府蓬荜生辉。',
      easterEgg: { cultivation: true, fortune: true, dayNight: true },
    },
    appearance: {
      primaryColor: '#C9A961',
      inkDensity: 60,
      particleStrength: 70,
      dayNightMode: 'auto',
      liteModeDefault: false,
      avatarModel: '',
      avatarYaw: 0,
      avatarPose: 'auto',
    },
    security: {
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  };

  const daily = buildSeedDaily();
  const stats: StatsRow = {
    total: 0,
    today: 0,
    todayDate: daily[daily.length - 1].date,
    daily,
    projectViews: 0,
    contactClicks: 0,
  };

  const admin: AdminRow[] = [
    {
      id: 1,
      username: adminUsername,
      password_hash: bcrypt.hashSync(adminPassword, 10),
      created_at: t,
      updated_at: t,
    },
  ];

  return {
    _seq: {
      admin: admin.length,
      experience: experiences.length,
      project: projects.length,
      contact: contacts.length,
      loginLog: 0,
      operation: 0,
    },
    admin,
    profile: {
      id: 1,
      dao_name: '玄玑子',
      bone_age: 23,
      location: '中原 · 焦作地界',
      realm: '筑基有成，稳步金丹',
      motto: '以代码为器，以创意为丹，炼就数字乾坤。',
      tech_stack: [
        { name: 'TypeScript', level: '金丹' },
        { name: 'React', level: '金丹' },
        { name: 'Node.js', level: '筑基' },
        { name: 'Three.js', level: '筑基' },
        { name: 'Vue', level: '筑基' },
        { name: 'Docker', level: '炼气' },
        { name: 'MySQL', level: '炼气' },
        { name: 'Python', level: '炼气' },
      ],
      avatar_url: '',
      particle_strength: 70,
      greetings: [
        '道友安好，可曾用膳？',
        '此间功法，任君翻阅。',
        '道友此来，可是为丹器而来？',
        '洞府清冷，唯灵脉长流。',
        '相逢即是缘，请入座论道。',
      ],
      updated_at: ts(2),
    },
    experiences,
    projects,
    contacts,
    settings,
    stats,
    loginLogs: [],
    operations: [],
  };
}

/* ------------------------------------------------------------------ */
/* 读写                                                                */
/* ------------------------------------------------------------------ */

let db: DatabaseShape = buildSeed();

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** 落盘（原子写入，避免进程中断导致数据文件损坏） */
export function persist(): void {
  ensureDirs();
  const json = JSON.stringify(db, null, 2);
  fs.writeFileSync(TMP_FILE, json, 'utf8');
  fs.renameSync(TMP_FILE, DB_FILE);
}

/** 读取数据文件；不存在或损坏时以种子数据重建 */
export function initStore(): void {
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DatabaseShape;
      if (parsed && parsed.admin && parsed.profile && parsed.settings) {
        // 补齐可能缺失的新增字段，保证旧数据文件向后兼容
        const seed = buildSeed();
        const merged: DatabaseShape = {
          ...seed,
          ...parsed,
          profile: { ...seed.profile, ...(parsed.profile || {}) },
          settings: {
            basic: { ...seed.settings.basic, ...(parsed.settings.basic || {}) },
            appearance: { ...seed.settings.appearance, ...(parsed.settings.appearance || {}) },
            security: { ...seed.settings.security, ...(parsed.settings.security || {}) },
          },
          _seq: { ...seed._seq, ...(parsed._seq || {}) },
        };
        db = merged;
        return;
      }
    } catch (err) {
      console.warn('[store] 数据文件解析失败，将以初始数据重建：', (err as Error).message);
    }
  }
  db = buildSeed();
  persist();
}

/** 获取整库（只读引用，请勿直接修改后忘记 persist） */
export function getDb(): DatabaseShape {
  return db;
}

/** 自增主键 */
export function nextId(key: keyof DatabaseShape['_seq'] | string): number {
  const cur = (db._seq[key] || 0) + 1;
  db._seq[key] = cur;
  return cur;
}

/** 记录一条后台操作 */
export function logOperation(action: string, target: string, operator = 'admin'): void {
  const row: OperationRow = {
    id: nextId('operation'),
    action,
    target,
    operator,
    created_at: now(),
  };
  db.operations.unshift(row);
  if (db.operations.length > 100) db.operations.length = 100;
}

/** 记录登录日志 */
export function logLogin(username: string, ip: string, userAgent: string, success: boolean): void {
  const row: LoginLogRow = {
    id: nextId('loginLog'),
    username,
    ip,
    user_agent: userAgent,
    success,
    created_at: now(),
  };
  db.loginLogs.unshift(row);
  if (db.loginLogs.length > 200) db.loginLogs.length = 200;
}

/** 校验并返回一个新的日期序列（用于跨天时重置今日访问量） */
export function rollDailyStats(): void {
  const today = dateKey();
  if (db.stats.todayDate !== today) {
    db.stats.daily.push({ date: today, count: 0 });
    while (db.stats.daily.length > 30) db.stats.daily.shift();
    db.stats.todayDate = today;
    db.stats.today = 0;
  }
}

/** 重置整库（仅供开发调试） */
export function resetStore(): void {
  db = buildSeed();
  persist();
}

export type { AdminRow, ProfileRow, ExperienceRow, ProjectRow, ContactRow, SettingsRow, StatsRow };
