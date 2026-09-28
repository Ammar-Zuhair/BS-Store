import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Product, CartItem, Address, Order, SubOrderGroup, PaymentMethodType, OrderStatusType, Store, BundlePiece, Category } from '../types';
import { DealItem } from '../components/DealDetailsModal';
import { initialDeals } from '../components/OffersDealsSection';
import { api, authApi, catalogApi, cartApi, ordersApi, addressApi, paymentsApi } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScreenName = 'home' | 'category' | 'category_stores' | 'store_detail' | 'cart' | 'checkout' | 'tracking' | 'profile' | 'auth';

const ICON_MAP: Record<string, string> = {
  'silverware-fork-knife': '🍔',
  'cart-outline': '🛒',
  'medical-bag': '💊',
  'cellphone': '📱',
  'tshirt-crew': '👕',
  'folder-outline': '📁',
};

const DEFAULT_STORE_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
const DEFAULT_PROD_IMG = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80';

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
  cartDiscount: number;
  cartTotal: number;
  promoCode: string;
  applyPromoCode: (code: string) => boolean;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<DealItem[]>(initialDeals);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-all');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isFreeDeliveryPromo, setIsFreeDeliveryPromo] = useState<boolean>(false);
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
        icon: ICON_MAP[c.iconName] || '🛍️',
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
          imageUrl: p.images?.[0] || DEFAULT_PROD_IMG,
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
          imageUrl: s.imageUrl || DEFAULT_STORE_IMG,
          rating: 4.8,
          reviewsCount: 24,
          deliveryTime: '25-35 دقيقة',
          deliveryFee: 500,
          isOpen: s.isActive,
          isVerified: true,
          tags: ['توصيل فوري', 'متجر معتمد'],
        };
      });

      if (dealsRes && Array.isArray(dealsRes) && dealsRes.length > 0) {
        const mappedDeals: DealItem[] = dealsRes.map((d: any) => ({
          id: d.id,
          title: d.title,
          storeName: d.storeName,
          storeId: d.storeId,
          categoryId: d.categoryId,
          description: d.description,
          badge: d.badge || 'عرض خاص',
          imageUrl: d.imageUrl,
          originalPrice: d.originalPrice,
          offerPrice: d.offerPrice,
          discountPercent: d.discountPercent,
          couponCode: d.couponCode,
          isFreeDelivery: d.isFreeDelivery,
          expiresAt: d.expiresAt,
          isPublic: d.isActive !== false,
          products: (d.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description,
            imageUrl: p.imageUrl,
          })),
        }));
        setDeals(mappedDeals);
      }

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
        }
        const storedAddrs = await AsyncStorage.getItem('@bs_customer_addresses');
        if (storedAddrs) {
          const parsedAddrs = JSON.parse(storedAddrs);
          if (Array.isArray(parsedAddrs) && parsedAddrs.length > 0) {
            setAddresses(parsedAddrs);
            setSelectedAddress(parsedAddrs.find((a: Address) => a.isDefault) || parsedAddrs[0]);
          }
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
      default: return 'CONFIRMED';
    }
  };

  const refreshOrders = async () => {
    if (!isAuthenticated) return;
    try {
      const ordersRes = await ordersApi.getMyOrders();
      const mappedOrders: Order[] = ordersRes.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: new Date(o.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        status: mapBackendOrderStatus(o.status),
        items: (o.subOrders || []).flatMap((so: any) =>
          (so.items || []).map((i: any) => ({
            product: {
              id: i.productId || i.id,
              storeId: so.storeId,
              storeName: so.storeName,
              categoryId: '',
              name: i.productName,
              description: '',
              sellingPrice: i.unitPrice,
              imageUrl: DEFAULT_PROD_IMG,
              sourceType: 'IN_STOCK' as const,
              inStock: true,
            },
            quantity: i.quantity,
          }))
        ),
        subtotal: o.subTotal,
        deliveryFee: o.deliveryFee,
        discount: o.discount,
        totalAmount: o.totalAmount,
        address: {
          id: 'addr-order',
          label: 'المنزل',
          city: o.deliveryAddress,
          district: '',
          street: '',
          latitude: 15.34,
          longitude: 44.20,
          isDefault: true,
        },
        paymentMethod: o.paymentMethod === 1 ? 'MANUAL_TRANSFER' : 'CASH_ON_DELIVERY',
        paymentStatus: o.paymentStatus === 2 ? 'VERIFIED' : o.paymentStatus === 3 ? 'REJECTED' : o.paymentStatus === 1 ? 'PAID' : 'PENDING',
        notes: o.notes,
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
      setCurrentOrder((prev) => {
        if (!prev) return mappedOrders[0] || null;
        const matching = mappedOrders.find((m) => m.id === prev.id);
        return matching || prev;
      });
    } catch (err) {
      console.warn('Failed to load orders from backend:', err);
    }
  };

  const getItemKey = (item: CartItem) =>
    item.selectedPiece ? `${item.product.id}__piece__${item.selectedPiece.id}` : item.product.id;

  const addToCart = async (product: Product, quantity = 1) => {
    try {
      if (isAuthenticated) {
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
    const deliveryFee = 500;
    return {
      storeId,
      storeName: items[0]?.product?.storeName || 'متجر',
      items,
      subtotal,
      deliveryFee,
    };
  });

  const cartSubtotal = cartSubOrders.reduce((sum, so) => sum + so.subtotal, 0);
  const cartDeliveryFee = isFreeDeliveryPromo ? 0 : (cartSubOrders.length > 0 ? 500 : 0);
  const cartDiscount = Math.round(cartSubtotal * (discountPercent / 100));
  const cartTotal = Math.max(0, cartSubtotal + cartDeliveryFee - cartDiscount);

  const applyPromoCode = (code: string): boolean => {
    const clean = code.trim().toUpperCase();
    if (clean === 'BS_FREE' || clean === 'FREE' || clean === 'FREEDELIVERY') {
      setPromoCode(code.trim());
      setIsFreeDeliveryPromo(true);
      return true;
    }
    if (clean === 'BS_2026' || clean === 'BSSTORE' || clean === 'BS_STORE' || clean === 'BS2026') {
      setPromoCode(code.trim());
      setDiscountPercent(15);
      return true;
    }
    return false;
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
          latitude: selectedAddress.latitude || 15.35,
          longitude: selectedAddress.longitude || 44.20,
        },
        paymentMethod: isManual ? 1 : 0,
        notes,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        items: cart.map((c) => ({
          productId: c.product.id,
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
        status: isManual ? 'PAYMENT_PENDING_VERIFICATION' : 'CONFIRMED',
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

      setOrders((prev) => [newOrder, ...prev]);
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

        setOrders((prev) => [fallbackOrder, ...prev]);
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
      const res = await authApi.register(name, phone, password);
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
        cartSubOrders,
        cartSubtotal,
        cartDeliveryFee,
        cartDiscount,
        cartTotal,
        promoCode,
        applyPromoCode,
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
