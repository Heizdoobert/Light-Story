// This component protects routes based on the user's role
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/shared/ui/LoadingScreen';
import { ROUTES } from '@/lib/constants/routes';

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
      router.replace(`${ROUTES.ERROR.UNAUTHORIZED}?from=${from}`);
      return;
    }

    if (!role || !allowedRoles.includes(role)) {
      router.replace(`${ROUTES.ERROR.FORBIDDEN}?from=${from}`);
    }
  }, [allowedRoles, loading, pathname, role, router, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
};
