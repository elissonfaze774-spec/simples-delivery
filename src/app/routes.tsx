import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Orders } from './pages/Orders';
import { Login } from './pages/Login';
import { AdminDashboardPage } from './pages/admin/Dashboard';
import { AdminOrders } from './pages/admin/Orders';
import { AdminProducts } from './pages/admin/Products';
import { AdminSettings } from './pages/admin/Settings';
import { AdminCoupons } from './pages/admin/Coupons';
import { AdminDrivers } from './pages/admin/DriversTemp';
import { SuperAdmin } from './pages/SuperAdmin';
import DriverLogin from './pages/driver/LoginTemp';
import DriverDashboard from './pages/driver/Dashboardtemp';
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
    path: '/driver/login',
    element: <DriverLogin />,
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
        <AdminDashboardPage />
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
    path: '/admin/drivers',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDrivers />
      </ProtectedRoute>
    ),
  },

  {
    path: '/driver',
    element: <Navigate to="/driver/dashboard" replace />,
  },
  {
    path: '/driver/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['delivery-driver']}>
        <DriverDashboard />
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