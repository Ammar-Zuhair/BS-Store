import { api } from './client';

export { api };

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (fullName: string, phone: string, password: string, governorateId: string) =>
    api.post<{ message: string }>('/driver-applications', { fullName, phone, password, governorateId }),

  login: async (phone: string, password = 'DriverPassword123!') => {
    await api.clearSession();
    const res = await api.post<{ accessToken: string; refreshToken: string; user: { id: string; fullName?: string; name?: string; phone: string; role: string } }>(
      '/auth/login',
      { phone, password }
    );
    if (res.user?.role !== 'Driver') throw new Error('هذا الحساب غير مسجل كموصل.');
    await api.setToken(res.accessToken);
    await api.setRefreshToken(res.refreshToken);
    return res;
  },

  me: () => api.get<{ id: string; fullName?: string; name?: string; phone: string; role: string }>('/auth/me'),

  restoreSession: async () => {
    if (!await api.initSession()) return null;
    try {
      const user = await authApi.me();
      if (user.role !== 'Driver') { await api.clearSession(); return null; }
      return user;
    } catch (error: any) {
      if (error?.status === 401) await api.clearSession();
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await api.clearSession();
    }
  },
};

// ─── Driver API ──────────────────────────────────────────────────────────────
export const driverApi = {
  governorates: () => api.get<{id:string;name:string}[]>('/governorates'),
  myGovernorate: () => api.get<{governorateId:string|null}>('/profile/governorate'),
  updateGovernorate: (governorateId:string) => api.put('/profile/governorate',{governorateId}),
  getStatus: () =>
    api.get<{
      driverId: string;
      fullName: string;
      phone: string;
      status: number; // 0: Offline, 1: Online, 2: Busy
      isShiftActive: boolean;
      todayCompletedOrders: number;
      completedTodayCount?: number;
      todayEarnings?: number;
      profitSharePercent?: number;
    }>('/driver/status'),

  updateStatus: (status: number) =>
    api.put<any>('/driver/status', { status }),

  getCurrentOrder: () =>
    api.get<any | null>('/driver/current-order'),

  acceptOrder: (orderId: string) =>
    api.put<any>(`/driver/orders/${orderId}/accept`),

  startPriceChangeContact: (orderId: string, data: {
    subOrderId: string;
    orderItemId: string;
    observedCatalogPrice: number;
    proposedStorePrice: number;
  }) => api.post<{ id: string; contactInitiatedAt: string }>(`/driver/orders/${orderId}/price-change-contact`, data),

  recordPurchase: (orderId: string, data: {
    subOrderId: string;
    idempotencyKey: string;
    itemDetails: {
      orderItemId: string;
      actualPrice: number;
      observedCatalogPrice?: number;
      priceChangeContactAttemptId?: string;
      customerContactConfirmed?: boolean;
    }[];
  }) => api.post<any>(`/driver/orders/${orderId}/record-purchase`, data),

  confirmDelivered: (orderId: string, cashAdjustmentSettled: boolean) =>
    api.put<any>(`/driver/orders/${orderId}/delivered`, { cashAdjustmentSettled }),

  getFinancialSummary: () =>
    api.get<{
      totalCustomerCollections: number;
      totalStorePurchases: number;
      totalCompanySettlements: number;
      totalDriverFunding: number;
      outstandingCustodyBalance: number;
    }>('/driver/financial/summary'),

  getFinancialTransactions: () =>
    api.get<any[]>('/driver/financial/transactions'),

  requestSettlement: (amount: number, note?: string) =>
    api.post<any>('/driver/financial/settlements', { amount, note }),
};
