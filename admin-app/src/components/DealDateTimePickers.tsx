import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');
const dateFromValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return value && year && month && day ? new Date(year, month - 1, day) : new Date();
};

export const DealDatePickerModal: React.FC<{
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}> = ({ visible, value, onSelect, onClose }) => {
  const [month, setMonth] = useState(() => {
    const d = dateFromValue(value);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  useEffect(() => {
    if (visible) {
      const d = dateFromValue(value);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [visible, value]);
  const cells = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: lastDate }, (_, i) => i + 1)];
  }, [month]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthLabel = month.toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' });
  const weekdays = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>اختر تاريخ انتهاء العرض</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
            <Text style={styles.monthText}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={styles.arrow}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
          </View>
          <View style={styles.calendarGrid}>
            {weekdays.map((d, i) => <Text key={`w${i}`} style={styles.weekday}>{d}</Text>)}
            {cells.map((day, index) => {
              if (!day) return <View key={`empty${index}`} style={styles.dayCell} />;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              date.setHours(0, 0, 0, 0);
              const disabled = date < today;
              const selected = value === `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(day)}`;
              return <TouchableOpacity key={day} disabled={disabled} onPress={() => {
                onSelect(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(day)}`);
                onClose();
              }} style={[styles.dayCell, selected && styles.selectedDay, disabled && styles.disabledDay]}>
                <Text style={[styles.dayText, selected && styles.selectedDayText, disabled && styles.disabledDayText]}>{day}</Text>
              </TouchableOpacity>;
            })}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>إغلاق</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const DealTimePickerModal: React.FC<{
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}> = ({ visible, value, onSelect, onClose }) => {
  const [hour, setHour] = useState(() => Number(value.split(':')[0]) || 21);
  const [minute, setMinute] = useState(() => Math.floor((Number(value.split(':')[1]) || 0) / 5) * 5);
  useEffect(() => {
    if (visible) {
      setHour(Number(value.split(':')[0]) || 21);
      setMinute(Math.floor((Number(value.split(':')[1]) || 0) / 5) * 5);
    }
  }, [visible, value]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>اختر وقت انتهاء العرض</Text>
          <Text style={styles.clockDisplay}>{pad(hour)}:{pad(minute)}</Text>
          <Text style={styles.sectionLabel}>الساعة</Text>
          <View style={styles.clockGrid}>
            {Array.from({ length: 24 }, (_, h) => <TouchableOpacity key={h} onPress={() => setHour(h)} style={[styles.clockOption, hour === h && styles.selectedDay]}>
              <Text style={[styles.dayText, hour === h && styles.selectedDayText]}>{pad(h)}</Text>
            </TouchableOpacity>)}
          </View>
          <Text style={styles.sectionLabel}>الدقيقة</Text>
          <View style={styles.clockGrid}>
            {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => <TouchableOpacity key={m} onPress={() => setMinute(m)} style={[styles.clockOption, minute === m && styles.selectedDay]}>
              <Text style={[styles.dayText, minute === m && styles.selectedDayText]}>{pad(m)}</Text>
            </TouchableOpacity>)}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>إلغاء</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.closeButton, styles.confirmButton]} onPress={() => { onSelect(`${pad(hour)}:${pad(minute)}`); onClose(); }}><Text style={styles.confirmText}>تأكيد الوقت</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'center', alignItems: 'center', padding: spacing.screenGutter },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd },
  title: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 18, textAlign: 'center', marginBottom: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthText: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  arrow: { width: 42, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.surfaceContainerHigh },
  arrowText: { color: colors.primary, fontSize: 28, lineHeight: 30 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  weekday: { width: '14.285%', textAlign: 'center', color: colors.outline, paddingVertical: 8, fontFamily: typography.fontFamily.medium },
  dayCell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  dayText: { color: colors.onSurface, fontFamily: typography.fontFamily.medium, fontSize: 14 },
  selectedDay: { backgroundColor: colors.primary },
  selectedDayText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold },
  disabledDay: { opacity: 0.35 },
  disabledDayText: { color: colors.outline },
  closeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.surfaceContainerHigh, marginTop: 16 },
  closeText: { color: colors.onSurface, fontFamily: typography.fontFamily.bold },
  clockDisplay: { color: colors.primary, textAlign: 'center', fontSize: 34, fontFamily: typography.fontFamily.bold, marginBottom: 8 },
  sectionLabel: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, textAlign: 'right', marginTop: 6, marginBottom: 6 },
  clockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  clockOption: { width: 43, height: 39, borderRadius: 10, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row-reverse', gap: 10 },
  confirmButton: { flex: 1, backgroundColor: colors.primary },
  confirmText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold },
});
