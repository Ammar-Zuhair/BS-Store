import { VariantChoice, BundleSelection, optionsLabel, bundleUnitPrice } from '../options/model';
import { formatOrderDate } from '../utils/orderDate';
import * as React from 'react';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { Product, CartItem, Address, Order, SubOrderGroup, PaymentMethodType, PaymentStatusType, OrderStatusType, Store, BundlePiece, Category, TransferProviderType } from '../types';
import { DealItem } from '../components/DealDetailsModal';
import { api, authApi, catalogApi, cartApi, ordersApi, addressApi, paymentsApi } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, lightColors, darkColors, ThemeColors, setGlobalThemeMode } from '../theme';
import { OrderHours } from '../utils/openingHours';
import { unregisterPushDevice } from '../notifications';

export type ScreenName = 'home' | 'category' | 'category_stores' | 'store_detail' | 'cart' | 'checkout' | 'tracking' | 'notifications' | 'profile' | 'auth';

const ICON_MAP: Record<string, string> = {
  'silverware-fork-knife': '🍔',
  'cart-outline': '🛒',
  'medical-bag': '💊',
  'cellphone': '📱',
  'tshirt-crew': '👕',
  'folder-outline': '📁',
};


interface AppContextType {
  currentScreen: ScreenName;
  navigateTo: (screen: ScreenName, options?: { dealId?: string }) => void;
  categories: Category[];
  stores: Store[];
  orderHours: OrderHours | null;
  businessNow: number;
  products: Product[];
  isLoadingCatalog: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedStore: Store | null;
  selectedStoreDealId: string | null;
  setSelectedStore: React.Dispatch<React.SetStateAction<Store | null>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, choice?: VariantChoice, bundleSelections?: BundleSelection[]) => Promise<void>;
  productOptionsRequest: Product | null;
  closeProductOptions: () => void;
  bundleOptionsRequest: Product | null;
  closeBundleOptions: () => void;
  getItemKey: (item: CartItem) => string;
  addBundlePieceToCart: (product: Product, piece: BundlePiece, quantity?: number) => Promise<void>;
  removeFromCart: (itemKey: string) => Promise<void>;
  updateQuantity: (itemKey: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartSubOrders: SubOrderGroup[];
  cartSubtotal: number;
  cartDeliveryFee: number;
  cartFarthestStoreDistanceKm: number;
  isDeliveryQuoteLoading: boolean;
  deliveryQuoteError: string | null;
  hasDeliveryQuote: boolean;
  refreshDeliveryQuote: () => void;
  cartDiscount: number;
  cartTotal: number;
  promoCode: string;
  promoMessage: string | null;
  isTieredPromo: boolean;
  applyPromoCode: (code: string) => Promise<boolean>;
  clearPromoCode: () => void;
  activateDeliveryDeal: (dealId: string, percent: number) => void;
  activeDeliveryDealId: string | null;
  activeOrderDiscountDeal: { id: string; title: string } | null;
  activateProductDiscountDeal: (dealId: string) => void;
  addresses: Address[];
  selectedAddress: Address | null;
  setSelectedAddress: React.Dispatch<React.SetStateAction<Address | null>>;
  addNewAddress: (addr: Omit<Address, 'id'>) => Promise<void>;
  orders: Order[];
  currentOrder: Order | null;
  setCurrentOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  placeOrder: (paymentMethod: PaymentMethodType, options?: {
    receiptUri?: string;
    receiptFileName?: string;
    receiptMimeType?: string;
    transferProvider?: TransferProviderType;
    transferReference?: string;
    notes?: string;
  }) => Promise<Order>;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (phone: string, password: string, name?: string) => Promise<void>;
  register: (name: string, phone: string, email: string, password?: string, initialAddress?: Omit<Address, 'id'>) => Promise<void>;
  logout: () => Promise<void>;
  user: { name: string; phone: string; email?: string } | null;
  registeredUser: { name: string; phone: string; email: string } | null;
  setRegisteredUser: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string } | null>>;
  refreshData: () => Promise<void>;
  updateSavedAddress: (id: string, addr: Omit<Address, 'id'>) => Promise<void>;
  deleteSavedAddress: (id: string) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  isFreeDeliveryPromo: boolean;
  deals: DealItem[];
  setDeals: React.Dispatch<React.SetStateAction<DealItem[]>>;
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  colors: ThemeColors;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orderHours, setOrderHours] = useState<OrderHours | null>(null);
  const [businessNow, setBusinessNow] = useState(Date.now());
  const clockOffset = useRef(0);
  useEffect(() => {
    let active = true;
    const refreshHours = async () => {
      try {
        const [hoursResult, storesResult] = await Promise.allSettled([
          api.get<OrderHours>('/system/order-hours').then(hours => ({ hours, receivedAt: Date.now() })), catalogApi.getStores(),
        ]);
        if (active && storesResult.status === 'fulfilled') {
          setStores(previous => previous.map(store => {
            const updated = storesResult.value.find(item => item.id === store.id);
            return updated ? { ...store, openingTime: updated.openingTime, closingTime: updated.closingTime,
              is24Hours: updated.is24Hours ?? false, isOpen: updated.isOpen ?? null, isActive: updated.isActive } : store;
          }));
        }
        if (hoursResult.status === 'rejected') throw hoursResult.reason;
        const { hours, receivedAt } = hoursResult.value;
        if (!active) return;
        const serverTime = Date.parse(hours.serverTime);
        if (Number.isFinite(serverTime)) clockOffset.current = serverTime - receivedAt;
        setOrderHours(hours);
        setBusinessNow(Date.now() + clockOffset.current);
      } catch (error) { console.warn('Failed to load order hours:', error); }
    };
    void refreshHours();
    const clock = setInterval(() => setBusinessNow(Date.now() + clockOffset.current), 15000);
    const poll = setInterval(() => { if (AppState.currentState === 'active') void refreshHours(); }, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setBusinessNow(Date.now() + clockOffset.current);
        void refreshHours();
      }
    });
    return () => { active = false; clearInterval(clock); clearInterval(poll); subscription.remove(); };
  }, []);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const toggleTheme = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    setGlobalThemeMode(next ? 'dark' : 'light');
    await AsyncStorage.setItem('@bs_theme_mode', next ? 'dark' : 'light');
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-all');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedStoreDealId, setSelectedStoreDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productOptionsRequest, setProductOptionsRequest] = useState<Product | null>(null);
  const [bundleOptionsRequest, setBundleOptionsRequest] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [isTieredPromo, setIsTieredPromo] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isFreeDeliveryPromo, setIsFreeDeliveryPromo] = useState<boolean>(false);
  const [deliveryDiscountPercent, setDeliveryDiscountPercent] = useState(0);
  const [deliveryPromoDealId, setDeliveryPromoDealId] = useState<string | null>(null);
  const [productDiscountDealId, setProductDiscountDealId] = useState<string | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<{ fee: number; farthestDistanceKm: number; storeFees: Record<string, number> } | null>(null);
  const [isDeliveryQuoteLoading, setIsDeliveryQuoteLoading] = useState(false);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState<string | null>(null);
  const [deliveryQuoteRetryKey, setDeliveryQuoteRetryKey] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [registeredUser, setRegisteredUser] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [user, setUser] = useState<{ name: string; phone: string; email?: string } | null>(null);

  useEffect(() => {
    api.setSessionExpiredHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
      setOrders([]);
      setAddresses([]);
      setSelectedAddress(null);
      setCurrentOrder(null);
      setCurrentScreen('auth');
      void AsyncStorage.multiRemove(['@bs_customer_user', '@bs_customer_orders', '@bs_customer_addresses']);
    });
    return () => api.setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const resumed = (previousState === 'inactive' || previousState === 'background') && nextState === 'active';
      previousState = nextState;
      if (resumed && isAuthenticated) void api.refreshSession();
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  // ─── Fetch live catalog from Backend ───────────────────────────────────────
  const catalogInFlight = useRef<Promise<void> | null>(null);
  const loadCatalog = async () => {
    try {
      setIsLoadingCatalog(true);
      const [catsRes, storesRes, prodsRes, dealsRes] = await Promise.all([
        catalogApi.getCategories().catch(() => []),
        catalogApi.getStores().catch(() => []),
        catalogApi.getProducts({ pageSize: 100 }).catch(() => ({ items: [] })),
        catalogApi.getDeals().catch(() => []),
      ]);

      const mappedCats: Category[] = catsRes.map((c) => ({
        id: c.id,
        name: c.name,
        icon: ICON_MAP[c.iconName || c.icon || ''] || c.iconName || c.icon || '🛍️',
        itemCount: c.productsCount || 0,
      }));

      const rawProds = prodsRes.items || [];
      const mappedProds: Product[] = rawProds.map((p) => {
        const rawDesc = p.description || '';
        const matchType = rawDesc.match(/^\[النوع:\s*([^\]]+)\]\s*(.*)$/);
        const subcategoryName = matchType ? matchType[1].trim() : '';
        const cleanDesc = matchType ? matchType[2].trim() : rawDesc;

        return {
          id: p.id,
          hasOptions: p.hasOptions, minSellingPrice: p.minSellingPrice, maxSellingPrice: p.maxSellingPrice,
          storeId: p.storeId,
          storeName: p.storeName || '',
          categoryId: p.categoryId,
          subcategoryId: subcategoryName,
          name: p.name,
          description: cleanDesc,
          sellingPrice: p.sellingPrice,
          imageUrl: p.images?.[0] || '',
          images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
          sourceType: (p.sourceType === 'ExternalStore' ? 'EXTERNAL_STORE' : 'IN_STOCK'),
          inStock: Boolean(p.isActive),
        };
      });

      const mappedStores: Store[] = storesRes.map((s) => {
        const storeProductCategories = mappedProds
          .filter((p) => p.storeId === s.id)
          .map((p) => p.categoryId);

        const storeSubcats = Array.from(
          new Set(
            mappedProds
              .filter((p) => p.storeId === s.id && p.subcategoryId)
              .map((p) => p.subcategoryId as string)
          )
        );

        const allStoreCatIds = Array.from(
          new Set([...(s.categoryIds || []), ...storeProductCategories])
        );

        const primaryCatId = allStoreCatIds[0] || '';
        const primaryCatObj = catsRes.find((c) => c.id === primaryCatId);

        return {
          id: s.id,
          name: s.name,
          category: primaryCatObj?.name || '',
          categoryId: primaryCatId,
          categoryIds: allStoreCatIds,
          subcategories: storeSubcats,
          phone: s.phone,
          address: s.address,
          imageUrl: s.imageUrl || '',
          latitude: Number(s.latitude ?? 0),
          longitude: Number(s.longitude ?? 0),
          isOpen: s.isOpen ?? null,
          isActive: s.isActive,
          openingTime: s.openingTime,
          closingTime: s.closingTime,
          is24Hours: s.is24Hours ?? false,
        };
      });

      const mappedDeals: DealItem[] = (Array.isArray(dealsRes) ? dealsRes : []).flatMap((d: any) => {
        const kind = d?.discountKind || d?.dealType || d?.dealKind;
        const isOrderDiscount = kind === 'PRODUCT_DISCOUNT';
        if (!d?.id || !d?.title || (!d?.storeId && d?.discountKind !== 'DELIVERY_DISCOUNT' && !isOrderDiscount && !d?.couponCode && !d?.isFreeDelivery)) return [];
        const rawProducts = Array.isArray(d.products)
          ? d.products
          : Array.isArray(d.bundleItems)
            ? d.bundleItems
            : [];
        const products = rawProducts
          .filter((p: any) => p?.id && p?.name)
          .map((p: any) => ({
            id: String(p.id),
            hasOptions: p.hasOptions, minSellingPrice: p.minSellingPrice, maxSellingPrice: p.maxSellingPrice,
            name: String(p.name),
            price: Number(p.price) || 0,
            description: p.description || '',
            imageUrl: p.imageUrl,
          }));

        return [{
          id: String(d.id),
          title: String(d.title),
          storeName: String(d.storeName || ''),
          storeId: d.storeId,
          categoryId: d.categoryId,
          description: d.description || '',
          badge: d.badge || '',
          imageUrl: d.imageUrl || '',
          originalPrice: Number(d.originalPrice) || 0,
          offerPrice: Number(d.offerPrice ?? d.discountPrice) || 0,
          discountPercent: Number(d.discountPercent) || 0,
          couponCode: d.couponCode,
          discountTiers: Array.isArray(d.discountTiers) ? d.discountTiers : undefined,
          isFreeDelivery: d.isFreeDelivery,
          dealType: d.discountKind || d.dealType || d.dealKind,
          discountKind: d.discountKind,
          deliveryDiscountPercent: Number(d.deliveryDiscountPercent ?? d.discountPercent) || 0,
          expiresAt: d.expiresAt,
          isPublic: d.isActive !== false && d.isPublic !== false,
          visibility: d.visibility,
          products,
        }];
      });
      setDeals(mappedDeals);

      setCategories(mappedCats);
      setStores(mappedStores);
      setProducts(mappedProds);
    } catch (err) {
      console.warn('Failed to load catalog from backend:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const refreshCatalog = (): Promise<void> => {
    if (catalogInFlight.current) return catalogInFlight.current;
    const pending = loadCatalog().finally(() => { if (catalogInFlight.current === pending) catalogInFlight.current = null; });
    catalogInFlight.current = pending;
    return pending;
  };
  useEffect(() => { void refreshCatalog(); }, []);

  const addressMutationRevision = useRef(0);
  const refreshAddresses = async () => {
    const revision = addressMutationRevision.current;
    const token = api.getToken() || (await api.initToken());
    if (!token) {
      setAddresses([]);
      setSelectedAddress(null);
      return;
    }

    try {
      const serverAddresses = await addressApi.getAddresses();
      if (revision !== addressMutationRevision.current) return;
      setAddresses(serverAddresses);
      setSelectedAddress((current) =>
        serverAddresses.find((address) => address.id === current?.id) ||
        serverAddresses.find((address) => address.isDefault) ||
        serverAddresses[0] ||
        null
      );
    } catch (err) {
      console.warn('Failed to load addresses from backend:', err);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await api.initToken();
        if (token) {
          try {
            // Refresh on app launch so the seven-day idle window starts from
            // the customer's most recent app use, even if access is still valid.
            const renewed = await api.refreshSession();
            if (!renewed && api.getToken()) throw new Error('تعذر تجديد الجلسة مؤقتاً');
            const serverUser = await authApi.me();
            setUser({ name: serverUser.fullName || serverUser.name || '', phone: serverUser.phone });
            setIsAuthenticated(true);
            setCurrentScreen('home');
          } catch (error: any) {
            // A delayed/offline server must not destroy a valid persisted session.
            if (error?.status !== 401 && error?.status !== 403) {
              const cached = await AsyncStorage.getItem('@bs_customer_user');
              if (cached && api.getToken()) {
                setUser(JSON.parse(cached));
                setIsAuthenticated(true);
                setCurrentScreen('home');
              }
              console.warn('تعذر التحقق من الجلسة مؤقتاً:', error);
              return;
            }
            await api.setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setCurrentScreen('auth');
            await AsyncStorage.removeItem('@bs_customer_user');
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setCurrentScreen('auth');
        }
        // Discard legacy local snapshots: addresses and orders must come from the API.
        await AsyncStorage.multiRemove(['@bs_customer_addresses', '@bs_customer_orders']);

        const savedTheme = await AsyncStorage.getItem('@bs_theme_mode');
        if (savedTheme === 'dark') {
          setIsDarkMode(true);
          setGlobalThemeMode('dark');
        } else {
          setIsDarkMode(false);
          setGlobalThemeMode('light');
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    restoreSession();
  }, []);

  const navigateTo = (screen: ScreenName, options?: { dealId?: string }) => {
    if (screen === 'tracking') setCurrentOrder(null);
    setSelectedStoreDealId(screen === 'store_detail' ? options?.dealId || null : null);
    setCurrentScreen(screen);
  };

  // ─── Fetch live orders from Backend ────────────────────────────────────────
  const mapBackendOrderStatus = (status: any): OrderStatusType => {
    if (typeof status === 'string') {
      const s = status.toUpperCase();
      if (s === 'DELIVERED') return 'DELIVERED';
      if (s === 'OUTFORDELIVERY' || s === 'OUT_FOR_DELIVERY') return 'OUT_FOR_DELIVERY';
      if (s === 'WAREHOUSEPICKUP' || s === 'WAREHOUSE_PICKUP') return 'WAREHOUSE_PICKUP';
      if (s === 'PURCHASING') return 'PURCHASING';
      if (s === 'DRIVERACCEPTED' || s === 'DRIVER_ACCEPTED') return 'DRIVER_ACCEPTED';
      if (s === 'DRIVERASSIGNED' || s === 'DRIVER_ASSIGNED') return 'DRIVER_ASSIGNED';
      if (s === 'SEARCHINGDRIVER' || s === 'SEARCHING_DRIVER') return 'SEARCHING_DRIVER';
      if (s === 'CONFIRMED') return 'CONFIRMED';
      if (s === 'PENDINGADMINAPPROVAL' || s === 'PENDING_ADMIN_APPROVAL') return 'PENDING_ADMIN_APPROVAL';
      if (s === 'PAYMENTPENDINGVERIFICATION' || s === 'PAYMENT_PENDING_VERIFICATION') return 'PAYMENT_PENDING_VERIFICATION';
      if (s === 'PENDINGPAYMENT' || s === 'PENDING_PAYMENT') return 'PENDING_PAYMENT';
      if (s === 'CANCELLED') return 'CANCELLED';
      if (s === 'PAYMENTFAILED' || s === 'PAYMENT_FAILED') return 'PAYMENT_FAILED';
    }
    switch (Number(status)) {
      case 0: return 'PENDING_PAYMENT';
      case 1: return 'PAYMENT_PENDING_VERIFICATION';
      case 2: return 'CONFIRMED';
      case 3: return 'SEARCHING_DRIVER';
      case 4: return 'DRIVER_ASSIGNED';
      case 5: return 'DRIVER_ACCEPTED';
      case 6: return 'PURCHASING';
      case 7: return 'WAREHOUSE_PICKUP';
      case 8: return 'OUT_FOR_DELIVERY';
      case 9: return 'DELIVERED';
      case 10: return 'CANCELLED';
      case 11: return 'PAYMENT_FAILED';
      case 13: return 'PENDING_ADMIN_APPROVAL';
      default: return 'CONFIRMED';
    }
  };

  const refreshOrders = async () => {
    const token = api.getToken() || (await api.initToken());
    if (!token) {
      setOrders([]);
      setCurrentOrder(null);
      return;
    }
    try {
      const ordersRes = await ordersApi.getMyOrders();
      if (!Array.isArray(ordersRes)) {
        setOrders([]);
        setCurrentOrder(null);
        return;
      }
      const mappedOrders: Order[] = ordersRes.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: formatOrderDate(o.createdAt),
        status: mapBackendOrderStatus(o.status),
        items: (o.subOrders || []).flatMap((so: any) =>
          (so.items || []).map((i: any) => ({
            product: {
              id: i.productId || i.id,
              storeId: so.storeId,
              storeName: so.storeName,
              categoryId: '',
              name: i.productName || '',
              description: '',
              sellingPrice: i.unitPrice || 0,
              imageUrl: i.imageUrl || '',
              sourceType: 'IN_STOCK' as const,
              inStock: false,
            },
            quantity: i.quantity || 1, bundleTitle: i.bundleTitle, bundleGroupId: i.bundleGroupId, variantId: i.variantId, selectedOptions: i.selectedOptions,
            imageUrl: i.imageUrl, unitPrice: Number(i.unitPrice) || 0,
            originalUnitPrice: Number(i.originalUnitPrice ?? i.unitPrice) || 0,
            priceChangeId: i.priceChangeId || undefined,
          }))
        ),
        subtotal: o.subTotal || 0,
        deliveryFee: o.deliveryFee || 0,
        discount: o.discount || 0,
        totalAmount: o.totalAmount || 0,
        address: {
          id: '',
          label: '',
          city: o.deliveryAddress || '',
          district: '',
          street: '',
          latitude: Number(o.customerLatitude ?? 0),
          longitude: Number(o.customerLongitude ?? 0),
          isDefault: true,
        },
        paymentMethod: o.paymentMethod === 1 ? 'MANUAL_TRANSFER' : 'CASH_ON_DELIVERY',
        paymentStatus: o.paymentStatus === 2 ? 'VERIFIED' : o.paymentStatus === 3 ? 'REJECTED' : o.paymentStatus === 1 ? 'PENDING_VERIFICATION' : 'PENDING',
        notes: o.notes,
        customerRating: o.customerRating,
        customerReview: o.customerReview,
        driver: o.driverName
          ? {
              id: undefined,
              name: o.driverName,
              phone: o.driverPhone || '',
            }
          : undefined,
      }));

      setOrders(mappedOrders);
      await AsyncStorage.removeItem('@bs_customer_orders');
      setCurrentOrder((prev) => {
        return prev ? mappedOrders.find((m) => m.id === prev.id) || null : null;
      });
    } catch (err) {
      console.warn('Failed to load orders from backend:', err);
      setOrders([]);
      setCurrentOrder(null);
      await AsyncStorage.removeItem('@bs_customer_orders');
    }
  };

  // Fetch after session restoration/login has committed authenticated state.
  // The direct calls in login/register can run against the previous state value.
  useEffect(() => {
    if (isAuthenticated) {
      void refreshOrders();
      void refreshAddresses();
    } else {
      setOrders([]);
      setAddresses([]);
      setSelectedAddress(null);
      setCurrentOrder(null);
    }
  }, [isAuthenticated]);

  const getItemKey = (item: CartItem) => {
    const owner = item.selectedPiece ? `${item.product.id}__piece__${item.selectedPiece.id}` : item.product.id;
    if (item.bundleSelections?.length && item.product.isBundle) return owner + '__bundle__' + [...item.bundleSelections].sort((a, b) => a.dealProductId.localeCompare(b.dealProductId)).map(s => `${s.dealProductId}:${s.variantId || ''}`).join('|');
    return item.variantId ? owner + '__variant__' + item.variantId : owner;
  };

  const addToCart = async (product: Product, quantity = 1, choice?: VariantChoice, suppliedBundle?: BundleSelection[]) => {
    if (product.hasOptions && !choice?.variantId) { setProductOptionsRequest(product); return; }
    const dealPieces = product.isBundle ? deals.find(d => d.id === product.dealId)?.products || product.bundleItems || [] : [];
    if (product.isBundle && dealPieces.some(p => p.hasOptions) && !suppliedBundle) { setBundleOptionsRequest({ ...product, bundleItems: dealPieces }); return; }
    const bundleSelections: BundleSelection[] | undefined = suppliedBundle || (product.isBundle && dealPieces.length ? dealPieces.map(p => ({ dealProductId: p.id, unitPrice: p.price, imageUrl: p.imageUrl, selectedOptions: [] })) : undefined);
    const localPrice = choice?.unitPrice ?? (product.isBundle && bundleSelections?.length
      ? bundleUnitPrice(dealPieces, product.discountPrice ?? product.sellingPrice, bundleSelections)
      : product.discountPrice ?? product.sellingPrice);
    let saved: any;
    if (isAuthenticated) {
      try {
        if (product.dealId || choice?.variantId) saved = await cartApi.addConfiguredItem({ productId: product.dealId ? undefined : product.id,
          dealId: product.dealId, dealProductId: product.dealProductId, quantity, variantId: choice?.variantId,
          imageValueId: choice?.imageValueId, bundleSelections: bundleSelections?.map(s => ({ dealProductId: s.dealProductId, variantId: s.variantId, imageValueId: s.imageValueId })) });
        else if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(product.id)) saved = await cartApi.addItem(product.id, quantity);
      } catch (error: any) {
        // Business validation errors must never add an unavailable selection locally.
        if (error?.apiCode === 'OPTIONS_REQUIRED' && !product.dealId) { setProductOptionsRequest({ ...product, hasOptions: true }); return; }
        if (error?.status && error.status < 500) throw error;
        if (__DEV__) console.info('Cart synchronization deferred:', error.message);
      }
    }
    const serverItem = saved?.items?.find((i: any) => i.id === saved.addedItemId);
    const entry: CartItem = { product, quantity, ...choice, bundleSelections,
      unitPrice: serverItem?.unitPrice ?? localPrice, imageUrl: choice?.imageUrl || product.imageUrl,
      serverItemId: serverItem?.id };
    setCart(previous => {
      const key = getItemKey(entry), current = previous.find(item => getItemKey(item) === key);
      return current ? previous.map(item => getItemKey(item) === key ? { ...item, ...entry, quantity: item.quantity + quantity } : item) : [...previous, entry];
    });
  };

  const addBundlePieceToCart = async (product: Product, piece: BundlePiece, quantity = 1) => {
    const pieceProduct: Product = { ...product, id: `${product.dealId || product.id}_${piece.id}`, name: piece.name,
      description: piece.description || '', sellingPrice: piece.price, discountPrice: undefined,
      imageUrl: piece.imageUrl || product.imageUrl, images: piece.imageUrl ? [piece.imageUrl] : [],
      dealId: product.dealId || product.id, dealProductId: piece.id, isBundle: false, hasOptions: piece.hasOptions,
      minSellingPrice: piece.minSellingPrice, maxSellingPrice: piece.maxSellingPrice };
    await addToCart(pieceProduct, quantity);
  };

  const removeFromCart = async (itemKey: string) => {
    const item = cart.find(item => getItemKey(item) === itemKey);
    if (item?.serverItemId) await cartApi.removeItem(item.serverItemId);
    setCart(previous => previous.filter(item => getItemKey(item) !== itemKey));
  };

  const updateQuantity = async (itemKey: string, quantity: number) => {
    if (quantity <= 0) { await removeFromCart(itemKey); return; }
    const item = cart.find(item => getItemKey(item) === itemKey);
    if (item?.serverItemId) await cartApi.updateItem(item.serverItemId, quantity);
    setCart(previous => previous.map(item => getItemKey(item) === itemKey ? { ...item, quantity } : item));
  };

  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        await cartApi.clearCart();
      }
    } catch {}
    setCart([]);
    setPromoCode('');
    setDiscountPercent(0);
    setDeliveryDiscountPercent(0);
    setDeliveryPromoDealId(null);
    setIsFreeDeliveryPromo(false);
  };

  // Group cart items by store to support multi-store sub-orders
  const storeMap = new Map<string, CartItem[]>();
  cart.forEach((item) => {
    const sId = item.product.storeId;
    if (!storeMap.has(sId)) {
      storeMap.set(sId, []);
    }
    storeMap.get(sId)!.push(item);
  });

  const cartSubOrders: SubOrderGroup[] = Array.from(storeMap.entries()).map(([storeId, items]) => {
    const subtotal = items.reduce((sum, item) => {
      const price = item.unitPrice ?? (item.selectedPiece ? item.selectedPiece.price : (item.product.discountPrice ?? item.product.sellingPrice));
      return sum + price * item.quantity;
    }, 0);
    const deliveryFee = Number(deliveryQuote?.storeFees[storeId]) || 0;
    return {
      storeId,
      storeName: items[0]?.product?.storeName || 'متجر',
      items,
      subtotal,
      deliveryFee,
    };
  });

  const cartSubtotal = cartSubOrders.reduce((sum, so) => sum + so.subtotal, 0);
  const deliveryStoreIds = Array.from(new Set(cartSubOrders.map((subOrder) => subOrder.storeId).filter((id) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))));
  const deliveryStoreIdsKey = deliveryStoreIds.slice().sort().join(',');
  const refreshDeliveryQuote = () => {
    setDeliveryQuote(null);
    setDeliveryQuoteError(null);
    setDeliveryQuoteRetryKey((value) => value + 1);
  };
  useEffect(() => {
    const addressId = selectedAddress?.id;
    if (!isAuthenticated || !addressId || !/^[0-9a-f-]{36}$/i.test(addressId) || deliveryStoreIds.length === 0) {
      setDeliveryQuote(null);
      setDeliveryQuoteError(null);
      setIsDeliveryQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setDeliveryQuote(null);
    setDeliveryQuoteError(null);
    setIsDeliveryQuoteLoading(true);
    ordersApi.getDeliveryQuote(addressId, deliveryStoreIds).then((quote) => {
      if (!cancelled) setDeliveryQuote({
        fee: Number(quote.deliveryFee) || 0,
        farthestDistanceKm: Number(quote.farthestDistanceKm) || 0,
        storeFees: Object.fromEntries((quote.storeFees || []).map((entry) => [entry.storeId, Number(entry.deliveryFee) || 0])),
      });
    }).catch((error: any) => {
      if (!cancelled) {
        setDeliveryQuote(null);
        setDeliveryQuoteError(error?.message || 'تعذر حساب رسوم التوصيل. تحقق من العنوان والمحافظة.');
      }
    }).finally(() => { if (!cancelled) setIsDeliveryQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude, deliveryStoreIdsKey, deliveryQuoteRetryKey]);
  const baseDeliveryFee = cartSubOrders.length === 0 ? 0 : deliveryQuote?.fee ?? 0;
  const cartDeliveryFee = isFreeDeliveryPromo ? 0 : Math.max(0, Math.round(baseDeliveryFee * (1 - deliveryDiscountPercent / 100)));
  const quotedWeightTotal = cartSubOrders.reduce((sum, group) => sum + (deliveryQuote?.storeFees[group.storeId] ?? group.deliveryFee), 0);
  let allocatedDeliveryFee = 0;
  const cartSubOrdersWithFees = cartSubOrders.map((group, index) => {
    const weight = deliveryQuote?.storeFees[group.storeId] ?? group.deliveryFee;
    const fee = index === cartSubOrders.length - 1
      ? cartDeliveryFee - allocatedDeliveryFee
      : quotedWeightTotal > 0 ? Math.floor(cartDeliveryFee * weight / quotedWeightTotal) : 0;
    allocatedDeliveryFee += fee;
    return { ...group, deliveryFee: fee };
  });
  const cartFarthestStoreDistanceKm = deliveryQuote?.farthestDistanceKm ?? 0;
  const cartDiscount = Math.round(cartSubtotal * (discountPercent / 100));
  const cartTotal = Math.max(0, cartSubtotal + cartDeliveryFee - cartDiscount);
  const selectedProductDiscountDeal = productDiscountDealId
    ? deals.find((deal) => deal.id === productDiscountDealId) || null
    : null;

  useEffect(() => {
    if (!productDiscountDealId || !selectedProductDiscountDeal) return;
    const tiers = [...(selectedProductDiscountDeal.discountTiers || [])].sort((left, right) => left.minAmount - right.minAmount);
    let percent = Number(selectedProductDiscountDeal.discountPercent) || 0;
    if (tiers.length > 0) {
      const matched = tiers.find((tier) => cartSubtotal >= tier.minAmount &&
        (tier.maxAmount == null || tier.maxAmount <= 0 || cartSubtotal < tier.maxAmount));
      percent = matched?.discountPercent ?? (cartSubtotal >= tiers[tiers.length - 1].minAmount
        ? tiers[tiers.length - 1].discountPercent
        : tiers[0].discountPercent);
    }
    setDiscountPercent(Math.max(0, Math.min(100, Number(percent) || 0)));
    setPromoMessage(`تم تفعيل العرض: ${selectedProductDiscountDeal.title}`);
  }, [cartSubtotal, deals, productDiscountDealId, selectedProductDiscountDeal]);

  const applyPromoCode = async (code: string): Promise<boolean> => {
    try {
      const result = await ordersApi.validateCouponCode(code.trim(), cartSubtotal);
      const percent = Math.min(100, Math.max(0, Number(result.discountPercent) || 0));
      if (percent <= 0) return false;
      setPromoCode(result.code);
      setProductDiscountDealId(null);
      setDeliveryPromoDealId(null);
      setIsTieredPromo(Boolean(result.isTiered));
      setPromoMessage(result.message || null);
      if (result.discountKind === 'DELIVERY_DISCOUNT') {
        setDeliveryDiscountPercent(percent);
        setDiscountPercent(0);
        setIsFreeDeliveryPromo(percent >= 100);
      } else {
        setDiscountPercent(percent);
        setDeliveryDiscountPercent(0);
        setIsFreeDeliveryPromo(false);
      }
      return percent > 0;
    } catch {
      setPromoMessage(null);
      return false;
    }
  };

  const clearPromoCode = () => {
    setPromoCode('');
    setProductDiscountDealId(null);
    setDiscountPercent(0);
    setDeliveryDiscountPercent(0);
    setIsFreeDeliveryPromo(false);
    setDeliveryPromoDealId(null);
    setPromoMessage(null);
    setIsTieredPromo(false);
  };

  useEffect(() => {
    if (promoCode && isTieredPromo && cartSubtotal > 0) {
      ordersApi.validateCouponCode(promoCode, cartSubtotal)
        .then((res) => {
          const pct = Math.min(100, Math.max(0, Number(res.discountPercent) || 0));
          setDiscountPercent(pct);
          setPromoMessage(res.message || null);
        })
        .catch(() => {});
    }
  }, [cartSubtotal, promoCode, isTieredPromo]);

  const activateDeliveryDeal = (dealId: string, percent: number) => {
    setDeliveryPromoDealId(dealId);
    setDeliveryDiscountPercent(Math.min(100, Math.max(0, percent)));
    setDiscountPercent(0);
    setIsFreeDeliveryPromo(percent >= 100);
    setPromoCode('');
    setProductDiscountDealId(null);
    setPromoMessage(null);
    setIsTieredPromo(false);
  };

  const activateProductDiscountDeal = (dealId: string) => {
    const deal = deals.find((item) => item.id === dealId);
    if (!deal || deal.couponCode || deal.dealType !== 'PRODUCT_DISCOUNT') return;
    setProductDiscountDealId(dealId);
    setPromoCode('');
    setDeliveryPromoDealId(null);
    setDeliveryDiscountPercent(0);
    setIsFreeDeliveryPromo(false);
    setDiscountPercent(Number(deal.discountPercent) || 0);
    setPromoMessage(`تم تفعيل العرض: ${deal.title}`);
    setIsTieredPromo(Boolean(deal.discountTiers?.length));
  };

  const addNewAddress = async (addr: Omit<Address, 'id'>) => {
    if (!isAuthenticated) {
      Alert.alert('تسجيل الدخول مطلوب', 'سجّل الدخول لحفظ عنوانك في حسابك.');
      navigateTo('auth');
      return;
    }

    const saved = await addressApi.addAddress(addr);
    addressMutationRevision.current++;
    setAddresses(current => [...current.map(a => saved.isDefault ? { ...a, isDefault: false } : a), saved]);
    await refreshAddresses();
    setSelectedAddress(saved);
  };

  const updateSavedAddress = async (id: string, addr: Omit<Address, 'id'>) => {
    const saved = await addressApi.updateAddress(id, addr);
    const wasSelected = selectedAddress?.id === id;
    addressMutationRevision.current++;
    const updated = { ...addr, id: saved.id, isDefault: saved.isDefault };
    setAddresses(current => [...current.filter(a => a.id !== id).map(a => saved.isDefault ? { ...a, isDefault: false } : a), updated]);
    if (wasSelected) setSelectedAddress(updated);
    await refreshAddresses();
  };
  const deleteSavedAddress = async (id: string) => {
    await addressApi.deleteAddress(id);
    addressMutationRevision.current++;
    const remaining = addresses.filter(a => a.id !== id);
    setAddresses(remaining);
    setSelectedAddress(current => current?.id === id ? remaining.find(a => a.isDefault) || remaining[0] || null : current);
    await refreshAddresses();
  };
  const refreshData = async () => {
    const jobs = [refreshCatalog()];
    if (isAuthenticated) {
      jobs.push(refreshOrders(), refreshAddresses(), authApi.me().then(async fresh => {
        const updated = { name: fresh.fullName || fresh.name || '', phone: fresh.phone };
        setUser(updated);
        await AsyncStorage.setItem('@bs_customer_user', JSON.stringify(updated));
      }));
    }
    await Promise.all(jobs);
  };

  const placeOrder = async (
    paymentMethod: PaymentMethodType,
    options?: {
      receiptUri?: string;
      receiptFileName?: string;
      receiptMimeType?: string;
      transferProvider?: TransferProviderType;
      transferReference?: string;
      notes?: string;
    }
  ): Promise<Order> => {
    if (!isAuthenticated) {
      Alert.alert('تسجيل الدخول مطلوب', 'سجّل الدخول قبل إرسال الطلب.');
      navigateTo('auth');
      throw new Error('يجب تسجيل الدخول لإرسال الطلب.');
    }

    if (!selectedAddress) {
      Alert.alert('تنبيه عنوان التوصيل', 'يرجى تسجيل أو اختيار عنوان التوصيل أولاً قبل تأكيد الطلب');
      throw new Error('يرجى تحديد عنوان التوصيل');
    }

    const isManual = paymentMethod === 'MANUAL_TRANSFER';
    const receiptUri = options?.receiptUri;
    const notes = options?.notes;
    if (isManual && (!options?.transferProvider || !receiptUri)) {
      const error = new Error('اختر طريقة التحويل وأرفق صورة الإيصال قبل إرسال الطلب.');
      Alert.alert('بيانات التحويل ناقصة', error.message);
      throw error;
    }

    try {
      // Backend recalculates prices, promotions, store separation, and invoice totals.
      const res = await ordersApi.placeOrder({
        newAddress: {
          label: selectedAddress.label === 'العمل' ? 1 : selectedAddress.label === 'أخرى' ? 2 : 0,
          city: selectedAddress.city,
          district: selectedAddress.district,
          street: selectedAddress.street,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        },
        paymentMethod: isManual ? 1 : 0,
        notes,
        deliveryDealId: deliveryPromoDealId || undefined,
        couponCode: promoCode || undefined,
        productDiscountDealId: productDiscountDealId || undefined,
        transferProvider: isManual ? options?.transferProvider : undefined,
        transferReference: isManual ? options?.transferReference?.trim() || undefined : undefined,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        items: cart.map((c) => ({
          productId: c.product.dealId ? undefined : c.product.id,
          dealId: c.product.dealId,
          dealProductId: c.product.dealProductId,
          quantity: c.quantity, variantId: c.variantId, imageValueId: c.imageValueId,
          bundleSelections: c.bundleSelections?.map(selection => ({ dealProductId: selection.dealProductId, variantId: selection.variantId, imageValueId: selection.imageValueId })),
        })),
      });

      // If manual transfer receipt exists, upload it to the backend
      let receiptUploaded = false;
      let receiptUploadFailed = false;
      let receiptUploadError = '';
      let receiptUrl: string | undefined;
      if (isManual && receiptUri) {
        try {
          const uploadedReceipt = await paymentsApi.uploadReceipt(
            res.id,
            receiptUri,
            options?.receiptFileName || 'transfer-receipt.jpg',
            options?.receiptMimeType || 'image/jpeg'
          );
          receiptUploaded = true;
          receiptUrl = uploadedReceipt?.receiptUrl;
        } catch (uploadErr) {
          console.warn('Receipt upload deferred:', uploadErr);
          receiptUploadFailed = true;
          receiptUploadError = uploadErr instanceof Error && uploadErr.message.trim()
            ? uploadErr.message.trim()
            : 'تعذر الاتصال بالخدمة أثناء رفع الإيصال.';
        }
      }

      const newOrder: Order = {
        id: res.id,
        orderNumber: res.orderNumber,
        createdAt: formatOrderDate(res.createdAt || new Date()),
        status: isManual && receiptUploaded ? 'PAYMENT_PENDING_VERIFICATION' : mapBackendOrderStatus(res.status),
        items: [...cart],
        subtotal: res.subTotal,
        deliveryFee: res.deliveryFee,
        discount: res.discount,
        totalAmount: res.totalAmount,
        address: selectedAddress,
        paymentMethod,
        paymentStatus: (isManual && receiptUploaded ? 'PENDING_VERIFICATION' : 'PENDING') as PaymentStatusType,
        transferProvider: isManual ? options?.transferProvider : undefined,
        transferReceiptUrl: receiptUrl,
        transferReference: options?.transferReference,
        notes,
      };

      setOrders((prev) => {
        const next = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
        return next;
      });
      setCurrentOrder(newOrder);
      await clearCart();
      setCurrentScreen('tracking');
      if (receiptUploadFailed) {
        Alert.alert(
          'تم إنشاء الطلب',
          `تعذر رفع الإيصال: ${receiptUploadError}\nطلبك محفوظ. أعد رفع الإيصال حتى تتمكن الإدارة من مراجعة التحويل.`,
          [
            { text: 'لاحقاً', style: 'cancel' },
            {
              text: 'إعادة رفع الإيصال',
              onPress: () => {
                void (async () => {
                  try {
                    await paymentsApi.uploadReceipt(
                      newOrder.id,
                      receiptUri!,
                      options?.receiptFileName || 'transfer-receipt.jpg',
                      options?.receiptMimeType || 'image/jpeg'
                    );
                    await refreshOrders();
                    Alert.alert('تم رفع الإيصال', 'أصبح إيصال التحويل متاحاً للإدارة للمراجعة.');
                  } catch (retryError) {
                    const reason = retryError instanceof Error ? retryError.message : 'تعذر الاتصال بالخدمة.';
                    Alert.alert('تعذر رفع الإيصال', `${reason}\nيمكنك إعادة المحاولة لاحقاً من تفاصيل الطلب.`);
                  }
                })();
              },
            },
          ]
        );
      }
      return newOrder;
    } catch (err: any) {
      Alert.alert(
        'خطأ في الطلب',
        err.message || 'فشل إرسال الطلب، تحقق من توفر الكميات وبيانات العنوان'
      );
      throw err;
    }
  };

  const login = async (phone: string, password: string, name?: string) => {
    try {
      const res = await authApi.login(phone, password);
      const userData = { name: res.user.fullName || res.user.name || name || '', phone: res.user.phone };
      setUser(userData);
      await AsyncStorage.setItem('@bs_customer_user', JSON.stringify(userData));
      setIsAuthenticated(true);
      navigateTo('home');
    } catch (err: any) {
      Alert.alert('خطأ في تسجيل الدخول', err.message || 'فشل تسجيل الدخول، تأكد من صحة رقم الهاتف وكلمة المرور');
      throw err;
    }
  };

  const register = async (
    name: string,
    phone: string,
    email: string,
    password = 'Password123!',
    initialAddress?: Omit<Address, 'id'>
  ) => {
    try {
      const res = await authApi.register(name, phone, password, initialAddress);
      const userData = { name: res.user?.fullName || res.user?.name || name, phone: res.user?.phone || phone, email };
      setUser(userData);
      await AsyncStorage.setItem('@bs_customer_user', JSON.stringify(userData));
      setIsAuthenticated(true);
      navigateTo('home');
    } catch (err: any) {
      Alert.alert('خطأ في إنشاء الحساب', err.message || 'فشل إنشاء الحساب، يرجى المحاولة برقم هاتف آخر');
      throw err;
    }
  };

  const logout = async () => {
    try { await unregisterPushDevice(api); } catch (e) { console.warn('تعذر إلغاء تسجيل إشعارات العميل:', e); }
    try {
      await authApi.logout();
    } catch {}
    await AsyncStorage.removeItem('@bs_customer_user');
    await AsyncStorage.removeItem('@bs_customer_orders');
    await AsyncStorage.removeItem('@bs_customer_addresses');
    await api.setToken(null);
    setCart([]);
    clearPromoCode();
    setUser(null);
    setIsAuthenticated(false);
    setOrders([]);
    setAddresses([]);
    setSelectedAddress(null);
    setCurrentOrder(null);
    navigateTo('auth');
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigateTo,
        categories,
        stores,
        orderHours,
        businessNow,
        products,
        isLoadingCatalog,
        selectedCategory,
        setSelectedCategory,
        selectedStore,
        selectedStoreDealId,
        setSelectedStore,
        searchQuery,
        setSearchQuery,
        cart,
        addToCart,
        productOptionsRequest, closeProductOptions: () => setProductOptionsRequest(null),
        bundleOptionsRequest, closeBundleOptions: () => setBundleOptionsRequest(null), getItemKey,
        addBundlePieceToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubOrders: cartSubOrdersWithFees,
        cartSubtotal,
        cartDeliveryFee,
        cartFarthestStoreDistanceKm,
        isDeliveryQuoteLoading,
        deliveryQuoteError,
        hasDeliveryQuote: Boolean(deliveryQuote) || cartSubOrders.length === 0,
        refreshDeliveryQuote,
        cartDiscount,
        cartTotal,
        promoCode,
        promoMessage,
        isTieredPromo,
        applyPromoCode,
        clearPromoCode,
        activateDeliveryDeal,
        activeDeliveryDealId: deliveryPromoDealId,
        activeOrderDiscountDeal: selectedProductDiscountDeal
          ? { id: selectedProductDiscountDeal.id, title: selectedProductDiscountDeal.title }
          : null,
        activateProductDiscountDeal,
        isFreeDeliveryPromo,
        addresses,
        selectedAddress,
        setSelectedAddress,
        addNewAddress,
        orders,
        currentOrder,
        setCurrentOrder,
        placeOrder,
        isAuthenticated,
        isAuthLoading,
        login,
        register,
        logout,
        user,
        registeredUser,
        setRegisteredUser,
        refreshData,
        updateSavedAddress,
        deleteSavedAddress,
        refreshCatalog,
        refreshOrders,
        deals,
        setDeals,
        isDarkMode,
        toggleTheme,
        colors: isDarkMode ? darkColors : lightColors,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
