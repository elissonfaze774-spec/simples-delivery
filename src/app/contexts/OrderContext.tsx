import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { canCreateOrderThisMonth } from '../lib/planLimits';
import { useStore } from './StoreContext';
import type { CartItem } from '../types';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export type OrderItem = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
  storeId?: string;
  categoryId?: string;
};

export type Order = {
  id: string;
  code: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerReference?: string;
  customerNotes?: string;
  paymentMethod?: string;
  deliveryMethod?: 'delivery' | 'pickup';
  deliveryDistanceKm?: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

type CreateOrderInput = {
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerReference?: string;
  customerNotes?: string;
  paymentMethod?: string;
  deliveryMethod?: 'delivery' | 'pickup';
  deliveryDistanceKm?: number;
  items: any[];
  subtotal: number;
  discount?: number;
  deliveryFee?: number;
  total: number;
};

type OrderContextType = {
  orders: Order[];
  isLoaded: boolean;
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  getStoreOrders: (storeId: string) => Order[];
  getOrderById: (id: string) => Order | undefined;
  getOrderByCode: (code: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const VALID_ORDER_STATUS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'delivering',
  'completed',
  'cancelled',
];

function isValidOrderStatus(value: any): value is OrderStatus {
  return VALID_ORDER_STATUS.includes(String(value).toLowerCase() as OrderStatus);
}

function normalizeOrderItems(items: any): OrderItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item: any, index: number) => {
      const fromProduct = item?.product && typeof item.product === 'object';

      const idValue =
        item?.id ??
        item?.productId ??
        item?.product_id ??
        item?.product?.id ??
        `item-${index}`;

      const productIdValue =
        item?.productId ??
        item?.product_id ??
        item?.product?.id ??
        undefined;

      const normalized: OrderItem = {
        id: String(idValue),
        productId: productIdValue ? String(productIdValue) : undefined,
        name: String(item?.name ?? item?.product?.name ?? 'Produto'),
        price: Number(item?.price ?? item?.product?.price ?? 0),
        quantity: Math.max(1, Number(item?.quantity ?? 1)),
        image: item?.image ?? item?.product?.image ?? undefined,
        notes: item?.notes ? String(item.notes) : undefined,
        storeId: item?.storeId
          ? String(item.storeId)
          : fromProduct && item?.product?.storeId
          ? String(item.product.storeId)
          : undefined,
        categoryId: item?.categoryId
          ? String(item.categoryId)
          : fromProduct && item?.product?.categoryId
          ? String(item.product.categoryId)
          : undefined,
      };

      return normalized;
    })
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        item.id.trim() !== '' &&
        item.quantity > 0
    );
}

function generateOrderCode() {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `#${code}`;
}

function safeString(value: any) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mapStorePlanToLimitPlan(plan?: string | null): 'simples' | 'pro' | 'premium' {
  const normalized = String(plan || '').trim().toLowerCase();

  if (normalized === 'premium') return 'premium';
  if (normalized === 'pro') return 'pro';
  return 'simples';
}

function getHumanPlanName(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (normalized === 'premium') return 'Premium';
  if (normalized === 'pro') return 'Pro';
  return 'Simples';
}

function getOrdersCountThisMonth(
  storeId: string,
  orders: Array<{ storeId: string; createdAt: string }>
) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return orders.filter((order) => {
    if (String(order.storeId) !== String(storeId)) return false;

    const createdAt = new Date(order.createdAt);

    return (
      createdAt.getMonth() === currentMonth &&
      createdAt.getFullYear() === currentYear
    );
  }).length;
}

