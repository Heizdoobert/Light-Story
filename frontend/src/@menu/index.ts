export interface MenuItem {
  id: string;
  title: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  badge?: string;
  badgeColor?: string;
  roles?: string[];
}

export const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
  },
  {
    id: 'apps',
    title: 'Ứng Dụng',
    icon: 'Grid',
    children: [
      { id: 'email', title: 'Email', icon: 'Mail', path: '/apps/email' },
      { id: 'chat', title: 'Chat / Trò Chuyện', icon: 'MessageSquare', path: '/apps/chat' },
    ],
  },
  {
    id: 'pages',
    title: 'Trang',
    icon: 'FileText',
    children: [
      { id: 'account-settings', title: 'Cài Đặt Tài Khoản', icon: 'User', path: '/pages/account-settings' },
      { id: 'faq', title: 'Hỏi Đáp FAQ', icon: 'HelpCircle', path: '/pages/faq' },
      { id: 'pricing', title: 'Bảng Giá / Gói', icon: 'DollarSign', path: '/pages/pricing' },
    ],
  },
  {
    id: 'forms',
    title: 'Biểu Mẫu',
    icon: 'CheckSquare',
    children: [
      { id: 'form-layouts', title: 'Form Layouts', icon: 'Layout', path: '/forms/form-layouts' },
      { id: 'form-validation', title: 'Form Validation', icon: 'AlertCircle', path: '/forms/form-validation' },
    ],
  },
  {
    id: 'tables',
    title: 'Bảng Dữ Liệu',
    icon: 'Table',
    path: '/tables',
  },
  {
    id: 'ui',
    title: 'Giao Diện UI',
    icon: 'Layers',
    children: [
      { id: 'cards', title: 'Thẻ (Cards)', icon: 'CreditCard', path: '/ui/cards' },
      { id: 'buttons', title: 'Nút (Buttons)', icon: 'Square', path: '/ui/buttons' },
    ],
  },
];
