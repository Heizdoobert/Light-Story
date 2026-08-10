import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

// Redirect /admin → /admin/dashboard (the single tabbed AdminDashboard).
export default function AdminPage() {
  redirect(ROUTES.ADMIN.DASHBOARD);
}
