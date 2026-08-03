"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';

export const CardsView: FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Thành Phần Card UI</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CoreCard variant="default" title="Default Card" subtitle="Kiểu card tiêu chuẩn">
          Nội dung thẻ thiết kế sắc nét với viền bo tròn nhẹ và shadow tinh tế.
        </CoreCard>
        <CoreCard variant="outlined" title="Outlined Card" subtitle="Kiểu card viền mỏng">
          Thích hợp cho các phần hiển thị phụ hoặc nhóm dữ liệu tối giản.
        </CoreCard>
        <CoreCard variant="glass" title="Glassmorphism Card" subtitle="Kiểu card kính mờ">
          Hiệu ứng kính mờ hiện đại cao cấp mang lại vẻ đẹp vượt trội.
        </CoreCard>
      </div>
    </div>
  );
};

export default CardsView;
