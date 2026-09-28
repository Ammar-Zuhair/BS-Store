import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';

export const FloatingCartBar: React.FC = () => {
  const {
    cart,
    cartSubOrders,
    cartTotal,
    navigateTo,
    currentScreen,
    colors: themeColors,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (cart.length === 0 || currentScreen === 'cart' || currentScreen === 'checkout' || currentScreen === 'auth') {
    return null;
  }

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const storeCount = cartSubOrders.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.floatingBar}
        onPress={() => navigateTo('cart')}
        activeOpacity={0.9}
      >
        <View style={styles.rightContent}>
          <View style={styles.iconWrap}>
            <Text style={styles.cartIcon}>🛒</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItemsCount}</Text>
            </View>
          </View>
          <View style={styles.storesInfo}>
            <Text style={styles.storesTitle}>سلة متعددة المتاجر</Text>
            <Text style={styles.storesCount}>{storeCount} متاجر مختلفة</Text>
          </View>
        </View>

        <View style={styles.leftContent}>
          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>الإجمالي:</Text>
            <Text style={styles.totalValue}>
              {cartTotal.toLocaleString()}{' '}
              <Text style={styles.currency}>ر.ي</Text>
            </Text>
          </View>
          <View style={styles.actionArrow}>
            <Text style={styles.arrowText}>➔</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 74,
    left: spacing.screenGutter,
    right: spacing.screenGutter,
    zIndex: 90,
  },
  floatingBar: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xxl,
    height: 60,
    paddingHorizontal: spacing.baseMd,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.floating,
  },
  rightContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  badgeText: {
    color: colors.onSecondary,
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
  },
  storesInfo: {
    alignItems: 'flex-end',
  },
  storesTitle: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  storesCount: {
    color: colors.onPrimary + 'CC',
    fontSize: typography.fontSize.xs,
  },
  leftContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
  },
  totalWrap: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    color: colors.onPrimary + 'BB',
    fontSize: 10,
  },
  totalValue: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  currency: {
    fontSize: 10,
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
});
