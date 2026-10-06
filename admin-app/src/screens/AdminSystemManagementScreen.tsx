import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { OrderHoursSettings } from '../components/OrderHoursSettings';
import { AdminHeader } from '../components/AdminHeader';
import { adminApi } from '../api';
import { AdminAppVersionConfiguration, AdminMaintenanceState, ManagedAppType, ManagedPlatform } from '../types';
import { useAdmin } from '../context/AdminContext';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

const APP_TYPES: { id: ManagedAppType; label: string }[] = [
  { id: 'customer', label: 'العميل' },
  { id: 'courier', label: 'الموصل' },
  { id: 'admin', label: 'المدير' },
];
const PLATFORMS: { id: ManagedPlatform; label: string }[] = [
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
];

export const AdminSystemManagementScreen: React.FC = () => {
  const { navigateTo } = useAdmin();
  const [appType, setAppType] = useState<ManagedAppType>('customer');
  const [platform, setPlatform] = useState<ManagedPlatform>('android');
  const [configurations, setConfigurations] = useState<AdminAppVersionConfiguration[]>([]);
  const [maintenance, setMaintenance] = useState<AdminMaintenanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingVersion, setSavingVersion] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [latestBuildNumber, setLatestBuildNumber] = useState('');
  const [minimumBuildNumber, setMinimumBuildNumber] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');
  const [updateTitle, setUpdateTitle] = useState('يتوفر تحديث جديد');
  const [updateMessage, setUpdateMessage] = useState('أضفنا تحسينات وإصلاحات جديدة.');
  const [isVersionPolicyActive, setIsVersionPolicyActive] = useState(true);
  const [maintenanceTitle, setMaintenanceTitle] = useState('تحديث النظام');
  const [maintenanceMessage, setMaintenanceMessage] = useState('نجري بعض التحسينات، يرجى المحاولة بعد قليل.');
  const [expectedEndAt, setExpectedEndAt] = useState('');
  const [notifyForMaintenance, setNotifyForMaintenance] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [versions, currentMaintenance] = await Promise.all([
        adminApi.getAppVersionConfigurations(),
        adminApi.getMaintenanceState(),
      ]);
      setConfigurations(versions || []);
      setMaintenance(currentMaintenance);
      setMaintenanceTitle(currentMaintenance.title || 'تحديث النظام');
      setMaintenanceMessage(currentMaintenance.message || 'نجري بعض التحسينات، يرجى المحاولة بعد قليل.');
      setExpectedEndAt(currentMaintenance.expectedEndAt || '');
    } catch (error: any) {
      Alert.alert('تعذر تحميل إعدادات النظام', error?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const selectedConfig = configurations.find(item => item.appType === appType && item.platform === platform);
  useEffect(() => {
    setLatestVersion(selectedConfig?.latestVersion || '');
    setMinimumVersion(selectedConfig?.minimumSupportedVersion || '');
    setLatestBuildNumber(selectedConfig?.latestBuildNumber?.toString() || '');
    setMinimumBuildNumber(selectedConfig?.minimumBuildNumber?.toString() || '');
    setUpdateUrl(selectedConfig?.updateUrl || '');
    setUpdateTitle(selectedConfig?.updateTitle || 'يتوفر تحديث جديد');
    setUpdateMessage(selectedConfig?.updateMessage || 'أضفنا تحسينات وإصلاحات جديدة.');
    setIsVersionPolicyActive(selectedConfig?.isActive ?? true);
  }, [appType, platform, configurations]);

  const saveVersion = async () => {
    if (!latestVersion.trim() || !minimumVersion.trim()) {
      Alert.alert('إصدارات مطلوبة', 'أدخل أحدث إصدار والحد الأدنى المدعوم.');
      return;
    }
    if (parseOptionalPositiveInt(latestBuildNumber) === -1 || parseOptionalPositiveInt(minimumBuildNumber) === -1) {
      Alert.alert('رقم بناء غير صالح', 'اترك الحقل فارغاً أو أدخل رقماً صحيحاً أكبر من الصفر.');
      return;
    }
    const higherMinimum = isHigherVersion(minimumVersion, selectedConfig?.minimumSupportedVersion || '0.0.0');
    const newMinimumBuild = parseOptionalPositiveInt(minimumBuildNumber);
    const higherMinimumBuild = newMinimumBuild !== null && newMinimumBuild > (selectedConfig?.minimumBuildNumber || 0);
    if ((higherMinimum || higherMinimumBuild) && !updateUrl.trim()) {
      Alert.alert('رابط التحديث مطلوب', 'أضف رابط HTTPS للإصدار الجديد قبل رفع الحد الأدنى حتى لا يُحجب المستخدمون دون مسار تحديث.');
      return;
    }
    const confirm = () => {
      setSavingVersion(true);
      void adminApi.updateAppVersionConfiguration(appType, platform, {
        latestVersion: latestVersion.trim(),
        minimumSupportedVersion: minimumVersion.trim(),
        latestBuildNumber: parseOptionalPositiveInt(latestBuildNumber),
        minimumBuildNumber: parseOptionalPositiveInt(minimumBuildNumber),
        updateUrl: updateUrl.trim() || null,
        updateTitle: updateTitle.trim(),
        updateMessage: updateMessage.trim(),
        isActive: isVersionPolicyActive,
      }).then(async () => {
        Alert.alert('تم الحفظ', 'حُدثت سياسة الإصدار وسُجل الإجراء في سجل التدقيق.');
        await loadData();
      }).catch((error: any) => Alert.alert('تعذر حفظ الإصدار', error?.message || 'تحقق من القيم وأعد المحاولة.'))
        .finally(() => setSavingVersion(false));
    };
    if (higherMinimum || higherMinimumBuild) {
      const raisedFloor = higherMinimum
        ? `سيُطلب من كل جهاز بإصدار أقدم من ${minimumVersion.trim()} التحديث`
        : `سيُطلب من كل جهاز برقم بناء أقل من ${minimumBuildNumber.trim()} التحديث`;
      Alert.alert(
        'تأكيد رفع الحد الأدنى',
        `${raisedFloor} قبل استخدام التطبيق. تأكد من توفر رابط التحديث.`,
        [{ text: 'مراجعة', style: 'cancel' }, { text: 'تأكيد الحفظ', style: 'destructive', onPress: confirm }],
      );
    } else confirm();
  };

  const updateMaintenance = (enabled: boolean) => {
    if (!enabled && !maintenance?.maintenance) return;
    if (enabled && (!maintenanceTitle.trim() || !maintenanceMessage.trim())) {
      Alert.alert('رسالة الصيانة مطلوبة', 'أدخل عنواناً ورسالة تظهر لمستخدمي التطبيق.');
      return;
    }
    if (expectedEndAt.trim() && Number.isNaN(Date.parse(expectedEndAt))) {
      Alert.alert('وقت غير صالح', 'استخدم صيغة تاريخ ووقت واضحة مثل 2026-10-04T18:00:00Z.');
      return;
    }

    const perform = async () => {
      setSavingMaintenance(true);
      try {
        const saved = await adminApi.setMaintenanceState({
          maintenance: enabled,
          title: enabled ? maintenanceTitle.trim() : maintenance?.title || maintenanceTitle.trim(),
          message: enabled ? maintenanceMessage.trim() : maintenance?.message || maintenanceMessage.trim(),
          expectedEndAt: enabled ? (expectedEndAt.trim() || null) : null,
        });
        setMaintenance(saved);
        let pushMessage = '';
        if (notifyForMaintenance) {
          try {
            await adminApi.createCustomerBroadcast({
              type: 'maintenance',
              title: enabled ? maintenanceTitle.trim() : 'انتهت الصيانة',
              body: enabled ? maintenanceMessage.trim() : 'تم الانتهاء من الصيانة ويمكنك الآن استخدام التطبيق.',
            });
            pushMessage = '\nأُضيف إشعار العملاء إلى قائمة الإرسال.';
          } catch {
            pushMessage = '\nتم حفظ حالة الصيانة، لكن تعذر إضافة إشعار العملاء إلى قائمة الإرسال.';
          }
        }
        Alert.alert('تم تحديث حالة النظام', `${enabled ? 'تم تفعيل وضع الصيانة.' : 'تم إنهاء وضع الصيانة.'}${pushMessage}`);
      } catch (error: any) {
        Alert.alert('تعذر تغيير وضع الصيانة', error?.message || 'حاول مرة أخرى.');
      } finally { setSavingMaintenance(false); }
    };

    Alert.alert(
      enabled ? 'تأكيد تفعيل الصيانة' : 'تأكيد إنهاء الصيانة',
      enabled
        ? 'سيؤدي هذا إلى إيقاف العمليات العادية مؤقتاً في تطبيق العميل والموصل. يستطيع المدير الاستمرار في إدارة النظام.'
        : 'سيتمكن مستخدمو العميل والموصل من متابعة استخدام النظام بعد إعادة التحقق.',
      [{ text: 'إلغاء', style: 'cancel' }, { text: enabled ? 'تفعيل الصيانة' : 'إنهاء الصيانة', style: enabled ? 'destructive' : 'default', onPress: () => void perform() }],
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="إدارة النظام" showBack onBack={() => navigateTo('financials')} />
      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text style={styles.introIcon}>🛡️</Text>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>مركز إدارة التطبيقات</Text>
              <Text style={styles.introText}>تحكم بالتوافق والصيانة من الخادم، مع تسجيل الإجراءات الإدارية.</Text>
            </View>
          </View>

          <OrderHoursSettings />

          <Section title="إدارة إصدارات التطبيقات" subtitle="كل تطبيق ومنصة لهما سياسة إصدار مستقلة.">
            <Text style={styles.label}>التطبيق</Text>
            <View style={styles.segmentRow}>
              {APP_TYPES.map(item => <Segment key={item.id} label={item.label} selected={appType === item.id} onPress={() => setAppType(item.id)} />)}
            </View>
            <Text style={styles.label}>المنصة</Text>
            <View style={styles.segmentRow}>
              {PLATFORMS.map(item => <Segment key={item.id} label={item.label} selected={platform === item.id} onPress={() => setPlatform(item.id)} />)}
            </View>
            {!selectedConfig && <Text style={styles.notice}>لا توجد سياسة محفوظة لهذه المنصة بعد. أدخل الإعدادات لإنشائها.</Text>}
            <Field label="أحدث إصدار" value={latestVersion} onChangeText={setLatestVersion} placeholder="مثال: 1.6.0" autoCapitalize="none" />
            <Field label="الحد الأدنى المدعوم" value={minimumVersion} onChangeText={setMinimumVersion} placeholder="مثال: 1.4.0" autoCapitalize="none" />
            <Text style={styles.helper}>الإصدارات الأقدم من الحد الأدنى ستحتاج إلى التحديث. وجود إصدار أحدث وحده لا يمنع استخدام التطبيق.</Text>
            <View style={styles.optionalRow}>
              <Field label="أحدث رقم بناء (اختياري)" value={latestBuildNumber} onChangeText={setLatestBuildNumber} placeholder="—" keyboardType="number-pad" />
              <Field label="أقل رقم بناء (اختياري)" value={minimumBuildNumber} onChangeText={setMinimumBuildNumber} placeholder="—" keyboardType="number-pad" />
            </View>
            <Field label="رابط التحديث" value={updateUrl} onChangeText={setUpdateUrl} placeholder="رابط HTTPS اختياري من المالك" autoCapitalize="none" keyboardType="url" />
            <Field label="عنوان التنبيه" value={updateTitle} onChangeText={setUpdateTitle} placeholder="يتوفر تحديث جديد" />
            <Field label="رسالة التحديث" value={updateMessage} onChangeText={setUpdateMessage} placeholder="تحسينات وإصلاحات جديدة" multiline />
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}><Text style={styles.toggleTitle}>تفعيل سياسة التحديث</Text><Text style={styles.toggleHint}>إيقافها يجعل واجهة التطبيق تتجاهل هذه السياسة مؤقتاً.</Text></View>
              <Switch value={isVersionPolicyActive} onValueChange={setIsVersionPolicyActive} trackColor={{ true: colors.success }} />
            </View>
            <ActionButton label={savingVersion ? 'جارٍ الحفظ…' : 'حفظ سياسة الإصدار'} onPress={() => void saveVersion()} disabled={savingVersion} />
          </Section>

          <Section title="وضع الصيانة" subtitle="حالة الخادم تُفرض على العمليات العادية، وتبقى أدوات المدير متاحة.">
            <View style={[styles.statusPill, maintenance?.maintenance ? styles.statusPillWarning : styles.statusPillActive]}>
              <View style={[styles.statusDot, { backgroundColor: maintenance?.maintenance ? colors.warning : colors.success }]} />
              <Text style={styles.statusText}>{maintenance?.maintenance ? 'وضع الصيانة مفعل' : 'النظام يعمل'}</Text>
            </View>
            <Field label="عنوان رسالة الصيانة" value={maintenanceTitle} onChangeText={setMaintenanceTitle} placeholder="تحديث النظام" />
            <Field label="رسالة الصيانة" value={maintenanceMessage} onChangeText={setMaintenanceMessage} placeholder="نجري تحسينات…" multiline />
            <Field label="وقت العودة المتوقع (اختياري)" value={expectedEndAt} onChangeText={setExpectedEndAt} placeholder="2026-10-04T18:00:00Z" autoCapitalize="none" />
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}><Text style={styles.toggleTitle}>إشعار العملاء</Text><Text style={styles.toggleHint}>يُرسل كعملية مستقلة بعد حفظ الصيانة؛ فشل الإشعار لا يعطّل التغيير.</Text></View>
              <Switch value={notifyForMaintenance} onValueChange={setNotifyForMaintenance} trackColor={{ true: colors.success }} />
            </View>
            <ActionButton
              label={savingMaintenance ? 'جارٍ التحديث…' : maintenance?.maintenance ? 'إنهاء وضع الصيانة' : 'تفعيل وضع الصيانة'}
              onPress={() => updateMaintenance(!maintenance?.maintenance)}
              disabled={savingMaintenance}
              destructive={!maintenance?.maintenance}
            />
          </Section>
          <Text style={styles.footerNote}>تُحفظ تغييرات الإصدار والصيانة في سجل التدقيق، وتُطبق مباشرةً عبر Backend.</Text>
        </ScrollView>
      )}
    </View>
  );
};

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const Field: React.FC<any> = ({ label, ...props }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} textAlign="right" placeholderTextColor={colors.outline} style={[styles.input, props.multiline && styles.multiline]} />
  </View>
);

