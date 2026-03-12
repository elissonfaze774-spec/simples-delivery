export const MOCK_STORES = [
  { id: '1', name: 'Loja Teste', admin_email: 'teste@loja.com', is_active: true, suspended: false },
];

export const MOCK_CATEGORIES = [
  { id: 'c1', storeId: '1', name: 'Lanches' },
  { id: 'c2', storeId: '1', name: 'Bebidas' },
];

export const MOCK_PRODUCTS = [
  { id: 'p1', storeId: '1', categoryId: 'c1', name: 'Hambúrguer', price: 25.0 },
  { id: 'p2', storeId: '1', categoryId: 'c2', name: 'Refrigerante', price: 6.5 },
];

export const MOCK_COUPONS = [
  { id: 'cp1', storeId: '1', code: 'BOASVINDAS', discount: 10 },
];

export const MOCK_PLANS = [
  { id: 'iniciante', name: 'iniciante', price: 0 },
  { id: 'pro', name: 'pro', price: 49 },
  { id: 'premium', name: 'premium', price: 99 },
];

export const MOCK_USERS = [
  { id: 'super-admin-local', email: 'dono@teste.com', role: 'super-admin' },
  { id: 'admin-1', email: 'teste@loja.com', role: 'admin', storeId: '1' },
];

export const MOCK_SESSION_USER = { id: 'admin-1', email: 'teste@loja.com' };

export const MOCK_ORDERS = [
  {
    id: 'o1',
    code: '#1001',
    items_json: [{ product: { id: 'p1', name: 'Hambúrguer', price: 25 }, quantity: 1 }],
    total: 25,
    status: 'received',
    created_at: new Date().toISOString(),
    store_id: '1',
  },
];
