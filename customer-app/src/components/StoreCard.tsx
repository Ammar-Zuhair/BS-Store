import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CachedImage } from './CachedImage';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Store } from '../types';
import { useApp } from '../context/AppContext';
import { hoursDescription, isOpenNow } from '../utils/openingHours';
import { AppIcon } from './AppIcon';

interface StoreCardProps {
  store: Store;
  onPress?: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
  const { colors: themeColors, businessNow } = useApp();
  const isOpen = store.isActive === false ? false : isOpenNow(store, businessNow);
  const status = isOpen === null ? 'المواعيد غير محددة' : isOpen ? 'مفتوح' : 'مغلق';
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={'فتح متجر ' + store.name + ('، ' + status)}
    >
      <View style={styles.imageContainer}>
        <CachedImage source={{ uri: store.imageUrl }} style={styles.image} />
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOpen === true ? themeColors.success : themeColors.surfaceContainerHigh },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isOpen === true ? '#FFFFFF' : themeColors.onSurfaceVariant },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{store.name}</Text>
          <TouchableOpacity
            onPress={(event) => { event.stopPropagation(); Alert.alert(store.name, `${hoursDescription(store)}\nمواعيد يومية بتوقيت اليمن`); }}
            accessibilityRole="button" accessibilityLabel={`مواعيد متجر ${store.name}`} style={{ padding: 8 }}
          >
            <Text style={{ fontFamily: typography.fontFamily.bold, color: themeColors.primary, fontSize: typography.fontSize.sm }}>تفاصيل</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addressRow}>
          <AppIcon name="map-pin" size={14} color={themeColors.onSurfaceVariant} />
          <Text style={styles.address} numberOfLines={2}>{store.address}</Text>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    minHeight: 128,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  imageContainer: {
    height: 128,
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
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
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
    minWidth: 0,
    gap: 5,
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
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 5,
  },
});
