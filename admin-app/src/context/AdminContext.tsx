import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  AdminKPI,
  AdminOrder,
  BankTransferRequest,
  AdminProduct,
  DriverCustodyAccount,
  AuditLog,
  OrderStatus,
  AdminCategory,
  AdminSubCategory,
  AdminStore,
  AdminFlashDeal,
  DeliverySettings,
  OrderWorkflowMode,
  FlaggedUser,
} from '../types';
import { adminApi, authApi, api } from '../api';

export type AdminScreenName =
  | 'dashboard'
  | 'orders'
  | 'payments'
  | 'inventory'
  | 'add_product'
  | 'categories'
  | 'financials'
  | 'auth';

export type AdminInventoryTab = 'categories' | 'stores' | 'products' | 'deals';

export interface CaptainInvoice {
  id: string;
  orderNumber: string;
  driverName: string;
  driverPhone: string;
  storeName: string;
  invoiceNumber: string;
  amount: number;
  receiptImageUrl: string;
  uploadedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string;
}

export interface RegisteredUser {
  name: string;
  phone: string;
  email: string;
  city?: string;
  biometricEnabled: boolean;
  registeredAt: string;
}

const DEFAULT_KPI: AdminKPI = {
  salesTotal: 0,
  salesChangePercent: 0,
  grossProfit: 0,
  profitMarginPercent: 0,
  purchaseCostTotal: 0,
  fieldCustodyTotal: 0,
  criticalPendingCount: 0,
  pendingDriverOrdersCount: 0,
  pendingBankTransfersCount: 0,
};

