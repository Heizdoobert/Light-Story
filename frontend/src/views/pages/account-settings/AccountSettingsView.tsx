"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { CoreInput } from '@core/components/Form';

export const AccountSettingsView: FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <CoreCard title="Cài Đặt Tài Khoản" subtitle="Quản lý thông tin cá nhân và bảo mật">
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CoreInput label="Họ và Tên" defaultValue="Quản Trị Viên" />
            <CoreInput label="Email" defaultValue="admin@lightstory.vn" disabled />
            <CoreInput label="Số Điện Thoại" defaultValue="0988 123 456" />
            <CoreInput label="Vai Trò" defaultValue="Super Admin" disabled />
          </div>
          <div className="pt-4 flex justify-end">
            <button type="button" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </CoreCard>
    </div>
  );
};

export default AccountSettingsView;
