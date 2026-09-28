import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { BankTransferRequest } from '../types';

export const PaymentsScreen: React.FC = () => {
  const {
    bankTransfers,
    verifyBankTransfer,
    captainInvoices,
    approveCaptainInvoice,
    rejectCaptainInvoice,
    refreshData,
    navigateTo,
  } = useAdmin();
  const insets = useSafeAreaInsets();

  // ── Active tab: 'transfers' = حوالات العملاء | 'invoices' = سندات الكباتن
  const [activeTab, setActiveTab] = useState<'transfers' | 'invoices'>('transfers');

  // Filter states
  const [transferFilter, setTransferFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayedTransfers = useMemo(() => {
    if (transferFilter === 'ALL') return bankTransfers;
    return bankTransfers.filter((t) => t.status === transferFilter);
  }, [bankTransfers, transferFilter]);

  const displayedInvoices = useMemo(() => {
    if (invoiceFilter === 'ALL') return captainInvoices;
    return captainInvoices.filter((i) => i.status === invoiceFilter);
  }, [captainInvoices, invoiceFilter]);

  const [selectedTransfer, setSelectedTransfer] = useState<BankTransferRequest | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Zoom states for BOTH transfer images AND invoice images
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  type InvoiceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
  type CaptainInvoice = (typeof captainInvoices)[number];

  const [selectedInvoice, setSelectedInvoice] = useState<CaptainInvoice | null>(null);
  const [invoiceZoomScale, setInvoiceZoomScale] = useState(1);
  const [invoicePanOffset, setInvoicePanOffset] = useState({ x: 0, y: 0 });
  const invoiceInitialDistRef = useRef<number | null>(null);
  const invoiceInitialScaleRef = useRef<number>(1);
  const invoiceLastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const resetInvoiceZoom = () => { setInvoiceZoomScale(1); setInvoicePanOffset({ x: 0, y: 0 }); };
  const handleInvoiceZoomIn = () => setInvoiceZoomScale((p) => Math.min(p + 0.5, 4.5));
  const handleInvoiceZoomOut = () => setInvoiceZoomScale((p) => { const n = Math.max(p - 0.5, 1); if (n === 1) setInvoicePanOffset({ x: 0, y: 0 }); return n; });

  const invoicePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt) =>
          evt.nativeEvent.touches.length >= 2 || (invoiceZoomScale > 1 && evt.nativeEvent.touches.length === 1),
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            invoiceInitialDistRef.current = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY
            );
            invoiceInitialScaleRef.current = invoiceZoomScale;
          } else {
            invoiceLastTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
          }
        },
        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2 && invoiceInitialDistRef.current) {
            const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            const factor = dist / invoiceInitialDistRef.current;
            setInvoiceZoomScale(Math.max(1, Math.min(invoiceInitialScaleRef.current * factor, 5)));
          } else if (touches.length === 1 && invoiceZoomScale > 1 && invoiceLastTouchRef.current) {
            const dx = touches[0].pageX - invoiceLastTouchRef.current.x;
            const dy = touches[0].pageY - invoiceLastTouchRef.current.y;
            invoiceLastTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
            setInvoicePanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          }
        },
        onPanResponderRelease: () => {
          invoiceInitialDistRef.current = null;
          invoiceLastTouchRef.current = null;
        },
      }),
    [invoiceZoomScale]
  );

  const handleApproveInvoice = (inv: CaptainInvoice) => {
    Alert.alert('اعتماد الفاتورة', `اعتماد فاتورة #${inv.invoiceNumber} بمبلغ ${inv.amount.toLocaleString()} ر.ي؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'اعتماد وخصم من العهدة ✓',
        onPress: () => {
          approveCaptainInvoice(inv.id).catch((e: any) => Alert.alert('خطأ', e.message));
          setSelectedInvoice(null);
          resetInvoiceZoom();
        },
      },
    ]);
  };

  const handleRejectInvoice = (inv: CaptainInvoice) => {
    Alert.alert('رفض الفاتورة', `رفض فاتورة #${inv.invoiceNumber}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تأكيد الرفض',
        style: 'destructive',
        onPress: () => {
          rejectCaptainInvoice(inv.id).catch((e: any) => Alert.alert('خطأ', e.message));
          setSelectedInvoice(null);
          resetInvoiceZoom();
        },
      },
    ]);
  };

  const pendingInvoicesCount = captainInvoices.filter((i) => i.status === 'PENDING').length;

  const quickRejectReasons = [
    'صورة الإيصال غير واضحة أو مقصوصة',
    'المبلغ المحول لا يطابق إجمالي الفاتورة',
    'رقم المرجع غير مسجل بالحساب البنكي',
  ];

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleOpenPreview = (transfer: BankTransferRequest) => {
    setSelectedTransfer(transfer);
    resetZoom();
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4.5));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Two-finger Pinch to Zoom + Drag Pan Responder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt) =>
          evt.nativeEvent.touches.length >= 2 || (zoomScale > 1 && evt.nativeEvent.touches.length === 1),
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          // Double-tap detection
          const now = Date.now();
          if (touches.length === 1 && now - lastTapRef.current < 300) {
            if (zoomScale > 1.2) {
              resetZoom();
            } else {
              setZoomScale(2.5);
              setPanOffset({ x: 0, y: 0 });
            }
            lastTapRef.current = 0;
            return;
          }
          lastTapRef.current = now;

          if (touches.length >= 2) {
            const dist = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY
            );
            initialDistanceRef.current = dist;
            initialScaleRef.current = zoomScale;
          } else if (touches.length === 1) {
            lastTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
          }
        },
        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            // Pinch-to-zoom calculation
            const dist = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY
            );
            if (initialDistanceRef.current && initialDistanceRef.current > 0) {
              const factor = dist / initialDistanceRef.current;
              const nextScale = Math.max(1, Math.min(initialScaleRef.current * factor, 5));
              setZoomScale(nextScale);
            }
          } else if (touches.length === 1 && zoomScale > 1 && lastTouchRef.current) {
            // Drag pan when zoomed in
            const dx = touches[0].pageX - lastTouchRef.current.x;
            const dy = touches[0].pageY - lastTouchRef.current.y;
            lastTouchRef.current = { x: touches[0].pageX, y: touches[0].pageY };
            setPanOffset((prev) => ({
              x: prev.x + dx,
              y: prev.y + dy,
            }));
          }
        },
        onPanResponderRelease: () => {
          initialDistanceRef.current = null;
          lastTouchRef.current = null;
        },
      }),
    [zoomScale]
  );

  const handleApprove = (transfer: BankTransferRequest) => {
    verifyBankTransfer(transfer.id, true);
    Alert.alert('تم الاعتماد', `تم اعتماد الحوالة #${transfer.transferReference} وتأكيد الطلب #${transfer.orderNumber}`);
    setSelectedTransfer(null);
  };

  const handleReject = () => {
    if (!selectedTransfer) return;
    verifyBankTransfer(selectedTransfer.id, false, rejectReason);
    setRejectModalVisible(false);
    setSelectedTransfer(null);
    Alert.alert('تم الرفض', 'تم رفض الإشعار وإشعار العميل بسبب الرفض');
  };

  // If a transfer is selected for image inspection, render the fullscreen inspection screen directly!
  if (selectedTransfer) {
    return (
      <View style={styles.fullscreenContainer}>
        {/* Top Bar with Dismiss and Metadata */}
        <View style={[styles.fullscreenTopBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.fullscreenMeta}>
            <View style={styles.fullscreenTitleRow}>
              <Text style={styles.fullscreenTitle}>سند الحوالة #{selectedTransfer.orderNumber}</Text>
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>فحص بصري</Text>
              </View>
            </View>
            <Text style={styles.fullscreenSubtitle}>
              {selectedTransfer.customerName} • {selectedTransfer.amount.toLocaleString()} ر.ي • {selectedTransfer.transferReference}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.fullscreenCloseBtn}
            onPress={() => setSelectedTransfer(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.fullscreenCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Zoom Toolbar with Pinch Gesture Guide */}
        <View style={styles.zoomToolbar}>
          <View style={styles.zoomButtonsGroup}>
            <TouchableOpacity
              style={[styles.zoomToolBtn, zoomScale >= 4.5 && styles.zoomToolBtnDisabled]}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomToolBtnText}>🔍+ تكبير</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.zoomToolBtn, zoomScale <= 1 && styles.zoomToolBtnDisabled]}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomToolBtnText}>🔍- تصغير</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.zoomToolBtn}
              onPress={resetZoom}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomToolBtnText}>↺ إعادة ضبط</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.zoomIndicatorRow}>
            <Text style={styles.gestureHintText}>👌 اسحب بإصبعين للتكبير</Text>
            <View style={styles.zoomScaleBadge}>
              <Text style={styles.zoomScaleText}>{Math.round(zoomScale * 100)}%</Text>
            </View>
          </View>
        </View>

        {/* Interactive Pinch-to-Zoom Viewport */}
        <View style={styles.imageViewport} {...panResponder.panHandlers}>
          <View
            style={[
              styles.imageTransformWrapper,
              {
                transform: [
                  { translateX: panOffset.x },
                  { translateY: panOffset.y },
                  { scale: zoomScale },
                ],
              },
            ]}
          >
            <Image
              source={{ uri: selectedTransfer.receiptImageUrl }}
              style={styles.pinchImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Verification Summary Card */}
        <View style={styles.verificationSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>المبلغ المطلوب:</Text>
            <Text style={styles.summaryVal}>{selectedTransfer.amount.toLocaleString()} ر.ي</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>رقم المرجع:</Text>
            <Text style={styles.summaryValHighlight}>{selectedTransfer.transferReference}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>حالة الإشعار:</Text>
            <Text style={[styles.summaryVal, { color: colors.secondaryContainer }]}>
              {selectedTransfer.status === 'PENDING' ? 'بانتظار المراجعة' : selectedTransfer.status}
            </Text>
          </View>
        </View>

        {/* Fixed Bottom Action Dock - Guaranteed 100% Visible & Elevated */}
        <View style={[styles.fullscreenBottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {selectedTransfer.status === 'PENDING' ? (
            <View style={styles.dockButtonRow}>
              <TouchableOpacity
                style={styles.dockRejectBtn}
                onPress={() => setRejectModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.dockRejectText}>✕ رفض السند</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dockApproveBtn}
                onPress={() => handleApprove(selectedTransfer)}
                activeOpacity={0.85}
              >
                <Text style={styles.dockApproveText}>اعتماد الحوالة وتأكيد الطلب ✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.dockDismissBtn}
              onPress={() => setSelectedTransfer(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.dockDismissText}>إغلاق المعاينة</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rejection Modal overlay when inside inspection screen */}
        {rejectModalVisible && (
          <View style={styles.rejectOverlay}>
            <View style={styles.rejectCard}>
              <View style={styles.rejectCardHeader}>
                <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.rejectHeaderTitle}>سبب رفض إيصال التحويل</Text>
              </View>

              <Text style={styles.rejectPrompt}>
                اختر سبباً واضحاً سيتم إرساله للعميل عبر الإشعار لإعادة المحاولة:
              </Text>

              <View style={styles.quickReasonsList}>
                {quickRejectReasons.map((reason) => {
                  const isSelected = rejectReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                      onPress={() => setRejectReason(reason)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.customReasonLabel}>أو اكتب توضيحاً مخصصاً:</Text>
              <TextInput
                style={styles.rejectInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                textAlign="right"
                placeholder="اكتب سبب الرفض هنا..."
                placeholderTextColor={colors.outline}
              />

              <View style={styles.rejectBtnGroup}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setRejectModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmRejectBtn}
                  onPress={handleReject}
                >
                  <Text style={styles.confirmRejectBtnText}>تأكيد الرفض والإشعار</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Full-screen invoice viewer
  if (selectedInvoice) {
    return (
      <View style={styles.fullscreenContainer}>
        <View style={[styles.fullscreenTopBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.fullscreenMeta}>
            <View style={styles.fullscreenTitleRow}>
              <Text style={styles.fullscreenTitle}>سند شراء #{selectedInvoice.invoiceNumber}</Text>
              <View style={[styles.verifiedTag, { backgroundColor: '#FEF9C3' }]}>
                <Text style={[styles.verifiedTagText, { color: '#B45309' }]}>فاتورة كابتن</Text>
              </View>
            </View>
            <Text style={styles.fullscreenSubtitle}>
              {selectedInvoice.driverName} • {selectedInvoice.amount.toLocaleString()} ر.ي • {selectedInvoice.storeName}
            </Text>
          </View>
          <TouchableOpacity style={styles.fullscreenCloseBtn} onPress={() => { setSelectedInvoice(null); resetInvoiceZoom(); }} activeOpacity={0.7}>
            <Text style={styles.fullscreenCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.zoomToolbar}>
          <View style={styles.zoomButtonsGroup}>
            <TouchableOpacity style={[styles.zoomToolBtn, invoiceZoomScale >= 4.5 && styles.zoomToolBtnDisabled]} onPress={handleInvoiceZoomIn} activeOpacity={0.7}>
              <Text style={styles.zoomToolBtnText}>🔍+ تكبير</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.zoomToolBtn, invoiceZoomScale <= 1 && styles.zoomToolBtnDisabled]} onPress={handleInvoiceZoomOut} activeOpacity={0.7}>
              <Text style={styles.zoomToolBtnText}>🔍- تصغير</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomToolBtn} onPress={resetInvoiceZoom} activeOpacity={0.7}>
              <Text style={styles.zoomToolBtnText}>↺ إعادة ضبط</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.zoomIndicatorRow}>
            <Text style={styles.gestureHintText}>👌 اسحب بإصبعين للتكبير</Text>
            <View style={styles.zoomScaleBadge}>
              <Text style={styles.zoomScaleText}>{Math.round(invoiceZoomScale * 100)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.imageViewport} {...invoicePanResponder.panHandlers}>
          <View style={[styles.imageTransformWrapper, { transform: [{ translateX: invoicePanOffset.x }, { translateY: invoicePanOffset.y }, { scale: invoiceZoomScale }] }]}>
            <Image source={{ uri: selectedInvoice.receiptImageUrl }} style={styles.pinchImage} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.verificationSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>الكابتن:</Text>
            <Text style={styles.summaryVal}>{selectedInvoice.driverName}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>المبلغ:</Text>
            <Text style={styles.summaryValHighlight}>{selectedInvoice.amount.toLocaleString()} ر.ي</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>المتجر:</Text>
            <Text style={styles.summaryVal}>{selectedInvoice.storeName}</Text>
          </View>
        </View>

        {selectedInvoice.notes ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={[styles.gestureHintText, { textAlign: 'right' }]}>ملاحظات: {selectedInvoice.notes}</Text>
          </View>
        ) : null}

        <View style={[styles.fullscreenBottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {selectedInvoice.status === 'PENDING' ? (
            <View style={styles.dockButtonRow}>
              <TouchableOpacity style={styles.dockRejectBtn} onPress={() => handleRejectInvoice(selectedInvoice)} activeOpacity={0.85}>
                <Text style={styles.dockRejectText}>✕ رفض الفاتورة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dockApproveBtn} onPress={() => handleApproveInvoice(selectedInvoice)} activeOpacity={0.85}>
                <Text style={styles.dockApproveText}>اعتماد وخصم من العهدة ✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.dockDismissBtn} onPress={() => { setSelectedInvoice(null); resetInvoiceZoom(); }} activeOpacity={0.85}>
              <Text style={styles.dockDismissText}>إغلاق المعاينة</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="التحويلات والمدفوعات" showBack onBack={() => navigateTo('dashboard')} />

      {/* ── Tab bar ── */}
      <View style={invStyles.tabBar}>
        <TouchableOpacity
          style={[invStyles.tab, activeTab === 'transfers' && invStyles.tabActive]}
          onPress={() => setActiveTab('transfers')}
        >
          <Text style={invStyles.tabIcon}>💳</Text>
          <Text style={[invStyles.tabLabel, activeTab === 'transfers' && invStyles.tabLabelActive]}>حوالات العملاء</Text>
          {bankTransfers.filter((t) => t.status === 'PENDING').length > 0 && (
            <View style={invStyles.tabBadge}>
              <Text style={invStyles.tabBadgeText}>{bankTransfers.filter((t) => t.status === 'PENDING').length}</Text>
            </View>
          )}
          {activeTab === 'transfers' && <View style={invStyles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[invStyles.tab, activeTab === 'invoices' && invStyles.tabActive]}
          onPress={() => setActiveTab('invoices')}
        >
          <Text style={invStyles.tabIcon}>🧾</Text>
          <Text style={[invStyles.tabLabel, activeTab === 'invoices' && invStyles.tabLabelActive]}>سندات الكباتن</Text>
          {pendingInvoicesCount > 0 && (
            <View style={invStyles.tabBadge}>
              <Text style={invStyles.tabBadgeText}>{pendingInvoicesCount}</Text>
            </View>
          )}
          {activeTab === 'invoices' && <View style={invStyles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* ── Sub-filters & Refresh Bar ── */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenGutter, paddingVertical: 8, backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + '30' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: 6 }}>
          {activeTab === 'transfers' ? (
            <>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, transferFilter === 'ALL' && { backgroundColor: colors.primary }]}
                onPress={() => setTransferFilter('ALL')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, transferFilter === 'ALL' && { color: colors.onPrimary }]}>الكل ({bankTransfers.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, transferFilter === 'PENDING' && { backgroundColor: colors.primary }]}
                onPress={() => setTransferFilter('PENDING')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, transferFilter === 'PENDING' && { color: colors.onPrimary }]}>بانتظار المراجعة ({bankTransfers.filter(t => t.status === 'PENDING').length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, transferFilter === 'VERIFIED' && { backgroundColor: colors.primary }]}
                onPress={() => setTransferFilter('VERIFIED')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, transferFilter === 'VERIFIED' && { color: colors.onPrimary }]}>معتمدة ({bankTransfers.filter(t => t.status === 'VERIFIED').length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, transferFilter === 'REJECTED' && { backgroundColor: colors.primary }]}
                onPress={() => setTransferFilter('REJECTED')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, transferFilter === 'REJECTED' && { color: colors.onPrimary }]}>مرفوضة ({bankTransfers.filter(t => t.status === 'REJECTED').length})</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, invoiceFilter === 'ALL' && { backgroundColor: colors.primary }]}
                onPress={() => setInvoiceFilter('ALL')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, invoiceFilter === 'ALL' && { color: colors.onPrimary }]}>الكل ({captainInvoices.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, invoiceFilter === 'PENDING' && { backgroundColor: colors.primary }]}
                onPress={() => setInvoiceFilter('PENDING')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, invoiceFilter === 'PENDING' && { color: colors.onPrimary }]}>بانتظار المراجعة ({captainInvoices.filter(i => i.status === 'PENDING').length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, invoiceFilter === 'APPROVED' && { backgroundColor: colors.primary }]}
                onPress={() => setInvoiceFilter('APPROVED')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, invoiceFilter === 'APPROVED' && { color: colors.onPrimary }]}>معتمدة ({captainInvoices.filter(i => i.status === 'APPROVED').length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow }, invoiceFilter === 'REJECTED' && { backgroundColor: colors.primary }]}
                onPress={() => setInvoiceFilter('REJECTED')}
              >
                <Text style={[{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.onSurface }, invoiceFilter === 'REJECTED' && { color: colors.onPrimary }]}>مرفوضة ({captainInvoices.filter(i => i.status === 'REJECTED').length})</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        <TouchableOpacity
          onPress={handleManualRefresh}
          style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md, marginRight: 6 }}
        >
          <Text style={{ fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.primary }}>{isRefreshing ? '⏳...' : '🔄 تحديث'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Transfers tab ─── */}
        {activeTab === 'transfers' && (
          <>
            {displayedTransfers.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💳</Text>
                <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md, color: colors.onSurface, marginBottom: 6 }}>لا توجد حوالات بنكية</Text>
                <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 12 }}>
                  {transferFilter === 'ALL' ? 'لم يتم العثور على أي إشعارات تحويل' : `لا توجد حوالات مطابقة لقسم "${transferFilter === 'PENDING' ? 'بانتظار المراجعة' : transferFilter === 'VERIFIED' ? 'معتمدة' : 'مرفوضة'}"`}
                </Text>
                <TouchableOpacity onPress={handleManualRefresh} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: borderRadius.md }}>
                  <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 12 }}>تحديث القائمة 🔄</Text>
                </TouchableOpacity>
              </View>
            )}
            {displayedTransfers.map((req) => {
              const isPending = req.status === 'PENDING';
              return (

            <View key={req.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.statusBadge,
                    req.status === 'VERIFIED'
                      ? styles.statusVerified
                      : req.status === 'REJECTED'
                      ? styles.statusRejected
                      : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {req.status === 'VERIFIED'
                      ? 'معتمد'
                      : req.status === 'REJECTED'
                      ? 'مرفوض'
                      : 'بانتظار المراجعة'}
                  </Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNum}>طلب #{req.orderNumber}</Text>
                  <Text style={styles.uploadTime}>{req.uploadedAt}</Text>
                </View>
              </View>

              <View style={styles.bodyRow}>
                <TouchableOpacity
                  style={styles.receiptThumbWrap}
                  onPress={() => handleOpenPreview(req)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: req.receiptImageUrl }} style={styles.receiptThumb} />
                  <View style={styles.zoomBadge}>
                    <Text style={styles.zoomText}>🔍 تكبير ومعاينة</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.infoCol}>
                  <Text style={styles.customerName}>👤 {req.customerName}</Text>
                  <Text style={styles.customerPhone}>📱 {req.customerPhone}</Text>
                  <View style={styles.refWrap}>
                    <Text style={styles.refLabel}>رقم العملية:</Text>
                    <Text style={styles.refVal}>{req.transferReference}</Text>
                  </View>
                  <Text style={styles.amount}>
                    المبلغ: {req.amount.toLocaleString()} ر.ي
                  </Text>
                </View>
              </View>

              {/* Receipt Preview Trigger Bar */}
              <TouchableOpacity
                style={styles.previewReceiptBar}
                onPress={() => handleOpenPreview(req)}
                activeOpacity={0.8}
              >
                <Text style={styles.previewReceiptBarIcon}>🔍</Text>
                <Text style={styles.previewReceiptBarText}>معاينة وفحص صورة السند البنكي بملء الشاشة</Text>
              </TouchableOpacity>

              {isPending && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => {
                      setSelectedTransfer(req);
                      setRejectModalVisible(true);
                    }}
                  >
                    <Text style={styles.rejectBtnText}>رفض الإشعار</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(req)}
                  >
                    <Text style={styles.approveBtnText}>اعتماد الحوالة وتأكيد الطلب ✓</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </>
    )}

        {/* ─── Captain Invoices tab ─── */}
        {activeTab === 'invoices' && (
          <>
            {displayedInvoices.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
                <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md, color: colors.onSurface, marginBottom: 6 }}>لا توجد سندات أو فواتير</Text>
                <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 12 }}>
                  {invoiceFilter === 'ALL' ? 'سيتم عرض فواتير وسندات مشتريات الكباتن هنا عند تسجيلها' : `لا توجد سندات مطابقة لقسم "${invoiceFilter === 'PENDING' ? 'بانتظار المراجعة' : invoiceFilter === 'APPROVED' ? 'معتمدة' : 'مرفوضة'}"`}
                </Text>
                <TouchableOpacity onPress={handleManualRefresh} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: borderRadius.md }}>
                  <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 12 }}>تحديث القائمة 🔄</Text>
                </TouchableOpacity>
              </View>
            )}
            {displayedInvoices.map((inv) => (
              <View
                key={inv.id}
                style={[styles.card, inv.status === 'APPROVED' && { borderLeftColor: '#22C55E', borderLeftWidth: 3 },
                  inv.status === 'REJECTED' && { borderLeftColor: colors.error, borderLeftWidth: 3 },
                  inv.status === 'PENDING' && { borderLeftColor: '#F59E0B', borderLeftWidth: 3 }
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.statusBadge,
                    inv.status === 'APPROVED' ? styles.statusVerified :
                    inv.status === 'REJECTED' ? styles.statusRejected : styles.statusPending]}>
                    <Text style={styles.statusText}>
                      {inv.status === 'APPROVED' ? 'معتمدة' : inv.status === 'REJECTED' ? 'مرفوضة' : 'بانتظار المراجعة'}
                    </Text>
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNum}>طلب #{inv.orderNumber} · {inv.invoiceNumber}</Text>
                    <Text style={styles.uploadTime}>{inv.uploadedAt}</Text>
                  </View>
                </View>

                <View style={styles.bodyRow}>
                  <TouchableOpacity
                    style={styles.receiptThumbWrap}
                    onPress={() => { setSelectedInvoice(inv); resetInvoiceZoom(); }}
                    activeOpacity={0.85}
                  >
                    {inv.receiptImageUrl ? (
                      <Image source={{ uri: inv.receiptImageUrl }} style={styles.receiptThumb} />
                    ) : (
                      <View style={[styles.receiptThumb, { backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 28 }}>🧾</Text>
                      </View>
                    )}
                    <View style={styles.zoomBadge}>
                      <Text style={styles.zoomText}>🔍 تكبير ومعاينة</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.infoCol}>
                    <Text style={styles.customerName}>🛵 {inv.driverName}</Text>
                    <Text style={styles.customerPhone}>📱 {inv.driverPhone}</Text>
                    <View style={styles.refWrap}>
                      <Text style={styles.refLabel}>المتجر:</Text>
                      <Text style={styles.refVal}>{inv.storeName}</Text>
                    </View>
                    <Text style={styles.amount}>المبلغ: {inv.amount.toLocaleString()} ر.ي</Text>
                    {inv.notes ? <Text style={[styles.uploadTime, { marginTop: 4 }]} numberOfLines={2}>{inv.notes}</Text> : null}
                  </View>
                </View>

                {inv.status === 'PENDING' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectInvoice(inv)}>
                      <Text style={styles.rejectBtnText}>رفض الفاتورة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveInvoice(inv)}>
                      <Text style={styles.approveBtnText}>اعتماد وخصم من العهدة ✓</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>


      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.rejectOverlay}>
          <View style={styles.rejectCard}>
            <View style={styles.rejectCardHeader}>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.rejectHeaderTitle}>سبب رفض إيصال التحويل</Text>
            </View>

            <Text style={styles.rejectPrompt}>
              اختر سبباً واضحاً سيتم إرساله للعميل عبر الإشعار لإعادة المحاولة:
            </Text>

            {/* Quick Reason Radio Options */}
            <View style={styles.quickReasonsList}>
              {quickRejectReasons.map((reason) => {
                const isSelected = rejectReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                    onPress={() => setRejectReason(reason)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextActive]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.customReasonLabel}>أو اكتب توضيحاً مخصصاً:</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              textAlign="right"
              placeholder="اكتب سبب الرفض هنا..."
              placeholderTextColor={colors.outline}
            />

            <View style={styles.rejectBtnGroup}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRejectBtn}
                onPress={handleReject}
              >
                <Text style={styles.confirmRejectBtnText}>تأكيد الرفض والإشعار</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 120,
  },
  headerBanner: {
    backgroundColor: colors.primaryFixedDim + '25',
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryFixed,
    marginBottom: spacing.baseSm,
    alignItems: 'flex-end',
  },
  bannerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  orderInfo: {
    alignItems: 'flex-end',
  },
  orderNum: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  uploadTime: {
    fontSize: 10,
    color: colors.outline,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusPending: {
    backgroundColor: colors.tertiaryFixedDim + '40',
  },
  statusVerified: {
    backgroundColor: colors.primaryFixed,
  },
  statusRejected: {
    backgroundColor: colors.errorContainer,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  bodyRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
  },
  receiptThumbWrap: {
    width: 80,
    height: 90,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceContainerLow,
  },
  receiptThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(19, 27, 46, 0.75)',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    paddingVertical: 1,
  },
  zoomText: {
    color: colors.onPrimary,
    fontSize: 8,
    fontWeight: typography.fontWeight.bold,
  },
  infoCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  customerName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  customerPhone: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  refWrap: {
    flexDirection: 'row-reverse',
    gap: 4,
  },
  refLabel: {
    fontSize: 11,
    color: colors.outline,
  },
  refVal: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  amount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  previewReceiptBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
    borderRadius: borderRadius.md,
    paddingVertical: 7,
    marginTop: spacing.baseXs,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewReceiptBarIcon: {
    fontSize: 14,
  },
  previewReceiptBarText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
    marginTop: spacing.baseSm,
    paddingTop: spacing.baseXs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  approveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  approveBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  fullscreenTopBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 46,
    paddingBottom: 14,
    backgroundColor: '#131b2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  fullscreenMeta: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  fullscreenTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  fullscreenTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: '#ffffff',
    textAlign: 'right',
  },
  verifiedTag: {
    backgroundColor: colors.primary + '35',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  verifiedTagText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primaryFixed,
    fontSize: 10,
  },
  fullscreenSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'right',
  },
  fullscreenCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  zoomToolbar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#101726',
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  zoomButtonsGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  zoomToolBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  zoomToolBtnDisabled: {
    opacity: 0.35,
  },
  zoomToolBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: '#f8fafc',
    fontSize: 12,
  },
  zoomScaleBadge: {
    backgroundColor: colors.primary + '25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '60',
  },
  zoomScaleText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primaryFixed,
    fontSize: 11,
  },
  zoomIndicatorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  gestureHintText: {
    fontFamily: typography.fontFamily.medium,
    color: '#94a3b8',
    fontSize: 11,
  },
  imageViewport: {
    flex: 1,
    backgroundColor: '#04070d',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageTransformWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinchImage: {
    width: '92%',
    height: '92%',
  },
  verificationSummary: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingVertical: 10,
    paddingHorizontal: spacing.screenGutter,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  summaryVal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: '#ffffff',
  },
  summaryValHighlight: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.secondaryContainer,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fullscreenBottomDock: {
    backgroundColor: '#131b2e',
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    zIndex: 99,
  },
  dockButtonRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
  },
  dockApproveBtn: {
    flex: 2,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dockApproveText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
  },
  dockRejectBtn: {
    flex: 1,
    height: 52,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  dockRejectText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
    fontSize: typography.fontSize.xs,
  },
  dockDismissBtn: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockDismissText: {
    fontFamily: typography.fontFamily.bold,
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
  },
  rejectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  rejectCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.baseMd,
    paddingBottom: 32,
    ...shadows.card,
  },
  rejectCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  rejectHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
  },
  closeIcon: {
    fontSize: 18,
    color: colors.outline,
  },
  rejectPrompt: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: spacing.baseSm,
  },
  quickReasonsList: {
    gap: 8,
    marginBottom: spacing.baseSm,
  },
  reasonOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseSm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonOptionActive: {
    backgroundColor: colors.errorContainer + '30',
    borderColor: colors.error,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.error,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  reasonOptionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
    flex: 1,
  },
  reasonOptionTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  customReasonLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 4,
  },
  rejectInput: {
    fontFamily: typography.fontFamily.regular,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.baseSm,
    height: 70,
    textAlignVertical: 'top',
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    marginBottom: spacing.baseMd,
  },
  rejectBtnGroup: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onSurface,
    fontSize: typography.fontSize.xs,
  },
  confirmRejectBtn: {
    flex: 2,
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmRejectBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onError,
    fontSize: typography.fontSize.xs,
  },
});

// ── Tab bar styles (shared) ──────────────────────────────────────────────────
const invStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
  },
  tab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    position: 'relative',
  },
  tabActive: {},
  tabIcon: { fontSize: 16 },
  tabLabel: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  tabLabelActive: { fontFamily: 'Tajawal_700Bold', color: colors.primary },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  tabBadge: {
    backgroundColor: colors.error,
    borderRadius: 9999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontFamily: 'Tajawal_700Bold', fontSize: 10, color: '#fff' },
});

