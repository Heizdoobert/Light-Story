"use client";

import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";

// ponytail: tabbed AdminDashboard owns its own sidebar + topbar; (admin)/layout.tsx
// skips the route AdminSidebar on this path to avoid a duplicate sidebar.
export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
