import * as Crypto from 'expo-crypto';
import { ProductOptionsEditor } from '../components/ProductOptionsEditor';
import { OptionsDefinition, emptyOptions, optionsInput } from '../options/model';
/**
 * InventoryScreen → إدارة المنتجات الشاملة (4 تبويبات)
 * الفئات | المتاجر | المنتجات | العروض
 *
 * إصلاحات في هذا الإصدار:
 * - حل مشكلة النصوص المقصوصة بتقليل الخطوط المستخدمة
 * - إضافة ListBox حقيقي لاختيار الفئة
 * - إضافة أنواع المنتجات لكل متجر (ملابس، أطقم، إلكترونيات...)
 * - تحسين نموذج إضافة المنتج
 * - أنواع متعددة من العروض
 */
import { OpeningHoursFields, validOpeningHours } from '../components/OpeningHoursFields';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { DealDatePickerModal, DealTimePickerModal } from '../components/DealDateTimePickers';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';
import { useAdmin } from '../context/AdminContext';
import { adminApi } from '../api';
import {
  AdminCategory,
  AdminStore,
  AdminProduct,
  AdminFlashDeal,
} from '../types';
import { BoosthisScreenTracker } from '../monitoring/BoosthisRuntime';

// ── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'categories' | 'stores' | 'products' | 'deals' | 'governorates';

const BOOSTHIS_TAB_NAMES: Record<TabId, string> = {
  categories: 'Categories',
  stores: 'Stores',
  products: 'Products',
  deals: 'Deals',
  governorates: 'ServiceAreas',
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'categories', label: 'الفئات', icon: '📁' },
  { id: 'stores', label: 'المتاجر', icon: '🏪' },
  { id: 'products', label: 'المنتجات', icon: '📦' },
  { id: 'deals', label: 'العروض', icon: '🏷' },
  { id: 'governorates', label: 'المحافظات', icon: '🗺️' },
];

// ── Deal types ───────────────────────────────────────────────────────────────
const DEAL_TYPES = [
  { id: 'delivery', label: 'خصم من رسوم التوصيل', icon: '🚚' },
  { id: 'order_discount', label: 'خصم من إجمالي الطلب (شرائح / كود)', icon: '🏷️' },
  { id: 'bundle', label: 'باقة منتجات', icon: '📦' },
];

const DEAL_VISIBILITY = [
  { id: 'home', label: 'الشاشة الرئيسية' },
  { id: 'category', label: 'داخل الفئة' },
  { id: 'store', label: 'داخل المتجر' },
  { id: 'all', label: 'كل الأماكن' },
];

// ── Preset product types per store ───────────────────────────────────────────
const PRESET_PRODUCT_TYPES = [
  'ملابس رجالية',
  'ملابس نسائية',
  'ملابس أطفال',
  'أطقم وكومبو',
  'إلكترونيات',
  'هواتف وملحقات',
  'مواد غذائية',
  'وجبات ومطاعم',
  'أدوية ومستلزمات طبية',
  'مستلزمات منزلية',
  'عطور وتجميل',
  'رياضة ولياقة',
  'كتب وقرطاسية',
  'أخرى',
];

// ── Small helpers ────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={s.emptyWrap}>
    <Text style={s.emptyIcon}>{icon}</Text>
    <Text style={s.emptyText}>{text}</Text>
  </View>
);

