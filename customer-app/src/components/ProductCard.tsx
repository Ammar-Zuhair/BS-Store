import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CachedImage } from './CachedImage';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Product } from '../types';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { addToCart, cart, updateQuantity, removeFromCart, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const isDiscounted = product.discountPrice && product.discountPrice < product.sellingPrice;
  const currentPrice = isDiscounted ? product.discountPrice! : product.sellingPrice;

  const cartItem = cart.find((c) => c.product.id === product.id && !c.selectedPiece);
  const qty = cartItem ? cartItem.quantity : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrap}>
              <CachedImage source={{ uri: product.imageUrl }} style={styles.image} />
        {isDiscounted && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>خصم</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.storeName} numberOfLines={1}>
          📍 {product.storeName}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {product.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {currentPrice.toLocaleString()}{' '}
              <Text style={styles.currency}>ر.ي</Text>
            </Text>
            {isDiscounted && (
              <Text style={styles.oldPrice}>
                {product.sellingPrice.toLocaleString()}
              </Text>
            )}
          </View>

          {qty > 0 ? (
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => updateQuantity(product.id, qty + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.stepQty}>{qty}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  if (qty === 1) {
                    removeFromCart(product.id);
                  } else {
                    updateQuantity(product.id, qty - 1);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addToCart(product, 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>+ إضافة</Text>
            </TouchableOpacity>
          )}
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
    flexDirection: 'row-reverse',
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  imageWrap: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginLeft: spacing.baseSm,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.tertiary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 9,
    color: colors.onPrimary,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  storeName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    textAlign: 'right',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 2,
  },
  desc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.baseSm,
  },
  priceContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  currency: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
  },
  oldPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseSm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
  },
  stepper: {
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
  stepQty: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
});
