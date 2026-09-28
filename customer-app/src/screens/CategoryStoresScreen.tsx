import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Header } from '../components/Header';
import { StoreCard } from '../components/StoreCard';
import { mockCategories, mockStores, mockProducts } from '../mock';
import { useApp } from '../context/AppContext';
import { Product, Store } from '../types';
import { DealDetailsModal, DealItem } from '../components/DealDetailsModal';

export const CategoryStoresScreen: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    setSelectedStore,
    navigateTo,
    addToCart,
    categories,
    stores,
    products,
    deals,
    cart,
    updateQuantity,
    removeFromCart,
  } = useApp();

  const allCategories = categories.length > 0 ? categories : mockCategories;
  const allStores = stores.length > 0 ? stores : mockStores;
  const allProducts = products.length > 0 ? products : mockProducts;

  const [activeCat, setActiveCat] = useState<string>(
    selectedCategory && selectedCategory !== 'cat-all'
      ? selectedCategory
      : allCategories[0]?.id || 'cat-all'
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [dealModalVisible, setDealModalVisible] = useState(false);

  const currentCatObj =
    allCategories.find((c) => c.id === activeCat) || allCategories[0];

  // 1. Filter genuine deals belonging to this category or store
  const categoryDeals = useMemo(() => {
    return (deals || []).filter((d) => {
      if (d.isPublic === false) return false;
      if (activeCat === 'cat-all') return true;
      if (d.categoryId === activeCat) return true;
      // If deal belongs to a store that is in this category
      if (d.storeId) {
        const store = allStores.find((s) => s.id === d.storeId);
        if (store && (store.categoryId === activeCat || store.categoryIds?.includes(activeCat))) {
          return true;
        }
      }
      return false;
    });
  }, [deals, activeCat, allStores]);

  // 2. Filter stores: must belong to the active category, AND match dynamic search query
  const filteredCategoryStores = useMemo(() => {
    return allStores.filter((store) => {
      // Category match:
      const matchesCat =
        activeCat === 'cat-all' ||
        store.categoryId === activeCat ||
        (store.categoryIds && store.categoryIds.includes(activeCat));

      if (!matchesCat) return false;

      // Dynamic Live Search query match (fuzzy/case-insensitive substring)
      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const nameMatch = (store.name || '').toLowerCase().includes(q);
      const addressMatch = (store.address || '').toLowerCase().includes(q);
      const subcatsMatch =
        store.subcategories &&
        store.subcategories.some((sub) => (sub || '').toLowerCase().includes(q));
      const tagsMatch =
        store.tags &&
        store.tags.some((tag) => (tag || '').toLowerCase().includes(q));

      return nameMatch || addressMatch || subcatsMatch || tagsMatch;
    });
  }, [allStores, activeCat, searchQuery]);

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    navigateTo('store_detail');
  };

  const handleOpenDealModal = (deal: DealItem) => {
    setSelectedDeal(deal);
    setDealModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Header
        title={currentCatObj ? currentCatObj.name : 'المتاجر والمنتجات'}
        showBack
        onBack={() => navigateTo('home')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Switcher Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {allCategories.map((cat) => {
            const isSelected = cat.id === activeCat;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tab, isSelected && styles.tabActive]}
                onPress={() => {
                  setActiveCat(cat.id);
                  setSelectedCategory(cat.id);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.tabIcon}>{cat.icon}</Text>
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dynamic Real-Time Search Bar for Stores in this Category */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            {searchQuery.trim() ? (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
            <TextInput
              style={styles.searchInput}
              placeholder={`ابحث عن متجر في قسم ${currentCatObj?.name || ''} (مثال: ابو)...`}
              placeholderTextColor={colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
              returnKeyType="search"
            />
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
        </View>

        {/* 1. Category Offers (Genuine deals & bundles, never random products) */}
        {categoryDeals.length > 0 && !searchQuery.trim() && (
          <View style={styles.offersSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>تخفيضات وباقات</Text>
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.sectionTitle}>
                  عروض وباقات قسم {currentCatObj.name}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  عروض حصرية وأطقم متكاملة مختارة بعناية
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersScroll}
            >
              {categoryDeals.map((deal) => {
                const cartItem = cart.find((c) => c.product.id === deal.id);
                const qty = cartItem ? cartItem.quantity : 0;

                return (
                  <TouchableOpacity
                    key={deal.id}
                    style={styles.offerCard}
                    activeOpacity={0.9}
                    onPress={() => handleOpenDealModal(deal)}
                  >
                    <View style={styles.offerImageWrap}>
                      <Image source={{ uri: deal.imageUrl }} style={styles.offerImage} />
                      <View style={styles.bundleBadge}>
                        <Text style={styles.bundleBadgeText}>{deal.badge || 'عرض خاص'}</Text>
                      </View>
                    </View>

                    <View style={styles.offerContent}>
                      <Text style={styles.offerStoreName} numberOfLines={1}>
                        📍 {deal.storeName}
                      </Text>
                      <Text style={styles.offerTitle} numberOfLines={1}>
                        {deal.title}
                      </Text>
                      <Text style={styles.offerDesc} numberOfLines={2}>
                        {deal.description}
                      </Text>

                      <View style={styles.offerBottomRow}>
                        <View style={styles.priceColumn}>
                          <Text style={styles.offerPrice}>
                            {deal.offerPrice === 0 ? 'مجاناً' : `${deal.offerPrice.toLocaleString()} ر.ي`}
                          </Text>
                          {deal.originalPrice > deal.offerPrice && (
                            <Text style={styles.offerOriginalPrice}>
                              {deal.originalPrice.toLocaleString()} ر.ي
                            </Text>
                          )}
                        </View>

                        {qty > 0 ? (
                          <View style={styles.stepperWrap}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => updateQuantity(deal.id, qty + 1)}
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepQtyText}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => {
                                if (qty === 1) {
                                  removeFromCart(deal.id);
                                } else {
                                  updateQuantity(deal.id, qty - 1);
                                }
                              }}
                            >
                              <Text style={styles.stepBtnText}>-</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addBtn}
                            activeOpacity={0.85}
                            onPress={() => {
                              if (deal.products && deal.products.length > 0) {
                                handleOpenDealModal(deal);
                              } else {
                                addToCart(
                                  {
                                    id: deal.id,
                                    storeId: deal.storeId || 'store-1',
                                    storeName: deal.storeName,
                                    categoryId: deal.categoryId || activeCat,
                                    name: deal.title,
                                    description: deal.description,
                                    sellingPrice: deal.originalPrice,
                                    discountPrice: deal.offerPrice,
                                    imageUrl: deal.imageUrl,
                                    sourceType: 'IN_STOCK',
                                    inStock: true,
                                  },
                                  1
                                );
                              }
                            }}
                          >
                            <Text style={styles.addBtnText}>
                              {deal.products && deal.products.length > 0 ? 'عرض الباقة ➔' : '+ إضافة'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 2. Stores in this Category (Filtered Dynamically in Real-Time) */}
        <View style={styles.storesSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.storeCountBadge}>
              <Text style={styles.storeCountText}>
                {filteredCategoryStores.length} {filteredCategoryStores.length === 1 ? 'متجر' : 'متاجر'}
              </Text>
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim()
                  ? `نتائج البحث عن "${searchQuery.trim()}"`
                  : `متاجر قسم: ${currentCatObj.name}`}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {searchQuery.trim()
                  ? 'تمت مطابقة وفرز المتاجر حسب كلمة البحث'
                  : 'اختر متجراً لاستعراض أصنافه ومنتجاته'}
              </Text>
            </View>
          </View>

          {filteredCategoryStores.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? `لا توجد متاجر تطابق "${searchQuery.trim()}"`
                  : 'لا توجد متاجر مسجلة حالياً في هذا القسم'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim()
                  ? 'حاول تغيير كلمة البحث أو كتابة أحرف أقل'
                  : 'جرب اختيار فئة أخرى أو التواصل مع الإدارة'}
              </Text>
              {searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.resetSearchBtn}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.resetSearchText}>إلغاء البحث وإظهار كل المتاجر</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filteredCategoryStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onPress={() => handleSelectStore(store)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Bundle / Deal Breakdown Modal */}
      <DealDetailsModal
        visible={dealModalVisible}
        onClose={() => setDealModalVisible(false)}
        deal={selectedDeal}
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
    paddingBottom: 130,
  },
  tabsContainer: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    flexDirection: 'row-reverse',
    gap: 8,
  },
  tab: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.baseMd,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
    gap: 6,
    ...shadows.card,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.onPrimary,
    fontFamily: typography.fontFamily.bold,
  },
  searchSection: {
    paddingHorizontal: spacing.screenGutter,
    marginVertical: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '45',
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
    paddingVertical: 4,
  },
  searchIcon: {
    fontSize: 16,
    color: colors.outline,
    marginLeft: 8,
  },
  clearSearchBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  clearSearchText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  offersSection: {
    marginTop: spacing.baseSm,
    marginBottom: spacing.baseMd,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
    marginBottom: spacing.baseSm,
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    textAlign: 'right',
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  badgeWrap: {
    backgroundColor: colors.tertiaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.tertiary,
  },
  offersScroll: {
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    gap: 12,
  },
  offerCard: {
    width: 250,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
    ...shadows.card,
  },
  offerImageWrap: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  offerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bundleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  bundleBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onPrimary,
  },
  offerContent: {
    padding: spacing.baseSm,
  },
  offerStoreName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.secondary,
    textAlign: 'right',
  },
  offerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 2,
  },
  offerDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  offerBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.baseSm,
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  offerPrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  offerOriginalPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.primary,
  },
  stepQtyText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  storesSection: {
    paddingHorizontal: spacing.screenGutter,
    marginTop: spacing.baseMd,
  },
  storeCountBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  storeCountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    marginTop: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.baseSm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  resetSearchBtn: {
    marginTop: 12,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  resetSearchText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
});
