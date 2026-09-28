import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';

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
  } = useApp();

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [desc, setDesc] = useState('');

  const handleSaveAddress = () => {
    if (!district.trim() || !street.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الحي والشارع');
      return;
    }
    addNewAddress({
      label: 'أخرى',
      city: 'صنعاء',
      district,
      street,
      description: desc,
      latitude: 15.35,
      longitude: 44.2,
      isDefault: false,
    });
    setDistrict('');
    setStreet('');
    setDesc('');
    setShowAddAddress(false);
    Alert.alert('تم بنجاح', 'تمت إضافة العنوان الجديد إلى قائمتك');
  };

  return (
    <View style={styles.container}>
      <Header title="حسابي والملف الشخصي" showBack onBack={() => navigateTo('home')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card / Guest Card */}
        {!isAuthenticated ? (
          <View style={styles.guestCard}>
            <View style={styles.avatarIconWrap}>
              <Text style={styles.avatarIconText}>👋</Text>
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
              >
                <Text style={styles.loginBtnText}>تسجيل الدخول / إنشاء حساب ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.userCard}>
            <View style={styles.avatarIconWrap}>
              <Text style={styles.avatarIconText}>👤</Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user?.name || 'عميل متجر بي اس'}</Text>
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>عميل مميز</Text>
                </View>
              </View>
              <Text style={styles.userPhone}>{user?.phone || ''}</Text>
            </View>
          </View>
        )}

        {/* Saved Addresses Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setShowAddAddress(!showAddAddress)}>
              <Text style={styles.actionText}>
                {showAddAddress ? 'إلغاء' : '+ إضافة عنوان'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>العناوين المحفوظة</Text>
          </View>

          {showAddAddress && (
            <View style={styles.addAddressForm}>
              <Text style={styles.formTitle}>إضافة عنوان جديد في صنعاء</Text>
              <TextInput
                style={styles.input}
                placeholder="الحي (مثال: حي الأصبحي)"
                placeholderTextColor={colors.outline}
                value={district}
                onChangeText={setDistrict}
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="الشارع (مثال: شارع المقالح)"
                placeholderTextColor={colors.outline}
                value={street}
                onChangeText={setStreet}
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="تفاصيل إضافية (عمارة، علامة مميزة)"
                placeholderTextColor={colors.outline}
                value={desc}
                onChangeText={setDesc}
                textAlign="right"
              />
              <TouchableOpacity
                style={styles.saveAddrBtn}
                onPress={handleSaveAddress}
              >
                <Text style={styles.saveAddrBtnText}>حفظ العنوان</Text>
              </TouchableOpacity>
            </View>
          )}

          {addresses.map((addr) => (
            <View key={addr.id} style={styles.addressRow}>
              <View style={styles.addrIconWrap}>
                <Text style={styles.addrIcon}>
                  {addr.label === 'المنزل' ? '🏠' : '🏢'}
                </Text>
              </View>
              <View style={styles.addrInfo}>
                <View style={styles.addrLabelRow}>
                  <Text style={styles.addrLabel}>{addr.label}</Text>
                  {addr.isDefault && <Text style={styles.defaultBadge}>الرئيسي</Text>}
                </View>
                <Text style={styles.addrStreet}>
                  {addr.city} - {addr.district}، {addr.street}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Past Orders History */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>سجل الطلبات السابقة</Text>
          {orders.map((ord) => (
            <View key={ord.id} style={styles.orderHistoryItem}>
              <View style={styles.orderHistoryTop}>
                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => {
                    setCurrentOrder(ord);
                    navigateTo('tracking');
                  }}
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
          ))}
        </View>

        {/* Support & Logout */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('خدمة العملاء', 'رقم الدعم الفني: 8000000 أو واتساب: 777000000')}
          >
            <Text style={styles.menuArrow}>‹</Text>
            <View style={styles.menuTitleRow}>
              <Text style={styles.menuText}>مركز المساعدة والدعم الفني</Text>
              <Text style={styles.menuIcon}>💬</Text>
            </View>
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={logout}
            >
              <Text style={styles.logoutArrow}>‹</Text>
              <View style={styles.menuTitleRow}>
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
                <Text style={styles.logoutIcon}>🚪</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    paddingBottom: 130,
  },
  guestCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.card,
  },
  guestInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  guestTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  guestSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: spacing.baseXs,
    textAlign: 'right',
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    marginTop: 4,
  },
  loginBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  userCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  avatarIconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFixed + '25',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.baseSm,
  },
  avatarIconText: {
    fontSize: 24,
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
    color: colors.onSurface,
  },
  vipBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  vipBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSecondary,
  },
  userPhone: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
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
    color: colors.onSurface,
    textAlign: 'right',
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  addAddressForm: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.baseSm,
  },
  formTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.baseSm,
    height: 38,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    marginBottom: 6,
  },
  saveAddrBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: 2,
  },
  saveAddrBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  addrIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
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
    color: colors.onSurface,
  },
  defaultBadge: {
    fontSize: 9,
    color: colors.primary,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
    fontWeight: typography.fontWeight.bold,
  },
  addrStreet: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  orderHistoryItem: {
    backgroundColor: colors.surfaceContainerLow,
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
    color: colors.primary,
  },
  orderHistDate: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  trackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  trackBtnText: {
    color: colors.onPrimary,
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
    borderTopColor: colors.surfaceContainerLowest,
  },
  orderHistTotal: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  statusPill: {
    backgroundColor: colors.primaryFixedDim + '40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
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
    color: colors.onSurface,
  },
  menuArrow: {
    fontSize: 18,
    color: colors.outline,
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
    color: colors.error,
  },
  logoutArrow: {
    fontSize: 18,
    color: colors.error,
  },
});
