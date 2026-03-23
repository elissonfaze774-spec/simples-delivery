import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  Store,
  Product,
  Category,
  Coupon,
  Plan,
  DeliveryDriver,
} from '../types';

interface StoreContextType {
  stores: Store[];
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  plans: Plan[];
  deliveryDrivers: DeliveryDriver[];
  isLoaded: boolean;
  getStore: (id: string) => Store | undefined;
  getStoreByAdminEmail: (email: string) => Store | undefined;
  getStoreProducts: (storeId: string) => Product[];
  getStoreCategories: (storeId: string) => Category[];
  getProductsByCategory: (storeId: string, categoryId: string) => Product[];
  getStoreCoupons: (storeId: string) => Coupon[];
  getCouponByCode: (storeId: string, code: string) => Coupon | undefined;
  getStoreDeliveryDrivers: (storeId: string) => DeliveryDriver[];
  getDeliveryDriver: (id: string) => DeliveryDriver | undefined;
  updateStore: (id: string, data: Partial<Store>) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCoupon: (coupon: Coupon) => Promise<void>;
  updateCoupon: (id: string, data: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  addDeliveryDriver: (
    driver: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<DeliveryDriver>;
  updateDeliveryDriver: (
    id: string,
    data: Partial<DeliveryDriver>
  ) => Promise<void>;
  deleteDeliveryDriver: (id: string) => Promise<void>;
  toggleDeliveryDriverActive: (id: string) => Promise<void>;
  toggleStoreActive: (id: string) => Promise<void>;
  addStore: (name: string, email: string) => Promise<Store>;
  suspendStore: (id: string) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  updatePlan: (
    planId: 'iniciante' | 'pro' | 'premium',
    data: Partial<Plan>
  ) => Promise<void>;
  reloadStoreData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORE_CACHE_KEY = 'saas:stores';
const PRODUCTS_CACHE_KEY = 'saas:products';
const CATEGORIES_CACHE_KEY = 'saas:categories';
const COUPONS_CACHE_KEY = 'saas:coupons';
const PLANS_CACHE_KEY = 'saas:plans';
const DELIVERY_DRIVERS_CACHE_KEY = 'saas:delivery-drivers';

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'iniciante',
    name: 'Simples',
    price: 59.9,
    features: [
      'Até 30 produtos',
      'Até 500 pedidos por mês',
      'Cardápio digital',
      'Carrinho e checkout',
      'Pedidos no WhatsApp',
      'Cupons básicos',
      'Painel administrativo',
      'Sem módulo de entregadores',
    ],
    maxProducts: 30,
    maxOrders: 500,
    maxDeliveryDrivers: 0,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99.9,
    features: [
      'Até 100 produtos',
      'Até 1000 pedidos por mês',
      'Tudo do plano Simples',
      'Relatórios básicos',
      'Melhor gestão de cupons',
      'Mais organização no painel',
      'Suporte prioritário',
      'Até 5 entregadores',
    ],
    maxProducts: 100,
    maxOrders: 1000,
    maxDeliveryDrivers: 5,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 149.9,
    features: [
      'Produtos ilimitados',
      'Pedidos ilimitados',
      'Tudo do plano Pro',
      'Maior liberdade de crescimento',
      'Suporte prioritário máximo',
      'Recursos premium liberados',
      'Entregadores ilimitados',
    ],
    maxProducts: -1,
    maxOrders: -1,
    maxDeliveryDrivers: -1,
  },
];

function normalizeEmail(email?: string | null) {
  return String(email ?? '').trim().toLowerCase();
}

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildStoreUrl(slug?: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://meurestaurante.com';

  return `${origin}/loja/${encodeURIComponent(slug || '')}`;
}

function normalizeThemeColor(value: unknown) {
  const color = String(value ?? '').trim();
  return /^#([0-9a-fA-F]{6})$/.test(color) ? color : '#EA1D2C';
}

function getCache<T>(key: string): T[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCache<T>(key: string, value: T[]) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    //
  }
}

