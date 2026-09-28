import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useApp } from '../context/AppContext';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';
import { Address } from '../types';

export const AuthScreen: React.FC = () => {
  const { login, register, navigateTo, registeredUser, setRegisteredUser } = useApp();

  // Mode: 'login' | 'register'
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login Form States (رقم الهاتف وكلمة المرور)
  const [loginPhone, setLoginPhone] = useState(registeredUser ? registeredUser.phone : '778123456');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States (الاسم، الرقم، الايميل، كلمة السر)
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Register Address & GPS Location States
  const [regCity, setRegCity] = useState('صنعاء');
  const [regDistrict, setRegDistrict] = useState('');
  const [regStreet, setRegStreet] = useState('');
  const [regBuilding, setRegBuilding] = useState('');
  const [regLat, setRegLat] = useState(15.34);
  const [regLng, setRegLng] = useState(44.20);
  const [isLocationPicked, setIsLocationPicked] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleLocationPicked = (loc: LocationResult) => {
    setRegLat(loc.latitude);
    setRegLng(loc.longitude);
    if (loc.city) setRegCity(loc.city);
    if (loc.district) setRegDistrict(loc.district);
    if (loc.street) setRegStreet(loc.street);
    setIsLocationPicked(true);
    setShowMapPicker(false);
  };

  // Handle Login via Phone & Password
  const handleLogin = async () => {
    const trimmedPhone = loginPhone.trim();
    const trimmedPass = loginPassword.trim();

    if (!trimmedPhone) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف المحمول');
      return;
    }
    if (trimmedPhone.length < 9) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم هاتف صحيح مكون من 9 أرقام');
      return;
    }
    if (!trimmedPass) {
      Alert.alert('تنبيه', 'يرجى إدخال كلمة المرور');
      return;
    }

    const userName = (registeredUser && registeredUser.phone === trimmedPhone)
      ? registeredUser.name
      : 'عبدالله السقاف';

    setIsLoading(true);
    try {
      await login(trimmedPhone, trimmedPass, userName);
    } catch {
      // error handled in login
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Biometric Login
  const handleBiometricLogin = async () => {
    if (!registeredUser) {
      Alert.alert(
        'البصمة غير مسجلة',
        'يرجى إنشاء حساب جديد أولاً لربط بصمة الجهاز ببياناتك.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'إنشاء حساب جديد', onPress: () => setIsRegister(true) },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      await login(registeredUser.phone, undefined, registeredUser.name);
    } catch {
      // error handled in login
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register via Name, Phone, Email, Password, & Full Address
  const handleRegister = async () => {
    const trimmedName = regName.trim();
    const trimmedPhone = regPhone.trim();
    const trimmedEmail = regEmail.trim();
    const trimmedPass = regPassword.trim();
    const trimmedConfirmPass = regConfirmPassword.trim();

    if (!trimmedName) {
      Alert.alert('تنبيه', 'يرجى إدخال الاسم الكامل');
      return;
    }
    if (!trimmedPhone) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف المحمول');
      return;
    }
    if (trimmedPhone.length < 9) {
      Alert.alert('تنبيه', 'يرجى التأكد من كتابة رقم هاتف صحيح');
      return;
    }
    if (!trimmedEmail) {
      Alert.alert('تنبيه', 'يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('تنبيه', 'يرجى إدخال عنوان بريد إلكتروني صالح');
      return;
    }
    if (!trimmedPass) {
      Alert.alert('تنبيه', 'يرجى إدخال كلمة المرور');
      return;
    }
    if (trimmedPass.length < 6) {
      Alert.alert('تنبيه', 'يجب ألا تقل كلمة المرور عن 6 خانات');
      return;
    }
    if (trimmedPass !== trimmedConfirmPass) {
      Alert.alert('خطأ', 'كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    // Address Validations
    if (!regCity.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المدينة (مثل: صنعاء)');
      return;
    }
    if (!regDistrict.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الحي / المنطقة');
      return;
    }
    if (!regStreet.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الشارع وتفاصيل العنوان');
      return;
    }
    if (!isLocationPicked) {
      Alert.alert(
        'تحديد الموقع على الخريطة',
        'يرجى تحديد موقع التوصيل على الخريطة (GPS) بدقة لتسريع وصول طلباتك مثل التطبيقات العالمية.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'فتح الخريطة 🗺️', onPress: () => setShowMapPicker(true) },
        ]
      );
      return;
    }

    if (!agreeTerms) {
      Alert.alert('تنبيه', 'يرجى الموافقة على شروط الاستخدام للمتابعة');
      return;
    }

    const newAddress: Omit<Address, 'id'> = {
      label: 'المنزل',
      city: regCity.trim(),
      district: regDistrict.trim(),
      street: regStreet.trim(),
      building: regBuilding.trim() || undefined,
      latitude: regLat,
      longitude: regLng,
      isDefault: true,
    };

    setRegisteredUser({
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
    });
    setLoginPhone(trimmedPhone);

    setIsLoading(true);
    try {
      await register(trimmedName, trimmedPhone, trimmedEmail, trimmedPass, newAddress);
    } catch {
      // error handled in register
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'استعادة كلمة المرور',
      'سيتم إرسال رسالة SMS برابط إعادة تعيين كلمة المرور إلى هاتفك المسجل.',
      [{ text: 'حسناً' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandSection}>
          <Text style={styles.brandTitle}>متجر بي اس</Text>
          <Text style={styles.brandSubtitle}>BS Store - تسوق متعدد المتاجر وتوصيل سريع</Text>
        </View>

        {/* Auth Toggle Tabs */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !isRegister && styles.toggleBtnActive]}
            onPress={() => setIsRegister(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, !isRegister && styles.toggleTextActive]}>
              تسجيل الدخول
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, isRegister && styles.toggleBtnActive]}
            onPress={() => setIsRegister(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, isRegister && styles.toggleTextActive]}>
              إنشاء حساب جديد
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Container */}
        <View style={styles.card}>
          {!isRegister ? (
            /* 1. LOGIN FORM */
            <View style={styles.formBody}>
              {/* Phone */}
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
                  <View style={styles.flagBadge}>
                    <Text style={styles.flagEmoji}>🇾🇪</Text>
                    <Text style={styles.countryCode}>+967</Text>
                  </View>
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>كلمة المرور</Text>
                  <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
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

              {/* Remember Me */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>تذكر بيانات الدخول</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
                )}
              </TouchableOpacity>

              {/* Biometric Quick Access */}
              <TouchableOpacity
                style={[
                  styles.biometricBtn,
                  registeredUser ? styles.biometricBtnReady : styles.biometricBtnMuted,
                  isLoading && { opacity: 0.7 },
                ]}
                onPress={handleBiometricLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.biometricIcon}>👆</Text>
                <Text style={[
                  styles.biometricBtnText,
                  registeredUser ? styles.biometricBtnTextReady : styles.biometricBtnTextMuted,
                ]}>
                  {registeredUser ? `دخول سريع بالبصمة (${registeredUser.name})` : 'الدخول بالبصمة'}
                </Text>
              </TouchableOpacity>

              {/* Quick Switch to Register */}
              <View style={styles.switchPromptRow}>
                <Text style={styles.switchPromptText}>ليس لديك حساب؟</Text>
                <TouchableOpacity onPress={() => setIsRegister(true)}>
                  <Text style={styles.switchPromptLink}>إنشاء حساب جديد</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* 2. REGISTER FORM */
            <View style={styles.formBody}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="عبدالله محمد"
                    placeholderTextColor={colors.outline}
                    value={regName}
                    onChangeText={setRegName}
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>رقم الهاتف</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="770000000"
                    placeholderTextColor={colors.outline}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                    textAlign="left"
                  />
                  <View style={styles.flagBadge}>
                    <Text style={styles.flagEmoji}>🇾🇪</Text>
                    <Text style={styles.countryCode}>+967</Text>
                  </View>
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.outline}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textAlign="left"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>كلمة المرور</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor={colors.outline}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry={!showRegPassword}
                    textAlign="right"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowRegPassword((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eyeIcon}>{showRegPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor={colors.outline}
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry={!showRegConfirmPassword}
                    textAlign="right"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowRegConfirmPassword((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eyeIcon}>{showRegConfirmPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Address Header */}
              <View style={styles.addressSectionHeader}>
                <Text style={styles.addressSectionTitle}>📍 عنوان التوصيل وتحديد الموقع</Text>
                <Text style={styles.addressSectionSub}>مطلوب لتحديد مسافة ورسوم التوصيل بدقة</Text>
              </View>

              {/* Map Location Picker Card */}
              <TouchableOpacity
                style={[
                  styles.mapPickerCard,
                  isLocationPicked && styles.mapPickerCardPicked,
                ]}
                onPress={() => setShowMapPicker(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.mapPickerIconBox, isLocationPicked && styles.mapPickerIconBoxPicked]}>
                  <Text style={styles.mapPickerIcon}>{isLocationPicked ? '📍' : '🗺️'}</Text>
                </View>
                <View style={styles.mapPickerTextWrap}>
                  <Text style={styles.mapPickerTitle}>
                    {isLocationPicked ? 'تم تحديد موقعك على الخريطة' : 'تحديد الموقع على الخريطة (GPS)'}
                  </Text>
                  <Text style={styles.mapPickerSubtitle}>
                    {isLocationPicked
                      ? `${regCity} - ${regDistrict} (${regLat.toFixed(4)}, ${regLng.toFixed(4)})`
                      : 'انقر لتحديد موقعك الجغرافي الدقيق مثل التطبيقات العالمية'}
                  </Text>
                </View>
                <View style={styles.mapPickerBadge}>
                  <Text style={styles.mapPickerBadgeText}>{isLocationPicked ? 'تعديل ✎' : 'اختر ➔'}</Text>
                </View>
              </TouchableOpacity>

              {/* City & District */}
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>المدينة</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="صنعاء"
                      placeholderTextColor={colors.outline}
                      value={regCity}
                      onChangeText={setRegCity}
                      textAlign="right"
                    />
                  </View>
                </View>
                <View style={styles.col2}>
                  <Text style={styles.label}>الحي / المنطقة</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="حي حدة"
                      placeholderTextColor={colors.outline}
                      value={regDistrict}
                      onChangeText={setRegDistrict}
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>

              {/* Street & Building */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الشارع وتفاصيل العنوان</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="شارع الخمسين - بجوار مسجد النور"
                    placeholderTextColor={colors.outline}
                    value={regStreet}
                    onChangeText={setRegStreet}
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>رقم المبنى / الدور / ملاحظات (اختياري)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="عمارة السلام - الدور 2 - شقة 4"
                    placeholderTextColor={colors.outline}
                    value={regBuilding}
                    onChangeText={setRegBuilding}
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Terms */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreeTerms((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                  {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>أوافق على الشروط والأحكام</Text>
              </TouchableOpacity>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>إنشاء الحساب</Text>
                )}
              </TouchableOpacity>

              {/* Quick Switch to Login */}
              <View style={styles.switchPromptRow}>
                <Text style={styles.switchPromptText}>لديك حساب بالفعل؟</Text>
                <TouchableOpacity onPress={() => setIsRegister(false)}>
                  <Text style={styles.switchPromptLink}>تسجيل الدخول</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Guest Access Option */}
        <TouchableOpacity
          style={styles.guestBtn}
          onPress={() => {
            navigateTo('home');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.guestBtnText}>التصفح كزائر بدون تسجيل ➔</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Map Location Picker */}
      <LocationPickerModal
        visible={showMapPicker}
        title="تحديد موقع التوصيل على الخريطة"
        initialLat={regLat}
        initialLng={regLng}
        initialDistrict={regDistrict || 'حي حدة'}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationPicked}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 48,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.baseLg,
  },
  brandTitle: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: typography.fontSize.xxl,
    color: colors.primary,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
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
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  formBody: {
    gap: 2,
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
  flagBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  flagEmoji: {
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
  checkboxRow: {
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
  checkboxLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  primaryBtnText: {
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
  biometricIcon: {
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
  switchPromptRow: {
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
  switchPromptLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: spacing.baseMd,
  },
  guestBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.outline,
  },
  addressSectionHeader: {
    alignItems: 'flex-end',
    marginTop: spacing.baseSm,
    marginBottom: spacing.baseXs,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '30',
  },
  addressSectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    textAlign: 'right',
  },
  addressSectionSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  mapPickerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginVertical: spacing.baseSm,
  },
  mapPickerCardPicked: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  mapPickerIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerIconBoxPicked: {
    backgroundColor: colors.primary + '20',
  },
  mapPickerIcon: {
    fontSize: 20,
  },
  mapPickerTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mapPickerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    textAlign: 'right',
  },
  mapPickerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  mapPickerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  mapPickerBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onPrimary,
  },
  row2: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: spacing.baseSm,
  },
  col2: {
    flex: 1,
  },
});
