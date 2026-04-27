/*
  ProtectedRoute.tsx
  Wraps components to ensure user is authenticated and has the required role.
*/
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../modules/auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const from = encodeURIComponent(pathname || '/');
    if (!user) {
      router.replace(`/401?from=${from}`);
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.replace(`/403?from=${from}`);
    }
  }, [allowedRoles, loading, pathname, role, router, user]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
};
