import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CachedImage } from './CachedImage';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { Product, BundlePiece } from '../types';

export interface DealItem {
  id: string;
  title: string;
  storeName: string;
  storeId?: string;
  categoryId?: string;
  dealType?: 'BUNDLE' | 'DELIVERY_DISCOUNT' | 'PRODUCT_DISCOUNT';
  discountKind?: 'DELIVERY_DISCOUNT' | 'PRODUCT_DISCOUNT';
  deliveryDiscountPercent?: number;
  showInHome?: boolean;
  showInCategory?: boolean;
  showInStore?: boolean;
  description: string;
  badge: string;
  imageUrl: string;
  originalPrice: number;
  offerPrice: number;
  discountPercent: number;
  products: {
    id: string;
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
  }[];
  isFreeDelivery?: boolean;
  expiresAt?: string;
  couponCode?: string;
  isPublic?: boolean;
  visibility?: string;
}

interface DealDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  deal: DealItem | null;
}

export const DealDetailsModal: React.FC<DealDetailsModalProps> = ({
  visible,
  onClose,
  deal,
}) => {
  const {
    addToCart,
    addBundlePieceToCart,
    cart,
    updateQuantity,
    removeFromCart,
    stores,
    setSelectedStore,
    navigateTo,
    colors: themeColors,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!deal) return null;

  // Convert deal products to BundlePiece
  const handleAddPiece = (piece: { id: string; name: string; price: number; description?: string; imageUrl?: string }) => {
    const parentProd: Product = {
      id: `${deal.id}_${piece.id}`,
      storeId: deal.storeId || 'store-1',
      storeName: deal.storeName,
      categoryId: 'cat-all',
      name: piece.name,
      description: piece.description || '',
      sellingPrice: piece.price,
      imageUrl: piece.imageUrl || deal.imageUrl,
      sourceType: 'IN_STOCK',
      inStock: true,
      dealId: deal.id,
      dealProductId: piece.id,
    };
    addToCart(parentProd, 1);
  };

  const handleAddWholeDeal = () => {
    const wholeDealProd: Product = {
      id: deal.id,
      storeId: deal.storeId || 'store-1',
      storeName: deal.storeName,
      categoryId: 'cat-all',
      name: deal.title,
      description: deal.description,
      sellingPrice: deal.originalPrice,
      discountPrice: deal.offerPrice,
      imageUrl: deal.imageUrl,
      sourceType: 'IN_STOCK',
      inStock: true,
      isBundle: true,
      dealId: deal.id,
    };
    addToCart(wholeDealProd, 1);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{deal.title}</Text>
              <Text style={styles.storeNameText}>📍 {deal.storeName}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {deal.expiresAt ? (
              <View style={{ marginTop: 12, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: themeColors.surfaceContainerHigh }}>
                <Text style={{ color: themeColors.onSurface, textAlign: 'right', fontWeight: '700' }}>
                  ينتهي العرض في {new Date(deal.expiresAt).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </View>
            ) : null}
            {/* Cover Image & Badge */}
            <View style={styles.imageWrap}>
              <CachedImage source={{ uri: deal.imageUrl }} style={styles.image} />
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{deal.badge}</Text>
              </View>
              {deal.discountPercent > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>وفر {deal.discountPercent}%</Text>
                </View>
              )}
            </View>

            <Text style={styles.descText}>{deal.description}</Text>
            {!!deal.storeId && (
              <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={() => {
                const store = stores.find((item) => item.id === deal.storeId);
                if (store) { setSelectedStore(store); navigateTo('store_detail'); onClose(); }
              }}>
                <Text style={{ color: themeColors.primary, fontWeight: '700' }}>الانتقال إلى متجر {deal.storeName} ←</Text>
              </TouchableOpacity>
            )}

            {/* Individual Included Products List */}
            {deal.products.length > 0 && (
              <View style={styles.productsSection}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionSubtitle}>
                    يمكنك اختيار منتج واحد أو أكثر من العرض بشكل منفصل:
                  </Text>
                  <Text style={styles.sectionTitle}>محتويات وبنود العرض</Text>
                </View>

                {deal.products.map((item, index) => {
                  const cartItem = cart.find(
                    (c) => c.product.id === `${deal.id}_${item.id}`
                  );
                  const qty = cartItem ? cartItem.quantity : 0;

                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemLeftCol}>
                        {qty > 0 ? (
                          <View style={styles.stepperWrap}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => updateQuantity(cartItem!.product.id, qty + 1)}
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepQtyText}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => {
                                if (qty === 1) {
                                  removeFromCart(cartItem!.product.id);
                                } else {
                                  updateQuantity(cartItem!.product.id, qty - 1);
                                }
                              }}
                            >
                              <Text style={styles.stepBtnText}>-</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addPieceBtn}
                            onPress={() => handleAddPiece(item)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.addPieceBtnText}>+ إضافة للقطعة</Text>
                          </TouchableOpacity>
                        )}
                        <Text style={styles.itemPriceText}>
                          {item.price.toLocaleString()} ر.ي
                        </Text>
                      </View>

                      <View style={styles.itemRightCol}>
                        <View style={styles.itemIndexBadge}>
                          <Text style={styles.itemIndexText}>{index + 1}</Text>
                        </View>
                        <View style={styles.itemTexts}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.description ? (
                            <Text style={styles.itemSubDesc}>{item.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer with Total and Add Whole Deal Button */}
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <View style={styles.priceColumn}>
                <Text style={styles.totalPrice}>
                  {deal.offerPrice.toLocaleString()}{' '}
                  <Text style={styles.currency}>ر.ي</Text>
                </Text>
                {deal.originalPrice > deal.offerPrice && (
                  <Text style={styles.originalPrice}>
                    {deal.originalPrice.toLocaleString()} ر.ي
                  </Text>
                )}
              </View>
              <View style={styles.totalLabelWrap}>
                <Text style={styles.totalLabel}>السعر الإجمالي للعرض</Text>
                {deal.discountPercent > 0 && (
                  <Text style={styles.savingText}>
                    (توفير {(deal.originalPrice - deal.offerPrice).toLocaleString()} ر.ي)
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.addDealBtn}
              onPress={handleAddWholeDeal}
              activeOpacity={0.88}
            >
              <Text style={styles.addDealBtnText}>إضافة العرض بالكامل إلى السلة 🛍️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '85%',
    paddingBottom: 20,
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  headerInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.onSurface,
  },
  storeNameText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    color: colors.onSurfaceVariant,
  },
  scroll: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseMd,
  },
  imageWrap: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.baseMd,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
  },
  discountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  discountBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
  },
  descText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: spacing.baseLg,
  },
  productsSection: {
    marginBottom: spacing.baseMd,
  },
  sectionTitleRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.baseSm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.outline,
    marginTop: 2,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  itemRightCol: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIndexText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  itemTexts: {
    alignItems: 'flex-end',
    flex: 1,
  },
  itemName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
  },
  itemSubDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
    textAlign: 'right',
  },
  itemLeftCol: {
    alignItems: 'flex-start',
    gap: 4,
  },
  itemPriceText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  addPieceBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  addPieceBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSecondary,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
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
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  stepQtyText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.baseSm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '30',
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  totalLabelWrap: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
  },
  savingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.tertiary,
  },
  priceColumn: {
    alignItems: 'flex-start',
  },
  totalPrice: {
    fontFamily: typography.fontFamily.black,
    fontSize: typography.fontSize.xl,
    color: colors.primary,
  },
  currency: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
  },
  originalPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  addDealBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  addDealBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onPrimary,
  },
});
