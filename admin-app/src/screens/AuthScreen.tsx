import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useAdmin } from '../context/AdminContext';

export const AuthScreen: React.FC = () => {
  const { authMode, setAuthMode, navigateTo, login, registerFirstAdmin } = useAdmin();

  // Login Form States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form States
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');

  const isLogin = authMode === 'login';

  const handleLogin = async () => {
    const trimmedPhone = loginPhone.trim();
    const trimmedPass = loginPassword.trim();

    if (!trimmedPhone) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف المحمول');
      return;
    }
    if (!trimmedPass) {
      Alert.alert('تنبيه', 'يرجى إدخال كلمة المرور');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedPhone, trimmedPass);
      navigateTo('dashboard');
    } catch (err: any) {
      Alert.alert(
        'فشل تسجيل الدخول',
        err.message || 'بيانات الدخول غير صحيحة، يرجى التأكد من رقم الهاتف وكلمة المرور المسجلة في النظام.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const name = registerName.trim();
    const phone = registerPhone.trim();
    if (name.length < 2) {
      Alert.alert('تنبيه', 'يرجى إدخال الاسم الكامل');
      return;
    }
    if (phone.length < 7) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم هاتف صحيح');
      return;
    }
    if (registerPassword.length < 8) {
      Alert.alert('تنبيه', 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      Alert.alert('تنبيه', 'كلمتا المرور غير متطابقتين');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerFirstAdmin(name, phone, registerPassword);
      navigateTo('dashboard');
    } catch (err: any) {
      Alert.alert('تعذر إنشاء الحساب', err.message || 'لم نتمكن من إنشاء حساب المدير.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Simple Brand Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.screenMainTitle}>
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </Text>
        </View>

        {/* Method Toggle Tabs */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
            onPress={() => setAuthMode('login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
              تسجيل الدخول
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
            onPress={() => setAuthMode('register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
              إنشاء حساب جديد
            </Text>
          </TouchableOpacity>
        </View>

        {isLogin ? (
          /* LOGIN FORM */
          <View style={styles.formCard}>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم الهاتف</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="770000000"
                  placeholderTextColor={colors.outline}
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                  keyboardType="phone-pad"
                  textAlign="left"
                />
                <View style={styles.countryPill}>
                  <Text style={styles.countryFlag}>🇾🇪</Text>
                  <Text style={styles.countryCode}>+967</Text>
                </View>
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>كلمة المرور</Text>
                <TouchableOpacity onPress={() => Alert.alert('استعادة كلمة المرور', 'سيتم إرسال رابط إعادة تعيين كلمة المرور إلى هاتفك.')}>
                  <Text style={styles.forgotLink}>نسيت كلمة المرور؟</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.outline}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPassword}
                  textAlign="right"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowLoginPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showLoginPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login CTA */}
            <TouchableOpacity
              style={[styles.mainCtaBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.mainCtaText}>تسجيل الدخول</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Register */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchPromptText}>ليس لديك حساب؟</Text>
              <TouchableOpacity onPress={() => setAuthMode('register')}>
                <Text style={styles.switchActionLink}>إنشاء حساب جديد</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.dbNoticeText}>
              لإنشاء المدير الأول أدخل الاسم الكامل ورقم الهاتف وكلمة المرور وتأكيدها. لا يلزم اختيار محافظة لهذا الحساب. يُغلق التسجيل تلقائياً بعد نجاحه.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>الاسم الكامل *</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.textInput} placeholder="اسم المدير" placeholderTextColor={colors.outline}
                  value={registerName} onChangeText={setRegisterName} textAlign="right" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم الهاتف *</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.textInput} placeholder="770000000" placeholderTextColor={colors.outline}
                  value={registerPhone} onChangeText={setRegisterPhone} keyboardType="phone-pad" textAlign="left" />
                <View style={styles.countryPill}><Text style={styles.countryFlag}>🇾🇪</Text><Text style={styles.countryCode}>+967</Text></View>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور * (8 أحرف على الأقل)</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.textInput} placeholder="••••••••" placeholderTextColor={colors.outline}
                  value={registerPassword} onChangeText={setRegisterPassword} secureTextEntry textAlign="right" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>تأكيد كلمة المرور *</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.textInput} placeholder="••••••••" placeholderTextColor={colors.outline}
                  value={registerPasswordConfirm} onChangeText={setRegisterPasswordConfirm} secureTextEntry textAlign="right" />
              </View>
            </View>
            <TouchableOpacity style={[styles.mainCtaBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleRegister} disabled={isSubmitting} activeOpacity={0.85}>
              {isSubmitting ? <ActivityIndicator color={colors.onPrimary} size="small" /> :
                <Text style={styles.mainCtaText}>إنشاء حساب المدير الأول</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: spacing.baseSm, alignItems: 'center' }} onPress={() => setAuthMode('login')}>
              <Text style={styles.switchActionLink}>العودة لتسجيل الدخول</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 48,
    paddingBottom: 40,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: spacing.baseLg,
  },
  screenMainTitle: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: typography.fontSize.xxl,
    color: colors.primary,
    textAlign: 'center',
  },
  tabToggle: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.baseMd,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.card,
  },
  toggleText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  toggleTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  inputGroup: {
    marginBottom: spacing.baseSm,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  forgotLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.secondary,
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    height: '100%',
  },
  countryPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  countryFlag: {
    fontSize: 14,
  },
  countryCode: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSurface,
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  cityPillsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityPill: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  cityPillActive: {
    backgroundColor: colors.primary,
  },
  cityPillText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurface,
  },
  cityPillTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
  },
  rememberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: spacing.baseMd,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  mainCtaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  mainCtaText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onPrimary,
  },
  biometricBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: borderRadius.lg,
    paddingVertical: 11,
    marginTop: spacing.baseSm,
    borderWidth: 1,
  },
  biometricBtnReady: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary + '40',
  },
  biometricBtnMuted: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant + '40',
  },
  biometricBtnIcon: {
    fontSize: 18,
  },
  biometricBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
  },
  biometricBtnTextReady: {
    color: colors.primary,
  },
  biometricBtnTextMuted: {
    color: colors.onSurfaceVariant,
  },
  switchAuthRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.baseMd,
  },
  switchPromptText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  switchActionLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
  },
  dbNoticeBox: {
    backgroundColor: colors.primary + '0d',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: spacing.baseMd,
  },
  dbNoticeTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 4,
  },
  dbNoticeText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    lineHeight: 16,
  },
});
