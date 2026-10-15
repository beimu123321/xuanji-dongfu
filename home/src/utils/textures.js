/**
 * 程序化贴图工具：全部由 Canvas 实时绘制，避免额外静态资源请求。
 * 生成结果统一带缓存，避免重复绘制。
 */
import * as THREE from 'three';
import { numberToChinese } from './chinese';

const cache = new Map();
/** 最近一卷卷轴贴图的缓存键，用于替换时释放旧纹理 */
let lastScrollKey = null;

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toTexture(canvas, { repeat = 1, anisotropy = 4 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** 八卦地面纹路：同心圆 + 八卦方位 + 卦爻 */
export function getBaguaTexture() {
  if (cache.has('bagua')) return cache.get('bagua');
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.translate(c, c);

  // 外圈双环
  ctx.strokeStyle = 'rgba(201,169,97,0.55)';
  ctx.lineWidth = 3;
  [470, 440, 300, 286, 120, 108].forEach((r) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 八卦：八个方位，各三爻
  const trigrams = [
    [1, 1, 1],
    [1, 1, 0],
    [1, 0, 1],
    [1, 0, 0],
    [0, 1, 1],
    [0, 1, 0],
    [0, 0, 1],
    [0, 0, 0],
  ];

  trigrams.forEach((tri, i) => {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, -372);
    ctx.fillStyle = 'rgba(201,169,97,0.62)';
    tri.forEach((solid, row) => {
      const y = (row - 1) * 22;
      if (solid) {
        ctx.fillRect(-46, y - 5, 92, 10);
      } else {
        ctx.fillRect(-46, y - 5, 38, 10);
        ctx.fillRect(8, y - 5, 38, 10);
      }
    });
    ctx.restore();
  });

  // 内圈：太极意象（以墨色与玉白双弧构成）
  ctx.beginPath();
  ctx.arc(0, 0, 120, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.fillStyle = 'rgba(232,230,225,0.10)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 60, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.arc(0, -60, 60, (Math.PI * 3) / 2, Math.PI / 2, true);
  ctx.arc(0, 60, 60, (Math.PI * 3) / 2, Math.PI / 2);
  ctx.fillStyle = 'rgba(201,169,97,0.20)';
  ctx.fill();

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set('bagua', texture);
  return texture;
}

/** 玉简表面：竖排文字 + 暗金纹样 */
export function getRuneTexture(text = '玉简', highlight = false) {
  const key = `rune:${text}:${highlight ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);

  const w = 256;
  const h = 512;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, highlight ? 'rgba(242,250,242,0.98)' : 'rgba(240,246,238,0.98)');
  grad.addColorStop(1, highlight ? 'rgba(214,236,226,0.98)' : 'rgba(222,238,230,0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 边框
  ctx.strokeStyle = highlight ? 'rgba(22,80,74,0.95)' : 'rgba(22,80,74,0.62)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.lineWidth = 2;
  ctx.strokeStyle = highlight ? 'rgba(22,80,74,0.55)' : 'rgba(22,80,74,0.30)';
  ctx.strokeRect(30, 30, w - 60, h - 60);

  // 上下云纹
  ctx.fillStyle = highlight ? 'rgba(154,122,50,0.5)' : 'rgba(154,122,50,0.28)';
  ctx.fillRect(60, 48, w - 120, 3);
  ctx.fillRect(60, h - 51, w - 120, 3);

  // 竖排文字（青玉底上换深青，原先的暗金在浅底上对比不足）
  const chars = String(text).split('');
  const fontSize = Math.min(64, Math.floor((h - 180) / Math.max(chars.length, 1)));
  ctx.font = `${fontSize}px "霞鹜文楷", "LXGW WenKai", "思源宋体", "Noto Serif SC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = highlight ? '#0F3F39' : '#1A5A52';
  ctx.shadowColor = 'rgba(22,80,74,0.35)';
  ctx.shadowBlur = highlight ? 14 : 8;

  const total = chars.length * fontSize * 1.12;
  const startY = h / 2 - total / 2 + fontSize * 0.6;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, w / 2, startY + i * fontSize * 1.12);
  });
  ctx.shadowBlur = 0;

  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, texture);
  return texture;
}

