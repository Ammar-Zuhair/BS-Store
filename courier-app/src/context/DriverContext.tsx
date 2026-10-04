import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DriverProfile,
  ActiveDeliveryTask,
  DriverWalletSummary,
  DriverTransaction,
  ShiftStatus,
  TaskStop,
  TaskPurchasedItem,
} from '../types';
import { authApi, driverApi } from '../api';

export type CourierScreenName = 'dashboard' | 'route' | 'purchase' | 'wallet';

interface DriverContextType {
  currentScreen: CourierScreenName;
  navigateTo: (screen: CourierScreenName) => void;
  driver: DriverProfile;
  toggleShiftStatus: () => Promise<void>;
  activeTask: ActiveDeliveryTask | null;
  completeStop: (stopId: string) => void;
  recordStorePurchase: () => Promise<void>;
  completeDeliveryAndCollect: (cashAdjustmentSettled: boolean) => Promise<void>;
  wallet: DriverWalletSummary;
  transactions: DriverTransaction[];
  requestSettlement: (amount: number) => Promise<void>;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  isSessionRestoring: boolean;
  acceptCurrentOrder: () => Promise<void>;
  authenticated: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (name: string, phone: string, password: string, governorateId: string) => Promise<void>;
}

const DEFAULT_PROFILE: DriverProfile = {
  id: '',
  name: '',
  phone: '',
  rating: 0,
  reviewsCount: 0,
  vehicleType: '',
  vehiclePlate: '',
  shiftStatus: 'OFFLINE',
  shiftDuration: '0',
};

