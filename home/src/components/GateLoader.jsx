/**
 * 场景一 · 2D 覆盖层：山门候客（文档 3.2）
 *
 * 本轮重设计（第二版）：把机位从「看一个山门」改成「站在山门正前方」——
 *   门扇铺满整屏，飞檐压住上沿，门槛落底，两扇门随加载进度向两侧分开、中缝透光。
 *
 * 上一版是一个 470×490 的小山门挂在屏幕正中：竖长的窄矩形 + 顶上一块匾额，
 * 轮廓读起来像墓碑，也谈不上「大气」。改成全屏构图后：
 *   飞檐（全宽，两端起翘）→ 匾额（题站点名）→ 门楣（全宽横梁）
 *   → 左右门框（通高）→ 两扇门扇（铺满，含木纹 / 门钉阵列 / 铺首衔环）
 *   → 中缝灵光（随进度变亮）→ 门槛 → 地面（承载底部文字）。
 *
 * 门扇「分开」用 translateX 而不是 scaleX：缩放会把门钉压扁，
 * 平移则门扇滑到门框后面去，缝隙自然张开，没有任何形变。
 *
 * 静态背景与飞檐用 useMemo 固化元素引用，逐帧重渲染时 React 复用同一元素、
 * 不触碰 DOM，SVG 滤镜结果得以缓存，不会因 60fps 刷新掉帧。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDongfuStore } from '../store/useDongfuStore';

const SEAL_CHARS = '玄璣洞府禁制開啟';

/** 各解锁档位对应的进度目标（文档 3.2.2） */
const STAGE_TARGETS = [0, 0.3, 0.7, 1];

/* ---------------- 全屏山门的竖向分区（单位：视口百分比） ---------------- */
const FRAME_W = 3.6; // 左右门框宽度
const ROOF_H = 15; // 飞檐band高
const LINTEL_H = 4.6; // 门楣高
const DOOR_TOP = 19.6; // 门扇上沿
const THRESH_H = 4; // 门槛高
const GROUND_H = 21; // 地面（底部文字区）高
const DOOR_BOTTOM = GROUND_H + THRESH_H; // 门扇下沿 = 25

/** 门扇分开的最大位移（占门扇自身宽度的百分比） */
const DOOR_OPEN = 7;

/** 门钉阵列：每扇 4 列 × 6 行 */
const STUD_COUNT = 24;

const STUD_STYLE = {
  background:
    'radial-gradient(circle at 34% 30%, #FBEFC6 0%, #E3C173 38%, #B08A38 72%, #6F5219 100%)',
  boxShadow:
    '0 2px 4px rgba(12,38,32,0.45), inset 0 -1px 1px rgba(255,255,255,0.28), inset 0 1px 1px rgba(255,255,255,0.55)',
};

/** 浮尘 */
const MOTES = [
  { l: 7, t: 30, s: 3, dur: 6.2, delay: 0 },
  { l: 15, t: 52, s: 2, dur: 7.4, delay: 0.8 },
  { l: 23, t: 74, s: 2.5, dur: 5.8, delay: 1.6 },
  { l: 33, t: 86, s: 2, dur: 8.1, delay: 0.4 },
  { l: 45, t: 90, s: 3.5, dur: 6.8, delay: 2.1 },
  { l: 56, t: 84, s: 2, dur: 7.1, delay: 1.1 },
  { l: 67, t: 88, s: 2.5, dur: 6.4, delay: 2.6 },
  { l: 77, t: 72, s: 3, dur: 7.8, delay: 0.6 },
  { l: 86, t: 50, s: 2, dur: 5.9, delay: 1.9 },
  { l: 93, t: 28, s: 2.5, dur: 8.4, delay: 1.3 },
];

const KAI_FONT = "'LXGW WenKai', '霞鹜文楷', 'Noto Serif SC', serif";

/**
 * 山脊采样点 → 平滑贝塞尔路径（Catmull-Rom 转三次贝塞尔）。
 *
 * 折线直连会得到「硬边三角」；但标准 Catmull-Rom（张力 1/6）又会把折线抹成一条正弦，
 * 五层叠起来就成了一组重复的波浪。这里把张力收到 1/9：峰顶保留圆角、坡面基本保持直，
 * 才是山的轮廓。
 */
const RIDGE_TENSION = 1 / 9;

