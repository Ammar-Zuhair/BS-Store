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
  requestSettlement: (amount: number) => void;
  invoices: OrderInvoice[];
  uploadOrderInvoice: (
    invoice: Omit<OrderInvoice, 'id' | 'status' | 'uploadedAt'>
  ) => void;
  refreshData: () => Promise<void>;
  acceptCurrentOrder: () => Promise<void>;
}

const DEFAULT_PROFILE: DriverProfile = {
  id: 'driver-1',
  name: 'الكابتن أحمد الصالحي',
  phone: '777000222',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  rating: 4.9,
  reviewsCount: 142,
  vehicleType: 'دراجة نارية TVS HLX',
  vehiclePlate: 'صنعاء 1/45892',
  shiftStatus: 'ONLINE',
  shiftDuration: '04:15:30',
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
        address: 'صنعاء، المركز التجاري',
        latitude: 15.35,
        longitude: 44.20,
        status: so.actualPurchaseCost ? 'COMPLETED' : 'PENDING',
        isExternalPurchase: true,
        storePhone: '777000000',
        notes: `استلام طلب متجر ${so.storeName}`,
      });
    });

    stops.push({
      id: `stop-customer-${order.id}`,
      type: 'DELIVERY_CUSTOMER',
      name: order.customerName || 'العميل',
      address: order.addressSummary || 'صنعاء، اليمن',
      latitude: 15.36,
      longitude: 44.21,
      status: 'PENDING',
      isExternalPurchase: false,
      notes: order.notes,
    });

    const itemsToPurchase: TaskPurchasedItem[] = (order.subOrders || []).flatMap((so: any) =>
      (so.items || []).map((i: any) => ({
        id: i.id,
        name: i.productNameSnapshot,
        quantity: i.quantity,
        expectedPrice: Math.round((i.sellingPriceSnapshot || 0) * 0.8),
        actualPrice: i.actualPurchasePrice,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        storeId: so.storeId,
        storeName: so.storeName,
      }))
    );

    const completedStops = stops.filter((s) => s.status === 'COMPLETED').length;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || 'عميل المنصة',
      customerPhone: order.customerPhone || '777000111',
      customerAddress: order.addressSummary || 'صنعاء، اليمن',
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
          shiftStatus: status.status === 1 ? 'ONLINE' : status.status === 2 ? 'BUSY' : 'OFFLINE',
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
          receiptImageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80',
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
    // Authenticate as driver on mount to wire with live database
    authApi
      .login('777000222', 'DriverPassword123!')
      .then(() => refreshData())
      .catch((e) => {
        console.warn('Driver initial login warning:', e);
      });
  }, []);

  const toggleShiftStatus = async () => {
    const nextStatus = driver.shiftStatus === 'ONLINE' ? 0 : 1;
    try {
      await driverApi.updateStatus(nextStatus);
      setDriver((prev) => ({
        ...prev,
        shiftStatus: nextStatus === 1 ? 'ONLINE' : 'OFFLINE',
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
      const totalSpent = items.reduce((acc, it) => acc + it.actualPrice, 0);

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

  const requestSettlement = (amount: number) => {
    const settleTx: DriverTransaction = {
      id: `tx-${Date.now()}`,
      type: 'COMPANY_SETTLEMENT',
      amount,
      direction: 'CREDIT',
      referenceNumber: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      description: 'طلب توريد وتصفية عهدة نقدية للإدارة',
      date: 'الآن',
    };
    setTransactions((prev) => [settleTx, ...prev]);
    setWallet((prev) => ({
      ...prev,
      currentCashCustody: Math.max(0, prev.currentCashCustody - amount),
    }));
  };

  const uploadOrderInvoice = (
    invoiceData: Omit<OrderInvoice, 'id' | 'status' | 'uploadedAt'>
  ) => {
    const newInvoice: OrderInvoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      status: 'PENDING_APPROVAL',
      uploadedAt: 'الآن',
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    const newTx: DriverTransaction = {
      id: `tx-${Date.now()}`,
      type: 'STORE_PURCHASE',
      amount: invoiceData.amount,
      direction: 'CREDIT',
      referenceNumber: `#${invoiceData.orderNumber}`,
      description: `فاتورة شراء متجر ${invoiceData.storeName} (سند ${invoiceData.invoiceNumber})`,
      date: 'الآن',
    };

    setTransactions((prev) => [newTx, ...prev]);
    setWallet((prev) => ({
      ...prev,
      currentCashCustody: Math.max(0, prev.currentCashCustody - invoiceData.amount),
    }));
  };

  return (
    <DriverContext.Provider
      value={{
        currentScreen,
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
        uploadOrderInvoice,
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