const DEFAULT_WALLET: DriverWalletSummary = {
  currentCashCustody: 0,
  todayEarnings: 0,
  completedTripsToday: 0,
  totalDistanceTodayKm: 0,
  profitSharePercent: 10,
};

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<CourierScreenName>('dashboard');
  const [driver, setDriver] = useState<DriverProfile>(DEFAULT_PROFILE);
  const [activeTask, setActiveTask] = useState<ActiveDeliveryTask | null>(null);
  const [wallet, setWallet] = useState<DriverWalletSummary>(DEFAULT_WALLET);
  const [transactions, setTransactions] = useState<DriverTransaction[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);

  const signIn = async (phone: string, password: string) => {
    const res = await authApi.login(phone, password);
    setDriver((prev) => ({ ...prev, id: res.user.id, name: res.user.fullName || res.user.name || '', phone: res.user.phone }));
    setAuthenticated(true);
  };

  const signUp = async (name: string, phone: string, password: string, governorateId: string): Promise<void> => {
    await authApi.register(name, phone, password, governorateId);
  };

  const navigateTo = (screen: CourierScreenName) => {
    setCurrentScreen(screen);
  };

  const mapOrderToTask = (order: any): ActiveDeliveryTask | null => {
    if (!order) return null;

    const stops: TaskStop[] = [];
    (order.subOrders || []).forEach((so: any) => {
      stops.push({
        id: `stop-store-${so.id}`,
        type: 'PICKUP_STORE',
        name: so.storeName,
        address: so.storeAddress || so.storeName || '',
        latitude: Number(so.storeLatitude) || 0,
        longitude: Number(so.storeLongitude) || 0,
        status: so.purchaseConfirmed || so.actualPurchaseCost != null ? 'COMPLETED' : 'PENDING',
        isExternalPurchase: true,
        storePhone: so.storePhone || '',
        notes: `استلام طلب متجر ${so.storeName}`,
      });
    });

    stops.push({
      id: `stop-customer-${order.id}`,
      type: 'DELIVERY_CUSTOMER',
      name: order.customerName || 'العميل',
      address: order.deliveryAddress || '',
      latitude: Number(order.customerLatitude) || 0,
      longitude: Number(order.customerLongitude) || 0,
      status: 'PENDING',
      isExternalPurchase: false,
      notes: order.notes,
    });

    const itemsToPurchase: TaskPurchasedItem[] = (order.subOrders || []).flatMap((so: any) =>
      (so.items || []).map((i: any) => ({
        id: i.id,
        name: i.productNameSnapshot,
        quantity: i.quantity,
        customerPrice: Number(i.unitPrice) || 0,
        imageUrl: i.imageUrl || '',
        storeId: so.storeId,
        storeName: so.storeName,
      }))
    );

    const completedStops = stops.filter((s) => s.status === 'COMPLETED').length;
    const rawStatus = String(order.status ?? '').toLowerCase();
    const numericStatus = Number(order.status);
    const taskStatus: ActiveDeliveryTask['status'] =
      numericStatus === 9 || rawStatus === 'delivered' ? 'DELIVERED' :
      numericStatus === 8 || rawStatus === 'outfordelivery' ? 'EN_ROUTE_DELIVERY' :
      numericStatus === 7 || rawStatus === 'warehousepickup' ? 'EN_ROUTE_PICKUP' :
      numericStatus === 5 || numericStatus === 6 || rawStatus === 'driveraccepted' || rawStatus === 'purchasing' ? 'PURCHASING' :
      'ASSIGNED';

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.deliveryAddress || '',
      stops,
      currentStopIndex: Math.min(completedStops, stops.length - 1),
      itemsToPurchase,
      subtotalProducts: order.subTotal,
      deliveryFee: order.deliveryFee,
      driverProfitSharePercent: Number(order.driverProfitSharePercent ?? 10),
      driverEstimatedEarnings: Number(order.driverEstimatedEarnings ?? 0),
      amountToCollect: Number(order.cashDueAtDelivery ?? order.totalAmount) || 0,
      transferredAmount: Number(order.transferredAmount ?? 0) || 0,
      cashRefundAtDelivery: Number(order.cashRefundAtDelivery ?? 0) || 0,
      paymentMethod: order.paymentMethod === 1 || order.paymentMethod === 'ManualTransfer' ? 'MANUAL_TRANSFER' : 'CASH_ON_DELIVERY',
      isTransferAmountConfirmed: order.paymentMethod === 1 || order.paymentMethod === 'ManualTransfer'
        ? order.transferAmountConfirmed === true
        : true,
      isPaymentVerified: order.paymentStatus === 1 || order.paymentStatus === 'Verified',
      deliveryNotes: order.notes,
      totalDistanceKm: 4.8,
      estimatedMinutes: 25,
      status: taskStatus,
    };
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Status
      try {
        const status = await driverApi.getStatus();
        setDriver((prev) => ({
          ...prev,
          id: status.driverId,
          name: status.fullName,
          phone: status.phone,
          shiftStatus: status.status === 0 ? 'ONLINE' : status.status === 2 ? 'BUSY' : 'OFFLINE',
        }));
        setWallet((w) => ({
          ...w,
          completedTripsToday: Number(status.todayCompletedOrders ?? status.completedTodayCount ?? 0),
          todayEarnings: Number(status.todayEarnings ?? 0),
          totalDistanceTodayKm: Number(status.todayCompletedOrders ?? status.completedTodayCount ?? 0) * 4.5,
          profitSharePercent: Number(status.profitSharePercent ?? 10),
        }));
      } catch (e) {
        console.warn('Driver status warning:', e);
      }

      // 2. Current active order
      try {
        const curOrder = await driverApi.getCurrentOrder();
        setActiveTask(mapOrderToTask(curOrder));
      } catch (e) {
        console.warn('Driver current order warning:', e);
      }

      // 3. Financial Summary
      try {
        const fin = await driverApi.getFinancialSummary();
        setWallet((w) => ({
          ...w,
          currentCashCustody: Number(fin.outstandingCustodyBalance ?? (fin as any).netOutstandingDebt ?? 0),
        }));
      } catch (e) {
        console.warn('Driver financial summary warning:', e);
      }

      // 4. Financial Transactions
      try {
        const txs = await driverApi.getFinancialTransactions();
        const mappedTxs: DriverTransaction[] = txs.map((t: any) => ({
          id: t.id,
          type: t.type === 0 || t.type === 'CustomerCollection' ? 'CUSTOMER_COLLECTION'
            : t.type === 1 || t.type === 'StorePurchase' ? 'STORE_PURCHASE'
              : t.type === 7 || t.type === 'DriverEarning' ? 'DRIVER_EARNING' : 'COMPANY_SETTLEMENT',
          amount: t.amount,
          direction: t.direction === 0 ? 'DEBIT' : 'CREDIT',
          referenceNumber: t.reference || `#${String(t.id || '').slice(0, 6)}`,
          description: t.description || 'حركة مالية',
          date: new Date(t.createdAt || Date.now()).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        }));
        setTransactions(mappedTxs);
      } catch (e) {
        console.warn('Driver transactions warning:', e);
      }

    } catch (e) {
      console.warn('Driver refreshData error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    authApi.restoreSession()
      .then((user) => {
        if (!active || !user) return;
        setDriver((prev) => ({ ...prev, id: user.id, name: user.fullName || user.name || '', phone: user.phone }));
        setAuthenticated(true);
      })
      .catch((error) => console.warn('تعذر التحقق من جلسة الموصل المحفوظة:', error))
      .finally(() => { if (active) setIsSessionRestoring(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authenticated) void refreshData();
  }, [authenticated]);

  const toggleShiftStatus = async () => {
    const nextStatus = driver.shiftStatus === 'ONLINE' ? 1 : 0;
    try {
      await driverApi.updateStatus(nextStatus);
      setDriver((prev) => ({
        ...prev,
        shiftStatus: nextStatus === 0 ? 'ONLINE' : 'OFFLINE',
      }));
    } catch (e) {
      console.error('Failed to update shift status:', e);
    }
  };

  const acceptCurrentOrder = async () => {
    if (!activeTask) return;
    try {
      await driverApi.acceptOrder(activeTask.id);
      await refreshData();
    } catch (e) {
      console.error('Failed to accept order:', e);
    }
  };

  const completeStop = (stopId: string) => {
    if (!activeTask) return;
    setActiveTask((prev) => {
      if (!prev) return null;
      const updatedStops = prev.stops.map((s) =>
        s.id === stopId ? { ...s, status: 'COMPLETED' as const } : s
      );
      const nextIdx = Math.min(prev.currentStopIndex + 1, prev.stops.length - 1);
      return {
        ...prev,
        stops: updatedStops,
        currentStopIndex: nextIdx,
      };
    });
  };

  const recordStorePurchase = async () => {
    if (!activeTask) return;

    const currentStoreStop = activeTask.stops.find((stop) => stop.type === 'PICKUP_STORE' && stop.status !== 'COMPLETED');
    if (!currentStoreStop) throw new Error('لا يوجد متجر بانتظار تأكيد الشراء');
    const subOrderId = currentStoreStop.id.replace('stop-store-', '');

    try {
      try {
        await driverApi.confirmStorePurchase(activeTask.id, subOrderId);
      } catch (error) {
        if ((error as any)?.status !== 409) throw error;
        await refreshData();
        await driverApi.confirmStorePurchase(activeTask.id, subOrderId);
      }

      await refreshData();
      navigateTo('route');
    } catch (e) {
      console.error('Failed to record purchase:', e);
      if ((e as any)?.status === 409) await refreshData();
      throw e;
    }
  };

  const completeDeliveryAndCollect = async (cashAdjustmentSettled: boolean) => {
    if (!activeTask) return;

    try {
      await driverApi.confirmDelivered(activeTask.id, cashAdjustmentSettled);
      await refreshData();
      navigateTo('dashboard');
    } catch (e) {
      console.error('Failed to complete delivery:', e);
      if ((e as any)?.status === 409) await refreshData();
      throw e;
    }
  };

  const requestSettlement = async (amount: number) => {
    await driverApi.requestSettlement(amount, 'طلب توريد وتصفية العهدة النقدية');
    await refreshData();
  };

  return (
    <DriverContext.Provider
      value={{
      currentScreen,
        authenticated,
        isRefreshing,
        isSessionRestoring,
      signIn,
      signUp,
        navigateTo,
        driver,
        toggleShiftStatus,
        activeTask,
        completeStop,
        recordStorePurchase,
        completeDeliveryAndCollect,
        wallet,
        transactions,
        requestSettlement,
        refreshData,
        acceptCurrentOrder,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
};

export const useDriver = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};
