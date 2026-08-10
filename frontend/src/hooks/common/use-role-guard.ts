"use client";

// ponytail: per-page role gate — redirects unauthorized direct URL hits.
// Sidebar already hides the links; this closes the URL-typing hole.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@/hooks/features/use-user";
import type { UserRole } from "@/lib/admin/admin-navigation";

export function useRoleGuard(allowedRoles: UserRole[], redirectTo: string) {
  const { role, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!role || !allowedRoles.includes(role as UserRole)) {
      toast.error("Bạn không có quyền truy cập trang này");
      router.replace(redirectTo);
    }
  }, [role, isLoading, router, redirectTo, allowedRoles]);
}
