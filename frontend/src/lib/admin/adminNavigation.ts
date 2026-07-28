import { BookOpen, Database, DollarSign, LayoutDashboard, Library, PenSquare, Settings, User, Users, Workflow, type LucideIcon } from 'lucide-react';
import { UserRole } from '@/modules/auth/AuthContext';

export type AdminMenuId =
  | 'dashboard'
  | 'dashboard_access_logs'
  | 'audit_logs'
  | 'create_story'
  | 'create_chapter'
  | 'stories'
  | 'categories'
  | 'authors'
  | 'users'
  | 'ads'
  | 'settings'
  | 'operations'
  | 'profile'
  | 'create_comic';

export type AdminMenuItem = {
  id: AdminMenuId;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Bảng điều khiển',
    icon: LayoutDashboard,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'dashboard_access_logs',
    label: 'Nhật ký truy cập Admin',
    icon: Database,
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'audit_logs',
    label: 'Nhật ký kiểm toán System',
    icon: Database,
    roles: ['superadmin'],
  },
  {
    id: 'operations',
    label: 'Trung tâm vận hành',
    icon: Workflow,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'create_comic',
    label: 'Quản lý Truyện & CMS',
    icon: BookOpen,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'categories',
    label: 'Thể loại truyện',
    icon: Library,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'authors',
    label: 'Tác giả & Nhóm dịch',
    icon: PenSquare,
    roles: ['superadmin', 'admin', 'employee'],
  },
  { id: 'users', label: 'Quản lý người dùng', icon: Users, roles: ['superadmin', 'admin'] },
  {
    id: 'ads',
    label: 'Quảng cáo & Doanh thu',
    icon: DollarSign,
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'settings',
    label: 'Cài đặt hệ thống',
    icon: Settings,
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'profile',
    label: 'Hồ sơ cá nhân',
    icon: User,
    roles: ['superadmin', 'admin', 'employee'],
  },
];

export function getAdminMenuItems(t?: (key: string) => string): AdminMenuItem[] {
  if (!t) return ADMIN_MENU_ITEMS;
  return ADMIN_MENU_ITEMS.map((item) => ({
    ...item,
    label: t(`nav_${item.id}`) || item.label,
  }));
}

export const ADMIN_MENU_IDS = ADMIN_MENU_ITEMS.map((item) => item.id) as AdminMenuId[];

export const ADMIN_MENU_LABELS: Record<AdminMenuId, string> = ADMIN_MENU_ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = item.label;
    return acc;
  },
  {} as Record<AdminMenuId, string>,
);

export const DEFAULT_ADMIN_MENU_VISIBILITY: Record<UserRole, AdminMenuId[]> = {
  superadmin: [...ADMIN_MENU_IDS],
  admin: ['dashboard', 'dashboard_access_logs', 'operations', 'create_story', 'create_chapter', 'stories', 'categories', 'authors', 'ads', 'settings', 'profile', 'create_comic'],
  employee: ['dashboard', 'operations', 'create_story', 'create_chapter', 'stories', 'categories', 'authors', 'profile', 'create_comic'],
  user: [],
};
