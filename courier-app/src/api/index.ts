import { api } from './client';

export { api };

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (phone: string, password = 'DriverPassword123!') => {
    const res = await api.post<{ accessToken: string; user: { id: string; name: string; phone: string; role: string } }>(
      '/auth/login',
      { phone, password }
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

// ─── Driver API ──────────────────────────────────────────────────────────────
export const driverApi = {
  getStatus: () =>
    api.get<{
      driverId: string;
      fullName: string;
      phone: string;
      status: number; // 0: Offline, 1: Online, 2: Busy
      isShiftActive: boolean;
      todayCompletedOrders: number;
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
    receiptImageUrl?: string;
    itemDetails?: { orderItemId: string; actualPrice: number }[];
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
};