const Segment: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({ label, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.segment, selected && styles.segmentSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const ActionButton: React.FC<{ label: string; onPress: () => void; disabled?: boolean; destructive?: boolean }> = ({ label, onPress, disabled, destructive }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.actionButton, destructive && styles.actionButtonDanger, disabled && styles.actionDisabled]} accessibilityRole="button">
    {disabled ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actionButtonText}>{label}</Text>}
  </TouchableOpacity>
);

function parseOptionalPositiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : -1;
}

function isHigherVersion(candidate: string, current: string) {
  const parts = (value: string) => value.split(/[+-]/, 1)[0].split('.').map(Number);
  const left = parts(candidate); const right = parts(current);
  if (left.length !== 3 || right.length !== 3 || [...left, ...right].some(value => !Number.isFinite(value))) return false;
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenGutter, paddingBottom: 108, gap: spacing.baseMd },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { backgroundColor: colors.primary, borderRadius: borderRadius.xl, padding: spacing.baseMd, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  introIcon: { fontSize: 30 }, introCopy: { flex: 1, alignItems: 'flex-end' },
  introTitle: { color: colors.onPrimary, fontSize: 18, fontFamily: typography.fontFamily.bold },
  introText: { color: colors.primaryFixed, fontSize: 13, lineHeight: 20, textAlign: 'right', marginTop: 4 },
  section: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, borderWidth: 1, borderColor: colors.outlineVariant, ...shadows.card },
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontFamily: typography.fontFamily.bold, textAlign: 'right' },
  sectionSubtitle: { color: colors.onSurfaceVariant, fontSize: 13, textAlign: 'right', lineHeight: 20, marginTop: 3, marginBottom: 14 },
  label: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 14, textAlign: 'right', marginTop: 13, marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.onSurface, backgroundColor: colors.background, fontFamily: typography.fontFamily.regular, fontSize: 15, writingDirection: 'rtl' },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 2 },
  segment: { flex: 1, minHeight: 40, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.medium, fontSize: 14 },
  segmentTextSelected: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold },
  fieldWrap: { flex: 1 }, optionalRow: { flexDirection: 'row-reverse', gap: 10 },
  helper: { color: colors.onSurfaceVariant, textAlign: 'right', lineHeight: 19, fontSize: 12, marginTop: 7 },
  notice: { color: colors.warning, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md, padding: 10, textAlign: 'right', writingDirection: 'rtl', marginTop: 12, fontSize: 13 },
  toggleRow: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, marginTop: 16, paddingTop: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  toggleCopy: { flex: 1, alignItems: 'flex-end' }, toggleTitle: { color: colors.onSurface, fontSize: 15, fontFamily: typography.fontFamily.bold },
  toggleHint: { color: colors.onSurfaceVariant, fontSize: 12, textAlign: 'right', lineHeight: 18, marginTop: 3 },
  actionButton: { backgroundColor: colors.primary, minHeight: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: 17, paddingHorizontal: 16 },
  actionButtonDanger: { backgroundColor: colors.error }, actionDisabled: { opacity: 0.65 },
  actionButtonText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 15 },
  statusPill: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  statusPillActive: { backgroundColor: '#E7F6EF' }, statusPillWarning: { backgroundColor: '#FFF4DF' },
  statusDot: { width: 9, height: 9, borderRadius: 5 }, statusText: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 13 },
  footerNote: { color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 12 },
});