// ── ListBox (Picker) Modal ───────────────────────────────────────────────────
interface ListBoxModalProps {
  visible: boolean;
  title: string;
  options: { id: string; label: string; icon?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}
const ListBoxModal: React.FC<ListBoxModalProps> = ({
  visible, title, options, selectedId, onSelect, onClose
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={s.lbOverlay} activeOpacity={1} onPress={onClose}>
      <View style={s.lbSheet}>
        <View style={s.lbHandle} />
        <Text style={s.lbTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[s.lbOption, selectedId === opt.id && s.lbOptionActive]}
              onPress={() => { onSelect(opt.id); onClose(); }}
            >
              <Text style={[s.lbOptionCheck, selectedId === opt.id && s.lbOptionCheckActive]}>
                {selectedId === opt.id ? '◉' : '○'}
              </Text>
              <View style={s.lbOptionBody}>
                {opt.icon && <Text style={s.lbOptionIcon}>{opt.icon}</Text>}
                <Text style={[s.lbOptionText, selectedId === opt.id && s.lbOptionTextActive]}>
                  {opt.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={s.lbCancelBtn} onPress={onClose}>
          <Text style={s.lbCancelText}>إغلاق</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Multi-select Modal ────────────────────────────────────────────────────────
interface MultiSelectModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onClose: () => void;
  onAddCustom?: (val: string) => void;
}
const MultiSelectModal: React.FC<MultiSelectModalProps> = ({
  visible, title, options, selected, onToggle, onClose, onAddCustom
}) => {
  const [customVal, setCustomVal] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={s.lbOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.lbSheet, { maxHeight: '75%' }]}>
          <View style={s.lbHandle} />
          <Text style={s.lbTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.lbOption, isSelected && s.lbOptionActive]}
                  onPress={() => onToggle(opt)}
                >
                  <Text style={[s.lbOptionCheck, isSelected && s.lbOptionCheckActive]}>
                    {isSelected ? '☑' : '☐'}
                  </Text>
                  <Text style={[s.lbOptionText, isSelected && s.lbOptionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {onAddCustom && (
            <View style={s.lbCustomRow}>
              <TouchableOpacity
                style={s.lbCustomBtn}
                onPress={() => {
                  if (customVal.trim()) {
                    onAddCustom(customVal.trim());
                    setCustomVal('');
                  }
                }}
              >
                <Text style={s.lbCustomBtnText}>+ إضافة</Text>
              </TouchableOpacity>
              <TextInput
                style={s.lbCustomInput}
                placeholder="نوع مخصص..."
                placeholderTextColor={colors.outline}
                value={customVal}
                onChangeText={setCustomVal}
                textAlign="right"
              />
            </View>
          )}
          <TouchableOpacity style={s.lbCancelBtn} onPress={onClose}>
            <Text style={s.lbCancelText}>حفظ وإغلاق</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ── MAIN SCREEN ──────────────────────────────────────────────────────────────
export const InventoryScreen: React.FC = () => {
  const {
    inventoryTabRequest,
    setInventoryTabRequest,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    stores,
    addStore,
    updateStore,
    toggleStoreStatus,
    deleteStore,
    products,
    deleteProduct,
    setEditingProduct,
    flashDeals,
    addFlashDeal,
    updateFlashDeal,
    toggleFlashDealStatus,
    deleteFlashDeal,
    navigateTo,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<TabId>(inventoryTabRequest || 'categories');
  useEffect(() => {
    if (inventoryTabRequest) {
      setActiveTab(inventoryTabRequest);
      setInventoryTabRequest(null);
    }
  }, [inventoryTabRequest, setInventoryTabRequest]);

  // ── Category form ─────────────────────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<AdminCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📁');

  // ── Store form ────────────────────────────────────────────────────────────
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState<AdminStore | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeOpeningTime, setStoreOpeningTime] = useState('');
  const [storeClosingTime, setStoreClosingTime] = useState('');
  const [store24Hours, setStore24Hours] = useState(false);
  const [storeAddress, setStoreAddress] = useState('');
  const [governorates, setGovernorates] = useState<{id:string;name:string}[]>([]);
  const [storeGovernorateId, setStoreGovernorateId] = useState('');
  const [storeGovernoratePickerVisible, setStoreGovernoratePickerVisible] = useState(false);
  const [newGovernorateName, setNewGovernorateName] = useState('');
  const [editingGovernorate, setEditingGovernorate] = useState<{ id: string; name: string } | null>(null);
  const [isSavingGovernorate, setIsSavingGovernorate] = useState(false);
  const [governorateMessage, setGovernorateMessage] = useState('');
  useEffect(() => {
    void adminApi.getGovernorates()
      .then(setGovernorates)
      .catch((error: any) => setGovernorateMessage(error?.message || 'تعذر تحميل المحافظات من الخادم.'));
  }, []);

  const saveGovernorate = async () => {
    const name = newGovernorateName.trim();
    if (!name) { setGovernorateMessage('اكتب اسم المحافظة أولاً.'); return; }
    setGovernorateMessage('');
    setIsSavingGovernorate(true);
    try {
      if (editingGovernorate) {
        await adminApi.updateGovernorate(editingGovernorate.id, name);
        setGovernorateMessage(`تم تعديل اسم المحافظة إلى ${name}.`);
      } else {
        await adminApi.addGovernorate(name);
        setGovernorateMessage(`تمت إضافة ${name} وحفظها.`);
      }
      setGovernorates(await adminApi.getGovernorates());
      setNewGovernorateName('');
      setEditingGovernorate(null);
    } catch (error: any) {
      setGovernorateMessage(error?.message || 'تعذر الحفظ. تحقق من اتصالك وصلاحيات الحساب.');
    } finally {
      setIsSavingGovernorate(false);
    }
  };

  const deleteGovernorate = (governorate: { id: string; name: string }) => {
    Alert.alert(
      'حذف المحافظة',
      `هل تريد حذف محافظة ${governorate.name}؟ لا يمكن حذف محافظة مرتبطة بمتاجر أو حسابات عملاء أو موصلين.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => {
          void (async () => {
            try {
              await adminApi.deleteGovernorate(governorate.id);
              setGovernorates(await adminApi.getGovernorates());
              if (editingGovernorate?.id === governorate.id) {
                setEditingGovernorate(null);
                setNewGovernorateName('');
              }
              setGovernorateMessage(`تم حذف محافظة ${governorate.name}.`);
            } catch (error: any) {
              setGovernorateMessage(error?.message || 'تعذر حذف المحافظة.');
            }
          })();
        } },
      ],
    );
  };
  const [storeLatitude, setStoreLatitude] = useState<number | null>(null);
  const [storeLongitude, setStoreLongitude] = useState<number | null>(null);
  const [showStoreMapPicker, setShowStoreMapPicker] = useState(false);
  const [storeImageUrl, setStoreImageUrl] = useState('');
  const [showStoreImagePicker, setShowStoreImagePicker] = useState(false);
  const [storeCatId, setStoreCatId] = useState('');
  const [storeCatPickerVisible, setStoreCatPickerVisible] = useState(false);
  // Store product types
  const [storeProductTypes, setStoreProductTypes] = useState<string[]>([]);
  const [storeCustomTypeInput, setStoreCustomTypeInput] = useState('');

  const handleStoreLocationPicked = (location: LocationResult) => {
    setStoreLatitude(location.latitude);
    setStoreLongitude(location.longitude);
    if (!storeAddress.trim() && location.district) setStoreAddress(location.district);
  };

  // ── Categories & Stores visibility filters ────────────────────────────────
  const [catFilter, setCatFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [storeFilter, setStoreFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  const displayedCategories = useMemo(() => {
    if (catFilter === 'visible') return categories.filter((c) => c.isActive);
    if (catFilter === 'hidden') return categories.filter((c) => !c.isActive);
    return categories;
  }, [categories, catFilter]);

  const displayedStores = useMemo(() => {
    if (storeFilter === 'visible') return stores.filter((s) => s.isActive);
    if (storeFilter === 'hidden') return stores.filter((s) => !s.isActive);
    return stores;
  }, [stores, storeFilter]);

  // ── Product search/filter ─────────────────────────────────────────────────
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('all');
  const [prodStoreFilter, setProdStoreFilter] = useState('all');
  const [prodCatPickerVisible, setProdCatPickerVisible] = useState(false);
  const [prodStorePickerVisible, setProdStorePickerVisible] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
        p.storeName.toLowerCase().includes(prodSearch.toLowerCase());
      const matchCat = prodCatFilter === 'all' || p.categoryId === prodCatFilter;
      const matchStore = prodStoreFilter === 'all' || p.storeId === prodStoreFilter;
      return matchSearch && matchCat && matchStore;
    });
  }, [products, prodSearch, prodCatFilter, prodStoreFilter]);

  // ── Deal form ─────────────────────────────────────────────────────────────
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<AdminFlashDeal | null>(null);
  const [dealType, setDealType] = useState('bundle');
  const [dealTypePickerVisible, setDealTypePickerVisible] = useState(false);
  const [dealVisibility, setDealVisibility] = useState('home');
  const [dealVisibilityPickerVisible, setDealVisibilityPickerVisible] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealStore, setDealStore] = useState('');
  const [dealStorePickerVisible, setDealStorePickerVisible] = useState(false);
  const [dealCatId, setDealCatId] = useState('');
  const [dealCatPickerVisible, setDealCatPickerVisible] = useState(false);
  const [dealOriginal, setDealOriginal] = useState('');
  const [dealDiscount, setDealDiscount] = useState('');
  const [dealExpiryDate, setDealExpiryDate] = useState('');
  const [dealExpiryTime, setDealExpiryTime] = useState('21:00');
  const [showDealDatePicker, setShowDealDatePicker] = useState(false);
  const [showDealTimePicker, setShowDealTimePicker] = useState(false);
  const [deliveryDiscountPercent, setDeliveryDiscountPercent] = useState('');
  const [dealIsPublic, setDealIsPublic] = useState(true);
  const [dealCouponCode, setDealCouponCode] = useState('');
  const [dealDiscountPercent, setDealDiscountPercent] = useState('');
  const [isTieredDiscount, setIsTieredDiscount] = useState(false);
  const [dealTiers, setDealTiers] = useState<Array<{ minAmount: string; maxAmount: string; discountPercent: string }>>([
    { minAmount: '0', maxAmount: '10000', discountPercent: '20' },
    { minAmount: '10000', maxAmount: '25000', discountPercent: '15' },
    { minAmount: '25000', maxAmount: '', discountPercent: '10' },
  ]);
  // Bundle items
  const [bundleItems, setBundleItems] = useState<{ id: string; name: string; price: string; imageUrl?: string; expectedPurchasePrice?: string; hasOptions?: boolean; options?: OptionsDefinition }[]>([]);
  const [pieceEditorId, setPieceEditorId] = useState<string | null>(null);
  const [pieceOptionsLoading, setPieceOptionsLoading] = useState(false);
  const [pieceOptionsError, setPieceOptionsError] = useState('');
  const [bundleItemName, setBundleItemName] = useState('');
  const [bundleItemPrice, setBundleItemPrice] = useState('');
  const [dealImageUrl, setDealImageUrl] = useState('');
  const [showDealImagePicker, setShowDealImagePicker] = useState(false);
  const [bundleImageIndex, setBundleImageIndex] = useState<number | null>(null);
  const totalBundlePrice = bundleItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const editPieceOptions = async (pieceId: string) => {
    setPieceEditorId(pieceId); setPieceOptionsError('');
    const item = bundleItems.find(p => p.id === pieceId);
    if (!item || item.options) return;
    if (!editingDeal) { setBundleItems(current => current.map(p => p.id === pieceId ? { ...p, options: emptyOptions() } : p)); return; }
    setPieceOptionsLoading(true);
    try {
      const detail = await adminApi.getPieceDetails(editingDeal.id, pieceId);
      setBundleItems(current => current.map(p => p.id === pieceId ? { ...p, options: detail.options || emptyOptions(),
        expectedPurchasePrice: detail.expectedPurchasePrice == null ? p.expectedPurchasePrice : String(detail.expectedPurchasePrice) } : p));
    } catch (error: any) { setPieceOptionsError(error.message || 'تعذر تحميل خيارات القطعة'); }
    finally { setPieceOptionsLoading(false); }
  };

  // ── Loading states ────────────────────────────────────────────────────────
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [isSavingDeal, setIsSavingDeal] = useState(false);

  // ── Category handlers ─────────────────────────────────────────────────────
  const handleSaveCategory = async () => {
    if (!catName.trim()) { Alert.alert('تنبيه', 'يرجى إدخال اسم الفئة'); return; }
    setIsSavingCat(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, { name: catName, icon: catIcon });
      } else {
        await addCategory({ name: catName, icon: catIcon });
      }
      setShowCatForm(false);
      setCatName('');
      setCatIcon('📁');
      setEditingCat(null);
    } catch (error: any) {
      Alert.alert('خطأ', error?.message || 'فشل حفظ الفئة');
    } finally {
      setIsSavingCat(false);
    }
  };

  // ── Store handlers ────────────────────────────────────────────────────────
  const handleEditStore = (store: AdminStore) => {
    setEditingStore(store);
    setStoreName(store.name);
    setStorePhone(store.phone || '');
    setStoreOpeningTime(store.openingTime || '');
    setStoreClosingTime(store.closingTime || '');
    setStore24Hours(store.is24Hours ?? false);
    setStoreAddress(store.address || '');
    setStoreGovernorateId(store.governorateId || '');
    setStoreLatitude(Number.isFinite(Number(store.latitude)) ? Number(store.latitude) : null);
    setStoreLongitude(Number.isFinite(Number(store.longitude)) ? Number(store.longitude) : null);
    setStoreImageUrl(store.imageUrl || '');
    setStoreCatId(store.categoryId || '');
    setStoreProductTypes(store.subcategories || []);
    setStoreCustomTypeInput('');
    setShowStoreForm(true);
  };

  const handleSaveStore = async () => {
    if (!storeName.trim()) { Alert.alert('تنبيه', 'يرجى إدخال اسم المتجر'); return; }
    if (storeLatitude === null || storeLongitude === null) { Alert.alert('تنبيه', 'يرجى تحديد موقع المتجر من الخريطة قبل الحفظ'); return; }
    if (!storeGovernorateId) { Alert.alert('تنبيه', 'اختر محافظة المتجر'); return; }
    if (!store24Hours && !validOpeningHours(storeOpeningTime, storeClosingTime)) { Alert.alert('تنبيه', 'حدد وقتي فتح وإقفال مختلفين أو اختر العمل 24 ساعة'); return; }
    setIsSavingStore(true);
    try {
      const catObj = categories.find((c) => c.id === storeCatId) || categories[0];
      if (editingStore) {
        await updateStore(editingStore.id, {
          name: storeName.trim(),
          phone: storePhone.trim(),
          address: storeAddress.trim(),
          categoryId: catObj?.id || 'cat-general',
          categoryName: catObj?.name || 'عام',
          subcategories: storeProductTypes,
          imageUrl: storeImageUrl.trim(),
          latitude: storeLatitude,
          longitude: storeLongitude,
          governorateId: storeGovernorateId,
          openingTime: store24Hours ? null : storeOpeningTime,
          closingTime: store24Hours ? null : storeClosingTime,
          is24Hours: store24Hours,
        });
        Alert.alert('نجاح ✓', `تم تحديث بيانات متجر ${storeName.trim()}`);
      } else {
        await addStore({
          name: storeName.trim(),
          phone: storePhone.trim(),
          address: storeAddress.trim(),
          categoryId: catObj?.id || categories[0]?.id || 'cat-general',
          categoryName: catObj?.name || 'عام',
          subcategories: storeProductTypes,
          imageUrl: storeImageUrl.trim(),
          latitude: storeLatitude,
          longitude: storeLongitude,
          governorateId: storeGovernorateId,
          openingTime: store24Hours ? null : storeOpeningTime,
          closingTime: store24Hours ? null : storeClosingTime,
          is24Hours: store24Hours,
          rating: 4.8,
          deliveryTime: '30-45 دقيقة',
          deliveryFee: 400,
          isOpen: true,
          isActive: true,
        });
        Alert.alert('نجاح ✓', `تمت إضافة متجر ${storeName.trim()} بنجاح`);
      }
      setShowStoreForm(false);
      setEditingStore(null);
      setStoreName('');
      setStorePhone('');
      setStoreAddress('');
      setStoreGovernorateId('');
      setStoreLatitude(null);
      setStoreLongitude(null);
      setStoreImageUrl('');
      setStoreCatId('');
      setStoreProductTypes([]);
      setStoreCustomTypeInput('');
    } catch {
      Alert.alert('خطأ', 'فشل حفظ بيانات المتجر');
    } finally {
      setIsSavingStore(false);
    }
  };

  // ── Deal handlers ─────────────────────────────────────────────────────────
  const handleAddBundleItem = () => {
    if (!bundleItemName.trim()) return;
    if (!bundleItemPrice.trim() || !Number.isFinite(Number(bundleItemPrice))) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر صحيح للمنتج');
      return;
    }
    setBundleItems((prev) => [...prev, { id: Crypto.randomUUID(), name: bundleItemName.trim(), price: bundleItemPrice, expectedPurchasePrice: bundleItemPrice, options: emptyOptions() }]);
    setBundleItemName('');
    setBundleItemPrice('');
  };

  const handleEditDeal = (deal: AdminFlashDeal) => {
    const expiry = deal.expiresAt ? new Date(deal.expiresAt) : null;
    const validExpiry = expiry && Number.isFinite(expiry.getTime());
    const isDelivery = deal.dealKind === 'DELIVERY_DISCOUNT' || deal.dealType === 'DELIVERY_DISCOUNT' || deal.discountKind === 'DELIVERY_DISCOUNT';
    const isOrderDisc = deal.dealKind === 'PRODUCT_DISCOUNT' || deal.dealType === 'PRODUCT_DISCOUNT' || deal.discountKind === 'PRODUCT_DISCOUNT';
    setEditingDeal(deal);
    setDealType(isDelivery ? 'delivery' : isOrderDisc ? 'order_discount' : 'bundle');
    setDealVisibility(deal.visibility || 'home');
    setDealTitle(deal.title || '');
    setDealStore(deal.storeId || '');
    setDealCatId(deal.categoryId || '');
    setDealDiscount(deal.discountPrice > 0 && deal.discountPrice < deal.originalPrice ? String(deal.discountPrice) : '');
    setDealExpiryDate(validExpiry ? `${expiry!.getFullYear()}-${String(expiry!.getMonth() + 1).padStart(2, '0')}-${String(expiry!.getDate()).padStart(2, '0')}` : '');
    setDealExpiryTime(validExpiry ? `${String(expiry!.getHours()).padStart(2, '0')}:${String(expiry!.getMinutes()).padStart(2, '0')}` : '21:00');
    setDeliveryDiscountPercent(String(deal.deliveryDiscountPercent || 0));
    setDealIsPublic(deal.isPublic !== false);
    setDealImageUrl(deal.imageUrl || '');
    setDealCouponCode(deal.couponCode || '');
    setDealDiscountPercent(deal.discountPercent ? String(deal.discountPercent) : '');
    if (deal.discountTiers && deal.discountTiers.length > 0) {
      setIsTieredDiscount(true);
      setDealTiers(
        deal.discountTiers.map((t) => ({
          minAmount: String(t.minAmount ?? 0),
          maxAmount: t.maxAmount != null ? String(t.maxAmount) : '',
          discountPercent: String(t.discountPercent ?? 0),
        }))
      );
    } else {
      setIsTieredDiscount(false);
      setDealTiers([
        { minAmount: '0', maxAmount: '10000', discountPercent: '20' },
        { minAmount: '10000', maxAmount: '25000', discountPercent: '15' },
        { minAmount: '25000', maxAmount: '', discountPercent: '10' },
      ]);
    }
    setBundleItems((deal.products?.length ? deal.products : deal.bundleItems || []).map((raw) => { const item = raw as any; return ({
      id: item.id || Crypto.randomUUID(), expectedPurchasePrice: item.expectedPurchasePrice == null ? undefined : String(item.expectedPurchasePrice), hasOptions: item.hasOptions,
      name: item.name,
      price: String(item.price ?? 0),
      imageUrl: item.imageUrl,
    }); }));
    setShowDealForm(true);
  };

  const handleSaveDeal = async () => {
    if (!dealTitle.trim()) { Alert.alert('تنبيه', 'يرجى إدخال عنوان العرض'); return; }
    const orig = parseFloat(dealOriginal) || 0;
    const disc = parseFloat(dealDiscount) || 0;
    const expiry = new Date(`${dealExpiryDate}T${dealExpiryTime}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dealExpiryDate) || !/^\d{2}:\d{2}$/.test(dealExpiryTime) || !Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      Alert.alert('تنبيه', 'يرجى تحديد تاريخ ووقت انتهاء في المستقبل');
      return;
    }
    const isBundle = dealType === 'bundle';
    const isDelivery = dealType === 'delivery';
    const isOrderDisc = dealType === 'order_discount';
    const finalPrice = isBundle ? (disc > 0 ? disc : totalBundlePrice) : 0;

    let parsedTiers: Array<{ minAmount: number; maxAmount?: number | null; discountPercent: number }> | undefined;
    let orderDiscountPct = 0;

    if (isOrderDisc) {
      if (isTieredDiscount) {
        if (dealTiers.length === 0) {
          Alert.alert('تنبيه', 'أضف شريحة خصم واحدة على الأقل');
          return;
        }
        parsedTiers = dealTiers.map((t) => ({
          minAmount: t.minAmount.trim() ? Number(t.minAmount) : Number.NaN,
          maxAmount: t.maxAmount.trim() ? Number(t.maxAmount) : null,
          discountPercent: t.discountPercent.trim() ? Number(t.discountPercent) : Number.NaN,
        }));
        const invalidTier = parsedTiers.find((t) =>
          !Number.isFinite(t.minAmount) || t.minAmount < 0 ||
          !Number.isFinite(t.discountPercent) || t.discountPercent < 1 || t.discountPercent > 100 ||
          (t.maxAmount != null && (!Number.isFinite(t.maxAmount) || t.maxAmount <= t.minAmount))
        );
        if (invalidTier) {
          Alert.alert('تنبيه', 'تحقق من حدود كل شريحة: قيمة بداية غير سالبة، ونهاية أكبر منها، ونسبة بين 1% و100%');
          return;
        }
        const orderedTiers = [...parsedTiers].sort((left, right) => left.minAmount - right.minAmount);
        const overlapIndex = orderedTiers.findIndex((tier, index) => index > 0 &&
          (orderedTiers[index - 1].maxAmount == null || orderedTiers[index - 1].maxAmount! > tier.minAmount));
        if (overlapIndex >= 0) {
          Alert.alert('تنبيه', 'شرائح الخصم متداخلة؛ اجعل نهاية كل شريحة عند بداية الشريحة التالية.');
          return;
        }
        parsedTiers = orderedTiers;
        orderDiscountPct = parsedTiers[0].discountPercent;
      } else {
        orderDiscountPct = Math.round(parseFloat(dealDiscountPercent) || 0);
        if (orderDiscountPct < 1 || orderDiscountPct > 100) {
          Alert.alert('تنبيه', 'أدخل نسبة خصم من 1 إلى 100');
          return;
        }
      }
    }

    if (isBundle && bundleItems.length === 0) {
      Alert.alert('تنبيه', 'أضف منتجاً واحداً على الأقل إلى الباقة');
      return;
    }
    if (isBundle && disc > totalBundlePrice) {
      Alert.alert('تنبيه', 'السعر النهائي لا يمكن أن يتجاوز إجمالي أسعار المنتجات');
      return;
    }
    if (isBundle && !dealStore) { Alert.alert('تنبيه', 'يرجى ربط الباقة بمتجر'); return; }

    const deliveryPct = Math.round(Number(deliveryDiscountPercent));
    if (isDelivery && (!Number.isFinite(deliveryPct) || deliveryPct < 1 || deliveryPct > 100)) {
      Alert.alert('تنبيه', 'أدخل نسبة خصم توصيل من 1 إلى 100');
      return;
    }

    const codeUpper = dealCouponCode.trim() ? dealCouponCode.trim().toUpperCase() : undefined;

    for (const item of bundleItems) {
      if (!item.name.trim() || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) {
        Alert.alert('تفاصيل القطعة', 'أدخل اسم القطعة وسعر بيع موجباً'); return;
      }
      if (item.options?.groups.length && (!item.expectedPurchasePrice?.trim() || !Number.isFinite(Number(item.expectedPurchasePrice)) || Number(item.expectedPurchasePrice) < 0)) {
        Alert.alert('سعر الشراء المتوقع', `حدد سعر الشراء المتوقع للقطعة ${item.name}`); return;
      }
    }
    setIsSavingDeal(true);
    try {
      const dealData: Omit<AdminFlashDeal, 'id'> = {
        title: dealTitle.trim(),
        storeName: isBundle ? (stores.find((s) => s.id === dealStore)?.name || 'متجر') : 'منصة متجر بي اس',
        storeId: isBundle ? dealStore : undefined,
        categoryId: dealCatId || undefined,
        visibility: dealVisibility,
        dealKind: isBundle ? 'BUNDLE' : isDelivery ? 'DELIVERY_DISCOUNT' : 'PRODUCT_DISCOUNT',
        dealType: isBundle ? 'BUNDLE' : isDelivery ? 'DELIVERY_DISCOUNT' : 'PRODUCT_DISCOUNT',
        discountKind: isDelivery ? 'DELIVERY_DISCOUNT' : isOrderDisc ? 'PRODUCT_DISCOUNT' : undefined,
        couponCode: codeUpper,
        deliveryDiscountPercent: isDelivery ? deliveryPct : undefined,
        discountTiers: isOrderDisc && isTieredDiscount ? parsedTiers : undefined,
        bundleItems: bundleItems.map((item) => ({ name: item.name, price: Number(item.price) || 0, imageUrl: item.imageUrl })),
        originalPrice: isBundle ? totalBundlePrice : 0,
        discountPrice: finalPrice,
        discountPercent: isBundle
          ? (totalBundlePrice > 0 && finalPrice < totalBundlePrice ? Math.round(((totalBundlePrice - finalPrice) / totalBundlePrice) * 100) : 0)
          : isOrderDisc
          ? orderDiscountPct
          : 0,
        imageUrl: dealImageUrl,
        remainingHours: Math.ceil((expiry.getTime() - Date.now()) / 3600000),
        expiresAt: expiry.toISOString(),
        isActive: editingDeal?.isActive ?? true,
        isPublic: isDelivery ? dealIsPublic : true,
        description: isBundle
          ? bundleItems.map((i) => i.name).join('، ')
          : isDelivery
          ? `خصم ${deliveryPct}% على رسوم التوصيل`
          : (isTieredDiscount ? 'خصم بشرائح سلة المشتريات' : `خصم ${orderDiscountPct}% على إجمالي الطلب`),
        badge: isBundle
          ? (finalPrice < totalBundlePrice ? `باقة • وفر ${Math.round(((totalBundlePrice - finalPrice) / totalBundlePrice) * 100)}%` : 'باقة منتجات')
          : isDelivery
          ? `خصم ${deliveryPct}% على التوصيل`
          : (isTieredDiscount ? 'شرائح خصم' : `خصم ${orderDiscountPct}%`),
        isFreeDelivery: isDelivery && deliveryPct === 100,
        products: isBundle ? bundleItems.map((item, index) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          expectedPurchasePrice: item.expectedPurchasePrice?.trim() ? Number(item.expectedPurchasePrice) : null,
          options: item.options ? optionsInput(item.options) as any : undefined,
          imageUrl: item.imageUrl,
          description: editingDeal?.products?.find(p => p.id === item.id)?.description || '',
        })) : [],
      };
      if (editingDeal) await updateFlashDeal(editingDeal.id, dealData);
      else await addFlashDeal(dealData);
      setShowDealForm(false);
      setEditingDeal(null);
      setDealTitle('');
      setDealStore('');
      setDealCatId('');
      setDealOriginal('');
      setDealDiscount('');
      setDealExpiryDate('');
      setDealExpiryTime('21:00');
      setDeliveryDiscountPercent('');
      setDealIsPublic(true);
      setDealImageUrl('');
      setDealCouponCode('');
      setDealDiscountPercent('');
      setIsTieredDiscount(false);
      setDealTiers([
        { minAmount: '0', maxAmount: '10000', discountPercent: '20' },
        { minAmount: '10000', maxAmount: '25000', discountPercent: '15' },
        { minAmount: '25000', maxAmount: '', discountPercent: '10' },
      ]);
      setBundleItems([]);
      setDealType('bundle');
      setDealVisibility('home');
      Alert.alert('نجاح ✓', editingDeal ? 'تم تحديث العرض بنجاح' : 'تمت إضافة العرض بنجاح');
    } catch (error: any) {
      Alert.alert('تعذر حفظ العرض', error.message || 'فشل حفظ العرض');
    } finally {
      setIsSavingDeal(false);
    }
  };

  // ── Category picker options ───────────────────────────────────────────────
  const catOptions = categories.map((c) => ({ id: c.id, label: c.name, icon: c.icon }));
  const storeOptions = stores.map((s) => ({ id: s.id, label: s.name, icon: '🏪' }));

  const selectedCatLabel = catOptions.find((o) => o.id === storeCatId)?.label || 'اختر فئة...';
  const selectedDealTypeLabel = DEAL_TYPES.find((t) => t.id === dealType)?.label || '';
  const selectedVisibilityLabel = DEAL_VISIBILITY.find((v) => v.id === dealVisibility)?.label || '';
  const selectedProdCatLabel = prodCatFilter === 'all'
    ? `كل الفئات (${products.length})`
    : catOptions.find((o) => o.id === prodCatFilter)?.label || 'الكل';
  const selectedProdStoreLabel = prodStoreFilter === 'all'
    ? 'كل المتاجر'
    : storeOptions.find((o) => o.id === prodStoreFilter)?.label || 'الكل';

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <BoosthisScreenTracker key={activeTab} screen={BOOSTHIS_TAB_NAMES[activeTab]} />
      <AdminHeader title="إدارة المنتجات" showBack onBack={() => navigateTo('dashboard')} />

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={s.tabIcon}>{tab.icon}</Text>
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
              {isActive && <View style={s.tabBar_indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'governorates' && (
        <ScrollView contentContainerStyle={s.scrollContent}>
          <Text style={s.sectionTitle}>محافظات الخدمة وقوائم المواقع</Text>
          <Text style={s.formLabel}>{editingGovernorate ? 'تعديل اسم المحافظة' : 'إضافة محافظة مدعومة'}</Text>
          <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={s.addBtn} disabled={isSavingGovernorate} onPress={() => void saveGovernorate()}>
              <Text style={s.addBtnText}>{isSavingGovernorate ? 'جارٍ الحفظ…' : editingGovernorate ? 'حفظ التعديل' : 'إضافة'}</Text>
            </TouchableOpacity>
            <TextInput style={[s.formInput, { flex: 1, marginBottom: 0 }]} value={newGovernorateName} onChangeText={setNewGovernorateName} placeholder="اسم المحافظة" textAlign="right" />
          </View>
          {editingGovernorate && <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditingGovernorate(null); setNewGovernorateName(''); }}>
            <Text style={s.cancelBtnText}>إلغاء التعديل</Text>
          </TouchableOpacity>}
          {!!governorateMessage && <Text style={s.formLabel}>{governorateMessage}</Text>}
          {governorates.length === 0 && !governorateMessage && <EmptyState icon="🗺️" text="لا توجد محافظات مضافة بعد" />}
          {governorates.map(g => <View key={g.id} style={s.listCard}>
            <View style={s.governorateCard}>
              <Text style={[s.listTitle, s.governorateName]}>{g.name}</Text>
              <View style={s.governorateActions}>
                <TouchableOpacity style={[s.editBtn, s.governorateEditBtn]} onPress={() => { setEditingGovernorate(g); setNewGovernorateName(g.name); setGovernorateMessage(''); }}>
                  <Text style={s.editBtnText}>تعديل</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} accessibilityRole="button" accessibilityLabel={`حذف محافظة ${g.name}`} onPress={() => deleteGovernorate(g)}>
                  <Text style={s.iconBtnTxt}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>)}
        </ScrollView>
      )}

      {/* ═══════════════ CATEGORIES ═══════════════ */}
      {activeTab === 'categories' && (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.rowBetween}>
            <TouchableOpacity style={s.addBtn} onPress={() => { setCatName(''); setCatIcon('📁'); setEditingCat(null); setShowCatForm(true); }}>
              <Text style={s.addBtnText}>+ إضافة فئة</Text>
            </TouchableOpacity>
            <Text style={s.sectionTitle}>الفئات ({categories.length})</Text>
          </View>

          {/* Filter Pills for Categories */}
          <View style={s.filterPillRow}>
            <TouchableOpacity
              style={[s.filterPill, catFilter === 'all' && s.filterPillActive]}
              onPress={() => setCatFilter('all')}
            >
              <Text style={[s.filterPillTxt, catFilter === 'all' && s.filterPillTxtActive]}>
                الكل ({categories.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.filterPill, catFilter === 'visible' && s.filterPillActive]}
              onPress={() => setCatFilter('visible')}
            >
              <Text style={[s.filterPillTxt, catFilter === 'visible' && s.filterPillTxtActive]}>
                الظاهرة ({categories.filter((c) => c.isActive).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.filterPill, catFilter === 'hidden' && s.filterPillActive]}
              onPress={() => setCatFilter('hidden')}
            >
              <Text style={[s.filterPillTxt, catFilter === 'hidden' && s.filterPillTxtActive]}>
                المخفية ({categories.filter((c) => !c.isActive).length})
              </Text>
            </TouchableOpacity>
          </View>

          {displayedCategories.length === 0 && (
            <EmptyState
              icon="📁"
              text={catFilter === 'hidden' ? 'لا توجد فئات مخفية حالياً' : 'لا توجد فئات بعد'}
            />
          )}

          {displayedCategories.map((cat) => (
            <View key={cat.id} style={[s.listCard, !cat.isActive && s.cardHidden]}>
              <View style={s.rowBetween}>
                {/* Actions */}
                <View style={s.actionsRow}>
                  <TouchableOpacity
                    style={[s.iconBtn, !cat.isActive && s.iconBtnUnhide]}
                    onPress={() => toggleCategoryStatus(cat.id)}
                  >
                    <Text style={s.iconBtnTxt}>{cat.isActive ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={() => { setEditingCat(cat); setCatName(cat.name); setCatIcon(cat.icon); setShowCatForm(true); }}>
                    <Text style={s.iconBtnTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.iconBtn, s.iconBtnRed]} onPress={() =>
                    Alert.alert('حذف الفئة', `حذف "${cat.name}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => deleteCategory(cat.id) },
                    ])}>
                    <Text style={s.iconBtnTxt}>🗑</Text>
                  </TouchableOpacity>
                </View>
                {/* Info */}
                <View style={s.listCardInfo}>
                  <View style={s.rowEnd}>
                    <StatusBadge active={cat.isActive} />
                    <Text style={s.listTitle} numberOfLines={1}>{cat.icon} {cat.name}</Text>
                  </View>
                  <Text style={s.listSub} numberOfLines={1}>
                    {cat.productCount} منتج · {cat.subcategories.length} تصنيف فرعي
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ═══════════════ STORES ═══════════════ */}
      {activeTab === 'stores' && (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.rowBetween}>
            <TouchableOpacity style={s.addBtn} onPress={() => {
              setEditingStore(null);
              setStoreName(''); setStorePhone(''); setStoreAddress('');
              setStoreOpeningTime(''); setStoreClosingTime(''); setStore24Hours(false);
              setStoreGovernorateId(''); setStoreLatitude(null); setStoreLongitude(null); setStoreImageUrl('');
              setStoreCatId(categories[0]?.id || ''); setStoreProductTypes([]);
              setShowStoreForm(true);
            }}>
              <Text style={s.addBtnText}>+ إضافة متجر</Text>
            </TouchableOpacity>
            <Text style={s.sectionTitle}>المتاجر ({stores.length})</Text>
          </View>

          {/* Filter Pills for Stores */}
          <View style={s.filterPillRow}>
            <TouchableOpacity
              style={[s.filterPill, storeFilter === 'all' && s.filterPillActive]}
              onPress={() => setStoreFilter('all')}
            >
              <Text style={[s.filterPillTxt, storeFilter === 'all' && s.filterPillTxtActive]}>
                الكل ({stores.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.filterPill, storeFilter === 'visible' && s.filterPillActive]}
              onPress={() => setStoreFilter('visible')}
            >
              <Text style={[s.filterPillTxt, storeFilter === 'visible' && s.filterPillTxtActive]}>
                الظاهرة ({stores.filter((s) => s.isActive).length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.filterPill, storeFilter === 'hidden' && s.filterPillActive]}
              onPress={() => setStoreFilter('hidden')}
            >
              <Text style={[s.filterPillTxt, storeFilter === 'hidden' && s.filterPillTxtActive]}>
                المخفية ({stores.filter((s) => !s.isActive).length})
              </Text>
            </TouchableOpacity>
          </View>

          {displayedStores.length === 0 && (
            <EmptyState
              icon="🏪"
              text={storeFilter === 'hidden' ? 'لا توجد متاجر مخفية حالياً' : 'لا توجد متاجر بعد'}
            />
          )}

          {displayedStores.map((store) => (
            <View key={store.id} style={[s.storeCard, !store.isActive && s.cardHidden]}>
              <View style={s.rowBetween}>
                <View style={s.actionsRow}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => handleEditStore(store)}>
                    <Text style={s.iconBtnTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.iconBtn, !store.isActive && s.iconBtnUnhide]}
                    onPress={() => toggleStoreStatus(store.id)}
                  >
                    <Text style={s.iconBtnTxt}>{store.isActive ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.iconBtn, s.iconBtnRed]} onPress={() =>
                    Alert.alert('حذف المتجر', `حذف "${store.name}" ومنتجاته؟ تبقى سجلات الطلبات محفوظة.`, [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => { void deleteStore(store.id).catch((e: any) => Alert.alert('تعذر الحذف', e?.message || 'حاول مجدداً.')); } },
                    ])}>
                    <Text style={s.iconBtnTxt}>🗑</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.listCardInfo}>
                  <View style={s.rowEnd}>
                    <StatusBadge active={store.isActive} />
                    <Text style={s.listTitle} numberOfLines={1}>🏪 {store.name}</Text>
                  </View>
                  <Text style={s.listSub} numberOfLines={1}>{store.categoryName}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={s.storeDetails}>
                {store.address ? <Text style={s.storeDetailTxt} numberOfLines={1}>📍 {store.address}</Text> : null}
                <Text style={s.storeDetailTxt}>{store.is24Hours ? '🕒 مفتوح 24 ساعة' : store.openingTime && store.closingTime ? `🕒 ${store.openingTime} — ${store.closingTime} (بتوقيت اليمن)` : '🕒 المواعيد غير محددة'}</Text>
                {store.phone ? <Text style={s.storeDetailTxt} numberOfLines={1}>📞 {store.phone}</Text> : null}
              </View>

              {/* Product types chips */}
              {store.subcategories && store.subcategories.length > 0 && (
                <View style={s.chipsRow}>
                  {store.subcategories.map((type, i) => (
                    <View key={i} style={s.chip}>
                      <Text style={s.chipText} numberOfLines={1}>{type}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Link to products */}
              <View style={s.rowBetween}>
                <TouchableOpacity onPress={() => { setProdStoreFilter(store.id); setActiveTab('products'); }}>
                  <Text style={s.linkText}>عرض المنتجات →</Text>
                </TouchableOpacity>
                <Text style={s.listSub}>{products.filter((p) => p.storeId === store.id).length} منتج</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ═══════════════ PRODUCTS ═══════════════ */}
      {activeTab === 'products' && (
        <View style={s.flex1}>
          {/* Search */}
          <View style={s.searchSection}>
            <View style={s.searchBar}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="ابحث عن منتج..."
                placeholderTextColor={colors.outline}
                value={prodSearch}
                onChangeText={setProdSearch}
                textAlign="right"
              />
              {prodSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProdSearch('')}>
                  <Text style={s.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => { setEditingProduct(null); navigateTo('add_product'); }}>
              <Text style={s.addBtnText}>+ منتج</Text>
            </TouchableOpacity>
          </View>

          {/* Filter row */}
          <View style={s.filterRow}>
            <TouchableOpacity style={s.filterPicker} onPress={() => setProdStorePickerVisible(true)}>
              <Text style={s.filterPickerText} numberOfLines={1}>{selectedProdStoreLabel}</Text>
              <Text style={s.filterPickerArrow}>▾</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.filterPicker} onPress={() => setProdCatPickerVisible(true)}>
              <Text style={s.filterPickerText} numberOfLines={1}>{selectedProdCatLabel}</Text>
              <Text style={s.filterPickerArrow}>▾</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.listSub}>عرض {filteredProducts.length} من {products.length} منتج</Text>

            {filteredProducts.length === 0 && <EmptyState icon="📦" text="لا توجد منتجات مطابقة" />}

            {filteredProducts.map((prod) => {
              const profit = prod.sellingPrice - prod.expectedPurchasePrice;
              const margin = prod.sellingPrice > 0 ? Math.round((profit / prod.sellingPrice) * 100) : 0;
              return (
                <View key={prod.id} style={s.productCard}>
                  <View style={s.productRow}>
                    {/* Thumb */}
                    <View style={s.thumbWrap}>
                      {prod.imageUrl
                        ? <Image source={{ uri: prod.imageUrl }} style={s.thumbImg} />
                        : <View style={s.thumbEmpty}><Text style={s.thumbEmptyIcon}>📦</Text></View>
                      }
                    </View>
                    {/* Info */}
                    <View style={s.productInfo}>
                      <View style={s.rowEnd}>
                        <StatusBadge active={prod.isActive} />
                        <Text style={s.storeTag} numberOfLines={1}>{prod.storeName}</Text>
                      </View>
                      <Text style={s.productName} numberOfLines={2}>{prod.name}</Text>
                      <Text style={s.listSub} numberOfLines={1}>{prod.categoryName}</Text>
                    </View>
                  </View>

                  {/* Financial */}
                  <View style={s.finRow}>
                    <View style={s.finCol}>
                      <Text style={s.finLabel}>التكلفة</Text>
                      <Text style={s.finVal} numberOfLines={1}>{prod.expectedPurchasePrice.toLocaleString()} ر.ي</Text>
                    </View>
                    <View style={s.finCol}>
                      <Text style={s.finLabel}>سعر البيع</Text>
                      <Text style={[s.finVal, { color: colors.primary }]} numberOfLines={1}>
                        {prod.sellingPrice.toLocaleString()} ر.ي
                      </Text>
                    </View>
                    <View style={[s.finCol, s.finColProfit]}>
                      <Text style={s.finLabel}>الربح</Text>
                      <Text style={s.profitVal} numberOfLines={1}>+{profit.toLocaleString()} ({margin}%)</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={s.productActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => { setEditingProduct(prod); navigateTo('add_product'); }}>
                      <Text style={s.editBtnText}>✏️ تعديل</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.delBtn} onPress={() =>
                      Alert.alert('حذف المنتج', `حذف "${prod.name}"؟`, [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'حذف', style: 'destructive', onPress: () => deleteProduct(prod.id) },
                      ])}>
                      <Text style={s.iconBtnTxt}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ═══════════════ DEALS ═══════════════ */}
      {activeTab === 'deals' && (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.rowBetween}>
            <TouchableOpacity style={s.addBtn} onPress={() => {
              setEditingDeal(null); setDealType('bundle'); setDealVisibility('home'); setDealTitle(''); setDealStore('');
              setDealCatId(''); setDealDiscount(''); setDealExpiryDate(''); setDealExpiryTime('21:00');
              setDeliveryDiscountPercent(''); setDealIsPublic(true); setDealImageUrl(''); setBundleItems([]);
              setShowDealForm(true);
            }}>
              <Text style={s.addBtnText}>+ إضافة عرض</Text>
            </TouchableOpacity>
            <Text style={s.sectionTitle}>العروض ({flashDeals.length})</Text>
          </View>

          {flashDeals.length === 0 && <EmptyState icon="🏷" text="لا توجد عروض نشطة" />}

          {flashDeals.map((deal) => (
            <View key={deal.id} style={[s.dealCard, !deal.isActive && s.dealCardOff]}>
              <View style={s.rowBetween}>
                <View style={s.actionsRow}>
                  <Switch
                    value={deal.isActive}
                    onValueChange={() => { void toggleFlashDealStatus(deal.id).catch((e: any) => Alert.alert('تعذر تعديل العرض', e?.message || 'حاول مجدداً.')); }}
                    trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
                    thumbColor={colors.surfaceContainerLowest}
                  />
                  <TouchableOpacity style={[s.iconBtn, s.iconBtnRed]} onPress={() =>
                    Alert.alert('حذف العرض', `حذف "${deal.title}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => { void deleteFlashDeal(deal.id).catch((e: any) => Alert.alert('تعذر الحذف', e?.message || 'حاول مجدداً.')); } },
                    ])}>
                    <Text style={s.iconBtnTxt}>🗑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={() => handleEditDeal(deal)}>
                    <Text style={s.iconBtnTxt}>✏️</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.listCardInfo}>
                  <Text style={s.listTitle} numberOfLines={1}>{deal.title}</Text>
                  <Text style={s.listSub} numberOfLines={1}>{deal.storeName}</Text>
                </View>
              </View>

              <View style={s.dealPriceRow}>
                {deal.discountPercent > 0 && (
                  <View style={s.dealBadge}>
                    <Text style={s.dealBadgeText}>خصم {deal.discountPercent}%</Text>
                  </View>
                )}
                <View style={s.dealPrices}>
                  {deal.originalPrice > 0 && deal.originalPrice !== deal.discountPrice && (
                  <Text style={s.dealOrigPrice}>{(Number(deal.originalPrice) || 0).toLocaleString()} ر.ي</Text>
                  )}
                  <Text style={s.dealNewPrice}>{(Number(deal.discountPrice) || 0).toLocaleString()} ر.ي</Text>
                </View>
              </View>
              <Text style={s.dealHours}>⏱ ينتهي: {deal.expiresAt ? new Date(deal.expiresAt).toLocaleString('ar-YE') : 'غير محدد'} · {deal.isActive ? 'نشط' : 'متوقف'}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Category form */}
      <Modal visible={showCatForm} transparent animationType="fade">
        <View style={s.formOverlay}>
          <View style={s.formCard}>
            <Text style={s.formTitle}>{editingCat ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</Text>
            <Text style={s.formLabel}>اسم الفئة *</Text>
            <TextInput style={s.formInput} placeholder="مثال: إلكترونيات، ملابس..." placeholderTextColor={colors.outline}
              value={catName} onChangeText={setCatName} textAlign="right" />
            <Text style={s.formLabel}>أيقونة (إيموجي)</Text>
            <TextInput style={[s.formInput, { textAlign: 'center' }]} value={catIcon} onChangeText={setCatIcon} maxLength={4} />
            <View style={s.formBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCatForm(false); setEditingCat(null); }}>
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, isSavingCat && { opacity: 0.7 }]}
                onPress={handleSaveCategory}
                disabled={isSavingCat}
              >
                {isSavingCat ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.saveBtnText}>{editingCat ? 'حفظ التعديل' : 'إضافة الفئة'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Store form */}
      <Modal visible={showStoreForm} transparent animationType="slide">
        <View style={s.formOverlayBottom}>
          <View style={s.formCardLarge}>
            <Text style={s.formTitle}>{editingStore ? 'تعديل بيانات المتجر' : 'إضافة متجر جديد'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.formLabel}>اسم المتجر *</Text>
              <TextInput style={s.formInput} placeholder="اسم المتجر (مثال: متجر الأناقة للملابس)" placeholderTextColor={colors.outline}
                value={storeName} onChangeText={setStoreName} textAlign="right" />

              <Text style={s.formLabel}>رقم الهاتف</Text>
              <TextInput style={s.formInput} placeholder="777xxxxxxx" placeholderTextColor={colors.outline}
                value={storePhone} onChangeText={setStorePhone} keyboardType="phone-pad" textAlign="right" />

              <Text style={s.formLabel}>العنوان</Text>
              <TextInput style={s.formInput} placeholder="العنوان التفصيلي (شارع، مبنى...)" placeholderTextColor={colors.outline}
                value={storeAddress} onChangeText={setStoreAddress} textAlign="right" />

              <Text style={s.formLabel}>مواعيد المتجر *</Text>
              <OpeningHoursFields openingTime={storeOpeningTime} closingTime={storeClosingTime} is24Hours={store24Hours}
                onOpeningTimeChange={setStoreOpeningTime} onClosingTimeChange={setStoreClosingTime} on24HoursChange={setStore24Hours} disabled={isSavingStore} />

              <Text style={s.formLabel}>محافظة المتجر *</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setStoreGovernoratePickerVisible(true)}>
                <Text style={s.pickerArrow}>▾</Text>
                <Text style={s.pickerValue}>{governorates.find(g => g.id === storeGovernorateId)?.name || 'اختر المحافظة'}</Text>
              </TouchableOpacity>

              <Text style={s.formLabel}>موقع المتجر على الخريطة *</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setShowStoreMapPicker(true)}>
                <Text style={s.pickerArrow}>📍</Text>
                <Text style={[s.pickerValue, storeLatitude === null && s.pickerPlaceholder]} numberOfLines={1}>
                  {storeLatitude !== null && storeLongitude !== null
                    ? `${storeLatitude.toFixed(5)}, ${storeLongitude.toFixed(5)} — اضغط لتغيير الموقع`
                    : 'اختر موقع المتجر من الخريطة'}
                </Text>
              </TouchableOpacity>

              {/* Store Image */}
              <Text style={s.formLabel}>صورة المتجر</Text>
              {storeImageUrl ? (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: colors.surfaceContainerLow, padding: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outlineVariant + '40' }}>
                  <Image source={{ uri: storeImageUrl }} style={{ width: 64, height: 64, borderRadius: borderRadius.sm }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: colors.outline, textAlign: 'right' }}>{storeImageUrl}</Text>
                    <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity onPress={() => setShowStoreImagePicker(true)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primary + '15', borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.primary, fontFamily: 'Tajawal_700Bold' }}>تغيير الصورة</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setStoreImageUrl('')} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.error + '15', borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.error, fontFamily: 'Tajawal_700Bold' }}>حذف</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.primary,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.primary + '08',
                    marginBottom: 14,
                  }}
                  onPress={() => setShowStoreImagePicker(true)}
                >
                  <Text style={{ fontSize: 18 }}>📷</Text>
                  <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.primary }}>
                    اختيار صورة المتجر (من المعرض أو رابط)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Category picker */}
              <Text style={s.formLabel}>الفئة الكبرى *</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setStoreCatPickerVisible(true)}>
                <Text style={s.pickerArrow}>▾</Text>
                <Text style={[s.pickerValue, !storeCatId && s.pickerPlaceholder]} numberOfLines={1}>
                  {selectedCatLabel}
                </Text>
              </TouchableOpacity>

              {/* Direct Inline Product Types Management */}
              <Text style={s.formLabel}>أنواع المنتجات المتوفرة في هذا المتجر</Text>
              <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 6, textAlign: 'right' }}>
                أضف الأنواع التي يبيعها المتجر (مثل: ملابس رجالية، ملابس نسائية، أحذية...)
              </Text>

              {/* Add custom type input */}
              <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: 12, paddingVertical: 10 }}
                  onPress={() => {
                    const trimmed = storeCustomTypeInput.trim();
                    if (trimmed && !storeProductTypes.includes(trimmed)) {
                      setStoreProductTypes([...storeProductTypes, trimmed]);
                      setStoreCustomTypeInput('');
                    }
                  }}
                >
                  <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.onPrimary }}>+ إضافة نوع</Text>
                </TouchableOpacity>
                <TextInput
                  style={[s.formInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="اكتب نوعاً (مثال: ملابس رجالية)..."
                  placeholderTextColor={colors.outline}
                  value={storeCustomTypeInput}
                  onChangeText={setStoreCustomTypeInput}
                  onSubmitEditing={() => {
                    const trimmed = storeCustomTypeInput.trim();
                    if (trimmed && !storeProductTypes.includes(trimmed)) {
                      setStoreProductTypes([...storeProductTypes, trimmed]);
                      setStoreCustomTypeInput('');
                    }
                  }}
                  textAlign="right"
                />
              </View>

              {/* Quick suggestions scroll */}
              <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 11, color: colors.outline, marginBottom: 4, textAlign: 'right' }}>
                مقترحات سريعة (انقر للإضافة أو الحذف):
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {PRESET_PRODUCT_TYPES.map((t) => {
                  const isSelected = storeProductTypes.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={{
                        backgroundColor: isSelected ? colors.primaryFixedDim + '40' : colors.surfaceContainerLow,
                        borderColor: isSelected ? colors.primary : colors.outlineVariant + '40',
                        borderWidth: 1,
                        borderRadius: borderRadius.full,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        marginLeft: 6,
                      }}
                      onPress={() => {
                        if (isSelected) {
                          setStoreProductTypes(storeProductTypes.filter((x) => x !== t));
                        } else {
                          setStoreProductTypes([...storeProductTypes, t]);
                        }
                      }}
                    >
                      <Text style={{
                        fontFamily: isSelected ? 'Tajawal_700Bold' : 'Tajawal_500Medium',
                        fontSize: 12,
                        color: isSelected ? colors.primary : colors.onSurface,
                      }}>
                        {isSelected ? `✓ ${t}` : `+ ${t}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected types chips */}
              {storeProductTypes.length > 0 ? (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.onSurface, marginBottom: 6, textAlign: 'right' }}>
                    الأنواع المسجلة لهذا المتجر ({storeProductTypes.length}):
                  </Text>
                  <View style={s.chipsRow}>
                    {storeProductTypes.map((t, i) => (
                      <View key={i} style={[s.chip, { backgroundColor: colors.primary + '15', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8 }]}>
                        <TouchableOpacity onPress={() => setStoreProductTypes(storeProductTypes.filter((_, idx) => idx !== i))}>
                          <Text style={{ fontSize: 12, color: colors.error }}>✕</Text>
                        </TouchableOpacity>
                        <Text style={[s.chipText, { color: colors.primary, fontFamily: 'Tajawal_700Bold' }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.outline, textAlign: 'right', marginBottom: 12 }}>
                  لم يتم تسجيل أنواع بعد. اكتب نوعاً بالأعلى أو اختر من المقترحات.
                </Text>
              )}

              <View style={s.formBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowStoreForm(false); setEditingStore(null); setStoreImageUrl(''); }}>
                  <Text style={s.cancelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, isSavingStore && { opacity: 0.7 }]}
                  onPress={handleSaveStore}
                  disabled={isSavingStore}
                >
                  {isSavingStore ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.saveBtnText}>{editingStore ? 'حفظ التعديلات' : 'إضافة المتجر'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Deal form */}
      <Modal visible={showDealForm} transparent animationType="slide">
        <View style={s.formOverlayBottom}>
          <View style={s.formCardLarge}>
            <Text style={s.formTitle}>{editingDeal ? 'تعديل العرض' : 'إضافة عرض جديد'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Deal type */}
              <Text style={s.formLabel}>نوع العرض *</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setDealTypePickerVisible(true)}>
                <Text style={s.pickerArrow}>▾</Text>
                <Text style={s.pickerValue} numberOfLines={1}>{selectedDealTypeLabel}</Text>
              </TouchableOpacity>

              {/* Visibility */}
              <Text style={s.formLabel}>ظهور العرض في</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setDealVisibilityPickerVisible(true)}>
                <Text style={s.pickerArrow}>▾</Text>
                <Text style={s.pickerValue} numberOfLines={1}>{selectedVisibilityLabel}</Text>
              </TouchableOpacity>

              <Text style={s.formLabel}>عنوان العرض *</Text>
              <TextInput style={s.formInput} placeholder="عنوان العرض..." placeholderTextColor={colors.outline}
                value={dealTitle} onChangeText={setDealTitle} textAlign="right" />

              <Text style={s.formLabel}>الصورة العامة للعرض</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setShowDealImagePicker(true)}>
                <Text style={s.pickerValue}>{dealImageUrl ? 'تغيير الصورة' : 'اختيار صورة العرض'}</Text>
              </TouchableOpacity>
              {!!dealImageUrl && <Image source={{ uri: dealImageUrl }} style={{ width: '100%', height: 130, borderRadius: 10, marginTop: 8 }} resizeMode="cover" />}

              {dealType === 'bundle' && <>
              <Text style={s.formLabel}>المتجر المرتبط بالباقة *</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setDealStorePickerVisible(true)}>
                <Text style={s.pickerArrow}>▾</Text>
                <Text style={[s.pickerValue, !dealStore && s.pickerPlaceholder]} numberOfLines={1}>
                  {stores.find((s) => s.id === dealStore)?.name || 'اختر متجراً...'}
                </Text>
              </TouchableOpacity>
              </>}

              {/* Category picker (for category-level visibility) */}
              {(dealVisibility === 'category' || dealVisibility === 'all') && (
                <>
                  <Text style={s.formLabel}>الفئة المرتبطة</Text>
                  <TouchableOpacity style={s.pickerTrigger} onPress={() => setDealCatPickerVisible(true)}>
                    <Text style={s.pickerArrow}>▾</Text>
                    <Text style={[s.pickerValue, !dealCatId && s.pickerPlaceholder]} numberOfLines={1}>
                      {catOptions.find((o) => o.id === dealCatId)?.label || 'اختر فئة...'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Bundle items */}
              {dealType === 'bundle' && (
                <>
                  <Text style={s.formLabel}>محتويات الباقة / الطقم</Text>
                  {bundleItems.map((item, i) => (
                    <View key={item.id} style={s.bundleItemRow}>
                      <TouchableOpacity onPress={() => setBundleItems((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Text style={s.removeIcon}>✕</Text>
                      </TouchableOpacity>
                      <Text style={s.bundleItemPrice}>{item.price} ر.ي</Text>
                      <Text style={s.bundleItemName} numberOfLines={1}>{item.name}</Text>
                      {i > 0 && <TouchableOpacity accessibilityLabel={`رفع ترتيب ${item.name}`} onPress={() => setBundleItems(current => {
                        const next = [...current]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next;
                      })}><Text style={{ padding: 8 }}>↑</Text></TouchableOpacity>}
                      <TouchableOpacity onPress={() => void editPieceOptions(item.id)}><Text style={{ color: '#2563EB', padding: 8 }}>الخيارات والأسعار</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { setBundleImageIndex(i); setShowDealImagePicker(true); }}>
                        <Text style={s.removeIcon}>{item.imageUrl ? '🖼️✓' : '🖼️'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {pieceEditorId && bundleItems.some(p => p.id === pieceEditorId) && <View style={{ gap: 8, paddingVertical: 12 }}>
                    <Text style={s.formLabel}>تفاصيل {bundleItems.find(p => p.id === pieceEditorId)?.name}</Text>
                    {pieceOptionsLoading ? <ActivityIndicator /> : pieceOptionsError ? <TouchableOpacity onPress={() => void editPieceOptions(pieceEditorId)}><Text>{pieceOptionsError} — إعادة المحاولة</Text></TouchableOpacity> : <>
                      <TextInput style={s.formInput} placeholder="اسم القطعة" value={bundleItems.find(p => p.id === pieceEditorId)?.name || ''}
                        onChangeText={name => setBundleItems(current => current.map(p => p.id === pieceEditorId ? { ...p, name } : p))} />
                      <TextInput style={s.formInput} placeholder="سعر بيع القطعة الأساسي" keyboardType="decimal-pad" value={bundleItems.find(p => p.id === pieceEditorId)?.price || ''}
                        onChangeText={price => setBundleItems(current => current.map(p => p.id === pieceEditorId ? { ...p, price } : p))} />
                      <TextInput style={s.formInput} placeholder="سعر الشراء المتوقع (مطلوب للخيارات)" keyboardType="decimal-pad"
                        value={bundleItems.find(p => p.id === pieceEditorId)?.expectedPurchasePrice || ''}
                        onChangeText={expectedPurchasePrice => setBundleItems(current => current.map(p => p.id === pieceEditorId ? { ...p, expectedPurchasePrice } : p))} />
                      <ProductOptionsEditor value={bundleItems.find(p => p.id === pieceEditorId)?.options || emptyOptions()}
                        price={Number(bundleItems.find(p => p.id === pieceEditorId)?.price) || 0}
                        cost={Number(bundleItems.find(p => p.id === pieceEditorId)?.expectedPurchasePrice) || 0}
                        onChange={options => setBundleItems(current => current.map(p => p.id === pieceEditorId ? { ...p, options } : p))} />
                    </>}
                    <TouchableOpacity onPress={() => setPieceEditorId(null)}><Text>إغلاق تفاصيل القطعة</Text></TouchableOpacity>
                  </View>}
                  <View style={s.bundleAddRow}>
                    <TouchableOpacity style={s.bundleAddBtn} onPress={handleAddBundleItem}>
                      <Text style={s.bundleAddBtnText}>+ إضافة</Text>
                    </TouchableOpacity>
                    <TextInput style={[s.formInput, s.bundlePriceInput]} placeholder="السعر" placeholderTextColor={colors.outline}
                      value={bundleItemPrice} onChangeText={setBundleItemPrice} keyboardType="numeric" textAlign="center" />
                    <TextInput style={[s.formInput, { flex: 1 }]} placeholder="اسم المنتج" placeholderTextColor={colors.outline}
                      value={bundleItemName} onChangeText={setBundleItemName} textAlign="right" />
                  </View>
                  {bundleItems.length > 0 && (
                    <View style={s.bundleTotalRow}>
                      <Text style={s.bundleTotalText}>إجمالي المنتجات: {totalBundlePrice.toLocaleString()} ر.ي</Text>
                    </View>
                  )}
                  <Text style={s.formLabel}>السعر النهائي للباقة (اختياري)</Text>
                  <TextInput style={s.formInput} placeholder={`${totalBundlePrice} (اتركه فارغاً بلا خصم)`} placeholderTextColor={colors.outline}
                    value={dealDiscount} onChangeText={setDealDiscount} keyboardType="numeric" textAlign="center" />
                </>
              )}

              {/* Promo code / redemption code field */}
              <Text style={s.formLabel}>رمز الاسترداد / كود الخصم (اختياري)</Text>
              <TextInput
                style={s.formInput}
                placeholder="مثال: BS2026 أو DISCOUNT15"
                placeholderTextColor={colors.outline}
                value={dealCouponCode}
                onChangeText={setDealCouponCode}
                autoCapitalize="characters"
                textAlign="center"
              />

              {dealType === 'order_discount' && (
                <>
                  <Text style={s.formLabel}>طريقة احتساب الخصم</Text>
                  <View style={s.tierToggleRow}>
                    <TouchableOpacity
                      style={[s.tierToggleBtn, !isTieredDiscount && s.tierToggleBtnActive]}
                      onPress={() => setIsTieredDiscount(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.tierToggleText, !isTieredDiscount && s.tierToggleTextActive]}>
                        نسبة خصم ثابتة (%)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.tierToggleBtn, isTieredDiscount && s.tierToggleBtnActive]}
                      onPress={() => setIsTieredDiscount(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.tierToggleText, isTieredDiscount && s.tierToggleTextActive]}>
                        شرائح حسب إجمالي السلة
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!isTieredDiscount ? (
                    <>
                      <Text style={s.formLabel}>نسبة الخصم من إجمالي الطلب (٪) *</Text>
                      <TextInput
                        style={s.formInput}
                        placeholder="مثال: 15"
                        placeholderTextColor={colors.outline}
                        value={dealDiscountPercent}
                        onChangeText={setDealDiscountPercent}
                        keyboardType="numeric"
                        textAlign="center"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={s.formLabel}>تحديد شرائح الخصم حسب إجمالي السلة *</Text>
                      <Text style={s.tierHintText}>
                        حدد نسبة الخصم لكل شريحة من إجمالي سلة العميل (مثال: سلة أقل من 10,000 تمنح 20%، سلة إلى 25,000 تمنح 15%، أكبر تمنح 10%):
                      </Text>

                      {dealTiers.map((tier, idx) => (
                        <View key={idx} style={s.tierCard}>
                          <View style={s.tierHeader}>
                            <TouchableOpacity
                              onPress={() => setDealTiers((prev) => prev.filter((_, i) => i !== idx))}
                              disabled={dealTiers.length <= 1}
                            >
                              <Text style={[s.removeIcon, dealTiers.length <= 1 && { opacity: 0.3 }]}>✕ حذف</Text>
                            </TouchableOpacity>
                            <Text style={s.tierTitle}>الشريحة {idx + 1}</Text>
                          </View>

                          <View style={s.tierInputsRow}>
                            <View style={s.tierInputCol}>
                              <Text style={s.tierInputLabel}>نسبة الخصم %</Text>
                              <TextInput
                                style={[s.formInput, s.tierInput]}
                                placeholder="20"
                                placeholderTextColor={colors.outline}
                                value={tier.discountPercent}
                                onChangeText={(val) =>
                                  setDealTiers((prev) =>
                                    prev.map((t, i) => (i === idx ? { ...t, discountPercent: val } : t))
                                  )
                                }
                                keyboardType="numeric"
                                textAlign="center"
                              />
                            </View>
                            <View style={s.tierInputCol}>
                              <Text style={s.tierInputLabel}>إلى سلة (ر.ي)</Text>
                              <TextInput
                                style={[s.formInput, s.tierInput]}
                                placeholder="بلا حد أقصى"
                                placeholderTextColor={colors.outline}
                                value={tier.maxAmount}
                                onChangeText={(val) =>
                                  setDealTiers((prev) =>
                                    prev.map((t, i) => (i === idx ? { ...t, maxAmount: val } : t))
                                  )
                                }
                                keyboardType="numeric"
                                textAlign="center"
                              />
                            </View>
                            <View style={s.tierInputCol}>
                              <Text style={s.tierInputLabel}>من سلة (ر.ي)</Text>
                              <TextInput
                                style={[s.formInput, s.tierInput]}
                                placeholder="0"
                                placeholderTextColor={colors.outline}
                                value={tier.minAmount}
                                onChangeText={(val) =>
                                  setDealTiers((prev) =>
                                    prev.map((t, i) => (i === idx ? { ...t, minAmount: val } : t))
                                  )
                                }
                                keyboardType="numeric"
                                textAlign="center"
                              />
                            </View>
                          </View>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={s.addTierBtn}
                        onPress={() => {
                          const last = dealTiers[dealTiers.length - 1];
                          const nextMin = last?.maxAmount?.trim() ? last.maxAmount : '25000';
                          setDealTiers((prev) => [
                            ...prev,
                            { minAmount: nextMin, maxAmount: '', discountPercent: '10' },
                          ]);
                        }}
                      >
                        <Text style={s.addTierBtnText}>+ إضافة شريحة خصم جديدة</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {dealType === 'delivery' && (
                <>
                  <Text style={s.formLabel}>نسبة خصم رسوم التوصيل (٪) *</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="مثال: 50 أو 100 للتوصيل المجاني"
                    placeholderTextColor={colors.outline}
                    value={deliveryDiscountPercent}
                    onChangeText={setDeliveryDiscountPercent}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  <TouchableOpacity style={s.pickerTrigger} onPress={() => setDealIsPublic((v) => !v)}>
                    <Text style={s.pickerValue}>ظهور للعملاء تلقائياً: {dealIsPublic ? 'نعم' : 'لا'} (اضغط للتبديل)</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={s.formLabel}>تاريخ انتهاء العرض</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setShowDealDatePicker(true)}>
                <Text style={s.pickerArrow}>▦</Text>
                <Text style={[s.pickerValue, !dealExpiryDate && s.pickerPlaceholder]}>
                  {dealExpiryDate ? new Date(`${dealExpiryDate}T12:00:00`).toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'اختر التاريخ من التقويم'}
                </Text>
              </TouchableOpacity>
              <Text style={s.formLabel}>وقت الانتهاء</Text>
              <TouchableOpacity style={s.pickerTrigger} onPress={() => setShowDealTimePicker(true)}>
                <Text style={s.pickerArrow}>◷</Text>
                <Text style={s.pickerValue}>{dealExpiryTime}</Text>
              </TouchableOpacity>

              <View style={s.formBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowDealForm(false); setEditingDeal(null); }}>
                  <Text style={s.cancelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, isSavingDeal && { opacity: 0.7 }]}
                  onPress={handleSaveDeal}
                  disabled={isSavingDeal}
                >
                  {isSavingDeal ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.saveBtnText}>{editingDeal ? 'حفظ التعديلات' : 'إضافة العرض'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ListBox Modals */}
      <ListBoxModal
        visible={storeCatPickerVisible}
        title="اختر الفئة"
        options={catOptions}
        selectedId={storeCatId}
        onSelect={setStoreCatId}
        onClose={() => setStoreCatPickerVisible(false)}
      />
      <ListBoxModal visible={storeGovernoratePickerVisible} title="محافظة المتجر" options={governorates.map(g=>({id:g.id,label:g.name}))} selectedId={storeGovernorateId} onSelect={setStoreGovernorateId} onClose={() => setStoreGovernoratePickerVisible(false)} />
      <ListBoxModal
        visible={prodCatPickerVisible}
        title="فلترة بالفئة"
        options={[{ id: 'all', label: `الكل (${products.length})` }, ...catOptions]}
        selectedId={prodCatFilter}
        onSelect={setProdCatFilter}
        onClose={() => setProdCatPickerVisible(false)}
      />
      <ListBoxModal
        visible={prodStorePickerVisible}
        title="فلترة بالمتجر"
        options={[{ id: 'all', label: 'كل المتاجر', icon: '🏪' }, ...storeOptions]}
        selectedId={prodStoreFilter}
        onSelect={setProdStoreFilter}
        onClose={() => setProdStorePickerVisible(false)}
      />
      <ListBoxModal
        visible={dealTypePickerVisible}
        title="نوع العرض"
        options={DEAL_TYPES.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
        selectedId={dealType}
        onSelect={setDealType}
        onClose={() => setDealTypePickerVisible(false)}
      />
      <ListBoxModal
        visible={dealVisibilityPickerVisible}
        title="مكان ظهور العرض"
        options={DEAL_VISIBILITY.map((v) => ({ id: v.id, label: v.label }))}
        selectedId={dealVisibility}
        onSelect={setDealVisibility}
        onClose={() => setDealVisibilityPickerVisible(false)}
      />
      <ListBoxModal
        visible={dealStorePickerVisible}
        title="المتجر"
        options={[{ id: '', label: 'بدون متجر محدد' }, ...storeOptions]}
        selectedId={dealStore}
        onSelect={setDealStore}
        onClose={() => setDealStorePickerVisible(false)}
      />
      <ListBoxModal
        visible={dealCatPickerVisible}
        title="الفئة المرتبطة"
        options={catOptions}
        selectedId={dealCatId}
        onSelect={setDealCatId}
        onClose={() => setDealCatPickerVisible(false)}
      />

      <ImagePickerModal
        visible={showStoreImagePicker}
        onClose={() => setShowStoreImagePicker(false)}
        onImageSelected={(url) => setStoreImageUrl(url)}
        folder="stores"
        initialUrl={storeImageUrl}
        title="اختيار صورة المتجر"
      />
      <LocationPickerModal
        visible={showStoreMapPicker}
        title="حدد موقع المتجر على الخريطة"
        initialLat={storeLatitude ?? 15.35}
        initialLng={storeLongitude ?? 44.20}
        initialDistrict={storeAddress}
        onClose={() => setShowStoreMapPicker(false)}
        onConfirm={handleStoreLocationPicked}
      />
      <DealDatePickerModal
        visible={showDealDatePicker}
        value={dealExpiryDate}
        onSelect={setDealExpiryDate}
        onClose={() => setShowDealDatePicker(false)}
      />
      <DealTimePickerModal
        visible={showDealTimePicker}
        value={dealExpiryTime}
        onSelect={setDealExpiryTime}
        onClose={() => setShowDealTimePicker(false)}
      />
      <ImagePickerModal
        visible={showDealImagePicker}
        onClose={() => { setShowDealImagePicker(false); setBundleImageIndex(null); }}
        onImageSelected={(url) => {
          if (bundleImageIndex !== null) {
            setBundleItems((prev) => prev.map((item, i) => i === bundleImageIndex ? { ...item, imageUrl: url } : item));
          } else setDealImageUrl(url);
        }}
        folder="offers"
        initialUrl={bundleImageIndex !== null ? bundleItems[bundleImageIndex]?.imageUrl || '' : dealImageUrl}
        title={bundleImageIndex !== null ? 'صورة المنتج المركب' : 'صورة العرض العامة'}
      />

    </View>
  );
};

// ── StatusBadge helper ───────────────────────────────────────────────────────
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <View style={[s.badge, active ? s.badgeActive : s.badgeInactive]}>
    <Text style={[s.badgeText, active ? s.badgeTextActive : s.badgeTextInactive]}>
      {active ? 'ظاهر للعملاء' : 'مخفي عن العملاء'}
    </Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },

  // Card hidden state
  cardHidden: {
    opacity: 0.85,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant + '70',
    backgroundColor: colors.surfaceContainerLow,
  },
  iconBtnHidden: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  iconBtnUnhide: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
  },

  // Visibility Filter Pills
  filterPillRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillTxt: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  filterPillTxtActive: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.onPrimary,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, position: 'relative' },
  tabActive: {},
  tabIcon: { fontSize: 16, marginBottom: 1 },
  tabLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  tabLabelActive: { fontFamily: 'Tajawal_700Bold', color: colors.primary },
  tabBar_indicator: { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 3, backgroundColor: colors.primary, borderRadius: 2 },

  // Layout helpers
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowEnd: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  actionsRow: { flexDirection: 'row-reverse', gap: 6, alignItems: 'center' },

  // Scroll
  scrollContent: { paddingHorizontal: spacing.screenGutter, paddingTop: spacing.baseSm, paddingBottom: 110 },

  // Section
  sectionTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onSurface },

  // Add button
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.lg },
  addBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onPrimary },

  // List cards
  listCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  listCardInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 8 },
  listTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.onSurface },
  listSub: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  governorateCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  governorateName: { flex: 1, textAlign: 'right' },
  governorateActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  governorateEditBtn: { flex: 0, paddingHorizontal: 14 },

  // Store card
  storeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  storeDetails: { gap: 2, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.outlineVariant + '20' },
  storeDetailTxt: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'right' },

  // Chips
  chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  chip: { backgroundColor: colors.primaryFixedDim + '25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  chipText: { fontFamily: 'Tajawal_500Medium', fontSize: 11, color: colors.primary },

  // Icon buttons
  iconBtn: { width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  iconBtnRed: { backgroundColor: colors.errorContainer + '20' },
  iconBtnTxt: { fontSize: 14 },

  // Badges
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: colors.surfaceContainerHigh },
  badgeText: { fontFamily: 'Tajawal_700Bold', fontSize: 10 },
  badgeTextActive: { color: '#16A34A' },
  badgeTextInactive: { color: colors.onSurfaceVariant },

  // Link
  linkText: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.primary },

  // Search
  searchSection: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '25',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { fontSize: 13, marginLeft: 5 },
  searchInput: { flex: 1, fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurface },
  clearBtn: { fontSize: 13, color: colors.outline, padding: 4 },

  // Filter row
  filterRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '20',
  },
  filterPicker: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterPickerText: { fontFamily: 'Tajawal_500Medium', fontSize: 12, color: colors.onSurface, flex: 1, textAlign: 'right' },
  filterPickerArrow: { fontSize: 12, color: colors.outline, marginLeft: 4 },

  // Product card
  productCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  productRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 8 },
  thumbWrap: { width: 64, height: 64, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.surfaceContainerLow },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbEmptyIcon: { fontSize: 24 },
  productInfo: { flex: 1, alignItems: 'flex-end' },
  storeTag: { fontFamily: 'Tajawal_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  productName: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onSurface, textAlign: 'right', marginTop: 3 },

  // Financial row
  finRow: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '25',
    paddingTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  finCol: { flex: 1, alignItems: 'center' },
  finColProfit: { backgroundColor: '#F0FDF4', borderRadius: borderRadius.md, paddingVertical: 3 },
  finLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 10, color: colors.onSurfaceVariant, marginBottom: 2 },
  finVal: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.onSurface },
  profitVal: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: '#16A34A' },

  productActions: { flexDirection: 'row-reverse', gap: 8 },
  editBtn: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, paddingVertical: 7, alignItems: 'center' },
  editBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onSurface },
  delBtn: { width: 38, height: 36, backgroundColor: colors.errorContainer + '20', borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },

  // Deal card
  dealCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  dealCardOff: { opacity: 0.55 },
  dealPriceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 6 },
  dealBadge: { backgroundColor: colors.error + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  dealBadgeText: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.error },
  dealPrices: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dealOrigPrice: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.outline, textDecorationLine: 'line-through' },
  dealNewPrice: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.primary },
  dealHours: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: 4 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 36 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.outline },

  // Forms
  formOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 16 },
  formOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  formCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xxl, padding: 16, ...shadows.floating },
  formCardLarge: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: 16,
    maxHeight: '85%',
    ...shadows.floating,
  },
  formTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: colors.onSurface, textAlign: 'right', marginBottom: 12 },
  formLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'right', marginBottom: 4 },
  formInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Tajawal_400Regular',
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  formBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.onSurface },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.onPrimary },

  // Picker trigger
  pickerTrigger: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  pickerValue: { fontFamily: 'Tajawal_400Regular', fontSize: 14, color: colors.onSurface, flex: 1, textAlign: 'right' },
  pickerPlaceholder: { color: colors.outline },
  pickerArrow: { fontSize: 14, color: colors.outline, marginLeft: 6 },

  // Price row for deals
  priceRow: { flexDirection: 'row-reverse', gap: 10 },
  priceHalf: { flex: 1 },

  // Bundle
  bundleItemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 8,
    marginBottom: 6,
    gap: 8,
  },
  bundleItemName: { flex: 1, fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurface, textAlign: 'right' },
  bundleItemPrice: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.primary },
  removeIcon: { fontSize: 14, color: colors.error, paddingHorizontal: 4 },
  bundleAddRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', marginBottom: 8 },
  bundleAddBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center' },
  bundleAddBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.onPrimary },
  bundlePriceInput: { width: 80, marginBottom: 0 },
  bundleTotalRow: { backgroundColor: '#EFF6FF', borderRadius: borderRadius.lg, padding: 10, marginBottom: 10 },
  bundleTotalText: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.primary, textAlign: 'center' },

  // ListBox
  lbOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  lbSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: 16,
    maxHeight: '65%',
  },
  lbHandle: { width: 36, height: 4, backgroundColor: colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  lbTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: colors.onSurface, textAlign: 'right', marginBottom: 10 },
  lbOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
    marginBottom: 4,
  },
  lbOptionActive: { backgroundColor: colors.primaryFixedDim + '25' },
  lbOptionCheck: { fontSize: 18, color: colors.outline, width: 22, textAlign: 'center' },
  lbOptionCheckActive: { color: colors.primary },
  lbOptionBody: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 },
  lbOptionIcon: { fontSize: 16 },
  lbOptionText: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.onSurface, flex: 1, textAlign: 'right' },
  lbOptionTextActive: { fontFamily: 'Tajawal_700Bold', color: colors.primary },
  lbCancelBtn: { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  lbCancelText: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.onSurface },
  lbCustomRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', marginTop: 6 },
  lbCustomInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: 'Tajawal_400Regular',
    fontSize: 13,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  lbCustomBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: 12, paddingVertical: 10 },
  lbCustomBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onPrimary },

  // Tiered discounts styles
  tierToggleRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  tierToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  tierToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tierToggleText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  tierToggleTextActive: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.onPrimary,
  },
  tierHintText: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 8,
    lineHeight: 16,
  },
  tierCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  tierHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  tierInputsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  tierInputCol: {
    flex: 1,
    alignItems: 'center',
  },
  tierInputLabel: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 10,
    color: colors.outline,
    marginBottom: 4,
    textAlign: 'center',
  },
  tierInput: {
    width: '100%',
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 12,
  },
  addTierBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '35',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addTierBtnText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
});
