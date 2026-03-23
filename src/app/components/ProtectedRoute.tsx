import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

type AllowedRole = User['role'];

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: AllowedRole[];
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        <div className="text-sm font-medium">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'super-admin') {
      return <Navigate to="/super-admin" replace />;
    }

    if (user.role === 'delivery-driver') {
      return <Navigate to="/driver" replace />;
    }

    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}