import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DriverProfile,
  ActiveDeliveryTask,
  DriverWalletSummary,
  DriverTransaction,
  ShiftStatus,
  OrderInvoice,
  TaskStop,
  TaskPurchasedItem,
} from '../types';
import { authApi, driverApi } from '../api';

export type CourierScreenName = 'dashboard' | 'route' | 'invoices' | 'purchase_receipt' | 'wallet';

interface DriverContextType {
  currentScreen: CourierScreenName;
  navigateTo: (screen: CourierScreenName) => void;
  driver: DriverProfile;
  toggleShiftStatus: () => Promise<void>;
  activeTask: ActiveDeliveryTask | null;
  completeStop: (stopId: string) => void;
  savePurchaseDocumentation: (
    items: { id: string; actualPrice: number }[],
    receiptUrl: string
  ) => Promise<void>;
  completeDeliveryAndCollect: () => Promise<void>;
  wallet: DriverWalletSummary;
  transactions: DriverTransaction[];
  requestSettlement: (amount: number) => Promise<void>;
  invoices: OrderInvoice[];
  refreshData: () => Promise<void>;
  acceptCurrentOrder: () => Promise<void>;
  authenticated: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (name: string, phone: string, password: string) => Promise<void>;
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
};

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<CourierScreenName>('dashboard');
  const [driver, setDriver] = useState<DriverProfile>(DEFAULT_PROFILE);
  const [activeTask, setActiveTask] = useState<ActiveDeliveryTask | null>(null);
  const [wallet, setWallet] = useState<DriverWalletSummary>(DEFAULT_WALLET);
  const [transactions, setTransactions] = useState<DriverTransaction[]>([]);
  const [invoices, setInvoices] = useState<OrderInvoice[]>([]);
  const [authenticated, setAuthenticated] = useState(false);

  const signIn = async (phone: string, password: string) => {
    await authApi.login(phone, password);
    setAuthenticated(true);
  };

  const signUp = async (name: string, phone: string, password: string): Promise<void> => {
    await authApi.register(name, phone, password);
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
        status: so.actualPurchaseCost ? 'COMPLETED' : 'PENDING',
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
        expectedPrice: Number(i.expectedPurchasePrice) || 0,
        actualPrice: i.actualPurchasePrice,
        imageUrl: i.imageUrl || '',
        storeId: so.storeId,
        storeName: so.storeName,
      }))
    );

    const completedStops = stops.filter((s) => s.status === 'COMPLETED').length;

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
      amountToCollect: order.totalAmount,
      paymentMethod: order.paymentMethod === 1 || order.paymentMethod === 'ManualTransfer' ? 'MANUAL_TRANSFER' : 'CASH_ON_DELIVERY',
      isPaymentVerified: order.paymentStatus === 1 || order.paymentStatus === 'Verified',
      totalDistanceKm: 4.8,
      estimatedMinutes: 25,
      status: order.status === 4 || order.status === 'Purchasing' ? 'PURCHASING' : order.status === 5 || order.status === 'OutForDelivery' ? 'EN_ROUTE_DELIVERY' : 'ASSIGNED',
    };
  };

  const refreshData = async () => {
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
          completedTripsToday: status.todayCompletedOrders,
          todayEarnings: status.todayCompletedOrders * 800,
          totalDistanceTodayKm: status.todayCompletedOrders * 4.5,
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
          currentCashCustody: fin.outstandingCustodyBalance,
        }));
      } catch (e) {
        console.warn('Driver financial summary warning:', e);
      }

      // 4. Financial Transactions
      try {
        const txs = await driverApi.getFinancialTransactions();
        const mappedTxs: DriverTransaction[] = txs.map((t: any) => ({
          id: t.id,
          type: t.type === 0 ? 'CUSTOMER_COLLECTION' : t.type === 1 ? 'STORE_PURCHASE' : 'COMPANY_SETTLEMENT',
          amount: t.amount,
          direction: t.direction === 0 ? 'DEBIT' : 'CREDIT',
          referenceNumber: t.reference || `#${t.id.slice(0, 6)}`,
          description: t.description || 'حركة مالية',
          date: new Date(t.createdAt || Date.now()).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        }));
        setTransactions(mappedTxs);
      } catch (e) {
        console.warn('Driver transactions warning:', e);
      }

      // 5. Order History / Invoices
      try {
        const hist = await driverApi.getOrderHistory();
        const mappedInvoices: OrderInvoice[] = hist.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          storeName: o.subOrders?.[0]?.storeName || 'متاجر متعددة',
          invoiceNumber: `INV-${o.orderNumber}`,
          amount: o.totalAmount,
          receiptImageUrl: o.receiptImageUrl || '',
          status: 'APPROVED',
          uploadedAt: new Date(o.createdAt || Date.now()).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
          itemsCount: o.subOrders?.reduce((acc: number, so: any) => acc + (so.items?.length || 0), 0) || 1,
        }));
        setInvoices(mappedInvoices);
      } catch (e) {
        console.warn('Driver order history warning:', e);
      }
    } catch (e) {
      console.warn('Driver refreshData error:', e);
    }
  };

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

  const savePurchaseDocumentation = async (
    items: { id: string; actualPrice: number }[],
    receiptUrl: string
  ) => {
    if (!activeTask) return;

    try {
      const subOrderId = activeTask.stops[0]?.id.replace('stop-store-', '') || '';
      const totalSpent = items.reduce((acc, it) => {
        const taskItem = activeTask.itemsToPurchase.find((item) => item.id === it.id);
        return acc + it.actualPrice * (taskItem?.quantity || 1);
      }, 0);

      await driverApi.recordPurchase(activeTask.id, {
        subOrderId,
        actualPurchasePrice: totalSpent,
        receiptImageUrl: receiptUrl,
        itemDetails: items.map((it) => ({
          orderItemId: it.id,
          actualPrice: it.actualPrice,
        })),
      });

      await refreshData();
      navigateTo('route');
    } catch (e) {
      console.error('Failed to record purchase:', e);
      throw e;
    }
  };

  const completeDeliveryAndCollect = async () => {
    if (!activeTask) return;

    try {
      await driverApi.confirmDelivered(activeTask.id);
      await refreshData();
      navigateTo('dashboard');
    } catch (e) {
      console.error('Failed to complete delivery:', e);
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
      signIn,
      signUp,
        navigateTo,
        driver,
        toggleShiftStatus,
        activeTask,
        completeStop,
        savePurchaseDocumentation,
        completeDeliveryAndCollect,
        wallet,
        transactions,
        requestSettlement,
        invoices,
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
