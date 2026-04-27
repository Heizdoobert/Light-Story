// This component protects routes based on the user's role
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserRole } from '../../modules/auth/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const from = encodeURIComponent(pathname || '/');
    if (!user) {
      router.replace(`/handle-exception/401?from=${from}`);
      return;
    }

    if (!role || !allowedRoles.includes(role)) {
      router.replace(`/handle-exception/403?from=${from}`);
    }
  }, [allowedRoles, loading, pathname, role, router, user]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
};
