import { AdminTableProps } from './types';
/**
 * Standardized enterprise data table for Light-Story Admin CMS.
 * Configured with responsive horizontal scroll, pagination, and theme defaults.
 */
export declare function AdminTable<T extends object = Record<string, any>>({ columns, dataSource, loading, rowKey, compact, pagination, scroll, emptyText, locale, className, ...restProps }: AdminTableProps<T>): import("react").JSX.Element;
export default AdminTable;
