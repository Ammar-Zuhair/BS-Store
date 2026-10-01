import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { useAdmin } from '../context/AdminContext';
import { AdminCategory, AdminSubCategory } from '../types';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';

export const CategoriesScreen: React.FC = () => {
  const {
    navigateTo,
    setInventoryTabRequest,
    categories,
    addCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    stores,
    addStore,
    updateStore,
    toggleStoreStatus,
    deleteStore,
    flashDeals,
    addFlashDeal,
    toggleFlashDealStatus,
    deleteFlashDeal,
    products,
    toggleProductTopPick,
  } = useAdmin();

  // Active section tab
  const [activeSection, setActiveSection] = useState<'categories' | 'stores' | 'deals'>('categories');

  // Store Management Form State
  const [showNewStorePanel, setShowNewStorePanel] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState('');
  const [storeCategoryInput, setStoreCategoryInput] = useState(categories[0]?.id || '');
  const [storeSubcatsInput, setStoreSubcatsInput] = useState('');
  const [storeAddressInput, setStoreAddressInput] = useState('');
  const [storePhoneInput, setStorePhoneInput] = useState('');
  const [storeFeeInput, setStoreFeeInput] = useState('');
  const [storeLatInput, setStoreLatInput] = useState('');
  const [storeLngInput, setStoreLngInput] = useState('');
  const [storeImageUrl, setStoreImageUrl] = useState('');
  const [showStoreImagePicker, setShowStoreImagePicker] = useState(false);
  const [showStoreMapPicker, setShowStoreMapPicker] = useState(false);
  const [isStoreLocationPicked, setIsStoreLocationPicked] = useState(false);

  const handleStoreLocationPicked = (loc: LocationResult) => {
    setStoreLatInput(loc.latitude.toFixed(6));
    setStoreLngInput(loc.longitude.toFixed(6));
    if (loc.district) {
      setStoreAddressInput(loc.district);
    }
    setIsStoreLocationPicked(true);
  };

  // Flash Deals & Coupons Form State
  const [showNewDealPanel, setShowNewDealPanel] = useState(false);
  const [dealTitleInput, setDealTitleInput] = useState('');
  const [dealStoreNameInput, setDealStoreNameInput] = useState(stores[0]?.name || '');
  const [dealOrigPriceInput, setDealOrigPriceInput] = useState('');
  const [dealDiscPriceInput, setDealDiscPriceInput] = useState('');
  const [dealHoursInput, setDealHoursInput] = useState('24');
  const [dealTypeInput, setDealTypeInput] = useState<'DELIVERY_DISCOUNT' | 'PRODUCT_DISCOUNT'>('PRODUCT_DISCOUNT');
  const [dealCouponCodeInput, setDealCouponCodeInput] = useState('');
  const [dealIsPublicInput, setDealIsPublicInput] = useState(true);

  // Expansion state for accordion (set of category IDs that are expanded)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive' | 'top'>('all');

  // Collapsible New Category Form state
  const [showNewCatPanel, setShowNewCatPanel] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catOrderInput, setCatOrderInput] = useState('');
  const [catStatusInput, setCatStatusInput] = useState<'active' | 'inactive'>('active');
  const [catIconInput, setCatIconInput] = useState('');

  // Inline Quick Add Subcategory state (keyed by categoryId)
  const [activeSubFormCatId, setActiveSubFormCatId] = useState<string | null>(null);
  const [subNameInput, setSubNameInput] = useState('');
  const [subIconInput, setSubIconInput] = useState('subdirectory_arrow_left');

  // Edit subcategory modal state
  const [editingSub, setEditingSub] = useState<{
    catId: string;
    sub: AdminSubCategory;
  } | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // Edit main category modal state
  const [editingMainCat, setEditingMainCat] = useState<AdminCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatOrder, setEditCatOrder] = useState('');

  // Loading states for actions
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [isUpdatingCat, setIsUpdatingCat] = useState(false);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);

  const handleSaveStore = async () => {
    if (!storeNameInput.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة اسم المتجر');
      return;
    }
    if (!storeAddressInput.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال عنوان المتجر');
      return;
    }
    if (!storePhoneInput.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم هاتف المتجر');
      return;
    }
    if (!storeLatInput.trim() || !storeLngInput.trim()) {
      Alert.alert('تنبيه', 'يرجى تحديد موقع المتجر على الخريطة');
      return;
    }
    const catObj = categories.find((c) => c.id === storeCategoryInput) || categories[0];
    const subcats = storeSubcatsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const lat = parseFloat(storeLatInput);
    const lng = parseFloat(storeLngInput);

    setIsSavingStore(true);
    try {
      await addStore({
        name: storeNameInput.trim(),
        categoryId: storeCategoryInput,
        categoryName: catObj ? catObj.name : 'عام',
        subcategories: subcats.length > 0 ? subcats : ['عام'],
        phone: storePhoneInput.trim(),
        address: storeAddressInput.trim(),
        imageUrl: storeImageUrl.trim() || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        deliveryTime: '30-45 دقيقة',
        deliveryFee: parseInt(storeFeeInput, 10) || 400,
        isOpen: true,
        isActive: true,
        latitude: lat,
        longitude: lng,
      });

      setStoreNameInput('');
      setStoreImageUrl('');
      setStoreSubcatsInput('');
      setStoreAddressInput('');
      setStorePhoneInput('');
      setStoreFeeInput('');
      setStoreLatInput('');
      setStoreLngInput('');
      setIsStoreLocationPicked(false);
      setShowNewStorePanel(false);
      Alert.alert('تم بنجاح', 'تمت إضافة المتجر وأقسامه المخصصة بنجاح');
    } catch {
      Alert.alert('خطأ', 'تعذر إضافة المتجر، يرجى المحاولة ثانية');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleSaveDeal = async () => {
    if (!dealTitleInput.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة عنوان العرض');
      return;
    }
    const pct = Number(dealDiscPriceInput);
    if (!dealCouponCodeInput.trim()) { Alert.alert('تنبيه', 'يرجى إدخال كود الخصم'); return; }
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) { Alert.alert('تنبيه', 'أدخل نسبة خصم من 1 إلى 100'); return; }
    if (flashDeals.some((deal) => deal.couponCode?.toUpperCase() === dealCouponCodeInput.trim().toUpperCase())) {
      Alert.alert('تنبيه', 'كود الخصم مستخدم بالفعل، اختر كوداً آخر'); return;
    }
    const hours = parseInt(dealHoursInput, 10) || 24;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    setIsSavingDeal(true);
    try {
      await addFlashDeal({
        title: dealTitleInput.trim(),
        storeName: 'منصة متجر بي اس',
        originalPrice: 0,
        discountPrice: 0,
        discountPercent: pct,
        remainingHours: hours,
        expiresAt,
        dealType: dealTypeInput,
        dealKind: dealTypeInput,
        discountKind: dealTypeInput,
        deliveryDiscountPercent: dealTypeInput === 'DELIVERY_DISCOUNT' ? pct : undefined,
        couponCode: dealCouponCodeInput.trim() ? dealCouponCodeInput.trim().toUpperCase() : undefined,
        isPublic: dealIsPublicInput,
        imageUrl: dealTypeInput === 'DELIVERY_DISCOUNT'
          ? 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=600&q=80'
          : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80',
        isActive: true,
      });

      setDealTitleInput('');
      setDealCouponCodeInput('');
      setShowNewDealPanel(false);
      Alert.alert(
        'تم بنجاح',
        dealIsPublicInput
          ? 'تم نشر وتثبيت العرض العام بنجاح'
          : 'تم حفظ الكود والعرض السري بنجاح، يمكنك مشاركته مع المستخدمين كجائزة.'
      );
    } catch {
      Alert.alert('خطأ', 'تعذر نشر العرض، يرجى المحاولة ثانية');
    } finally {
      setIsSavingDeal(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingMainCat || !editCatName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الفئة');
      return;
    }
    setIsUpdatingCat(true);
    try {
      await updateCategory(editingMainCat.id, {
        name: editCatName.trim(),
        displayOrder: parseInt(editCatOrder, 10) || editingMainCat.displayOrder,
      });
      setEditingMainCat(null);
      Alert.alert('تم بنجاح', 'تم حفظ تعديل الفئة بنجاح');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ تعديل الفئة');
    } finally {
      setIsUpdatingCat(false);
    }
  };

  const handleDeleteCategory = (cat: AdminCategory) => {
    Alert.alert(
      'تأكيد حذف الفئة',
      `هل تريد بالتأكيد حذف فئة "${cat.name}" وجميع أنواعها الفرعية (${cat.subcategories.length} أنواع)؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            setDeletingCatId(cat.id);
            try {
              await deleteCategory(cat.id);
              Alert.alert('تم الحذف', `تم حذف فئة "${cat.name}" بنجاح`);
            } catch {
              Alert.alert('خطأ', 'تعذر حذف الفئة');
            } finally {
              setDeletingCatId(null);
            }
          },
        },
      ]
    );
  };

  // Toggle accordion expansion
  const toggleAccordion = (catId: string) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Metrics calculation
  const totalCategories = categories.length;
  const totalSubcategories = categories.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0);
  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  // Handle saving new category
  const handleSaveCategory = async () => {
    if (!catNameInput.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الفئة الرئيسية');
      return;
    }
    if (!catIconInput || !catIconInput.trim()) {
      Alert.alert('تنبيه مطلوب', 'تسجيل أيقونة الفئة إلزامي! يرجى اختيار أيقونة أو إدخال رمز للفئة.');
      return;
    }

    setIsSavingCat(true);
    try {
      await addCategory({
        name: catNameInput.trim(),
        icon: catIconInput,
        displayOrder: parseInt(catOrderInput, 10) || categories.length + 1,
        isActive: catStatusInput === 'active',
      });

      setCatNameInput('');
      setCatOrderInput('5');
      setShowNewCatPanel(false);
      Alert.alert('نجاح', 'تمت إضافة الفئة الرئيسية وتثبيتها بنجاح');
    } catch (error: any) {
      Alert.alert('خطأ', error?.message || 'تعذر إضافة الفئة، يرجى المحاولة ثانية');
    } finally {
      setIsSavingCat(false);
    }
  };

  // Handle saving inline subcategory
  const handleSaveSubCategory = async (catId: string) => {
    if (!subNameInput.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة اسم النوع الفرعي');
      return;
    }

    setIsSavingSub(true);
    try {
      await addSubCategory(catId, {
        name: subNameInput.trim(),
        icon: subIconInput || 'subdirectory_arrow_left',
      });

      setSubNameInput('');
      setActiveSubFormCatId(null);
      Alert.alert('نجاح', 'تمت إضافة النوع الفرعي بنجاح');
    } catch {
      Alert.alert('خطأ', 'تعذر إضافة النوع الفرعي');
    } finally {
      setIsSavingSub(false);
    }
  };

  // Handle editing subcategory
  const handleUpdateSub = async () => {
    if (!editingSub || !editSubName.trim()) return;
    setIsUpdatingSub(true);
    try {
      await updateSubCategory(editingSub.catId, editingSub.sub.id, {
        name: editSubName.trim(),
      });
      setEditingSub(null);
      setEditSubName('');
      Alert.alert('تم بنجاح', 'تم حفظ تعديل النوع الفرعي');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ تعديل النوع الفرعي');
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // Filtered categories
  const filteredCategories = categories.filter((c) => {
    // Search query
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subcategories.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter pill
    if (selectedFilter === 'active') return c.isActive;
    if (selectedFilter === 'inactive') return !c.isActive;
    if (selectedFilter === 'top') return c.productCount > 300;
    return true;
  });

  return (
    <View style={styles.container}>
      <AdminHeader title="إدارة العمليات" showBack onBack={() => navigateTo('inventory')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Navigation Segmented Section Tabs */}
        <View style={styles.sectionTabsBar}>
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'categories' && styles.sectionTabActive]}
            onPress={() => setActiveSection('categories')}
            activeOpacity={0.8}
          >
            <Text style={[styles.sectionTabText, activeSection === 'categories' && styles.sectionTabTextActive]}>
              📁 الفئات والأنواع
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'stores' && styles.sectionTabActive]}
            onPress={() => setActiveSection('stores')}
            activeOpacity={0.8}
          >
            <Text style={[styles.sectionTabText, activeSection === 'stores' && styles.sectionTabTextActive]}>
              🏪 المتاجر والأقسام ({stores.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'deals' && styles.sectionTabActive]}
            onPress={() => setActiveSection('deals')}
            activeOpacity={0.8}
          >
            <Text style={[styles.sectionTabText, activeSection === 'deals' && styles.sectionTabTextActive]}>
              ⚡ عروض اليوم والمميزة
            </Text>
          </TouchableOpacity>
        </View>

        {activeSection === 'categories' && (
          <View>
            {/* Top Action & Navigation Sub-bar */}
            <View style={styles.topSubBar}>
              <View style={styles.titleInfo}>
                <Text style={styles.screenMainTitle}>إدارة الفئات والأنواع</Text>
              </View>

              <TouchableOpacity
                style={styles.newCatBtn}
                activeOpacity={0.8}
                onPress={() => setShowNewCatPanel((prev) => !prev)}
              >
                <Text style={styles.newCatBtnIcon}>＋</Text>
                <Text style={styles.newCatBtnText}>فئة جديدة</Text>
              </TouchableOpacity>
            </View>

        {/* Live Metrics Counter (3 Bento Cards) */}
        <View style={styles.metricsRow}>
          {/* Card 1: Total Categories */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.metricIcon, { color: colors.primary }]}>📁</Text>
            </View>
            <Text style={[styles.metricVal, { color: colors.primary }]}>{totalCategories}</Text>
            <Text style={styles.metricLabel}>إجمالي الفئات</Text>
          </View>

          {/* Card 2: Total Subcategories */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.secondary + '18' }]}>
              <Text style={[styles.metricIcon, { color: colors.secondary }]}>🌿</Text>
            </View>
            <Text style={[styles.metricVal, { color: colors.secondary }]}>{totalSubcategories}</Text>
            <Text style={styles.metricLabel}>الأنواع الفرعية</Text>
          </View>

          {/* Card 3: Total Products */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.metricIcon, { color: colors.onSurface }]}>📦</Text>
            </View>
            <Text style={[styles.metricVal, { color: colors.onSurface }]}>
              {totalProducts.toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>منتج مرتبط</Text>
          </View>
        </View>

        {/* Collapsible Fast Add Category Panel */}
        {showNewCatPanel && (
          <View style={styles.newCatCard}>
            <View style={styles.newCatCardHeader}>
              <View style={styles.newCatTitleWrap}>
                <Text style={styles.newCatIcon}>＋</Text>
                <Text style={styles.newCatTitle}>إضافة فئة رئيسية جديدة</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowNewCatPanel(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>اسم الفئة بالعربية</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: الهدايا والزهور..."
                placeholderTextColor={colors.outline}
                value={catNameInput}
                onChangeText={setCatNameInput}
                textAlign="right"
              />
            </View>

            <View style={styles.formRow2}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>ترتيب الظهور</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={catOrderInput}
                  onChangeText={setCatOrderInput}
                  textAlign="center"
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>الحالة الأولية</Text>
                <View style={styles.statusSelectRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      catStatusInput === 'active' && styles.statusOptionActive,
                    ]}
                    onPress={() => setCatStatusInput('active')}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        catStatusInput === 'active' && styles.statusOptionTextActive,
                      ]}
                    >
                      نشطة
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      catStatusInput === 'inactive' && styles.statusOptionActive,
                    ]}
                    onPress={() => setCatStatusInput('inactive')}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        catStatusInput === 'inactive' && styles.statusOptionTextActive,
                      ]}
                    >
                      مخفية
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Icon picker shortcuts */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.inputLabel}>أيقونة أو رمز الفئة * (مطلوب)</Text>
                {catIconInput ? (
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 16 }}>{catIconInput}</Text>
                    <Text style={{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.primary }}>الأيقونة المحددة</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: colors.error, fontFamily: typography.fontFamily.bold }}>إلزامية *</Text>
                )}
              </View>

              <TextInput
                style={[styles.textInput, !catIconInput && { borderColor: colors.error + '60' }]}
                placeholder="اختر من الأسفل أو أدخل رمز/إيموجي (مثل: 👗, 🍕, 🧴)..."
                placeholderTextColor={colors.outline}
                value={catIconInput}
                onChangeText={setCatIconInput}
                textAlign="right"
              />

              <View style={[styles.iconsRow, { flexWrap: 'wrap', gap: 8, marginTop: 6 }]}>
                {['👗', '📱', '🍔', '🛒', '🎁', '🍕', '☕', '👟', '🧴', '💊', '🚗', '📚', '🧁', '✨'].map(
                  (emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.iconChip,
                        catIconInput === emoji && styles.iconChipSelected,
                      ]}
                      onPress={() => setCatIconInput(emoji)}
                    >
                      <Text style={styles.iconChipEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.panelActionsRow}>
              <TouchableOpacity
                style={styles.cancelPanelBtn}
                onPress={() => setShowNewCatPanel(false)}
              >
                <Text style={styles.cancelPanelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savePanelBtn, isSavingCat && { opacity: 0.7 }]}
                onPress={handleSaveCategory}
                disabled={isSavingCat}
              >
                {isSavingCat ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.savePanelBtnText}>حفظ وتثبيت الفئة</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search and Filter Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="البحث عن فئة رئيسية أو نوع فرعي..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            <TouchableOpacity
              style={[styles.pillBtn, selectedFilter === 'all' && styles.pillBtnActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  selectedFilter === 'all' && styles.pillBtnTextActive,
                ]}
              >
                الكل ({totalCategories})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, selectedFilter === 'active' && styles.pillBtnActive]}
              onPress={() => setSelectedFilter('active')}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  selectedFilter === 'active' && styles.pillBtnTextActive,
                ]}
              >
                الفئات النشطة ({categories.filter((c) => c.isActive).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, selectedFilter === 'inactive' && styles.pillBtnActive]}
              onPress={() => setSelectedFilter('inactive')}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  selectedFilter === 'inactive' && styles.pillBtnTextActive,
                ]}
              >
                غير النشطة ({categories.filter((c) => !c.isActive).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, selectedFilter === 'top' && styles.pillBtnActive]}
              onPress={() => setSelectedFilter('top')}
            >
              <Text
                style={[
                  styles.pillBtnText,
                  selectedFilter === 'top' && styles.pillBtnTextActive,
                ]}
              >
                الأعلى مبيعاً
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Main Category Tree / Accordion List */}
        <View style={styles.treeList}>
          {filteredCategories.map((cat) => {
            const isExpanded = !!expandedCats[cat.id];
            const isAddingSub = activeSubFormCatId === cat.id;

            return (
              <View key={cat.id} style={styles.categoryCard}>
                {/* Category Header (Accordion Trigger) */}
                <TouchableOpacity
                  style={styles.catCardHeader}
                  activeOpacity={0.85}
                  onPress={() => toggleAccordion(cat.id)}
                >
                  <View style={styles.catLeftInfo}>
                    <View style={styles.catIconBox}>
                      <Text style={styles.catEmoji}>
                        {cat.name.includes('ملابس')
                          ? '👗'
                          : cat.name.includes('إلكترونيات')
                          ? '📱'
                          : cat.name.includes('مأكولات')
                          ? '🍔'
                          : '🛒'}
                      </Text>
                    </View>
                    <View style={styles.catTextCol}>
                      <View style={styles.catTitleRow}>
                        <Text style={styles.catTitle}>{cat.name}</Text>
                        <View
                          style={[
                            styles.catBadge,
                            cat.isActive ? styles.catBadgeActive : styles.catBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.catBadgeText,
                              cat.isActive
                                ? styles.catBadgeTextActive
                                : styles.catBadgeTextInactive,
                            ]}
                          >
                            {cat.isActive ? 'نشطة' : 'مخفية'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.catStatsText}>
                        {cat.subcategories.length} أنواع فرعية •{' '}
                        <Text style={styles.catProdBold}>{cat.productCount} منتج</Text> • الترتيب: #
                        {cat.displayOrder}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.catHeaderRight}>
                    <TouchableOpacity
                      style={styles.catActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setEditingMainCat(cat);
                        setEditCatName(cat.name);
                        setEditCatOrder(cat.displayOrder ? cat.displayOrder.toString() : '1');
                      }}
                    >
                      <Text style={styles.catActionIcon}>✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.catActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDeleteCategory(cat);
                      }}
                    >
                      <Text style={[styles.catActionIcon, { color: colors.error }]}>🗑️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        toggleCategoryStatus(cat.id);
                      }}
                    >
                      <Text style={styles.moreBtnText}>
                        {cat.isActive ? 'إخفاء' : 'تفعيل'}
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.chevronWrap,
                        isExpanded && styles.chevronWrapExpanded,
                      ]}
                    >
                      <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expanded Subcategories Container */}
                {isExpanded && (
                  <View style={styles.catCardBody}>
                    <View style={styles.subHeaderRow}>
                      <View style={styles.subHeaderLabelWrap}>
                        <Text style={styles.subHeaderArrow}>↳</Text>
                        <Text style={styles.subHeaderTitle}>الأنواع الفرعية المندرجة</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addSubBtn}
                        onPress={() =>
                          setActiveSubFormCatId((prev) => (prev === cat.id ? null : cat.id))
                        }
                      >
                        <Text style={styles.addSubBtnIcon}>＋</Text>
                        <Text style={styles.addSubBtnText}>إضافة نوع فرعي</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Inline Quick Add Form for this category */}
                    {isAddingSub && (
                      <View style={styles.inlineSubForm}>
                        <Text style={styles.inlineSubFormTitle}>
                          إضافة نوع فرعي لـ "{cat.name}"
                        </Text>
                        <TextInput
                          style={styles.inlineSubInput}
                          placeholder="اسم النوع الفرعي (مثال: فساتين وسهرات)..."
                          placeholderTextColor={colors.outline}
                          value={subNameInput}
                          onChangeText={setSubNameInput}
                          textAlign="right"
                        />
                        <View style={styles.inlineSubActions}>
                          <TouchableOpacity
                            style={styles.inlineSubCancelBtn}
                            onPress={() => {
                              setActiveSubFormCatId(null);
                              setSubNameInput('');
                            }}
                          >
                            <Text style={styles.inlineSubCancelText}>إلغاء</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.inlineSubSubmitBtn, isSavingSub && { opacity: 0.7 }]}
                            onPress={() => handleSaveSubCategory(cat.id)}
                            disabled={isSavingSub}
                          >
                            {isSavingSub ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.inlineSubSubmitText}>تأكيد الإضافة</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Subcategories List */}
                    <View style={styles.subList}>
                      {cat.subcategories.map((sub) => (
                        <View key={sub.id} style={styles.subItemRow}>
                          <View style={styles.subItemLeft}>
                            <View style={styles.subIconSquare}>
                              <Text style={styles.subItemEmoji}>
                                {sub.name.includes('رجالية')
                                  ? '👔'
                                  : sub.name.includes('نسائية')
                                  ? '👗'
                                  : sub.name.includes('أطفال')
                                  ? '👶'
                                  : sub.name.includes('أحذية')
                                  ? '👟'
                                  : sub.name.includes('هواتف')
                                  ? '📱'
                                  : sub.name.includes('شواحن')
                                  ? '🔌'
                                  : sub.name.includes('سماعات')
                                  ? '🎧'
                                  : sub.name.includes('سريعة')
                                  ? '🍗'
                                  : sub.name.includes('شعبية')
                                  ? '🍲'
                                  : sub.name.includes('حلويات')
                                  ? '🍰'
                                  : sub.name.includes('ألبان')
                                  ? '🥛'
                                  : sub.name.includes('معلبات')
                                  ? '🥫'
                                  : '🏷️'}
                              </Text>
                            </View>
                            <View style={styles.subItemTextWrap}>
                              <Text style={styles.subItemName}>{sub.name}</Text>
                              <Text style={styles.subItemProdCount}>
                                {sub.productCount} منتج مسجل
                              </Text>
                            </View>
                          </View>

                          <View style={styles.subItemRightActions}>
                            <View style={styles.subBadge}>
                              <Text style={styles.subBadgeText}>نشط</Text>
                            </View>

                            <TouchableOpacity
                              style={styles.subActionBtn}
                              onPress={() => {
                                setEditingSub({ catId: cat.id, sub });
                                setEditSubName(sub.name);
                              }}
                            >
                              <Text style={styles.subActionIcon}>✏️</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.subActionBtn}
                              onPress={() => {
                                Alert.alert(
                                  'تأكيد الحذف',
                                  `هل تريد بالتأكيد حذف "${sub.name}"؟`,
                                  [
                                    { text: 'إلغاء', style: 'cancel' },
                                    {
                                      text: 'حذف',
                                      style: 'destructive',
                                      onPress: () => deleteSubCategory(cat.id, sub.id),
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={[styles.subActionIcon, { color: colors.error }]}>
                                🗑️
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      {cat.subcategories.length === 0 && (
                        <View style={styles.emptySubsWrap}>
                          <Text style={styles.emptySubsText}>لا توجد أنواع فرعية مضافة بعد.</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    )}

    {/* ================= STORES SECTION ================= */}
    {activeSection === 'stores' && (
      <View>
        <View style={styles.topSubBar}>
          <View style={styles.titleInfo}>
            <Text style={styles.screenMainTitle}>إدارة المتاجر والأقسام التجارية</Text>
            <Text style={styles.screenSubTitle}>
              إضافة المحلات وربطها بالفئات وتحديد أقسامها (رجالية، نسائية، بدلات...)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newCatBtn}
            activeOpacity={0.8}
            onPress={() => setShowNewStorePanel((prev) => !prev)}
          >
            <Text style={styles.newCatBtnIcon}>＋</Text>
            <Text style={styles.newCatBtnText}>متجر جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Fast Add Store Panel */}
        {showNewStorePanel && (
          <View style={styles.newCatCard}>
            <View style={styles.newCatCardHeader}>
              <View style={styles.newCatTitleWrap}>
                <Text style={styles.newCatIcon}>🏪</Text>
                <Text style={styles.newCatTitle}>إضافة متجر جديد للأقسام</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowNewStorePanel(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>اسم المتجر</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: الخياط الملكي للأزياء والبدلات..."
                placeholderTextColor={colors.outline}
                value={storeNameInput}
                onChangeText={setStoreNameInput}
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>الفئة الرئيسية التابع لها</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catSelectChip,
                      storeCategoryInput === c.id && styles.catSelectChipActive,
                    ]}
                    onPress={() => setStoreCategoryInput(c.id)}
                  >
                    <Text
                      style={[
                        styles.catSelectChipText,
                        storeCategoryInput === c.id && styles.catSelectChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                أقسام وتصنيفات المتجر (افصل بفاصلة ,)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: رجالية, نسائية, أطفال, بدلات وأطقم..."
                placeholderTextColor={colors.outline}
                value={storeSubcatsInput}
                onChangeText={setStoreSubcatsInput}
                textAlign="right"
              />
              <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 11, color: colors.onSurfaceVariant, marginTop: 3, textAlign: 'right' }}>
                هذه الأقسام ستظهر للعميل عند فتح المتجر لفرز الأصناف والأطقم
              </Text>
            </View>

            <View style={styles.formRow2}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>رسوم التوصيل (ر.ي)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={storeFeeInput}
                  onChangeText={setStoreFeeInput}
                  textAlign="center"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>رقم الهاتف</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="phone-pad"
                  value={storePhoneInput}
                  onChangeText={setStorePhoneInput}
                  textAlign="center"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>العنوان والفرع</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: صنعاء - شارع حدة..."
                placeholderTextColor={colors.outline}
                value={storeAddressInput}
                onChangeText={setStoreAddressInput}
                textAlign="right"
              />
            </View>

            {/* Interactive Map Picker for Store Location */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>موقع المتجر على الخريطة (GPS)</Text>
                <Text style={{ fontSize: 11, color: colors.primary, fontFamily: typography.fontFamily.bold }}>
                  ضروري لاحتساب مسافة ورسوم التوصيل للعميل بدقة
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.mapPickerCard,
                  isStoreLocationPicked && styles.mapPickerCardSelected,
                ]}
                onPress={() => setShowStoreMapPicker(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.mapPickerIconContainer, isStoreLocationPicked && styles.mapPickerIconContainerSelected]}>
                  <Text style={styles.mapPickerPinIcon}>🏪</Text>
                </View>
                <View style={styles.mapPickerInfo}>
                  <Text style={styles.mapPickerTitle}>
                    {isStoreLocationPicked ? 'تم تحديد موقع المتجر بنجاح' : 'تحديد موقع المتجر على الخريطة'}
                  </Text>
                  <Text style={styles.mapPickerSubtitle}>
                    {isStoreLocationPicked
                      ? `${storeAddressInput} (${parseFloat(storeLatInput).toFixed(4)}, ${parseFloat(storeLngInput).toFixed(4)})`
                      : 'انقر لفتح الخريطة واختيار مقر المتجر بدقة أو عبر GPS'}
                  </Text>
                </View>
                <View style={[styles.mapPickerActionBadge, isStoreLocationPicked && styles.mapPickerActionBadgeSelected]}>
                  <Text style={[styles.mapPickerActionText, isStoreLocationPicked && styles.mapPickerActionTextSelected]}>
                    {isStoreLocationPicked ? 'تعديل ✎' : 'اختر على الخريطة 🗺️'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Store Image Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>صورة المتجر</Text>
              {storeImageUrl ? (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceContainerLow, padding: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outlineVariant + '40' }}>
                  <Image source={{ uri: storeImageUrl }} style={{ width: 60, height: 60, borderRadius: borderRadius.sm }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: colors.outline, textAlign: 'right' }}>{storeImageUrl}</Text>
                    <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity onPress={() => setShowStoreImagePicker(true)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primary + '15', borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.primary, fontFamily: typography.fontFamily.bold }}>تغيير الصورة</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setStoreImageUrl('')} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.error + '15', borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.error, fontFamily: typography.fontFamily.bold }}>حذف</Text>
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
                  }}
                  onPress={() => setShowStoreImagePicker(true)}
                >
                  <Text style={{ fontSize: 18 }}>📷</Text>
                  <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: 13, color: colors.primary }}>
                    اختيار صورة المتجر (من المعرض أو رابط)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.panelActionsRow}>
              <TouchableOpacity
                style={styles.cancelPanelBtn}
                onPress={() => { setShowNewStorePanel(false); setStoreImageUrl(''); }}
              >
                <Text style={styles.cancelPanelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savePanelBtn, isSavingStore && { opacity: 0.7 }]}
                onPress={handleSaveStore}
                disabled={isSavingStore}
              >
                {isSavingStore ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.savePanelBtnText}>حفظ وتثبيت المتجر</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stores List */}
        <View style={{ gap: 12, marginTop: 8 }}>
          {stores.map((st) => (
            <View key={st.id} style={styles.storeAdminCard}>
              <View style={styles.storeAdminTopRow}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[
                      styles.storeStatusBadge,
                      { backgroundColor: st.isOpen ? colors.success + '20' : colors.error + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.storeStatusText,
                        { color: st.isOpen ? colors.success : colors.error },
                      ]}
                    >
                      {st.isOpen ? 'مفتوح للطلبات' : 'مغلق مؤقتاً'}
                    </Text>
                  </View>
                  <View style={styles.storeCatTag}>
                    <Text style={styles.storeCatTagText}>{st.categoryName}</Text>
                  </View>
                </View>

                <Text style={styles.storeAdminName}>{st.name}</Text>
              </View>

              <Text style={styles.storeAdminMeta}>
                📍 {st.address} • 🗺️ خرائط: ({Number.isFinite(st.latitude) ? st.latitude!.toFixed(4) : 'غير محدد'}, {Number.isFinite(st.longitude) ? st.longitude!.toFixed(4) : 'غير محدد'}) • 📞 {st.phone}
              </Text>

              {/* Store Departments Badges */}
              <View style={styles.storeDeptsWrap}>
                <Text style={styles.storeDeptsLabel}>أقسام وتصنيفات المتجر:</Text>
                <View style={styles.storeDeptsRow}>
                  {st.subcategories.map((sc, i) => (
                    <View key={i} style={styles.deptBadge}>
                      <Text style={styles.deptBadgeText}>{sc}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.storeAdminActionsRow}>
                <TouchableOpacity
                  style={styles.storeDeleteBtn}
                  onPress={() => {
                    Alert.alert('تأكيد الحذف', `هل أنت متأكد من حذف متجر "${st.name}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', style: 'destructive', onPress: () => deleteStore(st.id) },
                    ]);
                  }}
                >
                  <Text style={styles.storeDeleteBtnText}>🗑️ حذف</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.storeToggleBtn, { backgroundColor: st.isOpen ? colors.surfaceContainerHigh : colors.primary }]}
                  onPress={() => toggleStoreStatus(st.id)}
                >
                  <Text
                    style={[
                      styles.storeToggleBtnText,
                      { color: st.isOpen ? colors.onSurface : colors.onPrimary },
                    ]}
                  >
                    {st.isOpen ? 'إغلاق المتجر' : 'فتح للطلبات'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    )}

    {/* ================= DEALS & TOP PICKS SECTION ================= */}
    {activeSection === 'deals' && (
      <View>
        {/* Deals Header */}
        <View style={styles.topSubBar}>
          <View style={styles.titleInfo}>
            <Text style={styles.screenMainTitle}>عروض اليوم والمميزة</Text>
            <Text style={styles.screenSubTitle}>
              إدارة العروض الترويجية وتحديد أفضل المنتجات للظهور في واجهة المتاجر
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newCatBtn}
            activeOpacity={0.8}
            onPress={() => { setInventoryTabRequest('deals'); navigateTo('inventory'); }}
          >
            <Text style={styles.newCatBtnIcon}>⚡</Text>
            <Text style={styles.newCatBtnText}>إدارة الباقات والتوصيل</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible New Flash Deal Panel */}
        {showNewDealPanel && (
          <View style={styles.newCatCard}>
            <View style={styles.newCatCardHeader}>
              <View style={styles.newCatTitleWrap}>
                <Text style={styles.newCatIcon}>⚡</Text>
                <Text style={styles.newCatTitle}>إضافة عرض أو كود خصم جديد</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowNewDealPanel(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 1. Deal Type Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>نوع العرض أو الخصم</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    dealTypeInput === 'DELIVERY_DISCOUNT' && styles.statusOptionActive,
                  ]}
                  onPress={() => setDealTypeInput('DELIVERY_DISCOUNT')}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      dealTypeInput === 'DELIVERY_DISCOUNT' && styles.statusOptionTextActive,
                    ]}
                  >
                    🚚 خصم توصيل
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    dealTypeInput === 'PRODUCT_DISCOUNT' && styles.statusOptionActive,
                  ]}
                  onPress={() => setDealTypeInput('PRODUCT_DISCOUNT')}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      dealTypeInput === 'PRODUCT_DISCOUNT' && styles.statusOptionTextActive,
                    ]}
                  >
                    🛍️ خصم من المنتجات
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Title */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>عنوان العرض</Text>
              <TextInput
                style={styles.textInput}
                placeholder={
                  dealTypeInput === 'DELIVERY_DISCOUNT'
                    ? 'مثال: توصيل مجاني لجميع الطلبات اليوم...'
                    : 'مثال: خصم 20% على البدلة الملكية 3 قطع...'
                }
                placeholderTextColor={colors.outline}
                value={dealTitleInput}
                onChangeText={setDealTitleInput}
                textAlign="right"
              />
            </View>

            {/* 3. Store Name (if not delivery) */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>نسبة الخصم من {dealTypeInput === 'DELIVERY_DISCOUNT' ? 'رسوم التوصيل' : 'قيمة المنتجات'} (%)</Text>
              <TextInput style={styles.textInput} placeholder="مثال: 20" keyboardType="numeric" value={dealDiscPriceInput} onChangeText={setDealDiscPriceInput} textAlign="center" />
            </View>

            {/* 5. Coupon Code */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>كود الخصم *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: BS20 أو GIFT50"
                placeholderTextColor={colors.outline}
                value={dealCouponCodeInput}
                onChangeText={setDealCouponCodeInput}
                autoCapitalize="characters"
                textAlign="center"
              />
            </View>

            {/* 6. Visibility (Public vs Hidden/Private Prize) */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>ظهور العرض والكود</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    dealIsPublicInput && styles.statusOptionActive,
                  ]}
                  onPress={() => setDealIsPublicInput(true)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      dealIsPublicInput && styles.statusOptionTextActive,
                    ]}
                  >
                    🌐 عام (يظهر للجميع في التطبيق)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    !dealIsPublicInput && styles.statusOptionActive,
                  ]}
                  onPress={() => setDealIsPublicInput(false)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      !dealIsPublicInput && styles.statusOptionTextActive,
                    ]}
                  >
                    🔒 مخفي (كود خاص للجوائز)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 7. Expiry Duration */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>مدة صلاحية العرض (بالساعات من الآن)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="24"
                value={dealHoursInput}
                onChangeText={setDealHoursInput}
                textAlign="center"
              />
              <Text style={{ fontSize: 11, color: colors.outline, textAlign: 'right', marginTop: 3 }}>
                يتم حفظ وقت الانتهاء المحدد دقيقاً في النظام وعرض العداد التنازلي الحقيقي للعملاء
              </Text>
            </View>

            <View style={styles.panelActionsRow}>
              <TouchableOpacity
                style={styles.cancelPanelBtn}
                onPress={() => setShowNewDealPanel(false)}
              >
                <Text style={styles.cancelPanelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savePanelBtn, isSavingDeal && { opacity: 0.7 }]}
                onPress={handleSaveDeal}
                disabled={isSavingDeal}
              >
                {isSavingDeal ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.savePanelBtnText}>حفظ وتفعيل العرض</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Flash Deals Cards List */}
        <View style={{ gap: 10, marginTop: 8 }}>
          {flashDeals.map((deal) => (
            <View key={deal.id} style={styles.dealAdminCard}>
              <View style={styles.dealAdminTopRow}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View style={styles.dealDiscountPill}>
                    <Text style={styles.dealDiscountPillText}>
                      {deal.dealType === 'DELIVERY_DISCOUNT' ? 'توصيل مجاني 🚚' : `خصم ${deal.discountPercent}%`}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: borderRadius.sm,
                      backgroundColor: deal.isPublic !== false ? colors.primary + '18' : colors.secondary + '18',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: typography.fontFamily.bold,
                        color: deal.isPublic !== false ? colors.primary : colors.secondary,
                      }}
                    >
                      {deal.isPublic !== false ? '🌐 عام ومعلن' : '🔒 كود خاص / مخفي'}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', flex: 1, paddingRight: 8 }}>
                  <Text style={styles.dealAdminTitle}>{deal.title}</Text>
                  <Text style={styles.dealAdminStore}>🏪 {deal.storeName}</Text>
                  {deal.couponCode && (
                    <Text style={{ fontSize: 11, color: colors.primary, fontFamily: typography.fontFamily.bold, marginTop: 2 }}>
                      🏷️ كود الخصم: {deal.couponCode}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.dealAdminPriceRow}>
                <Text style={styles.dealAdminHours}>⏱ وقت الانتهاء: متبقي {deal.remainingHours} ساعة</Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.dealAdminDiscPrice}>
                    {deal.discountPrice === 0 ? 'مجاناً' : `${deal.discountPrice.toLocaleString()} ر.ي`}
                  </Text>
                  {deal.originalPrice > deal.discountPrice && (
                    <Text style={styles.dealAdminOrigPrice}>
                      {deal.originalPrice.toLocaleString()} ر.ي
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.dealAdminActionsRow}>
                <TouchableOpacity
                  style={styles.storeDeleteBtn}
                  onPress={() => deleteFlashDeal(deal.id)}
                >
                  <Text style={styles.storeDeleteBtnText}>🗑️ حذف</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dealStatusToggleBtn,
                    { backgroundColor: deal.isActive ? colors.primary : colors.surfaceContainerHigh },
                  ]}
                  onPress={() => toggleFlashDealStatus(deal.id)}
                >
                  <Text
                    style={[
                      styles.dealStatusToggleText,
                      { color: deal.isActive ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    {deal.isActive ? '✓ نشط ومتاح' : 'موقوف'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Section: Select Top Picks for Category Screen */}
        <View style={styles.topPicksManageSection}>
          <View style={styles.topPicksHeader}>
            <Text style={styles.topPicksTitle}>
              ⭐ تعيين "أفضل المنتجات" لواجهة الأقسام
            </Text>
            <Text style={styles.topPicksSubtitle}>
              المنتجات المحددة بعلامة النجمة ستظهر للعميل في أعلى واجهة المتاجر
            </Text>
          </View>

          <View style={{ gap: 8, marginTop: 8 }}>
            {products.map((prod) => (
              <View key={prod.id} style={styles.topPickItemRow}>
                <TouchableOpacity
                  style={[
                    styles.topPickToggleBtn,
                    prod.isTopPick && styles.topPickToggleBtnActive,
                  ]}
                  onPress={() => toggleProductTopPick(prod.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.topPickToggleText,
                      prod.isTopPick && styles.topPickToggleTextActive,
                    ]}
                  >
                    {prod.isTopPick ? '⭐ معروض كأفضل منتج' : '＋ تعيين كأفضل المنتجات'}
                  </Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'flex-end', flex: 1, paddingRight: 8 }}>
                  <Text style={styles.topPickProdName}>{prod.name}</Text>
                  <Text style={styles.topPickProdMeta}>
                    {prod.storeName} • {prod.sellingPrice.toLocaleString()} ر.ي
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    )}
  </ScrollView>

      {/* Edit Subcategory Modal */}
      {editingSub && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>تعديل النوع الفرعي</Text>
              <TextInput
                style={styles.textInput}
                value={editSubName}
                onChangeText={setEditSubName}
                placeholder="اسم النوع الفرعي..."
                placeholderTextColor={colors.outline}
                textAlign="right"
              />
              <View style={styles.panelActionsRow}>
                <TouchableOpacity
                  style={styles.cancelPanelBtn}
                  onPress={() => setEditingSub(null)}
                >
                  <Text style={styles.cancelPanelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.savePanelBtn, isUpdatingSub && { opacity: 0.7 }]}
                  onPress={handleUpdateSub}
                  disabled={isUpdatingSub}
                >
                  {isUpdatingSub ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.savePanelBtnText}>حفظ التعديل</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Main Category Modal */}
      {editingMainCat && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>تعديل الفئة الرئيسية</Text>
              
              <Text style={styles.inputLabel}>اسم الفئة بالعربية:</Text>
              <TextInput
                style={styles.textInput}
                value={editCatName}
                onChangeText={setEditCatName}
                placeholder="اسم الفئة..."
                placeholderTextColor={colors.outline}
                textAlign="right"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>ترتيب الظهور:</Text>
              <TextInput
                style={styles.textInput}
                value={editCatOrder}
                onChangeText={setEditCatOrder}
                keyboardType="numeric"
                textAlign="center"
              />

              <View style={styles.panelActionsRow}>
                <TouchableOpacity
                  style={styles.cancelPanelBtn}
                  onPress={() => setEditingMainCat(null)}
                >
                  <Text style={styles.cancelPanelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.savePanelBtn, isUpdatingCat && { opacity: 0.7 }]}
                  onPress={handleUpdateCategory}
                  disabled={isUpdatingCat}
                >
                  {isUpdatingCat ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.savePanelBtnText}>حفظ التعديلات</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Interactive Store Location Picker Modal */}
      <LocationPickerModal
        visible={showStoreMapPicker}
        title="تحديد موقع المتجر على الخريطة (GPS)"
        initialLat={parseFloat(storeLatInput) || 15.35}
        initialLng={parseFloat(storeLngInput) || 44.20}
        onClose={() => setShowStoreMapPicker(false)}
        onConfirm={handleStoreLocationPicked}
      />

      <ImagePickerModal
        visible={showStoreImagePicker}
        onClose={() => setShowStoreImagePicker(false)}
        onImageSelected={(url) => setStoreImageUrl(url)}
        folder="stores"
        initialUrl={storeImageUrl}
        title="اختيار صورة المتجر"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.baseMd,
    paddingBottom: 120,
  },
  topSubBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  titleInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  screenMainTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  screenSubTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  newCatBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseMd,
    paddingVertical: 9,
    borderRadius: borderRadius.xl,
    gap: 6,
    ...shadows.button,
  },
  newCatBtnIcon: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
  newCatBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  metricsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
    marginBottom: spacing.baseMd,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricIcon: {
    fontSize: 16,
  },
  metricVal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  newCatCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.card,
  },
  newCatCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  newCatTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  newCatIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  newCatTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  formGroup: {
    marginBottom: spacing.baseSm,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
    textAlign: 'right',
  },
  textInput: {
    height: 44,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.baseSm,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
  },
  formRow2: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  formCol: {
    flex: 1,
  },
  statusSelectRow: {
    flexDirection: 'row-reverse',
    height: 44,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 3,
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
  },
  statusOptionText: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  statusOptionTextActive: {
    color: colors.onPrimary,
  },
  iconsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  iconChipEmoji: {
    fontSize: 20,
  },
  panelActionsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    marginTop: spacing.baseSm,
  },
  cancelPanelBtn: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPanelBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  savePanelBtn: {
    flex: 2,
    height: 42,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePanelBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  searchSection: {
    marginBottom: spacing.baseSm,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    height: 44,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    marginBottom: spacing.baseXs,
    ...shadows.card,
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  clearSearchIcon: {
    fontSize: 14,
    color: colors.outline,
    padding: 4,
  },
  filterPillsScroll: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 4,
  },
  pillBtn: {
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  pillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
  },
  pillBtnTextActive: {
    color: colors.onPrimary,
  },
  treeList: {
    gap: spacing.baseSm,
  },
  categoryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  catCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.baseMd,
    backgroundColor: colors.surfaceContainerLow + '60',
  },
  catLeftInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
    flex: 1,
  },
  catIconBox: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: {
    fontSize: 22,
  },
  catTextCol: {
    alignItems: 'flex-end',
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  catTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  catBadgeActive: {
    backgroundColor: colors.primaryFixed,
  },
  catBadgeInactive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  catBadgeTextActive: {
    color: colors.onPrimaryFixed,
  },
  catBadgeTextInactive: {
    color: colors.onSurfaceVariant,
  },
  catStatsText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 3,
    textAlign: 'right',
  },
  catProdBold: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  catHeaderRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  catActionBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  catActionIcon: {
    fontSize: 13,
  },
  moreBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  moreBtnText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapExpanded: {
    backgroundColor: colors.primary + '15',
  },
  chevronText: {
    fontSize: 12,
    color: colors.onSurface,
  },
  catCardBody: {
    padding: spacing.baseMd,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  subHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  subHeaderLabelWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  subHeaderArrow: {
    fontSize: 16,
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
  },
  subHeaderTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  addSubBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addSubBtnIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  addSubBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  inlineSubForm: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  inlineSubFormTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  inlineSubInput: {
    height: 38,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.baseSm,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    marginBottom: 6,
  },
  inlineSubActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'flex-end',
  },
  inlineSubCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  inlineSubCancelText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  inlineSubSubmitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  inlineSubSubmitText: {
    fontSize: 11,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  subList: {
    gap: 6,
  },
  subItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.baseSm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceContainerLow,
  },
  subItemLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
    flex: 1,
  },
  subIconSquare: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subItemEmoji: {
    fontSize: 16,
  },
  subItemTextWrap: {
    alignItems: 'flex-end',
  },
  subItemName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  subItemProdCount: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
    textAlign: 'right',
  },
  subItemRightActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  subBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primary + '15',
  },
  subBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  subActionBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subActionIcon: {
    fontSize: 12,
  },
  emptySubsWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptySubsText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.baseMd,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    padding: spacing.baseLg,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: spacing.baseSm,
  },
  sectionTabsBar: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: 4,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
    gap: 4,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionTabText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  sectionTabTextActive: {
    color: colors.onPrimary,
  },
  catSelectChip: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  catSelectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catSelectChipText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurface,
  },
  catSelectChipTextActive: {
    color: colors.onPrimary,
  },
  storeAdminCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  storeAdminTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeAdminName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  storeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  storeStatusText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  storeCatTag: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  storeCatTagText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  storeAdminMeta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 4,
  },
  storeDeptsWrap: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  storeDeptsLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 4,
  },
  storeDeptsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 4,
  },
  deptBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  deptBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  storeAdminActionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  storeDeleteBtn: {
    backgroundColor: colors.error + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  storeDeleteBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },
  storeToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  storeToggleBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  dealAdminCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  dealAdminTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealDiscountPill: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  dealDiscountPillText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSecondary,
    fontWeight: typography.fontWeight.bold,
  },
  dealAdminTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  dealAdminStore: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 1,
  },
  dealAdminPriceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dealAdminDiscPrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  dealAdminOrigPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  dealAdminHours: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  dealAdminActionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  dealStatusToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  dealStatusToggleText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  topPicksManageSection: {
    marginTop: spacing.baseMd,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  topPicksHeader: {
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '20',
    paddingBottom: 6,
    marginBottom: 6,
  },
  topPicksTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  topPicksSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  topPickItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: borderRadius.md,
  },
  topPickProdName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  topPickProdMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 1,
  },
  topPickToggleBtn: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  topPickToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  topPickToggleText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  topPickToggleTextActive: {
    color: colors.onPrimary,
  },
  mapPickerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.primary + '50',
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: 12,
    marginTop: 4,
  },
  mapPickerCardSelected: {
    borderColor: colors.primary,
    borderStyle: 'solid',
    backgroundColor: colors.primary + '0a',
  },
  mapPickerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerIconContainerSelected: {
    backgroundColor: colors.primary,
  },
  mapPickerPinIcon: {
    fontSize: 22,
  },
  mapPickerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mapPickerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    marginBottom: 2,
    textAlign: 'right',
  },
  mapPickerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
  mapPickerActionBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  mapPickerActionBadgeSelected: {
    backgroundColor: colors.primary,
  },
  mapPickerActionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  mapPickerActionTextSelected: {
    color: colors.onPrimary,
  },
});
