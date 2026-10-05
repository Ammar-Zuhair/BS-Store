import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { adminApi } from '../api';
import { borderRadius, colors, spacing, typography } from '../theme';

type AccountRole = 'Admin' | 'SuperAdmin' | 'Driver';
type ManagedAccount = {
  id: string;
  fullName: string;
  phone: string;
  role: AccountRole;
  isActive: boolean;
  governorateId?: string;
  governorateName?: string;
};
type Governorate = { id: string; name: string };

const roleLabel = (role: AccountRole) => role === 'Driver' ? 'موصل' : role === 'SuperAdmin' ? 'مدير أعلى' : 'مدير';

export const AccountManagementScreen: React.FC = () => {
  const { currentUser, navigateTo } = useAdmin();
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [governoratePickerOpen, setGovernoratePickerOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedAccount | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Driver'>('Admin');
  const [governorateId, setGovernorateId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [accountRows, governorateRows] = await Promise.all([
        adminApi.getManagedAccounts(),
        adminApi.getGovernorates(),
      ]);
      setAccounts(accountRows as ManagedAccount[]);
      setGovernorates(governorateRows);
    } catch (error: any) {
      Alert.alert('تعذر تحميل الحسابات', error?.message || 'تحقق من الاتصال ثم حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const clearForm = () => {
    setEditing(null);
    setFullName('');
    setPhone('');
    setPassword('');
    setRole('Admin');
    setGovernorateId('');
    setIsActive(true);
  };

  const startCreate = () => {
    clearForm();
    setFormOpen(true);
  };

  const startEdit = (account: ManagedAccount) => {
    setEditing(account);
    setFullName(account.fullName);
    setPhone(account.phone);
    setPassword('');
    setRole(account.role === 'Driver' ? 'Driver' : 'Admin');
    setGovernorateId(account.governorateId || '');
    setIsActive(account.isActive);
    setFormOpen(true);
  };

  const save = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    if (cleanName.length < 2 || cleanPhone.length < 7) {
      Alert.alert('بيانات غير مكتملة', 'أدخل الاسم ورقم الهاتف بشكل صحيح.');
      return;
    }
    if (!editing && password.length < 8) {
      Alert.alert('كلمة المرور قصيرة', 'أنشئ كلمة مرور من 8 أحرف على الأقل.');
      return;
    }
    if (password && password.length < 8) {
      Alert.alert('كلمة المرور قصيرة', 'اكتب 8 أحرف على الأقل أو اترك الحقل فارغاً دون تغيير كلمة المرور.');
      return;
    }
    if ((editing?.role === 'Driver' || (!editing && role === 'Driver')) && !governorateId) {
      Alert.alert('المحافظة مطلوبة', 'اختر محافظة الموصل.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateManagedAccount(editing.id, {
          fullName: cleanName,
          phone: cleanPhone,
          password: password || undefined,
          isActive,
          governorateId: editing.role === 'Driver' ? governorateId : undefined,
        });
        Alert.alert('تم التحديث', 'تم حفظ بيانات الحساب.');
      } else {
        await adminApi.createManagedAccount({
          fullName: cleanName,
          phone: cleanPhone,
          password,
          role,
          governorateId: role === 'Driver' ? governorateId : undefined,
        });
        Alert.alert('تم إنشاء الحساب', role === 'Driver' ? 'حساب الموصل جاهز لتسجيل الدخول.' : 'حساب المدير جاهز لتسجيل الدخول.');
      }
      setFormOpen(false);
      clearForm();
      await load();
    } catch (error: any) {
      Alert.alert('تعذر حفظ الحساب', error?.message || 'تحقق من البيانات وحاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (account: ManagedAccount) => {
    Alert.alert(
      'حذف الحساب',
      `سيتم إيقاف حساب ${account.fullName} ومنعه من تسجيل الدخول، مع الاحتفاظ بسجلاته. هل تريد المتابعة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف الحساب', style: 'destructive', onPress: async () => {
          try {
            await adminApi.deleteManagedAccount(account.id);
            await load();
          } catch (error: any) {
            Alert.alert('تعذر حذف الحساب', error?.message || 'حاول مجدداً.');
          }
        } },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <AdminHeader title="إدارة الحسابات" showBack onBack={() => navigateTo('financials')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Text style={styles.heading}>حسابات المديرين والموصلين</Text>
          <Text style={styles.body}>يمكن للمدير إضافة حسابات. تعديل الحسابات وإيقافها متاح للمدير الأعلى فقط.</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={startCreate}>
              <Text style={styles.primaryButtonText}>إضافة حساب</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => void load()}>
              <Text style={styles.secondaryButtonText}>تحديث القائمة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {formOpen && <View style={styles.formCard}>
          <Text style={styles.heading}>{editing ? `تعديل ${roleLabel(editing.role)}` : 'إنشاء حساب جديد'}</Text>
          {!editing ? <View style={styles.roleRow}>
            <TouchableOpacity style={[styles.roleButton, role === 'Admin' && styles.roleButtonActive]} onPress={() => setRole('Admin')}>
              <Text style={[styles.roleButtonText, role === 'Admin' && styles.roleButtonTextActive]}>مدير</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleButton, role === 'Driver' && styles.roleButtonActive]} onPress={() => setRole('Driver')}>
              <Text style={[styles.roleButtonText, role === 'Driver' && styles.roleButtonTextActive]}>موصل</Text>
            </TouchableOpacity>
          </View> : <Text style={styles.body}>نوع الحساب: {roleLabel(editing.role)}</Text>}

          <Text style={styles.fieldLabel}>الاسم الكامل</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="اكتب الاسم الذي سيظهر في النظام" textAlign="right" />
          <Text style={styles.fieldLabel}>رقم الهاتف</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="مثال: 775479340" keyboardType="phone-pad" textAlign="right" />
          <Text style={styles.fieldLabel}>{editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={editing ? 'اتركه فارغاً للإبقاء على الحالية' : '8 أحرف على الأقل'} secureTextEntry textAlign="right" />

          {(editing?.role === 'Driver' || (!editing && role === 'Driver')) && <>
            <Text style={styles.fieldLabel}>محافظة الموصل</Text>
            <TouchableOpacity style={styles.input} onPress={() => setGovernoratePickerOpen(true)}>
              <Text style={styles.pickerText}>{governorates.find((item) => item.id === governorateId)?.name || 'اختر المحافظة'}</Text>
            </TouchableOpacity>
          </>}

          {editing && editing.role !== 'SuperAdmin' && <TouchableOpacity style={styles.statusRow} onPress={() => setIsActive((value) => !value)}>
            <Text style={styles.body}>{isActive ? 'الحساب فعال' : 'الحساب موقوف'}</Text>
            <Text style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>{isActive ? 'اضغط للإيقاف' : 'اضغط للتفعيل'}</Text>
          </TouchableOpacity>}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.primaryButton, saving && styles.disabled]} disabled={saving} onPress={() => void save()}>
              {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryButtonText}>{editing ? 'حفظ التعديل' : 'إنشاء الحساب'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setFormOpen(false); clearForm(); }} disabled={saving}>
              <Text style={styles.secondaryButtonText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>}

        <Text style={styles.listHeading}>الحسابات ({accounts.length})</Text>
        {loading ? <ActivityIndicator style={styles.loading} size="large" color={colors.primary} /> : accounts.map((account) => {
          const canEdit = isSuperAdmin && (account.role !== 'SuperAdmin' || account.id === currentUser?.id);
          const canDelete = isSuperAdmin && account.role !== 'SuperAdmin';
          return <View key={account.id} style={styles.accountCard}>
            <View style={styles.accountTopRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.fullName}</Text>
                <Text style={styles.accountPhone}>{account.phone}</Text>
                {account.role === 'Driver' && account.governorateName ? <Text style={styles.accountMeta}>المحافظة: {account.governorateName}</Text> : null}
              </View>
              <View style={styles.accountBadges}>
                <Text style={styles.roleBadge}>{roleLabel(account.role)}</Text>
                <Text style={[styles.statusBadge, account.isActive ? styles.activeBadge : styles.inactiveBadge]}>{account.isActive ? 'فعال' : 'موقوف'}</Text>
              </View>
            </View>
            {(canEdit || canDelete) && <View style={styles.accountActions}>
              {canEdit && <TouchableOpacity style={styles.secondaryButton} onPress={() => startEdit(account)}><Text style={styles.secondaryButtonText}>تعديل</Text></TouchableOpacity>}
              {canDelete && <TouchableOpacity style={styles.deleteButton} onPress={() => remove(account)}><Text style={styles.deleteButtonText}>حذف</Text></TouchableOpacity>}
            </View>}
          </View>;
        })}
        {!loading && accounts.length === 0 && <Text style={styles.emptyText}>لا توجد حسابات إدارية أو حسابات موصلين.</Text>}
      </ScrollView>

      <Modal visible={governoratePickerOpen} transparent animationType="slide" onRequestClose={() => setGovernoratePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.heading}>اختر المحافظة</Text>
            <ScrollView>{governorates.map((item) => <TouchableOpacity key={item.id} style={styles.governorateOption} onPress={() => { setGovernorateId(item.id); setGovernoratePickerOpen(false); }}><Text style={styles.pickerText}>{item.name}</Text></TouchableOpacity>)}</ScrollView>
            {governorates.length === 0 && <Text style={styles.emptyText}>لا توجد محافظات فعالة للاختيار.</Text>}
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setGovernoratePickerOpen(false)}><Text style={styles.secondaryButtonText}>إغلاق</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screenGutter, paddingBottom: 120, gap: spacing.baseMd },
  introCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, gap: spacing.baseSm, borderWidth: 1, borderColor: colors.outlineVariant },
  heading: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, textAlign: 'right' },
  body: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'right', lineHeight: 22 },
  actionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.baseSm, marginTop: spacing.baseSm },
  primaryButton: { flex: 1, minHeight: 46, paddingHorizontal: 14, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  secondaryButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  formCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, gap: spacing.baseXs, borderWidth: 1, borderColor: colors.outlineVariant },
  roleRow: { flexDirection: 'row-reverse', gap: spacing.baseSm, marginVertical: spacing.baseSm },
  roleButton: { flex: 1, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, padding: spacing.baseSm, alignItems: 'center' },
  roleButtonActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  roleButtonText: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.bold },
  roleButtonTextActive: { color: colors.primary },
  fieldLabel: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, textAlign: 'right', marginTop: spacing.baseXs },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: spacing.baseMd, color: colors.onSurface, justifyContent: 'center' },
  pickerText: { textAlign: 'right', color: colors.onSurface, fontFamily: typography.fontFamily.regular },
  statusRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.baseSm },
  statusBadge: { overflow: 'hidden', borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 4, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xs },
  activeBadge: { color: colors.primary, backgroundColor: colors.primaryContainer },
  inactiveBadge: { color: colors.error, backgroundColor: colors.errorContainer },
  listHeading: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, textAlign: 'right', marginTop: spacing.baseSm },
  accountCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, padding: spacing.baseMd, borderWidth: 1, borderColor: colors.outlineVariant, gap: spacing.baseSm },
  accountTopRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing.baseSm },
  accountInfo: { flex: 1, gap: 3 },
  accountName: { textAlign: 'right', color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md },
  accountPhone: { textAlign: 'right', color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.medium },
  accountMeta: { textAlign: 'right', color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs },
  accountBadges: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { color: colors.primary, backgroundColor: colors.primaryFixed, borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 4, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xs, overflow: 'hidden' },
  accountActions: { flexDirection: 'row-reverse', gap: spacing.baseSm, justifyContent: 'flex-start' },
  deleteButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: borderRadius.md, backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: colors.error, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  emptyText: { color: colors.onSurfaceVariant, textAlign: 'center', padding: spacing.baseMd },
  loading: { marginTop: spacing.baseXl },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  modalCard: { maxHeight: '72%', backgroundColor: colors.surfaceContainerLowest, padding: spacing.baseMd, gap: spacing.baseSm, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl },
  governorateOption: { paddingVertical: spacing.baseMd, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  disabled: { opacity: 0.6 },
});
