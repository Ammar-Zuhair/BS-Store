import { invalidateSearchCache } from '../search/cache';
import type { OptionsDefinition, BundleSelection } from '../options/model';
import { api } from './client';
import { prepareReceiptUpload } from '../utils/receiptUpload';
import { createReadLimiter } from '../utils/requests';
import { Address, Order, PaymentMethodType, Product, Store, Category } from '../types';

export { api };
const readPiece = createReadLimiter(3);

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  requestOtp: async (phone: string) => {
    const { getOtpDeviceId } = await import('../utils/otp');
    return api.post<{ phone: string; expiresIn: number; resendAfter: number; deliveryStatus: string }>('/auth/otp/request', { phone, deviceId: await getOtpDeviceId() });
  },
  verifyOtp: async (phone: string, otp: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; isNewUser: boolean; requiresProfileCompletion: boolean; user: { id: string; fullName: string; phone: string; role: string } }>('/auth/otp/verify', { phone, otp });
    await api.setRefreshToken(res.refreshToken);
    await api.setToken(res.accessToken);
    return res;
  },
  completeProfile: (fullName: string, initialAddress: Omit<Address, 'id'>) => api.post<{ fullName: string; phone: string }>('/auth/complete-profile', {
    fullName, initialAddress: { ...initialAddress, label: 0 },
  }),
  requestDeletionOtp: () => api.post<{ resendAfter: number }>('/account/delete/otp/request'),
  deleteAccount: (otp: string) => api.post('/account/delete/otp/verify', { otp }),

  me: () => api.get<{ id: string; name?: string; fullName?: string; phone: string; role: string }>('/auth/me'),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await api.setToken(null);
    }
  },
};

export const governorateApi = {
  list: () => api.get<{ id: string; name: string }[]>('/governorates'),
  mine: () => api.get<{ governorateId: string | null }>('/profile/governorate'),
  update: async (governorateId: string) => { invalidateSearchCache(); try { return await api.put('/profile/governorate', { governorateId }); } finally { invalidateSearchCache(); } },
};

// ─── Catalog API ─────────────────────────────────────────────────────────────
export interface ApiCategory {
  id: string;
  name: string;
  iconName?: string;
  icon?: string;
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
  isOpen?: boolean | null;
  openingTime?: string | null;
  closingTime?: string | null;
  is24Hours?: boolean;
  categoryIds?: string[];
}

export interface ApiProduct {
  hasOptions?: boolean;
  options?: OptionsDefinition;
  minSellingPrice?: number | null;
  maxSellingPrice?: number | null;
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  storeId: string;
  storeName: string;
  sourceType: string;
  sellingPrice: number;
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
  getPiece: (dealId: string, pieceId: string) => readPiece(() => api.get<any>(`/deals/${encodeURIComponent(dealId)}/pieces/${encodeURIComponent(pieceId)}`)),
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
  addConfiguredItem: (input: { productId?: string; quantity: number; variantId?: string; imageValueId?: string; dealId?: string; dealProductId?: string; bundleSelections?: BundleSelection[] }) => api.post<any>('/cart/items', input),
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
          : '',
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
          : '',
      city: a.city || '',
      district: a.district || '',
      street: a.street || '',
      building: a.building || '',
      description: a.description || '',
      latitude: Number(a.latitude) || 0,
      longitude: Number(a.longitude) || 0,
      isDefault: Boolean(a.isDefault),
    } as Address;
  },
  updateAddress: (id: string, addr: Omit<Address, 'id'>) => api.put<{id: string; isDefault: boolean}>(`/customers/addresses/${id}`, {
    ...addr, label: addr.label === 'العمل' ? 1 : addr.label === 'أخرى' ? 2 : 0,
  }),
  deleteAddress: (id: string) => api.delete<any>(`/customers/addresses/${id}`),
  setDefaultAddress: (id: string) => api.put<any>(`/customers/addresses/${id}/default`),
};

// ─── Checkout & Orders API ───────────────────────────────────────────────────
export const ordersApi = {
  validateCouponCode: (code: string, cartSubtotal?: number) =>
    api.post<{
      code: string;
      discountKind: 'DELIVERY_DISCOUNT' | 'PRODUCT_DISCOUNT';
      discountPercent: number;
      isTiered?: boolean;
      discountTiers?: any[];
      message?: string;
    }>('/deals/validate-code', { code, cartSubtotal }),
  getDeliveryQuote: (addressId: string, storeIds: string[]) =>
    api.post<{ deliveryFee: number; farthestDistanceKm: number; storeFees?: { storeId: string; deliveryFee: number }[] }>('/checkout/delivery-quote', { addressId, storeIds }),
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
    productDiscountDealId?: string;
    transferProvider?: 'ALKURAIMI' | 'WALLET';
    transferReference?: string;
    items?: { productId?: string; dealId?: string; dealProductId?: string; quantity: number; variantId?: string; imageValueId?: string; bundleSelections?: BundleSelection[] }[];
  }) => api.post<any>('/checkout/place-order', req),

  getMyOrders: () => api.get<any[]>('/orders'),
  getOrderDetails: (id: string) => api.get<any>(`/orders/${id}`),
  submitReview: (id: string, rating: number, comment: string) => api.post<any>(`/orders/${id}/review`, { rating, comment }),
  reportPriceChange: (orderId: string, priceChangeId: string, reason: string, customerNotes: string) =>
    api.post<any>(`/orders/${orderId}/price-changes/${priceChangeId}/complaints`, { reason, customerNotes }),
  cancelOrder: (id: string, reasonCode: string, description?: string) =>
    api.post<any>(`/orders/${id}/cancel`, { reasonCode, description }),
};

// ─── Payments API ────────────────────────────────────────────────────────────
export const paymentsApi = {
  getSettings: () => api.get<{
    transferBankName?: string | null;
    transferAccountNumber?: string | null;
    transferAccountName?: string | null;
  }>('/payments/settings'),
  getTransferInfo: (orderId: string) => api.get<{
    orderId: string;
    orderNumber: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    status: number | string;
    rejectionReason?: string | null;
    transferProvider?: 'ALKURAIMI' | 'WALLET' | null;
    transferReference?: string | null;
    receiptUrl?: string | null;
  }>(`/payments/${orderId}/transfer-info`),
  uploadReceipt: async (orderId: string, fileUri: string, fileName = 'receipt.jpg', mimeType = 'image/jpeg') => {
    const upload = await prepareReceiptUpload(fileUri, fileName, mimeType);
    await api.initToken();
    return api.request<any>(`/payments/${orderId}/upload-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': upload.contentType },
      body: upload.body,
    });
  },
};
