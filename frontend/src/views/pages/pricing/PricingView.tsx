"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { Check } from 'lucide-react';

export const PricingView: FC = () => {
  const plans = [
    { name: 'Gói Cơ Bản', price: 'Miễn phí', desc: 'Dành cho độc giả đọc truyện thường', features: ['Đọc truyện miễn phí', 'Lưu lịch sử đọc', 'Chất lượng tiêu chuẩn'] },
    { name: 'Gói VIP Tháng', price: '59.000 ₫ / tháng', popular: true, desc: 'Dành cho người hâm mộ', features: ['Đọc sớm chương mới 7 ngày', 'Không quảng cáo', 'Tải truyện đọc offline', 'Huy hiệu VIP'] },
    { name: 'Gói VIP Năm', price: '499.000 ₫ / năm', desc: 'Tiết kiệm 30%', features: ['Tất cả quyền lợi VIP Tháng', 'Tặng 500 Coin độc quyền', 'Hỗ trợ ưu tiên 24/7'] },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center py-6 space-y-2">
        <h1 className="text-3xl font-extrabold">Bảng Giá Dịch Vụ VIP</h1>
        <p className="text-slate-400">Lựa chọn gói dịch vụ phù hợp để tận hưởng trọn vẹn trải nghiệm</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p, idx) => (
          <CoreCard key={idx} className={`relative flex flex-col justify-between p-6 ${p.popular ? 'border-2 border-indigo-500 shadow-indigo-500/20' : ''}`}>
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                Phổ biến nhất
              </span>
            )}
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-2xl font-extrabold text-indigo-400">{p.price}</p>
              <p className="text-sm text-slate-400">{p.desc}</p>
              <div className="pt-4 space-y-2">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center space-x-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className={`mt-8 w-full py-3 rounded-xl font-semibold transition ${p.popular ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
              Đăng Ký Ngay
            </button>
          </CoreCard>
        ))}
      </div>
    </div>
  );
};

export default PricingView;
