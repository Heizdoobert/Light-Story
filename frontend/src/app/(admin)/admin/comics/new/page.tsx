import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';

// Old route-based page ? replaced by the tabbed AdminDashboard (/admin/dashboard).
export default function OldAdminPageRedirect() {
  redirect(ROUTES.ADMIN.DASHBOARD);
}