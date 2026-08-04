import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng Nhập / Đăng Ký | Light Story',
  description: 'Đăng nhập hoặc tạo tài khoản Light Story để lưu truyện và theo dõi tiến độ đọc.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}