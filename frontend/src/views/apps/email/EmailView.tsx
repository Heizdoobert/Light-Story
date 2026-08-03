"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { Star, Trash2, Send, Inbox } from 'lucide-react';

export const EmailView: FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <CoreCard className="p-4 space-y-2">
        <button className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-md">
          <Send className="w-4 h-4" />
          <span>Soạn Hộp Thư</span>
        </button>
        <div className="pt-4 space-y-1 text-sm font-medium">
          <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold">
            <Inbox className="w-4 h-4" />
            <span>Hộp Thư Đến</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800">
            <Star className="w-4 h-4" />
            <span>Đánh Dấu Sao</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800">
            <Send className="w-4 h-4" />
            <span>Đã Gửi</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800">
            <Trash2 className="w-4 h-4" />
            <span>Thùng Rác</span>
          </a>
        </div>
      </CoreCard>

      <CoreCard className="lg:col-span-3" title="Hộp Thư Đến" subtitle="3 thư chưa đọc">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { sender: 'Hệ Thống Support', subject: 'Xác nhận gia hạn VIP thành công', time: '10:42 AM', unread: true },
            { sender: 'Nguyễn Văn B', subject: 'Yêu cầu mở khóa tài khoản tác giả', time: '09:15 AM', unread: true },
            { sender: 'Cloudflare Admin', subject: 'Cảnh báo lưu lượng API tăng vọt', time: 'Hôm qua', unread: false },
          ].map((item, index) => (
            <div key={index} className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${item.unread ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>
              <div className="flex items-center space-x-4">
                <Star className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                <span>{item.sender}</span>
                <span className="text-sm font-normal text-slate-400 truncate max-w-md">{item.subject}</span>
              </div>
              <span className="text-xs text-slate-400">{item.time}</span>
            </div>
          ))}
        </div>
      </CoreCard>
    </div>
  );
};

export default EmailView;