function mapDbOrder(row: any): Order {
  const rawStatus = safeString(row?.status).toLowerCase();
  const status: OrderStatus = isValidOrderStatus(rawStatus) ? rawStatus : 'pending';

  const rawDeliveryMethod = safeString(
    row?.delivery_method ?? row?.deliveryMethod
  ).toLowerCase();

  const deliveryMethod: 'delivery' | 'pickup' =
    rawDeliveryMethod === 'pickup' ? 'pickup' : 'delivery';

  return {
    id: safeString(row?.id),
    code: safeString(row?.code),
    storeId: safeString(row?.store_id ?? row?.storeId),
    customerName: safeString(row?.customer_name ?? row?.customerName),
    customerPhone: safeString(row?.customer_phone ?? row?.customerPhone),
    customerAddress: safeString(row?.customer_address ?? row?.customerAddress) || undefined,
    customerReference:
      safeString(row?.customer_reference ?? row?.customerReference) || undefined,
    customerNotes: safeString(row?.customer_notes ?? row?.customerNotes) || undefined,
    paymentMethod: safeString(row?.payment_method ?? row?.paymentMethod) || undefined,
    deliveryMethod,
    deliveryDistanceKm: safeNumber(
      row?.delivery_distance_km ?? row?.deliveryDistanceKm
    ),
    items: normalizeOrderItems(row?.items),
    subtotal: safeNumber(row?.subtotal),
    discount: safeNumber(row?.discount),
    deliveryFee: safeNumber(row?.delivery_fee ?? row?.deliveryFee),
    total: safeNumber(row?.total),
    status,
    createdAt: safeString(row?.created_at ?? row?.createdAt) || new Date().toISOString(),
    updatedAt: safeString(row?.updated_at ?? row?.updatedAt) || new Date().toISOString(),
  };
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMounted = useRef(true);
  const refreshInFlight = useRef(false);
  const { stores } = useStore();

  const refreshOrders = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pedidos:', error);
        return;
      }

      if (!isMounted.current) return;

      const mapped = Array.isArray(data) ? data.map(mapDbOrder) : [];
      setOrders(mapped);
    } catch (error) {
      console.error('Erro inesperado ao carregar pedidos:', error);
    } finally {
      if (isMounted.current) {
        setIsLoaded(true);
      }
      refreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    void refreshOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async () => {
          await refreshOrders();
        }
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      void supabase.removeChannel(channel);
    };
  }, [refreshOrders]);

  const createOrder = useCallback(
    async (input: CreateOrderInput) => {
      const storeId = String(input.storeId || '');
      const store = stores.find((item) => String(item.id) === storeId);

      if (!store) {
        throw new Error('Loja não encontrada para criar o pedido.');
      }

      const currentOrdersThisMonth = getOrdersCountThisMonth(storeId, orders);

      const planCheck = canCreateOrderThisMonth(
        mapStorePlanToLimitPlan((store as any).plan),
        currentOrdersThisMonth
      );

      if (!planCheck.allowed) {
        const currentPlanName = getHumanPlanName((store as any).plan);
        const upgradeText =
          currentPlanName === 'Simples'
            ? 'Faça upgrade para Pro ou Premium para continuar recebendo pedidos.'
            : currentPlanName === 'Pro'
            ? 'Faça upgrade para Premium para liberar pedidos ilimitados.'
            : 'Seu plano atual atingiu o limite.';

        throw new Error(
          `${planCheck.reason || 'Limite de pedidos do plano atingido.'} ${upgradeText}`
        );
      }

      const code = generateOrderCode();
      const normalizedItems = normalizeOrderItems(input.items);
      const now = new Date().toISOString();

      const payload = {
        code,
        store_id: storeId,
        customer_name: String(input.customerName || ''),
        customer_phone: String(input.customerPhone || ''),
        customer_address: input.customerAddress?.trim() ? input.customerAddress : null,
        customer_reference: input.customerReference?.trim() ? input.customerReference : null,
        customer_notes: input.customerNotes?.trim() ? input.customerNotes : null,
        payment_method: input.paymentMethod?.trim() ? input.paymentMethod : null,
        delivery_method: input.deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
        delivery_distance_km: safeNumber(input.deliveryDistanceKm),
        items: normalizedItems,
        subtotal: safeNumber(input.subtotal),
        discount: safeNumber(input.discount),
        delivery_fee: safeNumber(input.deliveryFee),
        total: safeNumber(input.total),
        status: 'pending' as OrderStatus,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar pedido:', error);
        throw error;
      }

      const created = mapDbOrder(data);

      setOrders((prev) => {
        const exists = prev.some((order) => order.id === created.id);
        if (exists) return prev;
        return [created, ...prev];
      });

      try {
        localStorage.setItem('last_order_id', created.id);
        localStorage.setItem('last_order_code', created.code);
      } catch {
        //
      }

      return created;
    },
    [orders, stores]
  );

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    if (!isValidOrderStatus(status)) {
      throw new Error('Status do pedido inválido.');
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: now,
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      throw error;
    }

    setOrders((prev) =>
      prev.map((order) =>
        String(order.id) === String(id)
          ? { ...order, status, updatedAt: now }
          : order
      )
    );
  }, []);

  const getStoreOrders = useCallback(
    (storeId: string) =>
      orders.filter((order) => String(order.storeId) === String(storeId)),
    [orders]
  );

  const getOrderById = useCallback(
    (id: string) => orders.find((order) => String(order.id) === String(id)),
    [orders]
  );

  const getOrderByCode = useCallback(
    (code: string) => {
      const normalizedCode = String(code || '').trim().toLowerCase();

      return orders.find(
        (order) => String(order.code || '').trim().toLowerCase() === normalizedCode
      );
    },
    [orders]
  );

  const value = useMemo(
    () => ({
      orders,
      isLoaded,
      createOrder,
      getStoreOrders,
      getOrderById,
      getOrderByCode,
      refreshOrders,
      updateOrderStatus,
    }),
    [
      orders,
      isLoaded,
      createOrder,
      getStoreOrders,
      getOrderById,
      getOrderByCode,
      refreshOrders,
      updateOrderStatus,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrders deve ser usado dentro de OrderProvider');
  }

  return context;
}