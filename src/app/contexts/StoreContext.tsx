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
import { Store, Product, Category, Coupon, Plan } from '../types';

interface StoreContextType {
  stores: Store[];
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  plans: Plan[];
  isLoaded: boolean;
  getStore: (id: string) => Store | undefined;
  getStoreByAdminEmail: (email: string) => Store | undefined;
  getStoreProducts: (storeId: string) => Product[];
  getStoreCategories: (storeId: string) => Category[];
  getProductsByCategory: (storeId: string, categoryId: string) => Product[];
  getStoreCoupons: (storeId: string) => Coupon[];
  getCouponByCode: (storeId: string, code: string) => Coupon | undefined;
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
  toggleStoreActive: (id: string) => Promise<void>;
  addStore: (name: string, email: string) => Promise<Store>;
  suspendStore: (id: string) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  updatePlan: (planId: 'iniciante' | 'pro' | 'premium', data: Partial<Plan>) => Promise<void>;
  reloadStoreData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORE_CACHE_KEY = 'saas:stores';
const PRODUCTS_CACHE_KEY = 'saas:products';
const CATEGORIES_CACHE_KEY = 'saas:categories';
const COUPONS_CACHE_KEY = 'saas:coupons';
const PLANS_CACHE_KEY = 'saas:plans';

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
    ],
    maxProducts: 30,
    maxOrders: 500,
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
    ],
    maxProducts: 100,
    maxOrders: 1000,
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
    ],
    maxProducts: -1,
    maxOrders: -1,
  },
];

