import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';

export const ActiveTaskRouteScreen: React.FC = () => {
  const {
    activeTask,
    completeStop,
    completeDeliveryAndCollect,
    navigateTo,
  } = useDriver();

  if (!activeTask) {
    return (
      <View style={styles.container}>
        <DriverHeader title="المسار النشط" showBack onBack={() => navigateTo('dashboard')} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛵</Text>
          <Text style={styles.emptyTitle}>لا توجد مهمة نشطة حالياً</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('dashboard')}>
            <Text style={styles.backBtnText}>العودة للوحة المهام</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCallCustomer = () => {
    Alert.alert(
      'الاتصال بالعميل',
      `الاتصال بـ ${activeTask.customerName} على الرقم ${activeTask.customerPhone}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'اتصال', onPress: () => Linking.openURL(`tel:${activeTask.customerPhone}`) },
      ]
    );
  };

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
      <DriverHeader title="مسار وتفاصيل المهمة النشطة" showBack onBack={() => navigateTo('dashboard')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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

              {/* Items for this stop if pickup store */}
              {stop.type === 'PICKUP_STORE' && (
                <View style={styles.stopItemsBox}>
                  <Text style={styles.stopItemsHeading}>الأصناف المطلوبة من هذا المحل:</Text>
                  {activeTask.itemsToPurchase
                    .filter((it) => it.storeId === stop.id || it.storeName === stop.name)
                    .map((it) => (
                      <View key={it.id} style={styles.stopItemRow}>
                        <Text style={styles.stopItemPrice}>
                          {(it.expectedPrice * it.quantity).toLocaleString()} ر.ي
                        </Text>
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
                    style={styles.purchaseDocBtn}
                    onPress={() => navigateTo('invoices')}
                  >
                    <Text style={styles.purchaseDocBtnText}>🧾 رفع وتوثيق فاتورة المتجر</Text>
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
                    style={styles.deliverFinalBtn}
                    onPress={completeDeliveryAndCollect}
                  >
                    <Text style={styles.deliverFinalBtnText}>
                      إتمام التسليم وتحصيل {activeTask.amountToCollect.toLocaleString()} ر.ي ✓
                    </Text>
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
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 11,
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
    fontSize: 12,
  },
  callBtnText: {
    color: colors.onPrimary,
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 10,
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
    fontSize: 9,
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
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  stopAddress: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
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
    fontSize: 10,
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
    color: colors.onSecondary,
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  stopItemsBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.baseSm,
    marginVertical: 6,
  },
  stopItemsHeading: {
    fontSize: 10,
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
    fontSize: 11,
    color: colors.onSurface,
    textAlign: 'right',
  },
  stopItemQty: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stopItemPrice: {
    fontSize: 10,
    color: colors.outline,
  },
});
