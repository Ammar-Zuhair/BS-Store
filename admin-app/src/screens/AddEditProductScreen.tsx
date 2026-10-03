import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { ImagePickerModal } from '../components/ImagePickerModal';

// ── Generic ListBox Modal Component ──────────────────────────────────────────
interface ListBoxOption {
  id: string;
  label: string;
  subLabel?: string;
  icon?: string;
}

interface ListBoxModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ListBoxOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onAddCustom?: (val: string) => void;
  emptyText?: string;
}

const ListBoxModal: React.FC<ListBoxModalProps> = ({
  visible,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  onClose,
  allowCustom,
  customPlaceholder,
  onAddCustom,
  emptyText = 'لا توجد خيارات متاحة',
}) => {
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.subLabel && o.subLabel.toLowerCase().includes(q))
    );
  }, [options, search]);

  const handleAdd = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (onAddCustom) {
      onAddCustom(trimmed);
      setCustomInput('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={lbStyles.overlay}>
        <TouchableOpacity style={lbStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={lbStyles.sheet}>
          {/* Header */}
          <View style={lbStyles.handle} />
          <View style={lbStyles.header}>
            <Text style={lbStyles.title}>{title}</Text>
            {subtitle ? <Text style={lbStyles.subtitle}>{subtitle}</Text> : null}
          </View>

          {/* Search if options > 4 */}
          {options.length > 4 && (
            <View style={lbStyles.searchRow}>
              <Text style={lbStyles.searchIcon}>🔍</Text>
              <TextInput
                style={lbStyles.searchInput}
                placeholder="ابحث هنا..."
                placeholderTextColor={colors.outline}
                value={search}
                onChangeText={setSearch}
                textAlign="right"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={lbStyles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Options List */}
          <ScrollView style={lbStyles.list} showsVerticalScrollIndicator={false}>
            {filteredOptions.length === 0 ? (
              <View style={lbStyles.emptyWrap}>
                <Text style={lbStyles.emptyText}>{emptyText}</Text>
              </View>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedId === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[lbStyles.optionCard, isSelected && lbStyles.optionCardActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(opt.id);
                      onClose();
                    }}
                  >
                    <View style={lbStyles.optionRight}>
                      {opt.icon ? <Text style={lbStyles.optionEmoji}>{opt.icon}</Text> : null}
                      <View style={lbStyles.optionTexts}>
                        <Text style={[lbStyles.optionLabel, isSelected && lbStyles.optionLabelActive]}>
                          {opt.label}
                        </Text>
                        {opt.subLabel ? (
                          <Text style={lbStyles.optionSubLabel} numberOfLines={1}>
                            {opt.subLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={[lbStyles.radioCircle, isSelected && lbStyles.radioCircleActive]}>
                      {isSelected && <View style={lbStyles.radioInnerDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Inline Custom Add */}
          {allowCustom && (
            <View style={lbStyles.customAddSection}>
              <Text style={lbStyles.customAddLabel}>أو أضف نوعاً جديداً لهذا المتجر مباشرة:</Text>
              <View style={lbStyles.customInputRow}>
                <TouchableOpacity
                  style={[lbStyles.customAddBtn, !customInput.trim() && lbStyles.customAddBtnDisabled]}
                  disabled={!customInput.trim()}
                  onPress={handleAdd}
                >
                  <Text style={lbStyles.customAddBtnText}>+ إضافة واختيار</Text>
                </TouchableOpacity>
                <TextInput
                  style={lbStyles.customTextInput}
                  placeholder={customPlaceholder || 'اكتب اسماً مخصصاً...'}
                  placeholderTextColor={colors.outline}
                  value={customInput}
                  onChangeText={setCustomInput}
                  onSubmitEditing={handleAdd}
                  textAlign="right"
                />
              </View>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity style={lbStyles.closeBtn} onPress={onClose}>
            <Text style={lbStyles.closeBtnText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── MAIN SCREEN: AddEditProductScreen ─────────────────────────────────────────
export const AddEditProductScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    addProduct,
    updateProduct,
    editingProduct,
    setEditingProduct,
    navigateTo,
    categories,
    stores,
    updateStore,
  } = useAdmin();

  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // ── Step 1: Category filter and selected store ──────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(editingProduct?.categoryId || '');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    if (editingProduct?.storeId && stores.some((s) => s.id === editingProduct.storeId)) {
      return editingProduct.storeId;
    }
    if (editingProduct?.storeName) {
      const found = stores.find((s) => s.name === editingProduct.storeName);
      if (found) return found.id;
    }
    return stores[0]?.id || '';
  });

  const filteredStores = useMemo(() => {
    if (!selectedCategoryId) return stores;
    return stores.filter((store) =>
      store.categoryId === selectedCategoryId ||
      store.categoryIds?.includes(selectedCategoryId) ||
      (store.id === editingProduct?.storeId && editingProduct.categoryId === selectedCategoryId)
    );
  }, [stores, selectedCategoryId, editingProduct?.storeId, editingProduct?.categoryId]);

  const selectedStore = useMemo(() => {
    return filteredStores.find((store) => store.id === selectedStoreId) || filteredStores[0] || null;
  }, [filteredStores, selectedStoreId]);

  // ── Step 2: Product Type in that specific Store ──────────────────────────────
  const [productType, setProductType] = useState<string>(() => {
    if (editingProduct?.subcategoryName) return editingProduct.subcategoryName;
    return selectedStore?.subcategories?.[0] || '';
  });

  // Available types strictly belonging to the chosen store
  const storeAvailableTypes = useMemo(() => {
    return selectedStore?.subcategories || [];
  }, [selectedStore]);

  // ── Step 3: Product Basic Info ──────────────────────────────────────────────
  const [productName, setProductName] = useState(editingProduct ? editingProduct.name : '');
  const [productDesc, setProductDesc] = useState(editingProduct ? editingProduct.description : '');

  // ── Images Gallery ──────────────────────────────────────────────────────────
  const [images, setImages] = useState<string[]>(() => {
    if (editingProduct) {
      if (editingProduct.images && editingProduct.images.length > 0) return editingProduct.images;
      if (editingProduct.imageUrl) return [editingProduct.imageUrl];
    }
    return [];
  });
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // ── Pricing & Profit Margin ─────────────────────────────────────────────────
  const [purchaseCost, setPurchaseCost] = useState(
    editingProduct ? editingProduct.expectedPurchasePrice.toString() : ''
  );
  const [sellingPrice, setSellingPrice] = useState(
    editingProduct ? editingProduct.sellingPrice.toString() : ''
  );

  const costNum = parseFloat(purchaseCost) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const profitMargin = sellNum - costNum;
  const marginPercent = sellNum > 0 ? ((profitMargin / sellNum) * 100).toFixed(1) : '0.0';

  // ── Category & Visibility ───────────────────────────────────────────────────
  const currentCategory = useMemo(() => {
    const catId = selectedCategoryId || selectedStore?.categoryId || editingProduct?.categoryId;
    return categories.find((c) => c.id === catId) || categories[0] || null;
  }, [categories, selectedCategoryId, selectedStore, editingProduct]);

  const [isActiveForOrder, setIsActiveForOrder] = useState(
    editingProduct ? editingProduct.isActive : true
  );

  // Synchronize form fields whenever editingProduct changes or is reset to null
  useEffect(() => {
    if (editingProduct) {
      setSelectedCategoryId(editingProduct.categoryId || '');
      setProductName(editingProduct.name || '');
      setProductDesc(editingProduct.description || '');
      setPurchaseCost(
        editingProduct.expectedPurchasePrice !== undefined && editingProduct.expectedPurchasePrice !== null
          ? editingProduct.expectedPurchasePrice.toString()
          : ''
      );
      setSellingPrice(
        editingProduct.sellingPrice !== undefined && editingProduct.sellingPrice !== null
          ? editingProduct.sellingPrice.toString()
          : ''
      );
      if (editingProduct.storeId) {
        setSelectedStoreId(editingProduct.storeId);
      }
      setProductType(editingProduct.subcategoryName || '');
      setIsActiveForOrder(editingProduct.isActive ?? true);
      if (editingProduct.images && editingProduct.images.length > 0) {
        setImages(editingProduct.images);
      } else if (editingProduct.imageUrl) {
        setImages([editingProduct.imageUrl]);
      } else {
        setImages([]);
      }
    } else {
      setSelectedCategoryId('');
      setProductName('');
      setProductDesc('');
      setPurchaseCost('');
      setSellingPrice('');
      if (stores.length > 0) {
        setSelectedStoreId(stores[0].id);
      }
      setProductType('');
      setIsActiveForOrder(true);
      setImages([]);
    }
  }, [editingProduct]);

  // ── ListBox Visibility Modals ───────────────────────────────────────────────
  const [showStoreListBox, setShowStoreListBox] = useState(false);
  const [showCategoryListBox, setShowCategoryListBox] = useState(false);
  const [showTypeListBox, setShowTypeListBox] = useState(false);

  // ── ListBox Options Mapping ─────────────────────────────────────────────────
  const categoryOptions: ListBoxOption[] = useMemo(() => [
    { id: '', label: 'جميع الفئات', subLabel: 'عرض المتاجر من كل الفئات', icon: '🗂️' },
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
      subLabel: `${category.productCount || 0} منتج`,
      icon: category.icon || '🗂️',
    })),
  ], [categories]);

  const selectedCategoryLabel = categories.find((category) => category.id === selectedCategoryId)?.name || 'جميع الفئات';

  const storeOptions: ListBoxOption[] = useMemo(() => {
    return filteredStores.map((s) => ({
      id: s.id,
      label: s.name,
      subLabel: `${s.address ? s.address + ' · ' : ''}${s.categoryIds?.length || (s.categoryId && s.categoryId !== 'cat-general' ? 1 : 0)} فئات · ${s.subcategories?.length || 0} أنواع`,
      icon: '🏪',
    }));
  }, [filteredStores]);

  const storeTypeOptions: ListBoxOption[] = useMemo(() => {
    return storeAvailableTypes.map((type) => ({
      id: type,
      label: type,
      subLabel: `خاص بمتجر ${selectedStore?.name || ''}`,
      icon: '🏷️',
    }));
  }, [storeAvailableTypes, selectedStore]);

  // ── Handler: Store Selected ─────────────────────────────────────────────────
  const handleSelectStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    const newStore = stores.find((s) => s.id === storeId);
    if (newStore) {
      // If previous product type is not in new store's types, auto-select first or empty
      const types = newStore.subcategories || [];
      if (!types.includes(productType)) {
        setProductType(types.length > 0 ? types[0] : '');
      }
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const matchesCategory = (store: typeof stores[number]) =>
      !categoryId ||
      store.categoryId === categoryId ||
      store.categoryIds?.includes(categoryId) ||
      (store.id === editingProduct?.storeId && editingProduct.categoryId === categoryId);
    const currentStore = stores.find((store) => store.id === selectedStoreId);
    const nextStore = currentStore && matchesCategory(currentStore)
      ? currentStore
      : stores.find(matchesCategory) || null;

    setSelectedStoreId(nextStore?.id || '');
    setProductType((currentType) =>
      nextStore?.subcategories?.includes(currentType)
        ? currentType
        : nextStore?.subcategories?.[0] || ''
    );
  };

  // ── Handler: Add New Custom Type to Selected Store ──────────────────────────
  const handleAddCustomTypeToStore = async (newType: string) => {
    if (!newType.trim()) return;
    const clean = newType.trim();
    setProductType(clean);

    if (selectedStore) {
      const existing = selectedStore.subcategories || [];
      if (!existing.includes(clean)) {
        const updated = [...existing, clean];
        try {
          await updateStore(selectedStore.id, { subcategories: updated });
        } catch (e) {
          console.warn('Could not persist new type to store:', e);
        }
      }
    }
  };

  // ── Handler: Save Product ───────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المنتج');
      return;
    }
    if (sellNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر بيع صحيح للمنتج');
      return;
    }
    if (costNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر الشراء التقديري من المتجر');
      return;
    }
    if (!selectedStore) {
      Alert.alert('تنبيه', 'يرجى اختيار المتجر التابع له المنتج');
      return;
    }

    const storeObj = selectedStore;
    const catObj = currentCategory || categories[0];

    const finalImages = images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80'];

    const productPayload = {
      name: productName.trim(),
      description: (productDesc || '').trim(),
      sku: '',
      barcode: '',
      storeId: storeObj.id,
      storeName: storeObj.name,
      categoryId: catObj?.id || 'cat-general',
      categoryName: catObj?.name || 'عام',
      subcategoryName: productType || '',
      subcategoryId: '',
      sourceType: 'EXTERNAL_STORE' as const, // دائماً متجر خارجي
      expectedPurchasePrice: costNum,
      sellingPrice: sellNum,
      availableQuantity: 999, // متوفر دائماً للطلب من المتجر
      reservedQuantity: 0,
      minStockAlert: 0,
      isActive: isActiveForOrder,
      imageUrl: finalImages[0],
      images: finalImages,
    };

    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
        Alert.alert('تم التعديل بنجاح ✓', `تم حفظ تحديثات المنتج "${productName.trim()}"`);
      } else {
        await addProduct(productPayload);
        Alert.alert('تمت الإضافة بنجاح ✓', `تم إدراج منتج "${productName.trim()}" في الكتالوج`);
      }
      setEditingProduct(null);
      navigateTo('inventory');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ بيانات المنتج، يرجى المحاولة ثانية');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ── Calculate Bottom Bar Spacing to guarantee ZERO overlap with navbar ─────
  const bottomBarPadding = Math.max(insets.bottom, 8);
  const navBarHeight = 68 + bottomBarPadding;
  const floatingActionBarBottom = navBarHeight + 8; // 8px cleanly above the bottom navbar
  const scrollPaddingBottom = floatingActionBarBottom + 90;

  return (
    <View style={styles.container}>
      {/* Header */}
      <AdminHeader
        title={editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
        showBack
        onBack={() => {
          setEditingProduct(null);
          navigateTo('inventory');
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
      >
        {/* ══════════════════════════════════════════════════════════════════════════
            القسم الأول: المتجر والنوع (ListBox لكل منهما، والنوع مرتبط بالمتجر)
        ══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionIconBox}>
                <Text style={styles.sectionEmoji}>🏪</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>1. المتجر والنوع التابع له</Text>
                <Text style={styles.sectionSubDesc}>اختر المتجر أولاً لتحديد الأنواع المسجلة داخله</Text>
              </View>
            </View>
            <View style={styles.badgeRequired}>
              <Text style={styles.badgeRequiredText}>إلزامي</Text>
            </View>
          </View>

          {/* 1.1 ListBox: فلترة المتاجر حسب الفئة */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>فلترة المتاجر حسب الفئة</Text>
            <TouchableOpacity
              style={styles.listBoxTrigger}
              activeOpacity={0.8}
              onPress={() => setShowCategoryListBox(true)}
            >
              <View style={styles.listBoxTriggerRight}>
                <View style={[styles.listBoxIconWrap, { backgroundColor: colors.secondaryContainer }]}>
                  <Text style={styles.listBoxEmoji}>🗂️</Text>
                </View>
                <View style={styles.listBoxTriggerTexts}>
                  <Text style={styles.listBoxValueText}>{selectedCategoryLabel}</Text>
                  <Text style={styles.listBoxHintText} numberOfLines={1}>
                    {selectedCategoryId
                      ? `${filteredStores.length} متجر ضمن الفئة`
                      : `${stores.length} متجر في جميع الفئات`}
                  </Text>
                </View>
              </View>
              <View style={styles.listBoxArrowPill}>
                <Text style={styles.listBoxArrowText}>اختر ▼</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 1.2 ListBox: تحديد المتجر */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              المتجر التابع له المنتج <Text style={styles.star}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.listBoxTrigger}
              activeOpacity={0.8}
              onPress={() => setShowStoreListBox(true)}
            >
              <View style={styles.listBoxTriggerRight}>
                <View style={styles.listBoxIconWrap}>
                  <Text style={styles.listBoxEmoji}>🏪</Text>
                </View>
                <View style={styles.listBoxTriggerTexts}>
                  <Text style={styles.listBoxValueText}>
                    {selectedStore?.name || 'اضغط لاختيار المتجر...'}
                  </Text>
                  <Text style={styles.listBoxHintText} numberOfLines={1}>
                    {selectedStore?.address
                      ? `📍 ${selectedStore.address}`
                      : `${storeAvailableTypes.length} أنواع منتجات مسجلة`}
                  </Text>
                </View>
              </View>
              <View style={styles.listBoxArrowPill}>
                <Text style={styles.listBoxArrowText}>تغيير ▼</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 1.3 ListBox: نوع المنتج الموجود في المتجر المختار */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRowBetween}>
              <Text style={styles.fieldLabel}>
                نوع المنتج في المتجر <Text style={styles.star}>*</Text>
              </Text>
              {selectedStore ? (
                <Text style={styles.storeNameTag}>خاص بـ {selectedStore.name}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.listBoxTrigger,
                !selectedStore && styles.listBoxTriggerDisabled,
                !productType && styles.listBoxTriggerWarning,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (!selectedStore) {
                  Alert.alert('تنبيه', 'يرجى اختيار المتجر أولاً');
                  return;
                }
                setShowTypeListBox(true);
              }}
            >
              <View style={styles.listBoxTriggerRight}>
                <View style={[styles.listBoxIconWrap, { backgroundColor: colors.primaryFixedDim + '30' }]}>
                  <Text style={styles.listBoxEmoji}>🏷️</Text>
                </View>
                <View style={styles.listBoxTriggerTexts}>
                  <Text style={[styles.listBoxValueText, !productType && { color: colors.outline }]}>
                    {productType || 'اضغط لتحديد نوع المنتج في هذا المتجر...'}
                  </Text>
                  <Text style={styles.listBoxHintText} numberOfLines={1}>
                    {storeAvailableTypes.length > 0
                      ? `متوفر ${storeAvailableTypes.length} أنواع في المتجر (انقر للاختيار أو إضافة نوع)`
                      : 'لا توجد أنواع بعد، انقر لإضافة نوع لهذا المتجر'}
                  </Text>
                </View>
              </View>
              <View style={styles.listBoxArrowPill}>
                <Text style={styles.listBoxArrowText}>اختر ▼</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════════
            القسم الثاني: بقية بيانات المنتج (الاسم، الصور، الوصف)
        ══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={[styles.sectionIconBox, { backgroundColor: colors.secondary + '18' }]}>
                <Text style={styles.sectionEmoji}>📦</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>2. بيانات وهوية المنتج</Text>
                <Text style={styles.sectionSubDesc}>اسم الصنف، صوره، ووصفه التفصيلي</Text>
              </View>
            </View>
          </View>

          {/* اسم المنتج */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              اسم المنتج في التطبيق <Text style={styles.star}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="اكتب اسم المنتج بدقة (مثال: قميص رجالي رسمي كحلي)..."
              placeholderTextColor={colors.outline}
              value={productName}
              onChangeText={setProductName}
              textAlign="right"
            />
          </View>

          {/* معرض الصور */}
          <View style={styles.fieldGroup}>
            <View style={styles.galleryHeader}>
              <Text style={styles.fieldLabel}>معرض صور المنتج (حتى 3 صور)</Text>
              <Text style={styles.galleryHint}>الصورة الأولى هي الصورة الرئيسية للواجهة</Text>
            </View>

            <View style={styles.galleryGrid}>
              {images.map((imgUri, index) => (
                <View key={index} style={styles.imageSlot}>
                  <Image source={{ uri: imgUri }} style={styles.slotImg} />
                  {index === 0 && (
                    <View style={styles.primaryImgBadge}>
                      <Text style={styles.primaryImgBadgeText}>★ رئيسية</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deleteImgBtn}
                    onPress={() => setImages(images.filter((_, i) => i !== index))}
                  >
                    <Text style={styles.deleteImgText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 3 && (
                <TouchableOpacity
                  style={styles.addPhotoSlot}
                  onPress={() => setShowImagePickerModal(true)}
                >
                  <View style={styles.addPhotoIconCircle}>
                    <Text style={styles.addPhotoPlus}>＋</Text>
                  </View>
                  <Text style={styles.addPhotoText}>إضافة صورة</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* وصف المنتج */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>الوصف والمواصفات (اختياري)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="اكتب تفاصيل الخامة، المقاسات المتوفرة، طريقة الاستخدام..."
              placeholderTextColor={colors.outline}
              value={productDesc}
              onChangeText={setProductDesc}
              multiline
              numberOfLines={3}
              textAlign="right"
            />
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════════
            القسم الثالث: التسعير وهوامش الأرباح التلقائية
        ══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={[styles.sectionIconBox, { backgroundColor: colors.tertiary + '18' }]}>
                <Text style={styles.sectionEmoji}>💰</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>3. التسعير وهوامش الربح</Text>
                <Text style={styles.sectionSubDesc}>حساب صافي أرباح المنصة آلياً</Text>
              </View>
            </View>
            <Text style={{ fontSize: 18 }}>🧮</Text>
          </View>

          <View style={styles.twoColsRow}>
            {/* سعر الشراء من المتجر */}
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>
                سعر الشراء من المتجر <Text style={styles.star}>*</Text>
              </Text>
              <View style={styles.priceInputWrap}>
                <Text style={styles.currencyBadge}>ر.ي</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  value={purchaseCost}
                  onChangeText={setPurchaseCost}
                  textAlign="left"
                />
              </View>
              <Text style={styles.fieldHintSmall}>التكلفة المدفوعة للمتجر بالفاتورة</Text>
            </View>

            {/* سعر البيع للعميل */}
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>
                سعر البيع للعميل <Text style={styles.star}>*</Text>
              </Text>
              <View style={styles.priceInputWrap}>
                <Text style={styles.currencyBadge}>ر.ي</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  textAlign="left"
                />
              </View>
              <Text style={styles.fieldHintSmall}>السعر النهائي الظاهر في التطبيق</Text>
            </View>
          </View>

          {/* حاسبة هامش الربح الآلية */}
          <View style={[styles.marginCard, profitMargin < 0 && styles.marginCardNegative]}>
            <View style={styles.marginRow}>
              <View style={styles.marginCol}>
                <Text style={styles.marginLabel}>صافي ربح الوساطة</Text>
                <Text style={[styles.marginValue, profitMargin < 0 && styles.marginValueNegative]}>
                  {profitMargin > 0 ? `+${profitMargin} ر.ي` : `${profitMargin} ر.ي`}
                </Text>
              </View>
              <View style={styles.marginDivider} />
              <View style={styles.marginCol}>
                <Text style={styles.marginLabel}>نسبة هامش الربح</Text>
                <Text style={[styles.marginPercent, profitMargin < 0 && styles.marginValueNegative]}>
                  {marginPercent}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════════
            القسم الرابع: حالة ظهور المنتج في التطبيق
        ══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={[styles.sectionIconBox, { backgroundColor: colors.primaryFixedDim + '40' }]}>
                <Text style={styles.sectionEmoji}>👁️</Text>
              </View>
              <View>
                <Text style={styles.sectionTitle}>4. حالة ظهور المنتج في التطبيق</Text>
                <Text style={styles.sectionSubDesc}>تحديد ما إذا كان الصنف متاحاً ومعروضاً للعملاء حالياً</Text>
              </View>
            </View>
          </View>

          {/* مفتاح تفعيل الظهور للطلب */}
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>تفعيل ظهور المنتج للطلب في التطبيق</Text>
              <Text style={styles.switchSub}>
                {isActiveForOrder
                  ? '✓ المنتج ظاهر ومعروض للعملاء في التطبيق ومحرك البحث ويمكنهم طلبه فوراً'
                  : '✕ المنتج مخفي وموقوف مؤقتاً ولن يظهر للعملاء في واجهة المتجر أو البحث'}
              </Text>
            </View>
            <Switch
              value={isActiveForOrder}
              onValueChange={setIsActiveForOrder}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
              thumbColor={colors.surfaceContainerLowest}
            />
          </View>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════════
          زر تأكيد الإضافة (تم إصلاح الموقع ليكون أعلى شريط التنقل تماماً بدون تداخل)
      ══════════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.floatingActionBar, { bottom: floatingActionBarBottom }]}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setEditingProduct(null);
            navigateTo('inventory');
          }}
        >
          <Text style={styles.cancelBtnText}>إلغاء</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveSubmitBtn, isSavingProduct && { opacity: 0.7 }]}
          activeOpacity={0.88}
          onPress={handleSaveProduct}
          disabled={isSavingProduct}
        >
          {isSavingProduct ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.saveSubmitText}>جاري حفظ ومعالجة المنتج...</Text>
            </View>
          ) : (
            <>
              <View style={styles.saveSubmitLeft}>
                <Text style={styles.saveSubmitIcon}>💾</Text>
                <Text style={styles.saveSubmitText}>
                  {editingProduct ? 'حفظ تعديلات المنتج' : 'تأكيد إضافة المنتج للكتالوج'}
                </Text>
              </View>
              <View style={styles.savePricePill}>
                <Text style={styles.savePriceText}>{sellNum > 0 ? `${sellNum} ر.ي` : 'مجاناً'}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Modals: ListBoxes ─────────────────────────────────────────────────── */}

      {/* 1. Category filter ListBox Modal */}
      <ListBoxModal
        visible={showCategoryListBox}
        title="اختر فئة المتاجر"
        subtitle="سيتم عرض المتاجر المرتبطة بالفئة التي تختارها"
        options={categoryOptions}
        selectedId={selectedCategoryId}
        onSelect={handleSelectCategory}
        onClose={() => setShowCategoryListBox(false)}
        emptyText="لا توجد فئات مسجلة"
      />

      {/* 2. Store ListBox Modal */}
      <ListBoxModal
        visible={showStoreListBox}
        title="اختر المتجر التابع له المنتج"
        subtitle={selectedCategoryId ? `المتاجر التابعة لفئة ${selectedCategoryLabel}` : 'المنتجات تنتمي دائماً للمتاجر المسجلة في المنصة'}
        options={storeOptions}
        selectedId={selectedStoreId}
        onSelect={handleSelectStore}
        onClose={() => setShowStoreListBox(false)}
        emptyText={selectedCategoryId ? 'لا توجد متاجر مرتبطة بهذه الفئة' : 'لا توجد متاجر مسجلة بعد'}
      />

      {/* 2. Product Type in Store ListBox Modal */}
      <ListBoxModal
        visible={showTypeListBox}
        title={`أنواع المنتجات في متجر ${selectedStore?.name || ''}`}
        subtitle="اختر نوع المنتج المسجل في هذا المتجر أو أضف نوعاً جديداً له"
        options={storeTypeOptions}
        selectedId={productType}
        onSelect={setProductType}
        onClose={() => setShowTypeListBox(false)}
        allowCustom
        customPlaceholder="مثال: ملابس رجالية، أحذية رياضية..."
        onAddCustom={handleAddCustomTypeToStore}
        emptyText="لا توجد أنواع منتجات مسجلة في هذا المتجر بعد، اكتب نوعاً جديداً أدناه"
      />


      {/* 4. Quick Image Picker Modal */}
      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelected={(url) => setImages([...images, url])}
        title="إضافة صورة للمنتج"
        folder="products"
        presetSamples={[
          { label: 'ملابس', url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80' },
          { label: 'قميص', url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&q=80' },
          { label: 'حذاء', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80' },
          { label: 'عطور', url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80' },
          { label: 'إلكترونيات', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80' },
          { label: 'وجبات', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80' },
        ]}
      />
    </View>
  );
};

// ── Styles: Main Screen ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.baseSm,
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseMd,
    paddingBottom: spacing.baseSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '20',
  },
  sectionTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryFixedDim + '35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEmoji: {
    fontSize: 18,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
  },
  sectionSubDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 1,
  },
  badgeRequired: {
    backgroundColor: colors.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeRequiredText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.error,
  },

  // Field Groups
  fieldGroup: {
    marginBottom: spacing.baseSm,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  star: {
    color: colors.error,
  },
  labelRowBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeNameTag: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primaryFixedDim + '25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },

  // ListBox Trigger Buttons
  listBoxTrigger: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  listBoxTriggerDisabled: {
    opacity: 0.5,
  },
  listBoxTriggerWarning: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primaryFixedDim + '10',
  },
  listBoxTriggerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  listBoxIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBoxEmoji: {
    fontSize: 18,
  },
  listBoxTriggerTexts: {
    flex: 1,
    alignItems: 'flex-end',
  },
  listBoxValueText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
  },
  listBoxHintText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  listBoxArrowPill: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    marginLeft: 6,
  },
  listBoxArrowText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },

  // Inputs
  textInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  codeFont: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },

  // Image Gallery
  galleryHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  galleryHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  galleryGrid: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  imageSlot: {
    width: 85,
    height: 85,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  slotImg: {
    width: '100%',
    height: '100%',
  },
  primaryImgBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  primaryImgBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 9,
    color: '#FFF',
  },
  deleteImgBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteImgText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
  },
  addPhotoSlot: {
    width: 85,
    height: 85,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixedDim + '15',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: -2,
  },
  addPhotoText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
  },

  // Two columns row
  twoColsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: spacing.baseSm,
  },
  col: {
    flex: 1,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    overflow: 'hidden',
  },
  currencyBadge: {
    paddingHorizontal: 10,
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 10,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.onSurface,
  },
  fieldHintSmall: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },

  // Margin Card
  marginCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.lg,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  marginCardNegative: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  marginRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  marginCol: {
    flex: 1,
    alignItems: 'center',
  },
  marginDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#86EFAC',
  },
  marginLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  marginValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: '#16A34A',
  },
  marginPercent: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: '#16A34A',
  },
  marginValueNegative: {
    color: colors.error,
  },

  // Switch Row
  switchRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginTop: 8,
  },
  switchInfo: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 10,
  },
  switchTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurface,
  },
  switchSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  // Sample Image Picker items
  sampleImgBtn: {
    marginRight: 10,
    alignItems: 'center',
  },
  sampleImgPreview: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sampleImgText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurface,
    marginTop: 3,
  },

  // ── Floating Action Bar (Guaranteed Positioned ABOVE the navbar) ─────────────
  floatingActionBar: {
    position: 'absolute',
    left: spacing.screenGutter,
    right: spacing.screenGutter,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    padding: 10,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.floating,
    zIndex: 90, // higher than navbar
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  saveSubmitBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  saveSubmitLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  saveSubmitIcon: {
    fontSize: 16,
  },
  saveSubmitText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  savePricePill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  savePriceText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onPrimary,
  },
});

// ── Styles: ListBox Sheet Modal ───────────────────────────────────────────────
const lbStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '82%',
    ...shadows.floating,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.onSurface,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },

  // Search
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 10,
    marginBottom: 10,
    height: 38,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  searchIcon: {
    fontSize: 13,
    marginLeft: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurface,
    height: 38,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.outline,
    paddingHorizontal: 4,
  },

  // List
  list: {
    maxHeight: 280,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.outline,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '25',
  },
  optionCardActive: {
    backgroundColor: colors.primaryFixedDim + '25',
    borderColor: colors.primary + '60',
  },
  optionRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionTexts: {
    flex: 1,
    alignItems: 'flex-end',
  },
  optionLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
  },
  optionLabelActive: {
    color: colors.primary,
  },
  optionSubLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Custom Add
  customAddSection: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '30',
    paddingTop: 10,
    marginTop: 6,
  },
  customAddLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  customInputRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
  },
  customTextInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  customAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  customAddBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  customAddBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onPrimary,
  },

  // Close
  closeBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
  },
});
