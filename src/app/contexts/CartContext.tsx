import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CartItem, Product } from '../types';

type ProductExtra = {
  name: string;
  price: number;
};

type CartItemWithExtras = CartItem & {
  lineId?: string;
  selectedExtras?: ProductExtra[];
  unitPrice?: number;
};

interface CartContextType {
  items: CartItemWithExtras[];
  addToCart: (product: Product, selectedExtras?: ProductExtra[]) => void;
  removeFromCart: (productId: string, lineId?: string) => void;
  updateQuantity: (productId: string, quantity: number, lineId?: string) => void;
  clearCart: () => void;
  setCartItems: (items: CartItemWithExtras[]) => void;
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

function normalizeExtra(extra: any): ProductExtra | null {
  if (!extra || typeof extra !== 'object') return null;

  const name = String(extra.name || '').trim();
  const price = Number(extra.price) || 0;

  if (!name) return null;

  return { name, price };
}

function sanitizeExtras(extras: any): ProductExtra[] {
  if (!Array.isArray(extras)) return [];
  return extras.map(normalizeExtra).filter((item): item is ProductExtra => item !== null);
}

function buildLineId(productId: string, extras: ProductExtra[] = []) {
  const extrasKey = extras
    .map((extra) => `${extra.name}:${Number(extra.price) || 0}`)
    .sort()
    .join('|');

  return `${productId}__${extrasKey}`;
}

/**
 * Aceita tanto:
 * - { product: {...}, quantity: 2 }
 * - { product: {...}, quantity: 2, selectedExtras: [...] }
 * - { id, name, price, image, quantity }
 * - itens vindos de pedido antigo/repetição de pedido
 */
function normalizeCartItem(item: any): CartItemWithExtras | null {
  if (!item || typeof item !== 'object') return null;

  if (item.product && isValidProduct(item.product)) {
    const selectedExtras = sanitizeExtras(item.selectedExtras ?? item.extras);
    const basePrice = Number(item.product.price) || 0;
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
    const unitPrice = basePrice + extrasTotal;

    return {
      product: {
        ...item.product,
        price: basePrice,
      } as Product,
      quantity: Math.max(1, Number(item.quantity) || 1),
      selectedExtras,
      unitPrice,
      lineId: String(item.lineId || buildLineId(String(item.product.id), selectedExtras)),
    };
  }

  if (typeof item.id === 'string' && item.id.trim() !== '') {
    const selectedExtras = sanitizeExtras(item.selectedExtras ?? item.extras);
    const basePrice = Number(item.price) || 0;
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
    const unitPrice = basePrice + extrasTotal;

    return {
      product: {
        id: item.id,
        name: String(item.name || 'Produto'),
        description: String(item.description || ''),
        price: basePrice,
        image: item.image || '',
        categoryId: String(item.categoryId || ''),
        storeId: String(item.storeId || ''),
        available: item.available ?? item.active ?? true,
        extras: Array.isArray(item.extrasCatalog ?? item.productExtras) ? item.extrasCatalog ?? item.productExtras : [],
      } as Product,
      quantity: Math.max(1, Number(item.quantity) || 1),
      selectedExtras,
      unitPrice,
      lineId: String(item.lineId || buildLineId(String(item.id), selectedExtras)),
    };
  }

  return null;
}

function sanitizeCartItems(items: any): CartItemWithExtras[] {
  if (!Array.isArray(items)) return [];

  return items
    .map(normalizeCartItem)
    .filter((item): item is CartItemWithExtras => item !== null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemWithExtras[]>([]);

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

  const addToCart = (product: Product, selectedExtras: ProductExtra[] = []) => {
    if (!isValidProduct(product)) return;

    const safeExtras = sanitizeExtras(selectedExtras);
    const lineId = buildLineId(product.id, safeExtras);

    setItems((prev) => {
      const existing = prev.find((item) => item.lineId === lineId);

      if (existing) {
        return prev.map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const basePrice = Number(product.price) || 0;
      const extrasTotal = safeExtras.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);

      return [
        ...prev,
        {
          product: {
            ...product,
            price: basePrice,
          } as Product,
          quantity: 1,
          selectedExtras: safeExtras,
          unitPrice: basePrice + extrasTotal,
          lineId,
        },
      ];
    });
  };

  const removeFromCart = (productId: string, lineId?: string) => {
    if (!productId && !lineId) return;

    setItems((prev) =>
      prev.filter((item) =>
        lineId ? item.lineId !== lineId : item.product.id !== productId
      )
    );
  };

  const updateQuantity = (productId: string, quantity: number, lineId?: string) => {
    if (!productId && !lineId) return;

    if (quantity <= 0) {
      removeFromCart(productId, lineId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        const isTarget = lineId ? item.lineId === lineId : item.product.id === productId;

        return isTarget
          ? { ...item, quantity: Math.max(1, Number(quantity) || 1) }
          : item;
      })
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

  const setCartItems = (newItems: CartItemWithExtras[]) => {
    const sanitized = sanitizeCartItems(newItems);
    setItems(sanitized);
  };

  const replaceCartFromOrder = (orderItems: any[]) => {
    const sanitized = sanitizeCartItems(orderItems);
    setItems(sanitized);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const basePrice = Number(item.product?.price) || 0;
      const extrasTotal = Array.isArray(item.selectedExtras)
        ? item.selectedExtras.reduce((acc, extra) => acc + (Number(extra.price) || 0), 0)
        : 0;
      const unitPrice = Number(item.unitPrice) || basePrice + extrasTotal;
      const quantity = Number(item.quantity) || 0;

      return sum + unitPrice * quantity;
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