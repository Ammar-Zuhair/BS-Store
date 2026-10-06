import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { DealTimePickerModal } from './DealDateTimePickers';
import { borderRadius, colors } from '../theme';

interface Props {
  openingTime: string;
  closingTime: string;
  is24Hours: boolean;
  onOpeningTimeChange: (time: string) => void;
  onClosingTimeChange: (time: string) => void;
  on24HoursChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function validOpeningHours(opening: string, closing: string): boolean {
  const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  return pattern.test(opening) && pattern.test(closing) && opening !== closing;
}

export const OpeningHoursFields: React.FC<Props> = (props) => {
  const [picker, setPicker] = useState<'opening' | 'closing' | null>(null);
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>مواعيد يومية بتوقيت اليمن. اختر وقت الإقفال الأقل من وقت الفتح للدوام بعد منتصف الليل.</Text>
      <View style={styles.row}>
        <Text style={styles.label}>العمل على مدار 24 ساعة</Text>
        <Switch value={props.is24Hours} onValueChange={props.on24HoursChange} disabled={props.disabled} trackColor={{ true: colors.success }} />
      </View>
      {!props.is24Hours && <View style={styles.row}>
        {(['opening', 'closing'] as const).map(kind => <TouchableOpacity key={kind} style={styles.timeButton}
          disabled={props.disabled} onPress={() => setPicker(kind)} accessibilityRole="button"
          accessibilityLabel={kind === 'opening' ? 'اختيار وقت الفتح' : 'اختيار وقت الإقفال'}>
          <Text style={styles.label}>{kind === 'opening' ? 'وقت الفتح *' : 'وقت الإقفال *'}</Text>
          <Text style={styles.time}>{(kind === 'opening' ? props.openingTime : props.closingTime) || 'اختر الوقت'}</Text>
        </TouchableOpacity>)}
      </View>}
      <DealTimePickerModal visible={picker !== null} title={picker === 'closing' ? 'اختر وقت الإقفال' : 'اختر وقت الفتح'}
        value={(picker === 'closing' ? props.closingTime : props.openingTime) || (picker === 'closing' ? '23:00' : '09:00')}
        onSelect={time => picker === 'closing' ? props.onClosingTimeChange(time) : props.onOpeningTimeChange(time)}
        onClose={() => setPicker(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 14 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hint: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'right', lineHeight: 20 },
  label: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: colors.onSurface, textAlign: 'right' },
  timeButton: { flex: 1, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceContainerLow, padding: 12, gap: 6 },
  time: { fontFamily: 'Tajawal_700Bold', fontSize: 16, color: colors.primary, textAlign: 'right' },
});