function ridgePath(pts, baseY = 900, close = true) {
  const p = [
    { x: -60, y: pts[0][1] },
    ...pts.map(([x, y]) => ({ x, y })),
    { x: 1500, y: pts[pts.length - 1][1] },
  ];
  let d = `M${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = (p1.x + (p2.x - p0.x) * RIDGE_TENSION).toFixed(1);
    const c1y = (p1.y + (p2.y - p0.y) * RIDGE_TENSION).toFixed(1);
    const c2x = (p2.x - (p3.x - p1.x) * RIDGE_TENSION).toFixed(1);
    const c2y = (p2.y - (p3.y - p1.y) * RIDGE_TENSION).toFixed(1);
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return close ? `${d} L1500 ${baseY} L-60 ${baseY} Z` : d;
}

/**
 * 五重山峦：远→近逐层加深、逐层收敛虚化，模拟水彩「远山如黛、近山含翠」。
 *
 * 三点关键：
 * ① 各层峰距必须拉开（远景三四座大峰、近景十余座小峰）——同峰距叠起来就是波浪；
 * ② 五层共用一条竖向明暗渐变（山顶受光、山脚积墨），纯色平涂无论轮廓多准都像剪纸；
 * ③ 山体统一收在上半部（base 646~734），下半部留给云海。
 */
const RIDGES = [
  { opacity: 0.46, std: 22, base: 646, pts: [[60, 470], [320, 268], [620, 462], [880, 244], [1180, 458], [1400, 300]] },
  { opacity: 0.53, std: 14, base: 668, pts: [[90, 516], [260, 330], [480, 510], [700, 352], [900, 506], [1080, 318], [1280, 502], [1420, 388]] },
  { opacity: 0.6, std: 9, base: 690, pts: [[70, 572], [180, 428], [380, 578], [560, 414], [760, 584], [940, 406], [1120, 580], [1290, 430], [1440, 566]] },
  { opacity: 0.68, std: 4, base: 712, pts: [[60, 640], [180, 572], [300, 646], [400, 564], [540, 648], [660, 570], [790, 644], [900, 558], [1030, 646], [1150, 576], [1290, 644], [1400, 584], [1460, 630]] },
  { opacity: 0.78, std: 1.4, base: 734, pts: [[40, 716], [190, 650], [330, 720], [470, 636], [600, 722], [740, 648], [880, 720], [1010, 638], [1150, 722], [1290, 652], [1420, 720], [1460, 684]] },
];

/** 一扇门：木纹 + 门钉阵列 + 铺首衔环 + 内缘/上缘阴影。side 决定渐变与镜像方向。 */
function DoorLeaf({ side, progress }) {
  const left = side === 'left';
  const dir = left ? 90 : 270;
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: left ? `${FRAME_W}%` : '50%',
        right: left ? '50%' : `${FRAME_W}%`,
        top: `${DOOR_TOP}%`,
        bottom: `${DOOR_BOTTOM}%`,
        // 门扇向两侧滑开。百分比位移相对门扇自身宽度，
        // 用 translateX 而非 scaleX：缩放会把门钉压扁，平移则门扇滑到门框后面去、无形变。
        transform: `translateX(${(left ? -progress : progress) * DOOR_OPEN}%)`,
        background: `linear-gradient(${dir}deg, #35695C 0%, #477F70 34%, #579082 68%, #68A192 100%)`,
        boxShadow: 'inset 0 0 60px rgba(14,42,36,0.3)',
      }}
    >
      {/* 木纹 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(20,54,46,0.11) 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 3px, transparent 3px 15px)',
        }}
      />

      {/* 门钉阵列 */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-6 place-items-center gap-[clamp(5px,0.9vw,16px)] px-[9%] py-[7%]">
        {Array.from({ length: STUD_COUNT }).map((_, i) => (
          <span
            key={i}
            className="aspect-square w-[clamp(11px,1.5vw,25px)] rounded-full"
            style={STUD_STYLE}
          />
        ))}
      </div>

      {/* 铺首衔环 */}
      <div
        className="absolute top-[52%] aspect-square w-[clamp(58px,6.4vw,112px)] -translate-y-1/2"
        style={left ? { left: '62%' } : { right: '62%' }}
      >
        {/* 铺首底盘 */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 36% 30%, #F7E7B8 0%, #D9B664 42%, #A9853A 76%, #6F5219 100%)',
            boxShadow: '0 3px 8px rgba(20,54,46,0.4), inset 0 1px 2px rgba(255,255,255,0.5)',
          }}
        />
        {/* 门环 */}
        <div
          className="absolute inset-[26%] rounded-full border-[clamp(5px,0.62vw,11px)] border-[#C9A961]"
          style={{ boxShadow: 'inset 0 0 0 2px rgba(90,66,20,0.45), 0 2px 5px rgba(20,54,46,0.35)' }}
        />
      </div>

      {/* 内缘（中缝侧）阴影 —— 门缝处的暗部，衬出灵光 */}
      <div
        className="absolute inset-y-0 w-[10%]"
        style={{
          [left ? 'right' : 'left']: 0,
          background: `linear-gradient(${left ? 90 : 270}deg, rgba(16,46,40,0.34), transparent)`,
        }}
      />
      {/* 上缘阴影（门楣投下） */}
      <div
        className="absolute inset-x-0 top-0 h-[7%]"
        style={{ background: 'linear-gradient(180deg, rgba(16,46,40,0.36), transparent)' }}
      />
      {/* 下缘阴影（门槛反光） */}
      <div
        className="absolute inset-x-0 bottom-0 h-[5%]"
        style={{ background: 'linear-gradient(0deg, rgba(16,46,40,0.24), transparent)' }}
      />
    </div>
  );
}

