import { TableProps, TablePaginationConfig } from 'antd';
export interface AdminTableProps<T extends object = Record<string, any>> extends Omit<TableProps<T>, 'pagination'> {
    pagination?: false | TablePaginationConfig;
    compact?: boolean;
    emptyText?: string;
}
