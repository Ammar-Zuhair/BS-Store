import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';

export const PurchaseReceiptScreen: React.FC = () => {
  const { activeTask, savePurchaseDocumentation, navigateTo } = useDriver();

  const [actualPrices, setActualPrices] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState('');
  const [saving, setSaving] = useState(false);

  if (!activeTask) {
    return (
      <View style={styles.container}>
        <DriverHeader title="توثيق المشتريات" showBack onBack={() => navigateTo('route')} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>لا توجد مهمة شراء نشطة</Text>
        </View>
      </View>
    );
  }

  const currentStoreStop = activeTask.stops.find((stop) => stop.type === 'PICKUP_STORE' && stop.status !== 'COMPLETED');
  const itemsForPurchase = activeTask.itemsToPurchase.filter((item) => currentStoreStop && (item.storeId === currentStoreStop.id.replace('stop-store-', '') || item.storeName === currentStoreStop.name));

  const totalActual = itemsForPurchase.reduce((sum, item) => sum + (Number(actualPrices[item.id]) || 0) * item.quantity, 0);
  const expectedTotal = itemsForPurchase.reduce((sum, item) => sum + (Number(item.expectedPrice) || 0) * item.quantity, 0);
  const diff = totalActual - expectedTotal;

  const handleConfirmPurchase = async () => {
    if (!itemsForPurchase.length || itemsForPurchase.some((item) => !(Number(actualPrices[item.id]) > 0))) {
      Alert.alert('بيانات ناقصة', 'أدخل سعر الشراء الفعلي لكل صنف في الطلب.');
      return;
    }
    try {
      if (!receiptUri) { Alert.alert('الصورة مطلوبة', 'اختر صورة فاتورة المتجر أولاً.'); return; }
      setSaving(true);
      await savePurchaseDocumentation(itemsForPurchase.map((item) => ({ id: item.id, actualPrice: Number(actualPrices[item.id]) })), receiptUri);
      Alert.alert('تم توثيق المشتريات', `تم تسجيل مشتريات بقيمة ${totalActual.toLocaleString()} ر.ي.`);
    } catch (error: any) {
      Alert.alert('تعذر حفظ المشتريات', error?.message || 'تحقق من اتصال الشبكة وحاول مجدداً.');
    } finally { setSaving(false); }
  };

  const chooseReceipt = async () => {
    Alert.alert('صورة فاتورة المتجر', 'التقط السند الآن أو اختر صورة محفوظة.', [
      { text: 'التقاط صورة', onPress: async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('صلاحية الكاميرا مطلوبة', 'اسمح للتطبيق باستخدام الكاميرا لتصوير الفاتورة.'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.65 });
        if (!result.canceled) setReceiptUri(result.assets[0].uri);
      } },
      { text: 'اختيار من الصور', onPress: async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { Alert.alert('صلاحية الصور مطلوبة', 'اسمح للتطبيق بالوصول للصور.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.65 });
        if (!result.canceled) setReceiptUri(result.assets[0].uri);
      } },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <DriverHeader title="توثيق مشتريات المتجر" showBack onBack={() => navigateTo('route')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity style={styles.receiptPicker} onPress={chooseReceipt}>
          {receiptUri ? <Image source={{ uri: receiptUri }} style={styles.receiptThumb} /> : <Text style={styles.receiptPickerText}>📷 اختر صورة فاتورة {currentStoreStop?.name || 'المتجر'} (مطلوبة)</Text>}
        </TouchableOpacity>
        {/* Step Context Indicator */}
        <View style={styles.contextHeader}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>خطوة ٢ من ٤</Text>
          </View>
          <View style={styles.contextText}>
            <Text style={styles.contextTitle}>طلب #{activeTask.orderNumber} • تسوق خارجي</Text>
          </View>
        </View>

        {/* Store Card */}
        <View style={styles.storeCard}>
          <View style={styles.storeBadgeCol}>
            <View style={styles.brokerageTag}>
              <Text style={styles.brokerageText}>وساطة شراء</Text>
            </View>
            <Text style={styles.paymentNote}>دفع كاش مباشر</Text>
          </View>

          <View style={styles.storeMain}>
            <View style={styles.storeIconWrap}>
              <Text style={styles.storeIcon}>🍽️</Text>
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{currentStoreStop?.name || 'المتجر المحدد في الطلب'}</Text>
              <Text style={styles.storeAddr}>📍 {currentStoreStop?.address || 'العنوان غير متوفر في بيانات الطلب'}</Text>
            </View>
          </View>
        </View>

        {/* Notice Banner: Petty Cash Impact */}
        <View style={styles.pettyCashNotice}>
          <View style={styles.noticeIconWrap}>
            <Text style={styles.noticeIcon}>💵</Text>
          </View>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>إشعار قيد العهدة النقدية</Text>
            <Text style={styles.noticeBody}>
              سيتم خصم المبلغ المدخل من العهدة النقدية المتوقعة بحوزتك آلياً بموجب سند الصرف فور إرفاق الفاتورة وتأكيد الشراء.
            </Text>
          </View>
        </View>

        {/* Purchased Items Form */}
        <Text style={styles.formSectionTitle}>قائمة الأصناف المطلوب شراؤها من الكاشير</Text>

        {itemsForPurchase.map((item) => {
          const expectedUnit = Number(item.expectedPrice) || 0;
          const entered = Number(actualPrices[item.id]) || 0;
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />}
                <View style={styles.itemDetails}>
                  <View style={styles.itemTitleRow}>
                    <View style={styles.qtyBadge}><Text style={styles.qtyBadgeText}>الكمية: {item.quantity}</Text></View>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.expectedPriceText}>السعر المتوقع للوحدة: <Text style={styles.boldText}>{expectedUnit.toLocaleString()} ر.ي</Text></Text>
                </View>
              </View>
              <View style={styles.inputBox}>
                <View style={styles.labelRow}>
                  <Text style={entered > 0 ? (entered === expectedUnit ? styles.diffMatch : styles.diffMismatch) : styles.diffMismatch}>
                    {entered > 0 ? (entered === expectedUnit ? 'مطابق للمتوقع' : `الإجمالي: ${(entered * item.quantity).toLocaleString()} ر.ي`) : 'أدخل السعر'}
                  </Text>
                  <Text style={styles.inputLabel}>سعر الوحدة الفعلي (ر.ي):</Text>
                </View>
                <TextInput
                  style={styles.priceInput}
                  value={actualPrices[item.id] || ''}
                  onChangeText={(value) => setActualPrices((prev) => ({ ...prev, [item.id]: value }))}
                  keyboardType="numeric"
                  textAlign="left"
                />
              </View>
            </View>
          );
        })}

        {/* Total Cost Summary */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalVal}>{totalActual.toLocaleString()} ر.ي</Text>
            <Text style={styles.totalLbl}>إجمالي المبلغ المدفوع للكاشير:</Text>
          </View>
          {diff !== 0 && (
            <Text style={styles.diffWarning}>
              تنبيه: يوجد فارق قدره {Math.abs(diff)} ر.ي مقارنة بالنظام
            </Text>
          )}
        </View>

        {/* Submit Confirmation Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleConfirmPurchase}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>حفظ سند المتجر والتقدم ✓</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    paddingBottom: 110,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenGutter,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  contextHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  contextText: {
    alignItems: 'flex-end',
  },
  contextTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stepPill: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  stepPillText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.medium,
  },
  storeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  storeMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
    flex: 1,
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeIcon: {
    fontSize: 20,
  },
  storeInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  storeName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  storeAddr: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  storeBadgeCol: {
    alignItems: 'flex-start',
  },
  brokerageTag: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  brokerageText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimaryFixed,
  },
  paymentNote: {
    fontSize: 9,
    color: colors.outline,
    marginTop: 2,
  },
  pettyCashNotice: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  noticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  noticeTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  noticeBody: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 15,
  },
  formSectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: spacing.baseXs,
  },
  itemCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  itemTop: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  itemThumb: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
  },
  itemDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  qtyBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  qtyBadgeText: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  expectedPriceText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  boldText: {
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  inputBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
  },
  diffMatch: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  diffMismatch: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  priceInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    height: 38,
    paddingHorizontal: spacing.baseSm,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  receiptProofCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  proofHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  proofTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  proofIcon: {
    fontSize: 14,
  },
  proofTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  proofTag: {
    backgroundColor: colors.secondaryContainer + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  proofTagText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  receiptActionGrid: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
  },
  uploadBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.baseSm,
    height: 100,
  },
  cameraIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cameraIcon: {
    fontSize: 18,
  },
  uploadText: {
    fontSize: 10,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.bold,
  },
  receiptPreviewBox: {
    flex: 1,
    height: 100,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkTag: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  checkTagText: {
    fontSize: 9,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  totalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLbl: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  totalVal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  diffWarning: {
    fontSize: 10,
    color: colors.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
    marginTop: 4,
  },
  receiptPicker: { minHeight: 96, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18, backgroundColor: '#fff', padding: 10 },
  receiptPickerText: { color: colors.primary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  receiptThumb: { width: '100%', height: 170, borderRadius: 12 },
  submitBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});
