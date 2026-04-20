import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

interface RoleBasedGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleBasedGuard: React.FC<RoleBasedGuardProps> = ({ children, allowedRoles }) => {
  const { role, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Verifying permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/401" state={{ from: location }} replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/403" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
