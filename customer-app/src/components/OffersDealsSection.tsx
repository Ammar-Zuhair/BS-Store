import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { DealDetailsModal, DealItem } from './DealDetailsModal';
import { mockStores } from '../mock';

export const initialDeals: DealItem[] = [
  {
    id: 'offer-bundle-fashion',
    title: 'طقم الأناقة الصيفي الكامل',
    storeName: 'متجر النخبة للملابس الرجالية',
    storeId: 'store-3',
    description: 'طقم متناسق يشمل قميص كاجوال كتان فاخر، بنطال جينز عصري، وحذاء كلاسيكي. يمكنك شراء الطقم كاملاً أو اختيار أي قطعة منفردة.',
    badge: 'طقم متكامل • وفر 25%',
    imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80',
    originalPrice: 24000,
    offerPrice: 18000,
    discountPercent: 25,
    expiresAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    isPublic: true,
    products: [
      {
        id: 'p-shirt',
        name: 'قميص كاجوال كتان فاخر',
        price: 8500,
        description: 'قماش كتان بارد ومريح ومقاوم للتجعد',
        imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p-jeans',
        name: 'بنطال جينز كلاسيكي مريح',
        price: 9500,
        description: 'قصة مستقيمة مريحة وخامة دينيم عالية الجودة',
        imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p-shoes',
        name: 'حذاء كاجوال خفيف أنيق',
        price: 6000,
        description: 'نعل طبي مريح للمشي اليومي',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
  {
    id: 'offer-free-delivery',
    title: 'عرض التوصيل المجاني للطلبات',
    storeName: 'منصة متجر بي اس',
    description: 'استمتع بتوصيل مجاني فوري لجميع طلباتك المتعددة المتاجر اليوم عند استخدام كود BS_FREE.',
    badge: 'توصيل مجاني 🚚',
    imageUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=600&q=80',
    originalPrice: 1500,
    offerPrice: 0,
    discountPercent: 100,
    isFreeDelivery: true,
    couponCode: 'BS_FREE',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    isPublic: true,
    products: [],
  },
  {
    id: 'offer-family-meal',
    title: 'وجبة التوفير العائلية الكبرى',
    storeName: 'مطعم السعيد للمأكولات',
    storeId: 'store-1',
    description: 'وجبة تكفي 4 أشخاص تضم حبة دجاج شواية، صحن أرز بشاور كبير، صحن مقبلات مشكلة، و4 مشروبات باردة.',
    badge: 'وجبة عائلية • وفر 20%',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    originalPrice: 7500,
    offerPrice: 6000,
    discountPercent: 20,
    couponCode: 'BS_2026',
    expiresAt: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    isPublic: true,
    products: [
      {
        id: 'p-chicken',
        name: 'حبة دجاج شواية على الفحم',
        price: 3500,
        description: 'متبلة بأشهى البهارات اليمنية مع صلصة الثوم',
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p-rice',
        name: 'صحن أرز بشاور كبير',
        price: 2000,
        description: 'أرز فاخر بالزعفران والمكسرات والزبيب',
        imageUrl: 'https://images.unsplash.com/photo-1539136788836-5699e78bfc75?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p-salad',
        name: 'مقبلات مشكلة وسلطة خضراء',
        price: 1200,
        description: 'حمص، متبل، سلطة فتوش طازجة',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'p-drinks',
        name: 'مشروب غازي عائلي',
        price: 800,
        description: 'مشروب منعش بارد بحجم عائلي',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
];

export const OffersDealsSection: React.FC = () => {
  const {
    addToCart,
    cart,
    updateQuantity,
    removeFromCart,
    applyPromoCode,
    activateDeliveryDeal,
    deals,
    colors: themeColors,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  const activeDeals = deals;
  const homeDeals = activeDeals.filter((d) => d.isPublic !== false && (!d.expiresAt || new Date(d.expiresAt).getTime() > now));

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

  const handleOpenDeal = (deal: DealItem) => {
    if (deal.dealType === 'DELIVERY_DISCOUNT') {
      activateDeliveryDeal(deal.id, deal.deliveryDiscountPercent ?? deal.discountPercent);
      return;
    }
    if (deal.isFreeDelivery || deal.couponCode) {
      const code = deal.couponCode || 'BS_FREE';
      applyPromoCode(code);
      return;
    }
    setSelectedDeal(deal);
    setModalVisible(true);
  };

  const handleQuickAdd = (deal: DealItem) => {
    if (deal.isFreeDelivery || deal.couponCode) {
      const code = deal.couponCode || 'BS_FREE';
      applyPromoCode(code);
      return;
    }
    addToCart(
      {
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
        isBundle: deal.products.length > 0,
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

          return (
            <TouchableOpacity
              key={deal.id}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => handleOpenDeal(deal)}
            >
              {/* Badge */}
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{deal.badge}</Text>
              </View>

              {/* Countdown Tag on Top Left */}
              <View style={styles.dealExpiryBadge}>
                <Text style={styles.dealExpiryText}>
                  {remSeconds > 0 ? `⏳ ${formatCountdown(remSeconds)}` : '⚠️ منتهي'}
                </Text>
              </View>

              {/* Deal Image */}
              <Image source={{ uri: deal.imageUrl }} style={styles.cardImage} />

              <View style={styles.cardContent}>
                <View style={styles.dealHeaderRow}>
                  <Text style={styles.storeNameText} numberOfLines={1}>
                    📍 {deal.storeName}
                  </Text>
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

                {/* Price and Action Button / Stepper */}
                <View style={styles.bottomRow}>
                  <View style={styles.priceColumn}>
                    {deal.dealType === 'DELIVERY_DISCOUNT' ? <Text style={styles.currentPrice}>خصم {deal.deliveryDiscountPercent ?? deal.discountPercent}% على التوصيل</Text> : <Text style={styles.currentPrice}>
                      {deal.offerPrice.toLocaleString()} ر.ي
                    </Text>}
                    {deal.dealType !== 'DELIVERY_DISCOUNT' && deal.originalPrice > deal.offerPrice && (
                      <Text style={styles.oldPrice}>
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
                      style={styles.actionBtn}
                      onPress={() => {
                        if (deal.products.length > 0) {
                          handleOpenDeal(deal);
                        } else {
                          handleQuickAdd(deal);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionBtnText}>
                        {deal.dealType === 'DELIVERY_DISCOUNT' ? 'تفعيل الخصم' : (deal.products.length > 0 ? 'عرض الباقة ➔' : (deal.couponCode ? 'تفعيل الكود' : '+ إضافة'))}
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
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
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
    marginTop: spacing.baseSm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '25',
  },
  priceColumn: {
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
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  actionBtnText: {
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
    fontSize: 13,
    color: colors.primary,
  },
});
