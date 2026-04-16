// This component protects routes based on the user's role
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../modules/auth/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center text-center p-10 bg-slate-50 dark:bg-slate-950">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold">You do not have the required permissions to view this page.</p>
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
