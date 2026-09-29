import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Product, CartItem, Address, Order, SubOrderGroup, PaymentMethodType, OrderStatusType, Store, BundlePiece, Category } from '../types';
import { DealItem } from '../components/DealDetailsModal';
import { api, authApi, catalogApi, cartApi, ordersApi, addressApi, paymentsApi } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, lightColors, darkColors, ThemeColors, setGlobalThemeMode } from '../theme';

export type ScreenName = 'home' | 'category' | 'category_stores' | 'store_detail' | 'cart' | 'checkout' | 'tracking' | 'profile' | 'auth';

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
  navigateTo: (screen: ScreenName) => void;
  categories: Category[];
  stores: Store[];
  products: Product[];
  isLoadingCatalog: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedStore: Store | null;
  setSelectedStore: React.Dispatch<React.SetStateAction<Store | null>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  addBundlePieceToCart: (product: Product, piece: BundlePiece, quantity?: number) => void;
  removeFromCart: (itemKey: string) => Promise<void>;
  updateQuantity: (itemKey: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartSubOrders: SubOrderGroup[];
  cartSubtotal: number;
  cartDeliveryFee: number;
  cartFarthestStoreDistanceKm: number;
  cartDiscount: number;
  cartTotal: number;
  promoCode: string;
  applyPromoCode: (code: string) => Promise<boolean>;
  activateDeliveryDeal: (dealId: string, percent: number) => void;
  addresses: Address[];
  selectedAddress: Address | null;
  setSelectedAddress: React.Dispatch<React.SetStateAction<Address | null>>;
  addNewAddress: (addr: Omit<Address, 'id'>) => Promise<void>;
  orders: Order[];
  currentOrder: Order | null;
  setCurrentOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  placeOrder: (paymentMethod: PaymentMethodType, receiptUrl?: string, notes?: string) => Promise<Order>;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (phone: string, password?: string, name?: string) => Promise<void>;
  register: (name: string, phone: string, email: string, password?: string, initialAddress?: Omit<Address, 'id'>) => Promise<void>;
  logout: () => Promise<void>;
  user: { name: string; phone: string; email?: string } | null;
  registeredUser: { name: string; phone: string; email: string } | null;
  setRegisteredUser: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string } | null>>;
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isFreeDeliveryPromo, setIsFreeDeliveryPromo] = useState<boolean>(false);
  const [deliveryDiscountPercent, setDeliveryDiscountPercent] = useState(0);
  const [deliveryPromoDealId, setDeliveryPromoDealId] = useState<string | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<{ fee: number; farthestDistanceKm: number; storeFees: Record<string, number> } | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [registeredUser, setRegisteredUser] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [user, setUser] = useState<{ name: string; phone: string; email?: string } | null>(null);

  // ─── Fetch live catalog from Backend ───────────────────────────────────────
  const refreshCatalog = async () => {
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
          storeId: p.storeId,
          storeName: p.storeName || 'متجر',
          categoryId: p.categoryId,
          subcategoryId: subcategoryName,
          name: p.name,
          description: cleanDesc,
          sellingPrice: p.sellingPrice,
          imageUrl: p.images?.[0] || '',
          images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
          sourceType: (p.sourceType === 'ExternalStore' ? 'EXTERNAL_STORE' : 'IN_STOCK'),
          inStock: true,
          unit: 'حبة',
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

        const primaryCatId = allStoreCatIds[0] || (catsRes[0]?.id ?? '');
        const primaryCatObj = catsRes.find((c) => c.id === primaryCatId);

        return {
          id: s.id,
          name: s.name,
          category: primaryCatObj ? primaryCatObj.name : 'عام',
          categoryId: primaryCatId,
          categoryIds: allStoreCatIds,
          subcategories: storeSubcats.length > 0 ? storeSubcats : ['عام'],
          phone: s.phone,
          address: s.address,
          imageUrl: s.imageUrl || '',
          rating: 4.8,
          reviewsCount: 24,
          deliveryTime: '25-35 دقيقة',
          deliveryFee: 500,
          latitude: Number(s.latitude ?? 0),
          longitude: Number(s.longitude ?? 0),
          isOpen: s.isActive,
          isVerified: true,
          tags: ['توصيل فوري', 'متجر معتمد'],
        };
      });

      const mappedDeals: DealItem[] = (Array.isArray(dealsRes) ? dealsRes : []).map((d: any, idx: number) => ({
        id: String(d.id ?? `deal-${idx}`), title: String(d.title ?? 'عرض'), storeName: String(d.storeName ?? 'متجر'),
        storeId: d.storeId, categoryId: d.categoryId, description: d.description || '', badge: d.badge || 'عرض خاص',
        imageUrl: d.imageUrl || '', originalPrice: Number(d.originalPrice ?? 0) || 0,
        offerPrice: Number(d.offerPrice ?? d.discountPrice ?? 0) || 0,
        discountPercent: Number(d.discountPercent ?? 0) || 0, couponCode: d.couponCode,
        isFreeDelivery: d.isFreeDelivery, dealType: d.discountKind || d.dealType || d.dealKind,
        discountKind: d.discountKind,
        deliveryDiscountPercent: Number(d.deliveryDiscountPercent ?? d.discountPercent ?? 0) || 0,
        expiresAt: d.expiresAt, isPublic: d.isActive !== false && d.isPublic !== false, visibility: d.visibility,
        products: (Array.isArray(d.products) ? d.products : (Array.isArray(d.bundleItems) ? d.bundleItems : [])).map((p: any, pidx: number) => ({
          id: String(p.id ?? `piece-${pidx}`), name: String(p.name ?? 'منتج'), price: Number(p.price ?? 0) || 0,
          description: p.description || '', imageUrl: p.imageUrl,
        })),
      }));
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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await api.initToken();
        const storedUser = await AsyncStorage.getItem('@bs_customer_user');
        if (token && storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setIsAuthenticated(true);
          setCurrentScreen('home');
        } else {
          setIsAuthenticated(false);
          setCurrentScreen('auth');
        }
        const storedAddrs = await AsyncStorage.getItem('@bs_customer_addresses');
        if (storedAddrs) {
          const parsedAddrs = JSON.parse(storedAddrs);
          if (Array.isArray(parsedAddrs) && parsedAddrs.length > 0) {
            setAddresses(parsedAddrs);
            setSelectedAddress(parsedAddrs.find((a: Address) => a.isDefault) || parsedAddrs[0]);
          }
        }

        const storedOrders = await AsyncStorage.getItem('@bs_customer_orders');
        if (storedOrders) {
          try {
            const parsedOrders = JSON.parse(storedOrders);
            if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
              setOrders(parsedOrders);
              setCurrentOrder(parsedOrders[0]);
            }
          } catch {}
        }

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
        refreshCatalog();
      }
    };
    restoreSession();
  }, []);

  const navigateTo = (screen: ScreenName) => {
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
    if (!token && !isAuthenticated) return;
    try {
      const ordersRes = await ordersApi.getMyOrders();
      if (!Array.isArray(ordersRes)) return;
      const mappedOrders: Order[] = ordersRes.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt
          ? new Date(o.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        status: mapBackendOrderStatus(o.status),
        items: (o.subOrders || []).flatMap((so: any) =>
          (so.items || []).map((i: any) => ({
            product: {
              id: i.productId || i.id,
              storeId: so.storeId,
              storeName: so.storeName,
              categoryId: '',
              name: i.productName || 'منتج',
              description: '',
              sellingPrice: i.unitPrice || 0,
              imageUrl: i.imageUrl || '',
              sourceType: 'IN_STOCK' as const,
              inStock: true,
            },
            quantity: i.quantity || 1,
          }))
        ),
        subtotal: o.subTotal || 0,
        deliveryFee: o.deliveryFee || 0,
        discount: o.discount || 0,
        totalAmount: o.totalAmount || 0,
        address: {
          id: 'addr-order',
          label: 'المنزل',
          city: o.deliveryAddress || 'العنوان المحدد',
          district: '',
          street: '',
          latitude: Number(o.customerLatitude ?? 15.34),
          longitude: Number(o.customerLongitude ?? 44.20),
          isDefault: true,
        },
        paymentMethod: o.paymentMethod === 1 ? 'MANUAL_TRANSFER' : 'CASH_ON_DELIVERY',
        paymentStatus: o.paymentStatus === 2 ? 'VERIFIED' : o.paymentStatus === 3 ? 'REJECTED' : o.paymentStatus === 1 ? 'PAID' : 'PENDING',
        notes: o.notes,
        customerRating: o.customerRating,
        customerReview: o.customerReview,
        driver: o.driverName
          ? {
              id: 'drv',
              name: o.driverName,
              phone: o.driverPhone || '',
              rating: 4.9,
              vehiclePlate: 'مركبة معتمدة',
              avatarUrl: '',
            }
          : undefined,
      }));

      setOrders(mappedOrders);
      await AsyncStorage.setItem('@bs_customer_orders', JSON.stringify(mappedOrders));
      setCurrentOrder((prev) => {
        if (!prev) return mappedOrders[0] || null;
        const matching = mappedOrders.find((m) => m.id === prev.id);
        return matching || prev;
      });
    } catch (err) {
      console.warn('Failed to load orders from backend:', err);
    }
  };

  // Fetch after session restoration/login has committed authenticated state.
  // The direct calls in login/register can run against the previous state value.
  useEffect(() => {
    if (isAuthenticated) {
      void refreshOrders();
    } else {
      setOrders([]);
    }
  }, [isAuthenticated]);

  const getItemKey = (item: CartItem) =>
    item.selectedPiece ? `${item.product.id}__piece__${item.selectedPiece.id}` : item.product.id;

  const addToCart = async (product: Product, quantity = 1) => {
    try {
      if (isAuthenticated && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(product.id)) {
        await cartApi.addItem(product.id, quantity);
      }
    } catch (err: any) {
      console.warn('Cart backend sync note:', err.message);
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && !item.selectedPiece);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && !item.selectedPiece
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const addBundlePieceToCart = (product: Product, piece: BundlePiece, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedPiece?.id === piece.id
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedPiece?.id === piece.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedPiece: piece }];
    });
  };

  const removeFromCart = async (itemKey: string) => {
    setCart((prev) =>
      prev.filter((item) => getItemKey(item) !== itemKey && item.product.id !== itemKey)
    );
  };

  const updateQuantity = async (itemKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (getItemKey(item) === itemKey || (!item.selectedPiece && item.product.id === itemKey)) {
          return { ...item, quantity };
        }
        return item;
      })
    );
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
      const price = item.selectedPiece ? item.selectedPiece.price : (item.product.discountPrice ?? item.product.sellingPrice);
      return sum + price * item.quantity;
    }, 0);
    const deliveryFee = Number(stores.find((store) => store.id === storeId)?.deliveryFee) || 500;
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
  useEffect(() => {
    const addressId = selectedAddress?.id;
    if (!isAuthenticated || !addressId || !/^[0-9a-f-]{36}$/i.test(addressId) || deliveryStoreIds.length === 0) {
      setDeliveryQuote(null);
      return;
    }
    let cancelled = false;
    setDeliveryQuote(null);
    ordersApi.getDeliveryQuote(addressId, deliveryStoreIds).then((quote) => {
      if (!cancelled) setDeliveryQuote({
        fee: Number(quote.deliveryFee) || 0,
        farthestDistanceKm: Number(quote.farthestDistanceKm) || 0,
        storeFees: Object.fromEntries((quote.storeFees || []).map((entry) => [entry.storeId, Number(entry.deliveryFee) || 0])),
      });
    }).catch(() => { if (!cancelled) setDeliveryQuote(null); });
    return () => { cancelled = true; };
  }, [isAuthenticated, selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude, deliveryStoreIdsKey]);
  const fallbackDeliveryTotal = cartSubOrders.reduce((sum, group) => sum + group.deliveryFee, 0);
  const baseDeliveryFee = cartSubOrders.length === 0 ? 0 : deliveryQuote?.fee ?? fallbackDeliveryTotal;
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

  const applyPromoCode = async (code: string): Promise<boolean> => {
    try {
      const result = await ordersApi.validateCouponCode(code.trim());
      const percent = Math.min(100, Math.max(0, Number(result.discountPercent) || 0));
      setPromoCode(result.code);
      setDeliveryPromoDealId(null);
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
      return false;
    }
  };

  const activateDeliveryDeal = (dealId: string, percent: number) => {
    setDeliveryPromoDealId(dealId);
    setDeliveryDiscountPercent(Math.min(100, Math.max(0, percent)));
    setDiscountPercent(0);
    setIsFreeDeliveryPromo(percent >= 100);
    setPromoCode('');
  };

  const addNewAddress = async (addr: Omit<Address, 'id'>) => {
    let saved: Address;
    try {
      if (isAuthenticated) {
        saved = await addressApi.addAddress(addr);
      } else {
        saved = { ...addr, id: `addr-${Date.now()}` };
      }
    } catch {
      saved = { ...addr, id: `addr-${Date.now()}` };
    }

    const updated = [...addresses, saved];
    setAddresses(updated);
    setSelectedAddress(saved);
    await AsyncStorage.setItem('@bs_customer_addresses', JSON.stringify(updated));
  };

  const placeOrder = async (
    paymentMethod: PaymentMethodType,
    receiptUrl?: string,
    notes?: string
  ): Promise<Order> => {
    if (!selectedAddress) {
      Alert.alert('تنبيه عنوان التوصيل', 'يرجى تسجيل أو اختيار عنوان التوصيل أولاً قبل تأكيد الطلب');
      throw new Error('يرجى تحديد عنوان التوصيل');
    }

    const isManual = paymentMethod === 'MANUAL_TRANSFER';

    try {
      // Backend handles complete validation, price freezing, store separation, and inventory reservation
      const res = await ordersApi.placeOrder({
        newAddress: {
          label: selectedAddress.label === 'العمل' ? 1 : selectedAddress.label === 'أخرى' ? 2 : 0,
          city: selectedAddress.city,
          district: selectedAddress.district || 'وسط المدينة',
          street: selectedAddress.street || 'الشارع العام',
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        },
        paymentMethod: isManual ? 1 : 0,
        notes,
        deliveryDealId: deliveryPromoDealId || undefined,
        couponCode: promoCode || undefined,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        items: cart.map((c) => ({
          productId: c.product.dealId ? undefined : c.product.id,
          dealId: c.product.dealId,
          dealProductId: c.product.dealProductId,
          quantity: c.quantity,
        })),
      });

      // If manual transfer receipt exists, upload it to the backend
      if (isManual && receiptUrl) {
        try {
          await paymentsApi.uploadReceipt(res.id, receiptUrl);
        } catch (uploadErr) {
          console.warn('Receipt upload deferred:', uploadErr);
        }
      }

      const newOrder: Order = {
        id: res.id,
        orderNumber: res.orderNumber,
        createdAt: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        status: mapBackendOrderStatus(res.status),
        items: [...cart],
        subtotal: res.subTotal,
        deliveryFee: res.deliveryFee,
        discount: res.discount,
        totalAmount: res.totalAmount,
        address: selectedAddress,
        paymentMethod,
        paymentStatus: isManual ? 'PENDING' : 'PENDING',
        transferReceiptUrl: receiptUrl,
        notes,
      };

      setOrders((prev) => {
        const next = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
        void AsyncStorage.setItem('@bs_customer_orders', JSON.stringify(next));
        return next;
      });
      setCurrentOrder(newOrder);
      await clearCart();
      navigateTo('tracking');
      return newOrder;
    } catch (err: any) {
      const isMockItem = cart.some(
        (c) =>
          c.product.id.startsWith('prod-') ||
          c.product.id.startsWith('deal-') ||
          c.product.id.startsWith('item-')
      );
      if (isMockItem || !isAuthenticated) {
        const fallbackOrder: Order = {
          id: `order-${Date.now()}`,
          orderNumber: `WSL-${Math.floor(10000 + Math.random() * 90000)}`,
          createdAt: new Date().toLocaleTimeString('ar-YE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: isManual ? 'PAYMENT_PENDING_VERIFICATION' : 'CONFIRMED',
          items: [...cart],
          subtotal: cartSubtotal,
          deliveryFee: cartDeliveryFee,
          discount: cartDiscount,
          totalAmount: cartTotal,
          address: selectedAddress,
          paymentMethod,
          paymentStatus: isManual ? 'PENDING' : 'PENDING',
          transferReceiptUrl: receiptUrl,
          notes,
        };

        setOrders((prev) => {
          const next = [fallbackOrder, ...prev.filter((o) => o.id !== fallbackOrder.id)];
          void AsyncStorage.setItem('@bs_customer_orders', JSON.stringify(next));
          return next;
        });
        setCurrentOrder(fallbackOrder);
        await clearCart();
        navigateTo('tracking');
        return fallbackOrder;
      }

      Alert.alert(
        'خطأ في الطلب',
        err.message || 'فشل إرسال الطلب، تحقق من توفر الكميات وبيانات العنوان'
      );
      throw err;
    }
  };

  const login = async (phone: string, password = 'Password123!', name?: string) => {
    try {
      const res = await authApi.login(phone, password);
      const userData = { name: res.user.name || name || 'عميل BS Store', phone: res.user.phone };
      setUser(userData);
      await AsyncStorage.setItem('@bs_customer_user', JSON.stringify(userData));
      setIsAuthenticated(true);
      refreshOrders();
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
      const userData = { name: res.user?.name || name, phone: res.user?.phone || phone, email };
      setUser(userData);
      await AsyncStorage.setItem('@bs_customer_user', JSON.stringify(userData));
      setIsAuthenticated(true);

      if (initialAddress) {
        let savedAddr: Address = {
          ...initialAddress,
          id: `addr-${Date.now()}`,
          isDefault: true,
        };
        try {
          const apiAddr = await addressApi.addAddress(initialAddress);
          if (apiAddr) savedAddr = apiAddr;
        } catch {}
        setAddresses([savedAddr]);
        setSelectedAddress(savedAddr);
        await AsyncStorage.setItem('@bs_customer_addresses', JSON.stringify([savedAddr]));
      }

      refreshOrders();
      navigateTo('home');
    } catch (err: any) {
      Alert.alert('خطأ في إنشاء الحساب', err.message || 'فشل إنشاء الحساب، يرجى المحاولة برقم هاتف آخر');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    await AsyncStorage.removeItem('@bs_customer_user');
    await AsyncStorage.removeItem('@bs_customer_orders');
    api.setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setOrders([]);
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
        products,
        isLoadingCatalog,
        selectedCategory,
        setSelectedCategory,
        selectedStore,
        setSelectedStore,
        searchQuery,
        setSearchQuery,
        cart,
        addToCart,
        addBundlePieceToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubOrders: cartSubOrdersWithFees,
        cartSubtotal,
        cartDeliveryFee,
        cartFarthestStoreDistanceKm,
        cartDiscount,
        cartTotal,
        promoCode,
        applyPromoCode,
        activateDeliveryDeal,
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