function normalizeStore(store: any): Store {
  const slug = String(store?.slug || slugify(store?.name || '') || store?.id || '');
  const rawPlan = String(store?.plan ?? store?.plan_id ?? 'iniciante').toLowerCase();

  const plan: 'iniciante' | 'pro' | 'premium' =
    rawPlan === 'pro' || rawPlan === 'premium' || rawPlan === 'iniciante'
      ? rawPlan
      : 'iniciante';

  return {
    id: String(store?.id ?? ''),
    name: String(store?.name ?? ''),
    slug,
    logo: String(store?.logo ?? ''),
    banner: String(store?.banner ?? store?.banner_url ?? ''),
    whatsapp: String(store?.whatsapp ?? ''),
    active:
      typeof store?.active === 'boolean'
        ? store.active
        : typeof store?.is_active === 'boolean'
          ? store.is_active
          : true,
    adminEmail: normalizeEmail(store?.adminEmail ?? store?.admin_email),
    logoUrl: String(store?.logo_url ?? store?.logoUrl ?? ''),
    storeUrl: String(store?.store_url ?? store?.storeUrl ?? buildStoreUrl(slug)),
    plan,
    suspended:
      typeof store?.suspended === 'boolean'
        ? store.suspended
        : typeof store?.isSuspended === 'boolean'
          ? store.isSuspended
          : false,
    deliveryFee: Number(store?.deliveryFee ?? store?.delivery_fee ?? 0),
    openingTime: String(store?.opening_time ?? store?.openingTime ?? ''),
    closingTime: String(store?.closing_time ?? store?.closingTime ?? ''),
    themeColor: normalizeThemeColor(store?.theme_color ?? store?.themeColor),

    address: store?.address,
    coordinates: store?.coordinates,
    deliveryRadiusKm: Number(store?.delivery_radius_km ?? store?.deliveryRadiusKm ?? 0),
    deliveryFeePerKm: Number(store?.delivery_fee_per_km ?? store?.deliveryFeePerKm ?? 0),
    minimumOrderValue: Number(store?.minimum_order_value ?? store?.minimumOrderValue ?? 0),
  };
}

function normalizeProduct(product: any): Product {
  return {
    id: String(product?.id ?? ''),
    name: String(product?.name ?? ''),
    price: Number(product?.price ?? 0),
    image: String(product?.image ?? ''),
    description: String(product?.description ?? ''),
    extras: Array.isArray(product?.extras) ? product.extras : [],
    storeId: String(product?.storeId ?? product?.store_id ?? ''),
    categoryId:
      product?.categoryId ?? product?.category_id
        ? String(product?.categoryId ?? product?.category_id)
        : undefined,
    available:
      typeof product?.available === 'boolean'
        ? product.available
        : typeof product?.is_available === 'boolean'
          ? product.is_available
          : true,
  };
}

function normalizeCategory(category: any): Category {
  return {
    id: String(category?.id ?? ''),
    name: String(category?.name ?? ''),
    storeId: String(category?.storeId ?? category?.store_id ?? ''),
    order: Number(category?.order ?? category?.sort_order ?? 0),
  };
}

function normalizeCoupon(coupon: any): Coupon {
  return {
    id: String(coupon?.id ?? ''),
    code: String(coupon?.code ?? ''),
    discount: Number(coupon?.discount ?? 0),
    active:
      typeof coupon?.active === 'boolean'
        ? coupon.active
        : typeof coupon?.is_active === 'boolean'
          ? coupon.is_active
          : true,
    storeId: String(coupon?.storeId ?? coupon?.store_id ?? ''),
  };
}

