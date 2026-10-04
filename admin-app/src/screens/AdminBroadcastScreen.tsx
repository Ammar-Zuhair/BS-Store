import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AdminHeader } from '../components/AdminHeader';
import { adminApi } from '../api';
import { AdminBroadcastHistoryItem, BroadcastType } from '../types';
import { useAdmin } from '../context/AdminContext';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

const TYPES: { id: BroadcastType; label: string; icon: string }[] = [
  { id: 'offer', label: 'عرض', icon: '🎉' },
  { id: 'announcement', label: 'إعلان', icon: '📣' },
  { id: 'update', label: 'تحديث', icon: '✨' },
  { id: 'maintenance', label: 'صيانة', icon: '🛠️' },
  { id: 'alert', label: 'تنبيه عام', icon: '🔔' },
];

export const AdminBroadcastScreen: React.FC = () => {
  const { navigateTo } = useAdmin();
  const [type, setType] = useState<BroadcastType>('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [history, setHistory] = useState<AdminBroadcastHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const loadHistory = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const result = await adminApi.getBroadcastHistory();
      setHistory(result?.items || []);
    } catch (error: any) {
      Alert.alert('تعذر تحميل السجل', error?.message || 'حاول مرة أخرى.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const queueBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('أكمل محتوى الإشعار', 'أدخل عنواناً ونصاً قبل الإرسال.');
      return;
    }
    setSending(true);
    try {
      await adminApi.createCustomerBroadcast({ type, title: title.trim(), body: body.trim() });
      setTitle(''); setBody('');
      Alert.alert('تمت جدولة الإشعار', 'أُضيف الإشعار إلى قائمة الإرسال، وستظهر نتيجة التوزيع في سجل الإشعارات.');
      await loadHistory();
    } catch (error: any) {
      Alert.alert('تعذر جدولة الإشعار', error?.message || 'لم يُرسل الإشعار. تحقق من البيانات وحاول مجدداً.');
    } finally { setSending(false); }
  };

  const confirmBroadcast = () => {
    Alert.alert(
      'تأكيد الإرسال الجماعي',
      'سيتم إرسال هذا الإشعار إلى جميع أجهزة تطبيق العميل المسجلة للإشعارات. لا يمكن استرجاع الإشعار بعد بدء الإرسال.',
      [{ text: 'إلغاء', style: 'cancel' }, { text: 'تأكيد الإرسال', style: 'destructive', onPress: () => void queueBroadcast() }],
    );
  };

  const selectedType = TYPES.find(item => item.id === type)!;

  return (
    <View style={styles.container}>
      <AdminHeader title="إشعارات العملاء" showBack onBack={() => navigateTo('financials')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadHistory(true)} tintColor={colors.primary} />}
      >
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>📨</Text>
          <Text style={styles.heroTitle}>رسالة تصل لكل عميل</Text>
          <Text style={styles.heroBody}>سيحدد الخادم أجهزة تطبيق العميل المسجلة فقط، ويعالج الإرسال على دفعات في الخلفية.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>إنشاء إشعار</Text>
          <Text style={styles.label}>نوع الإشعار</Text>
          <View style={styles.typeGrid}>
            {TYPES.map(item => (
              <TouchableOpacity key={item.id} onPress={() => setType(item.id)} style={[styles.typeChip, type === item.id && styles.typeChipSelected]} accessibilityRole="button" accessibilityState={{ selected: type === item.id }}>
                <Text style={styles.typeIcon}>{item.icon}</Text>
                <Text style={[styles.typeLabel, type === item.id && styles.typeLabelSelected]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>العنوان</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="مثال: عرض جديد لهذا الأسبوع" placeholderTextColor={colors.outline} maxLength={120} textAlign="right" style={styles.input} />
          <View style={styles.counterRow}><Text style={styles.counter}>{title.length}/120</Text></View>
          <Text style={styles.label}>نص الإشعار</Text>
          <TextInput value={body} onChangeText={setBody} placeholder="اكتب رسالة واضحة ومختصرة لعملائك" placeholderTextColor={colors.outline} maxLength={1000} multiline textAlign="right" textAlignVertical="top" style={[styles.input, styles.bodyInput]} />
          <View style={styles.counterRow}><Text style={styles.counter}>{body.length}/1000</Text></View>

          <Text style={styles.label}>معاينة الإشعار</Text>
          <View style={styles.preview}>
            <View style={styles.previewBrand}><View style={styles.previewLogo}><Text style={styles.previewLogoText}>ب</Text></View><Text style={styles.previewBrandText}>متجر بي إس · الآن</Text></View>
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{title.trim() || 'عنوان الإشعار'}</Text>
              <Text style={styles.previewBody}>{body.trim() || 'ستظهر رسالة الإشعار هنا قبل إرسالها للعملاء.'}</Text>
            </View>
            <Text style={styles.previewType}>{selectedType.icon} {selectedType.label}</Text>
          </View>
          <TouchableOpacity onPress={confirmBroadcast} disabled={sending} style={[styles.sendButton, sending && styles.disabled]} accessibilityRole="button">
            {sending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.sendButtonText}>مراجعة وإرسال للجميع</Text>}
          </TouchableOpacity>
          <Text style={styles.safetyNote}>لن تُرسل الرسالة إلى أجهزة المدير أو الموصل.</Text>
        </View>

        <View style={styles.historyHeader}>
          <View style={styles.historyHeadingCopy}><Text style={styles.sectionTitle}>سجل الإشعارات</Text><Text style={styles.historySubtitle}>حالة الإرسال وأعداد الأجهزة المستهدفة والناجحة والمتعثرة.</Text></View>
          <TouchableOpacity onPress={() => void loadHistory(true)} accessibilityRole="button" style={styles.refreshButton}><Text style={styles.refreshText}>تحديث</Text></TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.historyLoading} /> : history.length === 0 ? (
          <View style={styles.emptyHistory}><Text style={styles.emptyIcon}>🗂️</Text><Text style={styles.emptyTitle}>لا توجد إشعارات مرسلة</Text><Text style={styles.emptyHint}>ستظهر الحملات التي ترسلها هنا.</Text></View>
        ) : history.map(item => <BroadcastRow key={item.id} item={item} />)}
      </ScrollView>
    </View>
  );
};

