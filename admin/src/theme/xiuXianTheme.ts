/**
 * 水墨修仙主题（文档 4.2）
 * 基于 Ant Design 5.x 暗色算法，全量替换默认蓝色体系为玄青暗金风格。
 */
import { theme, type ThemeConfig } from 'antd';

/** 色板（与前端 3.1.1 保持一致） */
export const PALETTE = {
  moxuan: '#0F1419', // 墨玄
  xuanqingDeep: '#171D24', // 玄青深
  xuanqingElevated: '#1C232B',
  xuanqingLayout: '#0B0F13',
  xuanqing: '#2A3B47', // 玄青
  gold: '#C9A961', // 暗金
  goldLight: '#D4B87A',
  jade: '#E8E6E1', // 玉白
  stone: '#8A94A0', // 石灰
  pine: '#5B8C5A', // 松石绿
  warning: '#B8860B',
  error: '#8B2323',
  info: '#4A6FA5',
} as const;

export const xiuXianTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 基础色板
    colorPrimary: PALETTE.gold,
    colorSuccess: PALETTE.pine,
    colorWarning: PALETTE.warning,
    colorError: PALETTE.error,
    colorInfo: PALETTE.info,
    // 背景体系
    colorBgBase: PALETTE.moxuan,
    colorBgContainer: PALETTE.xuanqingDeep,
    colorBgElevated: PALETTE.xuanqingElevated,
    colorBgLayout: PALETTE.xuanqingLayout,
    // 文字体系
    colorTextBase: PALETTE.jade,
    colorTextSecondary: PALETTE.stone,
    colorTextDisabled: '#5A616A',
    // 边框体系
    colorBorder: '#2A2F36',
    colorBorderSecondary: 'rgba(201,169,97,0.16)',
    // 圆角与尺寸
    borderRadius: 4,
    controlHeight: 36,
    // 字体
    fontFamily: '"霞鹜文楷", "LXGW WenKai", "思源宋体", "Noto Serif SC", serif',
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Button: {
      colorPrimary: PALETTE.gold,
      colorPrimaryHover: PALETTE.goldLight,
      borderRadius: 4,
      fontWeight: 500,
    },
    Card: {
      headerBg: PALETTE.xuanqingDeep,
      headerFontSize: 16,
      extraColor: PALETTE.gold,
    },
    Table: {
      headerBg: PALETTE.xuanqingElevated,
      rowHoverBg: '#1F2730',
      borderColor: '#2A2F36',
      headerSplitColor: 'transparent',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: PALETTE.xuanqingLayout,
      darkItemSelectedBg: 'rgba(201,169,97,0.10)',
      darkItemSelectedColor: PALETTE.gold,
      itemMarginInline: 8,
      itemHeight: 44,
    },
    Input: {
      colorBorder: '#2A2F36',
      colorBgContainer: PALETTE.moxuan,
      activeBorderColor: PALETTE.gold,
      hoverBorderColor: PALETTE.goldLight,
    },
    InputNumber: {
      colorBorder: '#2A2F36',
      colorBgContainer: PALETTE.moxuan,
    },
    Select: {
      colorBorder: '#2A2F36',
      colorBgContainer: PALETTE.moxuan,
      optionSelectedBg: 'rgba(201,169,97,0.14)',
    },
    DatePicker: {
      colorBorder: '#2A2F36',
      colorBgContainer: PALETTE.moxuan,
    },
    Modal: {
      contentBg: PALETTE.xuanqingDeep,
      headerBg: PALETTE.xuanqingDeep,
      titleColor: PALETTE.gold,
    },
    Tabs: {
      itemSelectedColor: PALETTE.gold,
      inkBarColor: PALETTE.gold,
      itemHoverColor: PALETTE.goldLight,
    },
    Switch: {
      colorPrimary: PALETTE.gold,
    },
    Slider: {
      trackBg: PALETTE.gold,
      trackHoverBg: PALETTE.goldLight,
      handleColor: PALETTE.gold,
    },
    Statistic: {
      contentFontSize: 26,
    },
    Pagination: {
      itemActiveBg: 'rgba(201,169,97,0.14)',
    },
    Layout: {
      bodyBg: PALETTE.xuanqingLayout,
      headerBg: PALETTE.xuanqingDeep,
      siderBg: '#12181F',
    },
  },
};

export default xiuXianTheme;
