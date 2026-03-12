import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Orders } from './pages/Orders';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminOrders } from './pages/admin/Orders';
import { AdminProducts } from './pages/admin/Products';
import { AdminSettings } from './pages/admin/Settings';
import { AdminCoupons } from './pages/admin/Coupons';
import { SuperAdmin } from './pages/SuperAdmin';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/loja',
    element: <Home />,
  },
  {
    path: '/loja/:slug',
    element: <Home />,
  },
  {
    path: '/cart',
    element: <Cart />,
  },
  {
    path: '/orders',
    element: <Orders />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/orders',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminOrders />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/products',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminProducts />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminSettings />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/coupons',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminCoupons />
      </ProtectedRoute>
    ),
  },
  {
    path: '/super-admin',
    element: (
      <ProtectedRoute allowedRoles={['super-admin']}>
        <SuperAdmin />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);