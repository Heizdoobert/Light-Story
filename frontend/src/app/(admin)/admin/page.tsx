import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

// Redirect /admin → /admin/dashboard.
// (admin)/layout.tsx already renders the AdminSidebar shell for every admin page,
// so mounting the legacy tabbed AdminDashboard here would nest the old dashboard
// inside the new shell (duplicate sidebar + topbar).
export default function AdminPage() {
  redirect(ROUTES.ADMIN.DASHBOARD);
}
