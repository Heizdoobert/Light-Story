import { BookOpen, Database, DollarSign, LayoutDashboard, Library, PenSquare, PlusCircle, Settings, User, Users, Workflow, type LucideIcon } from 'lucide-react';
import { UserRole } from '../modules/auth/AuthContext';

export type AdminMenuId =
  | 'dashboard'
  | 'operations_data'
  | 'create_story'
  | 'stories'
  | 'categories'
  | 'authors'
  | 'users'
  | 'ads'
  | 'settings'
  | 'profile'
  | 'operations';

export type AdminMenuItem = {
  id: AdminMenuId;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'operations',
    label: 'Operations Center',
    icon: Workflow,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'operations_data',
    label: 'Operations Data',
    icon: Database,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'create_story',
    label: 'Create Story',
    icon: PlusCircle,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: BookOpen,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: Library,
    roles: ['superadmin', 'admin', 'employee'],
  },
  {
    id: 'authors',
    label: 'Authors',
    icon: PenSquare,
    roles: ['superadmin', 'admin', 'employee'],
  },
  { id: 'users', label: 'Users', icon: Users, roles: ['superadmin'] },
  {
    id: 'ads',
    label: 'Ads & Revenue',
    icon: DollarSign,
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['superadmin'],
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: User,
    roles: ['superadmin', 'admin', 'employee'],
  },
];

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
  admin: ['dashboard', 'operations', 'operations_data', 'create_story', 'stories', 'categories', 'authors', 'ads', 'profile'],
  employee: ['dashboard', 'operations', 'operations_data', 'create_story', 'stories', 'categories', 'authors', 'profile'],
  user: [],
};
