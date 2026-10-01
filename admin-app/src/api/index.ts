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
    api.setToken(res.accessToken);
    api.setRefreshToken(res.refreshToken);
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
      { phone, password }
    );
    api.setToken(res.accessToken);
    api.setRefreshToken(res.refreshToken);
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
  getDashboard: () =>
    api.get<{
      ordersToday: number;
      salesToday: number;
      pendingPayments: number;
      searchingDriverOrders: number;
      activeDrivers: number;
      lowStock: number;
    }>('/admin/dashboard'),

  getOrders: (status?: string) => {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<any[]>(`/admin/orders${qs}`);
  },

  assignDriver: (orderId: string, driverId: string) =>
    api.post<any>(`/admin/orders/${orderId}/assign-driver`, { driverId }),
  approveOrder: (orderId: string) => api.post<any>(`/admin/orders/${orderId}/approve`),
  rejectOrder: (orderId: string, reason: string) => api.post<any>(`/admin/orders/${orderId}/reject`, { reason }),

  getPayments: (status?: string) => {
    const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<any[]>(`/admin/payments${qs}`).catch(() => api.get<any[]>('/admin/payments/pending'));
  },

  getPendingPayments: () =>
    api.get<any[]>('/admin/payments/pending').catch(() => api.get<any[]>('/admin/payments')),

  approvePayment: (paymentId: string) =>
    api.post<any>(`/admin/payments/${paymentId}/approve`),

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
  createAdmin: (fullName: string, phone: string, password: string) => api.post<any>('/admin/admins', { fullName, phone, password }),

  createSettlement: (driverId: string, amount: number, note?: string) =>
    api.post<any>(`/admin/drivers/${driverId}/settlement`, { amount, note }),

  getInventory: () =>
    api.get<any[]>('/admin/inventory'),

  addInventoryTransaction: (data: {
    productId: string;
    type: number;
    quantity: number;
    reference?: string;
    note?: string;
  }) => api.post<any>('/admin/inventory/transactions', data),

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
    return api.get<{ items: any[]; page: number; totalCount: number }>(`/products${qs ? `?${qs}` : ''}`);
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
};
