import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { governorateApi } from '../api';
import { AppIcon } from '../components/AppIcon';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';

export const ProfileScreen: React.FC = () => {
  const {
    user,
    addresses,
    orders,
    logout,
    addNewAddress,
    setCurrentOrder,
    navigateTo,
    isAuthenticated,
    isDarkMode,
    toggleTheme,
    colors: themeColors,
    refreshCatalog,
  } = useApp();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [desc, setDesc] = useState('');
  const [governorates, setGovernorates] = useState<{id:string;name:string}[]>([]);
  const [governorateId, setGovernorateId] = useState('');
  const [showGovernorates, setShowGovernorates] = useState(false);
  useEffect(() => { if (isAuthenticated) Promise.all([governorateApi.list(), governorateApi.mine()]).then(([list, mine]) => { setGovernorates(list); setGovernorateId(mine.governorateId || ''); }).catch(() => {}); }, [isAuthenticated]);
  const saveGovernorate = async (id: string) => { try { await governorateApi.update(id); setGovernorateId(id); setShowGovernorates(false); await refreshCatalog(); Alert.alert('تم التحديث', 'تم تغيير محافظة حسابك وتحديث قائمة المتاجر.'); } catch (e:any) { Alert.alert('تعذر التحديث', e?.message || 'حاول مرة أخرى.'); } };

  const handleSaveAddress = () => {
    if (!city.trim() || !district.trim() || !street.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المدينة والحي والشارع');
      return;
    }
    addNewAddress({
      label: 'أخرى',
      city: city.trim(),
      district: district.trim(),
      street: street.trim(),
      description: desc.trim(),
      latitude: 0,
      longitude: 0,
      isDefault: false,
    });
    setCity('');
    setDistrict('');
    setStreet('');
    setDesc('');
    setShowAddAddress(false);
    Alert.alert('تم بنجاح', 'تمت إضافة العنوان الجديد إلى قائمتك');
  };

  return (
    <View style={styles.container}>
      <Header title="حسابي والملف الشخصي" showBack onBack={() => navigateTo('home')} />

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card / Guest Card */}
        {!isAuthenticated ? (
          <View style={styles.guestCard}>
            <View style={styles.avatarIconWrap}>
              <AppIcon name="sparkles" size={23} color={themeColors.primary} />
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>أهلاً بك في متجر بي اس</Text>
              <Text style={styles.guestSubtitle}>
                سجل الدخول لإدارة طلباتك، تتبع شحناتك، وحفظ عناوينك
              </Text>
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigateTo('auth')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="تسجيل الدخول أو إنشاء حساب"
              >
                <AppIcon name="arrow-right" size={16} color={themeColors.onPrimary} />
                <Text style={styles.loginBtnText}>تسجيل الدخول / إنشاء حساب</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.userCard}>
            <View style={styles.avatarIconWrap}>
              <AppIcon name="user" size={22} color={themeColors.primary} />
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                {!!user?.name && <Text style={styles.userName}>{user.name}</Text>}
              </View>
              <Text style={styles.userPhone}>{user?.phone || ''}</Text>
            </View>
          </View>
        )}

        {/* Appearance & Dark Mode Toggle Card */}
        {isAuthenticated && <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>محافظة التسوق</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowGovernorates(true)}
            accessibilityRole="button"
            accessibilityLabel="اختيار محافظة التسوق"
          >
            <AppIcon name="chevron-down" size={18} color={themeColors.onSurfaceVariant} />
            <Text style={styles.menuText}>{governorates.find(g => g.id === governorateId)?.name || 'اختر المحافظة'}</Text>
          </TouchableOpacity>
        </View>}
        <Modal visible={showGovernorates} transparent animationType="slide" onRequestClose={() => setShowGovernorates(false)}>
          <View style={styles.governorateOverlay}>
            <View style={styles.governorateSheet}>
              <Text style={styles.governorateTitle}>اختر المحافظة</Text>
              <ScrollView>
                {governorates.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={styles.governorateOption}
                    onPress={() => saveGovernorate(g.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={g.name}
                    accessibilityState={{ checked: g.id === governorateId }}
                  >
                    <Text style={styles.governorateOptionText}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>المظهر والتفضيلات</Text>
          <View style={styles.themeRow}>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              accessibilityLabel="تبديل الوضع الداكن"
              trackColor={{ false: themeColors.surfaceContainerHighest, true: themeColors.primary }}
              thumbColor={isDarkMode ? themeColors.onPrimary : '#FFFFFF'}
            />
            <View style={styles.themeInfo}>
              <View style={styles.themeTitleRow}>
                <Text style={styles.themeTitle}>
                  {isDarkMode ? 'الوضع الداكن (الليلي)' : 'الوضع الفاتح (النهاري)'}
                </Text>
                <AppIcon name={isDarkMode ? 'moon' : 'sun'} size={18} color={themeColors.primary} />
              </View>
              <Text style={styles.themeDesc}>
                {isDarkMode
                  ? 'مظهر داكن مريح للعين في الإضاءة الخافتة'
                  : 'المظهر الافتراضي المشرق عالي الوضوح'}
              </Text>
            </View>
          </View>
        </View>

        {/* Saved Addresses Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => setShowAddAddress(!showAddAddress)}
              accessibilityRole="button"
              accessibilityLabel={showAddAddress ? 'إلغاء إضافة العنوان' : 'إضافة عنوان'}
            >
              <View style={styles.actionRow}>
                {!showAddAddress && <AppIcon name="plus" size={15} color={themeColors.primary} />}
                <Text style={styles.actionText}>{showAddAddress ? 'إلغاء' : 'إضافة عنوان'}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>العناوين المحفوظة</Text>
          </View>

          {showAddAddress && (
            <View style={styles.addAddressForm}>
              <Text style={styles.formTitle}>إضافة عنوان جديد</Text>
              <TextInput
                style={styles.input}
                placeholder="المدينة (مثال: صنعاء، عدن، تعز، ...)"
                placeholderTextColor={themeColors.outline}
                value={city}
                onChangeText={setCity}
                textAlign="right"
                accessibilityLabel="المدينة"
              />
              <TextInput
                style={styles.input}
                placeholder="الحي / المنطقة"
                placeholderTextColor={themeColors.outline}
                value={district}
                onChangeText={setDistrict}
                textAlign="right"
                accessibilityLabel="الحي أو المنطقة"
              />
              <TextInput
                style={styles.input}
                placeholder="الشارع أو المعلم البارز"
                placeholderTextColor={themeColors.outline}
                value={street}
                onChangeText={setStreet}
                textAlign="right"
                accessibilityLabel="الشارع أو المعلم البارز"
              />
              <TextInput
                style={styles.input}
                placeholder="تفاصيل إضافية (عمارة، شقة، علامة مميزة)"
                placeholderTextColor={themeColors.outline}
                value={desc}
                onChangeText={setDesc}
                textAlign="right"
                accessibilityLabel="تفاصيل إضافية للعنوان"
              />
              <TouchableOpacity
                style={styles.saveAddrBtn}
                onPress={handleSaveAddress}
                accessibilityRole="button"
                accessibilityLabel="حفظ العنوان"
              >
                <Text style={styles.saveAddrBtnText}>حفظ العنوان</Text>
              </TouchableOpacity>
            </View>
          )}

          {addresses.length === 0 ? (
            <Text style={styles.emptyNotice}>لا توجد عناوين محفوظة حتى الآن</Text>
          ) : (
            addresses.map((addr) => (
              <View key={addr.id} style={styles.addressRow}>
                <View style={styles.addrIconWrap}>
                  <AppIcon
                    name={addr.label === 'المنزل' ? 'house' : 'building'}
                    size={19}
                    color={themeColors.primary}
                  />
                </View>
                <View style={styles.addrInfo}>
                  <View style={styles.addrLabelRow}>
                    <Text style={styles.addrLabel}>{addr.label}</Text>
                    {addr.isDefault && <Text style={styles.defaultBadge}>الرئيسي</Text>}
                  </View>
                  <Text style={styles.addrStreet}>
                    {addr.city ? `${addr.city} - ` : ''}{addr.district}، {addr.street}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Past Orders History */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>سجل الطلبات السابقة</Text>
          {orders.length === 0 ? (
            <Text style={styles.emptyNotice}>لا توجد طلبات سابقة حتى الآن</Text>
          ) : (
            orders.map((ord) => (
              <View key={ord.id} style={styles.orderHistoryItem}>
                <View style={styles.orderHistoryTop}>
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => {
                      setCurrentOrder(ord);
                      navigateTo('tracking');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={'تتبع الطلب رقم ' + ord.orderNumber}
                  >
                    <Text style={styles.trackBtnText}>تتبع</Text>
                  </TouchableOpacity>
                  <View style={styles.orderHistoryInfo}>
                    <Text style={styles.orderHistNum}>طلب #{ord.orderNumber}</Text>
                    <Text style={styles.orderHistDate}>{ord.createdAt}</Text>
                  </View>
                </View>
                <View style={styles.orderHistoryBottom}>
                  <Text style={styles.orderHistTotal}>
                    {ord.totalAmount.toLocaleString()} ر.ي
                  </Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {ord.status === 'DELIVERED'
                        ? 'تم التوصيل'
                        : ord.status === 'OUT_FOR_DELIVERY'
                        ? 'في الطريق'
                        : 'قيد التنفيذ'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Support & Logout */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('خدمة العملاء', 'بيانات الدعم غير متاحة حالياً.')}
            accessibilityRole="button"
            accessibilityLabel="مركز المساعدة والدعم الفني"
          >
            <AppIcon name="chevron-left" size={18} color={themeColors.onSurfaceVariant} />
            <View style={styles.menuTitleRow}>
              <Text style={styles.menuText}>مركز المساعدة والدعم الفني</Text>
              <AppIcon name="message" size={19} color={themeColors.primary} />
            </View>
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel="تسجيل الخروج"
            >
              <AppIcon name="chevron-left" size={18} color={themeColors.error} />
              <View style={styles.menuTitleRow}>
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
                <AppIcon name="logout" size={19} color={themeColors.error} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.screenGutter,
      paddingVertical: spacing.baseSm,
      paddingBottom: 130,
    },
    guestCard: {
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: borderRadius.xl,
      padding: spacing.baseMd,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginBottom: spacing.baseSm,
      borderWidth: 1,
      borderColor: c.primary + '30',
      ...shadows.card,
    },
    guestInfo: {
      flex: 1,
      alignItems: 'flex-end',
    },
    guestTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
    },
    guestSubtitle: {
      fontSize: typography.fontSize.xs,
      color: c.onSurfaceVariant,
      marginTop: 2,
      marginBottom: spacing.baseXs,
      textAlign: 'right',
    },
    loginBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: spacing.baseSm,
      minHeight: 44,
      borderRadius: borderRadius.lg,
      marginTop: 4,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    loginBtnText: {
      color: c.onPrimary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
    },
    userCard: {
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: borderRadius.xl,
      padding: spacing.baseMd,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginBottom: spacing.baseSm,
      borderWidth: 1,
      borderColor: c.outlineVariant + '40',
      ...shadows.card,
    },
    avatarIconWrap: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.full,
      backgroundColor: c.primaryFixed + '40',
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.baseSm,
    },
    actionRow: {
      minHeight: 44,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
    },
    userInfo: {
      flex: 1,
      alignItems: 'flex-end',
    },
    nameRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
    },
    userName: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
    },
    userPhone: {
      fontSize: typography.fontSize.xs,
      color: c.onSurfaceVariant,
      marginTop: 2,
    },
    sectionCard: {
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: borderRadius.xl,
      padding: spacing.baseMd,
      marginBottom: spacing.baseSm,
      borderWidth: 1,
      borderColor: c.outlineVariant + '40',
      ...shadows.card,
    },
    governorateOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.52)',
    },
    governorateSheet: {
      maxHeight: '70%',
      backgroundColor: c.surfaceContainerLowest,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      padding: spacing.baseMd,
    },
    governorateTitle: {
      textAlign: 'right',
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
      marginBottom: spacing.baseSm,
    },
    governorateOption: {
      minHeight: 48,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.outlineVariant,
    },
    governorateOptionText: {
      textAlign: 'right',
      color: c.onSurface,
      fontSize: typography.fontSize.md,
    },
    sectionHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.baseSm,
    },
    sectionTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
      textAlign: 'right',
    },
    actionText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: c.primary,
    },
    themeRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    themeInfo: {
      alignItems: 'flex-end',
      flex: 1,
      marginRight: spacing.baseSm,
    },
    themeTitleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
    },
    themeTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
    },
    themeIcon: {
      fontSize: 18,
    },
    themeDesc: {
      fontSize: 11,
      color: c.onSurfaceVariant,
      marginTop: 2,
      textAlign: 'right',
    },
    addAddressForm: {
      backgroundColor: c.surfaceContainerLow,
      padding: spacing.baseSm,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.baseSm,
    },
    formTitle: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
      textAlign: 'right',
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.baseSm,
      minHeight: 48,
      paddingVertical: spacing.baseXs,
      fontSize: typography.fontSize.xs,
      color: c.onSurface,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.outlineVariant + '40',
    },
    saveAddrBtn: {
      backgroundColor: c.primary,
      minHeight: 48,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginTop: 2,
    },
    saveAddrBtnText: {
      color: c.onPrimary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
    },
    emptyNotice: {
      fontSize: typography.fontSize.xs,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: 12,
    },
    addressRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.surfaceContainerLow,
    },
    addrIconWrap: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: c.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.baseSm,
    },
    addrIcon: {
      fontSize: 16,
    },
    addrInfo: {
      flex: 1,
      alignItems: 'flex-end',
    },
    addrLabelRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
    },
    addrLabel: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
    },
    defaultBadge: {
      fontSize: 9,
      color: c.onPrimary,
      backgroundColor: c.primary,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: borderRadius.sm,
      fontWeight: typography.fontWeight.bold,
    },
    addrStreet: {
      fontSize: 11,
      color: c.onSurfaceVariant,
      marginTop: 2,
    },
    orderHistoryItem: {
      backgroundColor: c.surfaceContainerLow,
      borderRadius: borderRadius.lg,
      padding: spacing.baseSm,
      marginTop: spacing.baseXs,
    },
    orderHistoryTop: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orderHistoryInfo: {
      alignItems: 'flex-end',
    },
    orderHistNum: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: c.primary,
    },
    orderHistDate: {
      fontSize: 10,
      color: c.onSurfaceVariant,
    },
    trackBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
    },
    trackBtnText: {
      color: c.onPrimary,
      fontSize: 10,
      fontWeight: typography.fontWeight.bold,
    },
    orderHistoryBottom: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: c.surfaceContainerLowest,
    },
    orderHistTotal: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: c.onSurface,
    },
    statusPill: {
      backgroundColor: c.primaryFixedDim + '40',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    statusPillText: {
      fontSize: 9,
      fontWeight: typography.fontWeight.bold,
      color: c.primary,
    },
    menuItem: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.surfaceContainerLow,
    },
    menuTitleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
    },
    menuIcon: {
      fontSize: 16,
    },
    menuText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semiBold,
      color: c.onSurface,
    },
    menuArrow: {
      fontSize: 18,
      color: c.outline,
    },
    logoutItem: {
      borderBottomWidth: 0,
      paddingTop: 12,
    },
    logoutIcon: {
      fontSize: 16,
    },
    logoutText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: c.error,
    },
    logoutArrow: {
      fontSize: 18,
      color: c.error,
    },
  });
