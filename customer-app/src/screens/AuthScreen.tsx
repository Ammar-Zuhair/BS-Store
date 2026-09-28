import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, borderRadius, spacing } from '../theme';
import { useApp } from '../context/AppContext';
import { authApi } from '../api';
import { LocationPickerModal, LocationResult } from '../components/LocationPickerModal';
import { TermsModal } from '../components/TermsModal';

type AuthMode = 'phone' | 'password' | 'register';

export const AuthScreen: React.FC = () => {
  const { login, register, navigateTo, registeredUser } = useApp();

  const [mode, setMode] = useState<AuthMode>('phone');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
  const [regCity, setRegCity] = useState('صنعاء');
  const [regDistrict, setRegDistrict] = useState('');
  const [regStreet, setRegStreet] = useState('');
  const [regBuilding, setRegBuilding] = useState('');
  const [regLat, setRegLat] = useState(15.34);
  const [regLng, setRegLng] = useState(44.20);
  const [isLocationPicked, setIsLocationPicked] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
  const handleCheckPhone = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف أولاً');
      return;
    }
    if (cleanPhone.length < 9) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم هاتف صحيح مكون من 9 أرقام');
      return;
    }

    setIsCheckingPhone(true);
    try {
      const exists = await authApi.checkPhone(cleanPhone);
      setIsCheckingPhone(false);

      if (exists) {
        // Phone is in database -> prompt for password
        switchMode('password');
      } else {
        // Phone does not exist -> smooth transfer to register
        setRegPhone(cleanPhone);
        Alert.alert(
          'مرحباً بك في BS Store',
          'هذا الرقم غير مسجل لدينا حالياً. سننتقل الآن لإنشاء حسابك الجديد للاستمتاع بالتسوق.',
          [
            {
              text: 'إنشاء حساب جديد ➔',
              onPress: () => switchMode('register'),
            },
          ]
        );
      }
    } catch {
      setIsCheckingPhone(false);
      // Fallback in case of offline/network glitch: offer password or register
      Alert.alert(
        'خيارات الحساب',
        'تعذر التحقق التلقائي، يمكنك تسجيل الدخول بكلمة المرور أو إنشاء حساب جديد:',
        [
          { text: 'إنشاء حساب جديد', onPress: () => { setRegPhone(cleanPhone); switchMode('register'); } },
          { text: 'تسجيل الدخول', onPress: () => switchMode('password') },
        ]
      );
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
    if (!regCity.trim() || !regDistrict.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال المدينة والحي');
      return;
    }
    if (!agreeTerms) {
      Alert.alert(
        'الشروط والأحكام',
        'يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة.',
        [
          { text: 'قراءة الشروط 📄', onPress: () => setShowTermsModal(true) },
          { text: 'موافق ومتابعة ✓', onPress: () => setAgreeTerms(true) },
        ]
      );
      return;
    }

    const initialAddress = {
      city: regCity.trim(),
      district: regDistrict.trim(),
      street: regStreet.trim() || 'الشارع الرئيسي',
      building: regBuilding.trim() || undefined,
      description: 'تم التسجيل عبر تطبيق العميل',
      latitude: regLat || 15.35,
      longitude: regLng || 44.20,
    };

    setIsLoading(true);
    try {
      await register(
        cleanName,
        cleanPhone,
        cleanEmail || `${cleanPhone}@bsstore.app`,
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
      <LinearGradient
        colors={['#0A0B0D', '#121418', '#181B22']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Hero Brand Header with Waving Logo & Pulsating Aura ─── */}
          <View style={styles.heroSection}>
            <View style={styles.logoAnchor}>
              {/* Pulsating Glowing Aura Ring */}
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
                />
              </Animated.View>
            </View>

            {/* Brand Title with Tajawal Font */}
            <Text style={styles.brandTitle}>BS STORE</Text>
            <Text style={styles.brandSubtitle}>منصة التسوق والتوصيل المتكاملة</Text>
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
                      placeholderTextColor="#6B7280"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      textAlign="left"
                    />
                    <View style={styles.countryBadge}>
                      <Text style={styles.flagEmoji}>🇾🇪</Text>
                      <Text style={styles.countryCode}>+967</Text>
                    </View>
                  </View>
                </View>

                {/* Primary Action: Continue */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isCheckingPhone && { opacity: 0.75 }]}
                  onPress={handleCheckPhone}
                  disabled={isCheckingPhone}
                  activeOpacity={0.88}
                >
                  {isCheckingPhone ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color="#111317" size="small" />
                      <Text style={styles.primaryBtnText}>جاري التحقق...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>متابعة ➔</Text>
                  )}
                </TouchableOpacity>

                {/* Register Account Button (Directly Underneath as Requested) */}
                <TouchableOpacity
                  style={styles.registerUnderneathBtn}
                  onPress={() => {
                    setRegPhone(phone);
                    switchMode('register');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.registerUnderneathText}>+ إنشاء حساب جديد</Text>
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
                >
                  <Text style={styles.guestLinkText}>التصفح كزائر بدون تسجيل ➔</Text>
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
                >
                  <Text style={styles.backRowIcon}>➔</Text>
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
                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                      <Text style={styles.forgotPassLink}>نسيت كلمة المرور؟</Text>
                    </TouchableOpacity>
                    <Text style={styles.inputLabel}>كلمة المرور</Text>
                  </View>

                  <View style={styles.inputWrapper}>
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="••••••••"
                      placeholderTextColor="#6B7280"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>

                {/* Remember Me Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRememberMe((prev) => !prev)}
                  activeOpacity={0.8}
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
                >
                  {isLoading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color="#111317" size="small" />
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
                >
                  <Text style={styles.backRowIcon}>➔</Text>
                  <Text style={styles.backRowText}>الرجوع لتسجيل الدخول</Text>
                </TouchableOpacity>

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
                      placeholderTextColor="#6B7280"
                      value={regName}
                      onChangeText={setRegName}
                    />
                    <Text style={styles.fieldIcon}>👤</Text>
                  </View>
                </View>

                {/* 2. Phone Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رقم الهاتف</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="770 000 000"
                      placeholderTextColor="#6B7280"
                      value={regPhone}
                      onChangeText={setRegPhone}
                      keyboardType="phone-pad"
                      textAlign="left"
                    />
                    <View style={styles.countryBadge}>
                      <Text style={styles.flagEmoji}>🇾🇪</Text>
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
                    >
                      <Text style={styles.eyeIcon}>{showRegPassword ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="6 خانات على الأقل"
                      placeholderTextColor="#6B7280"
                      value={regPassword}
                      onChangeText={setRegPassword}
                      secureTextEntry={!showRegPassword}
                    />
                    <Text style={styles.fieldIcon}>🔒</Text>
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
                    >
                      <Text style={styles.eyeIcon}>{showRegConfirmPassword ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'right' }]}
                      placeholder="إعادة إدخال كلمة المرور"
                      placeholderTextColor="#6B7280"
                      value={regConfirmPassword}
                      onChangeText={setRegConfirmPassword}
                      secureTextEntry={!showRegConfirmPassword}
                    />
                    <Text style={styles.fieldIcon}>🔒</Text>
                  </View>
                </View>

                {/* 5. Delivery Address Section */}
                <View style={styles.addressSectionHeader}>
                  <Text style={styles.addressHeaderTitle}>📍 عنوان التوصيل الأساسي</Text>
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
                >
                  <View style={[styles.mapPickerIconBox, isLocationPicked && styles.mapPickerIconBoxPicked]}>
                    <Text style={styles.mapPickerIcon}>{isLocationPicked ? '📍' : '🗺️'}</Text>
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
                    <Text style={styles.mapPickerActionText}>{isLocationPicked ? 'تعديل ✎' : 'تحديد ➔'}</Text>
                  </View>
                </TouchableOpacity>

                {/* City & District in One Row */}
                <View style={styles.row2}>
                  <View style={styles.col2}>
                    <Text style={styles.inputLabel}>المدينة</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'right' }]}
                        placeholder="صنعاء"
                        placeholderTextColor="#6B7280"
                        value={regCity}
                        onChangeText={setRegCity}
                      />
                    </View>
                  </View>
                  <View style={styles.col2}>
                    <Text style={styles.inputLabel}>الحي / المنطقة</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'right' }]}
                        placeholder="حي حدة"
                        placeholderTextColor="#6B7280"
                        value={regDistrict}
                        onChangeText={setRegDistrict}
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
                      placeholder="شارع الخمسين - جوار مسجد السلام"
                      placeholderTextColor="#6B7280"
                      value={regStreet}
                      onChangeText={setRegStreet}
                    />
                  </View>
                </View>

                {/* 6. Terms & Conditions with Clickable Modal Trigger */}
                <View style={styles.termsRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, agreeTerms && styles.checkboxActive]}
                    onPress={() => setAgreeTerms((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.termsTextWrap}>
                    <Text style={styles.termsNormalText}>أوافق على </Text>
                    <TouchableOpacity
                      onPress={() => setShowTermsModal(true)}
                      activeOpacity={0.7}
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
                >
                  {isLoading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color="#111317" size="small" />
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Interactive Map Picker Modal */}
      <LocationPickerModal
        visible={showMapPicker}
        title="تحديد موقع التوصيل على الخريطة"
        initialLat={regLat}
        initialLng={regLng}
        initialDistrict={regDistrict || 'حي حدة'}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationPicked}
      />

      {/* Interactive Terms & Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreeTerms(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoAnchor: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  auraRing: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#F59E0B',
    opacity: 0.35,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#181A1E',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  brandTitle: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
  },
  cardContainer: {
    width: '100%',
  },
  formCard: {
    backgroundColor: '#181A1E',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262A32',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
    color: '#F9FAFB',
    textAlign: 'right',
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12.5,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
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
    fontSize: 12.5,
    color: '#E5E7EB',
    textAlign: 'right',
    marginBottom: 6,
  },
  forgotPassLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11.5,
    color: '#F59E0B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F232B',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#2D323E',
    paddingHorizontal: 12,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: '#F9FAFB',
    height: '100%',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2F3A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: 8,
  },
  flagEmoji: {
    fontSize: 14,
  },
  countryCode: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#E5E7EB',
  },
  fieldIcon: {
    fontSize: 15,
    marginLeft: 8,
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: '#111317',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerUnderneathBtn: {
    backgroundColor: '#262A32',
    borderRadius: borderRadius.xl,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#363D47',
  },
  registerUnderneathText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: '#F59E0B',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262A32',
  },
  dividerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: '#6B7280',
    marginHorizontal: 10,
  },
  guestLinkBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  guestLinkText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12.5,
    color: '#9CA3AF',
  },
  backRowBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-end',
  },
  backRowIcon: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backRowText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#F59E0B',
  },
  phoneVerifiedBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#1F2722',
    borderWidth: 1,
    borderColor: '#10B981' + '40',
    borderRadius: borderRadius.lg,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  phoneVerifiedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCheckIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  phoneVerifiedSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10.5,
    color: '#9CA3AF',
  },
  phoneVerifiedNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: '#10B981',
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
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F232B',
  },
  checkboxActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkmark: {
    color: '#111317',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: '#D1D5DB',
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
    color: '#9CA3AF',
  },
  switchLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#F59E0B',
  },
  addressSectionHeader: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#262A32',
  },
  addressHeaderTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13.5,
    color: '#F59E0B',
    textAlign: 'right',
  },
  addressHeaderSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  mapPickerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#1F232B',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F59E0B' + '70',
    borderRadius: borderRadius.lg,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  mapPickerCardPicked: {
    borderStyle: 'solid',
    borderColor: '#10B981',
    backgroundColor: '#1A2722',
  },
  mapPickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: '#2A2F3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerIconBoxPicked: {
    backgroundColor: '#10B981' + '30',
  },
  mapPickerIcon: {
    fontSize: 18,
  },
  mapPickerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mapPickerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#F9FAFB',
    textAlign: 'right',
  },
  mapPickerDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10.5,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  mapPickerActionBadge: {
    backgroundColor: '#2A2F3A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  mapPickerActionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10.5,
    color: '#F59E0B',
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
    color: '#D1D5DB',
  },
  termsHighlightText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: '#F59E0B',
    textDecorationLine: 'underline',
  },
});
