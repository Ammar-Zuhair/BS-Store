import { api } from './client';
import {
  AdminKPI,
  AdminOrder,
  BankTransferRequest,
  AdminProduct,
  DriverCustodyAccount,
  AuditLog,
  AdminCategory,
  AdminStore,
  AdminFlashDeal,
  AdminPriceChangeComplaint,
  AdminProductPriceChange,
  AdminAppVersionConfiguration,
  AdminMaintenanceState,
  AdminBroadcastHistoryItem,
  ManagedAppType,
  ManagedPlatform,
  BroadcastType,
} from '../types';

export { api };

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  bootstrapFirstAdmin: async (fullName: string, phone: string, password: string) => {
    await api.clearSession();
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; fullName?: string; name?: string; phone: string; email?: string; role: string };
    }>('/auth/bootstrap-admin', { fullName, phone, password });
    await api.setToken(res.accessToken);
    await api.setRefreshToken(res.refreshToken);
    return res;
  },

  login: async (phone: string, password: string) => {
    await api.clearSession();
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; fullName?: string; name?: string; phone: string; email?: string; role: string };
    }>(
      '/auth/login',
      { phone, password, role: 'Admin' }
    );
    await api.setToken(res.accessToken);
    await api.setRefreshToken(res.refreshToken);
    return res;
  },

  me: () => api.get<{ id: string; fullName?: string; name?: string; phone: string; email?: string; role: string }>('/auth/me'),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await api.clearSession();
    }
  },
};

