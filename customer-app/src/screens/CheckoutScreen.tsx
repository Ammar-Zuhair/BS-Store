import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { governorateApi } from '../api';
import { PaymentMethodType, TransferProviderType } from '../types';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';
import { AppIcon } from '../components/AppIcon';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { chooseTransferReceipt, TransferReceiptImage } from '../utils/transferReceipt';
import { isOpenNow } from '../utils/openingHours';

type CheckoutTextProps = React.ComponentProps<typeof Text>;

const CheckoutText: React.FC<CheckoutTextProps> = ({ style, ...props }) => {
  const flattenedStyle = StyleSheet.flatten(style);
  const weight = flattenedStyle?.fontWeight;
  const fontFamily = flattenedStyle?.fontFamily || (
    weight === '900' ? typography.fontFamily.black
      : weight === '800' ? typography.fontFamily.extraBold
        : weight === 'bold' || weight === '700' ? typography.fontFamily.bold
          : weight === '600' || weight === '500' || weight === 600 || weight === 500 ? typography.fontFamily.medium
            : typography.fontFamily.regular
  );

  return <Text {...props} style={[style, { fontFamily }]} />;
};

export const CheckoutScreen: React.FC = () => {
  const {
    selectedAddress,
    addNewAddress,
    cartTotal,
    cartDeliveryFee,
    cartFarthestStoreDistanceKm,
    isDeliveryQuoteLoading,
    deliveryQuoteError,
    hasDeliveryQuote,
    refreshDeliveryQuote,
    cartSubtotal,
    cartDiscount,
    cartSubOrders,
    promoCode,
    activeOrderDiscountDeal,
    promoMessage,
    applyPromoCode,
    clearPromoCode,
    placeOrder,
    navigateTo,
    isAuthenticated,
    orderHours,
    businessNow,
    stores,
    colors: themeColors,
  } = useApp();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const ordersClosed = orderHours?.isEnabled && isOpenNow(orderHours, businessNow) === false;
  const closedStore = stores.find(store => cartSubOrders.some(group => group.storeId === store.id) &&
    (store.isActive === false || isOpenNow(store, businessNow) === false));
  const closureMessage = ordersClosed ? 'استقبال الطلبات مغلق الآن. راجع المواعيد أعلى الصفحة الرئيسية.'
    : closedStore ? `المتجر ${closedStore.name} مغلق الآن. راجع مواعيده في تفاصيل المتجر.` : null;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH_ON_DELIVERY');
  const [transferProvider, setTransferProvider] = useState<TransferProviderType | null>(null);
  const [transferReceipt, setTransferReceipt] = useState<TransferReceiptImage | null>(null);
  const [transferRef, setTransferRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [inputCoupon, setInputCoupon] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponStatusMsg, setCouponStatusMsg] = useState<string | null>(null);
  const [hasSelectedGovernorate, setHasSelectedGovernorate] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    governorateApi.mine()
      .then(({ governorateId }) => {
        if (!cancelled) setHasSelectedGovernorate(Boolean(governorateId));
      })
      .catch(() => {
        if (!cancelled) setHasSelectedGovernorate(null);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

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

  const handleChooseReceipt = async () => {
    try {
      const image = await chooseTransferReceipt();
      if (image) setTransferReceipt(image);
    } catch (error: any) {
      Alert.alert('تعذر اختيار الإيصال', error?.message || 'تحقق من صلاحية الوصول إلى الصور وحاول مجدداً.');
    }
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
      if (hasSelectedGovernorate === false) {
        Alert.alert(
          'اختيار المحافظة مطلوب',
          'اختر محافظة التسوق من الملف الشخصي أولاً، ثم ارجع إلى إتمام الطلب وأعد المحاولة.',
          [
            { text: 'لاحقاً', style: 'cancel' },
            { text: 'فتح الملف الشخصي', onPress: () => navigateTo('profile') },
          ]
        );
      } else {
        Alert.alert('تعذر حساب رسوم التوصيل', 'تحقق من عنوانك ومحافظة التسوق ثم أعد المحاولة.');
      }
      return;
    }

    if (paymentMethod === 'MANUAL_TRANSFER' && !transferRef.trim()) {
      Alert.alert('رقم العملية مطلوب', 'أدخل رقم الحوالة أو العملية الظاهر في الإيصال.');
      return;
    }
    if (paymentMethod === 'MANUAL_TRANSFER' && !transferProvider) {
      Alert.alert('اختر طريقة التحويل', 'حدد بنك الكريمي أو التحويل من المحفظة لعرض بيانات الحساب.');
      return;
    }
    if (paymentMethod === 'MANUAL_TRANSFER' && !transferReceipt) {
      Alert.alert('صورة الإيصال مطلوبة', 'أرفق صورة واضحة لإيصال التحويل قبل إرسال الطلب.');
      return;
    }

    setIsSubmitting(true);
    try {
      await placeOrder(
        paymentMethod,
        {
          receiptUri: transferReceipt?.uri,
          receiptFileName: transferReceipt?.fileName,
          receiptMimeType: transferReceipt?.mimeType,
          transferProvider: paymentMethod === 'MANUAL_TRANSFER' ? transferProvider ?? undefined : undefined,
          transferReference: paymentMethod === 'MANUAL_TRANSFER' ? transferRef.trim() : undefined,
          notes: [notes, paymentMethod === 'MANUAL_TRANSFER' ? `رقم الحوالة: ${transferRef.trim()}` : '']
            .filter(Boolean)
            .join('\n'),
        }
      );
    } catch {
      // error handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header title="إتمام الطلب والدفع" showBack onBack={() => navigateTo('cart')} />

      <KeyboardAwareScrollView
        avoidKeyboard={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(true)} accessibilityRole="button" accessibilityLabel={selectedAddress ? 'تعديل عنوان التوصيل' : 'إضافة عنوان توصيل'}>
              <CheckoutText style={styles.changeLink}>{selectedAddress ? 'تعديل أو تغيير' : '+ إضافة عنوان'}</CheckoutText>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <CheckoutText style={styles.cardTitle}>عنوان التوصيل</CheckoutText>
              <AppIcon name="map-pin" size={19} color={themeColors.primary} />
            </View>
          </View>
          {selectedAddress ? (
            <View style={styles.addressBox}>
              <CheckoutText style={styles.addressTitle}>
                {selectedAddress.label} - {selectedAddress.city}، {selectedAddress.district}
              </CheckoutText>
              <CheckoutText style={styles.addressDetails}>{selectedAddress.street}</CheckoutText>
              {selectedAddress.building && (
                <CheckoutText style={styles.addressDetails}>{selectedAddress.building}</CheckoutText>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.missingAddressBtn}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="اختيار موقع التوصيل على الخريطة"
            >
              <AppIcon name="map" size={22} color={themeColors.primary} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <CheckoutText style={styles.missingAddressTitle}>لم يتم تحديد موقع التوصيل</CheckoutText>
                <CheckoutText style={styles.missingAddressSub}>اضغط هنا لاختيار موقعك بدقة على الخريطة (GPS)</CheckoutText>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Multi-store order review summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckoutText style={styles.storesCountBadge}>{cartSubOrders.length} متاجر</CheckoutText>
            <View style={styles.headerRight}>
              <CheckoutText style={styles.cardTitle}>ملخص محطات الاستلام</CheckoutText>
              <AppIcon name="store" size={19} color={themeColors.primary} />
            </View>
          </View>
          {cartSubOrders.map((so, idx) => (
            <View key={so.storeId} style={styles.stopRow}>
              <CheckoutText style={styles.stopFee}>{so.subtotal.toLocaleString()} ر.ي</CheckoutText>
              <View style={styles.stopInfo}>
                <CheckoutText style={styles.stopNumber}>محطة {idx + 1}:</CheckoutText>
                <CheckoutText style={styles.stopName}>{so.storeName}</CheckoutText>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View />
            <View style={styles.headerRight}>
              <CheckoutText style={styles.cardTitle}>طريقة الدفع</CheckoutText>
              <AppIcon name="credit-card" size={19} color={themeColors.primary} />
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
            accessibilityRole="radio"
            accessibilityLabel="الدفع نقداً عند الاستلام"
            accessibilityState={{ checked: paymentMethod === 'CASH_ON_DELIVERY' }}
          >
            <View style={styles.radio}>
              {paymentMethod === 'CASH_ON_DELIVERY' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <CheckoutText style={styles.methodTitle}>الدفع نقداً عند الاستلام (COD)</CheckoutText>
                <AppIcon name="cash" size={18} color={themeColors.primary} />
              </View>
              <CheckoutText style={styles.methodDesc}>
                ادفع للكابتن بعد استلام جميع الطلبات ومطابقتها
              </CheckoutText>
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
            accessibilityRole="radio"
            accessibilityLabel="تحويل بنكي أو إشعار سداد"
            accessibilityState={{ checked: paymentMethod === 'MANUAL_TRANSFER' }}
          >
            <View style={styles.radio}>
              {paymentMethod === 'MANUAL_TRANSFER' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <CheckoutText style={styles.methodTitle}>تحويل بنكي / إشعار سداد</CheckoutText>
                <AppIcon name="bank" size={18} color={themeColors.primary} />
              </View>
              <CheckoutText style={styles.methodDesc}>
                اختر بنك الكريمي أو التحويل من المحفظة، ثم أرفق صورة الإيصال
              </CheckoutText>
            </View>
          </TouchableOpacity>

          {/* Bank Transfer Details Form (When Manual Transfer is chosen) */}
          {paymentMethod === 'MANUAL_TRANSFER' && (
            <View style={styles.transferDetailsWrap}>
              <CheckoutText style={styles.inputLabel}>اختر طريقة التحويل:</CheckoutText>
              <TouchableOpacity
                style={[styles.transferProviderOption, transferProvider === 'ALKURAIMI' && styles.transferProviderOptionActive]}
                onPress={() => setTransferProvider('ALKURAIMI')}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: transferProvider === 'ALKURAIMI' }}
              >
                <View style={styles.radio}>
                  {transferProvider === 'ALKURAIMI' && <View style={styles.radioInner} />}
                </View>
                <CheckoutText style={styles.transferProviderTitle}>بنك الكريمي</CheckoutText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.transferProviderOption, transferProvider === 'WALLET' && styles.transferProviderOptionActive]}
                onPress={() => setTransferProvider('WALLET')}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: transferProvider === 'WALLET' }}
              >
                <View style={styles.radio}>
                  {transferProvider === 'WALLET' && <View style={styles.radioInner} />}
                </View>
                <CheckoutText style={styles.transferProviderTitle}>محفظة إلكترونية</CheckoutText>
              </TouchableOpacity>

              <View style={styles.bankAccountsCard}>
                <CheckoutText style={styles.bankTitle}>حوّل إجمالي الفاتورة إلى:</CheckoutText>
                <CheckoutText style={styles.bankItem}>المبلغ المطلوب: <CheckoutText style={styles.bankBold}>{cartTotal.toLocaleString()} ر.ي</CheckoutText></CheckoutText>
                {transferProvider === 'ALKURAIMI' ? <>
                  <CheckoutText style={styles.bankItem}>الجهة: <CheckoutText style={styles.bankBold}>نقطة حاسب التابعة لبنك الكريمي</CheckoutText></CheckoutText>
                  <CheckoutText style={styles.bankItem}>رقم نقطة حاسب: <CheckoutText style={styles.bankBold}>1888356</CheckoutText></CheckoutText>
                  <CheckoutText style={styles.bankItem}>باسم: <CheckoutText style={styles.bankBold}>متجر بي اس</CheckoutText></CheckoutText>
                </> : transferProvider === 'WALLET' ? <>
                  <CheckoutText style={styles.bankItem}>رقم المحفظة: <CheckoutText style={styles.bankBold}>783053937</CheckoutText></CheckoutText>
                  <CheckoutText style={styles.bankItem}>اسم صاحب الحساب: <CheckoutText style={styles.bankBold}>بلال سعيد المقطري</CheckoutText></CheckoutText>
                </> : <CheckoutText style={styles.bankItem}>اختر طريقة التحويل لعرض بيانات المستلم.</CheckoutText>}
              </View>

              <CheckoutText style={styles.inputLabel}>رقم الحوالة أو العملية:</CheckoutText>
              <TextInput
                style={styles.textInput}
                placeholder="أدخل رقم الإشعار / الحوالة"
                placeholderTextColor={themeColors.outline}
                value={transferRef}
                onChangeText={setTransferRef}
                textAlign="right"
                accessibilityLabel="رقم الحوالة أو العملية"
              />

              <TouchableOpacity
                style={[styles.uploadBtn, transferReceipt && styles.uploadBtnAttached]}
                onPress={() => void handleChooseReceipt()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={transferReceipt ? 'تغيير صورة إيصال التحويل' : 'اختيار صورة إيصال التحويل'}
              >
                <CheckoutText style={styles.uploadBtnText}>{transferReceipt ? 'تغيير صورة الإيصال' : 'إرفاق صورة إيصال التحويل'}</CheckoutText>
              </TouchableOpacity>
              {transferReceipt && <Image source={{ uri: transferReceipt.uri }} style={styles.receiptPreview} resizeMode="cover" />}

            </View>
          )}
        </View>

        {/* Promo / Redemption Code Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View />
            <View style={styles.headerRight}>
              <CheckoutText style={styles.cardTitle}>كود أو عرض الخصم</CheckoutText>
              <AppIcon name="tag" size={19} color={themeColors.primary} />
            </View>
          </View>

          {promoCode || activeOrderDiscountDeal ? (
            <View style={styles.activePromoWrap}>
              <View style={styles.activePromoHeader}>
                <TouchableOpacity onPress={handleClearPromo} style={styles.removePromoBtn} accessibilityRole="button" accessibilityLabel="إلغاء كود الخصم">
                  <AppIcon name="close" size={14} color={themeColors.error} />
                  <CheckoutText style={styles.removePromoBtnText}>إلغاء الخصم</CheckoutText>
                </TouchableOpacity>
                <View style={styles.promoBadge}>
                <CheckoutText style={styles.promoBadgeText}>✓ {promoCode || activeOrderDiscountDeal?.title}</CheckoutText>
                </View>
              </View>
              {!!promoMessage && (
                <CheckoutText style={styles.promoMessageText}>{promoMessage}</CheckoutText>
              )}
              {cartDiscount > 0 && (
                <CheckoutText style={styles.promoSavingText}>
                  تم توفير {cartDiscount.toLocaleString()} ر.ي من إجمالي الطلب
                </CheckoutText>
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
                    <ActivityIndicator size="small" color={themeColors.onPrimary} />
                  ) : (
                    <CheckoutText style={styles.applyPromoBtnText}>تطبيق الخصم</CheckoutText>
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
                  accessibilityLabel="رمز الاسترداد أو كود الخصم"
                />
              </View>
              {couponStatusMsg && (
                <CheckoutText style={styles.couponStatusMsgText}>{couponStatusMsg}</CheckoutText>
              )}
            </View>
          )}
        </View>

        {/* Notes for Driver */}
        <View style={styles.card}>
          <CheckoutText style={styles.cardTitle}>ملاحظات للكابتن</CheckoutText>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="مثال: يرجى عدم الضغط على جرس الباب، أو الاتصال مسبقاً..."
            placeholderTextColor={themeColors.outline}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
            accessibilityLabel="ملاحظات للكابتن"
          />
        </View>

        {/* Final Payment Breakdown */}
        <View style={styles.card}>
          <CheckoutText style={styles.cardTitle}>الحساب الإجمالي</CheckoutText>
        <View style={styles.summaryRow}>
            <CheckoutText style={styles.summaryVal}>{cartSubtotal.toLocaleString()} ر.ي</CheckoutText>
            <CheckoutText style={styles.summaryLbl}>مجموع السلة</CheckoutText>
          </View>
          <View style={styles.summaryRow}>
            <CheckoutText style={styles.summaryVal}>{cartDeliveryFee.toLocaleString()} ر.ي</CheckoutText>
            <CheckoutText style={styles.summaryLbl}>رسوم التوصيل</CheckoutText>
          </View>
          {cartSubOrders.map((subOrder) => <View key={`store-delivery-${subOrder.storeId}`} style={styles.summaryRow}>
            <CheckoutText style={styles.summaryVal}>{subOrder.deliveryFee.toLocaleString()} ر.ي</CheckoutText>
            <CheckoutText style={styles.summaryLbl}>توصيل {subOrder.storeName}</CheckoutText>
          </View>)}
          {cartSubOrders.length > 1 && cartFarthestStoreDistanceKm > 0 && (
            <View style={styles.summaryRow}>
              <CheckoutText style={styles.summaryVal}>{cartFarthestStoreDistanceKm.toFixed(1)} كم</CheckoutText>
              <CheckoutText style={styles.summaryLbl}>المسافة إلى أبعد متجر</CheckoutText>
            </View>
          )}
          {cartDiscount > 0 && (
            <View style={styles.summaryRow}>
              <CheckoutText style={styles.discountVal}>-{cartDiscount.toLocaleString()} ر.ي</CheckoutText>
              <CheckoutText style={styles.summaryLbl}>الخصم الترويجي</CheckoutText>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.finalTotalRow}>
            <CheckoutText style={styles.finalTotalVal}>
              {cartTotal.toLocaleString()} <CheckoutText style={styles.curr}>ر.ي</CheckoutText>
            </CheckoutText>
            <CheckoutText style={styles.finalTotalLbl}>المبلغ المطلوب دفعه</CheckoutText>
          </View>
        </View>
        {isDeliveryQuoteLoading && <View style={styles.summaryRow}><ActivityIndicator size="small" /><CheckoutText style={styles.summaryLbl}>جارٍ حساب المسافة ورسوم التوصيل...</CheckoutText></View>}
        {!isDeliveryQuoteLoading && !hasDeliveryQuote && (
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={hasSelectedGovernorate === false ? () => navigateTo('profile') : refreshDeliveryQuote}
          >
            <CheckoutText style={[styles.summaryLbl, { color: themeColors.error }]}>
              {hasSelectedGovernorate === false
                ? 'اختر محافظة التسوق من الملف الشخصي لحساب رسوم التوصيل'
                : deliveryQuoteError || 'تعذر حساب الرسوم. اضغط لإعادة المحاولة'}
            </CheckoutText>
          </TouchableOpacity>
        )}

        {/* Submit Order Button */}
        {closureMessage && <CheckoutText style={{ fontFamily: typography.fontFamily.bold, color: themeColors.error, textAlign: 'right', marginBottom: 12 }}>{closureMessage}</CheckoutText>}
        <TouchableOpacity
          style={[styles.confirmBtn, (isSubmitting || Boolean(closureMessage)) && { opacity: 0.7 }]}
          onPress={handleConfirmOrder}
          disabled={isSubmitting || isDeliveryQuoteLoading || !hasDeliveryQuote || Boolean(closureMessage)}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="تأكيد الطلب وإرساله للكابتن"
          accessibilityState={{ disabled: isSubmitting || isDeliveryQuoteLoading || !hasDeliveryQuote || Boolean(closureMessage), busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={themeColors.onPrimary} size="small" />
          ) : (
            <>
              <AppIcon name="check" size={19} color={themeColors.onPrimary} />
              <CheckoutText style={styles.confirmBtnText}>تأكيد الطلب وإرساله للكابتن</CheckoutText>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

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
  transferProviderOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: spacing.baseXs,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: spacing.baseXs,
  },
  transferProviderOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixedDim + '20',
  },
  transferProviderTitle: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
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
    fontFamily: typography.fontFamily.regular,
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
  receiptPreview: {
    width: '100%',
    height: 170,
    borderRadius: borderRadius.md,
    marginTop: spacing.baseXs,
    backgroundColor: colors.surfaceContainerLow,
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
    flexDirection: 'row-reverse',
    gap: 8,
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
    borderColor: colors.success + '50',
  },
  activePromoHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  promoBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  promoBadgeText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  removePromoBtn: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
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
    color: colors.success,
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
    minHeight: 44,
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
