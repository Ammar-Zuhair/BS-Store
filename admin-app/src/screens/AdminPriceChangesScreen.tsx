import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AdminHeader } from '../components/AdminHeader';
import { adminApi } from '../api';
import { AdminPriceChangeComplaint, AdminProductPriceChange } from '../types';
import { borderRadius, colors, spacing, typography } from '../theme';

const money = (value: number) => `${Number(value || 0).toLocaleString('ar-YE')} ر.ي`;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('ar-YE') : 'غير مسجل';

export const AdminPriceChangesScreen: React.FC = () => {
  const [changes, setChanges] = useState<AdminProductPriceChange[]>([]);
  const [complaints, setComplaints] = useState<AdminPriceChangeComplaint[]>([]);
  const [thresholdText, setThresholdText] = useState('');
  const [thresholdConfigured, setThresholdConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [busyComplaintId, setBusyComplaintId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [audit, reports] = await Promise.all([
        adminApi.getProductPriceChanges(),
        adminApi.getPriceChangeComplaints(),
      ]);
      setChanges(audit.items || []);
      setThresholdConfigured(Boolean(audit.reviewThresholdConfigured));
      setThresholdText(audit.reviewThresholdConfigured && audit.reviewThresholdPercentage != null
        ? String(audit.reviewThresholdPercentage) : '');
      setComplaints(reports || []);
    } catch (error: any) {
      Alert.alert('تعذر تحميل السجل', error?.message || 'حاول تحديث الصفحة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveThreshold = async () => {
    const value = thresholdText.trim() === '' ? null : Number(thresholdText);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      Alert.alert('قيمة غير صالحة', 'أدخل نسبة صفر أو أكبر، أو اترك الحقل فارغاً لإيقاف الحد.');
      return;
    }
    setSavingThreshold(true);
    try {
      const result = await adminApi.setPriceChangeReviewThreshold(value);
      setThresholdConfigured(result.reviewThresholdConfigured);
      setThresholdText(result.reviewThresholdPercentage == null ? '' : String(result.reviewThresholdPercentage));
      Alert.alert('تم الحفظ', value == null
        ? 'ستظهر جميع تغييرات الأسعار للمراجعة الإدارية.'
        : `ستظهر التغييرات التي تبلغ نسبتها ${value}% أو أكثر للمراجعة.`);
      await load();
    } catch (error: any) {
      Alert.alert('تعذر الحفظ', error?.message || 'حاول مرة أخرى.');
    } finally {
      setSavingThreshold(false);
    }
  };

  const updateComplaint = async (complaint: AdminPriceChangeComplaint, status: 'REVIEWING' | 'RESOLVED') => {
    setBusyComplaintId(complaint.id);
    try {
      await adminApi.updatePriceChangeComplaint(complaint.id, status);
      setComplaints((current) => current.map((item) => item.id === complaint.id
        ? { ...item, status, reviewedAt: new Date().toISOString() }
        : item));
    } catch (error: any) {
      Alert.alert('تعذر تحديث البلاغ', error?.message || 'حاول مرة أخرى.');
    } finally {
      setBusyComplaintId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <AdminHeader title="مراقبة تغييرات الأسعار" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>حد المراجعة الإدارية</Text>
            <Text style={styles.body}>
              نسبة التغير تحسب من سعر الكتالوج وقت تأكيد الموصل. اتركها فارغة لتظهر كل التغييرات للمراجعة.
            </Text>
            <View style={styles.thresholdRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => void saveThreshold()} disabled={savingThreshold}>
                {savingThreshold ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>حفظ</Text>}
              </TouchableOpacity>
              <TextInput
                style={styles.thresholdInput}
                keyboardType="decimal-pad"
                value={thresholdText}
                onChangeText={setThresholdText}
                placeholder="فارغ = مراجعة كل تغيير"
                placeholderTextColor={colors.onSurfaceVariant}
                textAlign="right"
              />
              <Text style={styles.percent}>%</Text>
            </View>
            <Text style={styles.caption}>
              {thresholdConfigured ? 'الحد مضبوط من إعدادات الإدارة.' : 'لم يحدد حد؛ جميع التغييرات مصنفة للمراجعة.'}
            </Text>
          </View>

          <View style={styles.headingRow}>
            <Text style={styles.count}>{changes.length}</Text>
            <Text style={styles.sectionTitle}>سجل تغييرات الأسعار</Text>
          </View>
          {changes.length === 0 ? <Text style={styles.empty}>لا توجد تغييرات مسجلة.</Text> : changes.map((change) => (
            <View key={change.id} style={styles.card}>
              <View style={styles.headingRow}>
                {change.flagForAdminReview && <Text style={styles.flag}>يتطلب المراجعة</Text>}
                <Text style={styles.cardTitle}>{change.productName}</Text>
              </View>
              <Text style={styles.body}>المتجر: {change.storeName}  •  الطلب: {change.orderNumber}</Text>
              <Text style={styles.body}>الموصل: {change.driverName}  •  التغير: {change.percentageChange.toFixed(2)}%</Text>
              <Text style={styles.body}>سعر الكتالوج المرصود: {money(change.observedPrice)}</Text>
              <Text style={styles.priceChange}>{money(change.currentCatalogPrice)} ← {money(change.newStorePrice)}</Text>
              <Text style={styles.body}>سعر بند الطلب: {money(change.orderItemOriginalPrice)} ← {money(change.orderItemFinalPrice)}</Text>
              <Text style={styles.body}>إقرار إبلاغ العميل: {change.customerContactConfirmed ? 'نعم' : 'لا'}</Text>
              <Text style={styles.body}>بدء محاولة الاتصال: {dateTime(change.contactInitiatedAt)}</Text>
              <Text style={styles.caption}>{dateTime(change.createdAt)}</Text>
            </View>
          ))}

          <View style={styles.headingRow}>
            <Text style={styles.count}>{complaints.filter((item) => item.status !== 'RESOLVED').length}</Text>
            <Text style={styles.sectionTitle}>بلاغات العملاء</Text>
          </View>
          {complaints.length === 0 ? <Text style={styles.empty}>لا توجد بلاغات على تغييرات الأسعار.</Text> : complaints.map((complaint) => (
            <View key={complaint.id} style={styles.card}>
              <View style={styles.headingRow}>
                <Text style={styles.status}>{complaint.status === 'OPEN' ? 'مفتوح' : complaint.status === 'REVIEWING' ? 'قيد المراجعة' : 'تم الحل'}</Text>
                <Text style={styles.cardTitle}>{complaint.productName}</Text>
              </View>
              <Text style={styles.body}>العميل: {complaint.customerName}  •  الطلب: {complaint.orderNumber}</Text>
              <Text style={styles.body}>المتجر: {complaint.storeName}  •  الموصل: {complaint.driverName}</Text>
              <Text style={styles.priceChange}>{money(complaint.oldPrice)} ← {money(complaint.newPrice)} ({complaint.percentageChange.toFixed(2)}%)</Text>
              <Text style={styles.body}>اتصال بدأ: {dateTime(complaint.contactInitiatedAt)}  •  إقرار الإبلاغ: {complaint.customerContactConfirmed ? 'نعم' : 'لا'}</Text>
              <Text style={styles.body}>سبب البلاغ: {complaint.reason}</Text>
              {!!complaint.customerNotes && <Text style={styles.notes}>{complaint.customerNotes}</Text>}
              <Text style={styles.caption}>تاريخ البلاغ: {dateTime(complaint.createdAt)}</Text>
              {complaint.status !== 'RESOLVED' && (
                <View style={styles.actionRow}>
                  {complaint.status === 'OPEN' && (
                    <TouchableOpacity style={styles.secondaryButton} disabled={busyComplaintId === complaint.id} onPress={() => void updateComplaint(complaint, 'REVIEWING')}>
                      <Text style={styles.secondaryButtonText}>بدء المراجعة</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.primaryButton} disabled={busyComplaintId === complaint.id} onPress={() => void updateComplaint(complaint, 'RESOLVED')}>
                    <Text style={styles.primaryButtonText}>تم الحل</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.refreshButton} onPress={() => void load()}><Text style={styles.refreshText}>تحديث السجل</Text></TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.baseMd, paddingBottom: 110, gap: spacing.baseMd },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, padding: spacing.baseMd, gap: 7, borderWidth: 1, borderColor: colors.outlineVariant },
  headingRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, textAlign: 'right' },
  cardTitle: { flex: 1, color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md, textAlign: 'right' },
  body: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'right' },
  caption: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, textAlign: 'right' },
  priceChange: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md, textAlign: 'right' },
  notes: { color: colors.onSurface, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'right', backgroundColor: colors.surfaceContainerHigh, padding: 10, borderRadius: borderRadius.md },
  flag: { color: '#8D4300', backgroundColor: '#FFE2B8', paddingHorizontal: 9, paddingVertical: 4, borderRadius: borderRadius.md, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xs },
  status: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  count: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md },
  empty: { color: colors.onSurfaceVariant, textAlign: 'right', padding: spacing.baseMd },
  thresholdRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 8 },
  thresholdInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, color: colors.onSurface },
  percent: { color: colors.onSurfaceVariant, fontWeight: '700' },
  primaryButton: { backgroundColor: colors.primary, paddingHorizontal: 16, minHeight: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  secondaryButton: { borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 14, minHeight: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  actionRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  refreshButton: { padding: 12, alignItems: 'center' },
  refreshText: { color: colors.primary, fontFamily: typography.fontFamily.bold },
});
