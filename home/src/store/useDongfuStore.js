/**
 * 全局状态（Zustand）
 * 承载：场景路由、镜头转场锁、加载进度、精简模式、昼夜、业务数据、彩蛋
 */
import { create } from 'zustand';
import api from '../api/client';

/** 场景枚举 */
export const SCENES = {
  GATE: 'gate',
  HALL: 'hall',
  PROFILE: 'profile',
  EXPERIENCE: 'experience',
  PROJECT: 'project',
  CONTACT: 'contact',
};

/** 导航玉简配置（文档 3.3.3） */
export const NAV_ITEMS = [
  { key: SCENES.PROFILE, label: '筑基概况', short: '筑基', index: 1 },
  { key: SCENES.EXPERIENCE, label: '修行履历', short: '履历', index: 2 },
  { key: SCENES.PROJECT, label: '丹器馆藏', short: '丹器', index: 3 },
  { key: SCENES.CONTACT, label: '传讯玉符', short: '传讯', index: 4 },
  { key: 'journal', label: '修行手札', short: '手札', index: 5, comingSoon: true },
];

/** 修为境界阈值（彩蛋：浏览场景累积修为） */
const REALMS = [
  { min: 0, name: '炼气一层' },
  { min: 12, name: '炼气圆满' },
  { min: 28, name: '筑基初期' },
  { min: 48, name: '筑基大成' },
  { min: 72, name: '金丹初结' },
  { min: 100, name: '金丹圆满' },
];

export function realmOf(value) {
  let name = REALMS[0].name;
  for (const r of REALMS) if (value >= r.min) name = r.name;
  return name;
}

const FORTUNES = [
  { level: '上上签', text: '云开月明，诸事可期。宜破旧立新。' },
  { level: '上签', text: '灵脉畅通，水到渠成。宜精进不休。' },
  { level: '中签', text: '风平浪静，守正待时。宜静心养气。' },
  { level: '中签', text: '他山之石，可以攻玉。宜虚心问道。' },
  { level: '下签', text: '浮云蔽日，暂且蛰伏。宜温故知新。' },
];

function readLiteDefault() {
  try {
    return window.localStorage.getItem('xuanji:lite') === '1';
  } catch {
    return false;
  }
}

