import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { paymentsApi } from '../api';
import { PaymentMethodType } from '../types';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';

export const CheckoutScreen: React.FC = () => {
  const {
    selectedAddress,
    addNewAddress,
    cartTotal,
    cartDeliveryFee,
    cartFarthestStoreDistanceKm,
    isDeliveryQuoteLoading,
    hasDeliveryQuote,
    refreshDeliveryQuote,
    cartSubtotal,
    cartDiscount,
    cartSubOrders,
    promoCode,
    promoMessage,
    applyPromoCode,
    clearPromoCode,
    placeOrder,
    navigateTo,
    isAuthenticated,
    colors: themeColors,
  } = useApp();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH_ON_DELIVERY');
  const [transferRef, setTransferRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [inputCoupon, setInputCoupon] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponStatusMsg, setCouponStatusMsg] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<{
    transferBankName?: string | null;
    transferAccountNumber?: string | null;
    transferAccountName?: string | null;
  } | null>(null);

  useEffect(() => {
    paymentsApi.getSettings().then(setPaymentSettings).catch(() => setPaymentSettings(null));
  }, []);

  const handleApplyCoupon = async () => {
    if (!inputCoupon.trim()) return;
    setIsApplyingCoupon(true);
    setCouponStatusMsg(null);
    try {
      const ok = await applyPromoCode(inputCoupon.trim());
      if (ok) {
        setCouponStatusMsg('تم تفعيل رمز الخصم بنجاح ✓');
        setInputCoupon('');
      } else {
        setCouponStatusMsg('رمز الاسترداد أو كود الخصم غير صالح أو منتهي');
      }
    } catch {
      setCouponStatusMsg('تعذر التحقق من الكود حالياً');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleClearPromo = () => {
    clearPromoCode();
    setCouponStatusMsg(null);
  };

  const handleLocationPicked = (loc: LocationResult) => {
    addNewAddress({
      label: 'المنزل',
      city: loc.city || '',
      district: loc.district || '',
      street: loc.street || loc.district || '',
      description: loc.addressTitle || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      isDefault: true,
    });
    setShowMapPicker(false);
  };

  const handleConfirmOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('تنبيه عنوان التوصيل', 'يرجى تحديد موقع وعنوان التوصيل أولاً قبل إتمام الطلب');
      setShowMapPicker(true);
      return;
    }

    if (!hasDeliveryQuote) {
      Alert.alert('تعذر حساب رسوم التوصيل', 'انتظر اكتمال حساب المسافة بين عنوانك والمتاجر، ثم حاول مجدداً.');
      return;
    }

    if (paymentMethod === 'MANUAL_TRANSFER' && !transferRef.trim()) {
      Alert.alert('تنبيه التحويل البنكي', 'أدخل رقم الحوالة أو العملية المسجل في بيانات الدفع');
      return;
    }
    if (paymentMethod === 'MANUAL_TRANSFER' && !paymentSettings) {
      Alert.alert('بيانات الدفع غير متاحة', 'لا توجد بيانات تحويل محفوظة في النظام حاليًا.');
      return;
    }

    setIsSubmitting(true);
    try {
      await placeOrder(
        paymentMethod,
        undefined,
        [notes, paymentMethod === 'MANUAL_TRANSFER' ? `رقم الحوالة: ${transferRef.trim()}` : '']
          .filter(Boolean)
          .join('\n')
      );
    } catch {
      // error handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="إتمام الطلب والدفع" showBack onBack={() => navigateTo('cart')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(true)}>
              <Text style={styles.changeLink}>{selectedAddress ? 'تعديل أو تغيير' : '+ إضافة عنوان'}</Text>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <Text style={styles.cardTitle}>عنوان التوصيل</Text>
              <Text style={styles.headerIcon}>📍</Text>
            </View>
          </View>
          {selectedAddress ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>
                {selectedAddress.label} - {selectedAddress.city}، {selectedAddress.district}
              </Text>
              <Text style={styles.addressDetails}>{selectedAddress.street}</Text>
              {selectedAddress.building && (
                <Text style={styles.addressDetails}>{selectedAddress.building}</Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.missingAddressBtn}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.missingAddressIcon}>🗺️</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.missingAddressTitle}>لم يتم تحديد موقع التوصيل</Text>
                <Text style={styles.missingAddressSub}>اضغط هنا لاختيار موقعك بدقة على الخريطة (GPS)</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Multi-store order review summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.storesCountBadge}>{cartSubOrders.length} متاجر</Text>
            <View style={styles.headerRight}>
              <Text style={styles.cardTitle}>ملخص محطات الاستلام</Text>
              <Text style={styles.headerIcon}>🏪</Text>
            </View>
          </View>
          {cartSubOrders.map((so, idx) => (
            <View key={so.storeId} style={styles.stopRow}>
              <Text style={styles.stopFee}>{so.subtotal.toLocaleString()} ر.ي</Text>
              <View style={styles.stopInfo}>
                <Text style={styles.stopNumber}>محطة {idx + 1}:</Text>
                <Text style={styles.stopName}>{so.storeName}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View />
            <View style={styles.headerRight}>
              <Text style={styles.cardTitle}>طريقة الدفع</Text>
              <Text style={styles.headerIcon}>💳</Text>
            </View>
          </View>

          {/* Option 1: Cash on Delivery */}
          <TouchableOpacity
            style={[
              styles.methodOption,
              paymentMethod === 'CASH_ON_DELIVERY' && styles.methodOptionActive,
            ]}
            onPress={() => setPaymentMethod('CASH_ON_DELIVERY')}
            activeOpacity={0.85}
          >
            <View style={styles.radio}>
              {paymentMethod === 'CASH_ON_DELIVERY' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>الدفع نقداً عند الاستلام (COD)</Text>
                <Text style={styles.methodIcon}>💵</Text>
              </View>
              <Text style={styles.methodDesc}>
                ادفع للكابتن بعد استلام جميع الطلبات ومطابقتها
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Manual Bank Transfer */}
          <TouchableOpacity
            style={[
              styles.methodOption,
              paymentMethod === 'MANUAL_TRANSFER' && styles.methodOptionActive,
            ]}
            onPress={() => setPaymentMethod('MANUAL_TRANSFER')}
            activeOpacity={0.85}
          >
            <View style={styles.radio}>
              {paymentMethod === 'MANUAL_TRANSFER' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <Text style={styles.methodTitle}>تحويل بنكي / إشعار سداد</Text>
                <Text style={styles.methodIcon}>🏦</Text>
              </View>
              <Text style={styles.methodDesc}>
                تحويل عبر الكريمي جوال أو المحافظ الإلكترونية
              </Text>
            </View>
          </TouchableOpacity>

          {/* Bank Transfer Details Form (When Manual Transfer is chosen) */}
          {paymentMethod === 'MANUAL_TRANSFER' && (
            <View style={styles.transferDetailsWrap}>
              <View style={styles.bankAccountsCard}>
                <Text style={styles.bankTitle}>بيانات الحسابات المعتمدة للمنصة:</Text>
                {paymentSettings ? (
                  <>
                    {paymentSettings.transferBankName ? <Text style={styles.bankItem}>البنك: <Text style={styles.bankBold}>{paymentSettings.transferBankName}</Text></Text> : null}
                    {paymentSettings.transferAccountNumber ? <Text style={styles.bankItem}>رقم الحساب: <Text style={styles.bankBold}>{paymentSettings.transferAccountNumber}</Text></Text> : null}
                    {paymentSettings.transferAccountName ? <Text style={styles.bankItem}>اسم الحساب: <Text style={styles.bankBold}>{paymentSettings.transferAccountName}</Text></Text> : null}
                  </>
                ) : (
                  <Text style={styles.bankItem}>بيانات التحويل غير مسجلة حاليًا.</Text>
                )}
              </View>

              <Text style={styles.inputLabel}>رقم الحوالة أو العملية:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="أدخل رقم الإشعار / الحوالة"
                placeholderTextColor={themeColors.outline}
                value={transferRef}
                onChangeText={setTransferRef}
                textAlign="right"
              />

            </View>
          )}
        </View>

        {/* Promo / Redemption Code Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View />
            <View style={styles.headerRight}>
              <Text style={styles.cardTitle}>كود الخصم / رمز الاسترداد</Text>
              <Text style={styles.headerIcon}>🏷️</Text>
            </View>
          </View>

          {promoCode ? (
            <View style={styles.activePromoWrap}>
              <View style={styles.activePromoHeader}>
                <TouchableOpacity onPress={handleClearPromo} style={styles.removePromoBtn}>
                  <Text style={styles.removePromoBtnText}>✕ إلغاء الكود</Text>
                </TouchableOpacity>
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>✓ {promoCode}</Text>
                </View>
              </View>
              {!!promoMessage && (
                <Text style={styles.promoMessageText}>{promoMessage}</Text>
              )}
              {cartDiscount > 0 && (
                <Text style={styles.promoSavingText}>
                  تم توفير {cartDiscount.toLocaleString()} ر.ي من إجمالي الطلب
                </Text>
              )}
            </View>
          ) : (
            <View>
              <View style={styles.promoInputRow}>
                <TouchableOpacity
                  style={[styles.applyPromoBtn, (!inputCoupon.trim() || isApplyingCoupon) && styles.applyPromoBtnDisabled]}
                  onPress={handleApplyCoupon}
                  disabled={!inputCoupon.trim() || isApplyingCoupon}
                  activeOpacity={0.8}
                >
                  {isApplyingCoupon ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.applyPromoBtnText}>تطبيق الخصم</Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, styles.promoTextInput]}
                  placeholder="أدخل رمز الاسترداد أو كود الخصم"
                  placeholderTextColor={themeColors.outline}
                  value={inputCoupon}
                  onChangeText={(val) => {
                    setInputCoupon(val);
                    setCouponStatusMsg(null);
                  }}
                  autoCapitalize="characters"
                  textAlign="right"
                />
              </View>
              {couponStatusMsg && (
                <Text style={styles.couponStatusMsgText}>{couponStatusMsg}</Text>
              )}
            </View>
          )}
        </View>

        {/* Notes for Driver */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ملاحظات للكابتن</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="مثال: يرجى عدم الضغط على جرس الباب، أو الاتصال مسبقاً..."
            placeholderTextColor={themeColors.outline}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
        </View>

        {/* Final Payment Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>الحساب الإجمالي</Text>
        <View style={styles.summaryRow}>
            <Text style={styles.summaryVal}>{cartSubtotal.toLocaleString()} ر.ي</Text>
            <Text style={styles.summaryLbl}>مجموع السلة</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryVal}>{cartDeliveryFee.toLocaleString()} ر.ي</Text>
            <Text style={styles.summaryLbl}>رسوم التوصيل</Text>
          </View>
          {cartSubOrders.map((subOrder) => <View key={`store-delivery-${subOrder.storeId}`} style={styles.summaryRow}>
            <Text style={styles.summaryVal}>{subOrder.deliveryFee.toLocaleString()} ر.ي</Text>
            <Text style={styles.summaryLbl}>توصيل {subOrder.storeName}</Text>
          </View>)}
          {cartSubOrders.length > 1 && cartFarthestStoreDistanceKm > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryVal}>{cartFarthestStoreDistanceKm.toFixed(1)} كم</Text>
              <Text style={styles.summaryLbl}>المسافة إلى أبعد متجر</Text>
            </View>
          )}
          {cartDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountVal}>-{cartDiscount.toLocaleString()} ر.ي</Text>
              <Text style={styles.summaryLbl}>الخصم الترويجي</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.finalTotalRow}>
            <Text style={styles.finalTotalVal}>
              {cartTotal.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
            <Text style={styles.finalTotalLbl}>المبلغ المطلوب دفعه</Text>
          </View>
        </View>
        {isDeliveryQuoteLoading && <View style={styles.summaryRow}><ActivityIndicator size="small" /><Text style={styles.summaryLbl}>جارٍ حساب المسافة ورسوم التوصيل...</Text></View>}
        {!isDeliveryQuoteLoading && !hasDeliveryQuote && <TouchableOpacity style={styles.summaryRow} onPress={refreshDeliveryQuote}><Text style={[styles.summaryLbl, { color: themeColors.error }]}>تعذر حساب الرسوم. اضغط لإعادة المحاولة</Text></TouchableOpacity>}

        {/* Submit Order Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleConfirmOrder}
          disabled={isSubmitting || isDeliveryQuoteLoading || !hasDeliveryQuote}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator color={themeColors.onPrimary} size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>تأكيد الطلب وإرساله للكابتن 🚀</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Map Location Picker */}
      <LocationPickerModal
        visible={showMapPicker}
        title="تحديد موقع التوصيل على الخريطة"
        initialLat={selectedAddress?.latitude}
        initialLng={selectedAddress?.longitude}
        initialDistrict={selectedAddress?.district || ''}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationPicked}
      />
    </KeyboardAvoidingView>
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
    paddingBottom: 130,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  changeLink: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  addressBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    alignItems: 'flex-end',
  },
  missingAddressBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
  },
  missingAddressIcon: {
    fontSize: 24,
  },
  missingAddressTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    textAlign: 'right',
  },
  missingAddressSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  addressTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  addressDetails: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  storesCountBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  stopInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  stopNumber: {
    fontSize: 11,
    color: colors.outline,
  },
  stopName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  stopFee: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  methodOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.baseXs,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  methodOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixedDim + '20',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.baseSm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  methodInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  methodTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  methodIcon: {
    fontSize: 16,
  },
  methodTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  methodDesc: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  transferDetailsWrap: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginTop: spacing.baseXs,
  },
  bankAccountsCard: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseSm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.baseSm,
  },
  bankTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 4,
  },
  bankItem: {
    fontSize: 10,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 2,
  },
  bankBold: {
    fontWeight: typography.fontWeight.bold,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.baseSm,
    height: 42,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    marginBottom: spacing.baseSm,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 8,
    marginBottom: 0,
    marginTop: spacing.baseXs,
  },
  uploadBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '50',
  },
  uploadBtnAttached: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primary,
  },
  uploadBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLbl: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  summaryVal: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.onSurface,
  },
  discountVal: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant + '30',
    marginVertical: spacing.baseXs,
  },
  finalTotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  finalTotalLbl: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  finalTotalVal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  curr: {
    fontSize: typography.fontSize.xs,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
    marginTop: spacing.baseXs,
  },
  confirmBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  activePromoWrap: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: '#10B98150',
  },
  activePromoHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  promoBadge: {
    backgroundColor: '#10B981',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  promoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  removePromoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removePromoBtnText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
  },
  promoMessageText: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'right',
    marginTop: 4,
    fontWeight: typography.fontWeight.medium,
  },
  promoSavingText: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'right',
    marginTop: 2,
    fontWeight: typography.fontWeight.bold,
  },
  promoInputRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
  },
  promoTextInput: {
    flex: 1,
    marginBottom: 0,
  },
  applyPromoBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyPromoBtnDisabled: {
    opacity: 0.5,
  },
  applyPromoBtnText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  couponStatusMsgText: {
    fontSize: 11,
    color: colors.error,
    textAlign: 'right',
    marginTop: 6,
    paddingRight: 4,
  },
});
