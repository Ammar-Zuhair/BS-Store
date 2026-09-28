import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { mockFlashDeals } from '../mock';
import { useApp } from '../context/AppContext';
import { FlashDeal } from '../types';

interface FlashDealsProps {
  onSelectDeal?: (deal: FlashDeal) => void;
}

export const FlashDeals: React.FC<FlashDealsProps> = ({ onSelectDeal }) => {
  const { addToCart, products } = useApp();
  const [seconds, setSeconds] = useState(13335); // ~03:42:15

  const discountedProducts = products.filter(
    (p) => p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.sellingPrice
  );

  const dynamicDeals: FlashDeal[] = discountedProducts.map((p) => ({
    id: `deal-${p.id}`,
    title: p.name,
    storeName: p.storeName,
    description: p.description,
    originalPrice: p.sellingPrice,
    discountPrice: p.discountPrice!,
    discountPercent: Math.max(5, Math.round(((p.sellingPrice - p.discountPrice!) / p.sellingPrice) * 100)),
    imageUrl: p.imageUrl,
    remainingHours: 4,
    product: p,
  }));

  const displayDeals = dynamicDeals.length > 0 ? dynamicDeals : mockFlashDeals;

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <View style={styles.container}>
      {/* Header with Countdown */}
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <View style={styles.fireIconWrap}>
            <Text style={styles.fireIcon}>🔥</Text>
          </View>
          <View>
            <View style={styles.badgeRow}>
              <Text style={styles.title}>عروض اليوم الخاطفة</Text>
              <View style={styles.discountPill}>
                <Text style={styles.discountPillText}>خصومات حصرية</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>صفقات حصرية تنتهي خلال ساعات محدودة</Text>
          </View>
        </View>

        <View style={styles.timerBadge}>
          <Text style={styles.clockIcon}>⏱</Text>
          <Text style={styles.timerText}>{formatTimer(seconds)}</Text>
        </View>
      </View>

      {/* Horizontal Scroll of Deals */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayDeals.map((deal) => (
          <View key={deal.id} style={styles.card}>
            <View style={styles.cardDiscountBadge}>
              <Text style={styles.cardDiscountText}>وفر {deal.discountPercent}%</Text>
            </View>

            <Image source={{ uri: deal.imageUrl }} style={styles.dealImage} />

            <View style={styles.dealDetails}>
              <View style={styles.storeRow}>
                <Text style={styles.storeIcon}>🏪</Text>
                <Text style={styles.storeName}>{deal.storeName}</Text>
              </View>

              <Text style={styles.dealTitle} numberOfLines={1}>
                {deal.title}
              </Text>
              <Text style={styles.dealDesc} numberOfLines={1}>
                {deal.description}
              </Text>

              <View style={styles.priceRow}>
                <View style={styles.priceWrap}>
                  <Text style={styles.currentPrice}>
                    {deal.discountPrice.toLocaleString()}{' '}
                    <Text style={styles.currency}>ر.ي</Text>
                  </Text>
                  <Text style={styles.oldPrice}>
                    {deal.originalPrice.toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => addToCart(deal.product, 1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>+ أضف</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
  },
  fireIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondaryContainer + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireIcon: {
    fontSize: 18,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  discountPill: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  discountPillText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
  timerBadge: {
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
  timerText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    gap: spacing.baseMd,
  },
  card: {
    width: 260,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
    position: 'relative',
  },
  cardDiscountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  cardDiscountText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
  dealImage: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
  },
  dealDetails: {
    padding: spacing.baseSm,
  },
  storeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  storeIcon: {
    fontSize: 12,
  },
  storeName: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  dealTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  dealDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.baseSm,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  currency: {
    fontSize: 10,
  },
  oldPrice: {
    fontSize: typography.fontSize.xs,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});
