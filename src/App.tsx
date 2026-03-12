import { RouterProvider } from 'react-router-dom';
import { Toaster } from './app/components/ui/sonner';
import { router } from './app/routes';
import { AuthProvider } from './app/contexts/AuthContext';
import { StoreProvider } from './app/contexts/StoreContext';
import { CartProvider } from './app/contexts/CartContext';
import { OrderProvider } from './app/contexts/OrderContext';
import ErrorBoundary from './app/components/ErrorBoundary';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <OrderProvider>
          <CartProvider>
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
            <Toaster />
          </CartProvider>
        </OrderProvider>
      </StoreProvider>
    </AuthProvider>
  );
}