async function withTimeout<T>(fn: () => Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo esgotado na requisição')), ms);

    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeEmail(email?: string | null) {
  return String(email ?? '').trim().toLowerCase();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getLocalStorageItem(key: string) {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLocalStorageItem(key: string, value: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    //
  }
}

function removeLocalStorageItem(key: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    //
  }
}

function getCachedData<T>(key: string): T[] | null {
  try {
    const raw = getLocalStorageItem(key);
    return raw ? (JSON.parse(raw) as T[]) : null;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, list: T[] | null) {
  try {
    if (!list) {
      removeLocalStorageItem(key);
      return;
    }
    setLocalStorageItem(key, JSON.stringify(list));
  } catch {
    //
  }
}

function buildStoreUrl(slug?: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://meurestaurante.com';

  return `${origin}/loja/${encodeURIComponent(slug || '')}`;
}

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeStore(store: any): Store {
  const slug = String(store?.slug || slugify(store?.name || '') || store?.id || '');

  const suspended =
    typeof store?.suspended === 'boolean'
      ? store.suspended
      : typeof store?.isSuspended === 'boolean'
      ? store.isSuspended
      : false;

  const activeFromDb =
    typeof store?.active === 'boolean'
      ? store.active
      : typeof store?.is_active === 'boolean'
      ? store.is_active
      : typeof store?.isActive === 'boolean'
      ? store.isActive
      : true;

  const active = suspended ? false : activeFromDb;

  const adminEmail = normalizeEmail(store?.adminEmail ?? store?.admin_email);

  const logoUrl = store?.logoUrl ?? store?.logo_url ?? store?.logo ?? '';
  const banner = store?.banner ?? store?.banner_url ?? '';
  const storeUrl = store?.storeUrl ?? store?.store_url ?? buildStoreUrl(slug);

  const rawPlan = String(store?.plan ?? store?.plan_id ?? 'iniciante').toLowerCase();
  const plan: 'iniciante' | 'pro' | 'premium' =
    rawPlan === 'pro' || rawPlan === 'premium' || rawPlan === 'iniciante'
      ? rawPlan
      : 'iniciante';

  return {
    id: String(store?.id ?? ''),
    name: String(store?.name ?? ''),
    slug,
    logo: String(store?.logo ?? logoUrl ?? ''),
    banner: String(banner ?? ''),
    whatsapp: String(store?.whatsapp ?? ''),
    active,
    adminEmail,
    logoUrl: String(logoUrl || ''),
    storeUrl: String(storeUrl || ''),
    plan,
    suspended,
  };
}

function normalizeProduct(product: any): Product {
  return {
    id: String(product?.id ?? ''),
    name: String(product?.name ?? ''),
    price: Number(product?.price ?? 0),
    image: String(product?.image ?? ''),
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
    rawId === 'premium' || rawId === 'pro' || rawId === 'iniciante'
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
  };
}

function removeId<T extends Record<string, any>>(payload: T): T {
  const copy = { ...payload };
  delete copy.id;
  return copy;
}

function normalizeDbPayload<T extends Record<string, any>>(payload: T): Record<string, any> {
  const copy: Record<string, any> = { ...payload };

  if (copy.storeId !== undefined && copy.store_id === undefined) {
    copy.store_id = copy.storeId;
  }

  if (copy.categoryId !== undefined && copy.category_id === undefined) {
    copy.category_id = copy.categoryId;
  }

  if (copy.adminEmail !== undefined && copy.admin_email === undefined) {
    copy.admin_email = normalizeEmail(copy.adminEmail);
  }

  if (copy.active !== undefined && copy.is_active === undefined) {
    copy.is_active = copy.active;
  }

  if (copy.logoUrl !== undefined && copy.logo_url === undefined) {
    copy.logo_url = copy.logoUrl;
  }

  if (copy.storeUrl !== undefined && copy.store_url === undefined) {
    copy.store_url = copy.storeUrl;
  }

  if (copy.maxProducts !== undefined && copy.max_products === undefined) {
    copy.max_products = copy.maxProducts;
  }

  if (copy.maxOrders !== undefined && copy.max_orders === undefined) {
    copy.max_orders = copy.maxOrders;
  }

  if (copy.order !== undefined && copy.sort_order === undefined) {
    copy.sort_order = copy.order;
  }

  if (copy.available !== undefined && copy.is_available === undefined) {
    copy.is_available = copy.available;
  }

  if (copy.slug !== undefined) {
    copy.slug = slugify(String(copy.slug || ''));
  }

  if (copy.suspended !== undefined) {
    copy.suspended = Boolean(copy.suspended);
    if (copy.is_active === undefined) {
      copy.is_active = !copy.suspended;
    }
  }

  delete copy.storeId;
  delete copy.categoryId;
  delete copy.adminEmail;
  delete copy.active;
  delete copy.logoUrl;
  delete copy.storeUrl;
  delete copy.maxProducts;
  delete copy.maxOrders;
  delete copy.available;
  delete copy.order;

  return copy;
}

function sanitizePayload(payload: any) {
  if (!payload || typeof payload !== 'object') return payload;

  const copy = { ...payload };

  Object.keys(copy).forEach((key) => {
    if (copy[key] === undefined) {
      delete copy[key];
    }
  });

  if (
    typeof copy.image === 'string' &&
    copy.image.startsWith('data:') &&
    copy.image.length > 2000
  ) {
    delete copy.image;
  }

  return copy;
}

function extractMissingColumnMessage(err: any): string | null {
  try {
    const msg = String(err?.message || err?.details || err?.error_description || err || '');

    let m = msg.match(/column\s+"?(\w+)"?\s+does not exist/i);
    if (m?.[1]) return m[1];

    m = msg.match(/Could not find the '?"?(\w+)'?"? column/i);
    if (m?.[1]) return m[1];

    m = msg.match(/'?(\w+)'? column/i);
    if (m?.[1] && /does not exist|not found/i.test(msg)) return m[1];

    return null;
  } catch {
    return null;
  }
}

async function safeInsert(table: string, payload: any) {
  try {
    const cleaned = sanitizePayload(payload);
    const res = await withTimeout(
      async () => await supabase.from(table).insert(cleaned).select('*'),
      20000
    );

    if ((res as any).error) throw (res as any).error;
    return (res as any).data;
  } catch (err: any) {
    const col = extractMissingColumnMessage(err);

    if (col && payload && Object.prototype.hasOwnProperty.call(payload, col)) {
      const copy = { ...payload };
      delete copy[col];

      const res2 = await withTimeout(
        async () => await supabase.from(table).insert(sanitizePayload(copy)).select('*'),
        20000
      );

      if ((res2 as any).error) throw (res2 as any).error;
      return (res2 as any).data;
    }

    throw err;
  }
}

async function safeUpdate(table: string, idField: string, idValue: any, payload: any) {
  try {
    const cleaned = sanitizePayload(payload);
    const res = await withTimeout(
      async () => await supabase.from(table).update(cleaned).eq(idField, idValue).select('*'),
      20000
    );

    if ((res as any).error) throw (res as any).error;
    return (res as any).data;
  } catch (err: any) {
    const col = extractMissingColumnMessage(err);

    if (col && payload && Object.prototype.hasOwnProperty.call(payload, col)) {
      const copy = { ...payload };
      delete copy[col];

      const res2 = await withTimeout(
        async () =>
          await supabase.from(table).update(sanitizePayload(copy)).eq(idField, idValue).select('*'),
        20000
      );

      if ((res2 as any).error) throw (res2 as any).error;
      return (res2 as any).data;
    }

    throw err;
  }
}

function mergePlansWithDefaults(list: Plan[]): Plan[] {
  const normalized = asArray<Plan>(list).map((item: any) => normalizePlan(item));

  return DEFAULT_PLANS.map((defaultPlan) => {
    const dbPlan = normalized.find((plan) => String(plan.id) === String(defaultPlan.id));
    return dbPlan ? { ...defaultPlan, ...dbPlan } : defaultPlan;
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMounted = useRef(true);

  const applyStores = useCallback((list: Store[]) => {
    const normalized = asArray<Store>(list).map((item: any) => normalizeStore(item));
    if (!isMounted.current) return;
    setStores(normalized);
    setCachedData(STORE_CACHE_KEY, normalized);
  }, []);

  const applyProducts = useCallback((list: Product[]) => {
    const normalized = asArray<Product>(list).map((item: any) => normalizeProduct(item));
    if (!isMounted.current) return;
    setProducts(normalized);
    setCachedData(PRODUCTS_CACHE_KEY, normalized);
  }, []);

  const applyCategories = useCallback((list: Category[]) => {
    const normalized = asArray<Category>(list).map((item: any) => normalizeCategory(item));
    if (!isMounted.current) return;
    setCategories(normalized);
    setCachedData(CATEGORIES_CACHE_KEY, normalized);
  }, []);

  const applyCoupons = useCallback((list: Coupon[]) => {
    const normalized = asArray<Coupon>(list).map((item: any) => normalizeCoupon(item));
    if (!isMounted.current) return;
    setCoupons(normalized);
    setCachedData(COUPONS_CACHE_KEY, normalized);
  }, []);

  const applyPlans = useCallback((list: Plan[]) => {
    const mergedPlans = mergePlansWithDefaults(list);
    if (!isMounted.current) return;
    setPlans(mergedPlans);
    setCachedData(PLANS_CACHE_KEY, mergedPlans);
  }, []);

  const reloadStoreData = useCallback(async () => {
    try {
      const storesRes = await withTimeout(
        async () => await supabase.from('stores').select('*').order('created_at', { ascending: true }),
        15000
      );

      if (storesRes.error) {
        throw storesRes.error;
      }

      applyStores(asArray<Store>(storesRes.data));

      const [categoriesRes, productsRes, couponsRes, plansRes] = await Promise.allSettled([
        withTimeout(
          async () => await supabase.from('categories').select('*').order('created_at', { ascending: true }),
          15000
        ),
        withTimeout(
          async () => await supabase.from('products').select('*').order('created_at', { ascending: true }),
          15000
        ),
        withTimeout(
          async () => await supabase.from('coupons').select('*').order('created_at', { ascending: true }),
          15000
        ),
        withTimeout(
          async () => await supabase.from('plans').select('*').order('created_at', { ascending: true }),
          15000
        ),
      ]);

      if (categoriesRes.status === 'fulfilled' && !categoriesRes.value.error) {
        applyCategories(asArray<Category>(categoriesRes.value.data));
      }

      if (productsRes.status === 'fulfilled' && !productsRes.value.error) {
        applyProducts(asArray<Product>(productsRes.value.data));
      }

      if (couponsRes.status === 'fulfilled' && !couponsRes.value.error) {
        applyCoupons(asArray<Coupon>(couponsRes.value.data));
      }

      if (plansRes.status === 'fulfilled' && !plansRes.value.error) {
        applyPlans(asArray<Plan>(plansRes.value.data));
      } else {
        applyPlans(DEFAULT_PLANS);
      }

      if (isMounted.current) {
        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Erro ao recarregar dados da loja:', error);

      const cachedStores = getCachedData<Store>(STORE_CACHE_KEY);
      const cachedProducts = getCachedData<Product>(PRODUCTS_CACHE_KEY);
      const cachedCategories = getCachedData<Category>(CATEGORIES_CACHE_KEY);
      const cachedCoupons = getCachedData<Coupon>(COUPONS_CACHE_KEY);
      const cachedPlans = getCachedData<Plan>(PLANS_CACHE_KEY);

      if (cachedStores) applyStores(cachedStores);
      if (cachedProducts) applyProducts(cachedProducts);
      if (cachedCategories) applyCategories(cachedCategories);
      if (cachedCoupons) applyCoupons(cachedCoupons);

      if (cachedPlans?.length) {
        applyPlans(cachedPlans);
      } else {
        applyPlans(DEFAULT_PLANS);
      }

      if (isMounted.current) {
        setIsLoaded(true);
      }
    }
  }, [applyCategories, applyCoupons, applyPlans, applyProducts, applyStores]);

  useEffect(() => {
    isMounted.current = true;

    const cachedStores = getCachedData<Store>(STORE_CACHE_KEY);
    const cachedProducts = getCachedData<Product>(PRODUCTS_CACHE_KEY);
    const cachedCategories = getCachedData<Category>(CATEGORIES_CACHE_KEY);
    const cachedCoupons = getCachedData<Coupon>(COUPONS_CACHE_KEY);
    const cachedPlans = getCachedData<Plan>(PLANS_CACHE_KEY);

    if (cachedStores?.length) {
      setStores(cachedStores.map((item: any) => normalizeStore(item)));
    }

    if (cachedProducts?.length) {
      setProducts(cachedProducts.map((item: any) => normalizeProduct(item)));
    }

    if (cachedCategories?.length) {
      setCategories(cachedCategories.map((item: any) => normalizeCategory(item)));
    }

    if (cachedCoupons?.length) {
      setCoupons(cachedCoupons.map((item: any) => normalizeCoupon(item)));
    }

    if (cachedPlans?.length) {
      setPlans(mergePlansWithDefaults(cachedPlans));
    } else {
      setPlans(DEFAULT_PLANS);
    }

    if (
      cachedStores?.length ||
      cachedProducts?.length ||
      cachedCategories?.length ||
      cachedCoupons?.length ||
      cachedPlans?.length
    ) {
      setIsLoaded(true);
    }

    void reloadStoreData();

    const storesChannel = supabase
      .channel('stores-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, async () => {
        await reloadStoreData();
      })
      .subscribe();

    const productsChannel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        await reloadStoreData();
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async () => {
        await reloadStoreData();
      })
      .subscribe();

    const couponsChannel = supabase
      .channel('coupons-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, async () => {
        await reloadStoreData();
      })
      .subscribe();

    const plansChannel = supabase
      .channel('plans-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, async () => {
        await reloadStoreData();
      })
      .subscribe();

    return () => {
      isMounted.current = false;
      void supabase.removeChannel(storesChannel);
      void supabase.removeChannel(productsChannel);
      void supabase.removeChannel(categoriesChannel);
      void supabase.removeChannel(couponsChannel);
      void supabase.removeChannel(plansChannel);
    };
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

  const updateStore = useCallback(
    async (id: string, data: Partial<Store>) => {
      const previous = [...stores];

      const optimistic = previous.map((store) => {
        if (String(store.id) !== String(id)) return store;

        const nextSuspended =
          typeof (data as any).suspended === 'boolean' ? Boolean((data as any).suspended) : store.suspended;

        const nextActive =
          typeof data.active === 'boolean'
            ? data.active
            : nextSuspended
            ? false
            : store.active;

        return normalizeStore({
          ...store,
          ...data,
          active: nextActive,
          suspended: nextSuspended,
        });
      });

      setStores(optimistic);
      setCachedData(STORE_CACHE_KEY, optimistic);

      try {
        const payload = normalizeDbPayload({
          ...data,
          active:
            typeof data.active === 'boolean'
              ? data.active
              : typeof (data as any).suspended === 'boolean'
              ? !(data as any).suspended
              : undefined,
          adminEmail:
            data.adminEmail !== undefined ? normalizeEmail(data.adminEmail) : data.adminEmail,
        } as any);

        await safeUpdate('stores', 'id', id, payload);
        await reloadStoreData();
      } catch (error) {
        setStores(previous);
        setCachedData(STORE_CACHE_KEY, previous);
        console.error('Erro ao atualizar loja:', error);
        throw error;
      }
    },
    [reloadStoreData, stores]
  );

  const addProduct = useCallback(
    async (product: Product) => {
      const optimisticItem = normalizeProduct(product);
      const previous = [...products];
      const optimistic = [...previous, optimisticItem];

      setProducts(optimistic);
      setCachedData(PRODUCTS_CACHE_KEY, optimistic);

      try {
        const payload = normalizeDbPayload(removeId(product as any));
        await safeInsert('products', payload);
        await reloadStoreData();
      } catch (error) {
        setProducts(previous);
        setCachedData(PRODUCTS_CACHE_KEY, previous);
        console.error('Erro ao adicionar produto:', error);
        throw error;
      }
    },
    [products, reloadStoreData]
  );

  const updateProduct = useCallback(
    async (id: string, data: Partial<Product>) => {
      const previous = [...products];
      const optimistic = previous.map((product) =>
        String(product.id) === String(id) ? normalizeProduct({ ...product, ...data }) : product
      );

      setProducts(optimistic);
      setCachedData(PRODUCTS_CACHE_KEY, optimistic);

      try {
        await safeUpdate('products', 'id', id, normalizeDbPayload(data as any));
        await reloadStoreData();
      } catch (error) {
        setProducts(previous);
        setCachedData(PRODUCTS_CACHE_KEY, previous);
        console.error('Erro ao atualizar produto:', error);
        throw error;
      }
    },
    [products, reloadStoreData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const previous = [...products];
      const optimistic = previous.filter((product) => String(product.id) !== String(id));

      setProducts(optimistic);
      setCachedData(PRODUCTS_CACHE_KEY, optimistic);

      try {
        const { error } = await withTimeout(
          async () => await supabase.from('products').delete().eq('id', id),
          20000
        );

        if (error) throw error;

        await reloadStoreData();
      } catch (error) {
        setProducts(previous);
        setCachedData(PRODUCTS_CACHE_KEY, previous);
        console.error('Erro ao deletar produto:', error);
        throw error;
      }
    },
    [products, reloadStoreData]
  );

  const addCategory = useCallback(
    async (category: Category) => {
      const optimisticItem = normalizeCategory(category);
      const previous = [...categories];
      const optimistic = [...previous, optimisticItem];

      setCategories(optimistic);
      setCachedData(CATEGORIES_CACHE_KEY, optimistic);

      try {
        const payload = normalizeDbPayload(removeId(category as any));
        await safeInsert('categories', payload);
        await reloadStoreData();
      } catch (error) {
        setCategories(previous);
        setCachedData(CATEGORIES_CACHE_KEY, previous);
        console.error('Erro ao adicionar categoria:', error);
        throw error;
      }
    },
    [categories, reloadStoreData]
  );

  const updateCategory = useCallback(
    async (id: string, data: Partial<Category>) => {
      const previous = [...categories];
      const optimistic = previous.map((category) =>
        String(category.id) === String(id) ? normalizeCategory({ ...category, ...data }) : category
      );

      setCategories(optimistic);
      setCachedData(CATEGORIES_CACHE_KEY, optimistic);

      try {
        await safeUpdate('categories', 'id', id, normalizeDbPayload(data as any));
        await reloadStoreData();
      } catch (error) {
        setCategories(previous);
        setCachedData(CATEGORIES_CACHE_KEY, previous);
        console.error('Erro ao atualizar categoria:', error);
        throw error;
      }
    },
    [categories, reloadStoreData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const previous = [...categories];
      const optimistic = previous.filter((category) => String(category.id) !== String(id));

      setCategories(optimistic);
      setCachedData(CATEGORIES_CACHE_KEY, optimistic);

      try {
        const { error } = await withTimeout(
          async () => await supabase.from('categories').delete().eq('id', id),
          20000
        );

        if (error) throw error;

        await reloadStoreData();
      } catch (error) {
        setCategories(previous);
        setCachedData(CATEGORIES_CACHE_KEY, previous);
        console.error('Erro ao deletar categoria:', error);
        throw error;
      }
    },
    [categories, reloadStoreData]
  );

  const addCoupon = useCallback(
    async (coupon: Coupon) => {
      const optimisticItem = normalizeCoupon(coupon);
      const previous = [...coupons];
      const optimistic = [...previous, optimisticItem];

      setCoupons(optimistic);
      setCachedData(COUPONS_CACHE_KEY, optimistic);

      try {
        const payload = normalizeDbPayload(removeId(coupon as any));
        await safeInsert('coupons', payload);
        await reloadStoreData();
      } catch (error) {
        setCoupons(previous);
        setCachedData(COUPONS_CACHE_KEY, previous);
        console.error('Erro ao adicionar cupom:', error);
        throw error;
      }
    },
    [coupons, reloadStoreData]
  );

  const updateCoupon = useCallback(
    async (id: string, data: Partial<Coupon>) => {
      const previous = [...coupons];
      const optimistic = previous.map((coupon) =>
        String(coupon.id) === String(id) ? normalizeCoupon({ ...coupon, ...data }) : coupon
      );

      setCoupons(optimistic);
      setCachedData(COUPONS_CACHE_KEY, optimistic);

      try {
        await safeUpdate('coupons', 'id', id, normalizeDbPayload(data as any));
        await reloadStoreData();
      } catch (error) {
        setCoupons(previous);
        setCachedData(COUPONS_CACHE_KEY, previous);
        console.error('Erro ao atualizar cupom:', error);
        throw error;
      }
    },
    [coupons, reloadStoreData]
  );

  const deleteCoupon = useCallback(
    async (id: string) => {
      const previous = [...coupons];
      const optimistic = previous.filter((coupon) => String(coupon.id) !== String(id));

      setCoupons(optimistic);
      setCachedData(COUPONS_CACHE_KEY, optimistic);

      try {
        const { error } = await withTimeout(
          async () => await supabase.from('coupons').delete().eq('id', id),
          20000
        );

        if (error) throw error;

        await reloadStoreData();
      } catch (error) {
        setCoupons(previous);
        setCachedData(COUPONS_CACHE_KEY, previous);
        console.error('Erro ao deletar cupom:', error);
        throw error;
      }
    },
    [coupons, reloadStoreData]
  );

  const toggleStoreActive = useCallback(
    async (id: string) => {
      const current = stores.find((store) => String(store.id) === String(id));
      if (!current) throw new Error('Loja não encontrada.');

      const nextActive = !current.active;

      const previous = [...stores];
      const optimistic = previous.map((store) =>
        String(store.id) === String(id)
          ? normalizeStore({
              ...store,
              active: nextActive,
              suspended: false,
            })
          : store
      );

      setStores(optimistic);
      setCachedData(STORE_CACHE_KEY, optimistic);

      try {
        await safeUpdate('stores', 'id', id, {
          is_active: nextActive,
          suspended: false,
        });
        await reloadStoreData();
      } catch (error) {
        setStores(previous);
        setCachedData(STORE_CACHE_KEY, previous);
        console.error('Erro ao alternar status da loja:', error);
        throw error;
      }
    },
    [reloadStoreData, stores]
  );

  const suspendStore = useCallback(
    async (id: string) => {
      const previous = [...stores];
      const optimistic = previous.map((store) =>
        String(store.id) === String(id)
          ? normalizeStore({
              ...store,
              active: false,
              suspended: true,
            })
          : store
      );

      setStores(optimistic);
      setCachedData(STORE_CACHE_KEY, optimistic);

      try {
        await safeUpdate('stores', 'id', id, {
          is_active: false,
          suspended: true,
        });
        await reloadStoreData();
      } catch (error) {
        setStores(previous);
        setCachedData(STORE_CACHE_KEY, previous);
        console.error('Erro ao suspender loja:', error);
        throw error;
      }
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
        suspended: false,
        logo: '',
        banner: '',
        whatsapp: '',
        plan: 'iniciante',
        store_url: buildStoreUrl(slug),
      };

      const data = await safeInsert('stores', payload);
      const created = Array.isArray(data) ? data[0] : data;

      if (!created) {
        throw new Error('Não foi possível criar a loja.');
      }

      await reloadStoreData();
      return normalizeStore(created);
    },
    [reloadStoreData]
  );

  const deleteStore = useCallback(
  async (id: string) => {
    const previousStores = [...stores];
    const previousProducts = [...products];
    const previousCategories = [...categories];
    const previousCoupons = [...coupons];

    setStores(previousStores.filter((item) => String(item.id) !== String(id)));
    setProducts(previousProducts.filter((item) => String(item.storeId) !== String(id)));
    setCategories(previousCategories.filter((item) => String(item.storeId) !== String(id)));
    setCoupons(previousCoupons.filter((item) => String(item.storeId) !== String(id)));

    try {
      const { error: adminsError } = await withTimeout(
        async () =>
          await supabase
            .from('admins')
            .update({ store_id: null })
            .eq('store_id', id),
        20000
      );

      if (adminsError) throw adminsError;

      const { error: storeError } = await withTimeout(
        async () => await supabase.from('stores').delete().eq('id', id),
        20000
      );

      if (storeError) throw storeError;

      await reloadStoreData();
    } catch (error) {
      setStores(previousStores);
      setProducts(previousProducts);
      setCategories(previousCategories);
      setCoupons(previousCoupons);
      console.error('Erro ao deletar loja:', error);
      throw error;
    }
  },
  [categories, coupons, products, reloadStoreData, stores]
);

  const updatePlan = useCallback(
    async (planId: 'iniciante' | 'pro' | 'premium', data: Partial<Plan>) => {
      const existingPlan = plans.find(
        (plan) => String(plan.id).toLowerCase() === String(planId).toLowerCase()
      );

      const defaultPlan = DEFAULT_PLANS.find((plan) => plan.id === planId);

      const payload = normalizeDbPayload({
        name: data.name ?? existingPlan?.name ?? defaultPlan?.name ?? planId,
        price: data.price ?? existingPlan?.price ?? defaultPlan?.price ?? 0,
        features: data.features ?? existingPlan?.features ?? defaultPlan?.features ?? [],
        maxProducts:
          data.maxProducts ?? existingPlan?.maxProducts ?? defaultPlan?.maxProducts ?? 0,
        maxOrders: data.maxOrders ?? existingPlan?.maxOrders ?? defaultPlan?.maxOrders ?? 0,
      } as any);

      try {
        await safeUpdate('plans', 'code', planId, payload);
        await reloadStoreData();
      } catch (error) {
        console.error('Erro ao atualizar plano:', error);
        throw error;
      }
    },
    [plans, reloadStoreData]
  );

  const value = useMemo(
    () => ({
      stores,
      products,
      categories,
      coupons,
      plans,
      isLoaded,
      getStore,
      getStoreByAdminEmail,
      getStoreProducts,
      getStoreCategories,
      getProductsByCategory,
      getStoreCoupons,
      getCouponByCode,
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
      isLoaded,
      getStore,
      getStoreByAdminEmail,
      getStoreProducts,
      getStoreCategories,
      getProductsByCategory,
      getStoreCoupons,
      getCouponByCode,
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