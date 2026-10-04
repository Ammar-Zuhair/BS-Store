import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';
import { BoosthisScreenTracker } from '../monitoring/BoosthisRuntime';

export const StorePurchaseScreen: React.FC = () => {
  const { activeTask, recordStorePurchase, startPriceChangeContact, navigateTo, refreshData, isRefreshing } = useDriver();
  const [actualPrices, setActualPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries((activeTask?.itemsToPurchase ?? []).map((item) => [item.id, String(item.customerPrice)]))
  );
  const [contactAttempts, setContactAttempts] = useState<Record<string, { id: string; contactInitiatedAt: string }>>({});
  const [customerConfirmed, setCustomerConfirmed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const currentStoreStop = activeTask?.stops.find((stop) => stop.type === 'PICKUP_STORE' && stop.status !== 'COMPLETED');
  const items = useMemo(() => activeTask?.itemsToPurchase.filter((item) =>
    currentStoreStop && (item.storeId === currentStoreStop.id.replace('stop-store-', '') || item.storeName === currentStoreStop.name)
  ) ?? [], [activeTask, currentStoreStop]);
  const totalActual = items.reduce((sum, item) => sum + (Number(actualPrices[item.id]) || 0) * item.quantity, 0);
  const hasPriceChange = items.some((item) => Number(actualPrices[item.id]) !== item.customerPrice);

  const contactCustomer = async (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId);
    const proposedPrice = Number(actualPrices[itemId]);
    if (!item || !Number.isFinite(proposedPrice) || proposedPrice <= 0 || Math.round(proposedPrice * 100) !== proposedPrice * 100) {
      Alert.alert('السعر غير صالح', 'أدخل سعراً أكبر من صفر وبحد أقصى منزلتين عشريتين أولاً.');
      return;
    }
    if (activeTask?.status !== 'PURCHASING') {
      Alert.alert('تغيير السعر غير متاح', 'لا يمكن تغيير سعر الصنف في مرحلة المهمة الحالية. سجّل سعر فاتورة العميل أو راجع الإدارة.');
      return;
    }
    const phone = activeTask.customerPhone?.replace(/[^+\d]/g, '');
    if (!phone) {
      Alert.alert('تعذر الاتصال', 'لا يتوفر رقم هاتف صالح للعميل في بيانات الطلب.');
      return;
    }
    try {
      const attempt = await startPriceChangeContact(itemId, proposedPrice);
      setContactAttempts((current) => ({ ...current, [itemId]: attempt }));
      setCustomerConfirmed((current) => ({ ...current, [itemId]: false }));
    } catch (error: any) {
      Alert.alert('تعذر بدء الاتصال', error?.message || 'حدّث بيانات الطلب وحاول مجدداً.');
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('تعذر الاتصال', 'تعذر فتح تطبيق الاتصال على هذا الجهاز.');
    }
  };

  const save = async () => {
    if (!items.length || items.some((item) => {
      const price = Number(actualPrices[item.id]);
      return !Number.isFinite(price) || price <= 0 || Math.round(price * 100) !== price * 100;
    })) {
      Alert.alert('بيانات ناقصة', 'أدخل سعراً أكبر من صفر وبحد أقصى منزلتين عشريتين لكل صنف.');
      return;
    }
    const changedItems = items.filter((item) => Number(actualPrices[item.id]) !== item.customerPrice);
    if (changedItems.length > 0 && activeTask?.status !== 'PURCHASING') {
      Alert.alert('تغيير السعر غير متاح', 'لا يمكن تغيير سعر الصنف في مرحلة المهمة الحالية. سجّل سعر فاتورة العميل أو راجع الإدارة.');
      return;
    }
    if (changedItems.some((item) => !contactAttempts[item.id] || !customerConfirmed[item.id])) {
      Alert.alert('تأكيد إبلاغ العميل مطلوب', 'اتصل بالعميل لكل صنف تغير سعره، ثم أقر بإبلاغه قبل حفظ الشراء.');
      return;
    }
    setSaving(true);
    try {
      await recordStorePurchase(items.map((item) => ({
        id: item.id,
        actualPrice: Number(actualPrices[item.id]),
        priceChangeContactAttemptId: contactAttempts[item.id]?.id,
        customerContactConfirmed: customerConfirmed[item.id],
      })));
      Alert.alert('تم حفظ المشتريات', `سُجلت تكلفة المتجر بمبلغ ${totalActual.toLocaleString()} ر.ي.`);
    } catch (error: any) {
      Alert.alert('تعذر حفظ المشتريات', error?.message || 'تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  if (!activeTask) {
    return (
      <View style={styles.container}>
        <DriverHeader title="تسجيل مشتريات المتجر" showBack onBack={() => navigateTo('route')} />
        <View style={styles.empty}><Text style={styles.emptyText}>لا توجد مهمة شراء نشطة</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BoosthisScreenTracker key={hasPriceChange ? 'PriceChange' : 'Purchase'} screen={hasPriceChange ? 'PriceChange' : 'Purchase'} />
      <DriverHeader title="تسجيل مشتريات المتجر" showBack onBack={() => navigateTo('route')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={[colors.primary]} />}>
        <View style={styles.storeCard}>
          <Text style={styles.storeName}>{currentStoreStop?.name || 'المتجر'}</Text>
          <Text style={styles.storeAddress}>{currentStoreStop?.address || 'عنوان المتجر غير متوفر'}</Text>
          <Text style={styles.help}>أدخل سعر الوحدة الموجود في المتجر. إذا اختلف عن فاتورة العميل فسيصبح السعر الجديد لهذا الطلب وللعملاء لاحقاً بعد إبلاغ العميل.</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>الكمية: {item.quantity}</Text>
              <Text style={styles.expected}>سعر الشراء المتوقع للوحدة: {item.expectedPrice.toLocaleString()} ر.ي</Text>
              <Text style={styles.expected}>السعر الحالي في فاتورة العميل: {item.customerPrice.toLocaleString()} ر.ي</Text>
              {Number(actualPrices[item.id]) !== item.customerPrice && (
                <View style={styles.priceChangeBox}>
                  <Text style={styles.priceChangeText}>السابق: {item.customerPrice.toLocaleString()} ر.ي</Text>
                  <Text style={styles.priceChangeText}>الجديد: {(Number(actualPrices[item.id]) || 0).toLocaleString()} ر.ي</Text>
                  <Text style={styles.priceChangeText}>الفرق: {((Number(actualPrices[item.id]) || 0) - item.customerPrice).toLocaleString()} ر.ي للوحدة</Text>
                  <Text style={styles.callHint}>يجب إبلاغ العميل بتغير السعر قبل تأكيد الشراء.</Text>
                  <TouchableOpacity style={styles.callButton} onPress={() => void contactCustomer(item.id)}>
                    <Text style={styles.callButtonText}>اتصال بالعميل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmRow}
                    onPress={() => setCustomerConfirmed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                    disabled={!contactAttempts[item.id]}
                  >
                    <View style={[styles.checkbox, customerConfirmed[item.id] && styles.checkboxChecked]}>
                      {customerConfirmed[item.id] && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.confirmText}>أؤكد أنني أبلغت العميل بتغير السعر</Text>
                  </TouchableOpacity>
                  {!!contactAttempts[item.id] && <Text style={styles.contactTime}>تم تسجيل بدء محاولة الاتصال: {new Date(contactAttempts[item.id].contactInitiatedAt).toLocaleTimeString('ar-YE')}</Text>}
                </View>
              )}
            </View>
            {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
            <View style={styles.priceRow}>
              <Text style={styles.fieldLabel}>السعر الفعلي للوحدة (ر.ي)</Text>
              <TextInput
                style={styles.input}
                value={actualPrices[item.id] ?? ''}
                onChangeText={(value) => {
                  setActualPrices((current) => ({ ...current, [item.id]: value }));
                  setContactAttempts((current) => { const next = { ...current }; delete next[item.id]; return next; });
                  setCustomerConfirmed((current) => ({ ...current, [item.id]: false }));
                }}
                keyboardType="numeric"
                textAlign="center"
                placeholder="أدخل السعر"
              />
              <Text style={styles.lineTotal}>إجمالي الصنف بعد التحديث: {((Number(actualPrices[item.id]) || 0) * item.quantity).toLocaleString()} ر.ي</Text>
            </View>
          </View>
        ))}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>إجمالي تكلفة الشراء الفعلية</Text>
          <Text style={styles.total}>{totalActual.toLocaleString()} ر.ي</Text>
        </View>
        <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>حفظ التكلفة والمتابعة</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenGutter, paddingBottom: 120, gap: spacing.baseSm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.onSurface, fontSize: typography.fontSize.lg },
  storeCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, ...shadows.card },
  storeName: { color: colors.onSurface, fontSize: typography.fontSize.xl, textAlign: 'right', fontWeight: '700' },
  storeAddress: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.md, textAlign: 'right', marginTop: 5 },
  help: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm, textAlign: 'right', marginTop: 12, lineHeight: 24 },
  itemCard: { flexDirection: 'row-reverse', flexWrap: 'wrap', backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, gap: spacing.baseSm, ...shadows.card },
  itemDetails: { flex: 1, minWidth: 180, alignItems: 'flex-end' },
  itemName: { color: colors.onSurface, fontSize: typography.fontSize.lg, fontWeight: '700', textAlign: 'right' },
  itemMeta: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.md, marginTop: 3 },
  expected: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm, marginTop: 4, textAlign: 'right' },
  actual: { color: colors.primary, fontSize: typography.fontSize.sm, marginTop: 3, textAlign: 'right', fontWeight: '700' },
  priceChangeBox: { width: '100%', marginTop: 10, padding: 12, gap: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: borderRadius.md },
  priceChangeText: { color: colors.onSurface, fontSize: typography.fontSize.sm, textAlign: 'right', fontWeight: '700' },
  callHint: { color: colors.error, fontSize: typography.fontSize.sm, textAlign: 'right', lineHeight: 22, marginTop: 4 },
  callButton: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, padding: 12, alignItems: 'center', marginTop: 4 },
  callButtonText: { color: colors.onSecondary, fontSize: typography.fontSize.md, fontWeight: '700' },
  confirmRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingVertical: 8 },
  confirmText: { flex: 1, textAlign: 'right', color: colors.onSurface, fontSize: typography.fontSize.sm },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.onPrimary, fontWeight: '800' },
  contactTime: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.xs, textAlign: 'right' },
  image: { width: 60, height: 60, borderRadius: borderRadius.md },
  priceRow: { width: '100%', borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.baseSm, gap: 8 },
  fieldLabel: { color: colors.onSurface, fontSize: typography.fontSize.md, textAlign: 'right', fontWeight: '700' },
  input: { height: 52, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, color: colors.onSurface, fontSize: typography.fontSize.lg, backgroundColor: colors.surfaceContainerLow },
  lineTotal: { color: colors.onSurface, fontSize: typography.fontSize.md, textAlign: 'right' },
  totalCard: { backgroundColor: colors.surfaceContainerHigh, borderRadius: borderRadius.xl, padding: spacing.baseMd, alignItems: 'center' },
  totalLabel: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.md },
  total: { color: colors.primary, fontSize: typography.fontSize.xxl, fontWeight: '800', marginTop: 4 },
  saveButton: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.baseMd, alignItems: 'center', marginTop: spacing.baseXs },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.onPrimary, fontSize: typography.fontSize.lg, fontWeight: '700' },
});
