import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { CachedImage } from '../components/CachedImage';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { Product, BundlePiece } from '../types';
import { ProductDetailsModal } from '../components/ProductDetailsModal';

export const StoreDetailScreen: React.FC = () => {
  const {
    selectedStore,
    navigateTo,
    addToCart,
    addBundlePieceToCart,
    removeFromCart,
    updateQuantity,
    cart,
    products,
    stores,
    deals,
    colors: themeColors,
  } = useApp();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const allStores = stores;
  const allProducts = products;

  // Fallback to first store if none selected
  const store = selectedStore || allStores[0] || null;

  // Filter products STRICTLY for this store (by id or matching store name)
  const storeProducts = allProducts.filter(
    (p) => Boolean(store && (p.storeId === store.id || (store.name && p.storeName === store.name)))
  );

  const storeDeals = (deals || []).filter((deal) => {
    const sameStore = Boolean(store && (String(deal.storeId || '').toLowerCase() === String(store.id).toLowerCase() ||
      (store.name && deal.storeName?.trim().toLocaleLowerCase() === store.name.trim().toLocaleLowerCase())));
    const validExpiry = !deal.expiresAt || new Date(deal.expiresAt).getTime() > Date.now();
    return sameStore && validExpiry && deal.isPublic !== false && (!deal.visibility || deal.visibility === 'store' || deal.visibility === 'all') && deal.products?.length > 0 &&
      deal.dealType !== 'DELIVERY_DISCOUNT';
  });

  // Include composite bundles and deals belonging to this store
  const storeDealsAsBundles: Product[] = storeDeals.map((d) => ({
      id: d.id,
      storeId: store?.id || '',
      storeName: store?.name || '',
      categoryId: d.categoryId || store?.categoryId || '',
      subcategoryId: 'العروض',
      name: d.title,
      description: d.description,
      sellingPrice: d.originalPrice,
      discountPrice: d.offerPrice,
      imageUrl: d.imageUrl,
      sourceType: 'IN_STOCK',
      inStock: true,
      isBundle: true,
      bundleItems: d.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        imageUrl: p.imageUrl,
      })),
    }));

  const allStoreProducts = [...storeDealsAsBundles, ...storeProducts];

  // Extract unique subcategories belonging only to this store's products and definitions
  const dynamicSubcats = Array.from(
    new Set(
      allStoreProducts
        .map((p) => p.subcategoryId)
        .filter((sub): sub is string => Boolean(sub && sub.trim()))
    )
  );
  const regularSubcategories = [
    ...(store?.subcategories || []).filter((name) => name !== 'العروض' && name !== 'أطقم وعروض'),
    ...dynamicSubcats.filter((name) => name !== 'العروض' && name !== 'أطقم وعروض'),
  ];
  const subcategories = [
    'الكل',
    ...(storeDealsAsBundles.length > 0 ? ['العروض'] : []),
    ...Array.from(new Set(regularSubcategories)),
  ];

  const [selectedSubcat, setSelectedSubcat] = useState<string>('الكل');
  const [visibleProductsCount, setVisibleProductsCount] = useState(12);
  useEffect(() => setSelectedSubcat('الكل'), [store?.id]);
  useEffect(() => setVisibleProductsCount(12), [selectedSubcat, store?.id]);

  // Selected composite product for Modal popup
  const [selectedBundleProduct, setSelectedBundleProduct] = useState<Product | null>(null);
  const [selectedRegularProduct, setSelectedRegularProduct] = useState<Product | null>(null);

  const filteredProducts = allStoreProducts.filter((p) => {
    if (selectedSubcat === 'الكل') return true;
    return (
      p.subcategoryId === selectedSubcat ||
      (p.description && p.description.includes(selectedSubcat)) ||
      (p.name && p.name.includes(selectedSubcat))
    );
  });

  if (!store) {
    return <View style={styles.container}><Header title="المتجر" showBack onBack={() => navigateTo('category_stores')} /><View style={styles.emptyContainer}><Text style={styles.emptyText}>بيانات المتجر غير متاحة حالياً من الخادم.</Text></View></View>;
  }

  return (
    <View style={styles.container}>
      <Header
        title={store.name}
        showBack
        onBack={() => navigateTo('category_stores')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Store Profile Card */}
        <View style={styles.storeCard}>
          <CachedImage source={{ uri: store.imageUrl }} style={styles.storeCover} resizeMode="contain" />
          <View style={styles.storeCardContent}>
            <View style={styles.storeTitleRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {store.isOpen ? 'مفتوح للطلبات' : 'مغلق'}
                </Text>
              </View>
              <Text style={styles.storeName}>{store.name}</Text>
            </View>

            <Text style={styles.storeAddress}>📍 {store.address}</Text>

          </View>
        </View>

        {/* Subcategories Horizontal Tabs */}
        {subcategories.length > 1 && (
          <View style={styles.subcatSection}>
            <Text style={styles.subcatHeaderTitle}>أقسام المتجر:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subcatScroll}
            >
              {subcategories.map((subcat) => {
                const isActive = selectedSubcat === subcat;
                return (
                  <TouchableOpacity
                    key={subcat}
                    style={[styles.subcatTab, isActive && styles.subcatTabActive]}
                    onPress={() => setSelectedSubcat(subcat)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.subcatTabText,
                        isActive && styles.subcatTabTextActive,
                      ]}
                    >
                      {subcat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Products List */}
        <View style={styles.productsSection}>
          <Text style={styles.productsHeaderTitle}>
            قائمة المنتجات ({filteredProducts.length})
          </Text>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <Text style={styles.emptyProductsIcon}>🍽️</Text>
              <Text style={styles.emptyProductsTitle}>لا توجد منتجات مسجلة في هذا القسم</Text>
              <Text style={styles.emptyProductsSubtitle}>
                اختر قسم "الكل" أو تصفح باقي أقسام المتجر
              </Text>
            </View>
          ) : (
            filteredProducts.slice(0, visibleProductsCount).map((product) => {
              const isBundle = Boolean(product.isBundle && product.bundleItems && product.bundleItems.length > 0);
              const price = product.discountPrice ?? product.sellingPrice;

              // Check if regular product or bundle item is in cart
              const cartItem = cart.find(
                (i) => i.product.id === product.id && !i.selectedPiece
              );
              const quantity = cartItem?.quantity || 0;

              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (isBundle) {
                      setSelectedBundleProduct(product);
                    } else {
                      setSelectedRegularProduct(product);
                    }
                  }}
                >
                  {/* Product Main Content */}
                  <View style={styles.productTopRow}>
                    <View style={styles.productImageWrap}>
                      <CachedImage
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      {product.discountPrice && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>خصم</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.productInfo}>
                      {isBundle && (
                        <View style={styles.bundleTag}>
                          <Text style={styles.bundleTagText}>
                            ✨ طقم متكامل (انقر للتفاصيل والتجزئة)
                          </Text>
                        </View>
                      )}
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productDesc} numberOfLines={2}>
                        {product.description}
                      </Text>
                      <View style={styles.priceContainer}>
                        <Text style={styles.sellingPrice}>
                          {price.toLocaleString()} ر.ي
                        </Text>
                        {product.discountPrice && (
                          <Text style={styles.originalPrice}>
                            {product.sellingPrice.toLocaleString()} ر.ي
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Bottom Action Row */}
                  <View style={styles.productBottomRow}>
                    {isBundle ? (
                      <TouchableOpacity
                        style={styles.bundleActionBtn}
                        activeOpacity={0.85}
                        onPress={() => setSelectedBundleProduct(product)}
                      >
                        <Text style={styles.bundleActionBtnText}>
                          عرض مكونات وتفاصيل الطقم ➔
                        </Text>
                      </TouchableOpacity>
                    ) : quantity > 0 ? (
                      <View style={styles.stepperContainer}>
                        <Text style={styles.stepperLabel}>الكمية في السلة:</Text>
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateQuantity(product.id, quantity + 1)}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                          <Text style={styles.stepQty}>{quantity}</Text>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateQuantity(product.id, quantity - 1)}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.simpleAddBtn}
                        onPress={() => addToCart(product, 1)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.simpleAddBtnText}>
                          + إضافة للسلة ({price.toLocaleString()} ر.ي)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          {filteredProducts.length > visibleProductsCount && <TouchableOpacity style={styles.showMoreProducts} onPress={() => setVisibleProductsCount((count) => count + 12)}>
            <Text style={styles.showMoreProductsText}>عرض المزيد من المنتجات</Text>
          </TouchableOpacity>}
        </View>
      </ScrollView>

      <ProductDetailsModal product={selectedRegularProduct} onClose={() => setSelectedRegularProduct(null)} />

      {/* ================= MODAL: COMPOSITE / BUNDLE PRODUCT DETAILS ================= */}
      {selectedBundleProduct && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedBundleProduct(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContentCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedBundleProduct(null)}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalHeaderTitle}>تفاصيل ومكونات الطقم</Text>
                  <Text style={styles.modalHeaderSubtitle}>
                    يمكنك طلب منتج واحد أو طلب الطقم كاملاً
                  </Text>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollBody}
              >
                {/* Bundle Cover & Title */}
                <CachedImage
                  source={{ uri: selectedBundleProduct.imageUrl }}
                  style={styles.modalCoverImage}
                />
                <Text style={styles.modalBundleName}>
                  {selectedBundleProduct.name}
                </Text>
                <Text style={styles.modalBundleDesc}>
                  {selectedBundleProduct.description}
                </Text>
                {deals.find((deal) => deal.id === selectedBundleProduct.id)?.expiresAt ? (
                  <Text style={{ marginTop: 8, marginBottom: 12, color: themeColors.primary, textAlign: 'right', fontWeight: '700' }}>
                    ينتهي العرض في {new Date(deals.find((deal) => deal.id === selectedBundleProduct.id)!.expiresAt!).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                ) : null}

                {/* Option 1: Order Entire Bundle */}
                <View style={styles.entireBundleBox}>
                  <View style={styles.entireBundleHeader}>
                    <Text style={styles.entireBundlePrice}>
                      {(
                        selectedBundleProduct.discountPrice ??
                        selectedBundleProduct.sellingPrice
                      ).toLocaleString()}{' '}
                      ر.ي
                    </Text>
                    <Text style={styles.entireBundleTitle}>
                      {selectedBundleProduct.isBundle ? 'طلب الباقة كاملة' : 'سعر المنتج'}
                    </Text>
                  </View>

                  {(() => {
                    const fullBundleItem = cart.find(
                      (i) =>
                        i.product.id === selectedBundleProduct.id &&
                        !i.selectedPiece
                    );
                    const fullBundleQty = fullBundleItem?.quantity || 0;

                    if (fullBundleQty > 0) {
                      return (
                        <View style={styles.fullBundleStepperRow}>
                          <Text style={styles.stepperNotice}>
                            تمت إضافة الطقم كاملاً للسلة ({fullBundleQty})
                          </Text>
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() =>
                                updateQuantity(
                                  selectedBundleProduct.id,
                                  fullBundleQty + 1
                                )
                              }
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepQty}>{fullBundleQty}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() =>
                                updateQuantity(
                                  selectedBundleProduct.id,
                                  fullBundleQty - 1
                                )
                              }
                            >
                              <Text style={styles.stepBtnText}>-</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <TouchableOpacity
                        style={styles.fullBundleOrderBtn}
                        activeOpacity={0.88}
                        onPress={() => addToCart(selectedBundleProduct, 1)}
                      >
                        <Text style={styles.fullBundleOrderBtnText}>
                          {selectedBundleProduct.isBundle ? '+ إضافة الباقة كاملة إلى السلة 🛍️' : '+ إضافة المنتج إلى السلة 🛍️'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>

                {/* Option 2: Order Single Pieces */}
                {selectedBundleProduct.bundleItems && (
                  <View style={styles.piecesSection}>
                    <Text style={styles.piecesSectionTitle}>
                      مكونات وأجزاء الطقم المتاحة للشراء بشكل فردي:
                    </Text>

                    {selectedBundleProduct.bundleItems.map((piece) => {
                      const pieceItemKey = `${selectedBundleProduct.id}__piece__${piece.id}`;
                      const pieceCartItem = cart.find(
                        (i) =>
                          i.product.id === selectedBundleProduct.id &&
                          i.selectedPiece?.id === piece.id
                      );
                      const pieceQty = pieceCartItem?.quantity || 0;

                      return (
                        <View key={piece.id} style={styles.pieceCard}>
                          {!!piece.imageUrl && <CachedImage source={{ uri: piece.imageUrl }} style={styles.pieceImage} resizeMode="cover" />}
                          <View style={styles.pieceContent}>
                            <Text style={styles.pieceTitle}>{piece.name}</Text>
                            {piece.description && (
                              <Text style={styles.pieceDescription}>
                                {piece.description}
                              </Text>
                            )}
                            <Text style={styles.piecePriceText}>
                              {piece.price.toLocaleString()} ر.ي
                            </Text>
                          </View>

                          {pieceQty > 0 ? (
                            <View style={styles.stepper}>
                              <TouchableOpacity
                                style={styles.stepBtn}
                                onPress={() =>
                                  updateQuantity(pieceItemKey, pieceQty + 1)
                                }
                              >
                                <Text style={styles.stepBtnText}>+</Text>
                              </TouchableOpacity>
                              <Text style={styles.stepQty}>{pieceQty}</Text>
                              <TouchableOpacity
                                style={styles.stepBtn}
                                onPress={() =>
                                  updateQuantity(pieceItemKey, pieceQty - 1)
                                }
                              >
                                <Text style={styles.stepBtnText}>-</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.pieceAddButton}
                              activeOpacity={0.85}
                              onPress={() =>
                                addBundlePieceToCart(
                                  selectedBundleProduct,
                                  piece,
                                  1
                                )
                              }
                            >
                              <Text style={styles.pieceAddButtonText}>
                                + طلب القطعة
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalDismissBtn}
                  onPress={() => setSelectedBundleProduct(null)}
                >
                  <Text style={styles.modalDismissBtnText}>إغلاق النافذة</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.screenGutter },
  emptyText: { color: colors.onSurfaceVariant, textAlign: 'center' },
  showMoreProducts: { marginVertical: spacing.baseMd, alignSelf: 'center', paddingHorizontal: spacing.baseLg, paddingVertical: spacing.baseSm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow },
  showMoreProductsText: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  storeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  storeCover: {
    width: 124,
    minHeight: 142,
    backgroundColor: colors.surfaceContainerLow,
  },
  storeCardContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
  },
  storeTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  statusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  storeAddress: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  storeMetaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginTop: 1,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.outlineVariant + '40',
  },
  subcatSection: {
    marginTop: 8,
    paddingHorizontal: 12,
  },
  subcatHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 5,
  },
  subcatScroll: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingBottom: 2,
  },
  subcatTab: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  subcatTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subcatTabText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.bold,
  },
  subcatTabTextActive: {
    color: colors.onPrimary,
  },
  productsSection: {
    marginTop: 10,
    paddingHorizontal: 12,
  },
  productsHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 8,
  },
  productCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  productTopRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'stretch',
  },
  productImageWrap: {
    position: 'relative',
    width: 115,
    height: 115,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onError,
    fontWeight: typography.fontWeight.bold,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bundleTag: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  bundleTagText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  productName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    lineHeight: 21,
  },
  productDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 17,
  },
  priceContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sellingPrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  originalPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  productBottomRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  bundleActionBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  bundleActionBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  stepperContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.sm,
  },
  stepBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stepQty: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    minWidth: 20,
    textAlign: 'center',
  },
  simpleAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleAddBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '85%',
    paddingBottom: 20,
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.baseMd,
    paddingVertical: spacing.baseSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '25',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  modalTitleWrap: {
    alignItems: 'flex-end',
  },
  modalHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  modalHeaderSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  modalScrollBody: {
    paddingHorizontal: spacing.baseMd,
    paddingTop: spacing.baseSm,
    paddingBottom: 40,
  },
  modalCoverImage: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
    marginBottom: spacing.baseSm,
  },
  modalBundleName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  modalBundleDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 18,
  },
  entireBundleBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginVertical: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  entireBundleHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entireBundleTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  entireBundlePrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  fullBundleOrderBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBundleOrderBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  fullBundleStepperRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stepperNotice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  piecesSection: {
    marginTop: spacing.baseSm,
  },
  piecesSectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 8,
  },
  pieceCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  pieceContent: {
    alignItems: 'flex-end',
    flex: 1,
    paddingLeft: 8,
  },
  pieceImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    marginLeft: 8,
  },
  pieceTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  pieceDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  piecePriceText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginTop: 3,
  },
  pieceAddButton: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  pieceAddButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  modalDismissBtn: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  modalDismissBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  emptyProductsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    marginTop: 8,
  },
  emptyProductsIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyProductsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptyProductsSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
});
