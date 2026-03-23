export type ProductExtra = {
  name: string;
  price: number;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export interface Address {
  zipCode?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  reference?: string;
  formattedAddress?: string;
  coordinates?: Coordinates;
}

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

export type DeliveryAssignmentStatus =
  | 'unassigned'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';

export interface DeliveryDriver {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  active: boolean;
  online?: boolean;
  avatar?: string;
  vehicleType?: 'bike' | 'motorcycle' | 'car' | 'other';
  vehicleLabel?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
}

export interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  totalEarned: number;
  averageDeliveryMinutes: number;
}

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

  customerName?: string;
  customerPhone?: string;

  deliveryAddress?: Address;
  deliveryCoordinates?: Coordinates;
  deliveryDistanceKm?: number;
  deliveryFee?: number;

  deliveryDriverId?: string;
  deliveryDriverName?: string;
  deliveryAssignedAt?: string;
  deliveryAcceptedAt?: string;
  pickedUpAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  deliveryFailedAt?: string;
  deliveryStatus?: DeliveryAssignmentStatus;
  deliveryNotes?: string;
  deliveryConfirmationCode?: string;
  deliveredBy?: string;
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
  themeColor?: string;

  address?: Address;
  coordinates?: Coordinates;
  deliveryRadiusKm?: number;
  deliveryFeePerKm?: number;
  minimumOrderValue?: number;
}

export interface Plan {
  id: 'iniciante' | 'pro' | 'premium';
  name: string;
  price: number;
  features: string[];
  maxProducts: number;
  maxOrders: number;
  maxDeliveryDrivers?: number;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'super-admin' | 'delivery-driver';
  storeId?: string;
  deliveryDriverId?: string;
  name?: string;
}