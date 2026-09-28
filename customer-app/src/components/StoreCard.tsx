import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Store } from '../types';
import { useApp } from '../context/AppContext';

interface StoreCardProps {
  store: Store;
  onPress?: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
  const { colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: store.imageUrl }} style={styles.image} />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{store.isOpen ? 'مفتوح' : 'مغلق'}</Text>
        </View>
        <View style={styles.etaBadge}>
          <Text style={styles.etaIcon}>⏱</Text>
          <Text style={styles.etaText}>{store.deliveryTime}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{store.name}</Text>
          <View style={styles.ratingWrap}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {store.address}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.feeWrap}>
            <Text style={styles.feeLabel}>رسوم التوصيل:</Text>
            <Text style={styles.feeValue}>{store.deliveryFee} ر.ي</Text>
          </View>

          <View style={styles.tagsWrap}>
            {store.tags.slice(0, 2).map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  etaBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  etaIcon: {
    fontSize: 10,
  },
  etaText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  content: {
    padding: spacing.baseSm,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  ratingWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.tertiaryFixedDim + '40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  starIcon: {
    fontSize: 11,
  },
  ratingText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.tertiary,
  },
  address: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.baseXs,
    paddingTop: spacing.baseXs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  feeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  feeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  feeValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  tagsWrap: {
    flexDirection: 'row-reverse',
    gap: 4,
  },
  tag: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
});
