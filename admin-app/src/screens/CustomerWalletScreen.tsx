import { CachedImage } from '../components/CachedImage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { pickImageFromGallery, saveCatalogueForm, stageCatalogueImage } from '../services/imageStorage';
import { AdminHeader } from '../components/AdminHeader';
import { ReceiptImage } from '../components/ReceiptImage';
import { colors as c } from '../theme';

type Method = { id: string; name: string; accountName: string; accountNumber: string; instructions: string; imageUrl: string; accountType: string; accountDetails: string; isActive: boolean };
type TopUp = { accountType?: string; accountDetails?: string; instructions?: string; id: string; customerName: string; customerPhone: string; amount: number; methodName: string; accountName: string; accountNumber: string;
  senderName: string; senderPhone: string; transferReference: string; status: string; rejectionReason?: string; receiptUrl: string; similarReceipt: boolean; createdAt: string; reviewedAt?: string; reviewerName?: string };
type Entry = { id: string; customerId: string; customerName: string; driverName?: string; amount: number; balanceAfter: number; type: string; description: string;
  isReversed: boolean; createdAt: string; orderNumber?: string; cashReceived?: number; cashDue?: number };
type Report = { transactions: Entry[]; customers: { id: string; fullName: string; phone: string; balance: number; ledgerBalance: number }[];
  deniedAttempts: { driverName: string; count: number }[];
  changesToday: { driverId: string; driverName: string; amount: number; count: number; reversedCount: number; outstanding: number; settlements: number }[]; mismatches: number; changeLimit: number; dailyLimit: number };
const emptyMethod = { name: '', accountName: '', accountNumber: '', instructions: '', imageUrl: '', accountType: '', accountDetails: '', isActive: false };
const statusText: Record<string, string> = { Pending: 'بانتظار المراجعة', Approved: 'معتمد', Rejected: 'مرفوض' };
const date = (value: string) => new Date(value).toLocaleString('ar', { timeZone: 'Asia/Aden' });

