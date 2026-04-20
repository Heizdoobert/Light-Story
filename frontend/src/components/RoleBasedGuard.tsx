import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

interface RoleBasedGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleBasedGuard: React.FC<RoleBasedGuardProps> = ({ children, allowedRoles }) => {
  const { role, loading, user } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Verifying permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-10">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-black">Access Denied</h1>
        <p className="text-text-muted font-bold">You do not have permission to view this page.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-bold"
        >
          Return Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
