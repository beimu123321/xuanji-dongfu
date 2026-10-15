/**
 * 玄玑洞府 · 服务端数据类型定义
 * 字段命名与《开发文档》第五章「数据库设计」保持一一对应（snake_case）。
 */

/** 功法等级 */
export type CultivationLevel = '炼气' | '筑基' | '金丹';

/** 主修功法条目 */
export interface TechItem {
  /** 功法名（技术名） */
  name: string;
  /** 修习程度 */
  level: CultivationLevel;
}

/** 管理员表 admin */
export interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

/** 个人信息表 profile（固定 id = 1） */
export interface ProfileRow {
  id: number;
  /** 道号 */
  dao_name: string;
  /** 骨龄 */
  bone_age: number;
  /** 修行地界 */
  location: string;
  /** 修为境界 */
  realm: string;
  /** 道心所向 */
  motto: string;
  /** 主修功法 */
  tech_stack: TechItem[];
  /** 虚拟形象立绘 */
  avatar_url: string;
  /** 粒子强度 0-100 */
  particle_strength: number;
  /** 问候语池（点击虚拟形象时随机抽取） */
  greetings: string[];
  updated_at: string;
}

/** 工作经历表 experience */
export interface ExperienceRow {
  id: number;
  /** 宗门名称 */
  sect_name: string;
  /** 司职 */
  position: string;
  /** 修行开始时间 YYYY-MM-DD */
  start_date: string;
  /** 修行结束时间，空字符串 = 至今 */
  end_date: string;
  /** 执掌事务（Markdown） */
  duties: string;
  /** 修为精进（Markdown） */
  achievements: string;
  sort: number;
  /** 0 下架 1 上架 */
  status: number;
  created_at: string;
  updated_at: string;
}

/** 项目表 project */
export interface ProjectRow {
  id: number;
  /** 法宝名 */
  name: string;
  /** 品阶：入门 / 进阶 / 高阶 */
  level: string;
  /** 分类 */
  category: string;
  /** 炼制材料（技术栈标签） */
  tech_stack: string[];
  /** 法宝功用（Markdown） */
  description: string;
  /** 祭炼之地（GitHub 链接） */
  github_url: string;
  /** 法宝虚影（封面图） */
  cover_url: string;
  sort: number;
  status: number;
  /** 品鉴数（浏览量） */
  views: number;
  created_at: string;
  updated_at: string;
}

/** 联系方式表 contact */
export interface ContactRow {
  id: number;
  /** 玉符类型 */
  type: string;
  /** 显示名称 */
  label: string;
  /** 账号 / 链接 */
  value: string;
  /** 图标名 */
  icon: string;
  sort: number;
  /** 0 隐藏 1 显示 */
  status: number;
  /** 传讯次数（点击量） */
  clicks: number;
  created_at: string;
  updated_at: string;
}

/** 登录日志 */
export interface LoginLogRow {
  id: number;
  username: string;
  ip: string;
  user_agent: string;
  success: boolean;
  created_at: string;
}

/** 操作记录 */
export interface OperationRow {
  id: number;
  action: string;
  target: string;
  operator: string;
  created_at: string;
}

/** 站点设置 */
export interface SettingsRow {
  basic: {
    siteName: string;
    siteSubtitle: string;
    /** 三段加载文案，对应 0-30% / 30-70% / 70-100% */
    loadingTexts: string[];
    welcome: string;
    easterEgg: {
      /** 修为值 */
      cultivation: boolean;
      /** 灵签 */
      fortune: boolean;
      /** 昼夜变化 */
      dayNight: boolean;
    };
  };
  appearance: {
    primaryColor: string;
    /** 水墨浓度 0-100 */
    inkDensity: number;
    /** 粒子强度 0-100 */
    particleStrength: number;
    dayNightMode: 'auto' | 'day' | 'night';
    /** 精简模式默认开启 */
    liteModeDefault: boolean;
    /** 3D 虚影人物模型（GLB URL）；为空表示用主页内置模型 */
    avatarModel: string;
    /** 人物朝向微调（度，绕 Y 轴，叠加在自动定向之上） */
    avatarYaw: number;
    /** 手臂姿势：auto 收臂 / raw 保持上传原样 */
    avatarPose: 'auto' | 'raw';
  };
  security: {
    jwtExpiresIn: string;
  };
}

/** 访问统计 */
export interface StatsRow {
  /** 总访问量 */
  total: number;
  /** 今日访问量 */
  today: number;
  /** 今日日期 YYYY-MM-DD */
  todayDate: string;
  /** 近 30 日逐日访问量 */
  daily: { date: string; count: number }[];
  /** 丹器品鉴总数 */
  projectViews: number;
  /** 传讯次数总数 */
  contactClicks: number;
}

/** 整库结构 */
export interface DatabaseShape {
  _seq: Record<string, number>;
  admin: AdminRow[];
  profile: ProfileRow;
  experiences: ExperienceRow[];
  projects: ProjectRow[];
  contacts: ContactRow[];
  settings: SettingsRow;
  stats: StatsRow;
  loginLogs: LoginLogRow[];
  operations: OperationRow[];
}