export const CustomerWalletScreen: React.FC<{ methodsOnly?: boolean }> = ({ methodsOnly = false }) => {
  const [tab, setTab] = useState<'requests' | 'report' | 'methods'>(methodsOnly ? 'methods' : 'requests');
  const [status, setStatus] = useState('Pending');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [dates, setDates] = useState({ from: '', to: '' });
  const [page, setPage] = useState(0);
  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [selected, setSelected] = useState('');
  const [action, setAction] = useState<{ id: string; kind: 'approve' | 'reject' | 'reverse'; amount: number } | null>(null);
  const [reason, setReason] = useState(''); const [cashConfirmed, setCashConfirmed] = useState(false);
  const [editing, setEditing] = useState<(Omit<Method, 'id'> & { id?: string }) | null>(null);
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const scroll = useRef<ScrollView>(null);
  const running = useRef(false); const version = useRef(0);
  const load = useCallback(async () => {
    const current = ++version.current; setLoading(true); setError('');
    try {
      if (tab === 'methods') {
        const list = await api.get<Method[]>('/admin/wallet/methods'); if (current === version.current) setMethods(list);
      } else if (tab === 'requests') {
        const params = new URLSearchParams({ status, query: filter, page: String(page) });
        const list = await api.get<TopUp[]>(`/admin/wallet/topups?${params}`); if (current === version.current) setTopUps(list);
      } else {
        const params = new URLSearchParams({ query: filter, page: String(page) });
        if (dates.from) params.set('from', `${dates.from}T00:00:00+03:00`);
        if (dates.to) params.set('to', `${dates.to}T23:59:59.999+03:00`);
        const result = await api.get<Report>(`/admin/wallet/report?${params}`); if (current === version.current) setReport(result);
      }
    } catch (e: any) { if (current === version.current) setError(e.message || 'تعذر تحميل البيانات'); }
    finally { if (current === version.current) setLoading(false); }
  }, [tab, status, filter, page, dates]);
  useEffect(() => { void load(); const sub = AppState.addEventListener('change', s => { if (s === 'active') void load(); }); return () => { version.current++; sub.remove(); }; }, [load]);
  const run = async (work: () => Promise<unknown>, message: string) => {
    if (running.current) return; running.current = true; setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); setAction(null); setEditing(null); setReason(''); setCashConfirmed(false); await load(); }
    catch (e: any) { setError(e.message || 'تعذر تنفيذ العملية'); }
    finally { running.current = false; setBusy(false); }
  };
  const button = (title: string, fn: () => void, secondary = false, disabled = false) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || disabled }}
    disabled={busy || disabled} onPress={fn} activeOpacity={0.75} style={[s.button, secondary && s.secondary, (busy || disabled) && { opacity: 0.5 }]}><Text style={[s.buttonText, secondary && { color: c.onSurface }]}>{title}</Text></TouchableOpacity>;
  const field = (label: string, value: string, onChangeText: (v: string) => void, multiline = false) => <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} editable={!busy} value={value} onChangeText={onChangeText} multiline={multiline} maxLength={2000} style={[s.input, multiline && { minHeight: 90 }]} /></View>;
  const chooseAction = (id: string, kind: 'approve' | 'reject' | 'reverse', amount: number) => { setAction({ id, kind, amount }); setReason(''); setCashConfirmed(false); setNotice(''); scroll.current?.scrollTo({ y: 0, animated: true }); };
  const submitAction = () => {
    if (!action) return;
    if (action.kind !== 'approve' && !reason.trim()) { setError('أدخل السبب قبل التأكيد'); return; }
    if (action.kind === 'reverse' && !cashConfirmed) { setError('أكد مراجعة تسوية النقد مع العميل والموصل'); return; }
    const endpoint = action.kind === 'reverse' ? `/admin/wallet/transactions/${action.id}/reverse` : `/admin/wallet/topups/${action.id}/${action.kind}`;
    void run(() => api.post(endpoint, { reason: reason.trim(), cashReconciled: cashConfirmed }), action.kind === 'approve' ? 'تم اعتماد الشحن وإضافة الرصيد' : action.kind === 'reject' ? 'تم الرفض وإرسال السبب للعميل' : 'تم عكس الرصيد وتخفيض عهدة الموصل');
  };
  return <View style={{ flex: 1 }}><AdminHeader title={methodsOnly ? "طرق الدفع" : "أرصدة العملاء"} showBack />
    <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {!methodsOnly && <View style={s.row}>{(['requests', 'report', 'methods'] as const).map(t => <View key={t} style={{ flexGrow: 1 }}>{button(t === 'requests' ? 'طلبات الشحن' : t === 'report' ? 'الأرصدة والتتبع' : 'طرق الدفع', () => { setTab(t); setPage(0); setAction(null); setEditing(null); setSelected(''); }, tab !== t)}</View>)}</View>}
      {button('تحديث', () => void load(), true, loading)}
      {loading && <ActivityIndicator color={c.primary} />}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {action && <View style={s.card}><Text style={s.title}>{action.kind === 'approve' ? 'تأكيد اعتماد الشحن' : action.kind === 'reject' ? 'سبب رفض الشحن' : 'عكس باقي الموصل'}</Text>
        <Text style={s.text}>المبلغ: {action.amount.toLocaleString()} ر.ي</Text>
        {action.kind === 'approve' ? <Text style={s.text}>تأكد من وصول التحويل فعلياً إلى الحساب ومطابقة المرسل والرقم والصورة. سيُضاف المبلغ إلى رصيد العميل.</Text> : field(action.kind === 'reject' ? 'سبب الرفض الذي سيظهر للعميل' : 'سبب التصحيح وكيف تمت تسوية النقد', reason, setReason, true)}
        {action.kind === 'reverse' && <View style={s.row}><Switch value={cashConfirmed} onValueChange={setCashConfirmed} accessibilityLabel="راجعت تسوية النقد مع العميل والموصل" disabled={busy} /><Text style={[s.text, { flex: 1 }]}>راجعت تسوية النقد مع العميل والموصل. ستنخفض عهدة الموصل بنفس المبلغ.</Text></View>}
        {button(busy ? 'جارٍ التنفيذ…' : 'تأكيد العملية', submitAction)}{button('إلغاء', () => setAction(null), true)}</View>}
      {tab !== 'methods' && <View style={s.card}>{field('بحث بالعميل أو الموصل أو رقم الحوالة', query, setQuery)}
        {tab === 'report' && <>{field('من تاريخ (YYYY-MM-DD)', from, setFrom)}{field('إلى تاريخ (YYYY-MM-DD)', to, setTo)}</>}
        {button('تطبيق البحث', () => { if ([from, to].some(v => v && !/^\d{4}-\d{2}-\d{2}$/.test(v))) { setError('أدخل التاريخ بصيغة YYYY-MM-DD'); return; } setFilter(query.trim()); setDates({ from, to }); setPage(0); })}</View>}
      {tab === 'requests' && <>
        <View style={s.row}>{['Pending', 'Approved', 'Rejected', ''].map(v => <View key={v}>{button(statusText[v] || 'الكل', () => { setStatus(v); setPage(0); }, status !== v)}</View>)}</View>
        {!topUps.length && !loading && <Text style={s.text}>لا توجد طلبات مطابقة.</Text>}
        {topUps.map(t => <View key={t.id} style={s.card}><Text style={s.title}>{t.customerName} · {t.amount.toLocaleString()} ر.ي</Text>
          <Text style={s.text}>{t.methodName} · {statusText[t.status]}</Text><Text style={s.hint}>{date(t.createdAt)}</Text>
          {!!t.rejectionReason && <Text style={s.error}>سبب الرفض: {t.rejectionReason}</Text>}
          {button(selected === t.id ? 'إغلاق التفاصيل' : 'مراجعة بيانات التحويل والصورة', () => { setSelected(selected === t.id ? '' : t.id); setAction(null); }, true)}
          {selected === t.id && <><Text selectable style={s.text}>حساب العميل: {t.customerPhone}\nالمرسل: {t.senderName}\nهاتف المرسل: {t.senderPhone}\nرقم التحويل: {t.transferReference}\nالمستفيد: {t.accountName}\nالحساب: {t.accountNumber}</Text>
            <Text style={s.text}>{t.accountType}{t.accountDetails ? ` · ${t.accountDetails}` : ""}{t.instructions ? `\n${t.instructions}` : ""}</Text>
            {t.similarReceipt && <Text style={s.error}>تنبيه: صورة مطابقة مرفقة بطلب شحن آخر. راجع الحوالة قبل الاعتماد.</Text>}
            <ReceiptImage url={t.receiptUrl} />
            {t.status === 'Pending' && <View style={s.row}>{button('اعتماد', () => chooseAction(t.id, 'approve', t.amount))}{button('رفض مع السبب', () => chooseAction(t.id, 'reject', t.amount), true)}</View>}
            {!!t.reviewedAt && <Text style={s.hint}>راجع الطلب: {t.reviewerName || 'المدير'} · {date(t.reviewedAt)}</Text>}</>}
        </View>)}
      </>}
      {tab === 'methods' && <>
        <Text style={s.text}>تظهر الطرق المفعلة والمكتملة للعملاء عند شحن الرصيد وعند تسديد الطلب إلكترونياً. تعديل الحساب لا يغير بيانات التحويلات السابقة.</Text>
        {button('إضافة طريقة دفع', () => setEditing({ ...emptyMethod }))}
        {editing && <View style={s.card}><Text style={s.title}>{editing.id ? 'تعديل طريقة الدفع' : 'طريقة دفع جديدة'}</Text>
          {field('اسم الطريقة', editing.name, v => setEditing({ ...editing, name: v }))}{field('اسم المستفيد', editing.accountName, v => setEditing({ ...editing, accountName: v }))}
          {!!editing.imageUrl && <CachedImage source={{ uri: editing.imageUrl }} style={{ width: 100, height: 100, alignSelf: 'center' }} resizeMode="contain" accessibilityLabel="صورة طريقة الدفع" />}
          {button(editing.imageUrl ? 'تغيير صورة الطريقة' : 'اختيار صورة الطريقة', () => { void pickImageFromGallery().then(image => { if (image) setEditing(current => current ? { ...current, imageUrl: stageCatalogueImage(image) } : current); }).catch(e => setError(e.message || 'تعذر اختيار الصورة')); }, true)}
          {!!editing.imageUrl && button('إزالة الصورة', () => setEditing({ ...editing, imageUrl: '' }), true)}
          <Text style={s.label}>نوع الحساب</Text><View style={s.row}>{['حساب مشترك', 'نقطة مشتريات', 'محفظة إلكترونية'].map(type => <View key={type}>{button(type, () => setEditing({ ...editing, accountType: type }), editing.accountType !== type)}</View>)}</View>
          {field('نوع الحساب / وصف آخر', editing.accountType, v => setEditing({ ...editing, accountType: v }))}
          {field('تفاصيل إضافية', editing.accountDetails, v => setEditing({ ...editing, accountDetails: v }), true)}
          {field('رقم الحساب / المحفظة', editing.accountNumber, v => setEditing({ ...editing, accountNumber: v }))}{field('تعليمات التحويل', editing.instructions, v => setEditing({ ...editing, instructions: v }), true)}
          <View style={s.row}><Switch value={editing.isActive} onValueChange={v => setEditing({ ...editing, isActive: v })} accessibilityLabel="تفعيل طريقة الدفع" disabled={busy} /><Text style={s.text}>متاحة للعملاء</Text></View>
          {button('حفظ الطريقة', () => void run(() => saveCatalogueForm(editing, 'payment-methods', prepared => prepared.id ? api.put(`/admin/wallet/methods/${prepared.id}`, prepared) : api.post('/admin/wallet/methods', prepared)), 'حُفظت طريقة الدفع'))}{button('إلغاء', () => setEditing(null), true)}</View>}
        {methods.map(m => <View key={m.id} style={s.card}><Text style={s.title}>{m.name} · {m.isActive ? 'مفعلة' : 'معطلة'}</Text><Text style={s.hint}>{m.accountType}{m.accountDetails ? ` · ${m.accountDetails}` : ""}</Text>{!!m.imageUrl && <CachedImage source={{ uri: m.imageUrl }} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityLabel={m.name} />}<Text selectable style={s.text}>{m.accountName || 'المستفيد غير محدد'}\n{m.accountNumber || 'رقم الحساب غير محدد'}</Text>{button('تعديل', () => setEditing({ ...m }), true)}</View>)}
      </>}
      {tab === 'report' && report && <>
        <View style={s.card}><Text style={s.title}>مطابقة الرصيد والتتبع</Text><Text style={report.mismatches ? s.error : s.text}>حسابات غير متطابقة مع السجل: {report.mismatches}</Text>
          <Text style={s.text}>حد الباقي {report.changeLimit} للعملية و{report.dailyLimit} يومياً لكل موصل بتوقيت اليمن. تحتسب العمليات الأصلية حتى بعد العكس.</Text>
          {report.deniedAttempts.map((d, i) => <Text key={i} style={s.error}>محاولات شحن مرفوضة اليوم: {d.driverName} · {d.count}</Text>)}
          {report.changesToday.map(d => <View key={d.driverId} style={s.entry}><Text style={s.label}>{d.driverName}</Text><Text style={s.text}>شحن اليوم: {d.amount.toLocaleString()} ر.ي · {d.count} عمليات · عكس: {d.reversedCount}</Text>
            <Text style={s.text}>العهدة الحالية: {d.outstanding.toLocaleString()} ر.ي · المسدد للإدارة: {d.settlements.toLocaleString()} ر.ي</Text>
            {(d.amount >= report.dailyLimit || d.reversedCount >= 2) && <Text style={s.error}>يتطلب متابعة: بلوغ الحد اليومي أو تكرر عكس العمليات.</Text>}</View>)}</View>
        <View style={s.card}><Text style={s.title}>أرصدة العملاء</Text>{report.customers.map(customer => <View key={customer.id} style={s.entry}><Text style={s.label}>{customer.fullName} · {customer.phone}</Text>
          <Text style={s.text}>الرصيد: {customer.balance.toLocaleString()} ر.ي · سجل الحركات: {customer.ledgerBalance.toLocaleString()} ر.ي</Text></View>)}</View>
        <Text style={s.title}>الحركات المالية</Text>{report.transactions.map(t => <View key={t.id} style={s.card}><Text style={s.label}>{t.customerName} · {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} ر.ي</Text>
          <Text style={s.text}>{t.description}</Text><Text style={s.hint}>{date(t.createdAt)} · الرصيد بعدها {t.balanceAfter.toLocaleString()} ر.ي</Text>
          {!!t.orderNumber && <Text style={s.text}>الطلب: {t.orderNumber} · الموصل: {t.driverName || '—'}</Text>}
          {t.cashReceived != null && <Text style={s.text}>النقد المستلم: {t.cashReceived.toLocaleString()} · المستحق وقت التسليم: {t.cashDue?.toLocaleString()} ر.ي</Text>}
          {t.isReversed && <Text style={s.hint}>عُكست العملية بقيد مستقل</Text>}
          {t.type === 'CourierChange' && !t.isReversed && button('تصحيح وعكس الباقي', () => chooseAction(t.id, 'reverse', t.amount), true)}
        </View>)}</>}
      {tab !== 'methods' && <View style={s.row}>{page > 0 && button('السابق', () => setPage(p => p - 1), true, loading)}
        {(tab === 'requests' ? topUps.length === 50 : report && (report.transactions.length === 50 || report.customers.length === 50)) && button('التالي', () => setPage(p => p + 1), true, loading)}</View>}
    </ScrollView></View>;
};
const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 130, gap: 16, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  card: { backgroundColor: c.surface, borderRadius: 16, borderColor: c.outlineVariant, borderWidth: 1, padding: 16, gap: 12 },
  title: { color: c.onSurface, fontFamily: 'Tajawal_700Bold', fontSize: 21, textAlign: 'right' },
  label: { color: c.onSurface, fontFamily: 'Tajawal_700Bold', fontSize: 17, textAlign: 'right' },
  text: { color: c.onSurface, fontFamily: 'Tajawal_400Regular', fontSize: 16, textAlign: 'right', lineHeight: 25 },
  hint: { color: c.onSurfaceVariant, fontFamily: 'Tajawal_400Regular', fontSize: 15, textAlign: 'right', lineHeight: 23 },
  error: { color: c.error, fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: 'right', lineHeight: 25 },
  notice: { color: c.onSurface, fontFamily: 'Tajawal_500Medium', fontSize: 16, textAlign: 'right', backgroundColor: c.surfaceContainerLow, padding: 14, borderRadius: 10 },
  button: { backgroundColor: c.primary, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10 },
  secondary: { backgroundColor: c.surfaceContainerLow, borderWidth: 1, borderColor: c.outlineVariant },
  buttonText: { color: c.onPrimary, fontFamily: 'Tajawal_700Bold', fontSize: 16, textAlign: 'center' },
  input: { color: c.onSurface, backgroundColor: c.surfaceContainerLow, borderWidth: 1, borderColor: c.outlineVariant, borderRadius: 10, minHeight: 48, padding: 12, textAlign: 'right', fontFamily: 'Tajawal_400Regular', fontSize: 16 },
  entry: { paddingVertical: 10, gap: 5, borderBottomWidth: 1, borderBottomColor: c.outlineVariant },
});
