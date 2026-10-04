import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';

export const ActiveTaskRouteScreen: React.FC = () => {
  const {
    activeTask,
    completeStop,
    completeDeliveryAndCollect,
    acceptCurrentOrder,
    navigateTo,
    navigateBack,
    refreshData,
    isRefreshing,
  } = useDriver();
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);
  const [isOpeningPurchase, setIsOpeningPurchase] = useState(false);
  const submitDelivery = async (cashAdjustmentSettled: boolean) => {
    if (!activeTask || isCompletingDelivery) return;
    setIsCompletingDelivery(true);
    try { await completeDeliveryAndCollect(cashAdjustmentSettled); }
    catch (error: any) { Alert.alert('تعذر إتمام التسليم', error?.message || 'حاول مرة أخرى'); }
    finally { setIsCompletingDelivery(false); }
  };

  const handleCompleteDelivery = () => {
    if (!activeTask) return;
    if (activeTask.paymentMethod === 'MANUAL_TRANSFER' && !activeTask.isTransferAmountConfirmed) {
      Alert.alert('قيمة التحويل غير مؤكدة', 'راجع الإدارة لتسجيل المبلغ الفعلي في الإيصال قبل إتمام التسليم.');
      return;
    }
    if (activeTask.paymentMethod === 'MANUAL_TRANSFER' && activeTask.amountToCollect > 0) {
      Alert.alert(
        'تحصيل فارق التحويل',
        `تم تحويل ${activeTask.transferredAmount.toLocaleString()} ر.ي. يجب تحصيل ${activeTask.amountToCollect.toLocaleString()} ر.ي نقداً من العميل عند التسليم.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تم تحصيل الفارق', onPress: () => void submitDelivery(true) },
        ]
      );
      return;
    }
    if (activeTask.paymentMethod === 'MANUAL_TRANSFER' && activeTask.cashRefundAtDelivery > 0) {
      Alert.alert(
        'إعادة المبلغ الزائد',
        `تم تحويل ${activeTask.transferredAmount.toLocaleString()} ر.ي، بينما الفاتورة النهائية أقل. أعد ${activeTask.cashRefundAtDelivery.toLocaleString()} ر.ي للعميل نقداً عند التسليم.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تمت إعادة المبلغ', onPress: () => void submitDelivery(true) },
        ]
      );
      return;
    }
    void submitDelivery(false);
  };

  const handleOpenPurchase = async () => {
    if (!activeTask || isOpeningPurchase) return;
    setIsOpeningPurchase(true);
    try {
      if (activeTask.status === 'ASSIGNED') await acceptCurrentOrder();
      navigateTo('purchase');
    } catch (error: any) {
      Alert.alert('تعذر بدء الشراء', error?.message || 'حدّث الطلب وحاول مرة أخرى.');
    } finally {
      setIsOpeningPurchase(false);
    }
  };

  if (!activeTask) {
    return (
      <View style={styles.container}>
        <DriverHeader title="المسار النشط" showBack onBack={navigateBack} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛵</Text>
          <Text style={styles.emptyTitle}>لا توجد مهمة نشطة حالياً</Text>
          <TouchableOpacity style={styles.backBtn} onPress={navigateBack}>
            <Text style={styles.backBtnText}>العودة للوحة المهام</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const callCustomer = async () => {
    const phone = activeTask.customerPhone.replace(/[^+\d]/g, '');
    if (!phone) {
      Alert.alert('تعذر الاتصال', 'لا يتوفر رقم هاتف صالح للعميل في بيانات الطلب.');
      return;
    }

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('تعذر الاتصال', 'تعذر فتح تطبيق الاتصال على هذا الجهاز.');
    }
  };

  const handleCallCustomer = () => {
    Alert.alert(
      'الاتصال بالعميل',
      `الاتصال بـ ${activeTask.customerName} على الرقم ${activeTask.customerPhone}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'اتصال', onPress: () => { void callCustomer(); } },
      ]
    );
  };

  const canCompleteDelivery = activeTask.status === 'EN_ROUTE_DELIVERY' &&
    activeTask.stops.filter((stop) => stop.type === 'PICKUP_STORE').every((stop) => stop.status === 'COMPLETED');

  const handleOpenMaps = (address: string, lat?: number, lng?: number) => {
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}(${encodeURIComponent(address)})`,
        android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(address)})`,
      }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      });
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    }
  };

  return (
    <View style={styles.container}>
      <DriverHeader title="مسار وتفاصيل المهمة النشطة" showBack onBack={navigateBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={[colors.primary]} />}
      >
        {/* Order Header Summary */}
        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>مهمة قيد التنفيذ</Text>
            </View>
            <View style={styles.taskNumInfo}>
              <Text style={styles.taskNum}>طلب #{activeTask.orderNumber}</Text>
              <Text style={styles.taskStopsCount}>٣ محطات توصيل مجمعة</Text>
            </View>
          </View>
        </View>

        {/* Customer Contact Card */}
        <View style={styles.customerCard}>
          <View style={styles.customerTop}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={handleCallCustomer}
              activeOpacity={0.8}
            >
              <Text style={styles.callBtnIcon}>📞</Text>
              <Text style={styles.callBtnText}>اتصال بالعميل</Text>
            </TouchableOpacity>

            <View style={styles.customerInfo}>
              <Text style={styles.custName}>{activeTask.customerName}</Text>
              <Text style={styles.custPhone}>{activeTask.customerPhone}</Text>
            </View>
          </View>
          <View style={styles.customerAddressRow}>
            <Text style={styles.custAddress}>📍 {activeTask.customerAddress}</Text>
            <TouchableOpacity
              style={styles.openMapPill}
              onPress={() => {
                const customerStop = activeTask.stops.find((s) => s.type === 'DELIVERY_CUSTOMER');
                handleOpenMaps(
                  activeTask.customerAddress,
                  customerStop?.latitude,
                  customerStop?.longitude
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.openMapPillText}>🗺️ فتح في تطبيق الخرائط</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Stops Checklist */}
        <Text style={styles.sectionTitle}>محطات مسار المهمة</Text>

        {activeTask.stops.map((stop, index) => {
          const isCompleted = stop.status === 'COMPLETED';
          const isCurrent = activeTask.currentStopIndex === index;

          return (
            <View
              key={stop.id}
              style={[
                styles.stopCard,
                isCurrent && styles.stopCardCurrent,
                isCompleted && styles.stopCardCompleted,
              ]}
            >
              <View style={styles.stopHeader}>
                <View
                  style={[
                    styles.stopBadge,
                    isCompleted ? styles.stopBadgeDone : isCurrent ? styles.stopBadgeCurrent : {},
                  ]}
                >
                  <Text style={styles.stopBadgeText}>
                    {isCompleted ? '✓ مكتملة' : `محطة ${index + 1}`}
                  </Text>
                </View>

                <View style={styles.stopTitleWrap}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopType}>
                    {stop.type === 'PICKUP_STORE' ? 'محطة استلام وتجهيز' : 'وجهة التسليم للعميل'}
                  </Text>
                </View>
              </View>

              <Text style={styles.stopAddress}>📍 {stop.address}</Text>

              {stop.type === 'DELIVERY_CUSTOMER' && activeTask.paymentMethod === 'MANUAL_TRANSFER' && (
                <View style={styles.cashAdjustmentBox}>
                  {!activeTask.isTransferAmountConfirmed && <Text style={styles.cashRefundText}>لم تسجل الإدارة المبلغ المستلم من الحوالة بعد. لا يتم إتمام التسليم حتى تأكيده.</Text>}
                  <Text style={styles.cashAdjustmentText}>المبلغ المحول: {activeTask.transferredAmount.toLocaleString()} ر.ي</Text>
                  {activeTask.amountToCollect > 0 && <Text style={styles.cashDueText}>المطلوب تحصيله نقداً: {activeTask.amountToCollect.toLocaleString()} ر.ي</Text>}
                  {activeTask.cashRefundAtDelivery > 0 && <Text style={styles.cashRefundText}>المطلوب إعادته نقداً للعميل: {activeTask.cashRefundAtDelivery.toLocaleString()} ر.ي</Text>}
                  {activeTask.amountToCollect === 0 && activeTask.cashRefundAtDelivery === 0 && <Text style={styles.cashAdjustmentText}>لا يوجد فرق نقدي بعد تحديث الفاتورة.</Text>}
                </View>
              )}

              {/* Items for this stop if pickup store */}
              {stop.type === 'PICKUP_STORE' && (
                <View style={styles.stopItemsBox}>
                  <Text style={styles.stopItemsHeading}>الأصناف المطلوبة من هذا المحل:</Text>
                  {activeTask.itemsToPurchase
                    .filter((it) => it.subOrderId === stop.id.replace('stop-store-', ''))
                    .map((it) => (
                      <View key={it.id} style={styles.stopItemRow}>
                        <View style={styles.stopItemPriceWrap}>
                          <Text style={styles.stopItemPrice}>{(it.customerPrice * it.quantity).toLocaleString()} ر.ي</Text>
                        </View>
                        <Text style={styles.stopItemName}>
                          {it.name} <Text style={styles.stopItemQty}>× {it.quantity}</Text>
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {/* Stop Actions */}
              <View style={styles.stopActions}>
                <TouchableOpacity
                  style={styles.mapNavBtn}
                  onPress={() => handleOpenMaps(stop.address, stop.latitude, stop.longitude)}
                >
                  <Text style={styles.mapNavBtnText}>🗺️ ملاحة GPS</Text>
                </TouchableOpacity>

                {/* If external store purchase needed */}
                {stop.isExternalPurchase && !isCompleted && (
                  <TouchableOpacity
                    style={[styles.purchaseDocBtn, isOpeningPurchase && { opacity: 0.65 }]}
                    onPress={() => void handleOpenPurchase()}
                    disabled={isOpeningPurchase}
                  >
                    <Text style={styles.purchaseDocBtnText}>تأكيد شراء منتجات هذا المتجر</Text>
                  </TouchableOpacity>
                )}

                {!stop.isExternalPurchase && stop.type === 'PICKUP_STORE' && !isCompleted && (
                  <TouchableOpacity
                    style={styles.pickupConfirmBtn}
                    onPress={() => completeStop(stop.id)}
                  >
                    <Text style={styles.pickupConfirmBtnText}>تأكيد الاستلام والانطلاق ✓</Text>
                  </TouchableOpacity>
                )}

                {stop.type === 'DELIVERY_CUSTOMER' && !isCompleted && (
                  <TouchableOpacity
                    style={[styles.deliverFinalBtn, isCompletingDelivery && { opacity: 0.7 }]}
                    onPress={handleCompleteDelivery}
                    disabled={isCompletingDelivery || !canCompleteDelivery || (activeTask.paymentMethod === 'MANUAL_TRANSFER' && !activeTask.isTransferAmountConfirmed)}
                  >
                    {isCompletingDelivery ? <ActivityIndicator color="#fff" /> : <Text style={styles.deliverFinalBtnText}>
                      {!canCompleteDelivery
                        ? 'أكمل مشتريات المتاجر أولاً'
                        : activeTask.paymentMethod === 'CASH_ON_DELIVERY'
                        ? `إتمام التسليم وتحصيل ${activeTask.amountToCollect.toLocaleString()} ر.ي ✓`
                        : activeTask.amountToCollect > 0
                          ? `إتمام التسليم بعد تحصيل ${activeTask.amountToCollect.toLocaleString()} ر.ي ✓`
                          : activeTask.cashRefundAtDelivery > 0
                            ? `إتمام التسليم بعد إعادة ${activeTask.cashRefundAtDelivery.toLocaleString()} ر.ي ✓`
                            : 'إتمام التسليم ✓'}
                    </Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenGutter,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    marginBottom: spacing.baseMd,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseLg,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  backBtnText: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  topCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  topCardRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskNumInfo: {
    alignItems: 'flex-end',
  },
  taskNum: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  taskStopsCount: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  statusPill: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
  customerCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  customerTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    alignItems: 'flex-end',
  },
  custName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  custPhone: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  callBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  callBtnIcon: {
    fontSize: 14,
  },
  callBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  customerAddressRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
    gap: 8,
  },
  custAddress: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    flex: 1,
  },
  openMapPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  openMapPillText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: spacing.baseXs,
  },
  stopCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  stopCardCurrent: {
    borderColor: colors.secondaryContainer,
    borderWidth: 1.5,
  },
  stopCardCompleted: {
    opacity: 0.75,
  },
  stopHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopTitleWrap: {
    alignItems: 'flex-end',
  },
  stopName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  stopType: {
    fontSize: 14,
    color: colors.outline,
  },
  stopBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stopBadgeCurrent: {
    backgroundColor: colors.secondaryContainer,
  },
  stopBadgeDone: {
    backgroundColor: colors.primaryFixed,
  },
  stopBadgeText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  stopAddress: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  cashAdjustmentBox: { marginTop: 10, padding: 12, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerHigh, gap: 5 },
  cashAdjustmentText: { color: colors.onSurface, fontSize: typography.fontSize.sm, textAlign: 'right' },
  cashDueText: { color: colors.error, fontSize: typography.fontSize.md, textAlign: 'right', fontWeight: '700' },
  cashRefundText: { color: colors.primary, fontSize: typography.fontSize.md, textAlign: 'right', fontWeight: '700' },
  stopActions: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
    marginTop: spacing.baseSm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  mapNavBtn: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  mapNavBtnText: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.bold,
  },
  purchaseDocBtn: {
    flex: 1,
    backgroundColor: colors.secondaryContainer,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  purchaseDocBtnText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  pickupConfirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  pickupConfirmBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  deliverFinalBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deliverFinalBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  stopItemsBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.baseSm,
    marginVertical: 6,
  },
  stopItemsHeading: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 4,
  },
  stopItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  stopItemName: {
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'right',
  },
  stopItemQty: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stopItemPrice: {
    fontSize: 14,
    color: colors.outline,
  },
  stopItemPriceWrap: { alignItems: 'flex-start' },
});