export const useDongfuStore = create((set, get) => ({
  /* ---------------- 场景与转场 ---------------- */
  scene: SCENES.GATE,
  transitioning: false,

  goTo: (scene) => {
    const { scene: current, transitioning } = get();
    if (transitioning || current === scene) return;
    set({ transitioning: true, scene });
    // 与镜头动画时长（1.2s）对齐，转场期间禁用交互（文档 3.8.1）
    window.setTimeout(() => set({ transitioning: false }), 1250);
    get().addCultivation(2);
  },

  goHome: () => get().goTo(SCENES.HALL),

  /* ---------------- 加载进度 ----------------
   * 仅记录「已解锁到哪一档」，具体进度条的逐帧插值由山门覆盖层自行计算，
   * 避免每帧写入全局状态导致整棵 3D 场景树重渲染。
   * level: 1 = 基础 UI / 字体；2 = 3D 场景与核心材质；3 = 粒子与特效
   */
  unlockedLevel: 0,
  unlock: (level) => {
    if (level > get().unlockedLevel) set({ unlockedLevel: level });
  },

  /* ---------------- 精简模式 / 昼夜 ---------------- */
  liteMode: readLiteDefault(),
  toggleLite: () => {
    const next = !get().liteMode;
    try {
      window.localStorage.setItem('xuanji:lite', next ? '1' : '0');
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
    set({ liteMode: next });
    get().showToast(next ? '已入精简模式' : '已复全境');
  },

  // 默认昼。青绿水彩为白昼基调（见 README「青绿水彩改造」），夜间模式仅在用户显式切换时生效
  dayNight: 'day',
  setDayNight: (mode) => set({ dayNight: mode }),
  toggleDayNight: () => {
    const next = get().dayNight === 'night' ? 'day' : 'night';
    set({ dayNight: next });
    get().showToast(next === 'night' ? '夜色已临' : '天光初开');
  },

  /* ---------------- 业务数据 ---------------- */
  data: { settings: null, profile: null, experiences: [], projects: [], contacts: [] },
  dataError: null,
  loading: true,

  loadAll: async () => {
    try {
      const [settings, profile, experiences, projects, contacts] = await Promise.all([
        api.getSettings(),
        api.getProfile(),
        api.getExperiences(),
        api.getProjects(),
        api.getContacts(),
      ]);
      set({
        data: {
          settings,
          profile,
          experiences: experiences?.list || [],
          projects: projects?.list || [],
          contacts: contacts?.list || [],
        },
        loading: false,
        dataError: null,
      });

      // 应用后台配置的外观与昼夜模式
      const appearance = settings?.appearance;
      if (appearance) {
        if (appearance.liteModeDefault) set({ liteMode: true });
        const mode = appearance.dayNightMode;
        if (mode === 'day' || mode === 'night') set({ dayNight: mode });
        // auto 一律按昼解析：青绿水彩为白昼基调（README「青绿水彩改造」），
        // 不再随时间切到会发暗的夜景；用户仍可在右上角手动切换昼夜。
        else set({ dayNight: 'day' });
      }
      get().unlock(1);
    } catch (err) {
      // 服务端不可达时仍可进入洞府，展示内置兜底内容
      set({ loading: false, dataError: err.message || '洞府数据未能取回' });
      get().unlock(1);
    }
  },

  /** 访问埋点：同一会话只记一次，失败静默（不打扰访客） */
  markVisit: () => {
    try {
      if (window.sessionStorage.getItem('xuanji:visited') === '1') return;
      window.sessionStorage.setItem('xuanji:visited', '1');
    } catch {
      /* 隐私模式下 sessionStorage 不可用时仍记一次 */
    }
    api.visit().catch(() => {});
  },

  /* ---------------- 彩蛋：修为值 ---------------- */
  cultivation: 0,
  addCultivation: (n) => {
    const settings = get().data.settings;
    if (settings && settings.basic && settings.basic.easterEgg && !settings.basic.easterEgg.cultivation) return;
    set({ cultivation: Math.min(100, get().cultivation + n) });
  },

  /* ---------------- 彩蛋：灵签 ---------------- */
  fortune: null,
  drawFortune: () => {
    const settings = get().data.settings;
    if (settings && settings.basic && settings.basic.easterEgg && !settings.basic.easterEgg.fortune) {
      get().showToast('灵签已封存');
      return;
    }
    const pick = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    set({ fortune: { ...pick, at: Date.now() } });
  },
  closeFortune: () => set({ fortune: null }),

  /* ---------------- 详情选中态（3D 节点 ↔ 2D 面板联动） ---------------- */
  selectedExperienceId: null,
  selectedProjectId: null,
  activeCategory: '全部',
  setSelectedExperience: (id) => set({ selectedExperienceId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  clearSelection: () => set({ selectedExperienceId: null, selectedProjectId: null }),

  /* ---------------- 玉简悬停提示 ---------------- */
  hoverNav: null,
  setHoverNav: (label) => {
    if (get().hoverNav !== label) set({ hoverNav: label });
  },
  /** 传讯玉符悬停时浮现的账号（文档 3.7.3：悬停小玉符浮现对应账号） */
  hoverContact: null,
  setHoverContact: (contact) => {
    if (get().hoverContact !== contact) set({ hoverContact: contact });
  },

  /* ---------------- 轻提示 ---------------- */
  toast: null,
  showToast: (message) => {
    set({ toast: { message, id: Date.now() } });
    window.setTimeout(() => {
      if (get().toast && get().toast.message === message) set({ toast: null });
    }, 2200);
  },
  clearToast: () => set({ toast: null }),
}));
