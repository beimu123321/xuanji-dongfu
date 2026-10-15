/**
 * 洞府总览（仪表盘，文档 4.4）
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Card, Col, Empty, List, Row, Skeleton, Statistic, Tag } from 'antd';
import { message } from '../../utils/message';
import {
  AppstoreOutlined,
  ClusterOutlined,
  EyeOutlined,
  IdcardOutlined,
  PlusOutlined,
  SendOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { EChartsOption } from 'echarts';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../../api/endpoints';
import EChart from '../../components/EChart';
import PageCard from '../../components/PageCard';
import type { DashboardOverview } from '../../types';

const GOLD = '#C9A961';
const STONE = '#8A94A0';
const PINE = '#5B8C5A';

/** 通用坐标轴样式 */
const axisStyle = {
  axisLine: { lineStyle: { color: 'rgba(201,169,97,0.25)' } },
  axisLabel: { color: STONE, fontSize: 11 },
  splitLine: { lineStyle: { color: 'rgba(201,169,97,0.08)' } },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await statsApi.overview());
    } catch (err) {
      message.error(err instanceof Error ? err.message : '洞府数据未能取回');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trendOption = useMemo<EChartsOption>(() => {
    const list = data?.trend7 ?? [];
    return {
      grid: { left: 44, right: 18, top: 26, bottom: 28 },
      tooltip: { trigger: 'axis', backgroundColor: '#171D24', borderColor: 'rgba(201,169,97,0.3)', textStyle: { color: '#E8E6E1', fontSize: 12 } },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: list.map((d) => d.date.slice(5)),
        ...axisStyle,
      },
      yAxis: { type: 'value', ...axisStyle },
      series: [
        {
          name: '访客',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: list.map((d) => d.count),
          lineStyle: { color: GOLD, width: 2 },
          itemStyle: { color: GOLD },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(201,169,97,0.34)' },
                { offset: 1, color: 'rgba(201,169,97,0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [data]);

  const pieOption = useMemo<EChartsOption>(() => {
    const list = data?.techDistribution ?? [];
    const palette = [GOLD, PINE, '#4A6FA5', '#8B2323', '#B8860B', '#6E7A85', '#7A9A78', '#A08C5A'];
    return {
      tooltip: { trigger: 'item', backgroundColor: '#171D24', borderColor: 'rgba(201,169,97,0.3)', textStyle: { color: '#E8E6E1', fontSize: 12 } },
      legend: {
        bottom: 0,
        textStyle: { color: STONE, fontSize: 11 },
        itemWidth: 9,
        itemHeight: 9,
      },
      color: palette,
      series: [
        {
          name: '功法占比',
          type: 'pie',
          radius: ['42%', '66%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#0F1419', borderWidth: 2 },
          label: { color: '#E8E6E1', fontSize: 11, formatter: '{b} {d}%' },
          labelLine: { lineStyle: { color: 'rgba(201,169,97,0.4)' } },
          data: list,
        },
      ],
    };
  }, [data]);

  const cards = data?.cards;

  return (
    <div className="space-y-4">
      {/* 数据概览卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <OverviewCard
            loading={loading}
            icon={<TeamOutlined />}
            title="洞府访客数"
            value={cards?.visits.total ?? 0}
            footer={`今日 ${cards?.visits.today ?? 0} 位`}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <OverviewCard
            loading={loading}
            icon={<EyeOutlined />}
            title="丹器品鉴数"
            value={cards?.projectViews ?? 0}
            footer="全部法宝累计"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <OverviewCard
            loading={loading}
            icon={<SendOutlined />}
            title="传讯次数"
            value={cards?.contactClicks ?? 0}
            footer="玉符点击累计"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <OverviewCard
            loading={loading}
            icon={<AppstoreOutlined />}
            title="馆藏总数"
            value={cards?.collections ?? 0}
            footer={`已上架 ${cards?.onlineProjects ?? 0} 件`}
          />
        </Col>
      </Row>

      {/* 图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <PageCard title="近 7 日访客趋势" subtitle="洞府访客走势">
            {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : <EChart option={trendOption} height={300} />}
          </PageCard>
        </Col>
        <Col xs={24} xl={10}>
          <PageCard title="功法分类占比" subtitle="项目技术栈分布">
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (data?.techDistribution.length ?? 0) === 0 ? (
              <Empty description={<span className="text-[#8A94A0]">尚无丹器入库</span>} />
            ) : (
              <EChart option={pieOption} height={300} />
            )}
          </PageCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近操作 */}
        <Col xs={24} xl={14}>
          <PageCard title="最近操作记录" subtitle="洞府日志">
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <List
                size="small"
                dataSource={data?.recentOperations ?? []}
                locale={{ emptyText: <span className="text-[#8A94A0]">暂无操作记录</span> }}
                renderItem={(item) => (
                  <List.Item>
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Tag color="gold" bordered={false}>
                          {item.action}
                        </Tag>
                        <span className="text-[13.5px] text-[#E8E6E1]">{item.target}</span>
                      </div>
                      <span className="shrink-0 font-mono text-[11.5px] text-[#5A616A]">
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </PageCard>
        </Col>

        {/* 品鉴排行 + 快捷入口 */}
        <Col xs={24} xl={10}>
          <div className="space-y-4">
            <PageCard title="丹器品鉴排行" subtitle="最受青睐的法宝">
              {loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (data?.topProjects.length ?? 0) === 0 ? (
                <Empty description={<span className="text-[#8A94A0]">尚无丹器入库</span>} />
              ) : (
                <List
                  size="small"
                  dataSource={data?.topProjects ?? []}
                  renderItem={(item, index) => (
                    <List.Item>
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-[#C9A961]">{String(index + 1).padStart(2, '0')}</span>
                          <span className="text-[13.5px] text-[#E8E6E1]">{item.name}</span>
                          <span className="text-[11.5px] text-[#5A616A]">{item.category}</span>
                        </div>
                        <span className="font-mono text-[12px] text-[#8A94A0]">{item.views}</span>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </PageCard>

            <PageCard title="快捷入口" subtitle="常用法器">
              <div className="grid grid-cols-2 gap-3">
                <QuickEntry icon={<IdcardOutlined />} label="编辑筑基档案" onClick={() => navigate('/profile')} />
                <QuickEntry icon={<PlusOutlined />} label="新增丹器" onClick={() => navigate('/project')} />
                <QuickEntry
                  icon={<EyeOutlined />}
                  label="预览洞府"
                  onClick={() => window.open(`${window.location.origin}/`, '_blank', 'noopener')}
                />
                <QuickEntry icon={<SettingOutlined />} label="系统设置" onClick={() => navigate('/settings')} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11.5px] text-[#5A616A]">
                <ClusterOutlined />
                <span>履历 {cards?.experiences ?? 0} 段 · 玉符 {cards?.contacts ?? 0} 枚</span>
              </div>
            </PageCard>
          </div>
        </Col>
      </Row>
    </div>
  );
}

function OverviewCard({
  loading,
  icon,
  title,
  value,
  footer,
}: {
  loading: boolean;
  icon: ReactNode;
  title: string;
  value: number;
  footer: string;
}) {
  return (
    <Card className="ink-card h-full" variant="outlined" styles={{ body: { padding: 18 } }}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] tracking-[0.14em] text-[#8A94A0]">{title}</span>
            <span className="text-[16px] text-[#C9A961]">{icon}</span>
          </div>
          <Statistic
            value={value}
            valueStyle={{ color: '#E8E6E1', fontSize: 26, fontFamily: 'JetBrains Mono, monospace' }}
          />
          <div className="mt-1 text-[11.5px] text-[#5A616A]">{footer}</div>
        </>
      )}
    </Card>
  );
}

function QuickEntry({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button
      block
      onClick={onClick}
      icon={icon}
      className="!flex !h-[52px] !items-center !justify-center !text-[13px]"
    >
      {label}
    </Button>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '——';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
