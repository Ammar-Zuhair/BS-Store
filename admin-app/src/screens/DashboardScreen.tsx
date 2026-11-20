import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { AdminHeader } from '../components/AdminHeader';
import { useAdmin } from '../context/AdminContext';
import { adminApi } from '../api';

export const DashboardScreen: React.FC = () => {
  const { kpi, timeframe, setTimeframe, navigateTo, auditLogs } = useAdmin();

  const [currentDateTime, setCurrentDateTime] = useState({
    dateStr: '',
    timeStr: '',
  });
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);

  const loadPendingDrivers = async () => {
    try { setPendingDrivers(await adminApi.getPendingDrivers()); } catch (error) { console.warn('تعذر تحميل طلبات الموصلين', error); }
  };

  useEffect(() => { void loadPendingDrivers(); }, []);

  const reviewDriver = async (id: string, approve: boolean) => {
    try {
      if (approve) await adminApi.approveDriver(id);
      else await adminApi.rejectDriver(id);
      await loadPendingDrivers();
    } catch (error: any) {
      Alert.alert('تعذر تنفيذ الإجراء', error?.message || 'حاول مرة أخرى.');
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');

      setCurrentDateTime({
        dateStr: `اليوم، ${dayName} ${dayNum} ${monthName} ${year}`,
        timeStr: `تحديث مباشر: ${hours}:${minutes}`,
      });
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <AdminHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Date & Timeframe Segment */}
        <View style={styles.timeframeCard}>
          <View style={styles.dateRow}>
            <View style={styles.timeTag}>
              <Text style={styles.timeTagIcon}>⏱</Text>
              <Text style={styles.timeTagText}>{currentDateTime.timeStr || 'تحديث مباشر'}</Text>
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateText}>{currentDateTime.dateStr || 'اليوم'}</Text>
            </View>
          </View>

          {/* Timeframe Filter Buttons */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, timeframe === 'today' && styles.filterBtnActive]}
              onPress={() => setTimeframe('today')}
            >
              <Text style={[styles.filterBtnText, timeframe === 'today' && styles.filterBtnTextActive]}>
                اليوم
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, timeframe === 'week' && styles.filterBtnActive]}
              onPress={() => setTimeframe('week')}
            >
              <Text style={[styles.filterBtnText, timeframe === 'week' && styles.filterBtnTextActive]}>
                هذا الأسبوع
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, timeframe === 'month' && styles.filterBtnActive]}
              onPress={() => setTimeframe('month')}
            >
              <Text style={[styles.filterBtnText, timeframe === 'month' && styles.filterBtnTextActive]}>
                هذا الشهر
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Critical Operational Alert Banners */}
        <View style={styles.driverApplicationsCard}>
          <View style={styles.driverApplicationsHeader}>
            <Text style={styles.feedTitle}>طلبات انضمام الموصلين ({pendingDrivers.length})</Text>
            <Text>🛵</Text>
          </View>
          {pendingDrivers.map((driver) => <View key={driver.id} style={styles.driverApplicationRow}>
            <View style={styles.driverApplicationActions}>
              <TouchableOpacity onPress={() => reviewDriver(driver.id, true)} style={styles.approveDriverButton}><Text style={styles.approveDriverText}>موافقة</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => reviewDriver(driver.id, false)} style={styles.rejectDriverButton}><Text style={styles.rejectDriverText}>رفض</Text></TouchableOpacity>
            </View>
            <View style={styles.driverApplicationInfo}><Text style={styles.driverApplicationName}>{driver.fullName}</Text><Text style={styles.driverApplicationPhone}>{driver.phone}</Text></View>
          </View>)}
          {pendingDrivers.length === 0 && <Text style={styles.noDriverApplications}>لا توجد طلبات معلقة</Text>}
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View style={styles.alertCountBadge}>
              <Text style={styles.alertCountText}>{kpi.criticalPendingCount} مهام</Text>
            </View>
            <View style={styles.alertTitleRow}>
              <Text style={styles.alertTitle}>عمليات معلقة حرجة</Text>
              <Text style={styles.alertIcon}>⚠️</Text>
            </View>
          </View>

          <View style={styles.alertTasks}>
            <TouchableOpacity
              style={styles.alertTaskRow}
              onPress={() => navigateTo('orders')}
              activeOpacity={0.8}
            >
              <Text style={styles.alertActionLink}>تعيين ➔</Text>
              <View style={styles.taskLabelRow}>
                <Text style={styles.taskText}>
                  {kpi.pendingDriverOrdersCount} طلبات بانتظار تعيين مندوب توصيل
                </Text>
                <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.alertTaskRow}
              onPress={() => navigateTo('wallet')}
              activeOpacity={0.8}
            >
              <Text style={[styles.alertActionLink, { color: colors.tertiary }]}>مراجعة ➔</Text>
              <View style={styles.taskLabelRow}>
                <Text style={styles.taskText}>
                  شحن أرصدة العملاء · الطلبات والحركات وطرق الشحن
                </Text>
                <View style={[styles.dot, { backgroundColor: colors.tertiary }]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Key Executive KPIs Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.liveCashFlowBadge}>
            <Text style={styles.liveCashFlowText}>📈 تدفق نقدي فوري</Text>
          </View>
          <Text style={styles.sectionTitle}>المؤشرات المالية الحيوية</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* KPI 1: Sales */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconWrap, { backgroundColor: colors.primaryFixedDim + '30' }]}>
                <Text style={styles.kpiIcon}>💵</Text>
              </View>
              <Text style={styles.kpiLabel}>إجمالي المبيعات</Text>
            </View>
            <Text style={styles.kpiValue}>
              {kpi.salesTotal.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
            <Text style={styles.subtext}>عدد الطلبات اليوم: {kpi.ordersToday}</Text>
            <View style={styles.kpiTrend}>
              <Text style={styles.trendText}>{kpi.salesChangePercent >= 0 ? '+' : ''}{kpi.salesChangePercent}% عن الأمس</Text>
              <Text style={styles.trendArrow}>{kpi.salesChangePercent >= 0 ? '↑' : '↓'}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '78%', backgroundColor: colors.primary }]} />
            </View>
          </View>

          {/* KPI 2: Gross Profit */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconWrap, { backgroundColor: colors.primaryContainer + '20' }]}>
                <Text style={styles.kpiIcon}>👛</Text>
              </View>
              <Text style={styles.kpiLabel}>الأرباح المقدرة</Text>
            </View>
            <Text style={styles.kpiValue}>
              {kpi.grossProfit.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
            <View style={styles.kpiTrend}>
              <Text style={styles.marginText}>الهامش: {kpi.profitMarginPercent}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '64%', backgroundColor: colors.primaryContainer }]} />
            </View>
          </View>

          {/* KPI 3: Purchase Costs */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={styles.kpiIcon}>🏪</Text>
              </View>
              <Text style={styles.kpiLabel}>تكلفة المشتريات</Text>
            </View>
            <Text style={styles.kpiValue}>
              {kpi.purchaseCostTotal.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
            <Text style={styles.subtext}>مستودع + وساطة خارجية</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '84%', backgroundColor: colors.outline }]} />
            </View>
          </View>

          {/* KPI 4: Field Custody */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <View style={[styles.kpiIconWrap, { backgroundColor: colors.secondaryFixed }]}>
                <Text style={styles.kpiIcon}>🛵</Text>
              </View>
              <Text style={styles.kpiLabel}>عُهد الميدان النقدية</Text>
            </View>
            <Text style={styles.kpiValue}>
              {kpi.fieldCustodyTotal.toLocaleString()} <Text style={styles.curr}>ر.ي</Text>
            </Text>
            <TouchableOpacity onPress={() => navigateTo('financials')}>
              <Text style={styles.settleLink}>مراجعة وتسوية ➔</Text>
            </TouchableOpacity>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '45%', backgroundColor: colors.secondary }]} />
            </View>
          </View>
        </View>

        {/* Quick Admin Actions Grid (4 Buttons matching Stitch) */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.quickActionsTitle}>إجراءات الإدارة السريعة</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigateTo('payments')}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: colors.primaryFixed }]}>
                <Text style={styles.quickActionEmoji}>🏦</Text>
              </View>
              <Text style={styles.quickActionText}>مراجعة البنوك</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigateTo('inventory')}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={styles.quickActionEmoji}>📦</Text>
              </View>
              <Text style={styles.quickActionText}>جرد المخزن</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigateTo('financials')}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: colors.secondaryFixed }]}>
                <Text style={styles.quickActionEmoji}>🧾</Text>
              </View>
              <Text style={styles.quickActionText}>تصفية عهدة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigateTo('add_product')}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: colors.tertiaryFixed }]}>
                <Text style={styles.quickActionEmoji}>＋</Text>
              </View>
              <Text style={styles.quickActionText}>منتج جديد</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Orders Pipeline Summary */}
        <View style={styles.pipelineCard}>
          <View style={styles.pipelineHeader}>
            <TouchableOpacity onPress={() => navigateTo('orders')}>
              <Text style={styles.pipelineLink}>عرض الكل ‹</Text>
            </TouchableOpacity>
            <View style={styles.pipelineTitleWrap}>
              <Text style={styles.pipelineTitle}>مسار الطلبات المباشر (66)</Text>
              <Text style={styles.pipelineSubtitle}>حالة الطلبات اللحظية لليوم</Text>
            </View>
          </View>

          {/* Visual Pipeline Multi-Segment Bar */}
          <View style={styles.pipelineMultiBar}>
            <View style={[styles.barSegment, { flex: 2, backgroundColor: colors.tertiary }]} />
            <View style={[styles.barSegment, { flex: 4, backgroundColor: colors.secondary }]} />
            <View style={[styles.barSegment, { flex: 18, backgroundColor: colors.secondaryContainer }]} />
            <View style={[styles.barSegment, { flex: 32, backgroundColor: colors.primary }]} />
            <View style={[styles.barSegment, { flex: 10, backgroundColor: colors.primaryContainer }]} />
          </View>

          {/* Pipeline Legend */}
          <View style={styles.pipelineLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.tertiary }]} />
              <Text style={styles.legendText}>معلق دفع (2)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
              <Text style={styles.legendText}>بانتظار سائق (4)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.secondaryContainer }]} />
              <Text style={styles.legendText}>شراء وتجهيز (18)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>في الطريق (32)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primaryContainer }]} />
              <Text style={styles.legendText}>مسلم (10)</Text>
            </View>
          </View>
        </View>

        {/* Live Operations Feed (Audit Logs) */}
        <View style={styles.feedCard}>
          <Text style={styles.feedTitle}>سجل العمليات المباشر (Audit Log)</Text>
          {auditLogs.map((log) => (
            <View key={log.id} style={styles.feedItem}>
              <Text style={styles.feedTime}>{log.timestamp}</Text>
              <View style={styles.feedDetails}>
                <View style={styles.feedActorRow}>
                  <Text style={styles.feedEntity}>{log.entityId}</Text>
                  <Text style={styles.feedAction}>{log.action}</Text>
                </View>
                <Text style={styles.feedDesc}>{log.details}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  driverApplicationsCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl, padding: spacing.baseMd, marginBottom: spacing.baseMd, borderWidth: 1, borderColor: colors.outlineVariant + '40' },
  driverApplicationsHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  driverApplicationRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.baseSm, borderTopWidth: 1, borderTopColor: colors.surfaceContainerLow },
  driverApplicationActions: { flexDirection: 'row-reverse', gap: 6 },
  approveDriverButton: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md },
  approveDriverText: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
  rejectDriverButton: { backgroundColor: colors.errorContainer, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md },
  rejectDriverText: { color: colors.error, fontSize: 11, fontWeight: '700' },
  driverApplicationInfo: { alignItems: 'flex-end' },
  driverApplicationName: { color: colors.onSurface, fontWeight: '700' },
  driverApplicationPhone: { color: colors.onSurfaceVariant, fontSize: 12 },
  noDriverApplications: { color: colors.onSurfaceVariant, textAlign: 'right', paddingTop: spacing.baseSm },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: spacing.baseSm,
    paddingBottom: 120,
  },
  timeframeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  dateRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  dateInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  dateIcon: {
    fontSize: 14,
  },
  dateText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  timeTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  timeTagIcon: {
    fontSize: 11,
  },
  timeTagText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  filterBtnTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.onPrimary,
  },
  alertCard: {
    backgroundColor: colors.secondaryFixed + '40',
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.secondaryFixedDim,
    ...shadows.card,
  },
  alertHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseXs,
  },
  alertTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSecondaryContainer,
  },
  alertCountBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  alertCountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onSecondary,
  },
  alertTasks: {
    gap: 6,
  },
  alertTaskRow: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.baseSm,
    borderRadius: borderRadius.lg,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
    textAlign: 'right',
  },
  alertActionLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.baseXs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
  },
  liveCashFlowBadge: {
    backgroundColor: colors.primaryFixedDim + '25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  liveCashFlowText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
  },
  kpiGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.baseSm,
    marginBottom: spacing.baseSm,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  kpiCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIcon: {
    fontSize: 14,
  },
  kpiLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  kpiValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
    textAlign: 'right',
  },
  curr: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  kpiTrend: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trendArrow: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  trendText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
  },
  marginText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
  },
  subtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 9,
    color: colors.outline,
    textAlign: 'right',
    marginTop: 2,
  },
  settleLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.secondary,
    textAlign: 'right',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quickActionsSection: {
    marginBottom: spacing.baseSm,
  },
  quickActionsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: spacing.baseSm,
  },
  quickActionsGrid: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.baseSm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '20',
    ...shadows.card,
  },
  quickActionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionEmoji: {
    fontSize: 18,
  },
  quickActionText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onSurface,
    textAlign: 'center',
  },
  pipelineCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseSm,
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  pipelineHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  pipelineTitleWrap: {
    alignItems: 'flex-end',
  },
  pipelineTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  pipelineSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  pipelineLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  pipelineMultiBar: {
    flexDirection: 'row-reverse',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    gap: 1,
    marginBottom: 8,
  },
  barSegment: {
    height: '100%',
  },
  pipelineLegend: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  feedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.baseMd,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '30',
    ...shadows.card,
  },
  feedTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'right',
    marginBottom: spacing.baseSm,
  },
  feedItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  feedTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.outline,
  },
  feedDetails: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  feedActorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  feedAction: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  feedEntity: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.primaryFixedDim + '20',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  feedDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 1,
  },
});
