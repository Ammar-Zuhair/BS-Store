import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { Order, OrderStatusType } from '../types';

export const TrackingScreen: React.FC = () => {
  const { orders, navigateTo, currentOrder, setCurrentOrder, refreshOrders, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshOrders) await refreshOrders();
    } catch (e) {
      console.warn('Failed to refresh orders:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedOrder =
    (selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : null) ||
    currentOrder ||
    null;

  const getStatusInfo = (status: OrderStatusType) => {
    switch (status) {
      case 'DELIVERED':
        return {
          label: 'تم التسليم بنجاح ✓',
          bgColor: themeColors.success + '20',
          textColor: themeColors.success,
          borderColor: themeColors.success + '50',
          stepIndex: 4,
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'في الطريق إليك 🛵',
          bgColor: themeColors.primary + '20',
          textColor: themeColors.primary,
          borderColor: themeColors.primary + '50',
          stepIndex: 3,
        };
      case 'PURCHASING':
      case 'WAREHOUSE_PICKUP':
        return {
          label: 'جاري التجهيز والشراء 🛍️',
          bgColor: '#FF980025',
          textColor: '#E65100',
          borderColor: '#FF980050',
          stepIndex: 2,
        };
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ACCEPTED':
        return {
          label: 'تم تعيين الكابتن 🛵',
          bgColor: themeColors.primary + '20',
          textColor: themeColors.primary,
          borderColor: themeColors.primary + '50',
          stepIndex: 1,
        };
      case 'PENDING_PAYMENT':
      case 'PAYMENT_PENDING_VERIFICATION':
        return {
          label: 'قيد المراجعة والتحقق ⏳',
          bgColor: '#F57C0020',
          textColor: '#E65100',
          borderColor: '#F57C0040',
          stepIndex: 0,
        };
      case 'CANCELLED':
        return {
          label: 'ملغي ❌',
          bgColor: themeColors.error + '20',
          textColor: themeColors.error,
          borderColor: themeColors.error + '50',
          stepIndex: 0,
        };
      default:
        return {
          label: 'قيد المعالجة',
          bgColor: themeColors.surfaceContainerHigh,
          textColor: themeColors.onSurface,
          borderColor: themeColors.outlineVariant,
          stepIndex: 0,
        };
    }
  };

  const steps: { key: OrderStatusType; title: string; desc: string; icon: string }[] = [
    {
      key: 'CONFIRMED',
      title: 'تم تأكيد الطلب',
      desc: 'تم استلام طلبك وبانتظار تحرك الكابتن',
      icon: '✓',
    },
    {
      key: 'DRIVER_ASSIGNED',
      title: 'تم تعيين الكابتن',
      desc: 'الكابتن في طريقه إلى المتاجر',
      icon: '🛵',
    },
    {
      key: 'PURCHASING',
      title: 'جاري الشراء وتجهيز الأصناف',
      desc: 'شراء الأصناف المحددة وتوثيق الفاتورة',
      icon: '🛍️',
    },
    {
      key: 'OUT_FOR_DELIVERY',
      title: 'في الطريق إليك',
      desc: 'الكابتن متوجه الآن إلى عنوانك',
      icon: '🚀',
    },
    {
      key: 'DELIVERED',
      title: 'تم التوصيل بنجاح',
      desc: 'نتمنى لك تجربة ممتعة مع BS Store',
      icon: '🎉',
    },
  ];

  const handleCallDriver = (order: Order) => {
    if (order.driver?.phone) {
      Alert.alert(
        'الاتصال بالكابتن',
        `هل ترغب بالاتصال بالكابتن ${order.driver.name} على الرقم ${order.driver.phone}؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'اتصال', onPress: () => Linking.openURL(`tel:${order.driver?.phone}`) },
        ]
      );
    }
  };

  // View: Order Details and Live Tracking
  if (selectedOrder) {
    const statusInfo = getStatusInfo(selectedOrder.status);
    const currentStepIndex = statusInfo.stepIndex;

    return (
      <View style={styles.container}>
        <Header
          title={`تفاصيل طلب #${selectedOrder.orderNumber}`}
          showBack
          onBack={() => {
            setSelectedOrderId(null);
            setCurrentOrder(null);
          }}
          rightAction={
            <TouchableOpacity
              style={styles.refreshHeaderBtn}
              onPress={handleRefresh}
              disabled={isRefreshing}
              activeOpacity={0.7}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <View style={styles.refreshBtnInner}>
                  <Text style={styles.refreshIconText}>🔄</Text>
                  <Text style={styles.refreshLabelText}>تحديث</Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[themeColors.primary]}
              tintColor={themeColors.primary}
            />
          }
        >
          {/* Order Status Banner */}
          <View style={styles.orderNumberCard}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusInfo.bgColor,
                  borderColor: statusInfo.borderColor,
                },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusInfo.textColor }]}>
                {statusInfo.label}
              </Text>
            </View>
            <View style={styles.orderNumberWrap}>
              <Text style={styles.orderNumber}>
                طلب #{selectedOrder.orderNumber}
              </Text>
              <Text style={styles.orderTime}>
                تاريخ الطلب: {selectedOrder.createdAt}
              </Text>
            </View>
          </View>

          {/* Map Simulation if active order */}
          {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
            <View style={styles.mapCard}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80',
                }}
                style={styles.mapImage}
              />
              <View style={styles.mapOverlay}>
                <View style={styles.driverPin}>
                  <Text style={styles.driverPinIcon}>🛵</Text>
                  <View style={styles.pinBubble}>
                    <Text style={styles.pinBubbleText}>
                      {selectedOrder.driver?.name || 'الكابتن'} (يبعد 1.2 كم)
                    </Text>
                  </View>
                </View>

                <View style={styles.etaCard}>
                  <Text style={styles.etaLabel}>الوقت المقدر للوصول:</Text>
                  <Text style={styles.etaValue}>15 - 20 دقيقة</Text>
                </View>
              </View>
            </View>
          )}

          {/* Driver Card */}
          {selectedOrder.driver && (
            <View style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCallDriver(selectedOrder)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callButtonIcon}>📞</Text>
                  <Text style={styles.callButtonText}>اتصال</Text>
                </TouchableOpacity>

                <View style={styles.driverInfo}>
                  <View style={styles.driverNameRow}>
                    <Text style={styles.driverName}>
                      {selectedOrder.driver.name}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingStar}>⭐</Text>
                      <Text style={styles.ratingScore}>
                        {selectedOrder.driver.rating}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.vehiclePlate}>
                    كابتن معتمد • {selectedOrder.driver.vehiclePlate}
                  </Text>
                </View>

                <View style={styles.driverAvatar}>
                  <Text style={{ fontSize: 22 }}>🛵</Text>
                </View>
              </View>
            </View>
          )}

          {/* Stepper Timeline */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>مراحل تنفيذ الطلب</Text>
            {steps.map((step, index) => {
              const isPassed = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={styles.stepIndicatorCol}>
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && styles.stepDotPassed,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      <Text style={styles.stepDotIcon}>{step.icon}</Text>
                    </View>
                    {index < steps.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          index < currentStepIndex && styles.stepLinePassed,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isPassed && styles.stepTitlePassed,
                        isCurrent && styles.stepTitleCurrent,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Items breakdown */}
          <View style={styles.itemsCard}>
            <Text style={styles.timelineTitle}>الأصناف المطلوبة</Text>
            {selectedOrder.items.map((item, idx) => {
              const pieceName = item.selectedPiece
                ? ` (${item.selectedPiece.name})`
                : '';
              const itemPrice = item.selectedPiece
                ? item.selectedPiece.price
                : (item.product.discountPrice ?? item.product.sellingPrice);
              return (
                <View key={idx} style={styles.orderItemRow}>
                  <Text style={styles.orderItemPrice}>
                    {(itemPrice * item.quantity).toLocaleString()} ر.ي
                  </Text>
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.orderItemName}>
                      {item.product.name}
                      {pieceName}
                    </Text>
                    <Text style={styles.orderItemQty}>
                      الكمية: {item.quantity} × {itemPrice.toLocaleString()} ر.ي
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Address & Payment Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>تفاصيل الطلب والعنوان</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailVal}>
                {selectedOrder.address.city}، {selectedOrder.address.district} -{' '}
                {selectedOrder.address.street}
              </Text>
              <Text style={styles.detailLbl}>وجهة التوصيل:</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailVal}>
                {selectedOrder.paymentMethod === 'CASH_ON_DELIVERY'
                  ? 'الدفع نقداً عند الاستلام'
                  : 'تحويل بنكي / إشعار سداد'}
              </Text>
              <Text style={styles.detailLbl}>طريقة الدفع:</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailTotal}>
                {selectedOrder.totalAmount.toLocaleString()} ر.ي
              </Text>
              <Text style={styles.detailLbl}>إجمالي المبلغ:</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshOrderNowBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
            activeOpacity={0.8}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.refreshOrderNowBtnText}>🔄 تحديث حالة الطلب الآن</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToListBtn}
            onPress={() => {
              setSelectedOrderId(null);
              setCurrentOrder(null);
            }}
          >
            <Text style={styles.backToListBtnText}>
              العودة إلى قائمة جميع الطلبات
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // View: List of all Order Cards
  return (
    <View style={styles.container}>
      <Header
        title="طلباتي"
        showBack
        onBack={() => navigateTo('home')}
        rightAction={
          <TouchableOpacity
            style={styles.refreshHeaderBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <View style={styles.refreshBtnInner}>
                <Text style={styles.refreshIconText}>🔄</Text>
                <Text style={styles.refreshLabelText}>تحديث</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[themeColors.primary]}
              tintColor={themeColors.primary}
            />
          }
        >
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>لا توجد طلبات سابقة</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigateTo('home')}
          >
            <Text style={styles.browseBtnText}>ابدأ التسوق الآن</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptyRefreshBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Text style={styles.emptyRefreshBtnText}>🔄 تحديث الطلبات</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[themeColors.primary]}
              tintColor={themeColors.primary}
            />
          }
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderBadge}>{orders.length} طلبات</Text>
            <Text style={styles.listHeaderTitle}>سجل الطلبات والتتبع</Text>
          </View>

          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const storesNames = Array.from(
              new Set(order.items.map((i) => i.product.storeName))
            ).join(' • ');

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.88}
                onPress={() => setSelectedOrderId(order.id)}
              >
                {/* Header row: Order # & Status Badge */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.cardStatusBadge,
                      {
                        backgroundColor: statusInfo.bgColor,
                        borderColor: statusInfo.borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardStatusText,
                        { color: statusInfo.textColor },
                      ]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardOrderNumber}>
                      طلب #{order.orderNumber}
                    </Text>
                    <Text style={styles.cardOrderDate}>{order.createdAt}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Body: Stores & Items */}
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoVal} numberOfLines={1}>
                      {storesNames || 'متجر BS Store'}
                    </Text>
                    <Text style={styles.infoLbl}>المتاجر:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoVal}>
                      {order.items.length} أصناف
                    </Text>
                    <Text style={styles.infoLbl}>عدد الأصناف:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoVal}>
                      {order.address.district} - {order.address.street}
                    </Text>
                    <Text style={styles.infoLbl}>العنوان:</Text>
                  </View>
                </View>

                {/* Footer: Amount & Action Link */}
                <View style={styles.cardFooter}>
                  <View style={styles.actionWrap}>
                    <Text style={styles.actionText}>عرض التفاصيل والتتبع</Text>
                    <Text style={styles.actionArrow}>←</Text>
                  </View>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amountVal}>
                      {order.totalAmount.toLocaleString()} ر.ي
                    </Text>
                    <Text style={styles.amountLbl}>الإجمالي</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
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
    paddingBottom: 120,
  },
  listHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    marginTop: 4,
  },
  listHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  listHeaderBadge: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWrap: {
    alignItems: 'flex-end',
  },
  cardOrderNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  cardOrderDate: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  cardStatusText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant + '25',
    marginVertical: 10,
  },
  cardBody: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLbl: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  infoVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.semiBold,
    maxWidth: '75%',
    textAlign: 'left',
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '20',
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amountLbl: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  amountVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  actionWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  actionArrow: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenGutter,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: spacing.baseSm,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    marginBottom: spacing.baseMd,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseLg,
    paddingVertical: spacing.baseSm,
    borderRadius: borderRadius.lg,
  },
  browseBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  orderNumberCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  orderNumberWrap: {
    alignItems: 'flex-end',
  },
  orderNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  orderTime: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  mapCard: {
    height: 170,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.baseSm,
    position: 'relative',
    ...shadows.card,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'space-between',
    padding: spacing.baseSm,
  },
  driverPin: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 16,
  },
  driverPinIcon: {
    fontSize: 26,
  },
  pinBubble: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: 2,
    ...shadows.card,
  },
  pinBubbleText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  etaCard: {
    backgroundColor: 'rgba(19, 27, 46, 0.88)',
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary + 'CC',
  },
  etaValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  driverCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  driverHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primaryFixed,
    backgroundColor: colors.primaryFixed + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.baseSm,
  },
  driverInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  ratingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.tertiaryFixedDim + '40',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  ratingStar: {
    fontSize: 11,
  },
  ratingScore: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.tertiary,
  },
  vehiclePlate: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  callButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
  },
  callButtonIcon: {
    fontSize: 12,
  },
  callButtonText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  timelineCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    ...shadows.card,
  },
  timelineTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: spacing.baseSm,
  },
  timelineStep: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
    marginLeft: spacing.baseSm,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotPassed: {
    backgroundColor: colors.primary,
  },
  stepDotCurrent: {
    backgroundColor: colors.secondaryContainer,
    transform: [{ scale: 1.15 }],
  },
  stepDotIcon: {
    fontSize: 11,
    color: colors.onPrimary,
  },
  stepLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: -2,
    marginBottom: -2,
  },
  stepLinePassed: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stepTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.outline,
    textAlign: 'right',
  },
  stepTitlePassed: {
    color: colors.onSurface,
  },
  stepTitleCurrent: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.extraBold,
  },
  stepDesc: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  itemsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    ...shadows.card,
  },
  orderItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  orderItemDetails: {
    alignItems: 'flex-end',
    flex: 1,
  },
  orderItemName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  orderItemQty: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  orderItemPrice: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  detailsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    ...shadows.card,
  },
  detailsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: spacing.baseXs,
  },
  detailItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  detailLbl: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  detailVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.semiBold,
    maxWidth: '70%',
    textAlign: 'left',
  },
  detailTotal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  backToListBtn: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
    marginTop: 6,
  },
  backToListBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  refreshHeaderBtn: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    height: 36,
  },
  refreshBtnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  refreshIconText: {
    fontSize: 13,
  },
  refreshLabelText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  refreshOrderNowBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  refreshOrderNowBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  emptyRefreshBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  emptyRefreshBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