/** 匾额：横排暗金题字 */
/**
 * 洞府门牌（匾额）。
 *
 * 旧版是一块深青素板加一圈金线，太单薄。现在按真匾额的做法分三层：
 *   外圈木框（带木纹与内倒角）→ 中圈回纹带 → 内芯深青漆面，
 * 四角压如意云头，中央题字用金色渐变并带一道暗描边做出「刻」的立体感，
 * 右侧落一枚朱印。整幅仍是青绿主调，只在门牌上压一块浓色镇场。
 */
export function getPlaqueTexture(text = '玄玑洞府') {
  const key = `plaque:${text}`;
  if (cache.has(key)) return cache.get(key);

  const w = 1024;
  const h = 256;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  /* ---- 外圈木框 ---- */
  const wood = ctx.createLinearGradient(0, 0, 0, h);
  wood.addColorStop(0, '#966E38');
  wood.addColorStop(0.45, '#6E4E27');
  wood.addColorStop(1, '#4C3318');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, w, h);

  // 木纹：横向的深浅细线，比底色亮一档才看得出来
  for (let i = 0; i < 18; i += 1) {
    const y = (i / 18) * h + (i % 3) * 2.1;
    ctx.strokeStyle = `rgba(${i % 2 ? '32,21,9' : '206,168,106'},${0.09 + (i % 4) * 0.02})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 4, w, y + 1);
    ctx.stroke();
  }

  /* ---- 内芯深青漆面 ---- */
  const lacquer = ctx.createLinearGradient(0, 22, 0, h - 22);
  lacquer.addColorStop(0, '#2F665B');
  lacquer.addColorStop(0.5, '#1C5148');
  lacquer.addColorStop(1, '#0E3830');
  ctx.fillStyle = lacquer;
  ctx.fillRect(22, 22, w - 44, h - 44);

  // 漆面顶部的柔光，避免整块死平
  const sheen = ctx.createLinearGradient(0, 22, 0, h * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.13)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(22, 22, w - 44, h * 0.38);

  /* ---- 金色双线框 ---- */
  ctx.strokeStyle = 'rgba(201,169,97,0.92)';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.strokeStyle = 'rgba(201,169,97,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, w - 124, h - 124);

  /* ---- 回纹带：只压在外线与内线之间的一条窄带里 ----
     单位放大到 44、笔画压细，远看是一道规整的边饰而不是一排锯齿。
     旧版把回纹画在 44/180 处、题字又是 132px，两者叠在一起，整块牌子发碎。 */
  const meander = (yCenter) => {
    const unit = 44;
    const s = 11;
    ctx.strokeStyle = 'rgba(201,169,97,0.55)';
    ctx.lineWidth = 2.5;
    for (let x = 78; x + unit < w - 74; x += unit) {
      ctx.beginPath();
      ctx.moveTo(x + 2, yCenter - s);
      ctx.lineTo(x + s * 1.4, yCenter - s);
      ctx.lineTo(x + s * 1.4, yCenter + s);
      ctx.lineTo(x + 2, yCenter + s);
      ctx.lineTo(x + 2, yCenter);
      ctx.lineTo(x + s * 0.75, yCenter);
      ctx.stroke();
    }
  };
  meander(42);
  meander(h - 42);

  /* ---- 四角如意云头 ---- */
  const cloudCorner = (cx, cy, r0, dirX, dirY) => {
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.03) {
      const ang = t * Math.PI * 1.7;
      const r = r0 * (1 - t * 0.6);
      const x = cx + dirX * Math.cos(ang) * r;
      const y = cy + dirY * Math.sin(ang) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(228,203,139,0.7)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  const m = 48;
  cloudCorner(m, m, 22, 1, 1);
  cloudCorner(w - m, m, 22, -1, 1);
  cloudCorner(m, h - m, 22, 1, -1);
  cloudCorner(w - m, h - m, 22, -1, -1);

  /* ---- 题字：金色渐变 + 暗描边，做出刻进去的立体感 ----
     字号上限收到 124，让字与内线框之间留出余量 */
  const label = String(text);
  const size = Math.max(74, Math.min(124, Math.round(620 / Math.max(1, label.length))));
  ctx.font = `${size}px "霞鹜文楷", "LXGW WenKai", "思源宋体", "Noto Serif SC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 字下的暗影（刻痕）
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillText(label, w / 2 + 2, h / 2 + 4);

  const gold = ctx.createLinearGradient(0, h / 2 - size * 0.55, 0, h / 2 + size * 0.55);
  gold.addColorStop(0, '#F8E8B8');
  gold.addColorStop(0.45, '#E8C883');
  gold.addColorStop(1, '#B8933F');
  ctx.fillStyle = gold;
  ctx.shadowColor = 'rgba(232,200,131,0.5)';
  ctx.shadowBlur = 14;
  ctx.fillText(label, w / 2, h / 2 + 2);
  ctx.shadowBlur = 0;

  /* ---- 右侧朱印 ---- */
  const sealY = h - 92;
  ctx.fillStyle = 'rgba(158,52,40,0.88)';
  ctx.fillRect(w - 88, sealY, 38, 38);
  ctx.strokeStyle = 'rgba(232,200,131,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w - 88, sealY, 38, 38);
  ctx.fillStyle = 'rgba(255,240,225,0.94)';
  ctx.font = '21px "霞鹜文楷", "LXGW WenKai", serif';
  ctx.fillText('印', w - 69, sealY + 20);

  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, texture);
  return texture;
}

