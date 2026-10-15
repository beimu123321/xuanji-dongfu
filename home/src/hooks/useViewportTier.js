/**
 * 视口档位（文档 3.8.2：窄屏以底部导航替代 3D 玉简导航）。
 *
 * 3D 玉简环与底部导航必须共用同一判据——若两边各自判断，
 * 一旦出现「玉简环放不下、底部导航又不显示」的空档，前厅将没有任何入口。
 */
import { useEffect, useState } from 'react';

/** 文档 3.8.2 的移动端断点 */
const BREAKPOINT = 768;

/**
 * 前厅镜头（fov 52、相机距玉简约 7.4）在玉简所处景深上的可见半高。
 * 由 tan(52° / 2) × 7.4 得 ≈ 3.63；可见半宽 = 3.63 × 画幅比。
 */
const HALL_HALF_HEIGHT = 3.63;

/**
 * 玉简环缩放系数 = 可见半宽 × 0.168。
 *
 * 推导：环半径 5.0 加待机公转 ±15° 的横向位移，在最不利相位下约占可见半宽的 89%
 * （已计入玉简自身半宽），16:9（半宽 6.46）恰好留有余量。
 * 因此 0.168 × 6.46 ≈ 1.09 → 取满档；画幅变窄则等比收窄，外侧两枚不会被推出画面。
 */
const RING_SCALE_PER_HALF_WIDTH = 0.168;

/** 玉简环的最小可用缩放：再小则相邻玉简彼此挤到一处，改由底部导航承担导航 */
const RING_MIN_SCALE = 0.65;

function read() {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const height = typeof window === 'undefined' ? 900 : window.innerHeight;
  const aspect = width / Math.max(1, height);
  const halfWidth = HALL_HALF_HEIGHT * aspect;
  const ringScale = Math.min(1, halfWidth * RING_SCALE_PER_HALF_WIDTH);
  return {
    width,
    height,
    aspect,
    halfWidth,
    ringScale,
    narrow: width <= BREAKPOINT || ringScale < RING_MIN_SCALE,
  };
}

/** 当前视口档位：{ width, height, aspect, halfWidth, ringScale, narrow } */
export function useViewportTier() {
  const [tier, setTier] = useState(read);

  useEffect(() => {
    const update = () => setTier(read());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return tier;
}
