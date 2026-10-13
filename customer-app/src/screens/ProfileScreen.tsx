import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { authApi, governorateApi } from '../api';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { AppBackground } from '../components/AppBackground';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { Address } from '../types';

const emptyAddress = (): Omit<Address, 'id'> => ({
  label: 'أخرى',
  city: '',
  district: '',
  street: '',
  building: '',
  description: '',
  latitude: 0,
  longitude: 0,
  isDefault: false,
});

const SUPPORT_PHONE = '783053937';
const DEVELOPER_PHONE = '775479340';

export const ProfileScreen: React.FC = () => {
  const {
    user,
    addresses,
    logout,
    addNewAddress,
    updateSavedAddress,
    deleteSavedAddress,
    navigateTo,
    isAuthenticated,
    isDarkMode,
    toggleTheme,
    colors,
    refreshCatalog,
    refreshData,
  } = useApp();

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [page, setPage] = useState<'support' | 'about' | 'password' | 'address' | 'governorates' | 'delete-account' | null>(null);
  const [busy, setBusy] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Address, 'id'>>(emptyAddress);
  const [showMap, setShowMap] = useState(false);
  const [governorates, setGovernorates] = useState<{ id: string; name: string }[]>([]);
  const [governorateId, setGovernorateId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [deletionPassword, setDeletionPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    Promise.all([governorateApi.list(), governorateApi.mine()])
      .then(([list, mine]) => {
        if (active) {
          setGovernorates(list);
          setGovernorateId(mine.governorateId || '');
        }
      })
      .catch(() => {});
    void refreshData().catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const showError = (error: any) =>
    Alert.alert('تعذر إكمال العملية', error?.message || 'تحقق من الاتصال وحاول مجدداً.');

  const openWhatsApp = async (phone: string) => {
    try {
      await Linking.openURL(`https://wa.me/967${phone}`);
    } catch {
      Alert.alert('تعذر فتح واتساب', 'تأكد من توفر واتساب أو متصفح على جهازك.');
    }
  };

  const button = (
    label: string,
    onPress: () => void,
    icon: AppIconName = 'chevron-left',
    danger = false,
    compact = false,
    trailingText?: string,
    showChevron = true
  ) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={[
        styles.menuButton,
        compact && styles.compactButton,
        danger && styles.menuButtonDanger,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
    >
      <View style={styles.menuRightCol}>
        <View style={[styles.iconBadge, danger && styles.iconBadgeDanger]}>
          <AppIcon
            name={icon}
            size={18}
            color={danger ? colors.error : isDarkMode ? '#CBD5E1' : colors.primary}
          />
        </View>
        <Text
          style={[
            styles.menuText,
            danger && { color: colors.error },
            compact && styles.compactButtonText,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <View style={styles.menuLeftCol}>
        {!!trailingText && <Text style={styles.menuTrailingText}>{trailingText}</Text>}
        {showChevron && (
          <AppIcon
            name="chevron-left"
            size={18}
            color={danger ? colors.error : isDarkMode ? '#94A3B8' : '#64748B'}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const openAddress = (address?: Address) => {
    setAddressId(address?.id || null);
    setDraft(address ? { ...address } : emptyAddress());
    setPage('address');
  };

  const saveAddress = async () => {
    if (!draft.city.trim() || !draft.street.trim() || (!draft.latitude && !draft.longitude)) {
      Alert.alert('بيانات ناقصة', 'أدخل المدينة والشارع وحدد موقع العنوان على الخريطة.');
      return;
    }
    setBusy(true);
    try {
      if (addressId) await updateSavedAddress(addressId, draft);
      else await addNewAddress(draft);
      setPage(null);
      Alert.alert('تم الحفظ', addressId ? 'تم تعديل عنوانك.' : 'تمت إضافة العنوان.');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const removeAddress = (address: Address) =>
    Alert.alert(
      'حذف العنوان',
      'هل تريد حذف هذا العنوان من عناوينك المحفوظة؟ تبقى عناوين الطلبات السابقة محفوظة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteSavedAddress(address.id);
            } catch (e) {
              showError(e);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );

  const savePassword = async () => {
    if (!currentPassword || newPassword.length < 8) {
      Alert.alert('تحقق من كلمة المرور', 'أدخل كلمة المرور الحالية وكلمة جديدة من 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('تحقق من كلمة المرور', 'تأكيد كلمة المرور لا يطابق الكلمة الجديدة.');
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPage(null);
      Alert.alert('تم التغيير', 'تم تغيير كلمة المرور.');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const confirmAccountDeletion = () => {
    if (!deletionPassword) {
      Alert.alert('كلمة المرور مطلوبة', 'أدخل كلمة مرور حسابك لتأكيد ملكيته.');
      return;
    }
    Alert.alert(
      'حذف الحساب نهائياً',
      'سيُحذف حسابك وبياناتك الشخصية، ولن تتمكن من استعادته. هل تريد المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائي',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await authApi.deleteAccount(deletionPassword);
              setDeletionPassword('');
              setPage(null);
              await logout();
              Alert.alert(
                'تم حذف الحساب',
                'حُذفت بياناتك الشخصية وجلسات الدخول. تُستكمل إزالة ملفات الإيصالات تلقائياً.'
              );
            } catch (e) {
              showError(e);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const saveGovernorate = async (id: string) => {
    setBusy(true);
    try {
      await governorateApi.update(id);
      setGovernorateId(id);
      await refreshCatalog();
      setPage(null);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const closePage = () => {
    if (busy) return;
    if (page === 'password') {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordVisible(false);
    }
    setDeletionPassword('');
    setPage(null);
  };

  const phoneCard = (phone: string) => (
    <View style={styles.phoneSection}>
      <Text style={styles.phone}>{phone}</Text>
      <View style={styles.phoneBtnRow}>
        <TouchableOpacity
          style={[styles.contactBtn, styles.whatsappBtn]}
          onPress={() => void openWhatsApp(phone)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`تواصل واتساب مع ${phone}`}
        >
          <AppIcon name="message" size={18} color="#FFFFFF" />
          <Text style={styles.contactBtnTextLight}>واتساب</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactBtn, styles.callBtn]}
          onPress={() => {
            void Linking.openURL(`tel:+967${phone}`).catch(showError);
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`اتصال هاتفي بالرقم ${phone}`}
        >
          <AppIcon name="phone" size={18} color={colors.onPrimary} />
          <Text style={styles.contactBtnText}>اتصال</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const title =
    page === 'delete-account'
      ? 'حذف الحساب'
      : page === 'support'
      ? 'تواصل مع الدعم الفني'
      : page === 'about'
      ? 'حول التطبيق'
      : page === 'password'
      ? 'تغيير كلمة المرور'
      : page === 'governorates'
      ? 'محافظة التسوق'
      : addressId
      ? 'تعديل العنوان'
      : 'إضافة عنوان';

  return (
    <View style={styles.container}>
      <Header title="حسابي" showBack onBack={() => navigateTo('home')} />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Identity Card */}
        <View style={styles.card}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <AppIcon name="user" size={30} color={isDarkMode ? '#CBD5E1' : colors.primary} />
            </View>
            <View style={styles.identityText}>
              <Text style={styles.heading}>
                {isAuthenticated ? user?.name || 'اسم المستخدم' : 'أهلاً بك في متجر بي اس'}
              </Text>
              <Text style={styles.text}>
                {isAuthenticated ? user?.phone : 'سجل الدخول لحفظ عناوينك ومتابعة طلباتك'}
              </Text>
            </View>
          </View>
          {isAuthenticated
            ? button('تغيير كلمة المرور', () => {
                setPasswordVisible(false);
                setPage('password');
              }, 'lock')
            : button('تسجيل الدخول / إنشاء حساب', () => navigateTo('auth'), 'arrow-right')}
        </View>

        {isAuthenticated && (
          <>
            {/* Shopping Governorate */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AppIcon name="map-pin" size={19} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                <Text style={styles.heading}>محافظة التسوق</Text>
              </View>
              <Text style={styles.cardHint}>تحديد محافظتك يتيح عرض المتاجر والعروض المناسبة لك بدقة</Text>
              {button(
                governorates.find((g) => g.id === governorateId)?.name || 'اختر المحافظة',
                () => setPage('governorates'),
                'map-pin',
                false,
                false,
                governorateId ? 'المحافظة الحالية' : 'اضغط للتحديد'
              )}
            </View>

            {/* Saved Addresses */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AppIcon name="house" size={19} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                <Text style={styles.heading}>عناويني المحفوظة</Text>
              </View>
              {addresses.length === 0 && <Text style={styles.text}>لم تحفظ عنواناً بعد.</Text>}
              {addresses.map((address) => (
                <View key={address.id} style={styles.addressCard}>
                  <View style={styles.addressTopRow}>
                    <View style={styles.addressLabelBadge}>
                      <Text style={styles.addressLabelText}>
                        {address.label || 'المنزل'}
                        {address.isDefault ? ' · الافتراضي' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.addressText}>
                    {[address.city, address.district, address.street, address.building]
                      .filter(Boolean)
                      .join('، ')}
                  </Text>
                  {!!address.description && (
                    <Text style={styles.addressSubText}>{address.description}</Text>
                  )}
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      onPress={() => openAddress(address)}
                      disabled={busy}
                      style={styles.smallActionBtn}
                      accessibilityRole="button"
                      accessibilityLabel="تعديل العنوان"
                    >
                      <AppIcon name="edit" size={15} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                      <Text style={styles.smallActionText}>تعديل</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeAddress(address)}
                      disabled={busy}
                      style={[styles.smallActionBtn, styles.smallActionBtnDanger]}
                      accessibilityRole="button"
                      accessibilityLabel="حذف العنوان"
                    >
                      <AppIcon name="trash" size={15} color={colors.error} />
                      <Text style={[styles.smallActionText, { color: colors.error }]}>حذف</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {button('إضافة عنوان جديد', () => openAddress(), 'plus')}
            </View>
          </>
        )}

        {/* Dark Mode Switch */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#64748B', true: isDarkMode ? '#CBD5E1' : colors.primary }}
              thumbColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
            />
            <View style={styles.themeRowRight}>
              <View style={styles.iconBadge}>
                <AppIcon
                  name={isDarkMode ? 'moon' : 'sun'}
                  size={18}
                  color={isDarkMode ? '#CBD5E1' : colors.primary}
                />
              </View>
              <Text style={styles.menuText}>الوضع الليلي</Text>
            </View>
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.card}>
          {button('تواصل مع الدعم الفني', () => setPage('support'), 'phone')}
          {button(
            'سياسة الخصوصية',
            () => {
              void Linking.openURL('https://ammar-zuhair.github.io/BS-Store-Policy/').catch(showError);
            },
            'shield'
          )}
          {button('حول التطبيق', () => setPage('about'), 'info')}
        </View>

        {/* Account Actions */}
        {isAuthenticated && (
          <View style={styles.card}>
            {button(
              'حذف الحساب',
              () => {
                setDeletionPassword('');
                setPage('delete-account');
              },
              'trash',
              true
            )}
            {button(
              'تسجيل الخروج',
              () =>
                Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'تسجيل الخروج', style: 'destructive', onPress: () => void logout() },
                ]),
              'logout',
              true
            )}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Profile Pages Modal with Complete Dark/Light Theme Integration */}
      <Modal visible={page !== null && !showMap} animationType="slide" onRequestClose={closePage}>
        <View style={styles.modalRoot}>
          <AppBackground isDark={isDarkMode} />
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={closePage}
                disabled={busy}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <AppIcon name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>{title}</Text>
              <View style={{ width: 42 }} />
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.content}>
              {page === 'support' && (
                <>
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <AppIcon name="phone" size={20} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                      <Text style={styles.heading}>إدارة متجر بي اس</Text>
                    </View>
                    <Text style={styles.text}>
                      للاستفسار عن طلباتك أو التحويلات أو لحل أي مشكلة في التطبيق، يسعد فريق الدعم بخدمتك عبر واتساب أو الاتصال المباشر.
                    </Text>
                    {phoneCard(SUPPORT_PHONE)}
                  </View>
                </>
              )}

              {page === 'about' && (
                <>
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <AppIcon name="info" size={20} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                      <Text style={styles.heading}>متجر بي اس · BS Store</Text>
                    </View>
                    <Text style={styles.text}>
                      تطبيق للتسوق من المتاجر والعروض المتاحة في محافظتك، مع إدارة عناوين التوصيل ومتابعة طلباتك أولاً بأول.
                    </Text>
                    <Text style={styles.text}>
                      يدعم الدفع عند الاستلام والتحويل المالي، وإرسال إيصال التحويل للإدارة لمراجعته واعتماده بكل سهولة.
                    </Text>
                    <Text style={styles.text}>
                      يمكنك معرفة أوقات استقبال الطلبات ومواعيد المتاجر من الواجهة الرئيسية وبطاقات المتاجر مباشرة.
                    </Text>
                    <View style={styles.versionBadge}>
                      <Text style={styles.versionText}>
                        إصدار التطبيق: {Constants.expoConfig?.version || '1.0.2'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <AppIcon name="user" size={20} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                      <Text style={styles.heading}>تم التطوير بواسطة: عمار المقطري</Text>
                    </View>
                    {phoneCard(DEVELOPER_PHONE)}
                  </View>
                </>
              )}

              {page === 'delete-account' && (
                <View style={styles.card}>
                  <Text style={styles.heading}>حذف الحساب وبياناتك الشخصية</Text>
                  <Text style={styles.text}>
                    الحذف نهائي. تُزال بيانات الاسم والهاتف والعناوين والموقع والسلة والإشعارات والجلسات وإيصالات التحويل. تبقى سجلات مبالغ الطلبات والمعاملات دون اسمك أو رقمك أو عنوانك.
                  </Text>
                  <Text style={styles.text}>
                    إذا كان لديك طلب قيد التنفيذ، أكمله أو ألغِه أولاً. يمكنك التواصل مع الدعم لطلب المساعدة في الحذف.
                  </Text>
                  <Text style={styles.label}>كلمة مرور الحساب</Text>
                  <TextInput
                    style={styles.input}
                    value={deletionPassword}
                    onChangeText={setDeletionPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                    maxLength={128}
                    placeholder="أدخل كلمة المرور للتأكيد"
                    placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                    accessibilityLabel="كلمة مرور الحساب لتأكيد الحذف"
                  />
                  {button(
                    'حذف الحساب عبر الموقع',
                    () => {
                      void Linking.openURL('https://ammar-zuhair.github.io/BS-Store-Delete/').catch(showError);
                    },
                    'info'
                  )}
                  <TouchableOpacity
                    style={[styles.primary, { backgroundColor: colors.error }]}
                    onPress={confirmAccountDeletion}
                    disabled={busy}
                    accessibilityRole="button"
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.primaryText, { color: '#FFFFFF' }]}>حذف حسابي نهائياً</Text>
                    )}
                  </TouchableOpacity>
                  {button('طلب مساعدة من الدعم', () => void openWhatsApp(SUPPORT_PHONE), 'message')}
                </View>
              )}

              {page === 'password' && (
                <View style={styles.card}>
                  {[
                    ['كلمة المرور الحالية', currentPassword, setCurrentPassword],
                    ['كلمة المرور الجديدة (8 أحرف على الأقل)', newPassword, setNewPassword],
                    ['تأكيد كلمة المرور الجديدة', confirmPassword, setConfirmPassword],
                  ].map(([label, value, setter], index) => (
                    <View key={index}>
                      <Text style={styles.label}>{label as string}</Text>
                      <TextInput
                        style={styles.input}
                        value={value as string}
                        onChangeText={setter as (v: string) => void}
                        secureTextEntry={!passwordVisible}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!busy}
                        placeholder={label as string}
                        placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                        textContentType={index === 0 ? 'password' : 'newPassword'}
                        accessibilityLabel={label as string}
                      />
                    </View>
                  ))}
                  {button(
                    passwordVisible ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور',
                    () => setPasswordVisible((v) => !v),
                    passwordVisible ? 'eye-off' : 'eye',
                    false,
                    false,
                    undefined,
                    false
                  )}
                  <TouchableOpacity
                    style={styles.primary}
                    onPress={() => void savePassword()}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.primaryText}>حفظ كلمة المرور</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {page === 'governorates' && (
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <AppIcon name="map-pin" size={20} color={isDarkMode ? '#CBD5E1' : colors.primary} />
                    <Text style={styles.heading}>اختر محافظة التسوق</Text>
                  </View>
                  <Text style={styles.cardHint}>تُعرض المنتجات والمتاجر بحسب توفرها في المحافظة المختارة</Text>
                  <View style={styles.buttonList}>
                    {governorates.map((g) => {
                      const isSelected = g.id === governorateId;
                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={[
                            styles.governorateTile,
                            isSelected && styles.governorateTileActive,
                          ]}
                          onPress={() => void saveGovernorate(g.id)}
                          disabled={busy}
                          accessibilityRole="button"
                          activeOpacity={0.75}
                        >
                          <View style={styles.governorateTileRight}>
                            <View style={[styles.iconBadge, isSelected && styles.iconBadgeActive]}>
                              <AppIcon
                                name="map-pin"
                                size={18}
                                color={isSelected ? colors.onPrimary : isDarkMode ? '#CBD5E1' : colors.primary}
                              />
                            </View>
                            <Text
                              style={[
                                styles.governorateTileText,
                                isSelected && styles.governorateTileTextActive,
                              ]}
                            >
                              {g.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.checkedBadge}>
                              <AppIcon name="check" size={15} color={colors.primary} />
                              <Text style={styles.checkedText}>الحالية</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {page === 'address' && (
                <View style={styles.card}>
                  <View style={styles.row}>
                    {(['المنزل', 'العمل', 'أخرى'] as const).map((label) => (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.chip,
                          draft.label === label && styles.chipActive,
                        ]}
                        onPress={() => setDraft((d) => ({ ...d, label }))}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            draft.label === label && styles.chipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(['city', 'district', 'street', 'building', 'description'] as const).map(
                    (key, index) => (
                      <View key={key}>
                        <Text style={styles.label}>
                          {
                            [
                              'المدينة *',
                              'الحي',
                              'الشارع *',
                              'المبنى / المنزل',
                              'علامة مميزة وتعليمات التوصيل',
                            ][index]
                          }
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={draft[key] || ''}
                          onChangeText={(value) => setDraft((d) => ({ ...d, [key]: value }))}
                          editable={!busy}
                          textAlign="right"
                          placeholder={[
                            'مثال: صنعاء، عدن...',
                            'مثال: حدة، المعلا...',
                            'اسم الشارع أو الشارع الرئيسي...',
                            'رقم أو اسم المبنى...',
                            'أي تفاصيل تساعد مندوب التوصيل...',
                          ][index]}
                          placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                        />
                      </View>
                    )
                  )}
                  {button(
                    draft.latitude || draft.longitude
                      ? 'تعديل الموقع على الخريطة ✓'
                      : 'تحديد الموقع على الخريطة *',
                    () => setShowMap(true),
                    'map-pin',
                    false,
                    false,
                    draft.latitude || draft.longitude ? 'تم التحديد' : 'مطلوب'
                  )}
                  <View style={styles.row}>
                    <Switch
                      value={draft.isDefault}
                      onValueChange={(value) => setDraft((d) => ({ ...d, isDefault: value }))}
                      trackColor={{ false: '#64748B', true: isDarkMode ? '#CBD5E1' : colors.primary }}
                      thumbColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
                    />
                    <Text style={styles.menuText}>عنواني الافتراضي</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primary}
                    onPress={() => void saveAddress()}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.primaryText}>حفظ العنوان</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAwareScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <LocationPickerModal
        visible={showMap}
        initialLat={draft.latitude || undefined}
        initialLng={draft.longitude || undefined}
        initialDistrict={draft.district}
        onClose={() => setShowMap(false)}
        onConfirm={(location) => {
          setDraft((d) => ({
            ...d,
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city || d.city,
            district: location.district || d.district,
            street: location.street || d.street,
          }));
          setShowMap(false);
        }}
      />
    </View>
  );
};

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 18, paddingBottom: 110, gap: 16 },

    // Card Glass Surface
    card: {
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.16)' : 'rgba(203, 213, 225, 0.65)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
    },
    cardHint: {
      fontFamily: 'Tajawal_400Regular',
      fontSize: 13,
      color: c.onSurfaceVariant,
      textAlign: 'right',
      marginTop: -4,
    },

    // Identity Section
    identity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
    identityText: { flex: 1 },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.12)' : 'rgba(17, 24, 39, 0.06)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.22)' : 'rgba(17, 24, 39, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heading: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 18,
      color: c.onSurface,
      textAlign: 'right',
    },
    subheading: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 16,
      color: c.onSurface,
      textAlign: 'right',
    },
    text: {
      fontFamily: 'Tajawal_400Regular',
      fontSize: 15,
      lineHeight: 24,
      color: c.onSurfaceVariant,
      textAlign: 'right',
    },

    // Upgraded Button Tile Component
    menuButton: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(24, 32, 47, 0.70)' : 'rgba(241, 245, 249, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.14)' : 'rgba(203, 213, 225, 0.55)',
    },
    menuButtonDanger: {
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.25)',
      backgroundColor: isDark ? 'rgba(69, 26, 26, 0.25)' : 'rgba(254, 226, 226, 0.35)',
    },
    menuRightCol: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    menuLeftCol: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.10)' : 'rgba(17, 24, 39, 0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.15)' : 'rgba(17, 24, 39, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadgeDanger: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.08)',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(220, 38, 38, 0.15)',
    },
    menuText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 15,
      textAlign: 'right',
      color: c.onSurface,
      flex: 1,
    },
    menuTrailingText: {
      fontFamily: 'Tajawal_500Medium',
      fontSize: 13,
      color: c.onSurfaceVariant,
    },
    compactButton: {
      flex: 1,
      minHeight: 42,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    compactButtonText: {
      fontSize: 14,
    },

    // Saved Addresses
    addressCard: {
      backgroundColor: isDark ? 'rgba(20, 27, 40, 0.65)' : 'rgba(248, 250, 252, 0.90)',
      borderRadius: 14,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.14)' : 'rgba(203, 213, 225, 0.50)',
    },
    addressTopRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    addressLabelBadge: {
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.12)' : 'rgba(17, 24, 39, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    addressLabelText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 13,
      color: c.onSurface,
    },
    addressText: {
      fontFamily: 'Tajawal_500Medium',
      fontSize: 14,
      color: c.onSurface,
      textAlign: 'right',
    },
    addressSubText: {
      fontFamily: 'Tajawal_400Regular',
      fontSize: 13,
      color: c.onSurfaceVariant,
      textAlign: 'right',
    },
    addressActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    smallActionBtn: {
      flex: 1,
      minHeight: 38,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.18)' : '#CBD5E1',
      backgroundColor: isDark ? 'rgba(25, 34, 50, 0.6)' : '#FFFFFF',
    },
    smallActionBtnDanger: {
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.25)',
      backgroundColor: isDark ? 'rgba(69, 26, 26, 0.2)' : 'rgba(254, 226, 226, 0.3)',
    },
    smallActionText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 13,
      color: c.onSurface,
    },

    // Row Layouts
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    themeRowRight: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },

    // Modal Presentation
    modalRoot: {
      flex: 1,
      backgroundColor: isDark ? '#080A0E' : '#EEF2F6',
    },
    modalSafeArea: {
      flex: 1,
    },
    modalHeader: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(18, 24, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(203, 213, 225, 0.16)' : 'rgba(15, 23, 42, 0.08)',
    },
    modalHeaderTitle: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 18,
      color: c.onSurface,
      textAlign: 'center',
    },
    modalCloseBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.12)' : 'rgba(17, 24, 39, 0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.18)' : 'rgba(17, 24, 39, 0.1)',
    },

    // Form Inputs & Labels
    label: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 15,
      textAlign: 'right',
      color: c.onSurface,
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      fontFamily: 'Tajawal_400Regular',
      fontSize: 16,
      color: c.onSurface,
      backgroundColor: isDark ? 'rgba(20, 27, 40, 0.85)' : '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.22)' : '#CBD5E1',
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 50,
      textAlign: 'right',
    },
    primary: {
      backgroundColor: c.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      minHeight: 52,
      marginTop: 8,
    },
    primaryText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 16,
      color: c.onPrimary,
    },
    chip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.2)' : '#CBD5E1',
      backgroundColor: isDark ? 'rgba(24, 32, 47, 0.6)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.2)' : c.primary,
      borderColor: isDark ? '#CBD5E1' : c.primary,
    },
    chipText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 14,
      color: c.onSurfaceVariant,
    },
    chipTextActive: {
      color: isDark ? '#FFFFFF' : c.onPrimary,
    },

    // Governorate Selector in Modal
    buttonList: {
      gap: 10,
      marginTop: 6,
    },
    governorateTile: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(24, 32, 47, 0.70)' : 'rgba(241, 245, 249, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(203, 213, 225, 0.14)' : 'rgba(203, 213, 225, 0.55)',
      minHeight: 52,
    },
    governorateTileActive: {
      borderColor: isDark ? '#CBD5E1' : c.primary,
      borderWidth: 1.5,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.90)' : 'rgba(226, 232, 240, 0.95)',
    },
    governorateTileRight: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 12,
    },
    governorateTileText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 16,
      color: c.onSurface,
    },
    governorateTileTextActive: {
      color: isDark ? '#FFFFFF' : c.primary,
    },
    iconBadgeActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkedBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.15)' : 'rgba(17, 24, 39, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    checkedText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 12,
      color: c.primary,
    },

    // Phone / Contact Card
    phoneSection: {
      marginTop: 6,
      gap: 12,
      alignItems: 'center',
    },
    phone: {
      fontFamily: 'Tajawal_800ExtraBold',
      fontSize: 24,
      color: c.onSurface,
      letterSpacing: 1,
      textAlign: 'center',
    },
    phoneBtnRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
    },
    contactBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    whatsappBtn: {
      backgroundColor: '#10B981',
    },
    callBtn: {
      backgroundColor: c.primary,
    },
    contactBtnText: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 15,
      color: c.onPrimary,
    },
    contactBtnTextLight: {
      fontFamily: 'Tajawal_700Bold',
      fontSize: 15,
      color: '#FFFFFF',
    },
    versionBadge: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(203, 213, 225, 0.10)' : 'rgba(17, 24, 39, 0.06)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      marginTop: 4,
    },
    versionText: {
      fontFamily: 'Tajawal_500Medium',
      fontSize: 13,
      color: c.onSurfaceVariant,
    },
  });
