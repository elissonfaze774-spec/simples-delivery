import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCartItems: (items: CartItem[]) => void;
  replaceCartFromOrder: (items: any[]) => void;
  total: number;
}

const CART_STORAGE_KEY = 'app_cart_items';

const CartContext = createContext<CartContextType | undefined>(undefined);

function isBrowser() {
  return typeof window !== 'undefined';
}

function isValidProduct(product: any): product is Product {
  return (
    product &&
    typeof product === 'object' &&
    typeof product.id === 'string' &&
    product.id.trim() !== ''
  );
}

/**
 * Aceita tanto:
 * - { product: {...}, quantity: 2 }
 * quanto:
 * - { id, name, price, image, quantity }
 * vindo de pedido antigo/repetição de pedido
 */
function normalizeCartItem(item: any): CartItem | null {
  if (!item || typeof item !== 'object') return null;

  if (item.product && isValidProduct(item.product)) {
    return {
      product: {
        ...item.product,
        price: Number(item.product.price) || 0,
      },
      quantity: Math.max(1, Number(item.quantity) || 1),
    };
  }

  if (typeof item.id === 'string' && item.id.trim() !== '') {
    return {
      product: {
        id: item.id,
        name: String(item.name || 'Produto'),
        description: String(item.description || ''),
        price: Number(item.price) || 0,
        image: item.image || '',
        categoryId: String(item.categoryId || ''),
        storeId: String(item.storeId || ''),
        active: item.active ?? true,
      } as Product,
      quantity: Math.max(1, Number(item.quantity) || 1),
    };
  }

  return null;
}

function sanitizeCartItems(items: any): CartItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map(normalizeCartItem)
    .filter((item): item is CartItem => item !== null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const sanitized = sanitizeCartItems(parsed);
      setItems(sanitized);
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
    }
  }, [items]);

  const addToCart = (product: Product) => {
    if (!isValidProduct(product)) return;

    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          product: {
            ...product,
            price: Number(product.price) || 0,
          },
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    if (!productId) return;
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!productId) return;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, Number(quantity) || 1) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);

    if (!isBrowser()) return;

    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
    }
  };

  const setCartItems = (newItems: CartItem[]) => {
    const sanitized = sanitizeCartItems(newItems);
    setItems(sanitized);
  };

  const replaceCartFromOrder = (orderItems: any[]) => {
    const sanitized = sanitizeCartItems(orderItems);
    setItems(sanitized);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.product?.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + price * quantity;
    }, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setCartItems,
        replaceCartFromOrder,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}