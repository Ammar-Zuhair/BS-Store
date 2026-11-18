import { useResponsiveLayout } from '../layout/ResponsiveLayout';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { ThemeColors, typography } from '../theme';

type SearchType = 'store' | 'product';
export function SearchTypeChooser({ value, onChange, colors: c }: {
  value: SearchType | null; onChange: (type: SearchType) => void; colors: ThemeColors;
}) {
  const { compact } = useResponsiveLayout();
  return <View style={[s.wrapper, compact && value ? { paddingVertical: 4 } : null]}>
    {!value && <View style={s.guide}>
      <View style={[s.step, { backgroundColor: c.primary }]}><Text style={[s.stepNumber, { color: c.onPrimary }]}>١</Text></View>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={[s.title, { color: c.onSurface }]}>ابدأ باختيار نوع البحث</Text>
        <Text style={[s.copy, { color: c.onSurfaceVariant }]}>اضغط على «متاجر» أو «منتجات وعروض» أدناه لإظهار حقل البحث.</Text>
      </View>
    </View>}
    <View style={s.choices}>
      {(['store', 'product'] as const).map(type => {
        const selected = value === type;
        const foreground = selected ? c.onPrimary : c.onSurface;
        return <Pressable key={type} accessibilityRole="tab" accessibilityLabel={type === 'store' ? 'متاجر' : 'منتجات وعروض'}
          accessibilityState={{ selected }} accessibilityHint={type === 'store' ? 'اضغط لإظهار حقل البحث عن المتاجر' : 'اضغط لإظهار حقل البحث عن المنتجات والعروض'}
          onPress={() => onChange(type)} style={({ pressed }) => [s.choice, !value && s.largeChoice, compact && value ? { minHeight: 48, padding: 6 } : null,
            { backgroundColor: selected ? c.primary : c.surfaceContainerLowest, borderColor: selected || !value ? c.primary : c.outlineVariant, opacity: pressed ? 0.8 : 1 }]}>
          <View style={[s.choiceTop, value ? s.compact : null]}>
            <AppIcon name={type === 'store' ? 'store' : 'shopping-bag'} size={value ? 22 : 32} color={selected ? c.onPrimary : c.primary} />
            <Text style={[s.label, { color: foreground }]}>{type === 'store' ? 'متاجر' : 'منتجات وعروض'}</Text>
            {selected && <AppIcon name="check-circle" size={18} color={c.onPrimary} />}
          </View>
          {!value && <>
            <Text style={[s.description, { color: c.onSurfaceVariant }]}>{type === 'store' ? 'اعثر على متجرك المفضل' : 'اكتشف صنفاً أو باقة أو عرضاً'}</Text>
            <View style={s.action}><Text style={[s.actionText, { color: c.primary }]}>اضغط للبحث</Text><AppIcon name="arrow-left" size={17} color={c.primary} /></View>
          </>}
        </Pressable>;
      })}
    </View>
  </View>;
}
const s = StyleSheet.create({
  wrapper: { padding: 16, gap: 20, width: '100%', maxWidth: 800, alignSelf: 'center' },
  guide: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, paddingTop: 8 },
  step: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontFamily: typography.fontFamily.bold, fontSize: 18 },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 21, textAlign: 'right', writingDirection: 'rtl' },
  copy: { fontFamily: typography.fontFamily.regular, fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl', marginTop: 8 },
  choices: { flexDirection: 'row-reverse', gap: 12 },
  choice: { flex: 1, minWidth: 0, minHeight: 64, padding: 12, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 12 },
  largeChoice: { minHeight: 184, paddingVertical: 20 },
  choiceTop: { alignItems: 'center', gap: 12 },
  compact: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  label: { fontFamily: typography.fontFamily.bold, fontSize: 16, textAlign: 'center' },
  description: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 22, textAlign: 'center', writingDirection: 'rtl' },
  action: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  actionText: { fontFamily: typography.fontFamily.bold, fontSize: 14 },
});
