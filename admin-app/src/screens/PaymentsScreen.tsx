import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { api } from '../api';
import { BoosthisScreenTracker } from '../monitoring/BoosthisRuntime';

type Tab = 'transfers' | 'custody';

export const PaymentsScreen: React.FC = () => {
  const {
    bankTransfers, verifyBankTransfer, driverSettlementRequests,
    approveDriverSettlement, rejectDriverSettlement, driverCustodies, refreshData, navigateTo,
  } = useAdmin();
  const [tab, setTab] = useState<Tab>('transfers');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [receivedAmounts, setReceivedAmounts] = useState<Record<string, string>>({});

  const run = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id);
    try { await action(); Alert.alert('تم', success); }
    catch (error: any) { Alert.alert('تعذر التنفيذ', error?.message || 'تحقق من الاتصال ثم حاول مجدداً'); }
    finally { setBusyId(null); }
  };

  const pendingTransfers = bankTransfers.filter((item) => item.status === 'PENDING');
  const pendingCustody = driverSettlementRequests.filter((item) => item.status === 'Pending');
  const totalCustody = driverCustodies.reduce((sum, driver) => sum + driver.expectedCashCustody, 0);
  const totalDriverEarnings = driverCustodies.reduce((sum, driver) => sum + driver.totalEarnings, 0);

  return (
    <View style={styles.container}>
      <BoosthisScreenTracker key={tab} screen={tab === 'transfers' ? 'BankTransfers' : 'DriverCustody'} />
      <AdminHeader title="التحويلات والمدفوعات" showBack onBack={() => navigateTo('dashboard')} />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'transfers' && styles.tabActive]} onPress={() => setTab('transfers')}>
          <Text style={[styles.tabText, tab === 'transfers' && styles.tabTextActive]}>حوالات العملاء</Text>
          {pendingTransfers.length > 0 && <Text style={styles.badge}>{pendingTransfers.length}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'custody' && styles.tabActive]} onPress={() => setTab('custody')}>
          <Text style={[styles.tabText, tab === 'custody' && styles.tabTextActive]}>عهد المناديب</Text>
          {pendingCustody.length > 0 && <Text style={styles.badge}>{pendingCustody.length}</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'transfers' ? (
          <>
            {bankTransfers.length === 0 && <Text style={styles.empty}>لا توجد حوالات عملاء في قاعدة البيانات حالياً.</Text>}
            {bankTransfers.map((item) => {
              const pending = item.status === 'PENDING';
              const needsAmountConfirmation = item.status === 'VERIFIED' && item.amountReceived == null;
              const needsAmountEntry = pending || needsAmountConfirmation;
              const amountInput = receivedAmounts[item.id] ?? '';
              const saveReceivedAmount = () => {
                const normalized = amountInput.trim();
                if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || !Number.isFinite(Number(normalized)) || Number(normalized) <= 0) {
                  Alert.alert('مبلغ غير صالح', 'أدخل المبلغ الفعلي في الإيصال، بدقة لا تتجاوز منزلتين عشريتين.');
                  return;
                }
                void run(item.id, () => verifyBankTransfer(item.id, true, undefined, Number(normalized)),
                  pending ? 'تم اعتماد الحوالة وتسجيل المبلغ المستلم' : 'تم تسجيل المبلغ المستلم للحوالة السابقة');
              };
              return <View key={item.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.title}>طلب #{item.orderNumber}</Text>
                  <Text style={[styles.status, pending ? styles.pending : item.status === 'VERIFIED' ? styles.approved : styles.rejected]}>
                    {pending ? 'بانتظار المراجعة' : item.status === 'VERIFIED' ? 'معتمدة' : 'مرفوضة'}
                  </Text>
                </View>
                <Text style={styles.info}>{item.customerName} · {item.customerPhone}</Text>
                <Text style={styles.info}>طريقة التحويل: {item.transferProvider === 'ALKURAIMI' ? 'بنك الكريمي' : item.transferProvider === 'WALLET' ? 'محفظة إلكترونية' : 'غير محددة'}</Text>
                <Text style={styles.info}>قيمة الفاتورة: {item.amount.toLocaleString()} ر.ي · رقم العملية: {item.transferReference || 'غير مسجل'}</Text>
                {needsAmountEntry ? <>
                  <Text style={styles.info}>راجع الإيصال وسجل المبلغ الذي وصل فعلياً إلى الحساب البنكي.</Text>
                  <TextInput
                    value={amountInput}
                    onChangeText={(value) => setReceivedAmounts((current) => ({ ...current, [item.id]: value }))}
                    keyboardType="decimal-pad"
                    placeholder="المبلغ المستلم فعلياً"
                    accessibilityLabel="المبلغ المستلم فعلياً"
                    style={styles.amountInput}
                  />
                </> : <Text style={styles.info}>المبلغ المستلم المؤكد: {item.amountReceived!.toLocaleString()} ر.ي{item.amountReceivedAt ? ` · ${new Date(item.amountReceivedAt).toLocaleString('ar')}` : ''}</Text>}
                {item.receiptImageUrl ? <Image
                  source={{ uri: item.receiptImageUrl, headers: api.getToken() ? { Authorization: `Bearer ${api.getToken()}` } : {} }}
                  style={styles.receipt}
                  resizeMode="contain"
                /> : <Text style={styles.info}>لم يرفع العميل صورة إيصال بعد.</Text>}
                {item.rejectionReason ? <Text style={[styles.info, { color: colors.error }]}>سبب الرفض السابق: {item.rejectionReason}</Text> : null}
                {(pending || needsAmountConfirmation) && <View style={styles.actions}>
                  {pending && <TouchableOpacity style={[styles.button, styles.rejectButton]} disabled={busyId === item.id}
                    onPress={() => Alert.alert('رفض الحوالة', 'هل تريد رفض إشعار التحويل؟', [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'رفض', style: 'destructive', onPress: () => run(item.id, () => verifyBankTransfer(item.id, false, 'إشعار غير مطابق'), 'تم رفض الحوالة') },
                    ])}><Text style={styles.buttonText}>{busyId === item.id ? 'جارٍ...' : 'رفض'}</Text></TouchableOpacity>}
                  <TouchableOpacity style={[styles.button, styles.approveButton]} disabled={busyId === item.id}
                    onPress={saveReceivedAmount}><Text style={styles.buttonText}>{busyId === item.id ? 'جارٍ...' : pending ? 'اعتماد وتسجيل المبلغ' : 'تسجيل المبلغ المستلم'}</Text></TouchableOpacity>
                </View>}
              </View>;
            })}
          </>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>العهد المستحقة على المناديب</Text><Text style={styles.summaryValue}>{totalCustody.toLocaleString()} ر.ي</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>إجمالي أرباح الطلبات المسجلة للمناديب</Text><Text style={[styles.summaryValue, { color: '#166534' }]}>{totalDriverEarnings.toLocaleString()} ر.ي</Text></View>
              <Text style={styles.summaryHint}>تُعرض الأرباح المقيدة مستقلة عن العهدة، ولا تُخصم منها تلقائياً. هذا الإجمالي لا يطرح أي مبالغ أرباح صُرفت خارج النظام.</Text>
            </View>
            {driverCustodies.length === 0 && <Text style={styles.empty}>لا توجد حسابات مناديب في قاعدة البيانات حالياً.</Text>}
            {driverCustodies.map((driver) => {
              const request = driverSettlementRequests.find((item) => item.driverId === driver.driverId);
              const pending = request?.status === 'Pending';
              const netAfterOffset = driver.totalEarnings - driver.expectedCashCustody;
              return <View key={driver.driverId} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.title}>{driver.driverName}</Text>
                  {request && <Text style={[styles.status, request.status === 'Pending' ? styles.pending : request.status === 'Approved' ? styles.approved : styles.rejected]}>
                    {request.status === 'Pending' ? 'طلب بانتظار الموافقة' : request.status === 'Approved' ? 'آخر طلب معتمد' : 'آخر طلب مرفوض'}
                  </Text>}
                </View>
                <Text style={styles.info}>هاتف الموصل: {driver.phone}</Text>
                <View style={styles.amountsBox}>
                  <View style={styles.moneyRow}><Text style={[styles.moneyValue, { color: '#166534' }]}>+{driver.totalCollections.toLocaleString()} ر.ي</Text><Text style={styles.moneyLabel}>مبالغ محصلة من العملاء</Text></View>
                  <View style={styles.moneyRow}><Text style={[styles.moneyValue, { color: colors.error }]}>−{driver.totalStorePurchases.toLocaleString()} ر.ي</Text><Text style={styles.moneyLabel}>مشتريات المتاجر المدفوعة من العهدة</Text></View>
                  <View style={styles.moneyRow}><Text style={styles.moneyValue}>−{driver.totalSettlements.toLocaleString()} ر.ي</Text><Text style={styles.moneyLabel}>توريدات سابقة معتمدة</Text></View>
                  {driver.totalFundings > 0 && <View style={styles.moneyRow}><Text style={styles.moneyValue}>+{driver.totalFundings.toLocaleString()} ر.ي</Text><Text style={styles.moneyLabel}>تمويلات مسجلة للموصل</Text></View>}
                  <View style={styles.summaryDivider} />
                  <View style={styles.moneyRow}><Text style={[styles.moneyValue, { color: colors.error }]}>{driver.expectedCashCustody.toLocaleString()} ر.ي</Text><Text style={styles.moneyLabel}>العهدة النقدية المستحقة عليه</Text></View>
                  <View style={styles.moneyRow}><Text style={[styles.moneyValue, { color: '#166534' }]}>{driver.totalEarnings.toLocaleString()} ر.ي</Text><Text style={styles.moneyLabel}>إجمالي أرباح الطلبات المسجلة له</Text></View>
                  <View style={styles.moneyRow}><Text style={styles.moneyValue}>{Math.abs(netAfterOffset).toLocaleString()} ر.ي {netAfterOffset >= 0 ? 'رصيد أرباح أعلى' : 'عهدة أعلى'}</Text><Text style={styles.moneyLabel}>الفرق الحسابي بين الأرباح والعهدة</Text></View>
                </View>
                {pending && request && <>
                  <Text style={styles.info}>طلب تسوية: {Number(request.amount).toLocaleString()} ر.ي · {new Date(request.createdAt).toLocaleString('ar')}</Text>
                  {request.note ? <Text style={styles.info}>ملاحظة: {request.note}</Text> : null}
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.button, styles.rejectButton]} disabled={busyId === request.id}
                      onPress={() => Alert.alert('رفض طلب التسوية', `لن يتغير رصيد الموصل. رفض طلب ${Number(request.amount).toLocaleString()} ر.ي؟`, [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'رفض الطلب', style: 'destructive', onPress: () => run(request.id, () => rejectDriverSettlement(request.id, 'مرفوض من الإدارة'), 'تم رفض طلب التسوية؛ بقيت العهدة كما هي') },
                      ])}><Text style={styles.buttonText}>{busyId === request.id ? 'جارٍ...' : 'رفض الطلب'}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.approveButton]} disabled={busyId === request.id}
                      onPress={() => Alert.alert('اعتماد التسوية', `سيتم تسجيل استلام ${Number(request.amount).toLocaleString()} ر.ي وتحديث سجل عهدة الموصل. هل تم استلام المبلغ فعلياً؟`, [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'تم الاستلام واعتماد', onPress: () => run(request.id, () => approveDriverSettlement(request.id), 'تم اعتماد التسوية وتحديث رصيد العهدة') },
                      ])}><Text style={styles.buttonText}>{busyId === request.id ? 'جارٍ...' : 'اعتماد بعد الاستلام'}</Text></TouchableOpacity>
                  </View>
                </>}
              </View>;
            })}
          </>
        )}
        <TouchableOpacity style={styles.refresh} onPress={refreshData}><Text style={styles.refreshText}>تحديث البيانات</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row-reverse', backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: spacing.screenGutter },
  tab: { flex: 1, minHeight: 52, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: typography.fontFamily.bold, color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm },
  tabTextActive: { color: colors.primary },
  badge: { color: colors.onPrimary, backgroundColor: colors.error, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, fontSize: 11, fontFamily: typography.fontFamily.bold },
  content: { padding: spacing.screenGutter, paddingBottom: 110, gap: 12 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, padding: 16, gap: 8, ...shadows.card },
  summaryCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, padding: 16, gap: 12, ...shadows.card },
  summaryItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  summaryLabel: { fontFamily: typography.fontFamily.medium, color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm, textAlign: 'right' },
  summaryValue: { fontFamily: typography.fontFamily.bold, color: colors.error, fontSize: typography.fontSize.lg },
  summaryDivider: { height: 1, backgroundColor: colors.outlineVariant },
  summaryHint: { fontFamily: typography.fontFamily.regular, color: colors.onSurfaceVariant, fontSize: 12, textAlign: 'right' },
  amountsBox: { backgroundColor: colors.surfaceContainerLow, padding: 12, borderRadius: borderRadius.md, gap: 10 },
  moneyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  moneyLabel: { fontFamily: typography.fontFamily.medium, color: colors.onSurfaceVariant, fontSize: 13, flex: 1, textAlign: 'right' },
  moneyValue: { fontFamily: typography.fontFamily.bold, color: colors.onSurface, fontSize: 14 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.md, flex: 1, textAlign: 'right' },
  status: { fontFamily: typography.fontFamily.bold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' },
  pending: { backgroundColor: '#FFF2CC', color: '#8A5A00' },
  approved: { backgroundColor: '#DCFCE7', color: '#166534' },
  rejected: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  info: { fontFamily: typography.fontFamily.regular, color: colors.onSurfaceVariant, fontSize: typography.fontSize.sm, textAlign: 'right' },
  amountInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, padding: 10, color: colors.onSurface, textAlign: 'right', fontFamily: typography.fontFamily.medium },
  amount: { fontFamily: typography.fontFamily.bold, color: colors.primary, fontSize: 22, textAlign: 'right' },
  date: { fontFamily: typography.fontFamily.regular, color: colors.onSurfaceVariant, fontSize: 12, textAlign: 'right' },
  receipt: { width: '100%', height: 170, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md },
  actions: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  button: { flex: 1, padding: 12, alignItems: 'center', borderRadius: borderRadius.md },
  approveButton: { backgroundColor: colors.primary },
  rejectButton: { backgroundColor: colors.error },
  buttonText: { color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  empty: { fontFamily: typography.fontFamily.medium, color: colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 48, fontSize: typography.fontSize.md },
  refresh: { alignSelf: 'center', padding: 12 },
  refreshText: { color: colors.primary, fontFamily: typography.fontFamily.bold },
});
