import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

type AllowedRole = User['role'] | 'delivery-driver';

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
    const isDriverRoute = location.pathname.startsWith('/driver');
    return (
      <Navigate
        to={isDriverRoute ? '/driver/login' : '/login'}
        replace
        state={{ from: location }}
      />
    );
  }

  if (!allowedRoles.includes(user.role as AllowedRole)) {
    if (user.role === 'super-admin') {
      return <Navigate to="/super-admin" replace />;
    }

    if (user.role === 'delivery-driver') {
      return <Navigate to="/driver/dashboard" replace />;
    }

    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}