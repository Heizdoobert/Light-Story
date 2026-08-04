"use client";

import { BookOpen, Layers, Users, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Tổng Quan Quản Trị</h1>
        <p className="text-sm text-slate-500 mt-1">Báo cáo chỉ số hoạt động và số liệu hạ tầng hệ thống.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng Số Truyện" value="1,248" change="+12% tháng này" isPositive={true} icon={BookOpen} />
        <StatCard title="Tổng Số Chương" value="45,890" change="+8.4% tháng này" isPositive={true} icon={Layers} />
        <StatCard title="Người Dùng Mới" value="3,410" change="+18.2% tuần này" isPositive={true} icon={Users} />
        <StatCard title="Lượt Đọc Hàng Ngày" value="128,500" change="+24% so với hôm qua" isPositive={true} icon={TrendingUp} />
      </div>
    </div>
  );
}
