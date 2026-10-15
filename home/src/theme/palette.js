/**
 * 国风青绿水彩配色。
 *
 * 色值不是凭感觉定的，是从参考图（home/public/textures/landscape.jpg）上按位置采样平均得来：
 *   天头   #8ECBCC / #9BD3D1      云     #E6F6E9 / #DCF2E5 / #F7F9E5
 *   中景山 #80B2AB / #657975      近山   #50B29B / #ACDDCB / #CCEBE2
 *   底边   #E8F3DE / #97D9CD / #FDFDED
 *
 * 3D 侧所有颜色都从这里取，改色只改这一处；2D 覆盖层走 tailwind.config.js 的同名 token。
 */
export const PALETTE = {
  // ---------- 天与雾（整体提亮：不再是墨玄夜色） ----------
  sky: '#8ECBCC',
  skyWarm: '#9BD3D1',
  /** 清空色：比天空深半档，让远景有空气感 */
  clear: '#93D2D2',
  /** 雾色：天与云的过渡，远处的山与地面化进雾里 */
  fog: '#C4E7DF',
  fogNear: 14,
  fogFar: 58,

  // ---------- 山（由远及近） ----------
  mountainFar: '#9FDDCE',
  mountainMid: '#6CB7AB',
  mountainNear: '#3E9E8A',
  mountainDeep: '#1E7A69',

  // ---------- 云与光 ----------
  cloud: '#E6F6E9',
  cloudWarm: '#F7F9E5',
  sun: '#FFF8E0',

  // ---------- 金（暖金点缀，与青碧对比） ----------
  gold: '#C9A961',
  goldLight: '#E4CB8B',
  goldDeep: '#9A7A32',

  // ---------- 墨（描边用深青，不用纯黑，避免"脏"） ----------
  ink: '#16504A',
  inkSoft: '#2E6E64',

  // ---------- 地面 / 石 / 纸 / 玉 ----------
  stone: '#E8F3DE',
  stoneDeep: '#C4E0D2',
  paper: '#FBFDF6',
  jade: '#F2F7F0',
};

export default PALETTE;
