import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDriver } from '../context/DriverContext';
import { colors, spacing, borderRadius, typography } from '../theme';

export const CourierAuthScreen: React.FC = () => {
  const { signIn, signUp } = useDriver();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!phone.trim() || password.length < 8 || (mode === 'register' && !name.trim())) {
      Alert.alert('تحقق من البيانات', 'أدخل الاسم ورقم الهاتف وكلمة مرور من 8 أحرف على الأقل.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp(name.trim(), phone.trim(), password);
        Alert.alert('تم إرسال الطلب', 'سيراجع مدير النظام طلب انضمامك. يمكنك تسجيل الدخول بعد الموافقة.');
        setMode('login');
      } else {
        await signIn(phone.trim(), password);
      }
    } catch (error: any) {
      Alert.alert(mode === 'login' ? 'تعذر تسجيل الدخول' : 'تعذر إنشاء الحساب', error?.message || 'حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return <View style={styles.container}>
    <Text style={styles.title}>تطبيق الموصل</Text>
    <Text style={styles.subtitle}>{mode === 'login' ? 'سجّل الدخول لاستقبال الطلبات' : 'أرسل طلب انضمامك للمراجعة'}</Text>
    {mode === 'register' && <TextInput style={styles.input} placeholder="الاسم الكامل" value={name} onChangeText={setName} textAlign="right" />}
    <TextInput style={styles.input} placeholder="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textAlign="right" />
    <TextInput style={styles.input} placeholder="كلمة المرور (8 أحرف على الأقل)" value={password} onChangeText={setPassword} secureTextEntry textAlign="right" />
    <TouchableOpacity style={styles.submit} onPress={submit} disabled={busy}>
      {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب وإرسال الطلب'}</Text>}
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} disabled={busy}>
      <Text style={styles.switch}>{mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب معتمد؟ سجل الدخول'}</Text>
    </TouchableOpacity>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.screenGutter, backgroundColor: colors.background, gap: spacing.baseSm },
  title: { textAlign: 'center', fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: colors.primary },
  subtitle: { textAlign: 'center', color: colors.onSurfaceVariant, marginBottom: spacing.baseMd },
  input: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.baseMd, paddingVertical: spacing.baseSm, color: colors.onSurface },
  submit: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.baseMd, alignItems: 'center', marginTop: spacing.baseSm },
  submitText: { color: colors.onPrimary, fontWeight: typography.fontWeight.bold },
  switch: { textAlign: 'center', color: colors.primary, padding: spacing.baseSm },
});
