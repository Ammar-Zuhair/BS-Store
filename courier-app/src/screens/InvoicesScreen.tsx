import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';
import { OrderInvoice } from '../types';

export const InvoicesScreen: React.FC = () => {
  const { invoices, activeTask, navigateTo } = useDriver();

  // Upload Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [orderNumInput, setOrderNumInput] = useState(activeTask?.orderNumber || '');
  const [storeNameInput, setStoreNameInput] = useState(
    activeTask?.stops[0]?.name || ''
  );
  const [invoiceNumInput, setInvoiceNumInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Fullscreen Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const handleOpenUpload = (_store?: string) => {
    if (!activeTask) {
      Alert.alert('لا توجد مهمة نشطة', 'لا يمكن تسجيل مشتريات دون طلب موصل به.');
      return;
    }
    navigateTo('purchase_receipt');
  };

  const handleSaveInvoice = () => {
    setModalVisible(false);
    handleOpenUpload();
  };

  return (
    <View style={styles.container}>
      <DriverHeader title="فواتير وسندات الطلبات" showBack onBack={() => navigateTo('dashboard')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Banner & Call to Action */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerIconWrap}>
              <Text style={styles.bannerEmoji}>🧾</Text>
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>توثيق المشتريات الورقية</Text>
              <Text style={styles.bannerSubtitle}>
                ارفع فواتير وسندات المحلات لربطها بالطلب وتصفية العهدة النقدية
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => handleOpenUpload()}
            activeOpacity={0.88}
          >
            <Text style={styles.uploadBtnIcon}>📸</Text>
            <Text style={styles.uploadBtnText}>رفع ورقة فاتورة أو سند جديد لطلب</Text>
          </TouchableOpacity>
        </View>

        {/* Active Task Link Hint if active */}
        {activeTask && (
          <View style={styles.activeOrderBanner}>
            <View style={styles.activeOrderInfo}>
              <Text style={styles.activeOrderBadge}>⚡ طلب قيد التنفيذ الآن</Text>
              <Text style={styles.activeOrderTitle}>طلب #{activeTask.orderNumber} • {activeTask.customerName}</Text>
              <Text style={styles.activeOrderStores}>
                المحلات: {activeTask.stops.filter(s => s.type === 'PICKUP_STORE').map(s => s.name).join(' + ')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.quickUploadBtn}
              onPress={() => handleOpenUpload(activeTask.stops[0]?.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickUploadText}>+ رفع فاتورة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Invoices List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>سجل الفواتير المرفوعة للطلبات</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{invoices.length} فواتير</Text>
          </View>
        </View>

        {invoices.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>لا توجد فواتير مرفوعة بعد</Text>
            <Text style={styles.emptySubtitle}>قم برفع فاتورة أو سند للمتجر لتوثيق وتصفية عهدتك</Text>
          </View>
        ) : (
          invoices.map((inv) => {
            const isApproved = inv.status === 'APPROVED';
            const isPending = inv.status === 'PENDING_APPROVAL';

            return (
              <View key={inv.id} style={styles.invoiceCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>طلب #{inv.orderNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isApproved ? styles.statusPillApproved : styles.statusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isApproved ? styles.statusTextApproved : styles.statusTextPending,
                      ]}
                    >
                      {isApproved ? '✓ معتمدة من الإدارة' : '⏳ قيد التدقيق والمراجعة'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  {/* Image with zoom badge */}
                  <TouchableOpacity
                    style={styles.imageWrap}
                    onPress={() => {
                      setPreviewImage(inv.receiptImageUrl);
                      setPreviewTitle(`فاتورة طلب #${inv.orderNumber} • ${inv.storeName}`);
                    }}
                    activeOpacity={0.85}
                  >
                    {Boolean(inv.receiptImageUrl) && <Image source={{ uri: inv.receiptImageUrl }} style={styles.receiptImage} />}
                    <View style={styles.zoomOverlay}>
                      <Text style={styles.zoomText}>🔍 تكبير</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Invoice Details */}
                  <View style={styles.detailsWrap}>
                    <Text style={styles.storeNameText} numberOfLines={1}>{inv.storeName}</Text>
                    <Text style={styles.invNumberText}>رقم السند/الفاتورة: {inv.invoiceNumber}</Text>

                    <View style={styles.amountBox}>
                      <Text style={styles.amountLabel}>المبلغ المدفوع:</Text>
                      <Text style={styles.amountValue}>
                        {inv.amount.toLocaleString()} <Text style={styles.amountCurr}>ر.ي</Text>
                      </Text>
                    </View>

                    <Text style={styles.dateText}>تاريخ الرفع: {inv.uploadedAt}</Text>
                  </View>
                </View>

                {inv.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>ملاحظات الكابتن:</Text>
                    <Text style={styles.notesContent}>{inv.notes}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* UPLOAD INVOICE MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>رفع فاتورة أو سند ورقي لطلب</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Linked Order Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم الطلب المرتبط بالفاتورة *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: 10042"
                  placeholderTextColor={colors.outline}
                  value={orderNumInput}
                  onChangeText={setOrderNumInput}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              {/* Store Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>اسم المحل التجاري أو المتجر *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: مطعم الشيباني الحديث"
                  placeholderTextColor={colors.outline}
                  value={storeNameInput}
                  onChangeText={setStoreNameInput}
                  textAlign="right"
                />
              </View>

              {/* Invoice Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم الفاتورة الورقية / السند *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: INV-90412"
                  placeholderTextColor={colors.outline}
                  value={invoiceNumInput}
                  onChangeText={setInvoiceNumInput}
                  textAlign="right"
                />
              </View>

              {/* Actual Paid Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>المبلغ الإجمالي المدفوع نقداً (ر.ي) *</Text>
                <TextInput
                  style={[styles.textInput, styles.amountInputHighlight]}
                  placeholder="مثال: 4800"
                  placeholderTextColor={colors.outline}
                  value={amountInput}
                  onChangeText={setAmountInput}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>لتسجيل عملية شراء، استخدم توثيق المشتريات المرتبط بطلبك النشط.</Text>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ملاحظات الكابتن للإدارة (اختياري)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="أي ملاحظات حول الأصناف أو فروقات الأسعار..."
                  placeholderTextColor={colors.outline}
                  value={notesInput}
                  onChangeText={setNotesInput}
                  multiline
                  numberOfLines={3}
                  textAlign="right"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveInvoice}
                activeOpacity={0.88}
              >
                <Text style={styles.modalSubmitText}>إرسال الفاتورة لتدقيق واعتماد الإدارة ✓</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN ZOOM PREVIEW MODAL */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.fullscreenModal}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity onPress={() => setPreviewImage(null)} style={styles.fullscreenCloseBtn}>
              <Text style={styles.fullscreenCloseText}>✕ إغلاق</Text>
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>{previewTitle}</Text>
          </View>
          <View style={styles.fullscreenImageContainer}>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
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
  bannerCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
  },
  bannerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
    marginBottom: spacing.baseMd,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 22,
  },
  bannerTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bannerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  bannerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.baseXs,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    ...shadows.card,
  },
  uploadBtnIcon: {
    fontSize: 16,
  },
  uploadBtnText: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  activeOrderBanner: {
    backgroundColor: colors.primaryFixed,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: spacing.baseMd,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  activeOrderInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  activeOrderBadge: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  activeOrderTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  activeOrderStores: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  quickUploadBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    marginLeft: spacing.baseSm,
  },
  quickUploadText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  countBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  emptyWrap: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.base2xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  invoiceCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '25',
  },
  orderBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  orderBadgeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusPillApproved: {
    backgroundColor: colors.success + '18',
  },
  statusPillPending: {
    backgroundColor: colors.warning + '18',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  statusTextApproved: {
    color: colors.success,
  },
  statusTextPending: {
    color: colors.warning,
  },
  cardBody: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
    alignItems: 'center',
  },
  imageWrap: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
  },
  detailsWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  storeNameText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  invNumberText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'right',
  },
  amountBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
  },
  amountLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  amountValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
  },
  amountCurr: {
    fontSize: 9,
  },
  dateText: {
    fontSize: 10,
    color: colors.outline,
    marginTop: 4,
  },
  notesBox: {
    marginTop: spacing.baseSm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '25',
    alignItems: 'flex-end',
  },
  notesLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  notesContent: {
    fontSize: 11,
    color: colors.onSurface,
    marginTop: 2,
    textAlign: 'right',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
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
    fontSize: 14,
    color: colors.onSurface,
  },
  modalScroll: {
    paddingVertical: spacing.baseSm,
  },
  inputGroup: {
    marginBottom: spacing.baseSm,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    marginBottom: 6,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 10,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '50',
  },
  amountInputHighlight: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  imageSelectorRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 8,
  },
  sampleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
    padding: 4,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  sampleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  sampleThumb: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.sm,
  },
  sampleText: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  sampleTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  selectedPreviewWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: 120,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectedPreviewImg: {
    width: '100%',
    height: '100%',
  },
  previewHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  previewHintText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.baseSm,
    marginBottom: spacing.baseLg,
  },
  modalSubmitText: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },

  // Fullscreen Modal Styles
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  fullscreenHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.baseMd,
    paddingTop: Platform.OS === 'android' ? 40 : 54,
    paddingBottom: spacing.baseSm,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  fullscreenCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  fullscreenCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  fullscreenTitle: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
  },
  fullscreenImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
