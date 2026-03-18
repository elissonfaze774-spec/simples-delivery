import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  const [stores, setStores] = useState<Store[]>(() => getCache<Store>(STORE_CACHE_KEY).map(normalizeStore));
  const [products, setProducts] = useState<Product[]>(() =>
    getCache<Product>(PRODUCTS_CACHE_KEY).map(normalizeProduct)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    getCache<Category>(CATEGORIES_CACHE_KEY).map(normalizeCategory)
  );
  const [coupons, setCoupons] = useState<Coupon[]>(() =>
    getCache<Coupon>(COUPONS_CACHE_KEY).map(normalizeCoupon)
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
    return hasStores || hasProducts || hasCategories || hasCoupons;
  });

  const reloadStoreData = useCallback(async () => {
    try {
      const [storesRes, productsRes, categoriesRes, couponsRes, plansRes] = await Promise.all([
        supabase.from('stores').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('coupons').select('*').order('created_at', { ascending: true }),
        supabase.from('plans').select('*').order('created_at', { ascending: true }),
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

      setStores(nextStores);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setCoupons(nextCoupons);
      setPlans(nextPlans);

      setCache(STORE_CACHE_KEY, nextStores);
      setCache(PRODUCTS_CACHE_KEY, nextProducts);
      setCache(CATEGORIES_CACHE_KEY, nextCategories);
      setCache(COUPONS_CACHE_KEY, nextCoupons);
      setCache(PLANS_CACHE_KEY, nextPlans);
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

  const updateStore = useCallback(
    async (id: string, data: Partial<Store>) => {
      const payload: any = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.slug !== undefined) payload.slug = slugify(data.slug);
      if (data.logo !== undefined) payload.logo = data.logo;
      if (data.banner !== undefined) payload.banner = data.banner;
      if (data.whatsapp !== undefined) payload.whatsapp = data.whatsapp;
      if (data.active !== undefined) payload.is_active = data.active;
      if (data.adminEmail !== undefined) payload.admin_email = normalizeEmail(data.adminEmail);
      if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl;
      if (data.storeUrl !== undefined) payload.store_url = data.storeUrl;
      if (data.plan !== undefined) payload.plan = data.plan;
      if ((data as any).suspended !== undefined) payload.suspended = (data as any).suspended;
      if (data.deliveryFee !== undefined) payload.delivery_fee = Number(data.deliveryFee || 0);
      if ((data as any).openingTime !== undefined) payload.opening_time = String((data as any).openingTime || '');
      if ((data as any).closingTime !== undefined) payload.closing_time = String((data as any).closingTime || '');

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

  const toggleStoreActive = useCallback(
    async (id: string) => {
      const current = stores.find((store) => String(store.id) === String(id));
      if (!current) throw new Error('Loja não encontrada.');

      const { error } = await supabase
        .from('stores')
        .update({
          is_active: !current.active,
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
        suspended: false,
        logo: '',
        banner: '',
        whatsapp: '',
        delivery_fee: 0,
        plan: 'iniciante',
        store_url: buildStoreUrl(slug),
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