export default function GateLoader({ onEnter }) {
  const settings = useDongfuStore((s) => s.data.settings);
  const [progress, setProgress] = useState(0);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const progressRef = useRef(0);

  // 逐帧向目标档位插值（仅本组件重渲染，不影响 3D 场景树）
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const level = useDongfuStore.getState().unlockedLevel;
      const target = STAGE_TARGETS[Math.min(level, STAGE_TARGETS.length - 1)];
      const current = progressRef.current;
      const diff = target - current;
      const next =
        Math.abs(diff) < 0.0008 ? target : current + diff * 0.06 + Math.sign(diff) * 0.0006;
      progressRef.current = Math.max(0, Math.min(1, next));
      setProgress(progressRef.current);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const gateReady = progress >= 0.999;

  const siteName = settings?.basic?.siteName || '玄玑洞府';
  const subtitle = settings?.basic?.siteSubtitle || '以代码为器 · 以创意为丹';
  const texts = settings?.basic?.loadingTexts || ['道友请少待…', '洞府禁制正在开启…', '即将入府…'];

  const stageText = progress < 0.3 ? texts[0] : progress < 0.7 ? texts[1] : texts[2];
  const percent = Math.round(progress * 100);

  // 弱网提示（文档 8.4）
  useEffect(() => {
    if (gateReady) {
      setSlowNetwork(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSlowNetwork(true), 12000);
    return () => window.clearTimeout(timer);
  }, [gateReady]);

  const litCount = useMemo(() => Math.round(progress * SEAL_CHARS.length), [progress]);
  const rotate = useMemo(() => progress * 720, [progress]);

  /* ---------------- 静态层 1：山峦云海背景 ---------------- */
  const backdrop = useMemo(
    () => (
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="glSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7FCF3" />
            <stop offset="46%" stopColor="#E6F5EA" />
            <stop offset="100%" stopColor="#D2ECDF" />
          </linearGradient>
          <radialGradient id="glSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF8DE" stopOpacity="0.92" />
            <stop offset="46%" stopColor="#FFF3CF" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#FFF3CF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="glCloudBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="34%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          {/* 五重山峦共用：山顶受光、山腰转青、山脚积墨。
              顶端不能取近白——远山的可见部分只有山顶一带，取近白就会和天空糊成一片。 */}
          <linearGradient id="glRidge" x1="0" y1="230" x2="0" y2="720" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A8DCCE" />
            <stop offset="40%" stopColor="#74C0AE" />
            <stop offset="100%" stopColor="#2F8B78" />
          </linearGradient>
          {/* 云海：自山脚向下渐次没入留白 */}
          <linearGradient id="glSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBFDF6" stopOpacity="0" />
            <stop offset="18%" stopColor="#FBFDF6" stopOpacity="0.52" />
            <stop offset="46%" stopColor="#FBFDF6" stopOpacity="0.86" />
            <stop offset="100%" stopColor="#FBFDF6" stopOpacity="0.99" />
          </linearGradient>
          <filter id="glBlurSoft" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="glBlurWide" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          {RIDGES.map((r, i) => (
            <filter key={`f${i}`} id={`glR${i}`} x="-12%" y="-30%" width="124%" height="150%">
              <feGaussianBlur stdDeviation={r.std} />
            </filter>
          ))}
        </defs>

        <rect width="1440" height="900" fill="url(#glSky)" />
        <circle cx="1058" cy="198" r="252" fill="url(#glSun)" />

        {RIDGES.map((r, i) => (
          <path
            key={`ridge${i}`}
            d={ridgePath(r.pts, r.base)}
            fill="url(#glRidge)"
            opacity={r.opacity}
            filter={`url(#glR${i})`}
          />
        ))}

        {/* 两层流云（飘在山腰） */}
        <path
          d="M-40 352 C120 314 250 356 400 334 C560 310 660 352 820 330 C980 308 1090 350 1250 326 C1350 312 1420 330 1500 322 L1500 372 C1380 380 1300 362 1200 376 C1040 398 940 356 780 378 C620 400 520 358 360 380 C220 400 110 380 -40 400 Z"
          fill="url(#glCloudBar)"
          opacity="0.42"
          filter="url(#glBlurSoft)"
        />
        <path
          d="M-40 436 C110 404 240 440 396 420 C560 398 660 436 826 416 C990 396 1096 434 1256 412 C1360 398 1430 416 1500 408 L1500 450 C1370 458 1290 442 1190 454 C1030 474 930 436 770 456 C610 476 510 438 350 458 C210 476 100 458 -40 476 Z"
          fill="url(#glCloudBar)"
          opacity="0.32"
          filter="url(#glBlurSoft)"
        />

        {/* 云海：山脚下方翻滚的云团 + 向下的留白渐变 */}
        <g filter="url(#glBlurWide)" fill="#FFFFFF">
          <ellipse cx="160" cy="636" rx="250" ry="48" opacity="0.62" />
          <ellipse cx="470" cy="672" rx="290" ry="54" opacity="0.54" />
          <ellipse cx="770" cy="628" rx="255" ry="46" opacity="0.66" />
          <ellipse cx="1070" cy="676" rx="305" ry="56" opacity="0.52" />
          <ellipse cx="1370" cy="640" rx="235" ry="48" opacity="0.6" />
          <ellipse cx="700" cy="736" rx="640" ry="86" opacity="0.62" />
        </g>
        <rect y="560" width="1440" height="340" fill="url(#glSea)" />
      </svg>
    ),
    [],
  );

  /* ---------------- 静态层 2：飞檐（全宽，两端起翘） ----------------
     viewBox 1440×120 对应 100vw × 15vh：常见 16:9 视口下横竖缩放比接近 1，
     屋面不会被拉伸。檐口做成「中段近水平、只在两端勾起来」——
     整条檐线都做成大弧线的话，屋面会收成一个透镜形，读不出是屋顶。 */
  const roof = useMemo(
    () => (
      <svg
        className="absolute inset-x-0 top-0 w-full"
        style={{ height: `${ROOF_H}%` }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="glRoof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A6CBBE" />
            <stop offset="52%" stopColor="#6FA595" />
            <stop offset="100%" stopColor="#427F6F" />
          </linearGradient>
          <linearGradient id="glRoofRidge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E9787" />
            <stop offset="100%" stopColor="#24564B" />
          </linearGradient>
        </defs>

        {/* 屋面：正脊在 y24，檐口中段近水平在 y102，仅两端勾至 y72 */}
        <path
          d="M0 72 C24 92 72 100 160 102 L1280 102 C1368 100 1416 92 1440 72 L1260 24 L180 24 Z"
          fill="url(#glRoof)"
        />
        {/* 瓦垄 */}
        {Array.from({ length: 32 }).map((_, i) => (
          <line
            key={i}
            x1={30 + i * 45}
            y1="28"
            x2={30 + i * 45}
            y2="99"
            stroke="#24564B"
            strokeOpacity="0.11"
            strokeWidth="3"
          />
        ))}
        {/* 檐口板（给檐边厚度，两端才不会收成刀尖） */}
        <path
          d="M0 72 C24 92 72 100 160 102 L1280 102 C1368 100 1416 92 1440 72 L1440 81 C1412 99 1364 109 1280 111 L160 111 C76 109 28 99 0 81 Z"
          fill="#24564B"
          opacity="0.52"
        />
        {/* 正脊 */}
        <rect x="170" y="12" width="1100" height="16" rx="6" fill="url(#glRoofRidge)" />
        <rect x="170" y="12" width="1100" height="5" rx="2.5" fill="#CFE6DA" opacity="0.5" />
      </svg>
    ),
    [],
  );

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-moxuan">
      {backdrop}

      {/* 纸纹：极淡的横竖纤维，压住大面积平涂的「塑料感」 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(92deg, rgba(120,150,138,0.055) 0 1px, transparent 1px 5px), repeating-linear-gradient(4deg, rgba(160,180,170,0.05) 0 1px, transparent 1px 7px)',
        }}
        aria-hidden="true"
      />

      {/* 浮尘 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/70 animate-drift"
            style={{
              left: `${m.l}%`,
              top: `${m.t}%`,
              width: m.s,
              height: m.s,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
              boxShadow: '0 0 8px rgba(255,255,255,0.9)',
            }}
          />
        ))}
      </div>

      {/* ==================== 全屏山门 ==================== */}
      <div className="absolute inset-0">
        {/* 中缝灵光（在门扇之后，只从张开的门缝里透出来） */}
        <div
          className="absolute left-1/2 w-[22%] -translate-x-1/2"
          style={{
            top: `${DOOR_TOP}%`,
            bottom: `${DOOR_BOTTOM}%`,
            background:
              'radial-gradient(ellipse 46% 56% at 50% 50%, #FFFDF2 0%, #F3F9E6 30%, rgba(206,238,224,0.72) 58%, rgba(150,205,190,0) 100%)',
            opacity: 0.34 + progress * 0.66,
          }}
        />

        <DoorLeaf side="left" progress={progress} />
        <DoorLeaf side="right" progress={progress} />

        {/* 门缝外溢的光晕（叠在门扇上，营造灵光扑面） */}
        <div
          className="pointer-events-none absolute left-1/2 w-[44%] -translate-x-1/2"
          style={{
            top: `${DOOR_TOP}%`,
            bottom: `${DOOR_BOTTOM}%`,
            background:
              'radial-gradient(ellipse 32% 52% at 50% 50%, rgba(255,255,236,0.9) 0%, rgba(255,255,236,0.34) 44%, rgba(255,255,236,0) 76%)',
            opacity: progress * 0.5,
          }}
        />

        {/* 左右门框（通高，压住门扇外缘） */}
        {['left', 'right'].map((side) => (
          <div
            key={side}
            className="absolute top-0"
            style={{
              [side]: 0,
              width: `${FRAME_W}%`,
              bottom: `${GROUND_H}%`,
              background: `linear-gradient(${side === 'left' ? 90 : 270}deg, #2A5A4E 0%, #3E7A6B 46%, #4E8F7E 100%)`,
              boxShadow: 'inset 0 0 40px rgba(12,38,32,0.3)',
            }}
          >
            <div
              className="absolute inset-y-0"
              style={{
                [side === 'left' ? 'right' : 'left']: 0,
                width: 2,
                background: 'rgba(201,169,97,0.55)',
              }}
            />
          </div>
        ))}

        {/* 门楣（全宽横梁，压在门扇上沿） */}
        <div
          className="absolute inset-x-0"
          style={{
            top: `${ROOF_H}%`,
            height: `${LINTEL_H}%`,
            background: 'linear-gradient(180deg, #3E7A6B 0%, #24564B 100%)',
            boxShadow: '0 8px 22px rgba(16,46,40,0.34)',
          }}
        >
          <div
            className="absolute inset-x-0 bottom-0 h-[3px]"
            style={{ background: 'rgba(201,169,97,0.5)' }}
          />
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: 'rgba(255,255,255,0.22)' }}
          />
        </div>

        {roof}

        {/* 匾额（题站点名） */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: '13.4%', height: '8.4%', width: 'min(34%, 520px)' }}
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-[3px] border-2 border-[#C9A961]"
            style={{
              background: 'linear-gradient(180deg, #32705F 0%, #17453D 100%)',
              boxShadow: '0 10px 26px rgba(16,46,40,0.36), inset 0 0 24px rgba(201,169,97,0.16)',
            }}
          >
            <span
              className="pointer-events-none absolute inset-[7px] rounded-[2px] border border-[#C9A961]/45"
              aria-hidden="true"
            />
            <span
              className="font-kai text-[clamp(24px,3vw,50px)] leading-none tracking-[0.3em] text-[#F4E3B0]"
              style={{
                textShadow:
                  '0 0 18px rgba(255,236,180,0.55), 0 2px 0 rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.4)',
                fontFamily: KAI_FONT,
              }}
            >
              {siteName}
            </span>
          </div>
        </div>

        {/* 门槛 */}
        <div
          className="absolute inset-x-0"
          style={{
            bottom: `${GROUND_H}%`,
            height: `${THRESH_H}%`,
            background: 'linear-gradient(180deg, #9CC3B6 0%, #6E9A8E 42%, #457C6E 100%)',
            boxShadow: '0 -2px 10px rgba(16,46,40,0.22)',
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: 'rgba(255,255,255,0.5)' }}
          />
        </div>

        {/* 地面 / 石阶（承载底部文字） */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${GROUND_H}%`,
            background:
              'linear-gradient(180deg, rgba(251,253,246,0.66) 0%, rgba(251,253,246,0.92) 42%, #FBFDF6 100%)',
          }}
        >
          <div
            className="absolute inset-x-0 top-[34%] h-px"
            style={{ background: 'rgba(110,154,142,0.22)' }}
          />
          <div
            className="absolute inset-x-0 top-[68%] h-px"
            style={{ background: 'rgba(110,154,142,0.16)' }}
          />
        </div>

        {/* 门缝上的旋转玉简：题「啟」字封印，进度即启封程度。
            刻意不复用站点名——匾额已经题过，重复反而泄气。 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: `${DOOR_TOP + (100 - DOOR_TOP - DOOR_BOTTOM) / 2}%` }}
        >
          <div
            className="relative flex items-center justify-center rounded-sm"
            style={{
              width: 'clamp(64px,7vw,118px)',
              height: 'clamp(128px,14vw,236px)',
              transform: `rotateY(${rotate}deg)`,
              background: 'linear-gradient(180deg, #1B4A41 0%, #0E2F29 100%)',
              border: '2px solid #C9A961',
              boxShadow:
                '0 0 38px rgba(201,169,97,0.55), 0 8px 24px rgba(12,38,32,0.5), inset 0 0 24px rgba(255,240,200,0.12)',
            }}
          >
            <span
              className="font-kai text-[clamp(30px,3.6vw,62px)] leading-none text-[#F0DCA4]"
              style={{ fontFamily: KAI_FONT, textShadow: '0 0 16px rgba(255,232,170,0.6)' }}
            >
              啟
            </span>
            <span
              className="pointer-events-none absolute inset-0 rounded-sm"
              style={{
                background: `linear-gradient(to top, rgba(201,169,97,0.34) ${percent}%, transparent ${percent}%)`,
              }}
            />
            <span className="pointer-events-none absolute inset-[4px] rounded-[2px] border border-[#C9A961]/35" />
          </div>
        </div>
      </div>

      {/* ==================== 底部文字 ==================== */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center"
        style={{ height: `${GROUND_H}%` }}
      >
        <p className="text-[12px] tracking-[0.34em] text-stone/85">{subtitle}</p>

        {/* 篆文进度 */}
        <div className="mt-2.5 flex items-center gap-[7px]">
          {SEAL_CHARS.split('').map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className={`font-kai text-[16px] transition-all duration-500 ${
                i < litCount ? 'text-gold drop-shadow-[0_0_9px_rgba(201,169,97,0.75)]' : 'text-stone/25'
              }`}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* 进度条（带游走高光） */}
        <div className="relative mt-2.5 h-[3px] w-[240px] overflow-hidden rounded-full bg-xuanqingMid/80 sm:w-[300px]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold/40 via-gold to-goldLight transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
          <div
            className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/85 to-transparent"
            style={{ left: `calc(${percent}% - 64px)`, opacity: percent > 2 ? 0.9 : 0 }}
          />
        </div>

        <p className="mt-2 h-5 text-[12.5px] tracking-[0.28em] text-stone/85">{stageText}</p>

        {slowNetwork && !gateReady && (
          <p className="mt-0.5 text-[12px] tracking-[0.2em] text-[#B8860B]">灵脉不畅，建议切换网络</p>
        )}

        {/* 推门入府 */}
        <button
          type="button"
          disabled={!gateReady}
          onClick={onEnter}
          aria-label="推门入府，进入玄玑洞府主页"
          className={`btn-gold mt-3 rounded-sm font-kai text-[15px] disabled:cursor-not-allowed ${
            gateReady ? 'animate-breathe' : ''
          }`}
        >
          推门入府
        </button>
      </div>
    </div>
  );
}
