import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { DriverHeader } from '../components/DriverHeader';
import { useDriver } from '../context/DriverContext';

export const DriverWalletScreen: React.FC = () => {
  const { wallet, transactions, requestSettlement, navigateBack, refreshData, isRefreshing } = useDriver();
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settleAmount, setSettleAmount] = useState(String(wallet.currentCashCustody ?? 0));

  const handleRequestSettlement = async () => {
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح للتصفية');
      return;
    }
    try {
      setSubmitting(true);
      await requestSettlement(amount);
      setSettleModalVisible(false);
      Alert.alert('تم إرسال طلب التسوية', `أُرسل طلب توريد ${amount.toLocaleString()} ر.ي إلى المدير. لن يتغير رصيد العهدة حتى يعتمد المدير الاستلام.`);
    } catch (error: any) {
      Alert.alert('تعذر إرسال الطلب', error?.message || 'تحقق من الاتصال بالسيرفر.');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={styles.container}>
      <DriverHeader title="المحفظة والعهدة النقدية" showBack onBack={navigateBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={[colors.primary]} />}
      >
        {/* Main Custody Balance Card */}
        <View style={styles.custodyCard}>
          <View style={styles.custodyHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>💼</Text>
            </View>
            <View style={styles.custodyInfo}>
              <Text style={styles.custodyLabel}>العهدة النقدية الحالية بحوزتك</Text>
              <Text style={styles.custodyValue}>
                {wallet.currentCashCustody.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.custodyFormula}>الباقي المضاف للعملاء اليوم: {(wallet.walletChangeCreditedToday || 0).toLocaleString()} من ٥٠٠٠ ر.ي · الإجمالي: {(wallet.totalWalletChangeCredited || 0).toLocaleString()} · المعكوس: {(wallet.totalWalletChangeReversed || 0).toLocaleString()} ر.ي. الباقي المشحون مشمول في العهدة.</Text>
          <Text style={styles.custodyFormula}>
            العهدة = التحصيلات النقدية من العملاء - مشتريات المتاجر الموثقة - ما تم تسليمه للإدارة
          </Text>

          <TouchableOpacity
            style={styles.settleRequestBtn}
            onPress={() => {
              setSettleAmount(String(wallet.currentCashCustody ?? 0));
              setSettleModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.settleRequestBtnText}>إرسال طلب تسوية للمدير ➔</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsValue}>{wallet.todayEarnings.toLocaleString()} ر.ي</Text>
            <View style={styles.earningsTitleRow}>
              <Text style={styles.earningsTitle}>مستحقات أرباحك اليومية</Text>
              <Text style={styles.earningsIcon}>⭐</Text>
            </View>
          </View>
          <Text style={styles.earningsDesc}>
            حصتك {wallet.profitSharePercent}% من هامش ربح الطلبات المكتملة اليوم
          </Text>
        </View>

        {/* Ledger Transactions Feed */}
        <Text style={styles.sectionTitle}>سجل القيود والعمليات المحاسبية للعهدة</Text>

        {transactions.map((tx) => {
          const isCollection = tx.type === 'CUSTOMER_COLLECTION';
          const isEarning = tx.type === 'DRIVER_EARNING';

          return (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txTop}>
                <Text
                  style={[
                    styles.txAmount,
                    isCollection || isEarning ? styles.amountGreen : styles.amountOrange,
                  ]}
                >
                  {isCollection || isEarning ? '+' : '-'}
                  {tx.amount.toLocaleString()} ر.ي
                </Text>
                <View style={styles.txTypeWrap}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txRef}>{tx.referenceNumber}</Text>
                </View>
              </View>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Settle Modal */}
      <Modal visible={settleModalVisible} transparent animationType="slide" onRequestClose={() => setSettleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>طلب تسوية العهدة</Text>
            <Text style={styles.modalSubtitle}>
              حدد المبلغ النقدي الذي ستسلمه للمحاسب. سيبقى ضمن العهدة حتى يوافق المدير على استلامه:
            </Text>

            <TextInput
              style={styles.amountInput}
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="numeric"
              textAlign="center"
            />

            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSettleModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleRequestSettlement}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>إرسال طلب التسوية</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 110,
  },
  custodyCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    marginBottom: spacing.baseSm,
    ...shadows.card,
  },
  custodyHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  custodyInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  custodyLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary + 'CC',
  },
  custodyValue: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.onPrimary,
  },
  curr: {
    fontSize: typography.fontSize.sm,
  },
  custodyFormula: {
    fontSize: 14,
    color: colors.onPrimary + 'B0',
    textAlign: 'right',
    marginTop: spacing.baseXs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 6,
  },
  settleRequestBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.baseSm,
  },
  settleRequestBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  earningsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  earningsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  earningsIcon: {
    fontSize: 15,
  },
  earningsTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  earningsValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  earningsDesc: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: spacing.baseXs,
  },
  txCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.baseSm,
    marginBottom: spacing.baseXs,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
  },
  txTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txTypeWrap: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: spacing.baseSm,
  },
  txDesc: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  txRef: {
    fontSize: 14,
    color: colors.outline,
    marginTop: 1,
  },
  txAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  amountGreen: {
    color: colors.primary,
  },
  amountOrange: {
    color: colors.secondary,
  },
  txDate: {
    fontSize: 14,
    color: colors.outline,
    textAlign: 'right',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.65)',
    justifyContent: 'center',
    padding: spacing.screenGutter,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
  },
  modalTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
    textAlign: 'right',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: spacing.baseSm,
  },
  amountInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    height: 46,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.baseMd,
  },
  btnGroup: {
    flexDirection: 'row-reverse',
    gap: spacing.baseSm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.onSurface,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});
