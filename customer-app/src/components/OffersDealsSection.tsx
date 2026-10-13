import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CachedImage } from './CachedImage';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { DealDetailsModal, DealItem } from './DealDetailsModal';
import { AppIcon } from './AppIcon';

export const initialDeals: DealItem[] = [];

const isBundleDeal = (deal: DealItem) => deal.dealType === 'BUNDLE' ||
  (deal.products.length > 0 && deal.dealType !== 'DELIVERY_DISCOUNT' && deal.dealType !== 'PRODUCT_DISCOUNT' && !deal.isFreeDelivery);
const isDiscountDeal = (deal: DealItem) => !isBundleDeal(deal) && Boolean(deal.couponCode ||
  deal.dealType === 'DELIVERY_DISCOUNT' || deal.dealType === 'PRODUCT_DISCOUNT' || deal.isFreeDelivery);

export const OffersDealsSection: React.FC = () => {
  const {
    addToCart,
    cart,
    updateQuantity,
    removeFromCart,
    applyPromoCode,
    promoCode,
    activeDeliveryDealId,
    activeOrderDiscountDeal,
    activateDeliveryDeal,
    activateProductDiscountDeal,
    deals,
    colors: themeColors,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [busyDealId, setBusyDealId] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<{ dealId: string; message: string } | null>(null);
  const activating = useRef(false);

  const isDealActive = (deal: DealItem) => isDiscountDeal(deal) && (deal.couponCode
    ? Boolean(promoCode && promoCode.trim().toUpperCase() === deal.couponCode.trim().toUpperCase())
    : deal.dealType === 'PRODUCT_DISCOUNT' ? activeOrderDiscountDeal?.id === deal.id
    : activeDeliveryDealId === deal.id);

  const activeDeals = deals;
  const homeDeals = activeDeals.filter((d) => d.isPublic !== false && (!d.visibility || d.visibility === 'home' || d.visibility === 'all') && (!d.expiresAt || new Date(d.expiresAt).getTime() > now));

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRemainingSeconds = (deal: DealItem) => {
    if (!deal.expiresAt) return 0;
    const expiry = new Date(deal.expiresAt).getTime();
    return Math.max(0, Math.floor((expiry - now) / 1000));
  };

  const formatCountdown = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const activateDiscount = async (deal: DealItem) => {
    if (activating.current || isDealActive(deal)) return;
    activating.current = true;
    setBusyDealId(deal.id);
    setActivationError(null);
    try {
      if (deal.expiresAt && new Date(deal.expiresAt).getTime() <= Date.now()) {
        throw new Error('انتهت صلاحية هذا العرض.');
      }
      if (deal.couponCode) {
        if (!await applyPromoCode(deal.couponCode)) {
          throw new Error('تعذر تفعيل الكود. تحقق من صلاحيته والاتصال، ثم حاول مجدداً.');
        }
      } else if (deal.dealType === 'PRODUCT_DISCOUNT') {
        if (deal.discountPercent <= 0 && !deal.discountTiers?.some(tier => tier.discountPercent > 0)) {
          throw new Error('لا يتوفر خصم صالح لهذا العرض حالياً.');
        }
        activateProductDiscountDeal(deal.id);
      } else {
        const percent = deal.isFreeDelivery ? 100 : deal.deliveryDiscountPercent ?? deal.discountPercent;
        if (percent <= 0) throw new Error('لا يتوفر خصم صالح لهذا العرض حالياً.');
        activateDeliveryDeal(deal.id, percent);
      }
    } catch (error) {
      setActivationError({ dealId: deal.id, message: error instanceof Error ? error.message : 'تعذر تفعيل العرض. حاول مجدداً.' });
    } finally {
      activating.current = false;
      setBusyDealId(null);
    }
  };

  const handleOpenDeal = (deal: DealItem) => {
    if (isDiscountDeal(deal)) { void activateDiscount(deal); return; }
    setSelectedDeal(deal);
    setModalVisible(true);
  };

  const handleQuickAdd = (deal: DealItem) => {
    if (isDiscountDeal(deal)) { void activateDiscount(deal); return; }
    if (isBundleDeal(deal)) { handleOpenDeal(deal); return; }
    if (!deal.storeId) return;
    addToCart(
      {
        id: deal.id,
        storeId: deal.storeId,
        storeName: deal.storeName,
        categoryId: deal.categoryId || '',
        name: deal.title,
        description: deal.description,
        sellingPrice: deal.originalPrice,
        discountPrice: deal.offerPrice,
        imageUrl: deal.imageUrl,
        sourceType: 'IN_STOCK',
        inStock: true,
        isBundle: deal.products.length > 0,
        dealId: deal.id,
      },
      1
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.hotBadge}>
              <Text style={styles.hotBadgeText}>وفر أكثر</Text>
            </View>
            <Text style={styles.sectionTitle}>أحدث العروض والباقات</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            عروض المتاجر والتوصيل المجاني والأطقم المجمعة
          </Text>
        </View>
      </View>

      {/* Horizontal Carousel of Deals */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {homeDeals.map((deal) => {
          const cartItem = cart.find((c) => c.product.id === deal.id);
          const qty = cartItem ? cartItem.quantity : 0;
          const remSeconds = getRemainingSeconds(deal);
          const active = isDealActive(deal);
          const loading = busyDealId === deal.id;
          const error = activationError?.dealId === deal.id ? activationError.message : null;
          const discountLabel = deal.isFreeDelivery ? 'توصيل مجاني'
            : deal.dealType === 'DELIVERY_DISCOUNT' ? `خصم ${deal.deliveryDiscountPercent ?? deal.discountPercent}% على التوصيل`
            : deal.dealType === 'PRODUCT_DISCOUNT' ? deal.discountTiers?.length ? 'خصم حسب قيمة الطلب' : `خصم ${deal.discountPercent}% على الطلب`
            : null;
          const actionLabel = loading ? 'جارٍ التفعيل...' : active ? 'تم التفعيل'
            : isDiscountDeal(deal) ? deal.couponCode ? 'تفعيل الكود' : 'تفعيل الخصم'
            : isBundleDeal(deal) ? 'تفاصيل العرض' : '+ إضافة';

          return (
            <TouchableOpacity
              key={deal.id}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => handleOpenDeal(deal)}
              disabled={busyDealId !== null && isDiscountDeal(deal)}
              accessibilityRole="button"
              accessibilityLabel={`${isDiscountDeal(deal) ? 'تفعيل العرض' : 'تفاصيل العرض'} ${deal.title}`}
            >
              {/* Badge */}
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{deal.badge}</Text>
              </View>

             {/* Countdown Tag on Top Left */}
              <View
                style={[
                  styles.dealExpiryBadge,
                  deal.expiresAt && remSeconds <= 0 && { backgroundColor: themeColors.errorContainer },
                ]}
              >
                <AppIcon
                  name={!deal.expiresAt || remSeconds > 0 ? 'clock' : 'alert'}
                  size={13}
                  color={!deal.expiresAt || remSeconds > 0 ? themeColors.onSurfaceVariant : themeColors.error}
                />
                <Text
                  style={[
                    styles.dealExpiryText,
                    deal.expiresAt && remSeconds <= 0 && { color: themeColors.error },
                  ]}
                >
                  {!deal.expiresAt ? 'عرض ساري' : remSeconds > 0 ? formatCountdown(remSeconds) : 'منتهي'}
                </Text>
              </View>

              {/* Deal Image */}
              <CachedImage source={{ uri: deal.imageUrl }} style={styles.cardImage} />

              <View style={styles.cardContent}>
                <View style={styles.dealHeaderRow}>
                  <View style={styles.storeNameRow}>
                    <AppIcon name='map-pin' size={13} color={themeColors.onSurfaceVariant} />
                    <Text style={styles.storeNameText} numberOfLines={1}>{deal.storeName}</Text>
                  </View>
                  {deal.couponCode ? (
                    <View style={styles.couponTag}>
                      <Text style={styles.couponTagText}>كود: {deal.couponCode}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.dealTitleText} numberOfLines={1}>
                  {deal.title}
                </Text>
                <Text style={styles.dealDescText} numberOfLines={2}>
                  {deal.dealType === 'DELIVERY_DISCOUNT' ? `خصم ${deal.deliveryDiscountPercent ?? deal.discountPercent}% من رسوم التوصيل` : deal.description}
                </Text>

                {(active || error) && <View style={[styles.activationNotice, error && styles.activationError]}
                  accessibilityLiveRegion="polite">
                  <AppIcon name={error ? 'alert' : 'check-circle'} size={18} color={error ? themeColors.error : themeColors.primary} />
                  <Text style={[styles.activationText, error && { color: themeColors.error }]}>
                    {error || `${deal.couponCode ? 'تم تفعيل الكود' : 'تم تفعيل الخصم'} بنجاح. يمكنك مراجعة الخصم في السلة.`}
                  </Text>
                </View>}

                {/* Price and Action Button / Stepper */}
                <View style={styles.bottomRow}>
                  <View style={styles.priceColumn}>
                    {discountLabel ? <Text style={styles.currentPrice}>{discountLabel}</Text> : <Text style={styles.currentPrice}>
                      {deal.offerPrice.toLocaleString()} ر.ي
                    </Text>}
                    {!isDiscountDeal(deal) && deal.originalPrice > deal.offerPrice && (
                      <Text style={styles.oldPrice}>
                        {deal.originalPrice.toLocaleString()} ر.ي
                      </Text>
                    )}
                  </View>

                  {qty > 0 && !isDiscountDeal(deal) ? (
                    <View style={styles.stepperWrap}>
                      <TouchableOpacity
                       style={styles.stepBtn}
                       onPress={(event) => { event.stopPropagation(); void updateQuantity(deal.id, qty + 1); }}
                        accessibilityRole='button'
                        accessibilityLabel={'زيادة كمية ' + deal.title}
                     >
                        <AppIcon name='plus' size={16} color={themeColors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.stepQtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                       onPress={(event) => {
                         event.stopPropagation();
                         if (qty === 1) {
                           removeFromCart(deal.id);
                         } else {
                           updateQuantity(deal.id, qty - 1);
                         }
                       }}
                        accessibilityRole='button'
                        accessibilityLabel={'تقليل كمية ' + deal.title}
                     >
                        <AppIcon name='minus' size={16} color={themeColors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, active && styles.activeActionBtn]}
                      disabled={busyDealId !== null || active}
                      onPress={(event) => {
                        event.stopPropagation();
                        handleQuickAdd(deal);
                      }}
                     activeOpacity={0.85}
                      accessibilityRole='button'
                      accessibilityLabel={`${isDiscountDeal(deal) ? 'تفعيل الخصم' : 'فتح العرض'} ${deal.title}`}
                      accessibilityState={{ busy: loading, disabled: busyDealId !== null || active, selected: active }}
                    >
                      {loading && <ActivityIndicator size="small" color={themeColors.onPrimary} />}
                      {active && <AppIcon name="check" size={16} color={themeColors.onPrimaryContainer} />}
                      <Text style={[styles.actionBtnText, active && { color: themeColors.onPrimaryContainer }]}>
                        {actionLabel}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Details & Breakdown Modal */}
      <DealDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        deal={selectedDeal}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    marginVertical: spacing.baseSm,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
    marginBottom: spacing.baseSm,
  },
  titleInfo: {
    alignItems: 'flex-end',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.onSurface,
  },
  hotBadge: {
    backgroundColor: colors.tertiaryContainer,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  hotBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.tertiary,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  countdownBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  clockIcon: {
    fontSize: 12,
  },
  countdownText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    gap: 14,
    paddingVertical: 4,
  },
  card: {
    width: 270,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
    position: 'relative',
  },
  cardBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  cardBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onPrimary,
  },
 dealExpiryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: colors.surfaceContainerHighest + 'EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
   borderWidth: 1,
   borderColor: colors.outlineVariant + '60',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  dealExpiryText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onSurface,
  },
  cardImage: {
    width: '100%',
    height: 135,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: spacing.baseSm,
  },
  dealHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  couponTag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  couponTagText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.secondary,
  },
 storeNameText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
   textAlign: 'right',
 },
  storeNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dealTitleText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 2,
  },
  dealDescText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.baseSm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '25',
  },
  priceColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.primary,
  },
  oldPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  activationNotice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, padding: 10, marginTop: 8, borderRadius: borderRadius.md, backgroundColor: colors.primaryContainer },
  activationError: { backgroundColor: colors.errorContainer },
  activationText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs, color: colors.onPrimaryContainer, textAlign: 'right' },
  activeActionBtn: { backgroundColor: colors.primaryContainer },
  actionBtn: {
    flexShrink: 1,
    maxWidth: '60%',
    flexDirection: 'row-reverse',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  actionBtnText: {
    flexShrink: 1,
    textAlign: 'center',
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
    gap: 8,
  },
 stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQtyText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
});
