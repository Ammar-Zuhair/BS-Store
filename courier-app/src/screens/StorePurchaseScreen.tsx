import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

export const StorePurchaseScreen: React.FC = () => {
  const { activeTask, recordStorePurchase, navigateTo, refreshData, isRefreshing } = useDriver();
  const [actualPrices, setActualPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries((activeTask?.itemsToPurchase ?? []).filter((item) => item.actualPrice != null).map((item) => [item.id, String(item.actualPrice)]))
  );
  const [saving, setSaving] = useState(false);

  const currentStoreStop = activeTask?.stops.find((stop) => stop.type === 'PICKUP_STORE' && stop.status !== 'COMPLETED');
  const items = useMemo(() => activeTask?.itemsToPurchase.filter((item) =>
    currentStoreStop && (item.storeId === currentStoreStop.id.replace('stop-store-', '') || item.storeName === currentStoreStop.name)
  ) ?? [], [activeTask, currentStoreStop]);
  const totalActual = items.reduce((sum, item) => sum + (Number(actualPrices[item.id]) || 0) * item.quantity, 0);

  const save = async () => {
    if (!items.length || items.some((item) => !(Number(actualPrices[item.id]) > 0))) {
      Alert.alert('بيانات ناقصة', 'أدخل سعر الشراء الفعلي لكل صنف.');
      return;
    }
    setSaving(true);
    try {
      await recordStorePurchase(items.map((item) => ({ id: item.id, actualPrice: Number(actualPrices[item.id]) })));
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
      <DriverHeader title="تسجيل مشتريات المتجر" showBack onBack={() => navigateTo('route')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={[colors.primary]} />}>
        <View style={styles.storeCard}>
          <Text style={styles.storeName}>{currentStoreStop?.name || 'المتجر'}</Text>
          <Text style={styles.storeAddress}>{currentStoreStop?.address || 'عنوان المتجر غير متوفر'}</Text>
          <Text style={styles.help}>أدخل سعر الوحدة الذي دفعته فعلياً. سيُستخدم لتحديث تكلفة الطلب والعهدة.</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>الكمية: {item.quantity}</Text>
              <Text style={styles.expected}>سعر الشراء المتوقع للوحدة: {item.expectedPrice.toLocaleString()} ر.ي</Text>
              {item.actualPrice != null && <Text style={styles.actual}>السعر الفعلي المسجل: {Number(item.actualPrice).toLocaleString()} ر.ي</Text>}
            </View>
            {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
            <View style={styles.priceRow}>
              <Text style={styles.fieldLabel}>السعر الفعلي للوحدة (ر.ي)</Text>
              <TextInput
                style={styles.input}
                value={actualPrices[item.id] ?? ''}
                onChangeText={(value) => setActualPrices((current) => ({ ...current, [item.id]: value }))}
                keyboardType="numeric"
                textAlign="center"
                placeholder="أدخل السعر"
              />
              <Text style={styles.lineTotal}>إجمالي الصنف: {((Number(actualPrices[item.id]) || 0) * item.quantity).toLocaleString()} ر.ي</Text>
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
