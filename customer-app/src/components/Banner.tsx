import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

export const Banner: React.FC = () => {
  const { applyPromoCode } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    applyPromoCode('BS_2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>⚡ عرض ترويجي حصري</Text>
          </View>
          <View style={styles.iconCircle}>
            <Text style={styles.truckIcon}>🚚</Text>
          </View>
        </View>

        <Text style={styles.headline}>
          توصيل مجاني لطلباتك الأولى من عدة متاجر في سلة واحدة!
        </Text>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
            <Text style={styles.copyBtnText}>{copied ? 'تم التطبيق!' : 'تطبيق الكود'}</Text>
          </TouchableOpacity>

          <View style={styles.codeWrap}>
            <Text style={styles.codeLabel}>الكود:</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>BS_2026</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  truckIcon: {
    fontSize: 18,
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
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  copyBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
});
