"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { CoreTable, Column } from '@core/components/Table';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const users: UserRow[] = [
  { id: '1', name: 'Nguyen Van A', email: 'a@lightstory.vn', role: 'Admin', status: 'Hoạt động' },
  { id: '2', name: 'Tran Thi B', email: 'b@lightstory.vn', role: 'Editor', status: 'Hoạt động' },
  { id: '3', name: 'Le Van C', email: 'c@lightstory.vn', role: 'Author', status: 'Khóa' },
];

const columns: Column<UserRow>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Họ và Tên' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Vai Trò' },
  {
    key: 'status',
    header: 'Trạng Thái',
    render: (row) => (
      <span className={`px-2 py-1 text-xs rounded-md ${row.status === 'Hoạt động' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {row.status}
      </span>
    ),
  },
];

export const TablesView: FC = () => {
  return (
    <div className="space-y-6">
      <CoreCard title="Danh Sách Quản Trị Viên & Tác Giả" subtitle="Dữ liệu tổng hợp từ cơ sở dữ liệu">
        <CoreTable columns={columns} data={users} />
      </CoreCard>
    </div>
  );
};

export default TablesView;
