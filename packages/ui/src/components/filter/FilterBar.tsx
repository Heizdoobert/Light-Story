'use client';

import { Input, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { FilterBarProps } from './types';

export function FilterBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Tìm kiếm...',
  filters,
  actions,
  onReset,
  resetText = 'Đặt lại',
  className,
  style,
}: FilterBarProps) {
  return (
    <div
      className={`light-story-filter-bar ${className || ''}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1 }}>
        {(onSearchChange || onSearchSubmit) && (
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onPressEnter={(e) => onSearchSubmit?.((e.target as HTMLInputElement).value)}
            allowClear
            style={{ width: 260, maxWidth: '100%' }}
          />
        )}
        {filters}
        {onReset && (
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            {resetText}
          </Button>
        )}
      </div>

      {actions && <Space wrap>{actions}</Space>}
    </div>
  );
}

export default FilterBar;
