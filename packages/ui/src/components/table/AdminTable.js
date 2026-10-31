'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { Table, Empty } from 'antd';
const defaultPagination = {
    defaultPageSize: 20,
    pageSizeOptions: ['10', '20', '50', '100'],
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} mục`,
};
/**
 * Standardized enterprise data table for Light-Story Admin CMS.
 * Configured with responsive horizontal scroll, pagination, and theme defaults.
 */
export function AdminTable({ columns, dataSource, loading = false, rowKey = 'id', compact = false, pagination = defaultPagination, scroll = { x: 'max-content' }, emptyText = 'Không có dữ liệu', locale, className, ...restProps }) {
    const mergedLocale = {
        emptyText: _jsx(Empty, { description: emptyText, image: Empty.PRESENTED_IMAGE_SIMPLE }),
        ...locale,
    };
    const mergedPagination = pagination
        ? { ...defaultPagination, ...pagination }
        : false;
    const tableClassName = ['light-story-admin-table', className].filter(Boolean).join(' ');
    return (_jsx(Table, { className: tableClassName, columns: columns, dataSource: dataSource, loading: loading, rowKey: rowKey, size: compact ? 'small' : 'middle', pagination: mergedPagination, scroll: scroll, locale: mergedLocale, ...restProps }));
}
export default AdminTable;
//# sourceMappingURL=AdminTable.js.map