import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, ScrollView } from 'react-native';
import { useDriver } from '../context/DriverContext';
import { colors, spacing, borderRadius, typography } from '../theme';

export const CourierAuthScreen: React.FC = () => {
  const { signIn, signUp } = useDriver();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [governorates, setGovernorates] = useState<{id:string;name:string}[]>([]);
  const [governorateId, setGovernorateId] = useState('');
  const [showGovernorates, setShowGovernorates] = useState(false);
  React.useEffect(() => { void import('../api').then(({driverApi}) => driverApi.governorates().then(setGovernorates).catch(() => {})); }, []);

  const submit = async () => {
    if (!phone.trim() || password.length < 8 || (mode === 'register' && (!name.trim() || !governorateId))) {
      Alert.alert('تحقق من البيانات', 'أدخل الاسم ورقم الهاتف وكلمة مرور من 8 أحرف على الأقل.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp(name.trim(), phone.trim(), password, governorateId);
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

  return <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.container}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
  >
    <Text style={styles.title}>تطبيق الموصل</Text>
    <Text style={styles.subtitle}>{mode === 'login' ? 'سجّل الدخول لاستقبال الطلبات' : 'أرسل طلب انضمامك للمراجعة'}</Text>
    {mode === 'register' && <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>الاسم الكامل</Text>
      <Text style={styles.fieldHint}>اكتب اسمك الحقيقي كما تريد أن يظهر للإدارة والعميل.</Text>
      <TextInput style={styles.input} placeholder="مثال: عمار زهير" value={name} onChangeText={setName} textAlign="right" />
    </View>}
    {mode === 'register' && <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>محافظة العمل</Text>
      <Text style={styles.fieldHint}>اختر المحافظة التي ستستقبل منها طلبات التوصيل.</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowGovernorates(true)}><Text style={{textAlign:'right'}}>{governorates.find(g=>g.id===governorateId)?.name || 'اختر المحافظة *'}</Text></TouchableOpacity>
    </View>}
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>رقم الهاتف</Text>
      <Text style={styles.fieldHint}>{mode === 'register' ? 'أدخل رقم جوالك الصحيح للتواصل معك، مثل 775479340.' : 'استخدم الرقم المسجل في حساب الموصل المعتمد.'}</Text>
      <TextInput style={styles.input} placeholder="775479340" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textAlign="right" />
    </View>
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>كلمة المرور</Text>
      <Text style={styles.fieldHint}>{mode === 'register' ? 'أنشئ كلمة مرور من 8 أحرف على الأقل؛ ستستخدمها عند تسجيل الدخول بعد اعتماد الحساب.' : 'أدخل كلمة مرور حساب الموصل.'}</Text>
      <TextInput style={styles.input} placeholder="8 أحرف على الأقل" value={password} onChangeText={setPassword} secureTextEntry textAlign="right" />
    </View>
    <TouchableOpacity style={styles.submit} onPress={submit} disabled={busy}>
      {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب وإرسال الطلب'}</Text>}
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} disabled={busy}>
      <Text style={styles.switch}>{mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب معتمد؟ سجل الدخول'}</Text>
    </TouchableOpacity>
    <Modal visible={showGovernorates} transparent animationType="slide" onRequestClose={() => setShowGovernorates(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'}}><View style={{maxHeight:'70%',backgroundColor:'#fff',padding:18,borderTopLeftRadius:20,borderTopRightRadius:20}}><ScrollView>{governorates.map(g=><TouchableOpacity key={g.id} style={{padding:14}} onPress={()=>{setGovernorateId(g.id);setShowGovernorates(false);}}><Text style={{textAlign:'right'}}>{g.name}</Text></TouchableOpacity>)}</ScrollView></View></View></Modal>
  </ScrollView>;
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.screenGutter, backgroundColor: colors.background, gap: spacing.baseSm },
  fieldGroup: { gap: 4 },
  fieldLabel: { textAlign: 'right', color: colors.onSurface, fontWeight: typography.fontWeight.bold, marginTop: 4 },
  fieldHint: { textAlign: 'right', color: colors.onSurfaceVariant, fontSize: typography.fontSize.xs, lineHeight: 18 },
  title: { textAlign: 'center', fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: colors.primary },
  subtitle: { textAlign: 'center', color: colors.onSurfaceVariant, marginBottom: spacing.baseMd },
  input: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.baseMd, paddingVertical: spacing.baseSm, color: colors.onSurface },
  submit: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.baseMd, alignItems: 'center', marginTop: spacing.baseSm },
  submitText: { color: colors.onPrimary, fontWeight: typography.fontWeight.bold },
  switch: { textAlign: 'center', color: colors.primary, padding: spacing.baseSm },
});
