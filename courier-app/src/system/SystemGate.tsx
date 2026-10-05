import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, InteractionManager, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { api } from '../api';

type Palette = {
  primary: string; background: string; onSurface: string; onSurfaceVariant: string;
  surfaceContainerLowest?: string; surfaceContainerLow?: string; outlineVariant?: string;
  success?: string; warning?: string; error?: string;
};
type VersionStatus = {
  currentVersion: string; latestVersion: string; minimumSupportedVersion: string;
  updateAvailable: boolean; updateRequired: boolean; title?: string | null; message?: string | null; updateUrl?: string | null;
};
type MaintenanceStatus = { maintenance: boolean; title?: string | null; message?: string | null; expectedEndAt?: string | null };

const appVersion = Constants.expoConfig?.version || '0.0.0';
const platform = Platform.OS === 'ios' ? 'ios' : 'android';
const nativeBuildNumber = Number.parseInt(Application.nativeBuildVersion || '', 10);
const SYSTEM_CHECK_TIMEOUT_MS = 5000;

export const SystemGate: React.FC<{
  children: React.ReactNode;
  appType: 'customer' | 'admin' | 'courier';
  palette: Palette;
  safeToReload: boolean;
  showMaintenance?: boolean;
}> = ({ children, appType, palette, safeToReload, showMaintenance = true }) => {
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [isOtaReady, setIsOtaReady] = useState(false);
  const [isOtaDismissed, setIsOtaDismissed] = useState(false);
  const [isApplyingOta, setIsApplyingOta] = useState(false);

  const refreshStatus = useCallback(async () => {
    const result = await Promise.allSettled([withTimeout(api.get<MaintenanceStatus>('/system/status'))]);
    if (result[0].status === 'fulfilled' && result[0].value) setMaintenance(result[0].value);
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const buildParameter = Number.isSafeInteger(nativeBuildNumber) && nativeBuildNumber > 0 ? `&buildNumber=${nativeBuildNumber}` : '';
    const versionPath = `/app-version?appType=${appType}&platform=${platform}&currentVersion=${encodeURIComponent(appVersion)}${buildParameter}`;
    try {
      const [statusResult, versionResult] = await Promise.allSettled([
        withTimeout(api.get<MaintenanceStatus>('/system/status')),
        withTimeout(api.get<VersionStatus>(versionPath)),
      ]);
      if (statusResult.status === 'fulfilled' && statusResult.value) setMaintenance(statusResult.value);
      if (versionResult.status === 'fulfilled' && versionResult.value) setVersionStatus(versionResult.value);
    } finally {
      setInitialCheckComplete(true);
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const interval = setInterval(() => { void refreshStatus(); }, 60_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshStatus();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [refreshStatus]);

  useEffect(() => {
    if (!initialCheckComplete) return;
    let active = true;
    let interactionTask: { cancel: () => void } | undefined;
    const timer = setTimeout(() => {
      if (!active) return;
      interactionTask = InteractionManager.runAfterInteractions(() => {
        void (async () => {
          try {
            const Updates = await import('expo-updates');
            if (!active || !Updates.isEnabled) return;
            const result = await Updates.checkForUpdateAsync();
            if (!result.isAvailable) return;
            const fetched = await Updates.fetchUpdateAsync();
            if (active && fetched.isNew) setIsOtaReady(true);
          } catch {
            // The embedded app remains usable when OTA is unavailable or offline.
          }
        })();
      });
    }, 1200);
    return () => { active = false; clearTimeout(timer); interactionTask?.cancel(); };
  }, [initialCheckComplete]);

  const openUpdate = async () => {
    const url = versionStatus?.updateUrl;
    if (!url) {
      Alert.alert('رابط التحديث غير متاح', 'يرجى المحاولة لاحقاً أو التواصل مع الدعم.');
      return;
    }
    try { await Linking.openURL(url); }
    catch { Alert.alert('تعذر فتح التحديث', 'تحقق من اتصال الإنترنت وحاول مرة أخرى.'); }
  };

  const applyOta = async () => {
    if (!safeToReload || isApplyingOta) return;
    setIsApplyingOta(true);
    try {
      const Updates = await import('expo-updates');
      await Updates.reloadAsync();
    }
    catch {
      setIsApplyingOta(false);
      Alert.alert('تعذر تطبيق التحديث', 'سيبقى التطبيق على النسخة الحالية ويمكن المحاولة لاحقاً.');
    }
  };

  if (!initialCheckComplete) {
    return (
      <View style={[styles.startup, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.startupText, { color: palette.onSurfaceVariant }]}>جارٍ التحقق من حالة النظام وإصدار التطبيق…</Text>
      </View>
    );
  }

  if (showMaintenance && maintenance?.maintenance) {
    if (appType === 'courier' && !safeToReload) {
      return (
        <View style={{ flex: 1 }}>
          {children}
          <View accessibilityRole="alert" style={[styles.maintenanceNotice, { backgroundColor: palette.surfaceContainerLowest || '#FFFFFF', borderColor: palette.outlineVariant || '#DDE1E7' }]}>
            <Text style={[styles.maintenanceNoticeTitle, { color: palette.onSurface }]}>{maintenance.title || 'وضع الصيانة مفعل'}</Text>
            <Text style={[styles.maintenanceNoticeMessage, { color: palette.onSurfaceVariant }]}>{maintenance.message || 'أوقفنا العمليات مؤقتاً. ستبقى هذه الشاشة مفتوحة حتى لا تفقد بيانات المهمة الحالية.'}</Text>
            <Pressable accessibilityRole="button" onPress={() => void refreshStatus()} style={[styles.maintenanceNoticeButton, { backgroundColor: palette.primary }]}>
              <Text style={styles.primaryButtonText}>إعادة التحقق</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return <MaintenanceScreen status={maintenance} palette={palette} onRetry={refresh} isRefreshing={isRefreshing} />;
  }

  if (versionStatus?.updateRequired && (appType !== 'courier' || safeToReload)) {
    return <RequiredUpdateScreen status={versionStatus} palette={palette} onUpdate={openUpdate} onRetry={refresh} isRefreshing={isRefreshing} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {isOtaReady && safeToReload && !isOtaDismissed && (
        <View style={[styles.banner, { backgroundColor: palette.surfaceContainerLowest || '#FFFFFF', borderColor: palette.outlineVariant || '#DDE1E7' }]}>
          <View style={styles.bannerCopy}>
            <Text style={[styles.bannerTitle, { color: palette.onSurface }]}>يتوفر تحديث جديد</Text>
            <Text style={[styles.bannerMessage, { color: palette.onSurfaceVariant }]}>تم تنزيل تحسينات جديدة للتطبيق.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void applyOta()} style={[styles.primaryButton, { backgroundColor: palette.primary }]}>
            {isApplyingOta ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>تطبيق</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setIsOtaDismissed(true)} style={styles.laterButton}>
            <Text style={[styles.laterText, { color: palette.onSurfaceVariant }]}>لاحقاً</Text>
          </Pressable>
        </View>
      )}
      {!!versionStatus?.updateAvailable && !versionStatus.updateRequired && (
        <Pressable accessibilityRole="button" onPress={() => void openUpdate()} style={[styles.versionBanner, { backgroundColor: palette.primary }]}>
          <Text style={styles.primaryButtonText}>{versionStatus.title || `يتوفر الإصدار ${versionStatus.latestVersion}`}</Text>
          <Text style={styles.versionBannerMessage} numberOfLines={2}>{versionStatus.message || 'حدّث التطبيق للاستفادة من التحسينات الجديدة.'}</Text>
          <Text style={styles.versionBannerAction}>عرض التحديث</Text>
        </Pressable>
      )}
    </View>
  );
};

const MaintenanceScreen: React.FC<{ status: MaintenanceStatus; palette: Palette; onRetry: () => void; isRefreshing: boolean }> = ({ status, palette, onRetry, isRefreshing }) => (
  <ScrollView contentContainerStyle={[styles.gateScreen, { backgroundColor: palette.background }]}>
    <View style={[styles.illustration, { backgroundColor: palette.surfaceContainerLow || '#EAECEF' }]}><Text style={styles.illustrationIcon}>🛠️</Text></View>
    <Text style={[styles.eyebrow, { color: palette.onSurfaceVariant }]}>متجر بي إس</Text>
    <Text accessibilityRole="header" style={[styles.title, { color: palette.onSurface }]}>{status.title || 'نعود إليك قريباً'}</Text>
    <Text style={[styles.description, { color: palette.onSurfaceVariant }]}>{status.message || 'نجري بعض التحسينات على النظام. شكراً لصبرك.'}</Text>
    {status.expectedEndAt ? <Text style={[styles.returnTime, { color: palette.onSurface }]}>{formatExpectedTime(status.expectedEndAt)}</Text> : null}
    <Pressable accessibilityRole="button" onPress={onRetry} disabled={isRefreshing} style={[styles.primaryButton, styles.wideButton, { backgroundColor: palette.primary }]}>
      {isRefreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>حاول مجدداً</Text>}
    </Pressable>
    <Text style={[styles.footnote, { color: palette.onSurfaceVariant }]}>سيعود التطبيق للعمل تلقائياً عند انتهاء الصيانة.</Text>
  </ScrollView>
);

const RequiredUpdateScreen: React.FC<{ status: VersionStatus; palette: Palette; onUpdate: () => void; onRetry: () => void; isRefreshing: boolean }> = ({ status, palette, onUpdate, onRetry, isRefreshing }) => (
  <ScrollView contentContainerStyle={[styles.gateScreen, { backgroundColor: palette.background }]}>
    <View style={[styles.illustration, { backgroundColor: palette.surfaceContainerLow || '#EAECEF' }]}><Text style={styles.illustrationIcon}>⬆️</Text></View>
    <Text style={[styles.eyebrow, { color: palette.onSurfaceVariant }]}>متجر بي إس</Text>
    <Text accessibilityRole="header" style={[styles.title, { color: palette.onSurface }]}>يلزم تحديث التطبيق</Text>
    <Text style={[styles.description, { color: palette.onSurfaceVariant }]}>{status.message || `هذا الإصدار لم يعد مدعوماً. حدّث إلى ${status.latestVersion} للمتابعة.`}</Text>
    <Pressable accessibilityRole="button" onPress={() => void onUpdate()} style={[styles.primaryButton, styles.wideButton, { backgroundColor: palette.primary }]}>
      <Text style={styles.primaryButtonText}>تحديث الآن</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onRetry} disabled={isRefreshing} style={styles.retryButton}>
      {isRefreshing ? <ActivityIndicator color={palette.primary} /> : <Text style={[styles.retryText, { color: palette.primary }]}>إعادة التحقق</Text>}
    </Pressable>
  </ScrollView>
);

function formatExpectedTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try { return `الوقت المتوقع للعودة: ${date.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}`; }
  catch { return `الوقت المتوقع للعودة: ${date.toLocaleString('ar')}`; }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SYSTEM_CHECK_TIMEOUT')), SYSTEM_CHECK_TIMEOUT_MS);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

const styles = StyleSheet.create({
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  startupText: { fontFamily: 'Tajawal_400Regular', fontSize: 14, marginTop: 14, textAlign: 'center', writingDirection: 'rtl' },
  gateScreen: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, paddingTop: 48, paddingBottom: 48 },
  illustration: { width: 120, height: 120, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  illustrationIcon: { fontSize: 52 },
  eyebrow: { fontFamily: 'Tajawal_500Medium', fontSize: 15, marginBottom: 10, writingDirection: 'rtl' },
  title: { fontFamily: 'Tajawal_800ExtraBold', fontSize: 28, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl', marginBottom: 12 },
  description: { fontFamily: 'Tajawal_400Regular', maxWidth: 360, fontSize: 18, lineHeight: 28, textAlign: 'center', writingDirection: 'rtl', marginBottom: 20 },
  returnTime: { fontFamily: 'Tajawal_500Medium', fontSize: 15, textAlign: 'center', writingDirection: 'rtl', marginBottom: 26 },
  primaryButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  wideButton: { width: '100%', maxWidth: 360, marginTop: 6 },
  primaryButtonText: { fontFamily: 'Tajawal_700Bold', color: '#FFFFFF', fontWeight: '700', fontSize: 16, textAlign: 'center', writingDirection: 'rtl' },
  footnote: { fontFamily: 'Tajawal_400Regular', marginTop: 20, fontSize: 14, textAlign: 'center', writingDirection: 'rtl' },
  retryButton: { marginTop: 20, padding: 12 },
  retryText: { fontFamily: 'Tajawal_700Bold', fontWeight: '700', fontSize: 16 },
  banner: { position: 'absolute', top: 8, left: 12, right: 12, zIndex: 200, elevation: 12, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  maintenanceNotice: { position: 'absolute', top: 8, left: 12, right: 12, zIndex: 300, elevation: 16, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'flex-end' },
  maintenanceNoticeTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },
  maintenanceNoticeMessage: { fontFamily: 'Tajawal_400Regular', fontSize: 13, lineHeight: 20, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  maintenanceNoticeButton: { minHeight: 38, borderRadius: 11, paddingHorizontal: 14, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1, alignItems: 'flex-end' },
  bannerTitle: { fontFamily: 'Tajawal_700Bold', fontSize: 15, fontWeight: '700', writingDirection: 'rtl' },
  bannerMessage: { fontFamily: 'Tajawal_400Regular', fontSize: 12, marginTop: 3, writingDirection: 'rtl' },
  laterButton: { paddingHorizontal: 6, paddingVertical: 10 },
  laterText: { fontFamily: 'Tajawal_500Medium', fontSize: 13, fontWeight: '600' },
  versionBanner: { position: 'absolute', top: 84, left: 12, right: 12, zIndex: 190, elevation: 10, borderRadius: 16, padding: 14, alignItems: 'flex-end' },
  versionBannerMessage: { color: '#FFFFFF', fontSize: 13, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  versionBannerAction: { fontFamily: 'Tajawal_700Bold', color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 7 },
});
