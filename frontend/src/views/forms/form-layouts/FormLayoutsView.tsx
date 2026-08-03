"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { CoreInput } from '@core/components/Form';

export const FormLayoutsView: FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <CoreCard title="Vertical Form Layout" subtitle="Biểu mẫu sắp xếp theo chiều dọc">
        <form className="space-y-4">
          <CoreInput label="Tên Tác Phẩm" placeholder="Nhập tên truyện..." />
          <CoreInput label="Thể Loại" placeholder="Tiên Hiệp, Huyền Huyễn..." />
          <CoreInput label="Tác Giả" placeholder="Nhập tên tác giả..." />
          <button type="button" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md">
            Lưu Truyện
          </button>
        </form>
      </CoreCard>

      <CoreCard title="Horizontal Form Layout" subtitle="Biểu mẫu 2 cột song song">
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CoreInput label="Số Chương" placeholder="100" />
          <CoreInput label="Giá Tiền (Coin)" placeholder="50" />
          <div className="md:col-span-2 flex justify-end">
            <button type="button" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md">
              Cập Nhật
            </button>
          </div>
        </form>
      </CoreCard>
    </div>
  );
};

export default FormLayoutsView;
