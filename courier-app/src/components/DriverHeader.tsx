import React, { useState } from 'react';
import { ActivityIndicator, Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useDriver } from '../context/DriverContext';

interface DriverHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({ title, showBack = false, onBack }) => {
  const { driver, activeTask, toggleShiftStatus, signOut, navigateTo, navigateBack } = useDriver();
  const [isToggling, setIsToggling] = useState(false);
  const isOnline = driver.shiftStatus === 'ONLINE';
  const handleToggle = async () => { if (isToggling) return; setIsToggling(true); try { await toggleShiftStatus(); } finally { setIsToggling(false); } };
  const handleSignOut = () => Alert.alert(
    'تسجيل الخروج',
    activeTask ? 'لديك طلب نشط. سيبقى مسنداً إلى حسابك حتى تسجل الدخول مجدداً. هل تريد تسجيل الخروج؟' : 'هل تريد تسجيل الخروج من حساب الموصل؟',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => { void signOut(); } },
    ],
  );

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {showBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack || navigateBack}>
            <Text style={styles.backIcon}>➔</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🛵</Text>
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>BS Store</Text>
              <Text style={styles.brandSubtitle}>تطبيق الكابتن</Text>
            </View>
          </View>
        )}

        {title && (
          <View style={styles.titleCenter}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="تسجيل الخروج">
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
          {/* Shift Status Pill Button */}
          <TouchableOpacity
            style={[styles.statusPill, isOnline ? styles.pillOnline : styles.pillOffline]}
            onPress={handleToggle}
            disabled={isToggling}
            activeOpacity={0.8}
          >
            {isToggling ? <ActivityIndicator size="small" color={isOnline ? colors.primary : colors.onSurfaceVariant} /> : <><View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} /><Text style={[styles.statusText, isOnline ? styles.textOnline : styles.textOffline]}>{isOnline ? 'متصل' : 'غير متصل'}</Text></>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigateTo('wallet')}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '30',
    ...shadows.header,
    zIndex: 50,
  },
  inner: {
    height: 56,
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFixedDim + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 18,
  },
  brandTextWrap: {
    alignItems: 'flex-end',
  },
  brandTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  titleCenter: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
  },
  logoutBtn: {
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: colors.error, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xs },
  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  pillOnline: {
    backgroundColor: colors.primaryFixedDim + '30',
  },
  pillOffline: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: colors.primary,
  },
  dotOffline: {
    backgroundColor: colors.outline,
  },
  statusText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  textOnline: {
    color: colors.primary,
  },
  textOffline: {
    color: colors.outline,
  },
  notifBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifIcon: {
    fontSize: 15,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryContainer,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 16,
    color: colors.onSurface,
  },
});
