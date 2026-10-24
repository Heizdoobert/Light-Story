'use client';

import React from 'react';
import { Card, Skeleton, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { MetricCardProps, MetricTrend } from './types';

const { Text } = Typography;

const TREND_CONFIG: Record<
  MetricTrend['direction'],
  { icon: React.ReactNode; color: string }
> = {
  up: { icon: <ArrowUpOutlined />, color: '#10b981' },
  down: { icon: <ArrowDownOutlined />, color: '#ef4444' },
  neutral: { icon: <MinusOutlined />, color: '#9ca3af' },
};

export function MetricCard({
  title,
  value,
  prefix,
  suffix,
  icon,
  trend,
  description,
  loading = false,
  className,
  ...restProps
}: MetricCardProps) {
  const cardClassName = ['light-story-metric-card', className].filter(Boolean).join(' ');

  if (loading) {
    return (
      <Card className={cardClassName} {...restProps}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  const renderTrend = () => {
    if (!trend) return null;

    const { icon: iconNode, color } = TREND_CONFIG[trend.direction] ?? TREND_CONFIG.neutral;

    return (
      <Space size={4} style={{ color, fontSize: 13, fontWeight: 600 }}>
        {iconNode}
        <span>{trend.value}</span>
        {trend.label && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            {trend.label}
          </Text>
        )}
      </Space>
    );
  };

  return (
    <Card
      className={cardClassName}
      styles={{ body: { padding: '20px 24px' } }}
      {...restProps}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {title}
          </Text>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8, gap: 4 }}>
            {prefix && <span style={{ fontSize: 20, color: '#9ca3af' }}>{prefix}</span>}
            <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
            {suffix && <span style={{ fontSize: 14, color: '#9ca3af' }}>{suffix}</span>}
          </div>
        </div>
        {icon && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              color: '#f97316',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {(trend || description) && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {renderTrend()}
          {description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {description}
            </Text>
          )}
        </div>
      )}
    </Card>
  );
}

export default MetricCard;
