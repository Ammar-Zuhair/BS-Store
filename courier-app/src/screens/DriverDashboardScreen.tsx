import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';
import { driverApi } from '../api';

export const DriverDashboardScreen: React.FC = () => {
  const { driver, activeTask, wallet, toggleShiftStatus, navigateTo, refreshData, isRefreshing } = useDriver();
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [governorates, setGovernorates] = useState<{id:string;name:string}[]>([]);
  const [governorateId, setGovernorateId] = useState('');
  const [showGovernorates, setShowGovernorates] = useState(false);
  const [isChangingGovernorate, setIsChangingGovernorate] = useState(false);
  const [isTogglingShift, setIsTogglingShift] = useState(false);
  useEffect(() => { void Promise.all([driverApi.governorates(), driverApi.myGovernorate()]).then(([list, mine]) => { setGovernorates(list); setGovernorateId(mine.governorateId || ''); }).catch(() => {}); }, []);
  const changeGovernorate = async (id:string) => { if (isChangingGovernorate) return; setIsChangingGovernorate(true); try { await driverApi.updateGovernorate(id); setGovernorateId(id); setShowGovernorates(false); Alert.alert('تم التحديث','تم تغيير محافظة عملك.'); } catch (e:any) { Alert.alert('تعذر التحديث',e?.message || 'حاول مرة أخرى.'); } finally { setIsChangingGovernorate(false); } };
  const handleToggleShift = async () => { if (isTogglingShift) return; setIsTogglingShift(true); try { await toggleShiftStatus(); } finally { setIsTogglingShift(false); } };
  const isOnline = driver.shiftStatus === 'ONLINE';

  const handleCall = (phone: string, name: string) => {
    Alert.alert('اتصال هاتفي', `الاتصال بـ ${name} (${phone})؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'اتصال', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  // Group items by store for clear presentation
  const storesWithItems = activeTask
    ? activeTask.stops
        .filter((s) => s.type === 'PICKUP_STORE')
        .map((store) => {
          const items = activeTask.itemsToPurchase.filter(
            (it) => it.storeId === store.id.replace('stop-store-', '') || it.storeName === store.name
          );
          return {
            ...store,
            items,
          };
        })
    : [];

  return (
    <View style={styles.container}>
      <DriverHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={[colors.primary]} />}
      >
        {/* Driver Profile & Shift Status Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.shiftGauge}>
              <Text style={styles.shiftLabel}>مدة الوردية</Text>
              <Text style={styles.shiftValue}>{driver.shiftDuration}</Text>
            </View>

            <View style={styles.driverInfo}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
              </View>

              <View style={styles.badgesRow}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingIcon}>⭐</Text>
                  <Text style={styles.ratingScore}>{driver.rating}</Text>
                  <Text style={styles.reviewsCount}>({driver.reviewsCount})</Text>
                </View>
                <View style={styles.vehicleBadge}>
                  <Text style={styles.vehicleIcon}>🛵</Text>
                  <Text style={styles.vehicleText}>{driver.vehiclePlate}</Text>
                </View>
              </View>
            </View>

          </View>

          {/* Online/Offline Status Switcher Pill */}
          <View style={styles.statusSwitchBox}>
            <TouchableOpacity
              style={[styles.switchTrack, isOnline ? styles.trackOnline : styles.trackOffline]}
              onPress={handleToggleShift}
              disabled={isTogglingShift}
              activeOpacity={0.8}
            >
              {isTogglingShift ? <ActivityIndicator color="#fff" /> : <View style={[styles.switchKnob, isOnline ? styles.knobOnline : styles.knobOffline]} />}
            </TouchableOpacity>

            <View style={styles.statusTextBox}>
              <Text style={styles.statusTitle}>
                {isOnline ? 'أنت متصل الآن ومؤهل لاستقبال الطلبات' : 'أنت غير متصل حالياً (في استراحة)'}
              </Text>
              <Text style={styles.statusDesc}>
                {isOnline
                  ? 'يتم إسناد الطلبات الأقرب لموقعك تلقائياً'
                  : 'قم بالتفعيل للبدء في جني الأرباح واستلام المهام'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity disabled={isChangingGovernorate} style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 14, padding: 14, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row-reverse', justifyContent: 'space-between', opacity: isChangingGovernorate ? 0.65 : 1 }} onPress={() => setShowGovernorates(true)}>
          <Text style={{ fontWeight: '700' }}>محافظة عملك</Text><Text>{governorates.find(g=>g.id===governorateId)?.name || 'اختر المحافظة ▾'}</Text>
        </TouchableOpacity>
        <Modal visible={showGovernorates} transparent animationType="slide" onRequestClose={() => setShowGovernorates(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'}}><View style={{maxHeight:'70%',backgroundColor:'#fff',padding:18,borderTopLeftRadius:20,borderTopRightRadius:20}}><Text style={{textAlign:'right',fontSize:18,fontWeight:'700',marginBottom:10}}>اختر المحافظة</Text><ScrollView>{governorates.map(g=><TouchableOpacity key={g.id} disabled={isChangingGovernorate} style={{padding:14,borderBottomWidth:1,borderColor:'#eee',opacity:isChangingGovernorate?0.6:1}} onPress={()=>changeGovernorate(g.id)}>{isChangingGovernorate && governorateId===g.id ? <ActivityIndicator color={colors.primary}/> : <Text style={{textAlign:'right'}}>{g.name}</Text>}</TouchableOpacity>)}</ScrollView></View></View></Modal>

        {/* Detailed Active Task Card */}
        {activeTask ? (
          <View style={styles.taskCard}>
            {/* Header: Order Number & Badges */}
            <View style={styles.taskHeader}>
              <View style={styles.taskNumberWrap}>
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>⚡ طلب جديد مسند لك</Text>
                </View>
                <Text style={styles.taskNumber}>#{activeTask.orderNumber}</Text>
              </View>
              <View style={styles.dispatchBadge}>
                <Text style={styles.dispatchText}>توصيل مجمع من عدة جهات</Text>
              </View>
            </View>

            {/* Customer Details Box */}
            <View style={styles.customerBox}>
              <View style={styles.customerHeaderRow}>
                <TouchableOpacity
                  style={styles.customerCallBtn}
                  onPress={() => handleCall(activeTask.customerPhone, activeTask.customerName)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callIcon}>📞</Text>
                  <Text style={styles.callText}>اتصال بالعميل</Text>
                </TouchableOpacity>

                <View style={styles.customerNameWrap}>
                  <Text style={styles.customerLabel}>العميل المستلم:</Text>
                  <Text style={styles.customerNameVal}>{activeTask.customerName}</Text>
                </View>
              </View>

              <View style={styles.addressLine}>
                <Text style={styles.addressIcon}>📍</Text>
                <Text style={styles.addressText}>{activeTask.customerAddress}</Text>
              </View>

              {activeTask.customerBuildingFloor && (
                <Text style={styles.buildingText}>🏢 {activeTask.customerBuildingFloor}</Text>
              )}

              {activeTask.deliveryNotes && (
                <View style={styles.notesTag}>
                  <Text style={styles.notesTagText}>💡 ملاحظة: {activeTask.deliveryNotes}</Text>
                </View>
              )}
            </View>

            {/* Stores and Products Breakdown */}
            <View style={styles.storesSection}>
              <Text style={styles.storesSectionTitle}>المحلات التجارية والمنتجات المطلوبة:</Text>

              {storesWithItems.map((st, idx) => (
                <View key={st.id} style={styles.storeBlock}>
                  <View style={styles.storeBlockHeader}>
                    <View style={styles.storeTypeBadge}>
                      <Text style={styles.storeTypeBadgeText}>
                        {st.isExternalPurchase ? 'شراء بفاتورة' : 'استلام وتجهيز'}
                      </Text>
                    </View>
                    <View style={styles.storeNameWrap}>
                      <Text style={styles.storeNameTitle}>
                        {idx + 1}. {st.name}
                      </Text>
                      <Text style={styles.storeAddressSmall}>📍 {st.address}</Text>
                    </View>
                  </View>

                  {/* Items list under this store */}
                  <View style={styles.itemsList}>
                    {st.items.map((it) => (
                      <View key={it.id} style={styles.itemRow}>
                        <Text style={styles.itemCost}>
                          {(it.customerPrice * it.quantity).toLocaleString()} ر.ي
                        </Text>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>
                            {it.name} <Text style={styles.itemQty}>× {it.quantity}</Text>
                          </Text>
                          <Text style={styles.itemUnit}>سعر الوحدة على العميل: {it.customerPrice.toLocaleString()} ر.ي</Text>
                        </View>
                        <Image source={{ uri: it.imageUrl }} style={styles.itemThumb} />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Financial Summary & Collection */}
            <View style={styles.costSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryVal}>
                    {(activeTask.subtotalProducts ?? 0).toLocaleString()} ر.ي
                </Text>
                <Text style={styles.summaryLabel}>قيمة المنتجات على العميل (قبل التوصيل):</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryVal, styles.earningsHighlight]}>
                  +{activeTask.driverEstimatedEarnings.toLocaleString()} ر.ي
                </Text>
                <Text style={styles.summaryLabel}>نصيبك التقديري من الربح ({activeTask.driverProfitSharePercent}%):</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalCollectionRow]}>
                <Text style={styles.totalCollectionVal}>
                  {activeTask.amountToCollect.toLocaleString()} <Text style={styles.currText}>ر.ي</Text>
                </Text>
                <View style={styles.collectionLabelWrap}>
                  <Text style={styles.totalCollectionLabel}>المطلوب تحصيله:</Text>
                  <View
                    style={[
                      styles.paymentMethodPill,
                      activeTask.paymentMethod === 'CASH_ON_DELIVERY'
                        ? styles.pillCod
                        : styles.pillTransfer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        activeTask.paymentMethod === 'CASH_ON_DELIVERY'
                          ? styles.textCod
                          : styles.textTransfer,
                      ]}
                    >
                      {activeTask.paymentMethod === 'CASH_ON_DELIVERY'
                        ? '💵 دفع عند الاستلام كاش'
                        : '✓ تحويل بنكي مسبق'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsCol}>
              <TouchableOpacity
                style={styles.startTaskBtn}
                onPress={() => navigateTo('route')}
                activeOpacity={0.88}
              >
                <View style={styles.etaPill}>
                  <Text style={styles.etaPillText}>
                    المسار: {activeTask.totalDistanceKm} كم • {activeTask.estimatedMinutes} دقيقة
                  </Text>
                </View>
                <View style={styles.btnActionWrap}>
                  <Text style={styles.startTaskBtnText}>بدء المهمة وتتبع المسار</Text>
                  <Text style={styles.btnActionIcon}>🛵</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => setDetailsModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewDetailsText}>📋 تفاصيل الطلب كاملة</Text>
                </TouchableOpacity>

              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noTaskCard}>
            <Text style={styles.noTaskIcon}>🎉</Text>
            <Text style={styles.noTaskTitle}>لا توجد مهام نشطة حالياً</Text>
            <Text style={styles.noTaskSubtitle}>أنت على رأس قائمة الإسناد عند توفر طلبات جديدة</Text>
          </View>
        )}

        {/* Daily KPI Metric Cards */}
        <Text style={styles.kpiSectionTitle}>أداء الوردية اليوم</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>💰</Text>
            <Text style={styles.metricValue}>
              {wallet.todayEarnings.toLocaleString()} ر.ي
            </Text>
            <Text style={styles.metricLabel}>صافي أرباحك اليوم</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>🏁</Text>
            <Text style={styles.metricValue}>{wallet.completedTripsToday}</Text>
            <Text style={styles.metricLabel}>مشاوير مكتملة</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>🛵</Text>
            <Text style={styles.metricValue}>{wallet.totalDistanceTodayKm} كم</Text>
            <Text style={styles.metricLabel}>المسافة المقطوعة</Text>
          </View>
        </View>
      </ScrollView>

      {/* Full Order Details Modal */}
      {activeTask && (
        <Modal visible={detailsModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setDetailsModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>تفاصيل الطلب الشاملة #{activeTask.orderNumber}</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Customer Card */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.modalSectionHeading}>بيانات العميل المستلم:</Text>
                  <View style={styles.modalCustomerRow}>
                    <TouchableOpacity
                      style={styles.modalCallBtn}
                      onPress={() => handleCall(activeTask.customerPhone, activeTask.customerName)}
                    >
                      <Text style={styles.modalCallText}>📞 اتصال بالعميل</Text>
                    </TouchableOpacity>
                    <View style={styles.modalCustomerInfo}>
                      <Text style={styles.modalCustomerName}>{activeTask.customerName}</Text>
                      <Text style={styles.modalCustomerPhone}>{activeTask.customerPhone}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalAddressText}>📍 {activeTask.customerAddress}</Text>
                  {activeTask.customerBuildingFloor && (
                    <Text style={styles.modalBuildingText}>🏢 {activeTask.customerBuildingFloor}</Text>
                  )}
                  {activeTask.deliveryNotes && (
                    <View style={styles.modalNotesBox}>
                      <Text style={styles.modalNotesText}>💡 ملاحظات العميل: {activeTask.deliveryNotes}</Text>
                    </View>
                  )}
                </View>

                {/* Stores & Products Detailed */}
                <Text style={styles.modalSectionHeading}>الأصناف والمحلات التجارية المندرجة:</Text>
                {storesWithItems.map((store, sIdx) => (
                  <View key={store.id} style={styles.modalStoreCard}>
                    <View style={styles.modalStoreHeader}>
                      <View style={styles.modalStoreBadge}>
                        <Text style={styles.modalStoreBadgeText}>
                          {store.isExternalPurchase ? 'شراء نقدي بفاتورة' : 'استلام بضاعة'}
                        </Text>
                      </View>
                      <Text style={styles.modalStoreTitle}>
                        {sIdx + 1}. {store.name}
                      </Text>
                    </View>
                    <Text style={styles.modalStoreAddr}>📍 {store.address}</Text>

                    {store.items.map((item) => (
                      <View key={item.id} style={styles.modalItemRow}>
                        <Text style={styles.modalItemTotal}>
                          {(item.customerPrice * item.quantity).toLocaleString()} ر.ي
                        </Text>
                        <View style={styles.modalItemInfo}>
                          <Text style={styles.modalItemName}>{item.name}</Text>
                          <Text style={styles.modalItemSub}>
                          الكمية: {item.quantity} | سعر الوحدة على العميل: {item.customerPrice.toLocaleString()} ر.ي
                          </Text>
                        </View>
                        <Image source={{ uri: item.imageUrl }} style={styles.modalItemThumb} />
                      </View>
                    ))}
                  </View>
                ))}

                {/* Payment & Cost Summary */}
                <View style={styles.modalPricingCard}>
                  <View style={styles.modalPricingRow}>
                    <Text style={styles.modalPricingVal}>
                      {(activeTask.subtotalProducts ?? 0).toLocaleString()} ر.ي
                    </Text>
                    <Text style={styles.modalPricingLabel}>قيمة المنتجات على العميل (قبل التوصيل):</Text>
                  </View>
                  <View style={styles.modalPricingRow}>
                    <Text style={[styles.modalPricingVal, styles.modalEarnings]}>
                      +{activeTask.driverEstimatedEarnings.toLocaleString()} ر.ي
                    </Text>
                    <Text style={styles.modalPricingLabel}>نصيبك التقديري من الربح ({activeTask.driverProfitSharePercent}%):</Text>
                  </View>
                  <View style={[styles.modalPricingRow, styles.modalTotalRow]}>
                    <Text style={styles.modalTotalVal}>
                      {activeTask.amountToCollect.toLocaleString()} ر.ي
                    </Text>
                    <View style={styles.modalTotalLabelWrap}>
                      <Text style={styles.modalTotalLabel}>المطلوب تحصيله:</Text>
                      <Text style={styles.modalPaymentType}>
                        {activeTask.paymentMethod === 'CASH_ON_DELIVERY'
                          ? '💵 دفع عند الاستلام نقداً'
                          : `✓ تحويل بنكي مسبق ${activeTask.transferredAmount.toLocaleString()} ر.ي`}
                      </Text>
                      {activeTask.paymentMethod === 'MANUAL_TRANSFER' && activeTask.amountToCollect > 0 && <Text style={styles.modalPaymentType}>المتبقي نقداً عند التسليم: {activeTask.amountToCollect.toLocaleString()} ر.ي</Text>}
                      {activeTask.paymentMethod === 'MANUAL_TRANSFER' && activeTask.cashRefundAtDelivery > 0 && <Text style={styles.modalPaymentType}>أعد للعميل نقداً: {activeTask.cashRefundAtDelivery.toLocaleString()} ر.ي</Text>}
                    </View>
                  </View>
                </View>

                {/* Modal Buttons */}
                <TouchableOpacity
                  style={styles.modalStartBtn}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    navigateTo('route');
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.modalStartBtnText}>بدء مسار التوصيل والانطلاق ➔</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalPurchaseBtn}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    navigateTo('purchase');
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.modalPurchaseBtnText}>تسجيل تكلفة مشتريات المتجر</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  profileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  profileTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.baseSm,
  },
  driverInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.baseSm,
  },
  driverNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  driverName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  verifiedBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    fontSize: 14,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  badgesRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingIcon: {
    fontSize: 14,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  reviewsCount: {
    fontSize: 14,
    color: colors.outline,
  },
  vehicleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  vehicleIcon: {
    fontSize: 14,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  shiftGauge: {
    alignItems: 'flex-start',
  },
  shiftLabel: {
    fontSize: 14,
    color: colors.outline,
  },
  shiftValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  statusSwitchBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTextBox: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: spacing.baseSm,
  },
  statusTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  statusDesc: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  switchTrack: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  trackOnline: {
    backgroundColor: colors.primary,
  },
  trackOffline: {
    backgroundColor: colors.outlineVariant,
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainerLowest,
  },
  knobOnline: {
    alignSelf: 'flex-end',
  },
  knobOffline: {
    alignSelf: 'flex-start',
  },
  taskCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1.5,
    borderColor: colors.secondaryContainer + '40',
    ...shadows.card,
  },
  taskHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseXs,
  },
  taskNumberWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  urgentBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  urgentBadgeText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
  taskNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  dispatchBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dispatchText: {
    fontSize: 14,
    color: colors.outline,
  },
  taskTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 2,
  },
  taskSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  stopsBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginVertical: spacing.baseSm,
    gap: 6,
  },
  stopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 6,
  },
  stopIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  stopInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stopHeading: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  stopPillsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  storePill: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  storePillText: {
    fontSize: 14,
    color: colors.onSurface,
  },
  plusSign: {
    fontSize: 14,
    color: colors.outline,
  },
  destinationText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  taskMetricsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: spacing.baseXs,
    marginBottom: spacing.baseSm,
  },
  collectionBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    alignItems: 'flex-end',
  },
  collectionLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  collectionValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    marginTop: 1,
  },
  curr: {
    fontSize: 14,
  },
  verifiedPaymentText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginTop: 2,
  },
  mapThumb: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 6,
  },
  mapDistanceBadge: {
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  startTaskBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.baseMd,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  btnActionWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  btnActionIcon: {
    fontSize: 18,
  },
  startTaskBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  etaPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
  },
  etaPillText: {
    color: colors.onPrimary,
    fontSize: 14,
  },
  noTaskCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseLg,
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    ...shadows.card,
  },
  noTaskIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  noTaskTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  noTaskSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  kpiSectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: spacing.baseXs,
  },
  metricsGrid: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  metricIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },

  // Customer Details Box
  customerBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginVertical: spacing.baseSm,
  },
  customerHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerCallBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  callIcon: {
    fontSize: 14,
  },
  callText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  customerNameWrap: {
    alignItems: 'flex-end',
  },
  customerLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  customerNameVal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  addressLine: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  addressIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  addressText: {
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
    textAlign: 'right',
  },
  buildingText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
    marginRight: 16,
  },
  notesTag: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: 6,
  },
  notesTagText: {
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'right',
  },

  // Stores & Items Section
  storesSection: {
    marginVertical: spacing.baseXs,
  },
  storesSectionTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  storeBlock: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  storeBlockHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '20',
  },
  storeTypeBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  storeTypeBadgeText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  storeNameWrap: {
    alignItems: 'flex-end',
    flex: 1,
  },
  storeNameTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  storeAddressSmall: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 6,
    borderRadius: borderRadius.md,
  },
  itemThumb: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.onSurface,
    textAlign: 'right',
  },
  itemQty: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  itemUnit: {
    fontSize: 14,
    color: colors.outline,
    marginTop: 1,
  },
  itemCost: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  storeSubtotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  storeSubtotalLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  storeSubtotalVal: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  // Cost Summary Card
  costSummaryCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginVertical: spacing.baseSm,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.onSurface,
  },
  earningsHighlight: {
    color: colors.success,
    fontWeight: typography.fontWeight.bold,
  },
  totalCollectionRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '35',
  },
  collectionLabelWrap: {
    alignItems: 'flex-end',
  },
  totalCollectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  totalCollectionVal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
  },
  currText: {
    fontSize: 14,
  },
  paymentMethodPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  pillCod: {
    backgroundColor: colors.warning + '20',
  },
  pillTransfer: {
    backgroundColor: colors.success + '20',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  textCod: {
    color: colors.warning,
  },
  textTransfer: {
    color: colors.success,
  },

  // Action Buttons
  actionButtonsCol: {
    marginTop: spacing.baseSm,
    gap: 8,
  },
  secondaryActionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '50',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
    padding: spacing.baseMd,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.baseSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    color: colors.onSurface,
  },
  modalScroll: {
    paddingVertical: spacing.baseSm,
    paddingBottom: 24,
  },
  modalSectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  modalSectionHeading: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  modalCustomerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalCallBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  modalCallText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  modalCustomerInfo: {
    alignItems: 'flex-end',
  },
  modalCustomerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  modalCustomerPhone: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  modalAddressText: {
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'right',
  },
  modalBuildingText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  modalNotesBox: {
    backgroundColor: colors.surfaceContainerHighest,
    padding: 6,
    borderRadius: borderRadius.sm,
    marginTop: 6,
  },
  modalNotesText: {
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'right',
  },
  modalStoreCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  modalStoreHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  modalStoreBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  modalStoreBadgeText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  modalStoreTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  modalStoreAddr: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  modalItemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 6,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  modalItemThumb: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  modalItemInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 8,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.onSurface,
    textAlign: 'right',
  },
  modalItemSub: {
    fontSize: 14,
    color: colors.outline,
    marginTop: 1,
  },
  modalItemTotal: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  modalPricingCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginTop: 6,
    marginBottom: spacing.baseSm,
    gap: 4,
  },
  modalPricingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalPricingLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  modalPricingVal: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.onSurface,
  },
  modalEarnings: {
    color: colors.success,
    fontWeight: typography.fontWeight.bold,
  },
  modalTotalRow: {
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '30',
  },
  modalTotalLabelWrap: {
    alignItems: 'flex-end',
  },
  modalTotalLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  modalPaymentType: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginTop: 1,
  },
  modalTotalVal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
  },
  modalStartBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  modalStartBtnText: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  modalPurchaseBtn: {
    backgroundColor: colors.primaryFixed,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPurchaseBtnText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
  },
});
