import { StartupIntro } from '../startup/StartupIntro';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { api } from '../api';
import { typography } from '../theme';

type Palette = {
  primary: string; onPrimary: string; background: string; surfaceDim: string; onSurface: string; onSurfaceVariant: string;
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
  showMaintenance?: boolean;
  startupReady?: boolean;
  themeReady?: boolean;
  isDarkMode?: boolean;
}> = ({ children, appType, palette, showMaintenance = true, startupReady = true, themeReady = true, isDarkMode = false }) => {
  const insets = useSafeAreaInsets();
  const safeTopInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0);
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const finishIntro = useCallback(() => setIntroFinished(true), []);
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

  const openUpdate = async () => {
    const url = versionStatus?.updateUrl;
    if (!url) {
      Alert.alert('رابط التحديث غير متاح', 'يرجى المحاولة لاحقاً أو التواصل مع الدعم.');
      return;
    }
    try { await Linking.openURL(url); }
    catch { Alert.alert('تعذر فتح التحديث', 'تحقق من اتصال الإنترنت وحاول مرة أخرى.'); }
  };

  if (!introFinished || !initialCheckComplete || !startupReady || !themeReady) {
    return <StartupIntro dark={isDarkMode} themeReady={themeReady} finished={introFinished} onFinished={finishIntro} />;
  }

  if (showMaintenance && maintenance?.maintenance) {
    return <MaintenanceScreen status={maintenance} palette={palette} onRetry={refresh} isRefreshing={isRefreshing} />;
  }

  if (versionStatus?.updateRequired) {
    return <RequiredUpdateScreen status={versionStatus} palette={palette} onUpdate={openUpdate} onRetry={refresh} isRefreshing={isRefreshing} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {!!versionStatus?.updateAvailable && !versionStatus.updateRequired && (
        <Pressable accessibilityRole="button" onPress={() => void openUpdate()} style={[styles.versionBanner, { top: safeTopInset + 8, backgroundColor: palette.primary }]}>
          <Text style={[styles.primaryButtonText, { color: palette.onPrimary }]}>{versionStatus.title || `يتوفر الإصدار ${versionStatus.latestVersion}`}</Text>
          <Text style={[styles.versionBannerMessage, { color: palette.onPrimary }]} numberOfLines={2}>{versionStatus.message || 'حدّث التطبيق للاستفادة من التحسينات الجديدة.'}</Text>
          <Text style={[styles.versionBannerAction, { color: palette.onPrimary }]}>عرض التحديث</Text>
        </Pressable>
      )}
    </View>
  );
};

const MaintenanceScreen: React.FC<{ status: MaintenanceStatus; palette: Palette; onRetry: () => void; isRefreshing: boolean }> = ({ status, palette, onRetry, isRefreshing }) => (
  <ScrollView contentContainerStyle={[styles.gateScreen, { backgroundColor: palette.surfaceDim }]}>
    <View style={[styles.illustration, { backgroundColor: palette.surfaceContainerLow || '#EAECEF' }]}><Text style={styles.illustrationIcon}>🛠️</Text></View>
    <Text style={[styles.eyebrow, { color: palette.onSurfaceVariant }]}>متجر بي إس</Text>
    <Text accessibilityRole="header" style={[styles.title, { color: palette.onSurface }]}>{status.title || 'نعود إليك قريباً'}</Text>
    <Text style={[styles.description, { color: palette.onSurfaceVariant }]}>{status.message || 'نجري بعض التحسينات على النظام. شكراً لصبرك.'}</Text>
    {status.expectedEndAt ? <Text style={[styles.returnTime, { color: palette.onSurface }]}>{formatExpectedTime(status.expectedEndAt)}</Text> : null}
    <Pressable accessibilityRole="button" onPress={onRetry} disabled={isRefreshing} style={[styles.primaryButton, styles.wideButton, { backgroundColor: palette.primary }]}>
      {isRefreshing ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={[styles.primaryButtonText, { color: palette.onPrimary }]}>حاول مجدداً</Text>}
    </Pressable>
    <Text style={[styles.footnote, { color: palette.onSurfaceVariant }]}>سيعود التطبيق للعمل تلقائياً عند انتهاء الصيانة.</Text>
  </ScrollView>
);

const RequiredUpdateScreen: React.FC<{ status: VersionStatus; palette: Palette; onUpdate: () => void; onRetry: () => void; isRefreshing: boolean }> = ({ status, palette, onUpdate, onRetry, isRefreshing }) => (
  <ScrollView contentContainerStyle={[styles.gateScreen, { backgroundColor: palette.surfaceDim }]}>
    <View style={[styles.illustration, { backgroundColor: palette.surfaceContainerLow || '#EAECEF' }]}><Text style={styles.illustrationIcon}>⬆️</Text></View>
    <Text style={[styles.eyebrow, { color: palette.onSurfaceVariant }]}>متجر بي إس</Text>
    <Text accessibilityRole="header" style={[styles.title, { color: palette.onSurface }]}>يلزم تحديث التطبيق</Text>
    <Text style={[styles.description, { color: palette.onSurfaceVariant }]}>{status.message || `هذا الإصدار لم يعد مدعوماً. حدّث إلى ${status.latestVersion} للمتابعة.`}</Text>
    <Pressable accessibilityRole="button" onPress={() => void onUpdate()} style={[styles.primaryButton, styles.wideButton, { backgroundColor: palette.primary }]}>
      <Text style={[styles.primaryButtonText, { color: palette.onPrimary }]}>تحديث الآن</Text>
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
  gateScreen: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, paddingTop: 48, paddingBottom: 48 },
  illustration: { width: 120, height: 120, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  illustrationIcon: { fontSize: 52 },
  eyebrow: { fontFamily: typography.fontFamily.medium, fontSize: 15, marginBottom: 10, writingDirection: 'rtl' },
  title: { fontFamily: typography.fontFamily.extraBold || typography.fontFamily.bold, fontSize: 28, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl', marginBottom: 12 },
  description: { fontFamily: typography.fontFamily.regular, maxWidth: 360, fontSize: 18, lineHeight: 28, textAlign: 'center', writingDirection: 'rtl', marginBottom: 20 },
  returnTime: { fontFamily: typography.fontFamily.medium, fontSize: 15, textAlign: 'center', writingDirection: 'rtl', marginBottom: 26 },
  primaryButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  wideButton: { width: '100%', maxWidth: 360, marginTop: 6 },
  primaryButtonText: { fontFamily: typography.fontFamily.bold, fontWeight: '700', fontSize: 16, textAlign: 'center', writingDirection: 'rtl' },
  footnote: { fontFamily: typography.fontFamily.regular, marginTop: 20, fontSize: 14, textAlign: 'center', writingDirection: 'rtl' },
  retryButton: { marginTop: 20, padding: 12 },
  retryText: { fontFamily: typography.fontFamily.bold, fontWeight: '700', fontSize: 16 },
  versionBanner: { position: 'absolute', top: 8, left: 12, right: 12, zIndex: 190, elevation: 10, borderRadius: 16, padding: 14, alignItems: 'flex-end' },
  versionBannerMessage: { fontSize: 13, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  versionBannerAction: { fontFamily: typography.fontFamily.bold, fontSize: 13, fontWeight: '700', marginTop: 7 },
});
