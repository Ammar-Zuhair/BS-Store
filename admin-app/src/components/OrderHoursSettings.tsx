import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { adminApi } from '../api';
import { OpeningHoursFields, validOpeningHours } from './OpeningHoursFields';
import { borderRadius, colors, spacing } from '../theme';

export const OrderHoursSettings: React.FC = () => {
  const [opening, setOpening] = useState('09:00');
  const [closing, setClosing] = useState('23:00');
  const [is24Hours, set24Hours] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const settings = await adminApi.getOrderHours();
      setOpening(settings.openingTime); setClosing(settings.closingTime); set24Hours(!settings.isEnabled);
      setLoaded(true);
    } catch (error: any) { Alert.alert('تعذر تحميل المواعيد', error?.message || 'حاول مرة أخرى.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!is24Hours && !validOpeningHours(opening, closing)) {
      Alert.alert('مواعيد غير صالحة', 'اختر وقتي فتح وإقفال مختلفين أو فعّل استقبال الطلبات 24 ساعة.'); return;
    }
    setSaving(true);
    try {
      const settings = await adminApi.updateOrderHours({ isEnabled: !is24Hours, openingTime: opening, closingTime: closing });
      setOpening(settings.openingTime); setClosing(settings.closingTime); set24Hours(!settings.isEnabled);
      Alert.alert('تم الحفظ', 'حُدثت مواعيد استقبال الطلبات وستظهر فوق العروض في تطبيق العميل.');
    } catch (error: any) { Alert.alert('تعذر الحفظ', error?.message || 'حاول مرة أخرى.'); }
    finally { setSaving(false); }
  };
  return <View style={styles.card}>
    <Text style={styles.title}>مواعيد استقبال الطلبات</Text>
    <Text style={styles.hint}>تظهر أعلى رئيسية العميل. يتوقف إرسال الطلبات الجديدة خارج هذه المواعيد، وتستمر متابعة الطلبات السابقة.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : loaded ? <>
      <OpeningHoursFields openingTime={opening} closingTime={closing} is24Hours={is24Hours}
        onOpeningTimeChange={setOpening} onClosingTimeChange={setClosing} on24HoursChange={set24Hours} disabled={saving} />
      <TouchableOpacity style={styles.button} disabled={saving} onPress={() => void save()} accessibilityRole="button">
        <Text style={styles.buttonText}>{saving ? 'جارٍ الحفظ…' : 'حفظ مواعيد الطلبات'}</Text>
      </TouchableOpacity>
    </> : <TouchableOpacity style={styles.button} onPress={() => void load()}><Text style={styles.buttonText}>إعادة تحميل المواعيد</Text></TouchableOpacity>}
  </View>;
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, borderWidth: 1, borderColor: colors.outlineVariant, gap: 10 },
  title: { fontFamily: 'Tajawal_700Bold', fontSize: 17, color: colors.onSurface, textAlign: 'right' },
  hint: { fontFamily: 'Tajawal_400Regular', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'right', lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: 12, alignItems: 'center' },
  buttonText: { fontFamily: 'Tajawal_700Bold', fontSize: 14, color: colors.onPrimary },
});
