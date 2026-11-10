import React from 'react';

interface MetricCardProps {
  title: string;
  value: number | string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value }) => {
  return (
    <div data-testid="metric-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
};
