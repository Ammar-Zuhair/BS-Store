import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { Order, OrderStatusType } from '../types';
import { ordersApi, paymentsApi } from '../api';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { CachedImage } from '../components/CachedImage';
import { BoosthisScreenTracker } from '../monitoring/BoosthisRuntime';
import { chooseTransferReceipt, TransferReceiptImage } from '../utils/transferReceipt';

export const TrackingScreen: React.FC = () => {
  const { orders, stores, navigateTo, currentOrder, setCurrentOrder, refreshOrders, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [priceComplaintFor, setPriceComplaintFor] = useState<{ id: string; name: string } | null>(null);
  const [priceComplaintReason, setPriceComplaintReason] = useState('');
  const [priceComplaintNotes, setPriceComplaintNotes] = useState('');
  const [isSubmittingPriceComplaint, setIsSubmittingPriceComplaint] = useState(false);
  const [transferInfo, setTransferInfo] = useState<Awaited<ReturnType<typeof paymentsApi.getTransferInfo>> | null>(null);
  const [isLoadingTransferInfo, setIsLoadingTransferInfo] = useState(false);
  const [isUploadingTransferReceipt, setIsUploadingTransferReceipt] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<TransferReceiptImage | null>(null);
  const [transferInfoRefreshKey, setTransferInfoRefreshKey] = useState(0);

  const selectedOrder =
    (currentOrder ? orders.find((o) => o.id === currentOrder.id) || currentOrder : null) ||
    null;

  useEffect(() => { setReceiptDraft(null); }, [selectedOrder?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshOrders) await refreshOrders();
      setTransferInfoRefreshKey((key) => key + 1);
    } catch (e) {
      console.warn('Failed to refresh orders:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, []);

  useEffect(() => {
    if (!selectedOrder || selectedOrder.paymentMethod !== 'MANUAL_TRANSFER') {
      setTransferInfo(null);
      setIsLoadingTransferInfo(false);
      return;
    }

    let active = true;
    setIsLoadingTransferInfo(true);
    paymentsApi.getTransferInfo(selectedOrder.id)
      .then((info) => { if (active) setTransferInfo(info); })
      .catch((error) => {
        if (active) {
          setTransferInfo(null);
          console.warn('Failed to load transfer details:', error);
        }
      })
      .finally(() => { if (active) setIsLoadingTransferInfo(false); });
    return () => { active = false; };
  }, [selectedOrder?.id, selectedOrder?.paymentMethod, selectedOrder?.paymentStatus, transferInfoRefreshKey]);

  const handleUploadTransferReceipt = async () => {
    if (!selectedOrder || selectedOrder.paymentMethod !== 'MANUAL_TRANSFER') return;
    setIsUploadingTransferReceipt(true);
    try {
      if (!receiptDraft) return;
      await paymentsApi.uploadReceipt(selectedOrder.id, receiptDraft.uri, receiptDraft.fileName, receiptDraft.mimeType);
      setReceiptDraft(null);
      Alert.alert('تم إرسال الإيصال', 'أرسلنا صورة التحويل إلى الإدارة لمراجعتها.');
      try {
        const nextInfo = await paymentsApi.getTransferInfo(selectedOrder.id);
        setTransferInfo(nextInfo);
        await refreshOrders?.();
      } catch { setTransferInfoRefreshKey(key => key + 1); }
    } catch (error: any) {
      Alert.alert('تعذر رفع الإيصال', error?.message || 'تحقق من الصورة والاتصال ثم حاول مجدداً.');
    } finally {
      setIsUploadingTransferReceipt(false);
    }
  };

  const getStatusInfo = (status: OrderStatusType) => {
    switch (status) {
      case 'DELIVERED':
        return {
          label: 'تم التسليم بنجاح',
          bgColor: themeColors.success + '20',
          textColor: themeColors.success,
          borderColor: themeColors.success + '50',
          stepIndex: 4,
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'في الطريق إليك',
          bgColor: themeColors.primary + '20',
          textColor: themeColors.primary,
          borderColor: themeColors.primary + '50',
          stepIndex: 3,
        };
      case 'PURCHASING':
      case 'WAREHOUSE_PICKUP':
        return {
          label: 'جاري التجهيز والشراء',
          bgColor: themeColors.tertiaryContainer,
          textColor: themeColors.onTertiaryContainer,
          borderColor: themeColors.tertiary + '55',
          stepIndex: 2,
        };
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ACCEPTED':
        return {
          label: 'تم تعيين الكابتن',
          bgColor: themeColors.primary + '20',
          textColor: themeColors.primary,
          borderColor: themeColors.primary + '50',
          stepIndex: 1,
        };
      case 'PENDING_PAYMENT':
      case 'PAYMENT_PENDING_VERIFICATION':
        return {
          label: 'قيد المراجعة والتحقق',
          bgColor: themeColors.tertiaryContainer,
          textColor: themeColors.onTertiaryContainer,
          borderColor: themeColors.tertiary + '55',
          stepIndex: 0,
        };
      case 'PAYMENT_FAILED':
        return {
          label: 'تعذر تأكيد التحويل',
          bgColor: themeColors.error + '20',
          textColor: themeColors.error,
          borderColor: themeColors.error + '50',
          stepIndex: 0,
        };
      case 'PENDING_ADMIN_APPROVAL':
        return {
          label: 'بانتظار موافقة الإدارة',
          bgColor: themeColors.tertiaryContainer,
          textColor: themeColors.onTertiaryContainer,
          borderColor: themeColors.tertiary + '55',
          stepIndex: 0,
        };
      case 'CANCELLED':
        return {
          label: 'ملغي',
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

  const steps: { key: OrderStatusType; title: string; desc: string; icon: AppIconName }[] = [
    {
      key: 'CONFIRMED',
      title: 'تم تأكيد الطلب',
      desc: 'تم استلام طلبك وبانتظار تحرك الكابتن',
      icon: 'check-circle',
    },
    {
      key: 'DRIVER_ASSIGNED',
      title: 'تم تعيين الكابتن',
      desc: 'الكابتن في طريقه إلى المتاجر',
      icon: 'bike',
    },
    {
      key: 'PURCHASING',
      title: 'جاري الشراء وتجهيز الأصناف',
      desc: 'شراء الأصناف المحددة وتوثيق الفاتورة',
      icon: 'shopping-bag',
    },
    {
      key: 'OUT_FOR_DELIVERY',
      title: 'في الطريق إليك',
      desc: 'الكابتن متوجه الآن إلى عنوانك',
      icon: 'truck',
    },
    {
      key: 'DELIVERED',
      title: 'تم التوصيل بنجاح',
      desc: 'نتمنى لك تجربة ممتعة مع BS Store',
      icon: 'check',
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

  const confirmCancelOrder = (order: Order) => {
    Alert.alert('إلغاء الطلب', 'هل تريد إلغاء هذا الطلب؟', [
      { text: 'متابعة الطلب', style: 'cancel' },
      {
        text: 'إلغاء الطلب',
        style: 'destructive',
        onPress: async () => {
          setIsCancellingOrder(true);
          try {
            await ordersApi.cancelOrder(order.id, 'CUSTOMER_REQUEST', 'إلغاء بطلب العميل قبل قبول السائق');
            await refreshOrders?.();
            Alert.alert('تم إلغاء الطلب', 'تم إلغاء طلبك بنجاح');
          } catch (error) {
            Alert.alert('تعذر إلغاء الطلب', error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى');
          } finally {
            setIsCancellingOrder(false);
          }
        },
      },
    ]);
  };

  // View: Order Details and Live Tracking
  if (selectedOrder) {
    const statusInfo = getStatusInfo(selectedOrder.status);
    const currentStepIndex = statusInfo.stepIndex;
    const canCancelOrder = [
      'PENDING_PAYMENT',
      'PENDING_ADMIN_APPROVAL',
      'PAYMENT_PENDING_VERIFICATION',
      'CONFIRMED',
      'SEARCHING_DRIVER',
      'DRIVER_ASSIGNED',
    ].includes(selectedOrder.status);
    const transferStatus = String(transferInfo?.status ?? '').toLowerCase();
    const canUploadTransferReceipt = selectedOrder.status !== 'CANCELLED' &&
      selectedOrder.status !== 'DELIVERED' &&
      selectedOrder.paymentMethod === 'MANUAL_TRANSFER' && (
      ['0', '3', 'pending', 'rejected'].includes(transferStatus) ||
      (!transferInfo && ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(selectedOrder.status))
    );

    return (
      <View style={styles.container}>
        <BoosthisScreenTracker screen="OrderDetails" />
        <Header
          title={`تفاصيل طلب #${selectedOrder.orderNumber}`}
          showBack
          onBack={() => {
            setCurrentOrder(null);
          }}
          rightAction={
            <TouchableOpacity
              style={styles.refreshHeaderBtn}
              onPress={handleRefresh}
              disabled={isRefreshing}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="تحديث حالة الطلب"
              accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <View style={styles.refreshBtnInner}>
                  <AppIcon name="refresh" size={15} color={themeColors.primary} />
                  <Text style={styles.refreshLabelText}>تحديث</Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />

        <KeyboardAwareScrollView
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

          {canCancelOrder && (
            <TouchableOpacity
              onPress={() => confirmCancelOrder(selectedOrder)}
              disabled={isCancellingOrder}
              accessibilityRole="button"
              accessibilityLabel="إلغاء الطلب"
              accessibilityState={{ disabled: isCancellingOrder, busy: isCancellingOrder }}
              style={{ minHeight: 48, borderWidth: 1, borderColor: themeColors.error, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14, opacity: isCancellingOrder ? 0.6 : 1 }}
            >
              {isCancellingOrder
                ? <ActivityIndicator color={themeColors.error} />
                : <Text style={{ color: themeColors.error, fontWeight: '700' }}>إلغاء الطلب</Text>}
            </TouchableOpacity>
          )}

          {/* Driver Card */}
          {selectedOrder.driver && (
            <View style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCallDriver(selectedOrder)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="الاتصال بالكابتن"
                >
                  <AppIcon name="phone" size={16} color={themeColors.onPrimary} />
                  <Text style={styles.callButtonText}>اتصال</Text>
                </TouchableOpacity>

                <View style={styles.driverInfo}>
                  <View style={styles.driverNameRow}>
                    <Text style={styles.driverName}>
                      {selectedOrder.driver.name}
                    </Text>
                  </View>
                  {!!selectedOrder.driver.phone && <Text style={styles.vehiclePlate}>{selectedOrder.driver.phone}</Text>}
                </View>

                <View style={styles.driverAvatar}>
                  <AppIcon name="bike" size={22} color={themeColors.primary} />
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
                      <AppIcon
                        name={step.icon}
                        size={15}
                        color={isPassed ? themeColors.onPrimary : themeColors.onSurfaceVariant}
                      />
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

          {selectedOrder.status === 'DELIVERED' && (selectedOrder.customerRating ? (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>تقييمك: {'★'.repeat(selectedOrder.customerRating)} ({selectedOrder.customerRating}/5)</Text>
              {!!selectedOrder.customerReview && <Text style={styles.stepDesc}>{selectedOrder.customerReview}</Text>}
            </View>
          ) : (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>كيف كانت تجربتك؟</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 12 }}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => setReviewRating(rating)}
                    style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                    accessibilityRole="button"
                    accessibilityLabel={`تقييم ${rating} من 5`}
                    accessibilityState={{ selected: rating === reviewRating }}
                  >
                    <AppIcon name="star" size={25} color={rating <= reviewRating ? themeColors.tertiary : themeColors.outlineVariant} />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={reviewComment} onChangeText={setReviewComment} placeholder="اكتب ملاحظتك عن الطلب" placeholderTextColor={themeColors.outline} accessibilityLabel="ملاحظتك عن الطلب" multiline style={{ minHeight: 72, textAlign: 'right', borderWidth: 1, borderColor: themeColors.outlineVariant, borderRadius: 12, padding: 12, color: themeColors.onSurface, backgroundColor: themeColors.surfaceContainerLowest }} />
              <TouchableOpacity disabled={isSubmittingReview || !reviewComment.trim()} onPress={async () => {
                setIsSubmittingReview(true);
                try { await ordersApi.submitReview(selectedOrder.id, reviewRating, reviewComment.trim()); await refreshOrders?.(); Alert.alert('شكراً لك', 'تم حفظ تقييمك للطلب'); setReviewComment(''); }
                catch (error: any) { Alert.alert('تعذر حفظ التقييم', error?.message || 'حاول مرة أخرى'); }
                finally { setIsSubmittingReview(false); }
              }} accessibilityRole="button" accessibilityLabel="إرسال التقييم" accessibilityState={{ disabled: isSubmittingReview || !reviewComment.trim(), busy: isSubmittingReview }} style={{ minHeight: 48, backgroundColor: themeColors.primary, borderRadius: 12, padding: 13, alignItems: 'center', justifyContent: 'center', marginTop: 12, opacity: isSubmittingReview || !reviewComment.trim() ? 0.55 : 1 }}>
                <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold' }}>{isSubmittingReview ? 'جارٍ الحفظ...' : 'إرسال التقييم'}</Text>
              </TouchableOpacity>
            </View>
          ))}

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
              const originalPrice = item.originalUnitPrice ?? itemPrice;
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
                    {!!item.bundleTitle && <Text style={{ textAlign: 'right', color: themeColors.primary }}>ضمن باقة: {item.bundleTitle}</Text>}
                    <Text style={styles.orderItemQty}>
                      الكمية: {item.quantity} × {itemPrice.toLocaleString()} ر.ي
                    </Text>
                    {originalPrice !== itemPrice && (
                      <>
                        <Text style={styles.stepDesc}>تم تحديث السعر أثناء الشراء</Text>
                        <Text style={styles.orderItemQty}>السابق: {originalPrice.toLocaleString()} ر.ي · الجديد: {itemPrice.toLocaleString()} ر.ي</Text>
                        {!!item.priceChangeId && <TouchableOpacity
                          onPress={() => { setPriceComplaintFor({ id: item.priceChangeId!, name: item.product.name }); setPriceComplaintReason(''); setPriceComplaintNotes(''); }}
                          accessibilityRole="button"
                          style={{ minHeight: 40, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 10 }}
                        ><Text style={{ color: themeColors.error, fontFamily: 'Tajawal_700Bold' }}>الإبلاغ عن مشكلة في تغيير السعر</Text></TouchableOpacity>}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
            {priceComplaintFor && <View style={styles.priceComplaintForm}>
              <Text style={styles.timelineTitle}>بلاغ عن سعر {priceComplaintFor.name}</Text>
              <TextInput value={priceComplaintReason} onChangeText={setPriceComplaintReason} placeholder="سبب البلاغ" placeholderTextColor={themeColors.outline} accessibilityLabel="سبب بلاغ السعر" style={styles.priceComplaintInput} />
              <TextInput value={priceComplaintNotes} onChangeText={setPriceComplaintNotes} placeholder="تفاصيل إضافية (اختياري)" placeholderTextColor={themeColors.outline} accessibilityLabel="تفاصيل إضافية لبلاغ السعر" multiline style={[styles.priceComplaintInput, { minHeight: 72 }]} />
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <TouchableOpacity onPress={() => setPriceComplaintFor(null)} style={styles.priceComplaintCancel}><Text style={{ color: themeColors.onSurface }}>إلغاء</Text></TouchableOpacity>
                <TouchableOpacity disabled={isSubmittingPriceComplaint || !priceComplaintReason.trim()} onPress={async () => {
                  if (!priceComplaintFor || !selectedOrder) return;
                  setIsSubmittingPriceComplaint(true);
                  try {
                    await ordersApi.reportPriceChange(selectedOrder.id, priceComplaintFor.id, priceComplaintReason.trim(), priceComplaintNotes.trim());
                    Alert.alert('تم استلام البلاغ', 'ستراجعه الإدارة.');
                    setPriceComplaintFor(null);
                  } catch (error: any) { Alert.alert('تعذر إرسال البلاغ', error?.message || 'حاول مرة أخرى.'); }
                  finally { setIsSubmittingPriceComplaint(false); }
                }} style={[styles.priceComplaintSubmit, (!priceComplaintReason.trim() || isSubmittingPriceComplaint) && { opacity: 0.55 }]}>
                  <Text style={{ color: '#fff', fontFamily: 'Tajawal_700Bold' }}>{isSubmittingPriceComplaint ? 'جارٍ الإرسال...' : 'إرسال البلاغ'}</Text>
                </TouchableOpacity>
              </View>
            </View>}
          </View>

          {/* Address & Payment Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>تفاصيل الطلب والعنوان</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailVal}>
                {[selectedOrder.address?.city, selectedOrder.address?.district, selectedOrder.address?.street].filter(Boolean).join(' - ')}
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
            {!!selectedOrder.walletPaidAmount && <View style={styles.transferCard}>
              <Text style={{ color: themeColors.onSurface, fontFamily: 'Tajawal_500Medium', textAlign: 'right', fontSize: 16 }}>المدفوع من الرصيد: {selectedOrder.walletPaidAmount.toLocaleString()} ر.ي</Text>
              <Text style={{ color: themeColors.onSurface, fontFamily: 'Tajawal_500Medium', textAlign: 'right', fontSize: 16 }}>المسترد للمحفظة: {(selectedOrder.walletRefundedAmount || 0).toLocaleString()} ر.ي · المتبقي نقداً: {(selectedOrder.cashDueAtDelivery || 0).toLocaleString()} ر.ي</Text>
            </View>}
            {selectedOrder.paymentMethod === 'MANUAL_TRANSFER' && <View style={styles.transferCard}>
              <Text style={styles.transferTitle}>تفاصيل التحويل</Text>
              {isLoadingTransferInfo && <ActivityIndicator size="small" color={themeColors.primary} />}
              {transferInfo ? <>
                <Text style={styles.transferInfoText}>طريقة التحويل: {transferInfo.bankName || 'دفع إلكتروني'}</Text>
                {!!transferInfo.bankName && <Text style={styles.transferInfoText}>الجهة: {transferInfo.bankName}</Text>}
                {!!transferInfo.accountNumber && <Text style={styles.transferInfoText}>رقم الحساب: {transferInfo.accountNumber}</Text>}
                {!!transferInfo.accountName && <Text style={styles.transferInfoText}>اسم المستلم: {transferInfo.accountName}</Text>}
                {!!transferInfo.senderName && <Text style={styles.transferInfoText}>المرسل: {transferInfo.senderName} · {transferInfo.senderPhone}</Text>}
                {!!transferInfo.accountType && <Text selectable style={styles.transferInfoText}>نوع الحساب: {transferInfo.accountType}</Text>}
                {!!transferInfo.accountDetails && <Text selectable style={styles.transferInfoText}>{transferInfo.accountDetails}</Text>}
                {!!transferInfo.instructions && <Text selectable style={styles.transferInfoText}>{transferInfo.instructions}</Text>}
                {!!transferInfo.imageUrl && <Image source={{ uri: transferInfo.imageUrl }} style={{ width: 100, height: 80, alignSelf: 'center' }} resizeMode="contain" />}
                {!!transferInfo.transferReference && <Text style={styles.transferInfoText}>رقم العملية: {transferInfo.transferReference}</Text>}
                {!!transferInfo.rejectionReason && <Text style={styles.transferRejection}>سبب الرفض: {transferInfo.rejectionReason}</Text>}
              </> : !isLoadingTransferInfo && <Text style={styles.transferInfoText}>تعذر تحميل تفاصيل التحويل. حدّث الطلب للمحاولة مجدداً.</Text>}
              {transferInfo?.receiptUrl && ['1', 'pendingverification', 'pending_verification'].includes(transferStatus) && <Text style={styles.transferInfoText}>تم استلام صورة الإيصال وهي بانتظار مراجعة الإدارة.</Text>}
              {transferInfo?.receiptUrl && ['2', 'verified'].includes(transferStatus) && <Text style={styles.transferInfoText}>تمت الموافقة على إيصال التحويل من الإدارة.</Text>}
              {canUploadTransferReceipt && <TouchableOpacity
                style={styles.transferUploadButton}
                onPress={async () => { try { const draft = await chooseTransferReceipt(); if (draft) setReceiptDraft(draft); } catch (e: any) { Alert.alert('تعذر اختيار الصورة', e?.message || 'حاول مجدداً'); } }}
                disabled={isUploadingTransferReceipt}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                {isUploadingTransferReceipt
                  ? <ActivityIndicator color={themeColors.onPrimary} />
                  : <Text style={styles.transferUploadButtonText}>{transferStatus === '3' || transferStatus === 'rejected' ? receiptDraft ? 'تعديل صورة الإيصال' : 'اختيار إيصال جديد' : receiptDraft ? 'تعديل صورة الإيصال' : 'اختيار صورة إيصال التحويل'}</Text>}
              </TouchableOpacity>}
              {canUploadTransferReceipt && receiptDraft && <>
                <CachedImage source={{ uri: receiptDraft.uri }} style={{ height: 240, width: '100%', marginTop: 12 }} resizeMode="contain" />
                <Text style={styles.transferInfoText}>هذه معاينة فقط. اضغط إرسال الإيصال لحفظه وإرساله للإدارة.</Text>
                <TouchableOpacity style={styles.transferUploadButton} onPress={() => void handleUploadTransferReceipt()} disabled={isUploadingTransferReceipt} accessibilityRole="button" accessibilityLabel="إرسال الإيصال">
                  {isUploadingTransferReceipt ? <ActivityIndicator color={themeColors.onPrimary} /> : <Text style={styles.transferUploadButtonText}>إرسال الإيصال</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReceiptDraft(null)} disabled={isUploadingTransferReceipt}><Text style={styles.transferInfoText}>إلغاء اختيار الصورة</Text></TouchableOpacity>
              </>}
            </View>}
            <View style={styles.detailItem}>
              <Text style={styles.detailTotal}>
                {selectedOrder.totalAmount.toLocaleString()} ر.ي
              </Text>
              <Text style={styles.detailLbl}>إجمالي المبلغ:</Text>
            </View>
            {!!selectedOrder.notes && (
              <View style={[styles.detailItem, { flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeColors.outlineVariant + '30' }]}>
                <Text style={styles.detailLbl}>ملاحظاتك المسجلة على الطلب:</Text>
                <Text style={[styles.detailVal, { color: themeColors.primary, textAlign: 'right', fontFamily: 'Tajawal_500Medium' }]}>
                  {selectedOrder.notes}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.refreshOrderNowBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="تحديث حالة الطلب الآن"
            accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={themeColors.onPrimary} />
            ) : (
              <View style={styles.refreshActionRow}>
                <AppIcon name="refresh" size={16} color={themeColors.onPrimary} />
                <Text style={styles.refreshOrderNowBtnText}>تحديث حالة الطلب الآن</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToListBtn}
            onPress={() => {
              setCurrentOrder(null);
            }}
          >
            <Text style={styles.backToListBtnText}>
              العودة إلى قائمة جميع الطلبات
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
            accessibilityRole="button"
            accessibilityLabel="تحديث الطلبات"
            accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <View style={styles.refreshBtnInner}>
                <AppIcon name="refresh" size={15} color={themeColors.primary} />
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
          <View style={styles.emptyIconWrap}>
            <AppIcon name="package" size={30} color={themeColors.primary} />
          </View>
          <Text style={styles.emptyTitle}>لا توجد طلبات سابقة</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigateTo('home')}
            accessibilityRole="button"
            accessibilityLabel="ابدأ التسوق"
          >
            <Text style={styles.browseBtnText}>ابدأ التسوق الآن</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptyRefreshBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
            accessibilityRole="button"
            accessibilityLabel="تحديث الطلبات"
            accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <View style={styles.refreshActionRow}>
                <AppIcon name="refresh" size={16} color={themeColors.primary} />
                <Text style={styles.emptyRefreshBtnText}>تحديث الطلبات</Text>
              </View>
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
            const orderStores = Array.from(
              new Map(order.items.map(({ product }) => [
                product.storeId || product.storeName,
                {
                  id: product.storeId,
                  name: product.storeName,
                  imageUrl: stores.find((store) => store.id === product.storeId)?.imageUrl,
                },
              ])).values()
            );
            const storeNames = orderStores.map((store) => store.name).filter(Boolean);

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.88}
                onPress={() => setCurrentOrder(order)}
                accessibilityRole="button"
                accessibilityLabel={`طلب رقم ${order.orderNumber} من ${storeNames.join('، ') || 'المتجر'}، ${statusInfo.label}، اضغط لعرض التفاصيل والتتبع`}
              >
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
                      الطلب #{order.orderNumber}
                    </Text>
                    <Text style={styles.cardOrderDate}>تاريخ الطلب · {order.createdAt}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.storeSummary}>
                  <View style={styles.storeImageStack} accessibilityElementsHidden>
                    {orderStores.length <= 1 ? (
                      <View style={styles.singleStoreImage}>
                        {orderStores[0]?.imageUrl ? (
                          <CachedImage source={{ uri: orderStores[0].imageUrl }} style={styles.singleStoreImageContent} resizeMode="cover" />
                        ) : (
                          <AppIcon name="store" size={23} color={themeColors.primary} />
                        )}
                      </View>
                    ) : (
                      orderStores.slice(0, 3).map((store, index) => (
                        <View key={store.id || `${store.name}-${index}`} style={[styles.stackedStoreImage, { right: index * 19, zIndex: 3 - index }]}>
                          {store.imageUrl ? (
                            <CachedImage source={{ uri: store.imageUrl }} style={styles.stackedStoreImageContent} resizeMode="cover" />
                          ) : (
                            <AppIcon name="store" size={16} color={themeColors.primary} />
                          )}
                        </View>
                      ))
                    )}
                  </View>
                  <View style={styles.storeSummaryText}>
                    <Text style={styles.storeSummaryTitle} numberOfLines={1}>
                      {orderStores.length > 1 ? `${orderStores.length} متاجر` : (storeNames[0] || 'طلب المتجر')}
                    </Text>
                    {orderStores.length > 1 ? (
                      <Text style={styles.storeNames} numberOfLines={1}>{storeNames.join('، ')}</Text>
                    ) : (
                      <Text style={styles.storeNames} numberOfLines={1}>{order.items.length} أصناف في الطلب</Text>
                    )}
                  </View>
                </View>

                <View style={styles.orderMetaRow}>
                  <View style={styles.metaItem}>
                    <AppIcon name="map-pin" size={14} color={themeColors.onSurfaceVariant} />
                    <Text style={styles.metaText} numberOfLines={1}>{order.address.district} · {order.address.street}</Text>
                  </View>
                  {!!order.notes && (
                    <View style={styles.metaItem}>
                      <AppIcon name="notebook" size={14} color={themeColors.onSurfaceVariant} />
                      <Text style={styles.metaText} numberOfLines={1}>{order.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.actionWrap}>
                    <Text style={styles.actionText}>التفاصيل والتتبع</Text>
                    <AppIcon name="arrow-left" size={15} color={themeColors.onPrimary} />
                  </View>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amountVal}>
                      {order.totalAmount.toLocaleString()} ر.ي
                    </Text>
                    <Text style={styles.amountLbl}>الإجمالي · {order.items.length} أصناف</Text>
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
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '75',
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWrap: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: spacing.baseSm,
  },
  cardOrderNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  cardOrderDate: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 3,
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
    backgroundColor: colors.outlineVariant + '80',
    marginVertical: spacing.baseMd,
  },
  storeSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    minHeight: 62,
    marginBottom: spacing.baseSm,
  },
  storeImageStack: {
    width: 62,
    height: 58,
    position: 'relative',
    justifyContent: 'center',
    marginLeft: spacing.baseSm,
  },
  singleStoreImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleStoreImageContent: {
    width: '100%',
    height: '100%',
  },
  stackedStoreImage: {
    position: 'absolute',
    top: 9,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedStoreImageContent: {
    width: '100%',
    height: '100%',
  },
  storeSummaryText: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  storeSummaryTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  storeNames: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 3,
    textAlign: 'right',
  },
  orderMetaRow: {
    gap: 5,
    paddingVertical: spacing.baseSm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '65',
  },
  metaItem: {
    minHeight: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
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
    marginTop: spacing.baseSm,
  },
  amountWrap: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: spacing.baseXs,
  },
  amountLbl: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
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
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseSm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    flexShrink: 0,
  },
  actionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
    includeFontPadding: false,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenGutter,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 44,
    borderRadius: borderRadius.lg,
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
  priceComplaintForm: { marginTop: spacing.baseSm, padding: spacing.baseMd, gap: spacing.baseSm, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceContainerHigh },
  priceComplaintInput: { minHeight: 48, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, padding: 12, color: colors.onSurface, textAlign: 'right', backgroundColor: colors.surfaceContainerLowest },
  priceComplaintCancel: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  priceComplaintSubmit: { flex: 1, minHeight: 44, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
  transferCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.baseSm,
    marginVertical: spacing.baseXs,
    gap: 5,
  },
  transferTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    textAlign: 'right',
  },
  transferInfoText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
  transferRejection: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.error,
    textAlign: 'right',
  },
  transferUploadButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.baseXs,
    paddingHorizontal: spacing.baseSm,
  },
  transferUploadButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
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
    minHeight: 44,
  },
  refreshBtnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  refreshActionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    minHeight: 48,
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
    minHeight: 44,
    paddingVertical: 8,
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
