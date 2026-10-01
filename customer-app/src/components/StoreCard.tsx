import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CachedImage } from './CachedImage';
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
        <CachedImage source={{ uri: store.imageUrl }} style={styles.image} />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{store.isOpen ? 'مفتوح' : 'مغلق'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{store.name}</Text>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {store.address}
        </Text>

      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    minHeight: 124,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  imageContainer: {
    height: 124,
    width: 118,
    flexShrink: 0,
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
    flex: 1,
    justifyContent: 'center',
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
  address: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
});
