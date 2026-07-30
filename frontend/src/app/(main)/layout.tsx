import { UserShell } from '@/components/shared/layout/UserShell';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}