// ─── Admin API ───────────────────────────────────────────────────────────────
export const adminApi = {
  getOrderHours: () => api.get<{ isEnabled: boolean; openingTime: string; closingTime: string }>('/admin/settings/order-hours'),
  updateOrderHours: (data: { isEnabled: boolean; openingTime: string; closingTime: string }) =>
    api.put<{ isEnabled: boolean; openingTime: string; closingTime: string }>('/admin/settings/order-hours', data),
  getDashboard: () =>
    api.get<{
      totalOrdersToday: number;
      totalSalesToday: number;
      totalPurchaseCostToday: number;
      totalGrossProfitToday: number;
      salesChangePercent: number;
      fieldCustodyTotal: number;
      pendingVerificationPayments: number;
      searchingDriverOrders: number;
      activeDriversCount: number;
    }>('/admin/dashboard'),

  getManagedAccounts: () => api.get<any[]>('/admin/accounts'),
  createManagedAccount: (data: { fullName: string; phone: string; password: string; role: 'Admin' | 'Driver'; governorateId?: string }) =>
    api.post<any>('/admin/accounts', data),
  updateManagedAccount: (id: string, data: { fullName: string; phone: string; password?: string; isActive: boolean; governorateId?: string }) =>
    api.put<any>(`/admin/accounts/${id}`, data),
  deleteManagedAccount: (id: string) => api.delete<any>(`/admin/accounts/${id}`),

  getOrders: (status?: string) => {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<any[]>(`/admin/orders${qs}`);
  },

  assignDriver: (orderId: string, driverId: string) =>
    api.post<any>(`/admin/orders/${orderId}/assign-driver`, { driverId }),
  approveOrder: (orderId: string) => api.post<any>(`/admin/orders/${orderId}/approve`),
  rejectOrder: (orderId: string, reason: string) => api.post<any>(`/admin/orders/${orderId}/reject`, { reason }),
  cancelOrder: (orderId: string, reasonCode: string, description?: string) =>
    api.post<any>(`/orders/${orderId}/cancel`, { reasonCode, description }),

  getPayments: (status?: string) => {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<any[]>(`/admin/payments${qs}`);
  },

  getPendingPayments: () =>
    api.get<any[]>('/admin/payments/pending').catch(() => api.get<any[]>('/admin/payments')),

  approvePayment: (paymentId: string, amountReceived: number) =>
    api.post<any>(`/admin/payments/${paymentId}/approve`, { amountReceived }),

  rejectPayment: (paymentId: string, reason: string) =>
    api.post<any>(`/admin/payments/${paymentId}/reject`, { reason }),

  getDriverSettlementRequests: () => api.get<any[]>('/admin/driver-settlements'),
  approveDriverSettlement: (id: string) => api.post<any>(`/admin/driver-settlements/${id}/approve`),
  rejectDriverSettlement: (id: string, reason?: string) => api.post<any>(`/admin/driver-settlements/${id}/reject`, { reason }),

  getDrivers: () =>
    api.get<any[]>('/admin/drivers'),

  getPendingDrivers: () => api.get<any[]>('/admin/drivers/pending'),
  approveDriver: (driverId: string) => api.post<any>(`/admin/drivers/${driverId}/approve`),
  rejectDriver: (driverId: string) => api.delete<any>(`/admin/drivers/${driverId}/application`),
  createAdmin: (fullName: string, phone: string, password: string) =>
    api.post<any>('/admin/accounts', { fullName, phone, password, role: 'Admin' }),

  createSettlement: (driverId: string, amount: number, note?: string) =>
    api.post<any>(`/admin/drivers/${driverId}/settlement`, { amount, note }),

  getDeliverySettings: () =>
    api.get<any>('/admin/settings/delivery'),

  updateDeliverySettings: (data: any) =>
    api.put<any>('/admin/settings/delivery', data),

  getDriverProfitShare: () =>
    api.get<{ percent: number }>('/admin/settings/driver-profit-share'),

  updateDriverProfitShare: (percent: number) =>
    api.put<{ percent: number }>('/admin/settings/driver-profit-share', { percent }),

  getPaymentSettings: () =>
    api.get<any>('/admin/settings/payment'),

  updatePaymentSettings: (data: any) =>
    api.put<any>('/admin/settings/payment', data),

  // Products
  getProducts: (params?: { categoryId?: string; storeId?: string; search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.storeId) query.append('storeId', params.storeId);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const qs = query.toString();
    return api.get<{ items: any[]; page: number; totalCount: number }>(`/admin/products${qs ? `?${qs}` : ''}`);
  },

  createProduct: (data: any) =>
    api.post<any>('/admin/products', data),

  updateProduct: (id: string, data: any) =>
    api.put<any>(`/admin/products/${id}`, data),

  toggleProduct: (id: string) =>
    api.patch<boolean>(`/admin/products/${id}/toggle`),

  deleteProduct: (id: string) =>
    api.delete<any>(`/admin/products/${id}`),

  // Categories
  getCategories: () =>
    api.get<any[]>('/admin/categories').catch(() => api.get<any[]>('/categories?includeInactive=true')),

  createCategory: (data: any) =>
    api.post<any>('/admin/categories', data),

  updateCategory: (id: string, data: any) =>
    api.put<any>(`/admin/categories/${id}`, data),

  toggleCategory: (id: string) =>
    api.patch<boolean>(`/admin/categories/${id}/toggle`).catch(() => api.patch<boolean>(`/categories/${id}/toggle`)),

  // Stores
  getStores: () =>
    api.get<any[]>('/admin/stores').catch(() => api.get<any[]>('/stores?includeInactive=true')),
  getGovernorates: () => api.get<{id:string;name:string}[]>('/governorates'),
  addGovernorate: (name:string) => api.post<{id:string;name:string}>('/admin/governorates',{name}),
  updateGovernorate: (id:string, name:string) => api.put<{id:string;name:string}>(`/admin/governorates/${id}`,{name}),
  deleteGovernorate: (id:string) => api.delete<void>(`/admin/governorates/${id}`),

  createStore: (data: any) =>
    api.post<any>('/admin/stores', data),

  updateStore: (id: string, data: any) =>
    api.put<any>(`/admin/stores/${id}`, data),

  toggleStore: (id: string) =>
    api.patch<boolean>(`/admin/stores/${id}/toggle`).catch(() => api.patch<boolean>(`/stores/${id}/toggle`)),

  // Audit Logs
  getAuditLogs: () =>
    api.get<any[]>('/admin/audit-logs'),

  // Deals & Bundles
  getDeals: () =>
    api.get<any[]>('/admin/deals'),

  saveDeals: (deals: any[]) =>
    api.post<any>('/admin/deals', deals),

  getProductPriceChanges: (flaggedForReview?: boolean) => {
    const query = flaggedForReview === undefined ? '' : `?flaggedForReview=${flaggedForReview}`;
    return api.get<{
      items: AdminProductPriceChange[];
      reviewThresholdConfigured: boolean;
      reviewThresholdPercentage: number | null;
    }>(`/admin/price-changes${query}`);
  },
  getPriceChangeComplaints: () => api.get<AdminPriceChangeComplaint[]>('/admin/price-changes/complaints'),
  updatePriceChangeComplaint: (id: string, status: 'REVIEWING' | 'RESOLVED', resolutionNotes?: string) =>
    api.patch<any>(`/admin/price-changes/complaints/${id}/status`, { status, resolutionNotes }),
  setPriceChangeReviewThreshold: (percentage: number | null) =>
    api.put<{ reviewThresholdConfigured: boolean; reviewThresholdPercentage: number | null }>(
      '/admin/price-changes/review-threshold', { percentage }
    ),

  getAppVersionConfigurations: () => api.get<AdminAppVersionConfiguration[]>('/admin/app-versions'),
  updateAppVersionConfiguration: (
    appType: ManagedAppType,
    platform: ManagedPlatform,
    data: Omit<AdminAppVersionConfiguration, 'id' | 'appType' | 'platform' | 'updatedAt'>,
  ) => api.put<AdminAppVersionConfiguration>(`/admin/app-versions/${appType}/${platform}`, data),
  getMaintenanceState: () => api.get<AdminMaintenanceState>('/admin/system/maintenance'),
  setMaintenanceState: (data: Pick<AdminMaintenanceState, 'maintenance' | 'title' | 'message' | 'expectedEndAt'>) =>
    api.put<AdminMaintenanceState>('/admin/system/maintenance', data),
  getBroadcastHistory: (page = 1, pageSize = 30) =>
    api.get<{ items: AdminBroadcastHistoryItem[]; page: number; pageSize: number }>(`/admin/notifications/broadcasts?page=${page}&pageSize=${pageSize}`),
  createCustomerBroadcast: (data: { type: BroadcastType; title: string; body: string }) =>
    api.post<{ id: string; type: BroadcastType; title: string; body: string; status: string; createdAt: string }>(
      '/admin/notifications/broadcasts', data,
    ),
};