function normalizePlan(plan: any): Plan {
  const rawId = String(plan?.code ?? plan?.id ?? 'iniciante').toLowerCase();

  const id: 'iniciante' | 'pro' | 'premium' =
    rawId === 'iniciante' || rawId === 'pro' || rawId === 'premium'
      ? rawId
      : 'iniciante';

  return {
    id,
    name:
      String(plan?.name ?? '').trim() ||
      (id === 'iniciante' ? 'Simples' : id === 'pro' ? 'Pro' : 'Premium'),
    price: Number(plan?.price ?? 0),
    features: Array.isArray(plan?.features) ? plan.features.map(String) : [],
    maxProducts: Number(plan?.maxProducts ?? plan?.max_products ?? 0),
    maxOrders: Number(plan?.maxOrders ?? plan?.max_orders ?? 0),
    maxDeliveryDrivers: Number(
      plan?.maxDeliveryDrivers ?? plan?.max_delivery_drivers ?? 0
    ),
  };
}

function normalizeDeliveryDriver(driver: any): DeliveryDriver {
  return {
    id: String(driver?.id ?? ''),
    storeId: String(driver?.storeId ?? driver?.store_id ?? ''),
    name: String(driver?.name ?? ''),
    email: normalizeEmail(driver?.email),
    phone: String(driver?.phone ?? ''),
    active:
      typeof driver?.active === 'boolean'
        ? driver.active
        : typeof driver?.is_active === 'boolean'
          ? driver.is_active
          : true,
    online:
      typeof driver?.online === 'boolean'
        ? driver.online
        : typeof driver?.is_online === 'boolean'
          ? driver.is_online
          : false,
    avatar: String(driver?.avatar ?? driver?.avatar_url ?? ''),
    vehicleType:
      driver?.vehicle_type === 'bike' ||
      driver?.vehicle_type === 'motorcycle' ||
      driver?.vehicle_type === 'car' ||
      driver?.vehicle_type === 'other'
        ? driver.vehicle_type
        : driver?.vehicleType === 'bike' ||
            driver?.vehicleType === 'motorcycle' ||
            driver?.vehicleType === 'car' ||
            driver?.vehicleType === 'other'
          ? driver.vehicleType
          : undefined,
    vehicleLabel: String(driver?.vehicle_label ?? driver?.vehicleLabel ?? ''),
    notes: String(driver?.notes ?? ''),
    createdAt: String(driver?.created_at ?? driver?.createdAt ?? new Date().toISOString()),
    updatedAt: String(driver?.updated_at ?? driver?.updatedAt ?? ''),
    lastActiveAt: String(driver?.last_active_at ?? driver?.lastActiveAt ?? ''),
  };
}

