import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Animated,
  Easing,
  Image,
  Modal,
} from 'react-native';
import { typography, borderRadius, spacing, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { authApi, governorateApi } from '../api';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';
import { TermsModal } from '../components/TermsModal';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';

type AuthMode = 'phone' | 'password' | 'register';

export const AuthScreen: React.FC = () => {
  const { login, register, navigateTo, registeredUser, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [mode, setMode] = useState<AuthMode>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneLookupMessage, setPhoneLookupMessage] = useState<string | null>(null);

  // Phone Step State
  const [phone, setPhone] = useState(registeredUser ? registeredUser.phone : '');

  // Password Step State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Address & GPS Location States
  const [regCity, setRegCity] = useState('');
  const [governorates, setGovernorates] = useState<{ id: string; name: string }[]>([]);
  const [governorateId, setGovernorateId] = useState('');
  const [governoratePickerOpen, setGovernoratePickerOpen] = useState(false);
  const [regDistrict, setRegDistrict] = useState('');
  const [regStreet, setRegStreet] = useState('');
  const [regBuilding, setRegBuilding] = useState('');
  const [regLat, setRegLat] = useState(0);
  const [regLng, setRegLng] = useState(0);
  const [isLocationPicked, setIsLocationPicked] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => { governorateApi.list().then(setGovernorates).catch(() => setGovernorates([])); }, []);

  // ─── Animations ──────────────────────────────────────────────────────────
  const waveAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const auraAnim = useRef(new Animated.Value(0.4)).current;
  const formFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Floating Wave Animation (حركة التموج الانسيابية للأعلى والأسفل)
    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: -7,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 7,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    waveLoop.start();

    // 2. Logo Pulsating Scale & Glowing Aura Ring (نبضات التوهج الأنيقة)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 2100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(auraAnim, {
            toValue: 0.8,
            duration: 2100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 2100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(auraAnim, {
            toValue: 0.35,
            duration: 2100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();

    return () => {
      waveLoop.stop();
      pulseLoop.stop();
    };
  }, [waveAnim, pulseAnim, auraAnim]);

  // Smooth mode switcher with crossfade
  const switchMode = (newMode: AuthMode) => {
    Animated.sequence([
      Animated.timing(formFadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(formFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setMode(newMode);
    }, 120);
  };

  const handleLocationPicked = (loc: LocationResult) => {
    setRegLat(loc.latitude);
    setRegLng(loc.longitude);
    if (loc.city) setRegCity(loc.city);
    if (loc.district) setRegDistrict(loc.district);
    if (loc.street) setRegStreet(loc.street);
    setIsLocationPicked(true);
    setShowMapPicker(false);
  };

  // ─── 1. Check Phone Number & Smart Routing ────────────────────────────────
  const handleChooseAccountPath = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف أولاً');
      return;
    }
    if (cleanPhone.length < 9) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم هاتف صحيح مكون من 9 أرقام');
      return;
    }

    setPhone(cleanPhone);
    setRegPhone(cleanPhone);
    setPhoneLookupMessage(null);
    setIsLoading(true);
    try {
      const result = await authApi.checkPhone(cleanPhone);
      if (result.exists) {
        switchMode('password');
      } else {
        setPhoneLookupMessage('لا يوجد حساب مرتبط بهذا الرقم. أكمل البيانات لإنشاء حساب جديد.');
        switchMode('register');
      }
    } catch (error: any) {
      Alert.alert('تعذر التحقق من الرقم', error?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 2. Login with Password ──────────────────────────────────────────────
  const handleLogin = async () => {
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      Alert.alert('تنبيه', 'يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      await login(cleanPhone, cleanPassword);
      // Once logged in, session is persisted in AsyncStorage by AppContext
    } catch {
      // error handled in AppContext
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 3. Register New Account ─────────────────────────────────────────────
  const handleRegister = async () => {
    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();
    const cleanEmail = regEmail.trim();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName) {
      Alert.alert('تنبيه', 'يرجى إدخال الاسم الكامل');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم هاتف صحيح');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      Alert.alert('تنبيه', 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام');
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      Alert.alert('خطأ', 'كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }
    if (!regCity.trim() || !regDistrict.trim() || !regStreet.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال المدينة والحي والشارع');
      return;
    }
    if (!governorateId) { Alert.alert('تنبيه', 'اختر محافظة السكن من القائمة'); return; }
    if (!isLocationPicked || !regLat || !regLng) {
      Alert.alert('تنبيه', 'حدد موقعك الفعلي على الخريطة قبل إنشاء الحساب');
      return;
    }
    if (!agreeTerms) {
      Alert.alert(
        'الشروط والأحكام',
        'يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة.',
        [
          { text: 'قراءة الشروط', onPress: () => setShowTermsModal(true) },
          { text: 'موافق ومتابعة ✓', onPress: () => setAgreeTerms(true) },
        ]
      );
      return;
    }

    const initialAddress = {
      city: regCity.trim(),
      governorateId,
      district: regDistrict.trim(),
      street: regStreet.trim(),
      building: regBuilding.trim() || undefined,
      latitude: regLat,
      longitude: regLng,
    };

    setIsLoading(true);
    try {
      await register(
        cleanName,
        cleanPhone,
        cleanEmail,
        cleanPassword,
        {
          label: 'المنزل',
          ...initialAddress,
          isDefault: true,
        }
      );
      // Session automatically persisted by AppContext
    } catch {
      // error handled in AppContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'استعادة كلمة المرور',
      'سيتم إرسال رسالة SMS برابط إعادة تعيين كلمة المرور إلى رقمك المسجل.',
      [{ text: 'حسناً' }]
    );
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView
          avoidKeyboard={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Hero Brand Header with Waving Logo & Pulsating Aura ─── */}
          <View style={styles.heroSection}>
            <View style={styles.logoAnchor}>
              <View pointerEvents="none" style={styles.outerWaveRing} />
              <Animated.View
                style={[
                  styles.auraRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: auraAnim,
                  },
                ]}
              />

              {/* Floating Waving App Logo */}
              <Animated.View
                style={[
                  styles.logoBadge,
                  {
                    transform: [{ translateY: waveAnim }],
                  },
                ]}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                  accessibilityLabel="شعار متجر بي اس"
                />
              </Animated.View>

              {[
                { icon: 'shirt' as AppIconName, place: styles.orbitTopRight, tint: themeColors.tertiary },
                { icon: 'soup' as AppIconName, place: styles.orbitBottomRight, tint: themeColors.primary },
                { icon: 'smartphone' as AppIconName, place: styles.orbitBottomLeft, tint: themeColors.secondary },
                { icon: 'shopping-cart' as AppIconName, place: styles.orbitTopLeft, tint: themeColors.success },
              ].map((item, index) => (
                <Animated.View
                  key={item.icon}
                  pointerEvents="none"
                  style={[
                    styles.orbitBadge,
                    item.place,
                    { backgroundColor: `${item.tint}20`, borderColor: `${item.tint}80` },
                    { transform: [{ translateY: waveAnim.interpolate({ inputRange: [-7, 0, 7], outputRange: index % 2 ? [5, 0, -5] : [-5, 0, 5] }) }] },
                  ]}
                >
                  <AppIcon name={item.icon} size={22} color={item.tint} />
                </Animated.View>
              ))}
            </View>

            {/* Brand Title with Tajawal Font */}
            <Text style={styles.brandTitle}>كل ما تحتاجه.. في مكان واحد</Text>
            <Text style={styles.brandSubtitle}>ملابس وطعام وإلكترونيات وأكثر — يصلك بسهولة مع BS Store</Text>
          </View>

          {/* ─── Dynamic Animated Form Body ─── */}
          <Animated.View style={[styles.cardContainer, { opacity: formFadeAnim }]}>
            {/* ════════════════════════════════════════════════════════════════
                STEP 1: PHONE NUMBER ENTRY
               ════════════════════════════════════════════════════════════════ */}
            {mode === 'phone' && (
              <View style={styles.formCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>تسجيل الدخول / إنشاء حساب</Text>
                  <Text style={styles.cardSubtitle}>
                    أدخل رقم هاتفك للمتابعة والوصول السريع
                  </Text>
                </View>

                {/* Phone Input with +967 Badge */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رقم الهاتف المحمول</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="770 000 000"
                      placeholderTextColor={themeColors.outline}
                      value={phone}
                      onChangeText={(value) => { setPhone(value); setPhoneLookupMessage(null); }}
                      keyboardType="phone-pad"
                      textAlign="left"
                      accessibilityLabel="رقم الهاتف المحمول"
                    />
                    <View style={styles.countryBadge}>
                      <Text style={styles.countryCode}>+967</Text>
                    </View>
                  </View>
                </View>

                {/* Primary Action: Continue */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isLoading && { opacity: 0.75 }]}
                  onPress={handleChooseAccountPath}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="تسجيل الدخول أو إنشاء حساب حسب رقم الهاتف"
                  accessibilityState={{ disabled: isLoading, busy: isLoading }}
                >
                  <View style={styles.btnRow}>
                    {isLoading ? (
                      <>
                        <ActivityIndicator color={themeColors.onPrimary} size="small" />
                        <Text style={styles.primaryBtnText}>جاري التحقق...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
                        <AppIcon name="arrow-right" size={17} color={themeColors.onPrimary} />
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Register Account Button (Directly Underneath as Requested) */}
                <TouchableOpacity
                  style={styles.registerUnderneathBtn}
                  onPress={() => {
                    setRegPhone(phone);
                    setPhoneLookupMessage(null);
                    switchMode('register');
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="إنشاء حساب جديد"
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="plus" size={16} color={themeColors.primary} />
                    <Text style={styles.registerUnderneathText}>إنشاء حساب جديد</Text>
                  </View>
                </TouchableOpacity>

                {/* Divider Line */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>أو</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Browse as Guest Option */}
                <TouchableOpacity
                  style={styles.guestLinkBtn}
                  onPress={() => navigateTo('home')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="التصفح كزائر بدون تسجيل"
                >
                  <View style={styles.btnRow}>
                    <Text style={styles.guestLinkText}>التصفح كزائر بدون تسجيل</Text>
                    <AppIcon name="arrow-right" size={15} color={themeColors.onSurfaceVariant} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 1B: PASSWORD ENTRY (FOR REGISTERED PHONE)
               ════════════════════════════════════════════════════════════════ */}
            {mode === 'password' && (
              <View style={styles.formCard}>
                {/* Back to Phone Step Button */}
                <TouchableOpacity
                  style={styles.backRowBtn}
                  onPress={() => switchMode('phone')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="تغيير رقم الهاتف"
                >
                  <AppIcon name="arrow-right" size={15} color={themeColors.primary} />
                  <Text style={styles.backRowText}>تغيير رقم الهاتف</Text>
                </TouchableOpacity>

                {/* Verified Phone Badge */}
                <View style={styles.phoneVerifiedBanner}>
                  <View style={styles.phoneVerifiedCheck}>
                    <Text style={styles.phoneCheckIcon}>✓</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 1 }}>
                    <Text style={styles.phoneVerifiedSub}>حساب مسجل مسبقاً</Text>
                    <Text style={styles.phoneVerifiedNumber}>+967 {phone}</Text>
                  </View>
                </View>

                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>أهلاً بك مجدداً!</Text>
                  <Text style={styles.cardSubtitle}>
                    يرجى إدخال كلمة المرور لحسابك للمتابعة
                  </Text>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputHeaderRow}>
                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="استعادة كلمة المرور">
                      <Text style={styles.forgotPassLink}>نسيت كلمة المرور؟</Text>
                    </TouchableOpacity>
                    <Text style={styles.inputLabel}>كلمة المرور</Text>
                  </View>

                  <View style={styles.inputWrapper}>
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      <AppIcon name={showPassword ? 'eye-off' : 'eye'} size={19} color={themeColors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="••••••••"
                      placeholderTextColor={themeColors.outline}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      accessibilityLabel="كلمة المرور"
                    />
                  </View>
                </View>

                {/* Remember Me Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRememberMe((prev) => !prev)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityLabel="حفظ تسجيل الدخول على هذا الجهاز"
                  accessibilityState={{ checked: rememberMe }}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>حفظ تسجيل الدخول على هذا الجهاز</Text>
                </TouchableOpacity>

                {/* Submit Login Button */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isLoading && { opacity: 0.75 }]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="تسجيل الدخول"
                  accessibilityState={{ disabled: isLoading, busy: isLoading }}
                >
                  {isLoading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color={themeColors.onPrimary} size="small" />
                      <Text style={styles.primaryBtnText}>جاري تسجيل الدخول...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>تسجيل الدخول والدخول للتطبيق ✓</Text>
                  )}
                </TouchableOpacity>

                {/* Switch to Register if Needed */}
                <View style={styles.switchRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setRegPhone(phone);
                      switchMode('register');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchLink}>إنشاء حساب جديد</Text>
                  </TouchableOpacity>
                  <Text style={styles.switchText}>تريد استخدام حساب آخر؟</Text>
                </View>
              </View>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: ATTRACTIVE REGISTRATION INTERFACE (إنشاء حساب جذاب)
               ════════════════════════════════════════════════════════════════ */}
            {mode === 'register' && (
              <View style={styles.formCard}>
                {/* Back to Phone Step */}
                <TouchableOpacity
                  style={styles.backRowBtn}
                  onPress={() => switchMode('phone')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="الرجوع لتسجيل الدخول"
                >
                  <AppIcon name="arrow-right" size={15} color={themeColors.primary} />
                  <Text style={styles.backRowText}>الرجوع لتسجيل الدخول</Text>
                </TouchableOpacity>

                {phoneLookupMessage && (
                  <View style={styles.phoneLookupNotice} accessibilityRole="alert">
                    <Text style={styles.phoneLookupNoticeText}>{phoneLookupMessage}</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>إنشاء حساب عميل جديد</Text>
                  <Text style={styles.cardSubtitle}>
                    سجل بياناتك واستمتع بأسرع تجربة تسوق وتوصيل
                  </Text>
                </View>

                {/* 1. Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>الاسم الكامل</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="مثال: أحمد محمد علي"
                      placeholderTextColor={themeColors.outline}
                      value={regName}
                      onChangeText={setRegName}
                      accessibilityLabel="الاسم الكامل"
                    />
                    <AppIcon name="user" size={18} color={themeColors.onSurfaceVariant} />
                  </View>
                </View>

                {/* 2. Phone Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رقم الهاتف</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="770 000 000"
                      placeholderTextColor={themeColors.outline}
                      value={regPhone}
                      onChangeText={setRegPhone}
                      keyboardType="phone-pad"
                      textAlign="left"
                      accessibilityLabel="رقم الهاتف"
                    />
                    <View style={styles.countryBadge}>
                      <Text style={styles.countryCode}>+967</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>كلمة المرور</Text>
                  <View style={styles.inputWrapper}>
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowRegPassword((prev) => !prev)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={showRegPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      <AppIcon name={showRegPassword ? 'eye-off' : 'eye'} size={19} color={themeColors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="6 خانات على الأقل"
                      placeholderTextColor={themeColors.outline}
                      value={regPassword}
                      onChangeText={setRegPassword}
                      secureTextEntry={!showRegPassword}
                      accessibilityLabel="كلمة المرور"
                    />
                    <AppIcon name="lock" size={18} color={themeColors.onSurfaceVariant} />
                  </View>
                </View>

                {/* 4. Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
                  <View style={styles.inputWrapper}>
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowRegConfirmPassword((prev) => !prev)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={showRegConfirmPassword ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
                    >
                      <AppIcon name={showRegConfirmPassword ? 'eye-off' : 'eye'} size={19} color={themeColors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="إعادة إدخال كلمة المرور"
                      placeholderTextColor={themeColors.outline}
                      value={regConfirmPassword}
                      onChangeText={setRegConfirmPassword}
                      secureTextEntry={!showRegConfirmPassword}
                      accessibilityLabel="تأكيد كلمة المرور"
                    />
                    <AppIcon name="lock" size={18} color={themeColors.onSurfaceVariant} />
                  </View>
                </View>

                {/* 5. Delivery Address Section */}
                <View style={styles.addressSectionHeader}>
                  <View style={styles.addressHeaderRow}>
                    <AppIcon name="map-pin" size={17} color={themeColors.primary} />
                    <Text style={styles.addressHeaderTitle}>عنوان التوصيل الأساسي</Text>
                  </View>
                  <Text style={styles.addressHeaderSub}>
                    مطلوب لتحديد مسافة التوصيل وأقرب المتاجر بدقة
                  </Text>
                </View>

                {/* GPS Map Picker Card */}
                <TouchableOpacity
                  style={[
                    styles.mapPickerCard,
                    isLocationPicked && styles.mapPickerCardPicked,
                  ]}
                  onPress={() => setShowMapPicker(true)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isLocationPicked ? 'تعديل موقع التوصيل' : 'تحديد موقع التوصيل'}
                >
                  <View style={[styles.mapPickerIconBox, isLocationPicked && styles.mapPickerIconBoxPicked]}>
                    <AppIcon name={isLocationPicked ? 'map-pin' : 'map'} size={19} color={themeColors.primary} />
                  </View>
                  <View style={styles.mapPickerInfo}>
                    <Text style={styles.mapPickerTitle}>
                      {isLocationPicked ? 'تم تحديد موقعك بدقة على الخريطة' : 'تحديد الموقع الجغرافي (GPS)'}
                    </Text>
                    <Text style={styles.mapPickerDesc} numberOfLines={1}>
                      {isLocationPicked
                        ? `${regCity} - ${regDistrict} (${regLat.toFixed(3)}, ${regLng.toFixed(3)})`
                        : 'انقر لتثبيت موقع التوصيل الفعلي وتسهيل وصول السائق'}
                    </Text>
                  </View>
                  <View style={styles.mapPickerActionBadge}>
                    <View style={styles.mapPickerActionRow}>
                      <Text style={styles.mapPickerActionText}>{isLocationPicked ? 'تعديل' : 'تحديد'}</Text>
                      <AppIcon name={isLocationPicked ? 'edit' : 'arrow-right'} size={13} color={themeColors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* City & District in One Row */}
                <Text style={styles.inputLabel}>محافظة السكن *</Text>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => setGovernoratePickerOpen(true)} accessibilityRole="button" accessibilityLabel="اختيار المحافظة">
                  <Text style={[styles.textInput, { textAlign: 'right', paddingVertical: 12 }]}>{governorates.find((g) => g.id === governorateId)?.name || 'اختر المحافظة'}</Text>
                </TouchableOpacity>
                <View style={styles.row2}>
                  <View style={styles.col2}>
                    <Text style={styles.inputLabel}>المدينة</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'right' }]}
                        placeholder="المدينة (مثال: صنعاء، عدن، ...)"
                        placeholderTextColor={themeColors.outline}
                        value={regCity}
                        onChangeText={setRegCity}
                        accessibilityLabel="المدينة"
                      />
                    </View>
                  </View>
                  <View style={styles.col2}>
                    <Text style={styles.inputLabel}>الحي / المنطقة</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'right' }]}
                        placeholder="اسم الحي / المنطقة"
                        placeholderTextColor={themeColors.outline}
                        value={regDistrict}
                        onChangeText={setRegDistrict}
                        accessibilityLabel="الحي أو المنطقة"
                      />
                    </View>
                  </View>
                </View>

                {/* Street Details */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>الشارع وتفاصيل العنوان</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="الشارع، رقم المبنى، أو أقرب معلم"
                      placeholderTextColor={themeColors.outline}
                      value={regStreet}
                      onChangeText={setRegStreet}
                      accessibilityLabel="الشارع وتفاصيل العنوان"
                    />
                  </View>
                </View>

                {/* 6. Terms & Conditions with Clickable Modal Trigger */}
                <View style={styles.termsRow}>
                <TouchableOpacity
                  style={[styles.checkbox, agreeTerms && styles.checkboxActive]}
                  onPress={() => setAgreeTerms((prev) => !prev)}
                  activeOpacity={0.8}
                  hitSlop={12}
                    accessibilityRole="checkbox"
                    accessibilityLabel="أوافق على الشروط والأحكام وسياسة الخصوصية"
                    accessibilityState={{ checked: agreeTerms }}
                  >
                    {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.termsTextWrap}>
                    <Text style={styles.termsNormalText}>أوافق على </Text>
                    <TouchableOpacity
                      onPress={() => setShowTermsModal(true)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="قراءة الشروط والأحكام وسياسة الخصوصية"
                    >
                      <Text style={styles.termsHighlightText}>
                        الشروط والأحكام وسياسة الخصوصية
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 7. Submit Register Button */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isLoading && { opacity: 0.75 }]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="إنشاء الحساب والبدء بالتسوق"
                  accessibilityState={{ disabled: isLoading, busy: isLoading }}
                >
                  {isLoading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color={themeColors.onPrimary} size="small" />
                      <Text style={styles.primaryBtnText}>جاري إنشاء الحساب...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>إنشاء الحساب والبدء بالتسوق ✓</Text>
                  )}
                </TouchableOpacity>

                {/* Switch Back to Login */}
                <View style={styles.switchRow}>
                  <TouchableOpacity
                    onPress={() => switchMode('phone')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchLink}>تسجيل الدخول</Text>
                  </TouchableOpacity>
                  <Text style={styles.switchText}>لديك حساب بالفعل؟</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {/* Interactive Map Picker Modal */}
      <LocationPickerModal
        visible={showMapPicker}
        title="تحديد موقع التوصيل على الخريطة"
        initialLat={regLat}
        initialLng={regLng}
        initialDistrict={regDistrict || ''}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationPicked}
      />
      <Modal visible={governoratePickerOpen} transparent animationType="slide" onRequestClose={() => setGovernoratePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر المحافظة</Text>
            <ScrollView>
              {governorates.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={styles.governorateOption}
                  onPress={() => { setGovernorateId(g.id); setRegCity(g.name); setGovernoratePickerOpen(false); }}
                  accessibilityRole="button"
                  accessibilityLabel={'اختيار محافظة ' + g.name}
                >
                  <Text style={styles.governorateOptionText}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Terms & Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreeTerms(true)}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 18,
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoAnchor: {
    width: 204,
    height: 188,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  outerWaveRing: {
    position: 'absolute',
    width: 174,
    height: 174,
    borderRadius: 87,
    borderWidth: 1,
    borderColor: colors.primaryFixedDim + '70',
  },
  auraRing: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    shadowColor: colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  logoBadge: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  orbitBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  orbitTopRight: { top: 16, right: 20 },
  orbitBottomRight: { bottom: 14, right: 28 },
  orbitBottomLeft: { bottom: 14, left: 28 },
  orbitTopLeft: { top: 16, left: 20 },
  brandTitle: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: 25,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 34,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 22,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'right',
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 4,
  },
  phoneLookupNotice: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  phoneLookupNoticeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  forgotPassLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11.5,
    color: colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    minHeight: 52,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 16,
    color: colors.onSurface,
    height: '100%',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: 8,
  },
  countryCode: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onPrimaryContainer,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.onPrimary,
  },
  btnRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  registerUnderneathBtn: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  registerUnderneathText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  dividerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.outline,
    marginHorizontal: 10,
  },
  guestLinkBtn: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  guestLinkText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  backRowBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-end',
    minHeight: 44,
  },
  backRowText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  phoneVerifiedBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.success + '40',
    borderRadius: borderRadius.lg,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  phoneVerifiedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCheckIcon: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  phoneVerifiedSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  phoneVerifiedNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.success,
    letterSpacing: 1,
  },
  checkboxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
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
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  switchText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  switchLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  addressSectionHeader: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  addressHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13.5,
    color: colors.primary,
    textAlign: 'right',
  },
  addressHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  addressHeaderSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  mapPickerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary + '70',
    borderRadius: borderRadius.lg,
    padding: 10,
    minHeight: 68,
    marginBottom: 12,
    gap: 10,
  },
  mapPickerCardPicked: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.primaryContainer,
  },
  mapPickerIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerIconBoxPicked: {
    backgroundColor: colors.primaryFixedDim,
  },
  mapPickerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mapPickerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'right',
  },
  mapPickerDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  mapPickerActionBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    minHeight: 34,
    justifyContent: 'center',
  },
  mapPickerActionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  mapPickerActionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10.5,
    color: colors.primary,
  },
  row2: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 4,
  },
  col2: {
    flex: 1,
  },
  termsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  termsTextWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  termsNormalText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  termsHighlightText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 24, 17, 0.48)',
  },
  modalCard: {
    maxHeight: '70%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.baseMd,
    paddingBottom: 24,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    textAlign: 'right',
    fontSize: typography.fontSize.lg,
    color: colors.onSurface,
    marginBottom: spacing.baseSm,
  },
  governorateOption: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  governorateOptionText: {
    textAlign: 'right',
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
  },
});
