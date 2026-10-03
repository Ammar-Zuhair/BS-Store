import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { AppIcon } from './AppIcon';

export const Banner: React.FC = () => {
  const { navigateTo, colors } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const handleCopy = () => navigateTo('cart');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.badgeWrap}>
            <AppIcon name="sparkles" size={14} color={colors.onPrimary} />
            <Text style={styles.badgeText}>عرض ترويجي حصري</Text>
          </View>
          <View style={styles.iconCircle}>
            <AppIcon name="truck" size={21} color={colors.onPrimary} />
          </View>
        </View>

        <Text style={styles.headline}>
          لديك كود خصم؟ أدخله في سلة الشراء لتطبيقه على المنتجات أو رسوم التوصيل.
        </Text>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="إدخال كود الخصم في سلة الشراء"
          >
            <Text style={styles.copyBtnText}>أدخل كود الخصم</Text>
          </TouchableOpacity>

          <View style={styles.codeWrap}>
              <Text style={styles.codeLabel}>كوبونات متاحة:</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>خصم بكود</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenGutter,
    marginVertical: spacing.baseSm,
  },
  card: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseXs,
  },
  badgeWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.baseXs,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
    textAlign: 'right',
    lineHeight: typography.lineHeight.lg,
    marginVertical: spacing.baseXs,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.baseSm,
  },
  codeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary + 'CC',
  },
  codeBadge: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  codeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  copyBtn: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.baseSm,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  copyBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondaryContainer,
  },
});
