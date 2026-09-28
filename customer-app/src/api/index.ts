import { api } from './client';
import { Address, Order, PaymentMethodType, Product, Store, Category } from '../types';

export { api };

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  checkPhone: async (phone: string): Promise<boolean> => {
    try {
      const res = await api.get<boolean>(`/auth/check-phone?phone=${encodeURIComponent(phone.trim())}`);
      return Boolean(res);
    } catch {
      return false;
    }
  },

  login: async (phone: string, password = 'Password123!') => {
    const res = await api.post<{ accessToken: string; user: { id: string; name: string; phone: string; role: string } }>(
      '/auth/login',
      { phone, password }
    );
    api.setToken(res.accessToken);
    return res;
  },

  register: async (
    fullName: string,
    phone: string,
    password = 'Password123!',
    initialAddress?: {
      city: string;
      district: string;
      street: string;
      building?: string;
      description?: string;
      latitude: number;
      longitude: number;
    }
  ) => {
    const res = await api.post<{ accessToken: string; user: { id: string; name: string; phone: string; role: string } }>(
      '/auth/register',
      {
        fullName,
        phone,
        password,
        initialAddress: initialAddress
          ? {
              city: initialAddress.city || '',
              district: initialAddress.district || '',
              street: initialAddress.street || '',
              building: initialAddress.building,
              description: initialAddress.description,
              latitude: initialAddress.latitude || 0,
              longitude: initialAddress.longitude || 0,
              label: 0,
            }
          : undefined,
      }
    );
    api.setToken(res.accessToken);
    return res;
  },

  me: () => api.get<{ id: string; name: string; phone: string; role: string }>('/auth/me'),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.setToken(null);
    }
  },
};

// ─── Catalog API ─────────────────────────────────────────────────────────────
export interface ApiCategory {
  id: string;
  name: string;
  iconName: string;
  sortOrder: number;
  productsCount: number;
}

export interface ApiStore {
  id: string;
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  isActive: boolean;
  categoryIds?: string[];
}

export interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  storeId: string;
  storeName: string;
  sourceType: string;
  sellingPrice: number;
  availableStock?: number;
  isActive: boolean;
  images: string[];
}

export interface ApiDeal {
  id: string;
  title: string;
  storeName: string;
  storeId?: string;
  categoryId?: string;
  description: string;
  badge: string;
  imageUrl: string;
  originalPrice: number;
  offerPrice: number;
  discountPercent: number;
  couponCode?: string;
  isFreeDelivery?: boolean;
  showInHome?: boolean;
  showInCategory?: boolean;
  showInStore?: boolean;
  isActive?: boolean;
  expiresAt?: string;
  products?: {
    id: string;
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
  }[];
}

