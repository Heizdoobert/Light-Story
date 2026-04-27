import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../modules/auth/AuthContext';

interface RoleBasedGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleBasedGuard: React.FC<RoleBasedGuardProps> = ({ children, allowedRoles }) => {
  const { role, loading, user } = useAuth();
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
    return <div className="flex items-center justify-center h-screen">Verifying permissions...</div>;
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
};