function mergePlansWithDefaults(list: Plan[]): Plan[] {
  const normalized = Array.isArray(list) ? list.map((item: any) => normalizePlan(item)) : [];

  return DEFAULT_PLANS.map((defaultPlan) => {
    const dbPlan = normalized.find((plan) => plan.id === defaultPlan.id);
    return dbPlan ? { ...defaultPlan, ...dbPlan } : defaultPlan;
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>(() =>
    getCache<Store>(STORE_CACHE_KEY).map(normalizeStore)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    getCache<Product>(PRODUCTS_CACHE_KEY).map(normalizeProduct)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    getCache<Category>(CATEGORIES_CACHE_KEY).map(normalizeCategory)
  );
  const [coupons, setCoupons] = useState<Coupon[]>(() =>
    getCache<Coupon>(COUPONS_CACHE_KEY).map(normalizeCoupon)
  );
  const [deliveryDrivers, setDeliveryDrivers] = useState<DeliveryDriver[]>(() =>
    getCache<DeliveryDriver>(DELIVERY_DRIVERS_CACHE_KEY).map(normalizeDeliveryDriver)
  );
  const [plans, setPlans] = useState<Plan[]>(() => {
    const cached = getCache<Plan>(PLANS_CACHE_KEY);
    return cached.length ? mergePlansWithDefaults(cached) : DEFAULT_PLANS;
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    const hasStores = getCache<Store>(STORE_CACHE_KEY).length > 0;
    const hasProducts = getCache<Product>(PRODUCTS_CACHE_KEY).length > 0;
    const hasCategories = getCache<Category>(CATEGORIES_CACHE_KEY).length > 0;
    const hasCoupons = getCache<Coupon>(COUPONS_CACHE_KEY).length > 0;
    const hasDrivers = getCache<DeliveryDriver>(DELIVERY_DRIVERS_CACHE_KEY).length > 0;
    return hasStores || hasProducts || hasCategories || hasCoupons || hasDrivers;
  });

  const reloadStoreData = useCallback(async () => {
    try {
      const [
        storesRes,
        productsRes,
        categoriesRes,
        couponsRes,
        plansRes,
        driversRes,
      ] = await Promise.all([
        supabase.from('stores').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('coupons').select('*').order('created_at', { ascending: true }),
        supabase.from('plans').select('*').order('created_at', { ascending: true }),
        supabase
          .from('delivery_drivers')
          .select('*')
          .order('created_at', { ascending: true }),
      ]);

      if (storesRes.error) throw storesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (couponsRes.error) throw couponsRes.error;

      const nextStores = (storesRes.data || []).map(normalizeStore);
      const nextProducts = (productsRes.data || []).map(normalizeProduct);
      const nextCategories = (categoriesRes.data || []).map(normalizeCategory);
      const nextCoupons = (couponsRes.data || []).map(normalizeCoupon);
      const nextPlans =
        !plansRes.error && plansRes.data
          ? mergePlansWithDefaults(plansRes.data as any)
          : DEFAULT_PLANS;
      const nextDrivers =
        !driversRes.error && driversRes.data
          ? (driversRes.data || []).map(normalizeDeliveryDriver)
          : [];

      if (driversRes.error) {
        console.error('Erro ao carregar entregadores:', driversRes.error);
      }

      setStores(nextStores);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setCoupons(nextCoupons);
      setPlans(nextPlans);
      setDeliveryDrivers(nextDrivers);

      setCache(STORE_CACHE_KEY, nextStores);
      setCache(PRODUCTS_CACHE_KEY, nextProducts);
      setCache(CATEGORIES_CACHE_KEY, nextCategories);
      setCache(COUPONS_CACHE_KEY, nextCoupons);
      setCache(PLANS_CACHE_KEY, nextPlans);
      setCache(DELIVERY_DRIVERS_CACHE_KEY, nextDrivers);
    } catch (error) {
      console.error('Erro ao carregar StoreContext:', error);
      setPlans((current) => (current.length ? current : DEFAULT_PLANS));
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reloadStoreData();
  }, [reloadStoreData]);

  const getStore = useCallback(
    (id: string) => stores.find((store) => String(store.id) === String(id)),
    [stores]
  );

  const getStoreByAdminEmail = useCallback(
    (email: string) => {
      const normalized = normalizeEmail(email);
      return stores.find((store) => normalizeEmail(store.adminEmail) === normalized);
    },
    [stores]
  );

  const getStoreProducts = useCallback(
    (storeId: string) =>
      products.filter((product) => String(product.storeId) === String(storeId)),
    [products]
  );

  const getStoreCategories = useCallback(
    (storeId: string) =>
      categories
        .filter((category) => String(category.storeId) === String(storeId))
        .sort((a, b) => Number(a.order) - Number(b.order)),
    [categories]
  );

  const getProductsByCategory = useCallback(
    (storeId: string, categoryId: string) =>
      products.filter(
        (product) =>
          String(product.storeId) === String(storeId) &&
          String(product.categoryId) === String(categoryId)
      ),
    [products]
  );

  const getStoreCoupons = useCallback(
    (storeId: string) =>
      coupons.filter((coupon) => String(coupon.storeId) === String(storeId)),
    [coupons]
  );

  const getCouponByCode = useCallback(
    (storeId: string, code: string) => {
      const normalizedCode = String(code || '').trim().toLowerCase();

      return coupons.find(
        (coupon) =>
          String(coupon.storeId) === String(storeId) &&
          String(coupon.code || '').trim().toLowerCase() === normalizedCode &&
          Boolean(coupon.active)
      );
    },
    [coupons]
  );

  const getStoreDeliveryDrivers = useCallback(
    (storeId: string) =>
      deliveryDrivers
        .filter((driver) => String(driver.storeId) === String(storeId))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR')),
    [deliveryDrivers]
  );

  const getDeliveryDriver = useCallback(
    (id: string) =>
      deliveryDrivers.find((driver) => String(driver.id) === String(id)),
    [deliveryDrivers]
  );

  const updateStore = useCallback(
    async (id: string, data: Partial<Store>) => {
      const payload: any = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.slug !== undefined) payload.slug = slugify(String(data.slug || ''));
      if (data.logo !== undefined) payload.logo = data.logo;
      if (data.banner !== undefined) {
        payload.banner = data.banner;
        payload.banner_url = data.banner;
      }
      if (data.whatsapp !== undefined) payload.whatsapp = data.whatsapp;
      if ((data as any).themeColor !== undefined) {
        payload.theme_color = normalizeThemeColor((data as any).themeColor);
      }

      if (data.active !== undefined) {
        payload.is_active = data.active;
        payload.active = data.active;
      }

      if (data.adminEmail !== undefined) payload.admin_email = normalizeEmail(data.adminEmail);
      if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl;
      if (data.storeUrl !== undefined) payload.store_url = data.storeUrl;
      if (data.plan !== undefined) payload.plan = data.plan;
      if ((data as any).suspended !== undefined) payload.suspended = (data as any).suspended;
      if (data.deliveryFee !== undefined) {
        payload.delivery_fee = Number(data.deliveryFee || 0);
        payload.deliveryFee = Number(data.deliveryFee || 0);
      }
      if ((data as any).openingTime !== undefined) {
        payload.opening_time = String((data as any).openingTime || '');
      }
      if ((data as any).closingTime !== undefined) {
        payload.closing_time = String((data as any).closingTime || '');
      }
      if ((data as any).deliveryRadiusKm !== undefined) {
        payload.delivery_radius_km = Number((data as any).deliveryRadiusKm || 0);
      }
      if ((data as any).deliveryFeePerKm !== undefined) {
        payload.delivery_fee_per_km = Number((data as any).deliveryFeePerKm || 0);
      }
      if ((data as any).minimumOrderValue !== undefined) {
        payload.minimum_order_value = Number((data as any).minimumOrderValue || 0);
      }

      const { error } = await supabase.from('stores').update(payload).eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const addProduct = useCallback(
    async (product: Product) => {
      const payload = {
        name: product.name,
        price: Number(product.price || 0),
        image: product.image || '',
        description: product.description || '',
        extras: product.extras || [],
        store_id: product.storeId,
        category_id: product.categoryId || null,
        is_available: product.available ?? true,
      };

      const { error } = await supabase.from('products').insert(payload);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const updateProduct = useCallback(
    async (id: string, data: Partial<Product>) => {
      const payload: any = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.price !== undefined) payload.price = Number(data.price || 0);
      if (data.image !== undefined) payload.image = data.image;
      if (data.description !== undefined) payload.description = data.description;
      if (data.extras !== undefined) payload.extras = data.extras;
      if (data.storeId !== undefined) payload.store_id = data.storeId;
      if (data.categoryId !== undefined) payload.category_id = data.categoryId || null;
      if (data.available !== undefined) payload.is_available = data.available;

      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const addCategory = useCallback(
    async (category: Category) => {
      const payload = {
        name: category.name,
        store_id: category.storeId,
        sort_order: Number(category.order || 0),
      };

      const { error } = await supabase.from('categories').insert(payload);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const updateCategory = useCallback(
    async (id: string, data: Partial<Category>) => {
      const payload: any = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.storeId !== undefined) payload.store_id = data.storeId;
      if (data.order !== undefined) payload.sort_order = Number(data.order || 0);

      const { error } = await supabase.from('categories').update(payload).eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const addCoupon = useCallback(
    async (coupon: Coupon) => {
      const payload = {
        code: coupon.code,
        discount: Number(coupon.discount || 0),
        is_active: coupon.active ?? true,
        store_id: coupon.storeId,
      };

      const { error } = await supabase.from('coupons').insert(payload);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const updateCoupon = useCallback(
    async (id: string, data: Partial<Coupon>) => {
      const payload: any = {};

      if (data.code !== undefined) payload.code = data.code;
      if (data.discount !== undefined) payload.discount = Number(data.discount || 0);
      if (data.active !== undefined) payload.is_active = data.active;
      if (data.storeId !== undefined) payload.store_id = data.storeId;

      const { error } = await supabase.from('coupons').update(payload).eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const deleteCoupon = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const addDeliveryDriver = useCallback(
    async (
      driver: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<DeliveryDriver> => {
      const payload = {
        store_id: driver.storeId,
        name: driver.name,
        email: normalizeEmail(driver.email),
        phone: driver.phone || '',
        active: driver.active ?? true,
        is_active: driver.active ?? true,
        online: driver.online ?? false,
        is_online: driver.online ?? false,
        avatar: driver.avatar || '',
        vehicle_type: driver.vehicleType || null,
        vehicle_label: driver.vehicleLabel || null,
        notes: driver.notes || null,
        last_active_at: driver.lastActiveAt || null,
      };

      const { data, error } = await supabase
        .from('delivery_drivers')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Não foi possível criar o entregador.');

      await reloadStoreData();
      return normalizeDeliveryDriver(data);
    },
    [reloadStoreData]
  );

  const updateDeliveryDriver = useCallback(
    async (id: string, data: Partial<DeliveryDriver>) => {
      const payload: any = {};

      if (data.storeId !== undefined) payload.store_id = data.storeId;
      if (data.name !== undefined) payload.name = data.name;
      if (data.email !== undefined) payload.email = normalizeEmail(data.email);
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.active !== undefined) {
        payload.active = data.active;
        payload.is_active = data.active;
      }
      if (data.online !== undefined) {
        payload.online = data.online;
        payload.is_online = data.online;
      }
      if (data.avatar !== undefined) payload.avatar = data.avatar;
      if (data.vehicleType !== undefined) payload.vehicle_type = data.vehicleType || null;
      if (data.vehicleLabel !== undefined) payload.vehicle_label = data.vehicleLabel || null;
      if (data.notes !== undefined) payload.notes = data.notes || null;
      if (data.lastActiveAt !== undefined) {
        payload.last_active_at = data.lastActiveAt || null;
      }
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('delivery_drivers')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const deleteDeliveryDriver = useCallback(
    async (id: string) => {
      const { error: ordersError } = await supabase
        .from('orders')
        .update({
          delivery_driver_id: null,
          delivery_driver_name: null,
          delivery_assigned_at: null,
          delivery_accepted_at: null,
          picked_up_at: null,
          out_for_delivery_at: null,
          delivered_at: null,
          delivery_failed_at: null,
          delivery_status: 'unassigned',
          delivery_notes: null,
          delivered_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('delivery_driver_id', id);

      if (ordersError) throw ordersError;

      const { error } = await supabase.from('delivery_drivers').delete().eq('id', id);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const toggleDeliveryDriverActive = useCallback(
    async (id: string) => {
      const current = deliveryDrivers.find((driver) => String(driver.id) === String(id));
      if (!current) throw new Error('Entregador não encontrado.');

      const nextActive = !current.active;

      const { error } = await supabase
        .from('delivery_drivers')
        .update({
          active: nextActive,
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await reloadStoreData();
    },
    [deliveryDrivers, reloadStoreData]
  );

  const toggleStoreActive = useCallback(
    async (id: string) => {
      const current = stores.find((store) => String(store.id) === String(id));
      if (!current) throw new Error('Loja não encontrada.');

      const nextActive = !current.active;

      const { error } = await supabase
        .from('stores')
        .update({
          is_active: nextActive,
          active: nextActive,
          suspended: false,
        })
        .eq('id', id);

      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData, stores]
  );

  const addStore = useCallback(
    async (name: string, email: string): Promise<Store> => {
      const slug = slugify(name);

      const payload = {
        name: String(name || '').trim(),
        slug,
        admin_email: normalizeEmail(email),
        is_active: true,
        active: true,
        suspended: false,
        logo: '',
        banner: '',
        banner_url: '',
        whatsapp: '',
        delivery_fee: 0,
        plan: 'iniciante',
        store_url: buildStoreUrl(slug),
        opening_time: '',
        closing_time: '',
        theme_color: '#EA1D2C',
        delivery_radius_km: 0,
        delivery_fee_per_km: 0,
        minimum_order_value: 0,
      };

      const { data, error } = await supabase.from('stores').insert(payload).select().single();
      if (error) throw error;
      if (!data) throw new Error('Não foi possível criar a loja.');

      await reloadStoreData();
      return normalizeStore(data);
    },
    [reloadStoreData]
  );

  const suspendStore = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('stores')
        .update({
          is_active: false,
          active: false,
          suspended: true,
        })
        .eq('id', id);

      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const deleteStore = useCallback(
    async (id: string) => {
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('store_id', id);

      if (ordersError) throw ordersError;

      const { error: driversError } = await supabase
        .from('delivery_drivers')
        .delete()
        .eq('store_id', id);

      if (driversError) throw driversError;

      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .eq('store_id', id);

      if (productsError) throw productsError;

      const { error: categoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('store_id', id);

      if (categoriesError) throw categoriesError;

      const { error: couponsError } = await supabase
        .from('coupons')
        .delete()
        .eq('store_id', id);

      if (couponsError) throw couponsError;

      const { error: adminsError } = await supabase
        .from('admins')
        .update({ store_id: null })
        .eq('store_id', id);

      if (adminsError) throw adminsError;

      const { error: storeError } = await supabase.from('stores').delete().eq('id', id);
      if (storeError) throw storeError;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const updatePlan = useCallback(
    async (planId: 'iniciante' | 'pro' | 'premium', data: Partial<Plan>) => {
      const payload: any = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.price !== undefined) payload.price = Number(data.price || 0);
      if (data.features !== undefined) payload.features = data.features;
      if (data.maxProducts !== undefined) payload.max_products = Number(data.maxProducts);
      if (data.maxOrders !== undefined) payload.max_orders = Number(data.maxOrders);
      if (data.maxDeliveryDrivers !== undefined) {
        payload.max_delivery_drivers = Number(data.maxDeliveryDrivers);
      }

      const { error } = await supabase.from('plans').update(payload).eq('code', planId);
      if (error) throw error;

      await reloadStoreData();
    },
    [reloadStoreData]
  );

  const value = useMemo(
    () => ({
      stores,
      products,
      categories,
      coupons,
      plans,
      deliveryDrivers,
      isLoaded,
      getStore,
      getStoreByAdminEmail,
      getStoreProducts,
      getStoreCategories,
      getProductsByCategory,
      getStoreCoupons,
      getCouponByCode,
      getStoreDeliveryDrivers,
      getDeliveryDriver,
      updateStore,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      addDeliveryDriver,
      updateDeliveryDriver,
      deleteDeliveryDriver,
      toggleDeliveryDriverActive,
      toggleStoreActive,
      addStore,
      suspendStore,
      deleteStore,
      updatePlan,
      reloadStoreData,
    }),
    [
      stores,
      products,
      categories,
      coupons,
      plans,
      deliveryDrivers,
      isLoaded,
      getStore,
      getStoreByAdminEmail,
      getStoreProducts,
      getStoreCategories,
      getProductsByCategory,
      getStoreCoupons,
      getCouponByCode,
      getStoreDeliveryDrivers,
      getDeliveryDriver,
      updateStore,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      addDeliveryDriver,
      updateDeliveryDriver,
      deleteDeliveryDriver,
      toggleDeliveryDriverActive,
      toggleStoreActive,
      addStore,
      suspendStore,
      deleteStore,
      updatePlan,
      reloadStoreData,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }

  return context;
}