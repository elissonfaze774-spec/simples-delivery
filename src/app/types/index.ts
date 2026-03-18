export type ProductExtra = {
  name: string;
  price: number;
};

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  storeId: string;
  categoryId?: string;
  available?: boolean;
  description?: string;
  extras?: ProductExtra[];
}

export interface Category {
  id: string;
  name: string;
  storeId: string;
  order: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  active: boolean;
  storeId: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  lineId?: string;
  selectedExtras?: ProductExtra[];
  unitPrice?: number;
}

export interface OrderItem {
  id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  product?: Product;
  storeId?: string;
  categoryId?: string;
  selectedExtras?: ProductExtra[];
  unitPrice?: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'received'
  | 'delivered';

export interface Order {
  id: string;
  code: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  storeId: string;
  isFavorite?: boolean;
  couponCode?: string;
  discount?: number;
}

export interface Store {
  id: string;
  name: string;
  slug?: string;
  logo: string;
  banner: string;
  whatsapp: string;
  active: boolean;
  suspended?: boolean;
  adminEmail: string;
  logoUrl?: string;
  storeUrl?: string;
  plan?: 'iniciante' | 'pro' | 'premium';
  deliveryFee?: number;
  openingTime?: string;
closingTime?: string;
}

export interface Plan {
  id: 'iniciante' | 'pro' | 'premium';
  name: string;
  price: number;
  features: string[];
  maxProducts: number;
  maxOrders: number;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'super-admin';
  storeId?: string;
}