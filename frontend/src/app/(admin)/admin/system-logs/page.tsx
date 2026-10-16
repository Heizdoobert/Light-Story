"use client";

import { useSystemLogsPresenter } from '@/hooks/presenters/useSystemLogsPresenter';
import { SystemLogsPage } from '@/components/admin/SystemLogsPage';

export default function AdminSystemLogsRoute() {
  const presenter = useSystemLogsPresenter();
  return <SystemLogsPage {...presenter} />;
}
