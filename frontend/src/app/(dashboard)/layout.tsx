import type { ReactNode } from 'react';
import VerticalLayout from '@layouts/VerticalLayout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <VerticalLayout>{children}</VerticalLayout>;
}
