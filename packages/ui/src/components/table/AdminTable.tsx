'use client';

import { Table, Empty, TablePaginationConfig } from 'antd';
import { AdminTableProps } from './types';

const defaultPagination: TablePaginationConfig = {
  defaultPageSize: 20,
  pageSizeOptions: ['10', '20', '50', '100'],
  showSizeChanger: true,
  showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} mục`,
};

/**
 * Standardized enterprise data table for Light-Story Admin CMS.
 * Configured with responsive horizontal scroll, pagination, and theme defaults.
 */
export function AdminTable<T extends object = Record<string, any>>({
  columns,
  dataSource,
  loading = false,
  rowKey = 'id',
  compact = false,
  pagination = defaultPagination,
  scroll = { x: 'max-content' },
  emptyText = 'Không có dữ liệu',
  locale,
  className,
  ...restProps
}: AdminTableProps<T>) {
  const mergedLocale = {
    emptyText: <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
    ...locale,
  };

  const mergedPagination: false | TablePaginationConfig = pagination
    ? { ...defaultPagination, ...pagination }
    : false;

  const tableClassName = ['light-story-admin-table', className].filter(Boolean).join(' ');

  return (
    <Table<T>
      className={tableClassName}
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey}
      size={compact ? 'small' : 'middle'}
      pagination={mergedPagination}
      scroll={scroll}
      locale={mergedLocale}
      {...restProps}
    />
  );
}

export default AdminTable;
