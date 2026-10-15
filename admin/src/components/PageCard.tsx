/**
 * 页面卡片容器（文档 4.10：所有页面采用 Card 包裹，标题统一左对齐）
 */
import type { ReactNode } from 'react';
import { Card } from 'antd';

interface PageCardProps {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  /** 副标题（修仙术语备注） */
  subtitle?: ReactNode;
  loading?: boolean;
}

export default function PageCard({ title, subtitle, extra, children, loading = false }: PageCardProps) {
  return (
    <Card
      className="ink-card"
      loading={loading}
      variant="outlined"
      title={
        <div className="flex flex-col">
          <span className="text-[16px] tracking-[0.14em] text-[#C9A961]">{title}</span>
          {subtitle && <span className="mt-0.5 text-[12px] font-normal tracking-[0.08em] text-[#8A94A0]">{subtitle}</span>}
        </div>
      }
      extra={extra}
      styles={{ body: { padding: 20 } }}
    >
      {children}
    </Card>
  );
}
