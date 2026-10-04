import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { AdminOrder, OrderStatus, FlaggedUser } from '../types';

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  ALL: 'الكل',
  PENDING_ADMIN_APPROVAL: 'انتظار الموافقة',
  PAYMENT_PENDING_VERIFICATION: 'بانتظار مراجعة التحويل',
  CONFIRMED: 'مؤكد',
  SEARCHING_DRIVER: 'بحث عن كابتن',
  DRIVER_ASSIGNED: 'تم تعيين كابتن',
  PURCHASING: 'جاري الشراء',
  OUT_FOR_DELIVERY: 'في الطريق',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  ALL: '#6B7280',
  PENDING_ADMIN_APPROVAL: '#F59E0B',
  PAYMENT_PENDING_VERIFICATION: '#8B5CF6',
  CONFIRMED: '#10B981',
  SEARCHING_DRIVER: '#3B82F6',
  DRIVER_ASSIGNED: '#06B6D4',
  PURCHASING: '#F97316',
  OUT_FOR_DELIVERY: '#0EA5E9',
  DELIVERED: '#22C55E',
  CANCELLED: '#EF4444',
};

// ── Component ────────────────────────────────────────────────────────────────

export const OrdersScreen: React.FC = () => {
  const {
    orders,
    driverCustodies,
    updateOrderStatus,
    approveOrder,
    rejectOrder,
    navigateTo,
    orderWorkflowMode,
    setOrderWorkflowMode,
    flaggedUsers,
    flagUser,
    unflagUser,
    banUser,
    unbanUser,
  } = useAdmin();

  const [selectedStatusTab, setSelectedStatusTab] = useState<OrderStatus>('ALL');
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [assignModalOrder, setAssignModalOrder] = useState<AdminOrder | null>(null);
  const [flagModalUser, setFlagModalUser] = useState<{ name: string; phone: string } | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [rejectModalOrder, setRejectModalOrder] = useState<AdminOrder | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [showWorkflowSettings, setShowWorkflowSettings] = useState(false);
  const [showFraudPanel, setShowFraudPanel] = useState(false);
  const [isApprovingOrder, setIsApprovingOrder] = useState(false);
  const [assigningDriverId, setAssigningDriverId] = useState<string | null>(null);

  // ── Filter tabs ──
  const filterTabs: { id: OrderStatus; label: string }[] = [
    { id: 'ALL', label: 'الكل' },
    { id: 'PENDING_ADMIN_APPROVAL', label: 'تنتظر الموافقة' },
    { id: 'PAYMENT_PENDING_VERIFICATION', label: 'انتظار التحويل' },
    { id: 'SEARCHING_DRIVER', label: 'بانتظار كابتن' },
    { id: 'OUT_FOR_DELIVERY', label: 'جاري التوصيل' },
    { id: 'DELIVERED', label: 'مكتملة' },
    { id: 'CANCELLED', label: 'ملغاة' },
  ];

  const filteredOrders = orders.filter((o) => {
    if (selectedStatusTab === 'ALL') return true;
    return o.status === selectedStatusTab;
  });
  const assignableDrivers = assignModalOrder?.customerGovernorateId
    ? driverCustodies.filter((d) => d.governorateId === assignModalOrder.customerGovernorateId && d.isApproved !== false)
    : [];

  // ── Handlers ──
  const handleAssignDriver = async (order: AdminOrder, driverId: string, driverName: string) => {
    if (assigningDriverId) return;
    setAssigningDriverId(driverId);
    try {
      await updateOrderStatus(order.id, 'DRIVER_ASSIGNED', driverName, driverId);
      Alert.alert('تم الإسناد ✓', `تم إسناد الطلب #${order.orderNumber} للكابتن ${driverName}`);
      setAssignModalOrder(null);
      setDetailOrder(null);
    } catch (error: any) {
      Alert.alert('تعذر الإسناد', error?.message || 'تحقق من محافظة الموصل والطلب ثم أعد المحاولة.');
    } finally { setAssigningDriverId(null); }
  };

  const handleApproveOrder = async (order: AdminOrder) => {
    if (isApprovingOrder) return;
    setIsApprovingOrder(true);
    try {
      await approveOrder(order.id);
      setDetailOrder(null);
      setAssignModalOrder(order);
      if (!order.customerGovernorateId) Alert.alert('المحافظة غير محددة', 'لا يمكن تعيين الموصلين حتى يتم تحديد محافظة العميل وتحديث الطلب.');
    } catch (error: any) {
      Alert.alert('تعذر قبول الطلب', error?.message || 'حاول مرة أخرى.');
    } finally { setIsApprovingOrder(false); }
  };

  const handleRejectOrder = async () => {
    if (!rejectModalOrder) return;
    if (!rejectReasonInput.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب الرفض');
      return;
    }
    await rejectOrder(rejectModalOrder.id, rejectReasonInput);
    Alert.alert('تم الرفض', `تم رفض الطلب #${rejectModalOrder.orderNumber}`);
    setRejectModalOrder(null);
    setRejectReasonInput('');
    setDetailOrder(null);
  };

  const handleFlagUser = () => {
    if (!flagModalUser || !flagReason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب الإبلاغ');
      return;
    }
    flagUser({
      name: flagModalUser.name,
      phone: flagModalUser.phone,
      reason: flagReason,
      isBanned: false,
      cancelCount: 1,
    });
    setFlagModalUser(null);
    setFlagReason('');
    Alert.alert('تم التسجيل ✓', `تم وضع علامة تحذير على الرقم ${flagModalUser.phone}`);
  };

  // ── Fraud panel ──
  const isFlagged = (phone: string) =>
    flaggedUsers.some((f) => f.phone === phone);

  // ── Order card color ──
  const getStatusColor = (status: OrderStatus) => STATUS_COLORS[status] || '#6B7280';

  return (
    <View style={styles.container}>
      <AdminHeader title="إدارة الطلبات" showBack onBack={() => navigateTo('dashboard')} />

      {/* ── Top Controls Row ── */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlBtn, styles.controlBtnFraud]}
          onPress={() => setShowFraudPanel(true)}
        >
          <Text style={styles.controlBtnIcon}>🛡</Text>
          <Text style={styles.controlBtnLabel}>
            منع الاحتيال {flaggedUsers.length > 0 ? `(${flaggedUsers.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.controlBtnWorkflow]}
          onPress={() => setShowWorkflowSettings(true)}
        >
          <Text style={styles.controlBtnIcon}>⚙</Text>
          <Text style={styles.controlBtnLabel}>
            {orderWorkflowMode === 'MANUAL_APPROVAL' ? 'يدوي' : 'تلقائي'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Workflow Mode Banner ── */}
      <View style={[
        styles.workflowBanner,
        orderWorkflowMode === 'AUTO_ASSIGN' && styles.workflowBannerAuto,
      ]}>
        <Text style={styles.workflowBannerText}>
          {orderWorkflowMode === 'MANUAL_APPROVAL'
            ? '🔵 الوضع اليدوي: الطلبات تصلك للموافقة أولاً قبل تعيين الكابتن'
            : '🟢 الوضع التلقائي: يتم تعيين أقرب كابتن للطلبات مباشرة'}
        </Text>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTabs.map((tab) => {
            const isActive = selectedStatusTab === tab.id;
            const count = tab.id === 'ALL'
              ? orders.length
              : orders.filter((o) => o.status === tab.id).length;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setSelectedStatusTab(tab.id)}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Orders List ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredOrders.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>لا توجد طلبات في هذا التصنيف</Text>
          </View>
        )}
        {filteredOrders.map((ord) => {
          const flagInfo = flaggedUsers.find((f) => f.phone === ord.customerPhone);
          const statusColor = getStatusColor(ord.status);
          return (
            <TouchableOpacity
              key={ord.id}
              style={[styles.orderCard, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}
              onPress={() => setDetailOrder(ord)}
              activeOpacity={0.88}
            >
              {/* Header row */}
              <View style={styles.orderCardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {STATUS_LABELS[ord.status] || ord.status}
                  </Text>
                </View>
                <View style={styles.orderNumberInfo}>
                  <Text style={styles.orderNum}>طلب #{ord.orderNumber}</Text>
                  <Text style={styles.orderTime}>{ord.createdAt}</Text>
                </View>
              </View>

              {/* Fraud warning */}
              {flagInfo && (
                <View style={styles.fraudWarningRow}>
                  <Text style={styles.fraudWarningText}>
                    ⚠️ {flagInfo.isBanned ? 'محظور' : 'مُبلَّغ عنه'} — {flagInfo.reason}
                  </Text>
                </View>
              )}

              {/* Customer & address */}
              <View style={styles.customerRow}>
                <Text style={styles.customerPhone}>{ord.customerPhone}</Text>
                <Text style={styles.customerName}>👤 {ord.customerName}</Text>
              </View>
              <Text style={styles.addressLine} numberOfLines={1}>
                📍 {ord.addressSummary}
              </Text>

              {/* Customer Notes */}
              {!!ord.notes && (
                <View style={styles.orderNoteBadge}>
                  <Text style={styles.orderNoteText} numberOfLines={2}>
                    📝 ملاحظة العميل: {ord.notes}
                  </Text>
                </View>
              )}

              {/* Stores summary */}
              <View style={styles.subOrdersBox}>
                <Text style={styles.subOrdersTitle}>
                  المتاجر والأصناف المطلوبة ({ord.subOrders.length}):
                </Text>
                {ord.subOrders.map((sub, i) => (
                  <View key={i} style={{ marginBottom: 4 }}>
                    <Text style={styles.subOrderItem}>
                      • {sub.storeName} ({sub.items.length} أصناف — {sub.subtotal?.toLocaleString()} ر.ي)
                    </Text>
                    {sub.items.map((it, itemIdx) => (
                      <Text key={itemIdx} style={{ fontSize: 12, color: colors.onSurfaceVariant, paddingRight: 10, fontFamily: 'Tajawal_500Medium', textAlign: 'right' }}>
                        - {it.productName || 'صنف'} (×{it.quantity})
                      </Text>
                    ))}
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.orderFooter}>
                <View style={styles.driverTag}>
                  <Text style={styles.driverTagText}>
                    {ord.assignedDriverName
                      ? `🛵 ${ord.assignedDriverName}`
                      : '⚠️ بدون كابتن'}
                  </Text>
                </View>
                <Text style={styles.totalVal}>
                  {ord.totalAmount?.toLocaleString()} ر.ي
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ════════════════ Order Detail Modal ════════════════ */}
      {detailOrder && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setDetailOrder(null)}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>طلب #{detailOrder.orderNumber}</Text>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Status */}
                <View style={[styles.detailStatusRow, { backgroundColor: getStatusColor(detailOrder.status) + '18' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(detailOrder.status), width: 10, height: 10 }]} />
                  <Text style={[styles.detailStatusText, { color: getStatusColor(detailOrder.status) }]}>
                    {STATUS_LABELS[detailOrder.status]}
                  </Text>
                  <Text style={styles.detailStatusMode}>
                    {detailOrder.assignedDriverName ? `🛵 ${detailOrder.assignedDriverName}` : ''}
                  </Text>
                </View>

                {detailOrder.customerRating != null && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeading}>⭐ تقييم العميل: {detailOrder.customerRating}/5</Text>
                    <Text style={{ color: colors.onSurface, textAlign: 'right', fontFamily: 'Tajawal_500Medium' }}>{detailOrder.customerReview}</Text>
                  </View>
                )}
                {/* Customer */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>👤 بيانات العميل والتوصيل</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailVal}>{detailOrder.customerName}</Text>
                    <Text style={styles.detailLbl}>الاسم</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailVal}>{detailOrder.customerPhone}</Text>
                    <Text style={styles.detailLbl}>الهاتف</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailVal}>{detailOrder.addressSummary}</Text>
                    <Text style={styles.detailLbl}>العنوان</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailVal}>
                      {detailOrder.paymentMethod === 'MANUAL_TRANSFER' ? 'تحويل بنكي' : 'الدفع عند الاستلام'}
                    </Text>
                    <Text style={styles.detailLbl}>طريقة الدفع</Text>
                  </View>
                </View>

                {/* Customer Notes */}
                {!!detailOrder.notes && (
                  <View style={styles.detailNotesCard}>
                    <Text style={styles.detailNotesTitle}>📝 ملاحظات العميل على الطلب:</Text>
                    <Text style={styles.detailNotesBody}>{detailOrder.notes}</Text>
                  </View>
                )}

                {/* Sub-orders */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>🏪 المتاجر والمنتجات</Text>
                  {detailOrder.subOrders.map((so) => (
                    <View key={so.id} style={styles.subOrderCard}>
                      <Text style={styles.soStoreName}>{so.storeName}</Text>
                      {so.items.map((it, idx) => (
                        <View key={idx} style={styles.soItemRow}>
                          <Text style={styles.soItemPrice}>
                            {(it.sellingPrice * it.quantity).toLocaleString()} ر.ي
                          </Text>
                          <Text style={styles.soItemName}>
                            {it.productName} (×{it.quantity})
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>

                {/* Financial summary */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>💰 ملخص مالي</Text>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumVal}>{detailOrder.subtotal?.toLocaleString()} ر.ي</Text>
                    <Text style={styles.sumLbl}>مجموع المنتجات</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumVal}>{detailOrder.deliveryFee?.toLocaleString()} ر.ي</Text>
                    <Text style={styles.sumLbl}>رسوم التوصيل</Text>
                  </View>
                  {detailOrder.discount > 0 && (
                    <View style={styles.sumRow}>
                      <Text style={[styles.sumVal, { color: colors.error }]}>
                        -{detailOrder.discount?.toLocaleString()} ر.ي
                      </Text>
                      <Text style={styles.sumLbl}>الخصم</Text>
                    </View>
                  )}
                  <View style={[styles.sumRow, styles.sumTotalRow]}>
                    <Text style={styles.sumTotalVal}>{detailOrder.totalAmount?.toLocaleString()} ر.ي</Text>
                    <Text style={styles.sumTotalLbl}>المجموع الكلي</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionButtons}>
                  {/* Approve (manual mode only, and order is pending) */}
                  {orderWorkflowMode === 'MANUAL_APPROVAL' &&
                    detailOrder.status === 'PENDING_ADMIN_APPROVAL' && (
                    <>
                      <TouchableOpacity
                        style={[styles.approveBtn, isApprovingOrder && { opacity: 0.7 }]}
                        onPress={() => handleApproveOrder(detailOrder)}
                        disabled={isApprovingOrder}
                      >
                        {isApprovingOrder ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.approveBtnText}>✓ قبول الطلب واختيار الموصل</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => {
                          setRejectModalOrder(detailOrder);
                          setDetailOrder(null);
                        }}
                      >
                        <Text style={styles.rejectBtnText}>✕ رفض الطلب</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Assign driver */}
                  {!detailOrder.assignedDriverName &&
                    ['CONFIRMED', 'SEARCHING_DRIVER'].includes(detailOrder.status) && (
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => {
                        setAssignModalOrder(detailOrder);
                        setDetailOrder(null);
                      }}
                    >
                      <Text style={styles.assignBtnText}>🛵 تعيين كابتن توصيل</Text>
                    </TouchableOpacity>
                  )}

                  {/* Complete delivery */}
                  {detailOrder.status === 'OUT_FOR_DELIVERY' && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => {
                        updateOrderStatus(detailOrder.id, 'DELIVERED');
                        setDetailOrder(null);
                      }}
                    >
                      <Text style={styles.completeBtnText}>✓ تأكيد الاستلام وإغلاق الطلب</Text>
                    </TouchableOpacity>
                  )}

                  {/* Flag user */}
                  {!isFlagged(detailOrder.customerPhone) && (
                    <TouchableOpacity
                      style={styles.flagBtn}
                      onPress={() => {
                        setFlagModalUser({
                          name: detailOrder.customerName,
                          phone: detailOrder.customerPhone,
                        });
                        setDetailOrder(null);
                      }}
                    >
                      <Text style={styles.flagBtnText}>⚠️ الإبلاغ عن هذا العميل</Text>
                    </TouchableOpacity>
                  )}
                  {isFlagged(detailOrder.customerPhone) && (
                    <View style={styles.fraudNoticeBox}>
                      <Text style={styles.fraudNoticeText}>
                        ⚠️ هذا الرقم مُسجَّل في قائمة التحقق — تعامل بحذر
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ════════════════ Assign Driver Modal ════════════════ */}
      {assignModalOrder && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setAssignModalOrder(null)}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>تعيين كابتن — طلب #{assignModalOrder.orderNumber}</Text>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.assignSubtitle}>اختر موصلاً من محافظة العميل:</Text>
                {assignableDrivers.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>{assignModalOrder.customerGovernorateId ? 'لا يوجد موصل مسجل في محافظة العميل' : 'محافظة العميل غير متاحة لهذا الطلب'}</Text>
                  </View>
                )}
                {assignableDrivers.map((driver) => (
                  <TouchableOpacity
                    key={driver.driverId}
                    style={[styles.driverCard, assigningDriverId !== null && { opacity: 0.65 }]}
                    disabled={assigningDriverId !== null}
                    onPress={() => void handleAssignDriver(
                        assignModalOrder,
                        driver.driverId,
                        driver.driverName
                      )}
                  >
                    <View style={[
                      styles.driverStatusDot,
                      { backgroundColor: driver.status === 'ONLINE' ? '#22C55E' : driver.status === 'BUSY' ? '#F59E0B' : '#9CA3AF' },
                    ]} />
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{driver.driverName}</Text>
                      <Text style={styles.driverPhone}>{driver.phone}</Text>
                      <Text style={styles.driverPhone}>{driver.governorateName}</Text>
                    </View>
                    <View style={[
                      styles.driverStatusBadge,
                      { backgroundColor: driver.status === 'ONLINE' ? '#DCFCE7' : driver.status === 'BUSY' ? '#FEF9C3' : '#F3F4F6' },
                    ]}>
                      {assigningDriverId === driver.driverId
                        ? <ActivityIndicator color={colors.primary} />
                        : <Text style={[styles.driverStatusText, { color: driver.status === 'ONLINE' ? '#16A34A' : driver.status === 'BUSY' ? '#B45309' : '#6B7280' }]}>{driver.status === 'ONLINE' ? 'متاح' : driver.status === 'BUSY' ? 'مشغول' : 'غير متاح'}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ════════════════ Reject Order Modal ════════════════ */}
      {rejectModalOrder && (
        <Modal visible transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertCard}>
              <Text style={styles.alertCardTitle}>رفض الطلب #{rejectModalOrder.orderNumber}</Text>
              <Text style={styles.alertCardSubtitle}>يرجى كتابة سبب الرفض ليتم إشعار العميل:</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="سبب الرفض..."
                placeholderTextColor={colors.outline}
                value={rejectReasonInput}
                onChangeText={setRejectReasonInput}
                multiline
                textAlign="right"
              />
              <View style={styles.alertCardBtns}>
                <TouchableOpacity
                  style={styles.alertCancelBtn}
                  onPress={() => setRejectModalOrder(null)}
                >
                  <Text style={styles.alertCancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.alertConfirmRejectBtn}
                  onPress={handleRejectOrder}
                >
                  <Text style={styles.alertConfirmRejectText}>تأكيد الرفض</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ════════════════ Flag User Modal ════════════════ */}
      {flagModalUser && (
        <Modal visible transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertCard}>
              <Text style={styles.alertCardTitle}>🚨 إبلاغ عن عميل</Text>
              <Text style={styles.alertCardSubtitle}>
                الرقم: {flagModalUser.phone} — {flagModalUser.name}
              </Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="سبب الإبلاغ (ألغى الطلب، رفض الاستلام...)"
                placeholderTextColor={colors.outline}
                value={flagReason}
                onChangeText={setFlagReason}
                multiline
                textAlign="right"
              />
              <View style={styles.alertCardBtns}>
                <TouchableOpacity
                  style={styles.alertCancelBtn}
                  onPress={() => setFlagModalUser(null)}
                >
                  <Text style={styles.alertCancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.alertConfirmRejectBtn}
                  onPress={handleFlagUser}
                >
                  <Text style={styles.alertConfirmRejectText}>تسجيل التحذير</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ════════════════ Workflow Settings Modal ════════════════ */}
      {showWorkflowSettings && (
        <Modal visible transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertCard}>
              <Text style={styles.alertCardTitle}>⚙️ إعدادات سير الطلبات</Text>
              <Text style={styles.alertCardSubtitle}>
                السياسة الحالية تجمع بين المراجعة اليدوية والحماية الآلية:
              </Text>
              <Text style={styles.alertCardSubtitle}>
                الطلبات العشرة الأولى لا تُقبل حتى توافق عليها الإدارة ثم تعيّن المندوب. بعد استلام العميل 10 طلبات، تُقبل الطلبات الجديدة آلياً وتُسند إلى مندوب متاح ذي أقل عدد من الطلبات النشطة.
              </Text>

              <TouchableOpacity
                style={[styles.alertConfirmRejectBtn, { marginTop: spacing.baseSm }]}
                onPress={() => setShowWorkflowSettings(false)}
              >
                <Text style={styles.alertConfirmRejectText}>حفظ وإغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ════════════════ Fraud Panel Modal ════════════════ */}
      {showFraudPanel && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowFraudPanel(false)}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>🛡 قائمة المراقبة والحظر</Text>
              </View>

              <ScrollView style={styles.modalBody}>
                {flaggedUsers.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>✅</Text>
                    <Text style={styles.emptyText}>لا يوجد أرقام مُبلَّغ عنها</Text>
                  </View>
                )}
                {flaggedUsers.map((user) => (
                  <View key={user.id} style={[styles.fraudUserCard, user.isBanned && styles.fraudUserCardBanned]}>
                    <View style={styles.fraudUserHeader}>
                      <View style={styles.fraudUserBadge}>
                        <Text style={styles.fraudUserBadgeText}>
                          {user.isBanned ? '🚫 محظور' : '⚠️ مُبلَّغ عنه'}
                        </Text>
                      </View>
                      <Text style={styles.fraudUserName}>{user.name}</Text>
                    </View>
                    <Text style={styles.fraudUserPhone}>{user.phone}</Text>
                    <Text style={styles.fraudUserReason}>السبب: {user.reason}</Text>
                    <Text style={styles.fraudUserDate}>
                      {new Date(user.flaggedAt).toLocaleDateString('ar')}
                    </Text>
                    <View style={styles.fraudUserActions}>
                      {!user.isBanned ? (
                        <TouchableOpacity
                          style={styles.banBtn}
                          onPress={() => banUser(user.id)}
                        >
                          <Text style={styles.banBtnText}>🚫 حظر الرقم</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.unbanBtn}
                          onPress={() => unbanUser(user.id)}
                        >
                          <Text style={styles.unbanBtnText}>✓ رفع الحظر</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.removeFlagBtn}
                        onPress={() => unflagUser(user.id)}
                      >
                        <Text style={styles.removeFlagBtnText}>حذف من القائمة</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Controls
  controlsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  controlBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 7,
    borderRadius: borderRadius.lg,
  },
  controlBtnWorkflow: { backgroundColor: colors.primaryFixedDim + '25', borderWidth: 1, borderColor: colors.primary + '30' },
  controlBtnFraud: { backgroundColor: colors.errorContainer + '20', borderWidth: 1, borderColor: colors.error + '30' },
  controlBtnIcon: { fontSize: 15 },
  controlBtnLabel: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onSurface },

  // Workflow banner
  workflowBanner: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: spacing.screenGutter,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  workflowBannerAuto: { backgroundColor: '#F0FDF4', borderBottomColor: '#BBF7D0' },
  workflowBannerText: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurface, textAlign: 'right' },

  // Filter tabs
  filterWrap: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingVertical: spacing.baseXs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  filterScroll: {
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  tabBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  tabBtnTextActive: { fontFamily: 'Tajawal_700Bold', color: colors.onPrimary },
  tabCount: {
    backgroundColor: colors.outlineVariant + '60',
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: colors.onPrimary + '30' },
  tabCountText: { fontSize: 10, color: colors.onSurfaceVariant, fontWeight: '700' },
  tabCountTextActive: { color: colors.onPrimary },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    paddingBottom: 120,
  },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontFamily: 'Tajawal_500Medium', fontSize: 15, color: colors.outline },

  // Order card
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  orderCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumberInfo: { alignItems: 'flex-end' },
  orderNum: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.primary },
  orderTime: { fontSize: 12, color: colors.outline },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },
  fraudWarningRow: {
    backgroundColor: colors.errorContainer + '30',
    borderRadius: borderRadius.md,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  fraudWarningText: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.error, textAlign: 'right' },
  customerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  customerName: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.onSurface },
  customerPhone: { fontFamily: 'Tajawal_400Regular', fontSize: 14, color: colors.onSurfaceVariant },
  addressLine: { fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: 2 },
  orderNoteBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  orderNoteText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    color: '#92400E',
    textAlign: 'right',
  },
  detailNotesCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  detailNotesTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 13,
    color: '#92400E',
    textAlign: 'right',
    marginBottom: 4,
  },
  detailNotesBody: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 13,
    color: '#78350F',
    textAlign: 'right',
    lineHeight: 18,
  },
  subOrdersBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseXs,
    borderRadius: borderRadius.md,
    marginTop: 6,
  },
  subOrdersTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 12, color: colors.outline, textAlign: 'right' },
  subOrderItem: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.onSurface, textAlign: 'right', marginTop: 2 },
  orderFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.baseSm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  driverTag: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  driverTagText: { fontFamily: 'Tajawal_500Medium', fontSize: 12, color: colors.onSurface },
  totalVal: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.primary },

  // ── Detail modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(19,27,46,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.screenGutter,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIcon: { fontSize: 16, color: colors.outline },
  modalTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 17, color: colors.onSurface },
  modalBody: { paddingBottom: 24 },

  detailStatusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.baseSm,
  },
  detailStatusText: { fontFamily: 'Tajawal_700Bold', fontSize: 15 },
  detailStatusMode: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant, flex: 1, textAlign: 'left' },

  detailSection: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  sectionHeading: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.primary, textAlign: 'right', marginBottom: 8 },
  detailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '20',
  },
  detailLbl: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  detailVal: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onSurface },

  subOrderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.baseSm,
    borderRadius: borderRadius.md,
    marginBottom: 6,
  },
  soStoreName: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.onSurface, textAlign: 'right', marginBottom: 4 },
  soItemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 2 },
  soItemName: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurfaceVariant },
  soItemPrice: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.onSurface },

  sumRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 3 },
  sumLbl: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  sumVal: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurface },
  sumTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '40',
  },
  sumTotalLbl: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onSurface },
  sumTotalVal: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: colors.primary },

  actionButtons: { gap: spacing.baseXs, marginTop: spacing.baseXs, marginBottom: 20 },

  approveBtn: {
    backgroundColor: '#10B981',
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  approveBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: '#fff' },

  rejectBtn: {
    backgroundColor: colors.errorContainer + '20',
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  rejectBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.error },

  assignBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  assignBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onSecondaryContainer },

  completeBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  completeBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onPrimary },

  flagBtn: {
    backgroundColor: colors.errorContainer + '15',
    borderRadius: borderRadius.lg,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '25',
  },
  flagBtnText: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.error },

  fraudNoticeBox: {
    backgroundColor: colors.errorContainer + '25',
    borderRadius: borderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  fraudNoticeText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.error, textAlign: 'right' },

  // Driver assign modal
  assignSubtitle: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'right', marginBottom: spacing.baseSm },
  driverCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  driverStatusDot: { width: 10, height: 10, borderRadius: 5 },
  driverInfo: { flex: 1, alignItems: 'flex-end' },
  driverName: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onSurface },
  driverPhone: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurfaceVariant },
  driverStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  driverStatusText: { fontFamily: 'Tajawal_700Bold', fontSize: 12 },

  // Alert modal (reject / flag)
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenGutter,
  },
  alertCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    padding: spacing.baseMd,
    ...shadows.floating,
  },
  alertCardTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 18, color: colors.onSurface, textAlign: 'right', marginBottom: 6 },
  alertCardSubtitle: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'right', marginBottom: 10 },
  reasonInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: 12,
    fontSize: 15,
    color: colors.onSurface,
    fontFamily: 'Tajawal_400Regular',
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  alertCardBtns: { flexDirection: 'row-reverse', gap: spacing.baseSm },
  alertCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertCancelText: { fontFamily: 'Tajawal_500Medium', fontSize: 15, color: colors.onSurface },
  alertConfirmRejectBtn: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertConfirmRejectText: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: '#fff' },

  // Workflow options
  workflowOption: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    padding: spacing.baseSm,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.outlineVariant + '60',
    marginBottom: spacing.baseSm,
    backgroundColor: colors.surfaceContainerLow,
  },
  workflowOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixedDim + '20',
  },
  workflowOptionLeft: { justifyContent: 'center', paddingTop: 2 },
  radioOn: { fontSize: 20, color: colors.primary },
  radioOff: { fontSize: 20, color: colors.outline },
  workflowOptionBody: { flex: 1, alignItems: 'flex-end' },
  workflowOptionTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onSurface, marginBottom: 4 },
  workflowOptionDesc: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'right' },

  // Fraud panel
  fraudUserCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.error + '25',
  },
  fraudUserCardBanned: {
    backgroundColor: colors.errorContainer + '15',
    borderColor: colors.error + '60',
  },
  fraudUserHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fraudUserName: { fontFamily: 'Tajawal_700Bold', fontSize: 15, color: colors.onSurface },
  fraudUserBadge: {
    backgroundColor: colors.errorContainer + '30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  fraudUserBadgeText: { fontFamily: 'Tajawal_700Bold', fontSize: 11, color: colors.error },
  fraudUserPhone: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'right' },
  fraudUserReason: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: 2 },
  fraudUserDate: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.outline, textAlign: 'right', marginTop: 2 },
  fraudUserActions: { flexDirection: 'row-reverse', gap: spacing.baseXs, marginTop: spacing.baseSm },
  banBtn: {
    flex: 1,
    backgroundColor: colors.errorContainer + '20',
    borderRadius: borderRadius.lg,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  banBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: colors.error },
  unbanBtn: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: borderRadius.lg,
    paddingVertical: 8,
    alignItems: 'center',
  },
  unbanBtnText: { fontFamily: 'Tajawal_700Bold', fontSize: 13, color: '#16A34A' },
  removeFlagBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  removeFlagBtnText: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
});
