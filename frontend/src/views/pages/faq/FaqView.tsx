"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { HelpCircle } from 'lucide-react';

export const FaqView: FC = () => {
  const faqs = [
    { q: 'Làm thế nào để nâng cấp gói VIP?', a: 'Bạn có thể vào mục Bảng Giá / Gói Dịch Vụ và bấm chọn gói phù hợp để thanh toán qua VNPay hoặc Momo.' },
    { q: 'Quyền hạn của Admin là gì?', a: 'Admin có đầy đủ quyền quản lý nội dung truyện, chương, người dùng, xem báo cáo doanh thu và lịch sử truy cập.' },
    { q: 'Làm sao để liên hệ hỗ trợ kỹ thuật?', a: 'Gửi yêu cầu trực tiếp qua ứng dụng Chat kỹ thuật nội bộ hoặc gọi hot line 1900 xxxx.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="text-center py-6 space-y-2">
        <HelpCircle className="w-12 h-12 text-indigo-500 mx-auto" />
        <h1 className="text-3xl font-bold">Câu Hỏi Thường Gặp (FAQ)</h1>
        <p className="text-slate-400">Giải đáp các thắc mắc phổ biến về hệ thống Light Story</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <CoreCard key={idx} title={faq.q}>
            <p className="text-slate-300 text-sm leading-relaxed">{faq.a}</p>
          </CoreCard>
        ))}
      </div>
    </div>
  );
};

export default FaqView;
