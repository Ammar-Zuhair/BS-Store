/**
 * Types & Domain Models for BS Store Platform
 * Derived from System Architecture Specification
 */

export type SourceType = 'IN_STOCK' | 'EXTERNAL_STORE';

export type PaymentMethodType = 'CASH_ON_DELIVERY' | 'MANUAL_TRANSFER';

export type PaymentStatusType = 'PENDING' | 'PAID' | 'REJECTED' | 'VERIFIED';

export type OrderStatusType =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_PENDING_VERIFICATION'
  | 'CONFIRMED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'PURCHASING'
  | 'WAREHOUSE_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export interface Address {
  id: string;
  label: 'المنزل' | 'العمل' | 'أخرى';
  city: string;
  district: string;
  street: string;
  building?: string;
  apartment?: string;
  phone?: string;
  description?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface Store {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  categoryIds?: string[];
  subcategories: string[];
  phone: string;
  address: string;
  imageUrl: string;
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  deliveryFee: number;
  isOpen: boolean;
  isVerified: boolean;
  tags: string[];
}

export interface BundlePiece {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  categoryId: string;
  subcategoryId?: string;
  name: string;
  description: string;
  sellingPrice: number;
  expectedPurchasePrice?: number; // Hidden from customer app, used for admin/driver
  imageUrl: string;
  sourceType: SourceType;
  inStock: boolean;
  discountPrice?: number;
  unit?: string;
  isTopPick?: boolean;
  isBundle?: boolean;
  bundleItems?: BundlePiece[];
  dealId?: string;
  dealProductId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  selectedPiece?: BundlePiece;
}

export interface SubOrderGroup {
  storeId: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  distanceKm?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatusType;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  address: Address;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  transferReceiptUrl?: string;
  transferReference?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehiclePlate: string;
    avatarUrl: string;
    currentLocation?: string;
  };
  notes?: string;
}

export interface FlashDeal {
  id: string;
  title: string;
  storeName: string;
  description: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  imageUrl: string;
  remainingHours: number;
  product: Product;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}
