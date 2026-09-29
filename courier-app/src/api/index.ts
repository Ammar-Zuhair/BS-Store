import { api, API_BASE_URL } from './client';

export { api };

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (fullName: string, phone: string, password: string, governorateId: string) =>
    api.post<{ message: string }>('/driver-applications', { fullName, phone, password, governorateId }),

  login: async (phone: string, password = 'DriverPassword123!') => {
    const res = await api.post<{ accessToken: string; user: { id: string; name: string; phone: string; role: string } }>(
      '/auth/login',
      { phone, password }
    );
    if (res.user?.role !== 'Driver') throw new Error('هذا الحساب غير مسجل كموصل.');
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

// ─── Driver API ──────────────────────────────────────────────────────────────
export const driverApi = {
  governorates: () => api.get<{id:string;name:string}[]>('/governorates'),
  myGovernorate: () => api.get<{governorateId:string|null}>('/profile/governorate'),
  updateGovernorate: (governorateId:string) => api.put('/profile/governorate',{governorateId}),
  uploadReceipt: async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const form = new FormData();
    form.append('file', blob, `receipt-${Date.now()}.jpg`);
    const uploaded = await api.post<string>('/driver/receipts', form);
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}${uploaded}`;
  },
  getStatus: () =>
    api.get<{
      driverId: string;
      fullName: string;
      phone: string;
      status: number; // 0: Offline, 1: Online, 2: Busy
      isShiftActive: boolean;
      todayCompletedOrders: number;
      completedTodayCount?: number;
    }>('/driver/status'),

  updateStatus: (status: number) =>
    api.put<any>('/driver/status', { status }),

  getCurrentOrder: () =>
    api.get<any | null>('/driver/current-order'),

  getOrderHistory: () =>
    api.get<any[]>('/driver/orders/history'),

  acceptOrder: (orderId: string) =>
    api.put<any>(`/driver/orders/${orderId}/accept`),

  recordPurchase: (orderId: string, data: {
    subOrderId: string;
    actualPurchasePrice: number;
    itemDetails?: { orderItemId: string; actualPrice: number }[];
    receiptImageUrl?: string;
  }) => api.post<any>(`/driver/orders/${orderId}/record-purchase`, data),

  confirmDelivered: (orderId: string) =>
    api.put<any>(`/driver/orders/${orderId}/delivered`),

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
