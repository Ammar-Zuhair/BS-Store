import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

export const StorePurchaseScreen: React.FC = () => {
  const { activeTask, recordStorePurchase, navigateBack, refreshData, isRefreshing } = useDriver();
  const [saving, setSaving] = useState(false);

  const currentStoreStop = activeTask?.stops.find((stop) => stop.type === 'PICKUP_STORE' && stop.status !== 'COMPLETED');
  const items = useMemo(() => activeTask?.itemsToPurchase.filter((item) =>
    currentStoreStop && item.subOrderId === currentStoreStop.id.replace('stop-store-', '')
  ) ?? [], [activeTask, currentStoreStop]);

  const confirmPurchase = async () => {
    if (!items.length) {
      Alert.alert('لا توجد أصناف', 'لا توجد منتجات مطلوبة من هذا المتجر لتأكيد شرائها.');
      return;
    }

    setSaving(true);
    try {
      await recordStorePurchase();
      Alert.alert('تم تأكيد الشراء', 'تم تسجيل شراء منتجات هذا المتجر. يمكنك متابعة تنفيذ الطلب.');
    } catch (error: any) {
      Alert.alert('تعذر تأكيد الشراء', error?.message || 'تحقق من الاتصال وحدّث بيانات الطلب ثم حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  if (!activeTask) {
    return (
      <View style={styles.container}>
        <DriverHeader title="تأكيد شراء المتجر" showBack onBack={navigateBack} />
        <View style={styles.empty}><Text style={styles.emptyText}>لا توجد مهمة شراء نشطة</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DriverHeader title="تأكيد شراء المتجر" showBack onBack={navigateBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={[colors.primary]} />}
      >
        <View style={styles.storeCard}>
          <Text style={styles.storeName}>{currentStoreStop?.name || 'المتجر'}</Text>
          <Text style={styles.storeAddress}>{currentStoreStop?.address || 'عنوان المتجر غير متوفر'}</Text>
          <Text style={styles.help}>
            راجع توفر المنتجات. إذا كان سعر المنتج في المتجر مختلفاً عن سعر البيع المعروض للعميل، اتصل بالمدير ليحدّث السعر قبل المتابعة. لا تعدّل أو تسجّل أسعاراً من هذه الشاشة.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>لا توجد أصناف مرتبطة بهذا المتجر في الطلب.</Text>
          </View>
        ) : items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>الكمية: {item.quantity}</Text>
              <Text style={styles.priceLabel}>سعر الوحدة على العميل: {item.customerPrice.toLocaleString()} ر.ي</Text>
              <Text style={styles.lineTotal}>إجمالي الصنف على العميل: {(item.customerPrice * item.quantity).toLocaleString()} ر.ي</Text>
            </View>
            {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.confirmButton, (saving || items.length === 0) && styles.disabled]}
          onPress={() => void confirmPurchase()}
          disabled={saving || items.length === 0}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={colors.onPrimary} />
            : <Text style={styles.confirmText}>تأكيد شراء المنتجات والمتابعة</Text>}
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
  emptyCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, ...shadows.card },
  emptyCardText: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.md, textAlign: 'right' },
  storeCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, ...shadows.card },
  storeName: { color: colors.onSurface, fontSize: typography.fontSize.xl, textAlign: 'right', fontWeight: '700' },
  storeAddress: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.md, textAlign: 'right', marginTop: 5 },
  help: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm, textAlign: 'right', marginTop: 12, lineHeight: 24 },
  itemCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, gap: spacing.baseSm, ...shadows.card },
  itemDetails: { flex: 1, alignItems: 'flex-end' },
  itemName: { color: colors.onSurface, fontSize: typography.fontSize.lg, fontWeight: '700', textAlign: 'right' },
  itemMeta: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.md, marginTop: 3 },
  priceLabel: { color: colors.onSurface, fontSize: typography.fontSize.sm, marginTop: 8, textAlign: 'right', fontWeight: '600' },
  lineTotal: { color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm, marginTop: 4, textAlign: 'right' },
  image: { width: 60, height: 60, borderRadius: borderRadius.md },
  confirmButton: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.baseMd, alignItems: 'center', marginTop: spacing.baseXs },
  disabled: { opacity: 0.6 },
  confirmText: { color: colors.onPrimary, fontSize: typography.fontSize.lg, fontWeight: '700' },
});
