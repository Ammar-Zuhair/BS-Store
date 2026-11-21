import { PaymentMethodChoice } from '../components/PaymentMethodChoice';
import { PaymentMethodDetails } from '../components/PaymentMethodDetails';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { walletApi } from '../api';
import { Header } from '../components/Header';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { AppIcon } from '../components/AppIcon';
import { ThemeColors } from '../theme';
import { WalletMethod, WalletSummary } from '../types/wallet';
import { chooseTransferReceipt, TransferReceiptImage } from '../utils/transferReceipt';
import { formatOrderDate } from '../utils/orderDate';

const amountValue = (s: string) => Number(s.replace(/[٠-٩۰-۹]/g, c => String('٠١٢٣٤٥٦٧٨٩'.includes(c) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(c) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/٫/g, '.').trim());
export const WalletScreen: React.FC = () => {
  const { colors, user, navigateTo } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<WalletSummary | null>(null);
  const [methods, setMethods] = useState<WalletMethod[]>([]);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [sender, setSender] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<TransferReceiptImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const method = methods.find(m => m.id === methodId);
  useEffect(() => { setConfirmed(false); }, [method?.updatedAt, method?.id]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summary, list] = await Promise.all([walletApi.get(page), walletApi.methods()]);
      setData(summary); setMethods(list);
      setMethodId(id => list.some(m => m.id === id) ? id : list[0]?.id || '');
    } catch (e: any) { setError(e.message || 'تعذر تحديث المحفظة'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); const sub = AppState.addEventListener('change', s => { if (s === 'active') void load(); }); return () => sub.remove(); }, [load]);
  const send = async () => {
    if (inFlight.current) return;
    setError(''); setSuccess('');
    const n = amountValue(amount);
    if (!method || !receipt || !sender.trim() || !phone.trim() || !reference.trim() || !Number.isFinite(n) || n <= 0 || !confirmed) {
      setError('اختر الطريقة وأكمل المبلغ وبيانات المرسل وصورة الإيصال وأكد مراجعة البيانات.'); return;
    }
    inFlight.current = true; setSaving(true);
    try {
      const fields = { methodId, methodUpdatedAt: method.updatedAt, amount: String(n), senderName: sender.trim(), senderPhone: phone.trim(), transferReference: reference.trim() };
      const signature = JSON.stringify({ ...fields, image: receipt.uri });
      if (attempt.current?.signature !== signature) attempt.current = { signature, key: `${Date.now()}-${Math.random()}` };
      await walletApi.topUp(receipt, { ...fields, idempotencyKey: attempt.current.key });
      setAmount(''); setReference(''); setReceipt(null); setConfirmed(false); setShowForm(false); attempt.current = null;
      setSuccess('أُرسل طلب الشحن للمدير. سيُضاف الرصيد بعد مراجعة التحويل واعتماده.');
      if (page !== 0) setPage(0); else await load();
    } catch (e: any) { setError(e.message || 'تعذر إرسال الطلب. أعد المحاولة بنفس البيانات.'); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const button = (title: string, action: () => void, secondary = false, disabled = false) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={action} activeOpacity={0.75} style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.5 }]}>
    <Text style={[styles.buttonText, secondary && { color: colors.onSurface }]}>{title}</Text></TouchableOpacity>;
  const field = (label: string, value: string, onChangeText: (v: string) => void, numeric = false) => <View style={styles.field}>
    <Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} editable={!saving} value={value} onChangeText={v => { onChangeText(v); setConfirmed(false); }}
      keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={label === 'اسم المرسل' ? 200 : 120} style={styles.input} /></View>;
  return <View style={{ flex: 1 }}><Header title="الرصيد وشحن الرصيد" showBack onBack={() => navigateTo('profile')} />
    <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}><AppIcon name="credit-card" size={30} color={colors.primary} />
        <Text style={styles.label}>الرصيد المتاح</Text><Text style={styles.balance}>{data ? Number(data.balance).toLocaleString() + ' ر.ي' : '—'}</Text>
        <Text style={styles.hint}>استخدم رصيدك عند تأكيد الطلب واستكمل المتبقي نقداً.</Text>
        {button(showForm ? 'إغلاق نموذج الشحن' : 'شحن الرصيد', () => setShowForm(v => !v), false, saving)}
        {button('تحديث المحفظة', () => void load(), true, loading || saving)}</View>
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!success && <Text accessibilityRole="alert" style={styles.notice}>{success}</Text>}
      {showForm && <View style={styles.card}><Text style={styles.title}>طلب شحن جديد</Text>
        <Text style={styles.hint}>حوّل إلى الحساب الموضح، ثم أرسل بيانات التحويل وصورته للمراجعة.</Text>
        {!methods.length && <Text style={styles.hint}>لم تُفعّل الإدارة طرق الشحن بعد. تواصل مع الدعم.</Text>}
        {methods.map(m => <TouchableOpacity key={m.id} disabled={saving} onPress={() => { setMethodId(m.id); setConfirmed(false); }} style={[styles.choice, m.id === methodId && { borderColor: colors.primary, borderWidth: 2 }]}
          accessibilityRole="radio" accessibilityState={{ checked: m.id === methodId }}><PaymentMethodChoice method={m} selected={m.id === methodId} color={colors.onSurface} /></TouchableOpacity>)}
        {method && <View style={styles.details}><Text style={styles.label}>معلومات الإرسال</Text>
          <PaymentMethodDetails method={method} color={colors.onSurface} /></View>}
        {field('مبلغ الشحن بالريال', amount, setAmount, true)}{field('اسم المرسل', sender, setSender)}{field('رقم هاتف المرسل', phone, setPhone, true)}{field('رقم الحوالة / العملية', reference, setReference)}
        {button(receipt ? 'تغيير صورة التحويل' : 'إرفاق صورة التحويل', () => { void chooseTransferReceipt().then(r => { if (r) { setReceipt(r); setConfirmed(false); } }).catch(e => setError(e.message)); }, true, saving)}
        {receipt && <Image source={{ uri: receipt.uri }} style={styles.image} resizeMode="contain" accessibilityLabel="صورة التحويل المختارة" />}
        <View style={styles.row}><Switch value={confirmed} onValueChange={setConfirmed} disabled={saving} accessibilityLabel="راجعت المبلغ والحساب وبيانات التحويل" /><Text style={[styles.text, { flex: 1 }]}>راجعت المبلغ والحساب وبيانات التحويل.</Text></View>
        {button(saving ? 'جارٍ إرسال طلب الشحن…' : 'إرسال طلب الشحن', () => void send(), false, saving || !methods.length)}
      </View>}
      <View style={styles.card}><Text style={styles.title}>طلبات الشحن</Text>
        {!data?.topUps.length && !loading && <Text style={styles.hint}>لا توجد طلبات شحن في هذه الصفحة.</Text>}
        {data?.topUps.map(t => <View key={t.id} style={styles.entry}><Text style={styles.label}>{Number(t.amount).toLocaleString()} ر.ي · {t.methodName}</Text>
          <Text style={styles.text}>{t.status === 'Pending' ? 'بانتظار المراجعة' : t.status === 'Approved' ? 'تم الاعتماد' : 'مرفوض'}</Text>
          <Text selectable style={styles.hint}>رقم التحويل: {t.transferReference}</Text><Text style={styles.hint}>{formatOrderDate(t.createdAt)}</Text>
          {!!t.rejectionReason && <Text style={styles.error}>سبب الرفض: {t.rejectionReason}</Text>}</View>)}</View>
      <View style={styles.card}><Text style={styles.title}>سجل الرصيد</Text>
        {!data?.transactions.length && !loading && <Text style={styles.hint}>لا توجد حركات رصيد في هذه الصفحة.</Text>}
        {data?.transactions.map(t => <View key={t.id} style={styles.entry}><Text style={styles.label}>{t.amount > 0 ? '+' : '−'}{Math.abs(t.amount).toLocaleString()} ر.ي</Text>
          <Text style={styles.text}>{t.description}{t.isReversed ? ' · عُكست العملية' : ''}</Text><Text style={styles.hint}>الرصيد بعدها: {Number(t.balanceAfter).toLocaleString()} ر.ي</Text><Text style={styles.hint}>{formatOrderDate(t.createdAt)}</Text></View>)}</View>
      <View style={styles.row}>{page > 0 && button('الأحدث', () => setPage(p => p - 1), true, loading)}{data?.hasMore && button('الأقدم', () => setPage(p => p + 1), true, loading)}</View>
    </KeyboardAwareScrollView></View>;
};
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  card: { backgroundColor: c.surfaceSolid, borderColor: c.outlineVariant, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  title: { color: c.onSurface, fontFamily: 'Tajawal_700Bold', fontSize: 21, textAlign: 'right' },
  label: { color: c.onSurface, fontFamily: 'Tajawal_700Bold', fontSize: 17, textAlign: 'right' },
  text: { color: c.onSurface, fontFamily: 'Tajawal_400Regular', fontSize: 16, textAlign: 'right', lineHeight: 25 },
  hint: { color: c.onSurfaceVariant, fontFamily: 'Tajawal_400Regular', fontSize: 15, textAlign: 'right', lineHeight: 23 },
  balance: { color: c.primary, fontFamily: 'Tajawal_800ExtraBold', fontSize: 36, textAlign: 'right' },
  button: { minHeight: 48, justifyContent: 'center', backgroundColor: c.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  secondary: { backgroundColor: c.surfaceSolidLow, borderWidth: 1, borderColor: c.outlineVariant },
  buttonText: { color: c.onPrimary, fontFamily: 'Tajawal_700Bold', fontSize: 16, textAlign: 'center' },
  input: { color: c.onSurface, backgroundColor: c.surfaceSolidLow, fontFamily: 'Tajawal_400Regular', fontSize: 17, textAlign: 'right', borderWidth: 1, borderColor: c.outlineVariant, padding: 12, minHeight: 50, borderRadius: 10 },
  field: { gap: 6 }, choice: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: c.outlineVariant, borderRadius: 10 },
  details: { padding: 12, gap: 6, backgroundColor: c.surfaceSolidLow, borderRadius: 12 },
  entry: { paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: c.outlineVariant },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  image: { width: '100%', height: 220 }, error: { color: c.error, fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: 'right', lineHeight: 25 },
  notice: { color: c.onSurface, backgroundColor: c.surfaceSolidLow, padding: 14, borderRadius: 12, fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: 'right' },
});