const BroadcastRow: React.FC<{ item: AdminBroadcastHistoryItem }> = ({ item }) => {
  const kind = TYPES.find(type => type.id === item.type);
  const status = statusLabel(item.status);
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyRowTop}>
        <View style={[styles.statusBadge, { backgroundColor: status.background }]}><Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text></View>
        <View style={styles.rowTitleWrap}><Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.rowType}>{kind?.icon || '🔔'} {kind?.label || item.type}</Text></View>
      </View>
      <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
      <View style={styles.metricsRow}>
        <Metric label="مستهدف" value={item.targetCount} />
        <Metric label="نجح" value={item.successCount} color={colors.success} />
        <Metric label="تعثر" value={item.failureCount} color={item.failureCount ? colors.error : colors.onSurfaceVariant} />
        <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
};

const Metric: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <View style={styles.metric}><Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>
);

function statusLabel(status: AdminBroadcastHistoryItem['status']) {
  switch (status) {
    case 'Pending': return { label: 'في الانتظار', color: '#8B5E00', background: '#FFF3CD' };
    case 'Processing': return { label: 'جارٍ الإرسال', color: '#315B8A', background: '#E5F1FF' };
    case 'Completed': return { label: 'اكتمل', color: '#176B46', background: '#E4F5EC' };
    case 'Partial': return { label: 'اكتمل جزئياً', color: '#8B5E00', background: '#FFF3CD' };
    default: return { label: 'تعذر الإرسال', color: '#A23035', background: '#FCE8E8' };
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenGutter, paddingBottom: 110, gap: spacing.baseMd },
  hero: { backgroundColor: colors.primary, padding: spacing.baseLg, borderRadius: borderRadius.xl, alignItems: 'flex-end', ...shadows.card },
  heroIcon: { fontSize: 30, marginBottom: 7 }, heroTitle: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 20, textAlign: 'right' },
  heroBody: { color: colors.primaryFixed, fontSize: 14, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  card: { backgroundColor: colors.surfaceContainerLowest, padding: spacing.baseMd, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outlineVariant, ...shadows.card },
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontFamily: typography.fontFamily.bold, textAlign: 'right' },
  label: { color: colors.onSurface, fontSize: 14, fontFamily: typography.fontFamily.bold, textAlign: 'right', marginTop: 14, marginBottom: 7 },
  typeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  typeChip: { minWidth: '30%', flexGrow: 1, minHeight: 54, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.background, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 5, paddingHorizontal: 8 },
  typeChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  typeIcon: { fontSize: 16 }, typeLabel: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.medium, fontSize: 13 },
  typeLabelSelected: { color: colors.onSurface, fontFamily: typography.fontFamily.bold },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, color: colors.onSurface, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, writingDirection: 'rtl' },
  bodyInput: { minHeight: 100 }, counterRow: { alignItems: 'flex-start', marginTop: 3 }, counter: { color: colors.onSurfaceVariant, fontSize: 11 },
  preview: { backgroundColor: '#F3F5F8', borderRadius: borderRadius.lg, padding: 13, borderWidth: 1, borderColor: colors.outlineVariant },
  previewBrand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }, previewLogo: { width: 29, height: 29, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewLogoText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 15 }, previewBrandText: { color: colors.onSurfaceVariant, fontSize: 12 },
  previewContent: { alignItems: 'flex-end', marginTop: 10 }, previewTitle: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 16, textAlign: 'right' },
  previewBody: { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl', marginTop: 3 },
  previewType: { color: colors.onSurfaceVariant, fontSize: 11, textAlign: 'right', marginTop: 10 },
  sendButton: { minHeight: 50, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  sendButtonText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 15 }, disabled: { opacity: 0.65 },
  safetyNote: { color: colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', marginTop: 8 },
  historyHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 4 }, historyHeadingCopy: { flex: 1, alignItems: 'flex-end' },
  historySubtitle: { color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, textAlign: 'right', marginTop: 3 },
  refreshButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerHigh }, refreshText: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 13 },
  historyLoading: { paddingVertical: 22 }, emptyHistory: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: 25, alignItems: 'center' },
  emptyIcon: { fontSize: 32 }, emptyTitle: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 16, marginTop: 9 }, emptyHint: { color: colors.onSurfaceVariant, fontSize: 13, marginTop: 4 },
  historyRow: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, padding: 13, borderWidth: 1, borderColor: colors.outlineVariant, marginTop: 9 },
  historyRowTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }, statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: borderRadius.full }, statusBadgeText: { fontSize: 11, fontFamily: typography.fontFamily.bold },
  rowTitleWrap: { flex: 1, alignItems: 'flex-end' }, rowTitle: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 15 }, rowType: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  rowBody: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl', marginTop: 9 },
  metricsRow: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, flexDirection: 'row-reverse', alignItems: 'center', gap: 14, marginTop: 11, paddingTop: 9 },
  metric: { alignItems: 'center' }, metricValue: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 14 }, metricLabel: { color: colors.onSurfaceVariant, fontSize: 10, marginTop: 1 },
  rowDate: { flex: 1, textAlign: 'left', color: colors.onSurfaceVariant, fontSize: 11 },
});