interface AdminContextType {
  currentScreen: AdminScreenName;
  inventoryTabRequest: AdminInventoryTab | null;
  setInventoryTabRequest: (tab: AdminInventoryTab | null) => void;
  navigateTo: (screen: AdminScreenName) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  registeredUser: RegisteredUser | null;
  setRegisteredUser: (user: RegisteredUser | null) => void;
  currentUser: RegisteredUser | null;
  setCurrentUser: (user: RegisteredUser | null) => void;
  login: (phone: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  kpi: AdminKPI;
  timeframe: 'today' | 'week' | 'month';
  setTimeframe: (tf: 'today' | 'week' | 'month') => void;
  orders: AdminOrder[];
  selectedOrder: AdminOrder | null;
  setSelectedOrder: (ord: AdminOrder | null) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, driverName?: string) => Promise<void>;
  bankTransfers: BankTransferRequest[];
  verifyBankTransfer: (id: string, approved: boolean, reason?: string) => Promise<void>;
  captainInvoices: CaptainInvoice[];
  approveCaptainInvoice: (id: string) => Promise<void>;
  rejectCaptainInvoice: (id: string, reason?: string) => Promise<void>;
  products: AdminProduct[];
  addProduct: (product: Omit<AdminProduct, 'id'>) => Promise<void>;
  updateProduct: (productId: string, data: Partial<AdminProduct>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  editingProduct: AdminProduct | null;
  setEditingProduct: (prod: AdminProduct | null) => void;
  adjustInventory: (productId: string, newAvailable: number) => Promise<void>;
  categories: AdminCategory[];
  addCategory: (category: { name: string; icon: string; displayOrder?: number; isActive?: boolean }) => Promise<void>;
  updateCategory: (categoryId: string, data: Partial<AdminCategory>) => Promise<void>;
  toggleCategoryStatus: (categoryId: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addSubCategory: (categoryId: string, subCategory: { name: string; icon: string }) => void;
  updateSubCategory: (categoryId: string, subCategoryId: string, data: Partial<AdminSubCategory>) => void;
  deleteSubCategory: (categoryId: string, subCategoryId: string) => void;
  driverCustodies: DriverCustodyAccount[];
  settleDriverCash: (driverId: string, receivedAmount: number, notes?: string) => Promise<void>;
  auditLogs: AuditLog[];
  stores: AdminStore[];
  addStore: (store: Omit<AdminStore, 'id'>) => Promise<void>;
  updateStore: (storeId: string, data: Partial<AdminStore>) => Promise<void>;
  toggleStoreStatus: (storeId: string) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  deliverySettings: DeliverySettings | null;
  updateDeliverySettings: (settings: Partial<DeliverySettings>) => Promise<void>;
  flashDeals: AdminFlashDeal[];
  addFlashDeal: (deal: Omit<AdminFlashDeal, 'id'>) => void;
  updateFlashDeal: (dealId: string, deal: Omit<AdminFlashDeal, 'id'>) => Promise<void>;
  toggleFlashDealStatus: (dealId: string) => void;
  deleteFlashDeal: (dealId: string) => void;
  toggleProductTopPick: (productId: string) => void;
  orderWorkflowMode: OrderWorkflowMode;
  setOrderWorkflowMode: (mode: OrderWorkflowMode) => void;
  flaggedUsers: FlaggedUser[];
  flagUser: (user: Omit<FlaggedUser, 'id' | 'flaggedAt'>) => void;
  unflagUser: (userId: string) => void;
  banUser: (userId: string) => void;
  unbanUser: (userId: string) => void;
  approveOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<AdminScreenName>('auth');
  const [inventoryTabRequest, setInventoryTabRequest] = useState<AdminInventoryTab | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(null);
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [kpi, setKpi] = useState<AdminKPI>(DEFAULT_KPI);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [bankTransfers, setBankTransfers] = useState<BankTransferRequest[]>([]);
  const [captainInvoices, setCaptainInvoices] = useState<CaptainInvoice[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>({
    isEnabled: true,
    baseFee: 400,
    baseDistanceKm: 1.0,
    perKmFee: 50,
    isDynamicPricingEnabled: true,
  });
  const [driverCustodies, setDriverCustodies] = useState<DriverCustodyAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [flashDeals, setFlashDeals] = useState<AdminFlashDeal[]>([]);
  const [orderWorkflowMode, setOrderWorkflowMode] = useState<OrderWorkflowMode>('MANUAL_APPROVAL');
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);

  // Persistent cache for store product types & categories across API refreshes
  const storeTypesMapRef = useRef<Record<string, string[]>>({});
  const storeCategoryMapRef = useRef<Record<string, { id: string; name: string }>>({});

  const navigateTo = (screen: AdminScreenName) => {
    setCurrentScreen(screen);
  };

  const mapOrderStatus = (status: any): OrderStatus => {
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s.includes('searching')) return 'SEARCHING_DRIVER';
      if (s.includes('driverassigned') || s.includes('driveraccepted')) return 'DRIVER_ASSIGNED';
      if (s.includes('purchas') || s.includes('warehouse')) return 'PURCHASING';
      if (s.includes('outfordelivery')) return 'OUT_FOR_DELIVERY';
      if (s.includes('delivered')) return 'DELIVERED';
      if (s.includes('cancel')) return 'CANCELLED';
      if (s.includes('pendingadminapproval')) return 'PENDING_ADMIN_APPROVAL';
      if (s.includes('pendingpayment') || s.includes('pendingverification')) return 'PAYMENT_PENDING_VERIFICATION';
      return 'CONFIRMED';
    }
    const num = Number(status);
    switch (num) {
      case 0: return 'PAYMENT_PENDING_VERIFICATION';
      case 1: return 'PAYMENT_PENDING_VERIFICATION';
      case 2: return 'CONFIRMED';
      case 3: return 'SEARCHING_DRIVER';
      case 4: return 'DRIVER_ASSIGNED';
      case 5: return 'DRIVER_ASSIGNED';
      case 6: return 'PURCHASING';
      case 7: return 'PURCHASING';
      case 8: return 'OUT_FOR_DELIVERY';
      case 9: return 'DELIVERED';
      case 10: return 'CANCELLED';
      case 13: return 'PENDING_ADMIN_APPROVAL';
      default:
        return 'CONFIRMED';
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // 0. Ensure Admin session exists in development
      if (!api.getToken()) {
        try {
          await authApi.login('777000000', 'AdminPassword123!');
        } catch (authErr) {
          console.warn('Admin auto-auth notice:', authErr);
        }
      }

      // 1. Dashboard KPI
      try {
        const dash = await adminApi.getDashboard();
        setKpi({
          salesTotal: dash.salesToday || 0,
          salesChangePercent: 14.2,
          grossProfit: Math.round((dash.salesToday || 0) * 0.22),
          profitMarginPercent: 22,
          purchaseCostTotal: Math.round((dash.salesToday || 0) * 0.78),
          fieldCustodyTotal: 0,
          criticalPendingCount: (dash.pendingPayments || 0) + (dash.searchingDriverOrders || 0),
          pendingDriverOrdersCount: dash.searchingDriverOrders || 0,
          pendingBankTransfersCount: dash.pendingPayments || 0,
        });
      } catch (e) {
        console.warn('Dashboard fetch error:', e);
      }

      // 2. Orders
      try {
        const ords = await adminApi.getOrders();
        const mappedOrders: AdminOrder[] = ords.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName || (o.customer && o.customer.fullName) || 'عميل المنصة',
          customerPhone: o.customerPhone || (o.customer && (o.customer.phone || (o.customer.user && o.customer.user.phone))) || '',
          createdAt: new Date(o.createdAt || Date.now()).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
          status: mapOrderStatus(o.status),
          subtotal: o.subTotal,
          deliveryFee: o.deliveryFee,
          discount: o.discount,
          totalAmount: o.totalAmount,
          paymentMethod: o.paymentMethod === 1 || o.paymentMethod === 'ManualTransfer' ? 'MANUAL_TRANSFER' : 'CASH_ON_DELIVERY',
          paymentStatus: o.paymentStatus === 1 || o.paymentStatus === 'Verified' ? 'VERIFIED' : o.paymentStatus === 2 || o.paymentStatus === 'Rejected' ? 'REJECTED' : 'PENDING',
          assignedDriverName: o.driverName,
          addressSummary: o.deliveryAddress || o.addressSummary || 'صنعاء، اليمن',
          customerRating: o.customerRating,
          customerReview: o.customerReview,
          notes: o.notes,
          subOrders: (o.subOrders || []).map((so: any) => ({
            id: so.id,
            storeId: so.storeId,
            storeName: so.storeName,
            status: so.status === 'Purchased' ? 'PURCHASED' : 'PENDING',
            subtotal: Number(so.subTotal || 0),
            expectedCost: so.expectedCost != null ? Number(so.expectedCost) : Number(so.subTotal || 0),
            expectedProfit: so.expectedProfit != null ? Number(so.expectedProfit) : Math.max(0, Number(so.subTotal || 0) - (so.expectedCost != null ? Number(so.expectedCost) : Number(so.subTotal || 0))),
            items: (so.items || []).map((i: any) => ({
              productId: i.productId,
              productName: i.productName || i.productNameSnapshot || 'منتج',
              sellingPrice: Number(i.unitPrice ?? i.sellingPriceSnapshot ?? (i.totalPrice && i.quantity ? Math.round(i.totalPrice / i.quantity) : 0)),
              quantity: i.quantity || 1,
              expectedPurchaseCost: i.expectedPurchasePrice != null
                ? Number(i.expectedPurchasePrice)
                : Number(i.unitPrice ?? i.sellingPriceSnapshot ?? 0),
              actualPurchaseCost: i.actualPurchasePrice != null ? Number(i.actualPurchasePrice) : undefined,
            })),
          })),
        }));
        setOrders(mappedOrders);
      } catch (e) {
        console.warn('Orders fetch error:', e);
      }

      // 3. Payments (All Bank Transfers)
      try {
        const pmts = await adminApi.getPayments();
        const mappedPmts: BankTransferRequest[] = (pmts || []).map((p: any) => {
          let status: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'PENDING';
          if (p.status === 'VERIFIED' || p.rawStatus === 2) status = 'VERIFIED';
          else if (p.status === 'REJECTED' || p.rawStatus === 3) status = 'REJECTED';

          const receipt = p.receipts?.[0];
          let receiptUrl = receipt?.url;
          if (receiptUrl && !receiptUrl.startsWith('http')) {
            receiptUrl = `http://localhost:5295${receiptUrl}`;
          }
          if (!receiptUrl) {
            receiptUrl = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80';
          }

          return {
            id: p.id,
            orderId: p.orderId,
            orderNumber: p.orderNumber || '0000',
            customerName: p.customerName || 'عميل المتجر',
            customerPhone: p.customerPhone || '777000111',
            amount: p.amount || 0,
            transferReference: receipt?.storageKey || `TRF-${p.orderNumber || 'BK'}`,
            receiptImageUrl: receiptUrl,
            uploadedAt: p.createdAt || receipt?.uploadedAt || new Date().toISOString(),
            status,
            rejectionReason: p.rejectionReason,
          };
        });
        setBankTransfers(mappedPmts);
      } catch (e) {
        console.warn('Payments fetch error:', e);
      }

      // 3.1 Captain Invoices (سندات الكباتن)
      try {
        const invs = await adminApi.getCaptainInvoices();
        setCaptainInvoices(invs || []);
      } catch (e) {
        console.warn('Invoices fetch error:', e);
      }

      // 4. Products
      try {
        const prodsRes = await adminApi.getProducts({ pageSize: 100 });
        const prods = prodsRes.items || [];
        const mappedProds: AdminProduct[] = prods.map((p: any) => {
          const rawDesc = p.description || '';
          const matchType = rawDesc.match(/^\[النوع:\s*([^\]]+)\]\s*(.*)$/);
          const subcategoryName = matchType ? matchType[1].trim() : (p.subcategoryName || '');
          const cleanDesc = matchType ? matchType[2].trim() : rawDesc;

          return {
            id: p.id,
            name: p.name,
            description: cleanDesc,
            storeId: p.storeId,
            storeName: p.storeName || 'متجر معتمد',
            categoryId: p.categoryId,
            categoryName: p.categoryName || 'عام',
            subcategoryName: subcategoryName,
            sourceType: 'EXTERNAL_STORE' as const,
            expectedPurchasePrice: p.expectedPurchasePrice !== undefined && p.expectedPurchasePrice !== null
              ? Number(p.expectedPurchasePrice)
              : Number(p.sellingPrice || 0),
            sellingPrice: Number(p.sellingPrice || 0),
            availableQuantity: p.availableStock || 0,
            reservedQuantity: 0,
            isActive: p.isActive,
            isTopPick: true,
            imageUrl: p.images?.[0] || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
            images: p.images || [],
            createdAt: new Date().toISOString(),
          };
        });
        setProducts(mappedProds);
      } catch (e) {
        console.warn('Products fetch error:', e);
      }

      // 5. Categories
      try {
        const cats = await adminApi.getCategories();
        const mappedCats: AdminCategory[] = (cats || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          icon: c.iconName || 'folder-outline',
          displayOrder: c.sortOrder || 1,
          isActive: c.isActive !== false,
          productCount: c.productsCount || 0,
          subcategories: [],
        }));
        setCategories((prev) => {
          if (prev.length === 0) return mappedCats;
          const merged = [...mappedCats];
          for (const oldCat of prev) {
            if (!merged.some((m) => m.id === oldCat.id)) {
              merged.push({ ...oldCat, isActive: false });
            }
          }
          return merged;
        });
      } catch (e) {
        console.warn('Categories fetch error:', e);
      }

      // 6. Stores
      try {
        const strs = await adminApi.getStores();
        const mappedStores: AdminStore[] = (strs || []).map((s: any) => {
          const customTypes =
            storeTypesMapRef.current[s.id] ||
            storeTypesMapRef.current[s.name] ||
            (s.subcategories && s.subcategories.length > 0 ? s.subcategories : []);
          const customCat =
            storeCategoryMapRef.current[s.id] ||
            storeCategoryMapRef.current[s.name] || {
              id: s.categoryId || 'cat-general',
              name: s.categoryName || 'عام',
            };
          const isActive = s.isActive !== undefined ? s.isActive : true;
          return {
            id: s.id,
            name: s.name,
            categoryId: customCat.id,
            categoryName: customCat.name,
            subcategories: customTypes,
            phone: s.phone,
            address: s.address,
            imageUrl: s.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
            rating: 4.8,
            deliveryTime: '30-45 دقيقة',
            deliveryFee: 400,
            isOpen: isActive,
            isActive: isActive,
            latitude: Number(s.latitude ?? 0),
            longitude: Number(s.longitude ?? 0),
          };
        });
        setStores((prev) => {
          if (prev.length === 0) return mappedStores;
          const merged = [...mappedStores];
          for (const oldStore of prev) {
            if (!merged.some((m) => m.id === oldStore.id)) {
              merged.push({ ...oldStore, isActive: false, isOpen: false });
            }
          }
          return merged;
        });
      } catch (e) {
        console.warn('Stores fetch error:', e);
      }

      // 6.5. Delivery Settings
      try {
        const ds = await adminApi.getDeliverySettings();
        if (ds) {
          setDeliverySettings({
            isEnabled: ds.isEnabled ?? true,
            baseFee: ds.baseFee ?? 400,
            baseDistanceKm: ds.baseDistanceKm ?? 1.0,
            perKmFee: ds.perKmFee ?? 50,
            isDynamicPricingEnabled: true,
          });
        }
      } catch (e) {
        console.warn('Delivery settings fetch error:', e);
      }

      // 7. Drivers
      try {
        const drvs = await adminApi.getDrivers();
        const mappedDrvs: DriverCustodyAccount[] = drvs.map((d: any) => ({
          driverId: d.id,
          driverName: d.fullName,
          phone: d.phone,
          vehiclePlate: 'صنعاء 1/12345',
          status: d.status === 0 || d.status === 'Online' ? 'ONLINE' : d.status === 2 || d.status === 'Busy' ? 'BUSY' : 'OFFLINE',
          totalCollections: d.outstandingDebt > 0 ? d.outstandingDebt : 0,
          totalStorePurchases: 0,
          totalSettlements: 0,
          expectedCashCustody: d.outstandingDebt || 0,
          lastSettlementDate: 'اليوم',
        }));
        setDriverCustodies(mappedDrvs);
      } catch (e) {
        console.warn('Drivers fetch error:', e);
      }

      // 8. Audit Logs
      try {
        const logs = await adminApi.getAuditLogs();
        const mappedLogs: AuditLog[] = logs.map((l: any) => ({
          id: l.id,
          actorName: l.actorType || 'مدير العمليات',
          action: l.action || 'عملية إدارية',
          entityName: l.entityName || 'System',
          entityId: l.entityId || '',
          details: l.details || '',
          timestamp: new Date(l.createdAt || Date.now()).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        }));
        setAuditLogs(mappedLogs);
      } catch (e) {
        console.warn('Audit logs fetch error:', e);
      }

      // 9. Deals & Bundles
      try {
        const dls = await adminApi.getDeals();
        const mappedDeals: AdminFlashDeal[] = (Array.isArray(dls) ? dls : []).map((d: any, index: number) => ({
          id: String(d.id ?? `deal-${index}`),
          title: String(d.title ?? 'عرض بدون عنوان'),
          storeName: String(d.storeName ?? 'متجر'),
          originalPrice: Number(d.originalPrice ?? 0) || 0,
          discountPrice: Number(d.offerPrice ?? d.discountPrice ?? 0) || 0,
          discountPercent: Number(d.discountPercent ?? 0) || 0,
          imageUrl: String(d.imageUrl ?? ''),
          remainingHours: Number(d.remainingHours ?? 24) || 24,
          isActive: d.isActive !== false,
          dealType: d.dealType || (d.dealKind === 'DELIVERY_DISCOUNT' ? 'DELIVERY_DISCOUNT' : 'BUNDLE'),
          dealKind: d.dealKind,
          discountKind: d.discountKind,
          storeId: d.storeId,
          categoryId: d.categoryId,
          visibility: d.visibility,
          bundleItems: Array.isArray(d.bundleItems) ? d.bundleItems.map((i: any) => ({
            name: String(i.name ?? 'منتج'), price: Number(i.price ?? 0) || 0, imageUrl: i.imageUrl,
          })) : [],
          deliveryDiscountPercent: Number(d.deliveryDiscountPercent ?? 0) || 0,
          description: d.description,
          badge: d.badge,
          isFreeDelivery: d.isFreeDelivery,
          products: Array.isArray(d.products) ? d.products : [],
          couponCode: d.couponCode,
          discountTiers: Array.isArray(d.discountTiers) ? d.discountTiers : undefined,
          isPublic: d.isPublic !== false,
          expiresAt: d.expiresAt,
        }));
        setFlashDeals(mappedDeals);
      } catch (e) {
        console.warn('Deals fetch error:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, password = 'AdminPassword123!'): Promise<boolean> => {
    const res = await authApi.login(phone, password);
    if (res.user.role !== 'SuperAdmin' && res.user.role !== 'Admin') {
      await authApi.logout();
      throw new Error('هذا الحساب ليس لديه صلاحيات الدخول للوحة الإدارة.');
    }
    const adminName = res.user.fullName || res.user.name || 'مدير النظام';
    setCurrentUser({
      name: adminName,
      phone: res.user.phone,
      email: 'admin@bs-store.com',
      biometricEnabled: true,
      registeredAt: new Date().toISOString(),
    });
    // Authentication should not wait for every dashboard resource. Load them after
    // navigation so slow or unavailable secondary endpoints do not delay sign-in.
    void refreshData();
    return true;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setCurrentUser(null);
      navigateTo('auth');
    }
  };

  const addCategory = async (catData: { name: string; icon: string; displayOrder?: number; isActive?: boolean }) => {
    try {
      await adminApi.createCategory({
        name: catData.name,
        iconName: catData.icon || 'folder-outline',
        sortOrder: catData.displayOrder || categories.length + 1,
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to create category:', e);
      throw e;
    }
  };

  const toggleCategoryStatus = async (categoryId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, isActive: !c.isActive } : c))
    );
    try {
      await adminApi.toggleCategory(categoryId);
    } catch (e) {
      console.warn('Failed to toggle category on backend:', e);
    }
  };

  const updateCategory = async (categoryId: string, data: Partial<AdminCategory>) => {
    try {
      await adminApi.updateCategory(categoryId, {
        name: data.name,
        iconName: data.icon,
        sortOrder: data.displayOrder,
        isActive: data.isActive,
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to update category:', e);
      throw e;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const addSubCategory = (categoryId: string, subData: { name: string; icon: string }) => {
    const newSub: AdminSubCategory = {
      id: `sub-${Date.now()}`,
      name: subData.name,
      icon: subData.icon || 'subdirectory_arrow_left',
      productCount: 0,
      isActive: true,
    };
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          return {
            ...c,
            subcategories: [...c.subcategories, newSub],
          };
        }
        return c;
      })
    );
  };

  const updateSubCategory = (
    categoryId: string,
    subCategoryId: string,
    data: Partial<AdminSubCategory>
  ) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          return {
            ...c,
            subcategories: c.subcategories.map((s) => (s.id === subCategoryId ? { ...s, ...data } : s)),
          };
        }
        return c;
      })
    );
  };

  const deleteSubCategory = (categoryId: string, subCategoryId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          return {
            ...c,
            subcategories: c.subcategories.filter((s) => s.id !== subCategoryId),
          };
        }
        return c;
      })
    );
  };

  const addProduct = async (prodData: Omit<AdminProduct, 'id'>) => {
    try {
      const fullDesc = prodData.subcategoryName
        ? `[النوع: ${prodData.subcategoryName}] ${prodData.description || ''}`.trim()
        : (prodData.description || '').trim();

      const imageList = prodData.images && prodData.images.length > 0
        ? prodData.images
        : (prodData.imageUrl ? [prodData.imageUrl] : []);

      await adminApi.createProduct({
        name: prodData.name,
        description: fullDesc,
        categoryId: prodData.categoryId || categories[0]?.id,
        storeId: prodData.storeId || stores[0]?.id,
        sourceType: 1, // دائماً متجر خارجي حسب المتطلب
        expectedPurchasePrice: Number(prodData.expectedPurchasePrice || 0),
        sellingPrice: Number(prodData.sellingPrice || 0),
        initialStock: prodData.availableQuantity || 0,
        images: imageList,
      });
      await refreshData();
      navigateTo('inventory');
    } catch (e) {
      console.error('Failed to create product:', e);
      throw e;
    }
  };

  const updateProduct = async (productId: string, data: Partial<AdminProduct>) => {
    try {
      const fullDesc = data.subcategoryName
        ? `[النوع: ${data.subcategoryName}] ${data.description || ''}`.trim()
        : (data.description || '').trim();

      const imageList = data.images && data.images.length > 0
        ? data.images
        : (data.imageUrl ? [data.imageUrl] : undefined);

      await adminApi.updateProduct(productId, {
        name: data.name,
        description: fullDesc,
        categoryId: data.categoryId,
        storeId: data.storeId,
        sourceType: 1, // دائماً متجر خارجي
        expectedPurchasePrice: Number(data.expectedPurchasePrice ?? 0),
        sellingPrice: Number(data.sellingPrice ?? 0),
        isActive: data.isActive ?? true,
        images: imageList,
      });
      setEditingProduct(null);
      await refreshData();
      navigateTo('inventory');
    } catch (e) {
      console.error('Failed to update product:', e);
      throw e;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await adminApi.deleteProduct(productId);
      await refreshData();
    } catch (e) {
      console.error('Failed to delete product:', e);
      throw e;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, driverName?: string) => {
    try {
      // Find driver if driver assigned
      if (status === 'DRIVER_ASSIGNED' && driverCustodies.length > 0) {
        const driver = driverCustodies.find(d => d.driverName === driverName) || driverCustodies[0];
        await adminApi.assignDriver(orderId, driver.driverId);
      }
      await refreshData();
    } catch (e) {
      console.error('Failed to update order status:', e);
      throw e;
    }
  };

  const verifyBankTransfer = async (id: string, approved: boolean, reason?: string) => {
    try {
      if (approved) {
        await adminApi.approvePayment(id);
      } else {
        await adminApi.rejectPayment(id, reason || 'إشعار غير مطابق');
      }
      await refreshData();
    } catch (e) {
      console.error('Failed to verify bank transfer:', e);
      throw e;
    }
  };

  const approveCaptainInvoice = async (id: string) => {
    try {
      await adminApi.approveCaptainInvoice(id);
      await refreshData();
    } catch (e) {
      console.error('Failed to approve invoice:', e);
      throw e;
    }
  };

  const rejectCaptainInvoice = async (id: string, reason?: string) => {
    try {
      await adminApi.rejectCaptainInvoice(id, reason);
      await refreshData();
    } catch (e) {
      console.error('Failed to reject invoice:', e);
      throw e;
    }
  };

  const adjustInventory = async (productId: string, newAvailable: number) => {
    try {
      await adminApi.addInventoryTransaction({
        productId,
        type: 4, // Adjustment
        quantity: newAvailable,
        reference: 'تسوية إدارة',
        note: `تعديل الرصيد إلى ${newAvailable}`,
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to adjust inventory:', e);
      throw e;
    }
  };

  const settleDriverCash = async (driverId: string, receivedAmount: number, notes?: string) => {
    try {
      await adminApi.createSettlement(driverId, receivedAmount, notes);
      await refreshData();
    } catch (e) {
      console.error('Failed to settle driver cash:', e);
      throw e;
    }
  };

  const addStore = async (storeData: Omit<AdminStore, 'id'>) => {
    try {
      if (!Number.isFinite(storeData.latitude) || !Number.isFinite(storeData.longitude) || Math.abs(storeData.latitude!) > 90 || Math.abs(storeData.longitude!) > 180) {
        throw new Error('يجب تحديد إحداثيات موقع المتجر الصحيحة على الخريطة');
      }
      if (storeData.name && storeData.subcategories) {
        storeTypesMapRef.current[storeData.name] = storeData.subcategories;
      }
      if (storeData.name && storeData.categoryId) {
        storeCategoryMapRef.current[storeData.name] = {
          id: storeData.categoryId,
          name: storeData.categoryName || '',
        };
      }
      await adminApi.createStore({
        name: storeData.name,
        phone: storeData.phone,
        address: storeData.address,
        latitude: storeData.latitude!,
        longitude: storeData.longitude!,
        imageUrl: storeData.imageUrl,
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to add store:', e);
      throw e;
    }
  };

  const updateStore = async (storeId: string, data: Partial<AdminStore>) => {
    try {
      if (data.latitude !== undefined && (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90)) throw new Error('خط العرض غير صالح');
      if (data.longitude !== undefined && (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180)) throw new Error('خط الطول غير صالح');
      if (data.subcategories) {
        storeTypesMapRef.current[storeId] = data.subcategories;
        if (data.name) storeTypesMapRef.current[data.name] = data.subcategories;
      }
      if (data.categoryId) {
        storeCategoryMapRef.current[storeId] = {
          id: data.categoryId,
          name: data.categoryName || '',
        };
        if (data.name) {
          storeCategoryMapRef.current[data.name] = {
            id: data.categoryId,
            name: data.categoryName || '',
          };
        }
      }
      await adminApi.updateStore(storeId, {
        name: data.name,
        phone: data.phone,
        address: data.address,
        latitude: data.latitude ?? stores.find((store) => store.id === storeId)?.latitude ?? 0,
        longitude: data.longitude ?? stores.find((store) => store.id === storeId)?.longitude ?? 0,
        isActive: data.isActive ?? true,
        imageUrl: data.imageUrl,
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to update store:', e);
      throw e;
    }
  };

  const updateDeliverySettings = async (settings: Partial<DeliverySettings>) => {
    try {
      const updated = await adminApi.updateDeliverySettings({
        isEnabled: settings.isEnabled ?? deliverySettings?.isEnabled ?? true,
        baseFee: settings.baseFee ?? deliverySettings?.baseFee ?? 400,
        baseDistanceKm: settings.baseDistanceKm ?? deliverySettings?.baseDistanceKm ?? 1.0,
        perKmFee: settings.perKmFee ?? deliverySettings?.perKmFee ?? 50,
        freeDeliveryRadius: 0,
      });
      if (updated) {
        setDeliverySettings({
          isEnabled: updated.isEnabled ?? true,
          baseFee: updated.baseFee ?? 400,
          baseDistanceKm: updated.baseDistanceKm ?? 1.0,
          perKmFee: updated.perKmFee ?? 50,
          isDynamicPricingEnabled: true,
        });
      }
    } catch (e) {
      console.error('Failed to update delivery settings:', e);
      throw e;
    }
  };

  const toggleStoreStatus = async (storeId: string) => {
    // 1. Optimistic update so it immediately changes state in UI without disappearing
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, isActive: !s.isActive, isOpen: !s.isActive } : s))
    );
    try {
      await adminApi.toggleStore(storeId);
    } catch (e) {
      console.error('Failed to toggle store:', e);
      throw e;
    }
  };

  const deleteStore = async (storeId: string) => {
    setStores((prev) => prev.filter((s) => s.id !== storeId));
  };

  const addFlashDeal = async (dealData: Omit<AdminFlashDeal, 'id'>) => {
    const newDeal: AdminFlashDeal = {
      ...dealData,
      id: `deal-${Date.now()}`,
    };
    const updated = [newDeal, ...flashDeals];
    setFlashDeals(updated);
    try {
      await adminApi.saveDeals(updated);
    } catch (e) {
      console.warn('Failed to save deals to backend:', e);
      setFlashDeals(flashDeals);
      throw e;
    }
  };

  const updateFlashDeal = async (dealId: string, dealData: Omit<AdminFlashDeal, 'id'>) => {
    const previous = flashDeals;
    const updated = flashDeals.map((deal) => deal.id === dealId ? { ...dealData, id: dealId } : deal);
    setFlashDeals(updated);
    try {
      await adminApi.saveDeals(updated);
    } catch (e) {
      console.warn('Failed to update deal:', e);
      setFlashDeals(previous);
      throw e;
    }
  };

  const toggleFlashDealStatus = async (dealId: string) => {
    const updated = flashDeals.map((d) => (d.id === dealId ? { ...d, isActive: !d.isActive } : d));
    setFlashDeals(updated);
    try {
      await adminApi.saveDeals(updated);
    } catch (e) {
      console.warn('Failed to save deals toggle to backend:', e);
    }
  };

  const deleteFlashDeal = async (dealId: string) => {
    const updated = flashDeals.filter((d) => d.id !== dealId);
    setFlashDeals(updated);
    try {
      await adminApi.saveDeals(updated);
    } catch (e) {
      console.warn('Failed to save deals delete to backend:', e);
    }
  };

  const toggleProductTopPick = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, isTopPick: !p.isTopPick };
        }
        return p;
      })
    );
  };

  const flagUser = (userData: Omit<FlaggedUser, 'id' | 'flaggedAt'>) => {
    const newFlag: FlaggedUser = {
      ...userData,
      id: `flag-${Date.now()}`,
      flaggedAt: new Date().toISOString(),
    };
    setFlaggedUsers((prev) => [newFlag, ...prev]);
  };

  const unflagUser = (userId: string) => {
    setFlaggedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const banUser = (userId: string) => {
    setFlaggedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: true } : u))
    );
  };

  const unbanUser = (userId: string) => {
    setFlaggedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: false } : u))
    );
  };

  const approveOrder = async (orderId: string) => {
    try {
      await adminApi.approveOrder(orderId);
      await refreshData();
    } catch (e) {
      console.warn('approveOrder error:', e);
      throw e;
    }
  };

  const rejectOrder = async (orderId: string, _reason: string) => {
    try {
      await adminApi.rejectOrder(orderId, _reason);
      await refreshData();
    } catch (e) {
      console.warn('rejectOrder error:', e);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        currentScreen,
        inventoryTabRequest,
        setInventoryTabRequest,
        navigateTo,
        authMode,
        setAuthMode,
        registeredUser,
        setRegisteredUser,
        currentUser,
        setCurrentUser,
        login,
        logout,
        refreshData,
        isLoading,
        kpi,
        timeframe,
        setTimeframe,
        orders,
        selectedOrder,
        setSelectedOrder,
        updateOrderStatus,
        bankTransfers,
        verifyBankTransfer,
        captainInvoices,
        approveCaptainInvoice,
        rejectCaptainInvoice,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        editingProduct,
        setEditingProduct,
        adjustInventory,
        categories,
        addCategory,
        updateCategory,
        toggleCategoryStatus,
        deleteCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        driverCustodies,
        settleDriverCash,
        auditLogs,
        stores,
        addStore,
        updateStore,
        toggleStoreStatus,
        deleteStore,
        deliverySettings,
        updateDeliverySettings,
        flashDeals,
        addFlashDeal,
        updateFlashDeal,
        toggleFlashDealStatus,
        deleteFlashDeal,
        toggleProductTopPick,
        orderWorkflowMode,
        setOrderWorkflowMode,
        flaggedUsers,
        flagUser,
        unflagUser,
        banUser,
        unbanUser,
        approveOrder,
        rejectOrder,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