/** 卷轴竖排内容：把档案字段整理成「标签 + 正文」条目（右起） */
function buildScrollFields(profile) {
  const p = profile || {};
  const tech = Array.isArray(p.tech_stack) ? p.tech_stack : [];
  const techNames = tech
    .map((t) => (typeof t === 'string' ? t : t && t.name))
    .filter(Boolean)
    .slice(0, 3)
    .join('·');

  // 竖排不排空格：空格会变成一格的空位，把栏内文字拉散
  const compact = (v) => String(v == null || v === '' ? '——' : v).replace(/\s+/g, '');

  return [
    { label: '道号', value: compact(p.dao_name) },
    { label: '骨龄', value: compact(`虚度${numberToChinese(p.bone_age)}春秋`) },
    { label: '修行地界', value: compact(p.location) },
    { label: '修为境界', value: compact(p.realm) },
    { label: '主修功法', value: compact(techNames) },
    { label: '道心所向', value: compact(p.motto) },
  ];
}

/**
 * 竖排分列：按 maxChars 把文本切成若干列。
 * 连续的拉丁字母/数字视为整词，尽量不跨列拆开（单个词过长时才硬拆）。
 */
function packColumns(text, maxChars) {
  const tokens = [];
  let buf = '';
  for (const ch of Array.from(text)) {
    if (/[A-Za-z0-9.+#_\-]/.test(ch)) {
      buf += ch;
    } else {
      if (buf) {
        tokens.push(buf);
        buf = '';
      }
      tokens.push(ch);
    }
  }
  if (buf) tokens.push(buf);

  const cols = [];
  let cur = '';
  let curLen = 0;
  for (const token of tokens) {
    const tkLen = Array.from(token).length;
    if (tkLen > maxChars) {
      if (cur) {
        cols.push(cur);
        cur = '';
        curLen = 0;
      }
      const chars = Array.from(token);
      for (let i = 0; i < chars.length; i += maxChars) {
        cols.push(chars.slice(i, i + maxChars).join(''));
      }
      continue;
    }
    if (curLen + tkLen > maxChars) {
      cols.push(cur);
      cur = '';
      curLen = 0;
    }
    cur += token;
    curLen += tkLen;
  }
  if (cur) cols.push(cur);
  return cols;
}

const SCROLL_FONT = '"LXGW WenKai","KaiTi","STKaiti","Noto Serif SC","SimSun",serif';

/** 卷轴贴图：玄青纸面 + 暗金边框 + 竖排修仙档案（右起） */
export function getScrollTexture(profile) {
  const fields = buildScrollFields(profile);
  const signature = fields.map((f) => `${f.label}=${f.value}`).join('|');
  const key = `scroll:${signature}`;
  if (cache.has(key)) return cache.get(key);

  // 3:4 竖幅，与场景中 2.7 x 3.6 的卷轴平面等比，避免拉伸
  const w = 768;
  const h = 1024;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // 纸面：提亮为生宣色，四角以青墨晕染（原先是玄青近黑底，与青绿水彩的整体明度冲突）
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#FBFDF6');
  base.addColorStop(0.5, '#F3F8F1');
  base.addColorStop(1, '#EAF3EA');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // 纸纹噪声
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // 四角水墨晕染（改为青墨，浓度也压下来，别把纸面压回深色）
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  corners.forEach(([cx, cy]) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 420);
    g.addColorStop(0, 'rgba(22,80,74,0.30)');
    g.addColorStop(1, 'rgba(22,80,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // 双线暗金内框
  ctx.strokeStyle = 'rgba(201,169,97,0.40)';
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, w - 92, h - 92);
  ctx.strokeStyle = 'rgba(201,169,97,0.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(62, 62, w - 124, h - 124);

  // 竖排文字（右起）
  //
  // 一条档案占一栏：栏首「标签」用暗金，其后「正文」用玉白，靠颜色分界而不是另起一栏。
  // 若标签、正文各占一栏，六条档案就是十二栏，栏距被压到 42px 而与字宽（34px）几乎相等，
  // 整卷会糊成一片；一栏一条只需八栏，栏距 48px、条间再加 32px 与一道细线，方能辨读。
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const top = 108;
  const lineHeight = 54;
  const maxChars = Math.floor((h - top - 108) / lineHeight); // 14
  const colGap = 48;
  const fieldGap = 32;
  const minX = 96;
  let x = w - 96; // 672

  for (const field of fields) {
    if (x < minX) break;
    const labelLen = Array.from(field.label).length;
    const cols = packColumns(`${field.label}${field.value}`, maxChars);
    let drawn = 0;
    for (const col of cols) {
      if (x < minX) break;
      Array.from(col).forEach((ch, i) => {
        const isLabel = drawn + i < labelLen;
        ctx.fillStyle = isLabel ? 'rgba(138,106,38,0.95)' : 'rgba(22,80,74,0.92)';
        ctx.font = `${isLabel ? 30 : 34}px ${SCROLL_FONT}`;
        ctx.fillText(ch, x, top + i * lineHeight);
      });
      drawn += Array.from(col).length;
      x -= colGap;
    }

    // 条与条之间留出更宽的间距，并以一道极淡的界线点明分组
    x -= fieldGap;
    if (x - colGap >= minX) {
      ctx.strokeStyle = 'rgba(22,80,74,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + (colGap + fieldGap) / 2, top - 34);
      ctx.lineTo(x + (colGap + fieldGap) / 2, top + (maxChars - 1) * lineHeight + 34);
      ctx.stroke();
    }
  }

  // 左下角落款印（改朱砂印：生宣上一枚暗金印几乎看不出来，朱砂才立得住）
  const seal = 92;
  const sx = 92;
  const sy = h - 92 - seal;
  ctx.strokeStyle = 'rgba(176,74,52,0.82)';
  ctx.lineWidth = 4;
  ctx.strokeRect(sx, sy, seal, seal);
  ctx.fillStyle = 'rgba(176,74,52,0.88)';
  ctx.font = `40px ${SCROLL_FONT}`;
  ctx.fillText('玄', sx + seal / 2, sy + seal * 0.29);
  ctx.fillText('璣', sx + seal / 2, sy + seal * 0.72);

  // 左右边缘晕染，与石壁自然衔接（生宣改深青墨，浓度减半，别把纸边啃黑）
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, 'rgba(22,80,74,0.55)');
  edge.addColorStop(0.1, 'rgba(22,80,74,0)');
  edge.addColorStop(0.9, 'rgba(22,80,74,0)');
  edge.addColorStop(1, 'rgba(22,80,74,0.55)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);

  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // 仅保留最新一卷，避免档案反复编辑时纹理堆积
  if (lastScrollKey && lastScrollKey !== key && cache.has(lastScrollKey)) {
    cache.get(lastScrollKey).dispose();
    cache.delete(lastScrollKey);
  }
  lastScrollKey = key;

  cache.set(key, texture);
  return texture;
}

/** 柔光圆点：用于粒子与光晕（径向渐变） */
export function getGlowTexture() {
  if (cache.has('glow')) return cache.get('glow');
  const size = 128;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set('glow', texture);
  return texture;
}

/**
 * 山石法线/水墨叠加用的低频噪声贴图。
 * 底子由中性灰改为青墨，深/浅两团随之调整——中性灰叠在浅石地面上会显脏发灰。
 */
export function getInkNoiseTexture() {
  if (cache.has('inknoise')) return cache.get('inknoise');
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E8F3DE';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i += 1) {
    const r = 6 + Math.random() * 26;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() > 0.5;
    g.addColorStop(0, dark ? 'rgba(22,80,74,0.30)' : 'rgba(255,253,244,0.55)');
    g.addColorStop(1, 'rgba(232,243,222,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = toTexture(canvas, { repeat: 2 });
  cache.set('inknoise', texture);
  return texture;
}

/**
 * 场景背景壁画：绢帛底 + 青绿远山 + 祥云纹。
 *
 * 用户反馈「丹器馆藏 / 修行履历的背景板没有颜色、太单调」，原先这两处
 * 都是一块纯色 box（#DCE9DF）当墙。这里按场景各出一档国风水彩壁面：
 *   - danqi：宝库深处，青墨重一些，让玉色法宝立得住；
 *   - exp：石壁远岫，云气压得更淡，配合时间轴的留白。
 *
 * 全部由 Canvas 绘制（同其他程序化贴图），不发额外请求；
 * 山形用「多个正弦叠加」生成，每次加载一致，不会闪跳。
 */
/**
 * 青绿山水壁面（丹器馆藏 / 修行履历的背景石壁）。
 *
 * `edgeFade` / `edgeFadeV` 把壁面的左右、上下两缘擦成透明。
 * 壁面是一块**有限大的平面**，硬边会在背景上割出一道生硬的直线——
 * 履历场景里那道竖直分界就是这么来的（壁面在画面左侧结束，
 * 后面直接露出远景天空，两种颜色一撞就是一条缝）。
 * 用 destination-out 把边缘渐隐掉，壁面就能融进远景里。
 *
 * `ridgeScale` 按倍数提高山脊频率。壁面离镜头越近、屏幕上的放大倍率越高，
 * 同一张贴图就会摊成几个大色块（传讯玉符、筑基档案就是这种情况：
 * 景深只有 9.6 / 6.9，而丹器馆藏是 13.3）。把山脊加密后，
 * 每道山占的像素变少，观感立刻细起来，也省掉了加分辨率的内存开销。
 *
 * @param {'danqi'|'exp'} variant
 * @param {{edgeFade?: number, edgeFadeV?: number, ridgeScale?: number}} [opts] 前两项 0~0.45，按比例计
 */
export function getWallTexture(variant = 'danqi', opts = {}) {
  const edgeFade = opts.edgeFade || 0;
  const edgeFadeV = opts.edgeFadeV || 0;
  const ridgeScale = opts.ridgeScale || 1;
  const key = `wall:${variant}:${edgeFade}:${edgeFadeV}:${ridgeScale}`;
  if (cache.has(key)) return cache.get(key);

  const w = 1024;
  const h = 1024;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const theme =
    variant === 'exp'
      ? {
          skyTop: '#F4F9F0',
          skyBottom: '#E2EEE8',
          ridges: [
            { y: 0.46, amp: 0.1, color: 'rgba(120,178,160,0.30)', freq: 2.4 },
            { y: 0.58, amp: 0.13, color: 'rgba(84,150,128,0.42)', freq: 1.7 },
            { y: 0.72, amp: 0.16, color: 'rgba(52,116,96,0.55)', freq: 1.1 },
          ],
          cloud: 'rgba(255,255,255,0.55)',
          mist: 'rgba(255,255,255,0.75)',
        }
      : {
          skyTop: '#DCEDE5',
          skyBottom: '#B9D6C9',
          ridges: [
            { y: 0.42, amp: 0.11, color: 'rgba(102,166,142,0.42)', freq: 2.6 },
            { y: 0.56, amp: 0.15, color: 'rgba(64,132,110,0.56)', freq: 1.9 },
            { y: 0.74, amp: 0.18, color: 'rgba(38,102,84,0.7)', freq: 1.2 },
          ],
          cloud: 'rgba(240,250,244,0.4)',
          mist: 'rgba(232,246,238,0.6)',
        };

  // 绢帛底：上浅下深的竖渐变
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, theme.skyTop);
  base.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // 山脊：三重正弦叠加，越靠前越浓。
  // ridgeScale 提高频率 → 山更密更小，供近景壁面用（见函数头注释）。
  const ridgeY = (ridge, idx, p) =>
    ridge.y * h -
    Math.sin(p * Math.PI * ridge.freq * ridgeScale) * ridge.amp * h -
    Math.sin(p * Math.PI * ridge.freq * 2.7 * ridgeScale + idx) * ridge.amp * h * 0.32;
  // 频率提高后采样步长要同步收紧，否则尖峰会变成折线
  const ridgeStep = Math.max(2, Math.round(8 / ridgeScale));

  theme.ridges.forEach((ridge, idx) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += ridgeStep) {
      ctx.lineTo(x, ridgeY(ridge, idx, x / w));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = ridge.color;
    ctx.fill();

    // 山脊勾一道金线（青绿山水里的描金）
    ctx.beginPath();
    for (let x = 0; x <= w; x += ridgeStep) {
      const y = ridgeY(ridge, idx, x / w);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(201,169,97,${0.16 - idx * 0.04})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 云气：几道横向拖尾的祥云
  for (let i = 0; i < 7; i += 1) {
    const cy = h * (0.2 + ((i * 0.11) % 0.62));
    const cx = (i * 211) % w;
    const rw = 150 + ((i * 67) % 190);
    const rh = 22 + ((i * 13) % 30);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw);
    g.addColorStop(0, theme.cloud);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, rh / rw);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rw, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 山脚雾带：把山与下方留白柔接
  const mist = ctx.createLinearGradient(0, h * 0.62, 0, h);
  mist.addColorStop(0, 'rgba(255,255,255,0)');
  mist.addColorStop(0.55, theme.mist);
  mist.addColorStop(1, theme.mist);
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  // 绢纹：细密低频噪点（比 scroll 的纸纹更弱，壁面不当主角）
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // 四缘渐隐。两遍 destination-out 等价于 alpha 相乘，
  // 于是四个角自然过渡，不会出现「先横后竖」的十字印子。
  const eraseEdge = (horizontal, amount) => {
    if (!(amount > 0)) return;
    const f = Math.min(0.45, Math.max(0.005, amount));
    const g = horizontal
      ? ctx.createLinearGradient(0, 0, w, 0)
      : ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(f, 'rgba(0,0,0,0)');
    g.addColorStop(1 - f, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
  eraseEdge(true, edgeFade);
  eraseEdge(false, edgeFadeV);

  const texture = toTexture(canvas, { repeat: 1, anisotropy: 8 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, texture);
  return texture;
}

/** 释放在卸载时清理的缓存贴图 */
/**
 * 祥云：前厅远景的云气。
 *
 * 由「几团重叠的柔光云身 + 两端如意云头卷曲」组成——只画柔和圆团会像棉花糖，
 * 少了那两道卷，就不是国风的云了。整体压成横向长条，便于在厅内横铺。
 */
export function getCloudTexture() {
  if (cache.has('cloud')) return cache.get('cloud');
  const w = 512;
  const h = 256;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  // 云身：几团重叠的径向渐变，中间厚两端薄
  [
    [150, 132, 78, 0.92],
    [232, 116, 96, 1],
    [318, 134, 82, 0.95],
    [258, 158, 66, 0.8],
    [196, 150, 72, 0.85],
  ].forEach(([cx, cy, r, a]) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.5, `rgba(250,253,246,${a * 0.72})`);
    g.addColorStop(1, 'rgba(250,253,246,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 如意云头：两端各一道向内收的卷曲
  const curl = (cx, cy, r0, dir) => {
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const ang = dir * t * Math.PI * 2.1;
      const r = r0 * (1 - t * 0.68);
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r * 0.86;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  curl(126, 126, 30, 1);
  curl(356, 128, 32, -1);

  // 云脚带一点暖金，压住纯白在青碧底上的飘
  const warm = ctx.createLinearGradient(0, h * 0.5, 0, h);
  warm.addColorStop(0, 'rgba(228,203,139,0)');
  warm.addColorStop(1, 'rgba(228,203,139,0.16)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set('cloud', texture);
  return texture;
}

/**
 * 飞鸟剪影：一群疏密不一的远山雀，用作厅内高处的点缀。
 * 每只由两条对称的翼弧拼成，翼尖细、翼根粗，远看就是一道「人」字。
 */
export function getBirdTexture() {
  if (cache.has('bird')) return cache.get('bird');
  const w = 512;
  const h = 256;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const bird = (cx, cy, s, ink) => {
    ctx.strokeStyle = `rgba(22,80,74,${ink})`;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.6, s * 0.13);
    // 左翼
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - s * 0.55, cy - s * 0.42, cx - s, cy - s * 0.1);
    ctx.stroke();
    // 右翼
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + s * 0.55, cy - s * 0.42, cx + s, cy - s * 0.1);
    ctx.stroke();
  };

  // 疏密不一的七只：远处小、近处大，位置刻意错开，避免像阵列
  [
    [92, 150, 26, 0.5],
    [168, 108, 20, 0.42],
    [246, 156, 32, 0.58],
    [330, 104, 22, 0.45],
    [402, 146, 28, 0.52],
    [206, 196, 18, 0.36],
    [352, 190, 16, 0.33],
  ].forEach(([cx, cy, s, a]) => bird(cx, cy, s, a));

  const texture = toTexture(canvas, { repeat: 1 });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cache.set('bird', texture);
  return texture;
}

export function disposeTextures() {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}

// 开发期调试钩子：便于在浏览器控制台直接检视程序化贴图（生产构建会被剔除）
if (import.meta.env.DEV) {
  window.__xuanjiTextures = {
    getBaguaTexture,
    getRuneTexture,
    getPlaqueTexture,
    getScrollTexture,
    getGlowTexture,
    getInkNoiseTexture,
    getWallTexture,
    getCloudTexture,
    getBirdTexture,
    disposeTextures,
  };
}
