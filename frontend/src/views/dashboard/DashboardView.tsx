"use client";

import type { FC, ElementType } from 'react';
import { CoreCard } from '@core/components/Card';
import { CoreTable, Column } from '@core/components/Table';
import { formatCurrency } from '@core/utils/formatNumber';
import { Users, BookOpen, ShieldAlert, ArrowUpRight, DollarSign } from 'lucide-react';

interface QuickStat {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: ElementType;
  color: string;
}

const stats: QuickStat[] = [
  { id: '1', title: 'Tổng Doanh Thu', value: '148.500.000 ₫', change: '+12.5%', isPositive: true, icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
  { id: '2', title: 'Người Dùng Mới', value: '2.450', change: '+18.2%', isPositive: true, icon: Users, color: 'from-indigo-500 to-blue-600' },
  { id: '3', title: 'Lượt Đọc Truyện', value: '1.280.400', change: '+24.1%', isPositive: true, icon: BookOpen, color: 'from-purple-500 to-indigo-600' },
  { id: '4', title: 'Báo Cáo Vi Phạm', value: '14', change: '-5.3%', isPositive: true, icon: ShieldAlert, color: 'from-rose-500 to-pink-600' },
];

interface RecentOrder {
  id: string;
  user: string;
  plan: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

const recentOrders: RecentOrder[] = [
  { id: 'ORD-8821', user: 'Nguyen Van A', plan: 'Gói VIP 1 Năm', amount: 499000, status: 'completed', date: '2026-08-03' },
  { id: 'ORD-8822', user: 'Tran Thi B', plan: 'Gói VIP 1 Tháng', amount: 59000, status: 'completed', date: '2026-08-03' },
  { id: 'ORD-8823', user: 'Le Van C', plan: 'Gói VIP 6 Tháng', amount: 289000, status: 'pending', date: '2026-08-02' },
  { id: 'ORD-8824', user: 'Pham Minh D', plan: 'Gói VIP 1 Năm', amount: 499000, status: 'completed', date: '2026-08-02' },
  { id: 'ORD-8825', user: 'Hoang Anh E', plan: 'Gói VIP 1 Tháng', amount: 59000, status: 'failed', date: '2026-08-01' },
];

const columns: Column<RecentOrder>[] = [
  { key: 'id', header: 'Mã Đơn' },
  { key: 'user', header: 'Khách Hàng' },
  { key: 'plan', header: 'Gói Dịch Vụ' },
  {
    key: 'amount',
    header: 'Số Tiền',
    align: 'right',
    render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(row.amount)}</span>,
  },
  {
    key: 'status',
    header: 'Trạng Thái',
    align: 'center',
    render: (row) => {
      const badges = {
        completed: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
        pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        failed: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      };
      const labels = { completed: 'Thành công', pending: 'Đang xử lý', failed: 'Thất bại' };
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badges[row.status]}`}>
          {labels[row.status]}
        </span>
      );
    },
  },
  { key: 'date', header: 'Ngày Tạo', align: 'right' },
];

const activities = [
  { title: 'Cập nhật server cache Cloudflare', time: '5 phút trước', type: 'system' },
  { title: 'Người dùng NguyenA vừa nâng cấp VIP', time: '12 phút trước', type: 'user' },
  { title: 'Tải lên thành công 4 chương truyện mới', time: '30 phút trước', type: 'content' },
  { title: 'Tự động sao lưu Database thành công', time: '1 giờ trước', type: 'system' },
] as const;

export const DashboardView: FC = () => {
  return (
    <div className="space-y-8">
      {/* Banner Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight">Chào mừng quay trở lại, Admin! 👋</h1>
          <p className="mt-2 text-indigo-100 text-sm md:text-base leading-relaxed">
            Hệ thống Light Story đang hoạt động ổn định. Hôm nay bạn có <strong>2.450</strong> lượt đăng ký mới và <strong>1.28M</strong> lượt đọc truyện.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const IconComp = stat.icon;
          return (
            <CoreCard key={stat.id} variant="default" className="relative group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <IconComp className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-1.5 text-xs font-semibold text-emerald-500">
                <ArrowUpRight className="w-4 h-4" />
                <span>{stat.change} so với tháng trước</span>
              </div>
            </CoreCard>
          );
        })}
      </div>

      {/* Main Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CoreCard
          title="Tăng Trưởng Người Dùng & Doanh Thu"
          subtitle="Thống kê trong 7 ngày gần nhất"
          className="lg:col-span-2"
        >
          <div className="h-64 flex flex-col justify-end space-y-4 pt-4">
            <div className="grid grid-cols-7 gap-3 items-end h-48">
              {[45, 62, 78, 55, 90, 82, 95].map((val, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${val}%` }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 hover:brightness-110 transition-all cursor-pointer"
                  ></div>
                  <span className="text-xs text-slate-500">T{idx + 2}</span>
                </div>
              ))}
            </div>
          </div>
        </CoreCard>

        <CoreCard title="Hoạt Động Hệ Thống" subtitle="Nhật ký realtime">
          <div className="space-y-4">
            {activities.map((act, i) => (
              <div key={i} className="flex space-x-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{act.title}</p>
                  <span className="text-xs text-slate-400">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CoreCard>
      </div>

      {/* Recent Orders Table */}
      <CoreCard title="Giao Dịch Gần Đây" subtitle="Danh sách các đơn đăng ký dịch vụ vừa thực hiện">
        <CoreTable columns={columns} data={recentOrders} />
      </CoreCard>
    </div>
  );
};

export default DashboardView;
