import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';

export const CartScreen: React.FC = () => {
  const {
    cart,
    cartSubOrders,
    updateQuantity,
    removeFromCart,
    cartSubtotal,
    cartDeliveryFee,
    cartDiscount,
    cartTotal,
    promoCode,
    applyPromoCode,
    navigateTo,
    isAuthenticated,
    colors: themeColors,
  } = useApp();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [inputCode, setInputCode] = useState(promoCode);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const handleApplyPromo = () => {
    if (!inputCode.trim()) return;
    const success = applyPromoCode(inputCode);
    if (success) {
      setPromoMessage('تم تفعيل كود الخصم 15% بنجاح!');
    } else {
      setPromoMessage('كود الخصم غير صالح. جرب: BS_2026');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="سلة الشراء الموحدة" showBack onBack={() => navigateTo('home')} />

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>سلة الشراء فارغة</Text>
          <Text style={styles.emptySubtitle}>
            تصفح المتاجر واختر وجباتك وأصنافك المفضلة
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigateTo('home')}
          >
            <Text style={styles.browseBtnText}>ابدأ التسوق الآن</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Multi-store Notice */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeIcon}>ℹ️</Text>
            <View style={styles.noticeTextWrap}>
              <Text style={styles.noticeTitle}>
                سلة متعددة المتاجر ({cartSubOrders.length} متاجر)
              </Text>
              <Text style={styles.noticeDesc}>
                سيقوم كابتن التوصيل بالمرور على جميع المتاجر وتوصيل طلباتك في مشوار واحد.
              </Text>
            </View>
          </View>

          {/* SubOrders Grouped by Store */}
          {cartSubOrders.map((subOrder) => (
            <View key={subOrder.storeId} style={styles.storeCard}>
              <View style={styles.storeHeader}>
                <View style={styles.storeBadge}>
                  <Text style={styles.storeBadgeText}>متجر مستقل</Text>
                </View>
                <View style={styles.storeTitleWrap}>
                  <Text style={styles.storeTitle}>{subOrder.storeName}</Text>
                  <Text style={styles.storeSub}>{subOrder.items.length} أصناف</Text>
                </View>
              </View>

              {subOrder.items.map((item) => {
                const itemPrice =
                  item.product.discountPrice ?? item.product.sellingPrice;
                return (
                  <View key={item.product.id} style={styles.itemRow}>
                    <Image
                      source={{ uri: item.product.imageUrl }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {(itemPrice * item.quantity).toLocaleString()} ر.ي
                      </Text>
                    </View>

                    {/* Stepper */}
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepQty}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Promo Code Input */}
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>كوبون الخصم</Text>
            <View style={styles.promoInputRow}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyPromo}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>تطبيق</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.promoInput}
                placeholder="أدخل كود الخصم (مثال: BS_FREE أو BS_2026)"
                placeholderTextColor={themeColors.outline}
                value={inputCode}
                onChangeText={setInputCode}
                textAlign="right"
              />
            </View>
            {promoMessage && (
              <Text
                style={[
                  styles.promoMsgText,
                  promoCode ? styles.promoSuccess : styles.promoError,
                ]}
              >
                {promoMessage}
              </Text>
            )}
          </View>

          {/* Cost Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>ملخص التكلفة</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {cartSubtotal.toLocaleString()} ر.ي
              </Text>
              <Text style={styles.summaryLabel}>مجموع المنتجات</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {cartDeliveryFee.toLocaleString()} ر.ي
              </Text>
              <Text style={styles.summaryLabel}>
                رسوم التوصيل الموحدة ({cartSubOrders.length} متاجر)
              </Text>
            </View>
            {cartDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.discountValue}>
                  -{cartDiscount.toLocaleString()} ر.ي
                </Text>
                <Text style={styles.discountLabel}>الخصم الترويجي</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>
                {cartTotal.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
              </Text>
              <Text style={styles.totalLabel}>المجموع الإجمالي</Text>
            </View>
          </View>

          {/* Checkout Action Button */}
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert(
                  'تسجيل الدخول مطلوب',
                  'لا يمكنك إتمام الطلب إلا بعد تسجيل الدخول أو إنشاء حساب في النظام.',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'تسجيل الدخول / إنشاء حساب', onPress: () => navigateTo('auth') },
                  ]
                );
                return;
              }
              navigateTo('checkout');
            }}
            activeOpacity={0.88}
          >
            <View style={styles.btnPriceTag}>
              <Text style={styles.btnPriceText}>
                {cartTotal.toLocaleString()} ر.ي
              </Text>
            </View>
            <Text style={styles.checkoutBtnText}>متابعة إتمام الطلب والدفع ➔</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenGutter,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: spacing.baseSm,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing.baseLg,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseXl,
    paddingVertical: spacing.baseSm,
    borderRadius: borderRadius.xl,
  },
  browseBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  noticeBox: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.primaryFixedDim + '25',
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryFixed,
    marginBottom: spacing.baseSm,
    gap: spacing.baseXs,
  },
  noticeIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  noticeTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  noticeTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  noticeDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  storeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  storeHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
    paddingBottom: spacing.baseXs,
    marginBottom: spacing.baseXs,
  },
  storeTitleWrap: {
    alignItems: 'flex-end',
  },
  storeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  storeSub: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  storeBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  storeBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.outline,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    marginLeft: spacing.baseSm,
  },
  itemDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.sm,
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stepQty: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    minWidth: 16,
    textAlign: 'center',
  },
  promoCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    ...shadows.card,
  },
  promoTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  promoInputRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.baseSm,
    height: 42,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseMd,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  promoMsgText: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  promoSuccess: {
    color: colors.success,
  },
  promoError: {
    color: colors.error,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseMd,
    ...shadows.card,
  },
  summaryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: spacing.baseXs,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.onSurface,
  },
  discountLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
  },
  discountValue: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant + '30',
    marginVertical: spacing.baseXs,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  totalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  curr: {
    fontSize: typography.fontSize.xs,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    height: 54,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.baseMd,
    ...shadows.floating,
  },
  btnPriceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  btnPriceText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  checkoutBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
});