export const catalogApi = {
  getCategories: () => api.get<ApiCategory[]>('/categories'),
  getCategoryProducts: (categoryId: string) => api.get<ApiProduct[]>(`/categories/${categoryId}/products`),
  getStores: () => api.get<ApiStore[]>('/stores'),
  getStore: (storeId: string) => api.get<ApiStore>(`/stores/${storeId}`),
  getProducts: (params?: { categoryId?: string; storeId?: string; search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.storeId) query.append('storeId', params.storeId);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const qs = query.toString();
    return api.get<{ items: ApiProduct[]; page: number; totalCount: number }>(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id: string) => api.get<ApiProduct>(`/products/${id}`),
  searchProducts: (q: string) => api.get<ApiProduct[]>(`/products/search?q=${encodeURIComponent(q)}`),
  getDeals: (params?: { categoryId?: string; storeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.storeId) query.append('storeId', params.storeId);
    const qs = query.toString();
    return api.get<ApiDeal[]>(`/deals${qs ? `?${qs}` : ''}`);
  },
};

// ─── Cart API ────────────────────────────────────────────────────────────────
export const cartApi = {
  getCart: () => api.get<any>('/cart'),
  addItem: (productId: string, quantity = 1, notes?: string) =>
    api.post<any>('/cart/items', { productId, quantity, notes }),
  updateItem: (id: string, quantity: number, notes?: string) =>
    api.put<any>(`/cart/items/${id}`, { quantity, notes }),
  removeItem: (id: string) => api.delete<any>(`/cart/items/${id}`),
  clearCart: () => api.delete<any>('/cart'),
};

// ─── Addresses API ───────────────────────────────────────────────────────────
export const addressApi = {
  getAddresses: async () => {
    const raw = await api.get<any[]>('/customers/addresses');
    return (raw || []).map((a) => ({
      id: a.id,
      label:
        a.label === 1 || a.label === 'Work'
          ? 'العمل'
          : a.label === 2 || a.label === 'Other'
          ? 'أخرى'
          : 'المنزل',
      city: a.city || '',
      district: a.district || '',
      street: a.street || '',
      building: a.building || '',
      description: a.description || '',
      latitude: Number(a.latitude) || 0,
      longitude: Number(a.longitude) || 0,
      isDefault: Boolean(a.isDefault),
    })) as Address[];
  },
  addAddress: async (addr: Omit<Address, 'id'>) => {
    const a = await api.post<any>('/customers/addresses', {
      label: addr.label === 'العمل' ? 1 : addr.label === 'أخرى' ? 2 : 0,
      city: addr.city,
      district: addr.district,
      street: addr.street,
      building: addr.building,
      description: addr.description,
      latitude: addr.latitude || 0,
      longitude: addr.longitude || 0,
      isDefault: addr.isDefault ?? false,
    });
    return {
      id: a.id,
      label:
        a.label === 1 || a.label === 'Work'
          ? 'العمل'
          : a.label === 2 || a.label === 'Other'
          ? 'أخرى'
          : 'المنزل',
      city: a.city || '',
      district: a.district || '',
      street: a.street || '',
      building: a.building || '',
      description: a.description || '',
      latitude: Number(a.latitude) || 15.35,
      longitude: Number(a.longitude) || 44.2,
      isDefault: Boolean(a.isDefault),
    } as Address;
  },
  deleteAddress: (id: string) => api.delete<any>(`/customers/addresses/${id}`),
  setDefaultAddress: (id: string) => api.put<any>(`/customers/addresses/${id}/default`),
};

// ─── Checkout & Orders API ───────────────────────────────────────────────────
export const ordersApi = {
  validateCouponCode: (code: string) => api.post<{ code: string; discountKind: 'DELIVERY_DISCOUNT' | 'PRODUCT_DISCOUNT'; discountPercent: number }>('/deals/validate-code', { code }),
  getDeliveryQuote: (addressId: string, storeIds: string[]) =>
    api.post<{ deliveryFee: number; farthestDistanceKm: number }>('/checkout/delivery-quote', { addressId, storeIds }),
  validateCheckout: (items: { productId: string; quantity: number }[], addressId?: string, paymentMethod = 0) =>
    api.post<any>('/checkout/validate', { items, addressId, paymentMethod }),

  placeOrder: (req: {
    addressId?: string;
    newAddress?: any;
    paymentMethod: number; // 0: COD, 1: ManualTransfer
    notes?: string;
    idempotencyKey?: string;
    deliveryDealId?: string;
    couponCode?: string;
    items?: { productId?: string; dealId?: string; dealProductId?: string; quantity: number }[];
  }) => api.post<any>('/checkout/place-order', req),

  getMyOrders: () => api.get<any[]>('/orders'),
  getOrderDetails: (id: string) => api.get<any>(`/orders/${id}`),
  cancelOrder: (id: string, reasonCode: string, description?: string) =>
    api.post<any>(`/orders/${id}/cancel`, { reasonCode, description }),
};

// ─── Payments API ────────────────────────────────────────────────────────────
export const paymentsApi = {
  getTransferInfo: (orderId: string) => api.get<any>(`/payments/${orderId}/transfer-info`),
  uploadReceipt: (orderId: string, fileUri: string, fileName = 'receipt.jpg') => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: fileName,
    } as any);
    return api.post<any>(`/payments/${orderId}/upload-receipt`, formData);
  },
};
