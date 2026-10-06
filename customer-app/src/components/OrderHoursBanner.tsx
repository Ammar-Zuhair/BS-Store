import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { borderRadius, spacing, typography } from '../theme';
import { formatTime, isOpenNow } from '../utils/openingHours';

export const OrderHoursBanner: React.FC = () => {
  const { orderHours, businessNow, colors } = useApp();
  const isOpen = orderHours ? !orderHours.isEnabled || isOpenNow(orderHours, businessNow) === true : null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
      <Text style={[styles.title, { color: colors.onSurface }]}>مواعيد استقبال الطلبات</Text>
      <Text style={[styles.status, { color: isOpen === null ? colors.onSurfaceVariant : isOpen ? colors.success : colors.error }]}>
        {isOpen === null ? 'تعذر تحميل المواعيد حالياً' : isOpen ? 'استقبال الطلبات مفتوح الآن' : 'استقبال الطلبات مغلق الآن'}
      </Text>
      {orderHours && <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
        {orderHours.isEnabled
          ? `يومياً: يبدأ ${formatTime(orderHours.openingTime)} • يقفل ${formatTime(orderHours.closingTime)}${(orderHours.openingTime || '') > (orderHours.closingTime || '') ? ' (اليوم التالي)' : ''}`
          : 'متاح على مدار 24 ساعة'}
      </Text>}
      <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>بتوقيت اليمن</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.screenGutter, marginTop: spacing.baseMd, padding: spacing.baseMd, borderRadius: borderRadius.xl, borderWidth: 1, gap: 5 },
  title: { fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md, textAlign: 'right' },
  status: { fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm, textAlign: 'right' },
  description: { fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'right' },
});
