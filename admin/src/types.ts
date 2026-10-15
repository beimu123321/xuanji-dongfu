/** 与服务端一一对应的实体类型（文档第五章） */

export type CultivationLevel = '炼气' | '筑基' | '金丹';

export interface TechItem {
  name: string;
  level: CultivationLevel;
}

export interface Profile {
  id: number;
  dao_name: string;
  bone_age: number;
  location: string;
  realm: string;
  motto: string;
  tech_stack: TechItem[];
  avatar_url: string;
  particle_strength: number;
  greetings: string[];
  updated_at: string;
}

export interface Experience {
  id: number;
  sect_name: string;
  position: string;
  start_date: string;
  end_date: string;
  duties: string;
  achievements: string;
  sort: number;
  status: number;
  created_at: string;
  updated_at: string;
}

export type ProjectLevel = '入门' | '进阶' | '高阶';

export interface Project {
  id: number;
  name: string;
  level: ProjectLevel | string;
  category: string;
  tech_stack: string[];
  description: string;
  github_url: string;
  cover_url: string;
  sort: number;
  status: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  type: string;
  label: string;
  value: string;
  icon: string;
  sort: number;
  status: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  basic: {
    siteName: string;
    siteSubtitle: string;
    loadingTexts: string[];
    welcome: string;
    easterEgg: { cultivation: boolean; fortune: boolean; dayNight: boolean };
  };
  appearance: {
    primaryColor: string;
    inkDensity: number;
    particleStrength: number;
    dayNightMode: 'auto' | 'day' | 'night';
    liteModeDefault: boolean;
    avatarModel: string;
    avatarYaw: number;
    avatarPose: 'auto' | 'raw';
  };
  security: {
    jwtExpiresIn: string;
  };
}

export interface LoginLog {
  id: number;
  username: string;
  ip: string;
  user_agent: string;
  success: boolean;
  created_at: string;
}

export interface Operation {
  id: number;
  action: string;
  target: string;
  operator: string;
  created_at: string;
}

export interface DashboardOverview {
  cards: {
    visits: { total: number; today: number };
    projectViews: number;
    contactClicks: number;
    collections: number;
    onlineProjects: number;
    experiences: number;
    contacts: number;
  };
  trend7: { date: string; count: number }[];
  trend30: { date: string; count: number }[];
  techDistribution: { name: string; value: number }[];
  levelDistribution: { name: string; value: number }[];
  recentOperations: Operation[];
  topProjects: { id: number; name: string; views: number; category: string }[];
}

export interface ListResult<T> {
  list: T[];
  total: number;
}

export interface AdminInfo {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
}
