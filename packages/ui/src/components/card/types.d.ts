import React from 'react';
import { CardProps } from 'antd';
export interface MetricTrend {
    value: number | string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
}
export interface MetricCardProps extends Omit<CardProps, 'title' | 'prefix'> {
    title: React.ReactNode;
    value: React.ReactNode;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    icon?: React.ReactNode;
    trend?: MetricTrend;
    description?: React.ReactNode;
    loading?: boolean;
}
