import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CachedImage } from './CachedImage';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { AppIcon } from './AppIcon';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { addToCart, cart, updateQuantity, removeFromCart, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const isDiscounted = product.discountPrice && product.discountPrice < product.sellingPrice;
  const currentPrice = product.hasOptions ? product.minSellingPrice ?? product.sellingPrice : isDiscounted ? product.discountPrice! : product.sellingPrice;

  const cartItem = cart.find((c) => c.product.id === product.id && !c.selectedPiece);
  const qty = !product.hasOptions && cartItem ? cartItem.quantity : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={'عرض تفاصيل ' + product.name}
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
        <View style={styles.storeRow}>
          <AppIcon name="map-pin" size={13} color={themeColors.onSurfaceVariant} />
          <Text style={styles.storeName} numberOfLines={1}>{product.storeName}</Text>
        </View>
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
                accessibilityRole="button"
                accessibilityLabel={'زيادة كمية ' + product.name}
              >
                <AppIcon name="plus" size={16} color={themeColors.primary} />
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
                accessibilityRole="button"
                accessibilityLabel={'تقليل كمية ' + product.name}
              >
                <AppIcon name="minus" size={16} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => product.hasOptions && onPress ? onPress() : void addToCart(product, 1).catch(error => Alert.alert('تعذر الإضافة', error.message))}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={'إضافة ' + product.name + ' إلى السلة'}
            >
              <AppIcon name="plus" size={15} color={themeColors.onPrimary} />
              <Text style={styles.addBtnText}>{product.hasOptions ? 'اختر الخيارات' : 'إضافة'}</Text>
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
    borderRadius: borderRadius.xxl,
    flexDirection: 'row-reverse',
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  imageWrap: {
    width: 92,
    height: 92,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginLeft: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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
  storeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
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
    minHeight: 44,
    borderRadius: borderRadius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
});
