import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { authApi, governorateApi } from '../api';
import { ThemeColors, typography } from '../theme';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';
import { TermsModal } from '../components/TermsModal';
import { normalizeYemenPhone, otpDigits } from '../utils/otp';

export const AuthScreen: React.FC = () => {
  const { verifyOtp, completeProfile, needsProfileCompletion, user, logout, colors } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [sentPhone, setSentPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [name, setName] = useState(user?.name === 'عميل' ? '' : user?.name || '');
  const [governorates, setGovernorates] = useState<{ id: string; name: string }[]>([]);
  const [governorateId, setGovernorateId] = useState('');
  const [picker, setPicker] = useState(false);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [terms, setTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const otpInput = useRef<TextInput>(null);

  useEffect(() => {
    if (needsProfileCompletion) governorateApi.list().then(setGovernorates).catch(() => setError('تعذر تحميل المحافظات. أعد المحاولة.'));
  }, [needsProfileCompletion]);
  useEffect(() => {
    const update = () => setRetrySeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'otp' && !needsProfileCompletion) {
        if (!inFlight.current) { setStep('phone'); setOtp(''); setError(''); }
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [step, needsProfileCompletion]);

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError('');
    try { await action(); }
    catch (e: any) {
      setError(e?.message || 'تعذر الاتصال. تحقق من الإنترنت وحاول مجدداً.');
      if (e?.status === 429) setResendAt(Date.now() + (e.retryAfterSeconds || 60) * 1000);
    } finally { inFlight.current = false; setBusy(false); }
  };
  const send = () => {
    const normalized = normalizeYemenPhone(step === 'otp' ? sentPhone : phone);
    if (!normalized) { setError('أدخل رقم هاتف جوال يمني صحيحاً.'); return; }
    void run(async () => {
      const result = await authApi.requestOtp(normalized);
      setSentPhone(result.phone); setOtp(''); setStep('otp');
      setResendAt(Date.now() + result.resendAfter * 1000);
      setTimeout(() => otpInput.current?.focus(), 100);
    });
  };
  const verify = () => {
    if (!/^[0-9]{6}$/.test(otp)) { setError('أدخل رمز التحقق المكوّن من 6 أرقام.'); return; }
    void run(async () => { await verifyOtp(sentPhone, otp); setOtp(''); });
  };
  const save = () => {
    if (name.trim().length < 2 || !governorateId || !city.trim() || !district.trim() || !street.trim() || !location || !accepted) {
      setError('أكمل الاسم والمحافظة والعنوان، وحدد موقع التوصيل ووافق على الشروط.'); return;
    }
    void run(() => completeProfile(name.trim(), {
      label: 'المنزل', city: city.trim(), district: district.trim(), street: street.trim(),
      latitude: location.latitude, longitude: location.longitude, governorateId, isDefault: true,
    }));
  };
  const action = (label: string, onPress: () => void, secondary = false, disabled = false) => (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled} onPress={onPress} activeOpacity={0.75}
      style={[styles.button, secondary ? styles.secondary : styles.primary, (busy || disabled) && styles.disabled]}>
      {busy && !secondary ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.buttonText, { color: secondary ? colors.primary : colors.onPrimary }]}>{label}</Text>}
    </TouchableOpacity>
  );
  const field = (label: string, value: string, setter: (v: string) => void, maxLength = 100) => (
    <View style={styles.group}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value}
      onChangeText={setter} editable={!busy} maxLength={maxLength} style={styles.input} placeholder={label} placeholderTextColor={colors.onSurfaceVariant} /></View>
  );
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityLabel="متجر بي اس" />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{needsProfileCompletion ? 'أكمل بيانات حسابك' : step === 'phone' ? 'مرحباً بك' : 'التحقق من رقم الهاتف'}</Text>
          {needsProfileCompletion ? <>
            <Text style={styles.description}>تم التحقق من رقمك. أكمل بيانات التوصيل للبدء بالتسوق.</Text>
            {field('الاسم الكامل', name, setName, 150)}
            <Text style={styles.label}>محافظة السكن</Text>
            {action(governorates.find(g => g.id === governorateId)?.name || 'اختر المحافظة', () => {
              if (!governorates.length) void governorateApi.list().then(setGovernorates).catch(() => setError('تعذر تحميل المحافظات.'));
              setPicker(true);
            }, true)}
            {field('المدينة', city, setCity)}{field('الحي / المنطقة', district, setDistrict)}{field('الشارع وتفاصيل العنوان', street, setStreet, 200)}
            {action(location ? 'تم تحديد الموقع — تعديل' : 'تحديد موقع التوصيل على الخريطة', () => setShowMap(true), true)}
            <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="أوافق على الشروط والأحكام وسياسة الخصوصية" accessibilityState={{ checked: accepted }}
              onPress={() => setAccepted(v => !v)} disabled={busy} style={styles.checkRow}>
              <Text style={styles.description}>{accepted ? '☑' : '□'} أوافق على الشروط والأحكام وسياسة الخصوصية</Text>
            </TouchableOpacity>
            {action('قراءة الشروط وسياسة الخصوصية', () => setTerms(true), true)}
          </> : step === 'phone' ? <>
            <Text style={styles.description}>أدخل رقم هاتفك للمتابعة. سنرسل إليك رمز تحقق عبر واتساب لتأكيد رقمك.</Text>
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput accessibilityLabel="رقم الهاتف" style={[styles.input, styles.ltr]} keyboardType="phone-pad" textContentType="telephoneNumber"
              autoComplete="tel" maxLength={32} value={phone} onChangeText={setPhone} editable={!busy} placeholder="771234567" placeholderTextColor={colors.onSurfaceVariant}
              onSubmitEditing={send} returnKeyType="go" />
            <Text style={styles.hint}>اليمن +967 · يمكنك إدخال الرقم المحلي أو الدولي</Text>
          </> : <>
            <Text style={styles.description}>أدخل رمز التحقق المكوّن من 6 أرقام المرسل عبر واتساب إلى:</Text>
            <Text style={[styles.phone, styles.ltr]}>{sentPhone}</Text>
            <Text style={styles.label}>رمز التحقق</Text>
            <TextInput ref={otpInput} accessibilityLabel="رمز التحقق المكون من ستة أرقام" style={[styles.input, styles.otp]} keyboardType="number-pad"
              textContentType="oneTimeCode" autoComplete="one-time-code" importantForAutofill="yes" autoCorrect={false} maxLength={6}
              value={otp} onChangeText={v => setOtp(otpDigits(v).replace(/[^0-9]/g, '').slice(0, 6))} editable={!busy} onSubmitEditing={verify} />
            <Text style={styles.hint}>الرمز صالح لمدة 5 دقائق. لم يصلك؟ انتظر انتهاء المهلة ثم أعد الإرسال.</Text>
          </>}
          {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          {action(needsProfileCompletion ? 'حفظ البيانات والبدء بالتسوق' : step === 'phone' ? (retrySeconds ? `متابعة بعد ${retrySeconds} ثانية` : 'متابعة') : 'تأكيد الرمز', needsProfileCompletion ? save : step === 'phone' ? send : verify, false, !needsProfileCompletion && step === 'phone' && retrySeconds > 0)}
          {!needsProfileCompletion && step === 'otp' && <>
            {action(retrySeconds ? `إعادة إرسال الرمز بعد ${retrySeconds} ثانية` : 'إعادة إرسال الرمز', send, true, retrySeconds > 0)}
            {action('تعديل رقم الهاتف', () => { setStep('phone'); setOtp(''); setError(''); }, true)}
          </>}
          {needsProfileCompletion && action('تسجيل الخروج', () => { void run(logout); }, true)}
        </View>
      </KeyboardAwareScrollView>
      <LocationPickerModal visible={showMap} onClose={() => setShowMap(false)} onConfirm={result => {
        setLocation(result); setCity(result.city || city); setDistrict(result.district || district); setStreet(result.street || street); setShowMap(false);
      }} />
      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>اختر المحافظة</Text><ScrollView>
          {governorates.map(g => <TouchableOpacity key={g.id} accessibilityRole="button" style={styles.button} onPress={() => { setGovernorateId(g.id); setCity(g.name); setPicker(false); }}><Text style={styles.label}>{g.name}</Text></TouchableOpacity>)}
        </ScrollView>{action('إغلاق', () => setPicker(false), true)}</View></View>
      </Modal>
      <TermsModal visible={terms} onClose={() => setTerms(false)} onAccept={() => { setAccepted(true); setTerms(false); }} />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 104, height: 104, alignSelf: 'center', marginBottom: 24, borderRadius: 24 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, borderRadius: 24, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 24, lineHeight: 36, textAlign: 'right', color: colors.onSurface, marginBottom: 12 },
  description: { fontFamily: typography.fontFamily.regular, fontSize: 16, lineHeight: 26, textAlign: 'right', color: colors.onSurfaceVariant, marginBottom: 16 },
  group: { marginTop: 12 },
  label: { fontFamily: typography.fontFamily.bold, fontSize: 16, textAlign: 'right', color: colors.onSurface, marginBottom: 8 },
  input: { minHeight: 56, borderWidth: 1, borderColor: colors.outline, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: typography.fontFamily.medium, fontSize: 18, color: colors.onSurface, backgroundColor: colors.surfaceContainerLow, textAlign: 'right' },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  otp: { textAlign: 'center', writingDirection: 'ltr', letterSpacing: 10, fontSize: 28 },
  phone: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.onSurface, marginBottom: 20, textAlign: 'center' },
  hint: { fontSize: 14, fontFamily: typography.fontFamily.regular, color: colors.onSurfaceVariant, textAlign: 'right', lineHeight: 24, marginVertical: 12 },
  button: { minHeight: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 12, padding: 12, marginTop: 12 },
  primary: { backgroundColor: colors.primary },
  secondary: { borderWidth: 1, borderColor: colors.outlineVariant },
  buttonText: { fontSize: 16, textAlign: 'center', fontFamily: typography.fontFamily.bold },
  disabled: { opacity: 0.55 },
  error: { color: colors.error, fontSize: 15, lineHeight: 24, textAlign: 'right', fontFamily: typography.fontFamily.medium, marginTop: 16 },
  checkRow: { minHeight: 48, justifyContent: 'center', marginTop: 16 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { backgroundColor: colors.surfaceContainerLowest, padding: 24, maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
