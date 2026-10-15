/**
 * ECharts 封装：自适应容器尺寸，随 option 变化更新，卸载时释放实例。
 */
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartProps {
  option: echarts.EChartsOption;
  height?: number | string;
}

export default function EChart({ option, height = 280 }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // 初始化与尺寸监听
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const chart = echarts.init(node, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // option 更新（notMerge 保证系列数量变化时不留残影）
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, true);
  }, [option]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
