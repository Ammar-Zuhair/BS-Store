import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useAdmin } from '../context/AdminContext';

interface AdminHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, showBack = false, onBack }) => {
  const { navigateTo, currentUser, logout } = useAdmin();

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Right side: back button or brand */}
        {showBack ? (
          <View style={styles.titleGroup}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack || (() => navigateTo('dashboard'))}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>➔</Text>
            </TouchableOpacity>
            {title && (
              <View style={styles.titleWrap}>
                <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>⚡</Text>
            </View>
            <View style={styles.brandTextWrap}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>BS Store</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>مدير العمليات</Text>
                </View>
              </View>
              <Text style={styles.brandSubtitle}>لوحة تحكم الإدارة</Text>
            </View>
          </View>
        )}

        {/* Left side: logout or login */}
        <View style={styles.actions}>
          {currentUser ? (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
              accessibilityLabel="تسجيل الخروج"
            >
              <Text style={styles.logoutText}>خروج</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigateTo('auth')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>دخول</Text>
            </TouchableOpacity>
          )}
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
    height: 52,
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
    flex: 1,
  },
  titleWrap: {
    alignItems: 'flex-end',
    flex: 1,
  },
  titleText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    textAlign: 'right',
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
  brandTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: typography.fontSize.lg,
    color: colors.primary,
  },
  roleBadge: {
    backgroundColor: colors.primaryContainer + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
  },
  liveBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifIcon: {
    fontSize: 16,
  },
  badgeCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.full,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onSecondary,
    fontSize: 8,
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  logoutIcon: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '700',
  },
  logoutText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 13,
    color: colors.error,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.lg,
  },
  loginBtnText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 13,
    color: colors.onPrimary,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: colors.onSurface,
  },
});
