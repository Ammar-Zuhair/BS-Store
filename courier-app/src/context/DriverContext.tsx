import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  DriverProfile,
  ActiveDeliveryTask,
  DriverWalletSummary,
  DriverTransaction,
  ShiftStatus,
  TaskStop,
  TaskPurchasedItem,
} from '../types';
import { runLimited } from '../utils/requests';
import { api, authApi, driverApi } from '../api';
import { unregisterPushDevice } from '../notifications';
import { AppState, Alert } from 'react-native';
import { LOCATION_INTERVAL, prepareLocationTracking, startLocationTracking, stopLocationTracking, publishCurrentLocation } from '../location/tracking';

export type CourierScreenName = 'dashboard' | 'route' | 'purchase' | 'wallet';

interface DriverContextType {
  currentScreen: CourierScreenName;
  navigateTo: (screen: CourierScreenName) => void;
  navigateBack: () => void;
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
  signOut: () => Promise<void>;
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
  const currentScreenRef = useRef<CourierScreenName>('dashboard');
  const screenHistoryRef = useRef<CourierScreenName[]>([]);
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

  const signOut = async () => {
    await stopLocationTracking();
    if (driver.shiftStatus === 'ONLINE' || driver.shiftStatus === 'BUSY') {
      try { await driverApi.updateStatus(1); } catch (error) { console.warn('تعذر تحويل حالة الموصل إلى غير متصل:', error); }
    }
    try { await unregisterPushDevice(api); } catch (error) { console.warn('تعذر إلغاء تسجيل إشعارات الموصل:', error); }
    try { await authApi.logout(); } catch (error) {
      console.warn('تعذر إلغاء جلسة الموصل على الخادم:', error);
    } finally {
      setAuthenticated(false);
      setDriver(DEFAULT_PROFILE);
      setActiveTask(null);
      setWallet(DEFAULT_WALLET);
      setTransactions([]);
      currentScreenRef.current = 'dashboard';
      screenHistoryRef.current = [];
      setCurrentScreen('dashboard');
    }
  };

  const navigateTo = (screen: CourierScreenName) => {
    if (currentScreenRef.current === screen) return;
    screenHistoryRef.current.push(currentScreenRef.current);
    currentScreenRef.current = screen;
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    const previousScreen = screenHistoryRef.current.pop() ?? 'dashboard';
    currentScreenRef.current = previousScreen;
    setCurrentScreen(previousScreen);
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
        baseName: i.baseProductName, selectedOptions: i.selectedOptions, bundleTitle: i.bundleTitle, bundleGroupId: i.bundleGroupId,
        quantity: i.quantity,
        customerPrice: Number(i.unitPrice) || 0,
        imageUrl: i.imageUrl || '',
        subOrderId: so.id,
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

  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshData = (fresh = false): Promise<void> => {
    if (refreshInFlight.current) {
      const previous = refreshInFlight.current;
      return fresh ? previous.then(() => refreshData(true)) : previous;
    }
    setIsRefreshing(true);
    const pending = runLimited([
        async () => {
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


        },
        async () => {
      // 2. Current active order
      try {
        const curOrder = await driverApi.getCurrentOrder();
        setActiveTask(mapOrderToTask(curOrder));
      } catch (e) {
        console.warn('Driver current order warning:', e);
      }


        },
        async () => {
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


        },
        async () => {
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

        },
    ], 3).finally(() => {
      if (refreshInFlight.current === pending) refreshInFlight.current = null;
      setIsRefreshing(false);
    });
    refreshInFlight.current = pending;
    return pending;
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

  useEffect(() => {
    if (isSessionRestoring) return;
    if (!authenticated || driver.shiftStatus === 'OFFLINE') {
      void stopLocationTracking().catch(() => {});
      return;
    }
    let active = true;
    const reportError = (error: unknown) => {
      if (active) Alert.alert('تعذر تحديث الموقع', (error as Error)?.message || 'تحقق من صلاحيات الموقع والاتصال.');
    };
    // A restored shift must already have native permissions; no prompts from the background.
    void startLocationTracking().catch(reportError);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void publishCurrentLocation().catch(() => {});
    }, LOCATION_INTERVAL);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void publishCurrentLocation().catch(() => {});
        void refreshData();
      }
    });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [authenticated, isSessionRestoring, driver.shiftStatus]);

  const toggleShiftStatus = async () => {
    if (driver.shiftStatus === 'BUSY') throw new Error('أكمل الطلب الحالي قبل إنهاء الوردية.');
    const nextStatus = driver.shiftStatus === 'ONLINE' ? 1 : 0;
    if (nextStatus === 0) await prepareLocationTracking();
    await driverApi.updateStatus(nextStatus);
    if (nextStatus === 1) await stopLocationTracking();
    setDriver(prev => ({ ...prev, shiftStatus: nextStatus === 0 ? 'ONLINE' : 'OFFLINE' }));
  };

  const acceptCurrentOrder = async () => {
    if (!activeTask) return;
    try {
      const accepted = await driverApi.acceptOrder(activeTask.id);
      setActiveTask(mapOrderToTask(accepted));
      setDriver(prev => ({ ...prev, shiftStatus: 'BUSY' }));
      void refreshData(true);
    } catch (e) {
      console.error('Failed to accept order:', e);
      if ((e as any)?.status === 409) await refreshData(true);
      throw e;
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
        await refreshData(true);
        await driverApi.confirmStorePurchase(activeTask.id, subOrderId);
      }

      await refreshData(true);
      navigateBack();
    } catch (e) {
      console.error('Failed to record purchase:', e);
      if ((e as any)?.status === 409) await refreshData(true);
      throw e;
    }
  };

  const completeDeliveryAndCollect = async (cashAdjustmentSettled: boolean) => {
    if (!activeTask) return;

    try {
      await driverApi.confirmDelivered(activeTask.id, cashAdjustmentSettled);
      await refreshData(true);
      navigateBack();
    } catch (e) {
      console.error('Failed to complete delivery:', e);
      if ((e as any)?.status === 409) await refreshData(true);
      throw e;
    }
  };

  const requestSettlement = async (amount: number) => {
    await driverApi.requestSettlement(amount, 'طلب توريد وتصفية العهدة النقدية');
    await refreshData(true);
  };

  return (
    <DriverContext.Provider
      value={{
      currentScreen,
        navigateBack,
        authenticated,
        isRefreshing,
        isSessionRestoring,
      signIn,
      signUp,
      signOut,
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
