import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Modal, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { authApi, governorateApi } from '../api';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { Address } from '../types';

const emptyAddress = (): Omit<Address, 'id'> => ({ label: 'أخرى', city: '', district: '', street: '', building: '', description: '', latitude: 0, longitude: 0, isDefault: false });
const SUPPORT_PHONE = '783053937';
const DEVELOPER_PHONE = '775479340';

export const ProfileScreen: React.FC = () => {
  const { user, addresses, logout, addNewAddress, updateSavedAddress, deleteSavedAddress, navigateTo, isAuthenticated, isDarkMode, toggleTheme, colors, refreshCatalog, refreshData } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    Promise.all([governorateApi.list(), governorateApi.mine()]).then(([list, mine]) => {
      if (active) { setGovernorates(list); setGovernorateId(mine.governorateId || ''); }
    }).catch(() => {});
    void refreshData().catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated]);

  const showError = (error: any) => Alert.alert('تعذر إكمال العملية', error?.message || 'تحقق من الاتصال وحاول مجدداً.');
  const openWhatsApp = async (phone: string) => {
    try { await Linking.openURL(`https://wa.me/967${phone}`); } catch { Alert.alert('تعذر فتح واتساب', 'تأكد من توفر واتساب أو متصفح على جهازك.'); }
  };
  const button = (label: string, onPress: () => void, icon: AppIconName = 'chevron-left', danger = false, compact = false) => (
    <TouchableOpacity onPress={onPress} disabled={busy} style={[styles.menu, compact && styles.addressAction]} accessibilityRole="button" accessibilityLabel={label}>
      <AppIcon name={icon} size={20} color={danger ? colors.error : colors.primary} />
      <Text style={[styles.menuText, danger && { color: colors.error }]}>{label}</Text>
    </TouchableOpacity>
  );
  const openAddress = (address?: Address) => {
    setAddressId(address?.id || null); setDraft(address ? { ...address } : emptyAddress()); setPage('address');
  };
  const saveAddress = async () => {
    if (!draft.city.trim() || !draft.street.trim() || (!draft.latitude && !draft.longitude)) {
      Alert.alert('بيانات ناقصة', 'أدخل المدينة والشارع وحدد موقع العنوان على الخريطة.'); return;
    }
    setBusy(true);
    try {
      if (addressId) await updateSavedAddress(addressId, draft); else await addNewAddress(draft);
      setPage(null); Alert.alert('تم الحفظ', addressId ? 'تم تعديل عنوانك.' : 'تمت إضافة العنوان.');
    } catch (e) { showError(e); } finally { setBusy(false); }
  };
  const removeAddress = (address: Address) => Alert.alert('حذف العنوان', 'هل تريد حذف هذا العنوان من عناوينك المحفوظة؟ تبقى عناوين الطلبات السابقة محفوظة.', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'حذف', style: 'destructive', onPress: async () => { setBusy(true); try { await deleteSavedAddress(address.id); } catch (e) { showError(e); } finally { setBusy(false); } } },
  ]);
  const savePassword = async () => {
    if (!currentPassword || newPassword.length < 8) { Alert.alert('تحقق من كلمة المرور', 'أدخل كلمة المرور الحالية وكلمة جديدة من 8 أحرف على الأقل.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('تحقق من كلمة المرور', 'تأكيد كلمة المرور لا يطابق الكلمة الجديدة.'); return; }
    setBusy(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPage(null);
      Alert.alert('تم التغيير', 'تم تغيير كلمة المرور.');
    } catch (e) { showError(e); } finally { setBusy(false); }
  };
  const confirmAccountDeletion = () => {
    if (!deletionPassword) { Alert.alert('كلمة المرور مطلوبة', 'أدخل كلمة مرور حسابك لتأكيد ملكيته.'); return; }
    Alert.alert('حذف الحساب نهائياً', 'سيُحذف حسابك وبياناتك الشخصية، ولن تتمكن من استعادته. هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف نهائي', style: 'destructive', onPress: async () => {
        setBusy(true);
        try {
          await authApi.deleteAccount(deletionPassword);
          setDeletionPassword(''); setPage(null);
          await logout();
          Alert.alert('تم حذف الحساب', 'حُذفت بياناتك الشخصية وجلسات الدخول. تُستكمل إزالة ملفات الإيصالات تلقائياً.');
        } catch (e) { showError(e); } finally { setBusy(false); }
      } },
    ]);
  };
  const saveGovernorate = async (id: string) => {
    setBusy(true);
    try { await governorateApi.update(id); setGovernorateId(id); await refreshCatalog(); setPage(null); } catch (e) { showError(e); } finally { setBusy(false); }
  };
  const closePage = () => {
    if (busy) return;
    if (page === 'password') { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordVisible(false); }
    setDeletionPassword('');
    setPage(null);
  };
  const phoneCard = (phone: string) => <View style={styles.card}>
    <Text style={styles.phone}>{phone}</Text>
    {button('التواصل عبر واتساب', () => void openWhatsApp(phone), 'message')}
    {button('اتصال هاتفي', () => { void Linking.openURL(`tel:+967${phone}`).catch(showError); }, 'phone')}
  </View>;
  const title = page === 'delete-account' ? 'حذف الحساب' : page === 'support' ? 'تواصل مع الدعم الفني' : page === 'about' ? 'حول التطبيق' : page === 'password' ? 'تغيير كلمة المرور' : page === 'governorates' ? 'محافظة التسوق' : addressId ? 'تعديل العنوان' : 'إضافة عنوان';

  return <View style={styles.container}>
    <Header title="حسابي" showBack onBack={() => navigateTo('home')} />
    <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.identity}>
          <View style={styles.avatar}><AppIcon name="user" size={30} color={colors.primary} /></View>
          <View style={styles.identityText}>
            <Text style={styles.heading}>{isAuthenticated ? user?.name || 'اسم المستخدم' : 'أهلاً بك في متجر بي اس'}</Text>
            <Text style={styles.text}>{isAuthenticated ? user?.phone : 'سجل الدخول لحفظ عناوينك ومتابعة طلباتك'}</Text>
          </View>
        </View>
        {isAuthenticated ? button('تغيير كلمة المرور', () => { setPasswordVisible(false); setPage('password'); }, 'lock') : button('تسجيل الدخول / إنشاء حساب', () => navigateTo('auth'), 'arrow-right')}
      </View>
      {isAuthenticated && <>
        <View style={styles.card}>
          <Text style={styles.heading}>محافظة التسوق</Text>
          {button(governorates.find(g => g.id === governorateId)?.name || 'اختر المحافظة', () => setPage('governorates'), 'map-pin')}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>عناويني المحفوظة</Text>
          {addresses.length === 0 && <Text style={styles.text}>لم تحفظ عنواناً بعد.</Text>}
          {addresses.map(address => <View key={address.id} style={styles.address}>
            <Text style={styles.subheading}>{address.label || 'المنزل'}{address.isDefault ? ' · الافتراضي' : ''}</Text>
            <Text style={styles.text}>{[address.city, address.district, address.street, address.building].filter(Boolean).join('، ')}</Text>
            {!!address.description && <Text style={styles.text}>{address.description}</Text>}
            <View style={styles.addressActions}>
              {button('تعديل', () => openAddress(address), 'edit', false, true)}
              {button('حذف', () => removeAddress(address), 'trash', true, true)}
            </View>
          </View>)}
          {button('إضافة عنوان جديد', () => openAddress(), 'plus')}
        </View>
      </>}
      <View style={styles.card}>
        <View style={styles.row}>
          <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: colors.outline, true: colors.primary }} />
          <Text style={styles.menuText}>الوضع الليلي</Text>
        </View>
      </View>
      <View style={styles.card}>
        {button('تواصل مع الدعم الفني', () => setPage('support'), 'phone')}
        {button('سياسة الخصوصية', () => { void Linking.openURL('https://ammar-zuhair.github.io/BS-Store-Policy/').catch(showError); }, 'info')}
        {button('حول التطبيق', () => setPage('about'), 'info')}
      </View>
      {isAuthenticated && <View style={styles.card}>
        {button('حذف الحساب', () => { setDeletionPassword(''); setPage('delete-account'); }, 'trash', true)}
        {button('تسجيل الخروج', () => Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
        { text: 'إلغاء', style: 'cancel' }, { text: 'تسجيل الخروج', style: 'destructive', onPress: () => void logout() },
      ]), 'logout', true)}</View>}
    </KeyboardAwareScrollView>

    <Modal visible={page !== null && !showMap} animationType="slide" onRequestClose={closePage}>
      <SafeAreaView style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closePage} disabled={busy} accessibilityRole="button" accessibilityLabel="إغلاق"><AppIcon name="close" size={25} color={colors.onSurface} /></TouchableOpacity>
          <Text style={styles.heading}>{title}</Text>
        </View>
        <KeyboardAwareScrollView contentContainerStyle={styles.content}>
          {page === 'support' && <>
            <Text style={styles.heading}>إدارة متجر بي اس</Text>
            <Text style={styles.text}>للاستفسار عن طلباتك أو التحويلات أو لحل مشكلة في التطبيق، تواصل مع الإدارة.</Text>
            {phoneCard(SUPPORT_PHONE)}
          </>}
          {page === 'about' && <>
            <View style={styles.card}>
              <Text style={styles.heading}>متجر بي اس · BS Store</Text>
              <Text style={styles.text}>تطبيق للتسوق من المتاجر والعروض المتاحة في محافظتك، مع إدارة عناوين التوصيل ومتابعة طلباتك.</Text>
              <Text style={styles.text}>يدعم الدفع عند الاستلام والتحويل، وإرسال إيصال التحويل للإدارة لمراجعته واعتماده.</Text>
              <Text style={styles.text}>يمكنك معرفة أوقات استقبال الطلبات ومواعيد المتاجر من الواجهة الرئيسية وبطاقات المتاجر.</Text>
              <Text style={styles.text}>إصدار التطبيق: {Constants.expoConfig?.version || '1.0.1'}</Text>
            </View>
            <Text style={styles.heading}>تم التطوير بواسطة: عمار المقطري</Text>
            {phoneCard(DEVELOPER_PHONE)}
          </>}
          {page === 'delete-account' && <View style={styles.card}>
            <Text style={styles.heading}>حذف الحساب وبياناتك الشخصية</Text>
            <Text style={styles.text}>الحذف نهائي. تُزال بيانات الاسم والهاتف والعناوين والموقع والسلة والإشعارات والجلسات وإيصالات التحويل. تبقى سجلات مبالغ الطلبات والمعاملات دون اسمك أو رقمك أو عنوانك.</Text>
            <Text style={styles.text}>إذا كان لديك طلب قيد التنفيذ، أكمله أو ألغِه أولاً. يمكنك التواصل مع الدعم لطلب المساعدة في الحذف.</Text>
            <Text style={styles.label}>كلمة مرور الحساب</Text>
            <TextInput style={styles.input} value={deletionPassword} onChangeText={setDeletionPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={128} accessibilityLabel="كلمة مرور الحساب لتأكيد الحذف" />
            {button('حذف الحساب عبر الموقع', () => { void Linking.openURL('https://ammar-zuhair.github.io/BS-Store-Delete/').catch(showError); }, 'info')}
            <TouchableOpacity style={[styles.primary, { backgroundColor: colors.error }]} onPress={confirmAccountDeletion} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>حذف حسابي نهائياً</Text>}
            </TouchableOpacity>
            {button('طلب مساعدة من الدعم', () => void openWhatsApp(SUPPORT_PHONE), 'message')}
          </View>}
          {page === 'password' && <View style={styles.card}>
            {[
              ['كلمة المرور الحالية', currentPassword, setCurrentPassword],
              ['كلمة المرور الجديدة (8 أحرف على الأقل)', newPassword, setNewPassword],
              ['تأكيد كلمة المرور الجديدة', confirmPassword, setConfirmPassword],
            ].map(([label, value, setter], index) => <View key={index}>
              <Text style={styles.label}>{label as string}</Text>
              <TextInput style={styles.input} value={value as string} onChangeText={setter as (v: string) => void} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} editable={!busy} textContentType={index === 0 ? 'password' : 'newPassword'} accessibilityLabel={label as string} />
            </View>)}
            {button(passwordVisible ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور', () => setPasswordVisible(v => !v), passwordVisible ? 'eye-off' : 'eye')}
            <TouchableOpacity style={styles.primary} onPress={() => void savePassword()} disabled={busy}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>حفظ كلمة المرور</Text>}</TouchableOpacity>
          </View>}
          {page === 'governorates' && <View style={styles.card}>{governorates.map(g => <View key={g.id}>{button(g.name + (g.id === governorateId ? ' ✓' : ''), () => void saveGovernorate(g.id), 'map-pin')}</View>)}</View>}
          {page === 'address' && <View style={styles.card}>
            <View style={styles.row}>{(['المنزل', 'العمل', 'أخرى'] as const).map(label => <TouchableOpacity key={label} style={[styles.chip, draft.label === label && { backgroundColor: colors.primary + '20' }]} onPress={() => setDraft(d => ({ ...d, label }))}><Text style={styles.text}>{label}</Text></TouchableOpacity>)}</View>
            {(['city', 'district', 'street', 'building', 'description'] as const).map((key, index) => <View key={key}>
              <Text style={styles.label}>{['المدينة *', 'الحي', 'الشارع *', 'المبنى / المنزل', 'علامة مميزة وتعليمات التوصيل'][index]}</Text>
              <TextInput style={styles.input} value={draft[key] || ''} onChangeText={value => setDraft(d => ({ ...d, [key]: value }))} editable={!busy} textAlign="right" />
            </View>)}
            {button(draft.latitude || draft.longitude ? 'تعديل الموقع على الخريطة ✓' : 'تحديد الموقع على الخريطة *', () => setShowMap(true), 'map-pin')}
            <View style={styles.row}><Switch value={draft.isDefault} onValueChange={value => setDraft(d => ({ ...d, isDefault: value }))} /><Text style={styles.text}>عنواني الافتراضي</Text></View>
            <TouchableOpacity style={styles.primary} onPress={() => void saveAddress()} disabled={busy}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>حفظ العنوان</Text>}</TouchableOpacity>
          </View>}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
    <LocationPickerModal visible={showMap} initialLat={draft.latitude || undefined} initialLng={draft.longitude || undefined} initialDistrict={draft.district} onClose={() => setShowMap(false)} onConfirm={location => {
      setDraft(d => ({ ...d, latitude: location.latitude, longitude: location.longitude, city: location.city || d.city, district: location.district || d.district, street: location.street || d.street })); setShowMap(false);
    }} />
  </View>;
};

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 18, paddingBottom: 110, gap: 16 },
  card: { backgroundColor: c.surfaceContainerLowest, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: c.outline + '30' },
  identity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  identityText: { flex: 1 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: 'Tajawal_700Bold', fontSize: 21, color: c.onSurface, textAlign: 'right' },
  subheading: { fontFamily: 'Tajawal_700Bold', fontSize: 17, color: c.onSurface, textAlign: 'right' },
  text: { fontFamily: 'Tajawal_400Regular', fontSize: 16, lineHeight: 26, color: c.onSurfaceVariant, textAlign: 'right' },
  phone: { fontFamily: 'Tajawal_700Bold', fontSize: 26, color: c.onSurface, textAlign: 'center' },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, minHeight: 48 },
  menuText: { fontFamily: 'Tajawal_500Medium', fontSize: 17, textAlign: 'right', color: c.onSurface, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  address: { borderBottomWidth: 1, borderBottomColor: c.outline + '30', paddingBottom: 10, gap: 4 },
  addressActions: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  addressAction: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 8 },
  modalHeader: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.outline + '30' },
  label: { fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: 'right', color: c.onSurface, marginBottom: 8, marginTop: 8 },
  input: { fontFamily: 'Tajawal_400Regular', fontSize: 17, color: c.onSurface, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.outline + '65', padding: 12, minHeight: 48 },
  primary: { backgroundColor: c.primary, borderRadius: 12, alignItems: 'center', padding: 14, minHeight: 50 },
  primaryText: { fontFamily: 'Tajawal_700Bold', fontSize: 17, color: c.onPrimary },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.outline + '50' },
});
