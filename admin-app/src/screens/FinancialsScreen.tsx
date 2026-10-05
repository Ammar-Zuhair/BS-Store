import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { DriverCustodyAccount } from '../types';

export const FinancialsScreen: React.FC = () => {
  const { driverCustodies, settleDriverCash, navigateTo, deliverySettings, updateDeliverySettings, driverProfitSharePercent, updateDriverProfitSharePercent, pendingDrivers, approveDriver, rejectDriver, createAdmin } = useAdmin();
  const scrollRef = useRef<ScrollView>(null);

  // Delivery Fee Settings State
  const [baseFeeInput, setBaseFeeInput] = useState<string>(
    deliverySettings?.baseFee?.toString() || '400'
  );
  const [baseDistanceInput, setBaseDistanceInput] = useState<string>(
    deliverySettings?.baseDistanceKm?.toString() || '1.0'
  );
  const [perKmFeeInput, setPerKmFeeInput] = useState<string>(
    deliverySettings?.perKmFee?.toString() || '50'
  );
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState<boolean>(
    deliverySettings?.isEnabled ?? true
  );
  const [isSavingDeliverySettings, setIsSavingDeliverySettings] = useState<boolean>(false);
  const [profitShareInput, setProfitShareInput] = useState(String(driverProfitSharePercent));
  const [isSavingProfitShare, setIsSavingProfitShare] = useState(false);
  const [simKm, setSimKm] = useState<number>(5);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  useEffect(() => {
    if (deliverySettings) {
      setBaseFeeInput(deliverySettings.baseFee.toString());
      setBaseDistanceInput(deliverySettings.baseDistanceKm.toString());
      setPerKmFeeInput(deliverySettings.perKmFee.toString());
      setIsDeliveryEnabled(deliverySettings.isEnabled);
    }
  }, [deliverySettings]);

  useEffect(() => setProfitShareInput(String(driverProfitSharePercent)), [driverProfitSharePercent]);

  const handleSaveProfitShare = async () => {
    const percent = Number(profitShareInput);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      Alert.alert('نسبة غير صحيحة', 'أدخل نسبة من 0 إلى 100.');
      return;
    }
    setIsSavingProfitShare(true);
    try {
      await updateDriverProfitSharePercent(percent);
      Alert.alert('تم الحفظ', `أصبحت حصة الموصل ${percent}% من هامش ربح المنتجات في الطلب.`);
    } catch (error: any) {
      Alert.alert('تعذر الحفظ', error?.message || 'فشل حفظ نسبة أرباح الموصل.');
    } finally {
      setIsSavingProfitShare(false);
    }
  };

  const handleSaveDeliverySettings = async () => {
    const bf = parseFloat(baseFeeInput) || 400;
    const bd = parseFloat(baseDistanceInput) || 1.0;
    const pk = parseFloat(perKmFeeInput) || 50;

    setIsSavingDeliverySettings(true);
    try {
      await updateDeliverySettings({
        isEnabled: isDeliveryEnabled,
        baseFee: bf,
        baseDistanceKm: bd,
        perKmFee: pk,
      });
      Alert.alert(
        'تم الحفظ بنجاح ✓',
        `تم تحديث إعدادات رسوم التوصيل:\n• الرسوم الأساسية: ${bf} ر.ي حتى ${bd} كم\n• لكل كم إضافي: ${pk} ر.ي`
      );
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل تحديث إعدادات رسوم التوصيل');
    } finally {
      setIsSavingDeliverySettings(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (newAdminName.trim().length < 2 || newAdminPhone.trim().length < 7 || newAdminPassword.length < 8) {
      Alert.alert('بيانات ناقصة', 'أدخل الاسم ورقم الهاتف وكلمة مرور من 8 أحرف على الأقل.');
      return;
    }
    setIsCreatingAdmin(true);
    try {
      await createAdmin(newAdminName.trim(), newAdminPhone.trim(), newAdminPassword);
      setNewAdminName(''); setNewAdminPhone(''); setNewAdminPassword('');
      Alert.alert('تم إنشاء الحساب', 'يمكن للمدير الجديد تسجيل الدخول برقم الهاتف وكلمة المرور المحددين.');
    } catch (error: any) { Alert.alert('تعذر إنشاء الحساب', error?.message || 'تعذر إنشاء حساب المدير.'); }
    finally { setIsCreatingAdmin(false); }
  };

  const simBf = parseFloat(baseFeeInput) || 400;
  const simBd = parseFloat(baseDistanceInput) || 1.0;
  const simPk = parseFloat(perKmFeeInput) || 50;
  const simCalculated = simBf + (Math.ceil(Math.max(0, simKm - simBd)) * simPk);

  // Selected driver for active settlement
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    driverCustodies[0]?.driverId || ''
  );
  const [settleAmountInput, setSettleAmountInput] = useState<string>(
    driverCustodies[0]?.expectedCashCustody.toString() || '0'
  );
  const [settleNotes, setSettleNotes] = useState<string>('');



  const activeDriver = driverCustodies.find((d) => d.driverId === selectedDriverId) || driverCustodies[0];

  const totalOutstanding = driverCustodies.reduce(
    (sum, drv) => sum + drv.expectedCashCustody,
    0
  );
  const totalCollectionsAll = driverCustodies.reduce(
    (sum, drv) => sum + drv.totalCollections,
    0
  );
  const totalPurchasesAll = driverCustodies.reduce(
    (sum, drv) => sum + drv.totalStorePurchases,
    0
  );
  const totalSettledAll = driverCustodies.reduce(
    (sum, drv) => sum + drv.totalSettlements,
    0
  );

  const handleSelectDriver = (driver: DriverCustodyAccount) => {
    setSelectedDriverId(driver.driverId);
    setSettleAmountInput(driver.expectedCashCustody.toString());
    setSettleNotes('');
  };

  const handleFullMatch = () => {
    if (activeDriver) {
      setSettleAmountInput(activeDriver.expectedCashCustody.toString());
    }
  };

  const handleQuickSettleFull = (driver: DriverCustodyAccount) => {
    if (driver.expectedCashCustody <= 0) {
      Alert.alert('تنبيه', `عهدة الكابتن ${driver.driverName} مصفاة بالكامل بالفعل (0 ر.ي).`);
      return;
    }

    Alert.alert(
      'تأكيد تصفية العهدة بالكامل',
      `هل تريد تأكيد استلام وتصفية كامل العهدة النقدية للكابتن ${driver.driverName} بمبلغ ${driver.expectedCashCustody.toLocaleString()} ر.ي؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد التصفية الفورية',
          style: 'default',
          onPress: () => {
            settleDriverCash(
              driver.driverId,
              driver.expectedCashCustody,
              'تصفية نقدية كاملة فورية عبر الإدارة'
            );
            Alert.alert(
              'تمت التصفية بنجاح ✓',
              `تم استلام مبلغ ${driver.expectedCashCustody.toLocaleString()} ر.ي من ${driver.driverName} وأصبح رصيد عهدته 0 ر.ي.`
            );
            if (driver.driverId === selectedDriverId) {
              setSettleAmountInput('0');
            }
          },
        },
      ]
    );
  };

  const handleConfirmSettlement = () => {
    if (!activeDriver) return;
    const amount = parseFloat(settleAmountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('خطأ في المبلغ', 'يرجى إدخال مبلغ توريد صحيح أكبر من الصفر');
      return;
    }

    const diff = amount - activeDriver.expectedCashCustody;
    settleDriverCash(activeDriver.driverId, amount, settleNotes);

    if (diff !== 0) {
      Alert.alert(
        'تم تسجيل التوريد مع فارق',
        `تم استلام مبلغ ${amount.toLocaleString()} ر.ي من الكابتن ${activeDriver.driverName}.\nيوجد فارق قدره ${diff > 0 ? '+' : ''}${diff.toLocaleString()} ر.ي تم تقييده في سجل المراجعة التدقيقية.`
      );
    } else {
      Alert.alert(
        'تمت تصفية العهدة بنجاح ✓',
        `تم استلام وتصفية العهدة بالكامل للكابتن ${activeDriver.driverName} بمبلغ ${amount.toLocaleString()} ر.ي.`
      );
    }

    // Refresh input to remaining balance
    const remaining = Math.max(0, activeDriver.expectedCashCustody - amount);
    setSettleAmountInput(remaining.toString());
    setSettleNotes('');
  };

  const inputAmountNum = parseFloat(settleAmountInput) || 0;
  const custodyDiff = activeDriver ? inputAmountNum - activeDriver.expectedCashCustody : 0;

  return (
    <View style={styles.container}>
      <AdminHeader title="الضبط" showBack onBack={() => navigateTo('dashboard')} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.systemShortcuts}>
          <TouchableOpacity style={styles.systemShortcut} onPress={() => navigateTo('system_management')} activeOpacity={0.82}>
            <Text style={styles.systemShortcutIcon}>⚙️</Text>
            <View style={styles.systemShortcutCopy}>
              <Text style={styles.systemShortcutTitle}>إدارة النظام</Text>
              <Text style={styles.systemShortcutHint}>إصدارات التطبيقات ووضع الصيانة</Text>
            </View>
            <Text style={styles.systemShortcutArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.systemShortcut} onPress={() => navigateTo('broadcasts')} activeOpacity={0.82}>
            <Text style={styles.systemShortcutIcon}>🔔</Text>
            <View style={styles.systemShortcutCopy}>
              <Text style={styles.systemShortcutTitle}>إشعارات العملاء</Text>
              <Text style={styles.systemShortcutHint}>إرسال رسالة وسجل البث</Text>
            </View>
            <Text style={styles.systemShortcutArrow}>‹</Text>
          </TouchableOpacity>
        </View>
        {/* Total Outstanding Custody Bento (4 Cards) */}
        <View style={styles.bentoGrid}>
          {/* Card 1: Net Outstanding (Primary Highlight) */}
          <View style={[styles.bentoCard, styles.bentoCardPrimary]}>
            <View style={styles.bentoHeader}>
              <View style={styles.bentoIconBoxPri}>
                <Text style={styles.bentoEmoji}>💰</Text>
              </View>
              <Text style={styles.bentoTagPri}>المعلق حالياً</Text>
            </View>
            <Text style={styles.bentoLabelPri}>صافي العهد المستحقة</Text>
            <Text style={styles.bentoValPri}>
              {totalOutstanding.toLocaleString()} <Text style={styles.currPri}>ر.ي</Text>
            </Text>
          </View>

          {/* Card 2: Total Collections */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeader}>
              <View style={styles.bentoIconBoxSec}>
                <Text style={styles.bentoEmoji}>📥</Text>
              </View>
              <Text style={styles.bentoTagPositive}>+ تحصيل</Text>
            </View>
            <Text style={styles.bentoLabel}>إجمالي التحصيلات</Text>
            <Text style={[styles.bentoVal, { color: colors.primary }]}>
              {totalCollectionsAll.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
          </View>

          {/* Card 3: Store Purchases */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeader}>
              <View style={styles.bentoIconBoxThird}>
                <Text style={styles.bentoEmoji}>🛍️</Text>
              </View>
              <Text style={styles.bentoTagWarning}>- مشتريات</Text>
            </View>
            <Text style={styles.bentoLabel}>مشتريات المتاجر</Text>
            <Text style={[styles.bentoVal, { color: colors.secondary }]}>
              {totalPurchasesAll.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
          </View>

          {/* Card 4: Total Settled */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeader}>
              <View style={styles.bentoIconBoxFourth}>
                <Text style={styles.bentoEmoji}>🏢</Text>
              </View>
              <Text style={styles.bentoTagNeutral}>✓ مورد</Text>
            </View>
            <Text style={styles.bentoLabel}>المورد للإدارة</Text>
            <Text style={[styles.bentoVal, { color: colors.onSurface }]}>
              {totalSettledAll.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
          </View>
        </View>

        {/* Delivery Fee Settings Card */}
        <View style={styles.deliverySettingsCard}>
          <View style={styles.settingsCardHeader}>
            <View style={styles.settingsBadge}>
              <Text style={styles.settingsBadgeText}>المسافة بين إحداثيي العميل والمتجر</Text>
            </View>
            <View style={styles.settingsTitleRow}>
              <Text style={styles.settingsTitle}>إعدادات تسعير ورسوم التوصيل</Text>
              <Text style={{ fontSize: 18 }}>🛵</Text>
            </View>
          </View>

          {/* Toggle System Active */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isDeliveryEnabled && styles.toggleBtnActive]}
              onPress={() => setIsDeliveryEnabled((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, isDeliveryEnabled && styles.toggleBtnTextActive]}>
                {isDeliveryEnabled ? 'مفعّل ✓' : 'معطّل ✗'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.toggleLabel}>نظام احتساب رسوم التوصيل الديناميكي:</Text>
          </View>

          {/* Inputs Grid: Base Fee, Base Distance, Per Km Fee */}
          <View style={styles.settingsInputsGrid}>
            <View style={styles.settingInputBox}>
              <Text style={styles.settingInputLabel}>الرسوم الأولية (ر.ي)</Text>
              <Text style={styles.settingSubtext}>ثابتة حتى مسافة الأساس</Text>
              <TextInput
                style={styles.settingTextInput}
                keyboardType="numeric"
                value={baseFeeInput}
                onChangeText={setBaseFeeInput}
                textAlign="center"
              />
            </View>

            <View style={styles.settingInputBox}>
              <Text style={styles.settingInputLabel}>مسافة الأساس (كم)</Text>
              <Text style={styles.settingSubtext}>المسافة المشمولة بالرسم</Text>
              <TextInput
                style={styles.settingTextInput}
                keyboardType="decimal-pad"
                value={baseDistanceInput}
                onChangeText={setBaseDistanceInput}
                textAlign="center"
              />
            </View>

            <View style={styles.settingInputBox}>
              <Text style={styles.settingInputLabel}>لكل كم إضافي (ر.ي)</Text>
              <Text style={styles.settingSubtext}>إضافة لكل كم بعد الأساس</Text>
              <TextInput
                style={styles.settingTextInput}
                keyboardType="numeric"
                value={perKmFeeInput}
                onChangeText={setPerKmFeeInput}
                textAlign="center"
              />
            </View>
          </View>

          {/* Live Simulator Preview */}
          <View style={styles.simCard}>
            <View style={styles.simHeader}>
              <Text style={styles.simFormula}>
                المعادلة: {simBf} ر.ي + ⌈max(0، {simKm} − {simBd})⌉ × {simPk} ر.ي
              </Text>
              <Text style={styles.simTitle}>معاينة تجريبية لاحتساب الرسوم:</Text>
            </View>

            <View style={styles.simPresetsRow}>
              {[1, 2, 3, 5, 7, 10].map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.simPresetBtn, simKm === km && styles.simPresetBtnActive]}
                  onPress={() => setSimKm(km)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.simPresetText, simKm === km && styles.simPresetTextActive]}>
                    {km} كم
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.simResultRow}>
              <Text style={styles.simResultValue}>
                {simCalculated.toLocaleString()} <Text style={{ fontSize: 13, color: colors.primary }}>ر.ي</Text>
              </Text>
              <Text style={styles.simResultLabel}>
                تكلفة التوصيل عند بعد {simKm} كم:
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveSettingsBtn, isSavingDeliverySettings && { opacity: 0.6 }]}
            onPress={handleSaveDeliverySettings}
            disabled={isSavingDeliverySettings}
            activeOpacity={0.85}
          >
            <Text style={styles.saveSettingsBtnText}>
              {isSavingDeliverySettings ? 'جاري الحفظ...' : 'حفظ وتثبيت إعدادات التوصيل 💾'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, marginBottom: spacing.baseLg, borderWidth: 1, borderColor: colors.outlineVariant }}>
          <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, color: colors.onSurface, textAlign: 'right' }}>
            نسبة أرباح الموصل
          </Text>
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: 4, marginBottom: 12 }}>
            تُحسب من هامش ربح المنتجات بعد خصم تكلفة الشراء الفعلية والخصم الموزع على الأصناف. النسبة الافتراضية 10%.
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={{ flex: 1, height: 48, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg }}
              value={profitShareInput}
              onChangeText={setProfitShareInput}
              keyboardType="decimal-pad"
              textAlign="center"
              placeholder="10"
            />
            <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, color: colors.onSurface }}>%</Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 13, borderRadius: borderRadius.md, opacity: isSavingProfitShare ? 0.6 : 1 }}
              onPress={handleSaveProfitShare}
              disabled={isSavingProfitShare}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm, color: colors.onPrimary }}>
                {isSavingProfitShare ? 'جاري الحفظ…' : 'حفظ النسبة'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, marginBottom: spacing.baseLg, borderWidth: 1, borderColor: colors.outlineVariant }}>
          <TouchableOpacity
            style={{ padding: spacing.baseMd, borderRadius: borderRadius.md, backgroundColor: colors.primary, marginBottom: spacing.baseMd }}
            onPress={() => navigateTo('accounts')}
            accessibilityRole="button"
            accessibilityLabel="إدارة حسابات المديرين والموصلين"
          >
            <Text style={{ color: colors.onPrimary, textAlign: 'center', fontFamily: typography.fontFamily.bold }}>إدارة حسابات المديرين والموصلين</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, color: colors.onSurface, textAlign: 'right' }}>طلبات إنشاء حسابات المناديب ({pendingDrivers.length})</Text>
          {pendingDrivers.length === 0 ? <Text style={{ marginTop: 8, color: colors.onSurfaceVariant, textAlign: 'right', fontFamily: typography.fontFamily.regular }}>لا توجد طلبات موافقة معلقة.</Text> : pendingDrivers.map((driver: any) => (
            <View key={driver.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
              <View style={{ flex: 1 }}><Text style={{ textAlign: 'right', color: colors.onSurface, fontFamily: typography.fontFamily.bold }}>{driver.fullName}</Text><Text style={{ textAlign: 'right', color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular }}>{driver.phone}</Text></View>
              <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 10, borderRadius: borderRadius.md, marginHorizontal: 4 }} onPress={() => Alert.alert('الموافقة على الموصل', `اعتماد حساب ${driver.fullName}؟`, [{ text: 'إلغاء', style: 'cancel' }, { text: 'موافقة', onPress: () => approveDriver(driver.id).catch((e: any) => Alert.alert('تعذر الاعتماد', e?.message || 'حاول مجدداً')) }])}><Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.bold }}>موافقة</Text></TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: colors.error, padding: 10, borderRadius: borderRadius.md }} onPress={() => Alert.alert('رفض الطلب', `رفض وحذف طلب ${driver.fullName}؟`, [{ text: 'إلغاء', style: 'cancel' }, { text: 'رفض', style: 'destructive', onPress: () => rejectDriver(driver.id).catch((e: any) => Alert.alert('تعذر الرفض', e?.message || 'حاول مجدداً')) }])}><Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.bold }}>رفض</Text></TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, marginBottom: spacing.baseLg, borderWidth: 1, borderColor: colors.outlineVariant, gap: 10 }}>
          <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg, color: colors.onSurface, textAlign: 'right' }}>إضافة مدير جديد</Text>
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, color: colors.onSurfaceVariant, textAlign: 'right' }}>يُنشأ الحساب بصلاحية مدير ويستطيع الدخول مباشرة.</Text>
          <TextInput style={styles.settingTextInput} value={newAdminName} onChangeText={setNewAdminName} placeholder="اسم المدير" textAlign="right" />
          <TextInput style={styles.settingTextInput} value={newAdminPhone} onChangeText={setNewAdminPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" textAlign="right" />
          <TextInput style={styles.settingTextInput} value={newAdminPassword} onChangeText={setNewAdminPassword} placeholder="كلمة المرور (8 أحرف على الأقل)" secureTextEntry textAlign="right" />
          <TouchableOpacity style={[styles.saveSettingsBtn, isCreatingAdmin && { opacity: 0.6 }]} disabled={isCreatingAdmin} onPress={handleCreateAdmin}><Text style={styles.saveSettingsBtnText}>{isCreatingAdmin ? 'جارٍ إنشاء الحساب…' : 'إنشاء حساب المدير'}</Text></TouchableOpacity>
        </View>

        {/* Dynamic Interactive Settlement Station (Stitch Screen a7607b93351a4b4d87d692a492ad9475) */}
        <View style={styles.settlementSection}>
          <View style={styles.settlementCardHeader}>
            <View style={styles.settleTitleWrap}>
              <View>
                <Text style={styles.settleMainTitle}>تسجيل تسوية وتوريد عهدة</Text>
              </View>
            </View>
          </View>

          {/* Captain Selector Strip */}
          <Text style={styles.fieldHeading}>اختر الكابتن المراد تصفيته:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.driverPillsScroll}
          >
            {driverCustodies.map((drv) => {
              const isSelected = drv.driverId === activeDriver?.driverId;
              return (
                <TouchableOpacity
                  key={drv.driverId}
                  style={[
                    styles.driverPill,
                    isSelected && styles.driverPillActive,
                  ]}
                  onPress={() => handleSelectDriver(drv)}
                  activeOpacity={0.8}
                >
                  <View style={styles.driverPillTop}>
                    <Text style={[styles.driverPillName, isSelected && styles.driverPillNameActive]}>
                      {drv.driverName}
                    </Text>
                    <View
                      style={[
                        styles.driverPillDot,
                        drv.status === 'ONLINE' ? styles.dotOnline : styles.dotOffline,
                      ]}
                    />
                  </View>
                  <Text style={[styles.driverPillCustody, isSelected && styles.driverPillCustodyActive]}>
                    {drv.expectedCashCustody.toLocaleString()} ر.ي
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {activeDriver && (
            <View style={styles.activeDriverBox}>
              {/* Custody Info Bar */}
              <View style={styles.activeCustodyBanner}>
                <View style={styles.activeCustodyRight}>
                  <Text style={styles.activeCustodyLabel}>صافي العهدة المستحقة بذمة الكابتن:</Text>
                  <Text style={styles.activeCustodyValue}>
                    {activeDriver.expectedCashCustody.toLocaleString()} <Text style={styles.currLg}>ر.ي</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.fullMatchBtn}
                  onPress={handleFullMatch}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fullMatchBtnText}>⚡ مطابقة المبلغ بالكامل</Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>المبلغ المستلم فعلياً للتوريد والتصفية (ر.ي):</Text>
                <View style={styles.amountInputRow}>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    value={settleAmountInput}
                    onChangeText={setSettleAmountInput}
                    placeholder="0"
                    placeholderTextColor={colors.outline}
                    textAlign="center"
                  />
                  <Text style={styles.amountUnit}>ريال يمني</Text>
                </View>
              </View>

              {/* Quick Amount Step Chips */}
              <View style={styles.quickChipsRow}>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => setSettleAmountInput(activeDriver.expectedCashCustody.toString())}
                >
                  <Text style={styles.quickChipText}>تصفية كاملة ({activeDriver.expectedCashCustody.toLocaleString()})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => setSettleAmountInput('5000')}
                >
                  <Text style={styles.quickChipText}>5,000</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => setSettleAmountInput('10000')}
                >
                  <Text style={styles.quickChipText}>10,000</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => setSettleAmountInput('20000')}
                >
                  <Text style={styles.quickChipText}>20,000</Text>
                </TouchableOpacity>
              </View>

              {/* Difference Status Badge */}
              <View
                style={[
                  styles.diffBadge,
                  custodyDiff === 0
                    ? styles.diffExact
                    : custodyDiff < 0
                    ? styles.diffDeficit
                    : styles.diffSurplus,
                ]}
              >
                <Text
                  style={[
                    styles.diffBadgeText,
                    custodyDiff === 0
                      ? styles.diffExactText
                      : custodyDiff < 0
                      ? styles.diffDeficitText
                      : styles.diffSurplusText,
                  ]}
                >
                  {custodyDiff === 0
                    ? '✓ تسوية مطابقة تماماً (الفرق: 0 ر.ي) - جاهز للاعتماد والتصفية'
                    : custodyDiff < 0
                    ? `⚠️ عجز توريد: ${Math.abs(custodyDiff).toLocaleString()} ر.ي (سيقيد فارق عهدة في سجل التدقيق)`
                    : `ℹ️ فائض توريد: +${custodyDiff.toLocaleString()} ر.ي`}
                </Text>
              </View>

              {/* Accounting Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم سند القبض وملاحظات التدقيق:</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="سند قبض رقم #... أو تفاصيل المراجعة التدقيقية"
                  placeholderTextColor={colors.outline}
                  value={settleNotes}
                  onChangeText={setSettleNotes}
                  textAlign="right"
                />
              </View>

              {/* Execution CTA Button */}
              <TouchableOpacity
                style={styles.submitSettleBtn}
                onPress={handleConfirmSettlement}
                activeOpacity={0.9}
              >
                <Text style={styles.submitSettleBtnIcon}>✓</Text>
                <Text style={styles.submitSettleBtnText}>
                  تسجيل حركة توريد للشركة (تصفية العهدة)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Captain Custody Accounts Section */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.sectionTitle}>كشف تفصيلي لحسابات عُهد المناديب</Text>
          <Text style={styles.sectionCount}>{driverCustodies.length} كباتن مسجلين</Text>
        </View>

        {driverCustodies.map((drv) => (
          <View key={drv.driverId} style={styles.driverCard}>
            <View style={styles.driverCardHeader}>
              <View
                style={[
                  styles.statusTag,
                  drv.status === 'ONLINE' ? styles.statusOnline : styles.statusOffline,
                ]}
              >
                <Text style={styles.statusTagText}>
                  {drv.status === 'ONLINE' ? 'متصل ومتاح' : drv.status === 'BUSY' ? 'في مهمة' : 'غير متصل'}
                </Text>
              </View>
              <View style={styles.driverNameWrap}>
                <Text style={styles.driverName}>{drv.driverName}</Text>
                <Text style={styles.vehiclePlate}>{drv.vehiclePlate} • 📱 {drv.phone}</Text>
              </View>
            </View>

            {/* Detailed Ledger Breakdown */}
            <View style={styles.ledgerBox}>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerValPositive}>
                  +{drv.totalCollections.toLocaleString()} ر.ي
                </Text>
                <Text style={styles.ledgerLbl}>تحصيلات نقدية من العملاء (+)</Text>
              </View>

              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerValNegative}>
                  -{drv.totalStorePurchases.toLocaleString()} ر.ي
                </Text>
                <Text style={styles.ledgerLbl}>مشتريات من المتاجر بالعهدة (-)</Text>
              </View>

              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerValSettled}>
                  -{drv.totalSettlements.toLocaleString()} ر.ي
                </Text>
                <Text style={styles.ledgerLbl}>تسويات سابقة موردة للشركة (-)</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.netCustodyRow}>
                <Text style={styles.netCustodyVal}>
                  {drv.expectedCashCustody.toLocaleString()} ر.ي
                </Text>
                <Text style={styles.netCustodyLbl}>صافي العهدة الحالية بحوزته</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.lastSettlement}>آخر تسوية: {drv.lastSettlementDate}</Text>
              
              <View style={styles.cardFooterActions}>
                <TouchableOpacity
                  style={styles.quickDirectSettleBtn}
                  onPress={() => handleQuickSettleFull(drv)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickDirectSettleText}>⚡ تصفية فورية بالكامل</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cardCustomSettleBtn}
                  onPress={() => {
                    handleSelectDriver(drv);
                    scrollRef.current?.scrollTo({ y: 140, animated: true });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cardCustomSettleText}>تسوية مخصصة ✍️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  systemShortcuts: { gap: 10, marginBottom: spacing.baseMd },
  systemShortcut: {
    minHeight: 76,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.baseMd,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  systemShortcutIcon: { fontSize: 25 },
  systemShortcutCopy: { flex: 1, alignItems: 'flex-end' },
  systemShortcutTitle: { color: colors.onSurface, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  systemShortcutHint: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular, fontSize: 13, marginTop: 2 },
  systemShortcutArrow: { fontSize: 28, color: colors.onSurfaceVariant },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    paddingBottom: 120,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.baseSm,
    marginBottom: spacing.baseMd,
  },
  bentoCard: {
    width: '48%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  bentoCardPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bentoHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bentoIconBoxPri: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoIconBoxSec: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoIconBoxThird: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoIconBoxFourth: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoEmoji: {
    fontSize: 14,
  },
  bentoTagPri: {
    fontSize: 9,
    color: colors.onPrimary + 'CC',
    fontWeight: typography.fontWeight.bold,
  },
  bentoTagPositive: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  bentoTagWarning: {
    fontSize: 9,
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
  },
  bentoTagNeutral: {
    fontSize: 9,
    color: colors.outline,
    fontWeight: typography.fontWeight.bold,
  },
  bentoLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
  bentoLabelPri: {
    fontSize: 11,
    color: colors.onPrimary + 'E0',
    textAlign: 'right',
  },
  bentoVal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extraBold,
    textAlign: 'right',
    marginTop: 2,
  },
  bentoValPri: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.onPrimary,
    textAlign: 'right',
    marginTop: 2,
  },
  curr: {
    fontSize: 10,
    fontWeight: typography.fontWeight.regular,
  },
  currPri: {
    fontSize: 10,
    fontWeight: typography.fontWeight.regular,
    color: colors.onPrimary + 'CC',
  },
  settlementSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseLg,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    ...shadows.card,
  },
  settlementCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
    paddingBottom: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  settleTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
  },
  settleTitleIcon: {
    fontSize: 24,
  },
  settleMainTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'right',
  },
  settleSubTitle: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
  fieldHeading: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 6,
  },
  driverPillsScroll: {
    gap: 8,
    paddingBottom: 8,
    flexDirection: 'row-reverse',
  },
  driverPill: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    minWidth: 120,
  },
  driverPillActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  driverPillTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  driverPillName: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  driverPillNameActive: {
    color: colors.primary,
  },
  driverPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: colors.primaryFixed,
  },
  dotOffline: {
    backgroundColor: colors.outline,
  },
  driverPillCustody: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  driverPillCustodyActive: {
    color: colors.primary,
  },
  activeDriverBox: {
    marginTop: spacing.baseSm,
  },
  activeCustodyBanner: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.baseSm,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  activeCustodyRight: {
    alignItems: 'flex-end',
  },
  activeCustodyLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  activeCustodyValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  currLg: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  fullMatchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  fullMatchBtnText: {
    fontSize: 10,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  inputGroup: {
    marginBottom: spacing.baseSm,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: 4,
  },
  amountInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    height: 46,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  amountUnit: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  quickChipsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: spacing.baseSm,
    flexWrap: 'wrap',
  },
  quickChip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  quickChipText: {
    fontSize: 10,
    color: colors.onSurface,
    fontWeight: typography.fontWeight.bold,
  },
  diffBadge: {
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.baseSm,
  },
  diffBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  diffExact: {
    backgroundColor: colors.primaryFixed,
  },
  diffExactText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  diffDeficit: {
    backgroundColor: colors.secondaryFixed,
  },
  diffDeficitText: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  diffSurplus: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  diffSurplusText: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  notesInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 10,
    height: 44,
    fontSize: 11,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  submitSettleBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...shadows.button,
  },
  submitSettleBtnIcon: {
    fontSize: 16,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  submitSettleBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  listSectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  sectionCount: {
    fontSize: 11,
    color: colors.outline,
  },
  driverCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  driverCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseXs,
  },
  driverNameWrap: {
    alignItems: 'flex-end',
  },
  driverName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  vehiclePlate: {
    fontSize: 10,
    color: colors.outline,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusOnline: {
    backgroundColor: colors.primaryFixed,
  },
  statusOffline: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  ledgerBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginTop: 4,
  },
  ledgerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  ledgerLbl: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  ledgerValPositive: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  ledgerValNegative: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  ledgerValSettled: {
    fontSize: 11,
    color: colors.outline,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant + '30',
    marginVertical: 4,
  },
  netCustodyRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  netCustodyLbl: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  netCustodyVal: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  cardFooter: {
    marginTop: spacing.baseSm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
    gap: 6,
  },
  lastSettlement: {
    fontSize: 10,
    color: colors.outline,
    textAlign: 'right',
  },
  cardFooterActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  quickDirectSettleBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  quickDirectSettleText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onPrimary,
  },
  cardCustomSettleBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cardCustomSettleText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  // Captain Invoices & Audit Section Styles
  invoicesSectionHeader: {
    marginTop: spacing.baseLg,
    marginBottom: spacing.baseMd,
    padding: spacing.baseSm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '35',
  },
  auditBadge: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: 6,
  },
  auditBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  invoicesSectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  invoicesSectionSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  adminInvoiceCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  adminInvHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  adminInvOrderBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  adminInvOrderText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  adminStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  pillApproved: {
    backgroundColor: '#E8F5E9',
  },
  pillRejected: {
    backgroundColor: '#FFEBEE',
  },
  pillPending: {
    backgroundColor: '#FFF8E1',
  },
  adminStatusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  textApproved: {
    color: '#2E7D32',
  },
  textRejected: {
    color: '#C62828',
  },
  textPending: {
    color: '#F57F17',
  },
  adminInvBody: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
  },
  adminReceiptThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceContainerHigh,
  },
  adminReceiptThumb: {
    width: '100%',
    height: '100%',
  },
  adminThumbZoom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  adminThumbZoomText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: typography.fontWeight.bold,
  },
  adminInvDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  adminInvStore: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  adminInvNum: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  adminInvDriver: {
    fontSize: 10,
    color: colors.outline,
    textAlign: 'right',
    marginTop: 2,
  },
  adminInvDriverBold: {
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  adminInvAmountBox: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  adminInvAmountLbl: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  adminInvAmountVal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  adminInvCurr: {
    fontSize: 10,
    color: colors.outline,
  },
  adminInvDate: {
    fontSize: 9,
    color: colors.outline,
    textAlign: 'right',
  },
  adminInvNotes: {
    marginTop: spacing.baseSm,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: borderRadius.sm,
  },
  adminInvNotesLbl: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
  adminInvNotesText: {
    fontSize: 10,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: 2,
  },
  adminInvActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: spacing.baseSm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  adminRejectBtn: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  adminRejectText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: '#C62828',
  },
  adminApproveBtn: {
    flex: 2,
    backgroundColor: '#2E7D32',
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  adminApproveText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 20,
  },
  previewModalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  previewCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  previewCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  deliverySettingsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseLg,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    ...shadows.card,
  },
  settingsCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  settingsTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  settingsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  settingsBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  settingsBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: spacing.baseSm,
  },
  toggleLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurface,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    color: colors.onSurfaceVariant,
  },
  toggleBtnTextActive: {
    color: colors.onPrimary,
  },
  settingsInputsGrid: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: spacing.baseSm,
  },
  settingInputBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '20',
  },
  settingInputLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 2,
  },
  settingSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 9,
    color: colors.outline,
    textAlign: 'center',
    marginBottom: 6,
  },
  settingTextInput: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    paddingVertical: 5,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  simCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    padding: 10,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  simHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  simTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.onSurface,
  },
  simFormula: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.outline,
  },
  simPresetsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 8,
  },
  simPresetBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
  },
  simPresetBtnActive: {
    backgroundColor: colors.secondary,
  },
  simPresetText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  simPresetTextActive: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  simResultRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 8,
    borderRadius: borderRadius.sm,
  },
  simResultLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  simResultValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.primary,
  },
  saveSettingsBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  saveSettingsBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
});
