import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { AppIcon } from '../components/AppIcon';
import { useApp } from '../context/AppContext';
import { notificationsApi } from '../api/notifications';
import { borderRadius, spacing, ThemeColors, typography } from '../theme';
import { formatNotificationDate, InboxNotification, isInboxNotification, notificationLabels } from '../utils/notificationInbox';

export const NotificationsScreen: React.FC = () => {
  const { colors, navigateTo, cart } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPage, setFailedPage] = useState(1);
  const mounted = useRef(false);
  const requestId = useRef(0);
  const pending = useRef(false);

  const load = useCallback(async (targetPage = 1, mode: 'refresh' | 'more' | 'background' = 'refresh') => {
    if (mode !== 'refresh' && pending.current) return;
    const id = ++requestId.current;
    pending.current = true;
    if (mode === 'more') setLoadingMore(true);
    else {
      setLoadingMore(false);
      if (mode === 'refresh') setRefreshing(true);
    }
    setError(null);
    try {
      const result = await notificationsApi.getInbox(targetPage);
      if (!mounted.current || id !== requestId.current) return;
      const received = result.items.filter(isInboxNotification);
      setItems(previous => {
        const combined = targetPage === 1 && mode !== 'background' ? received : [...previous, ...received];
        return [...new Map(combined.map(item => [item.id, item])).values()]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
      if (mode !== 'background') {
        setPage(targetPage);
        setHasMore(result.hasMore);
      }
    } catch (cause) {
      if (!mounted.current || id !== requestId.current) return;
      setFailedPage(targetPage);
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل الإشعارات. حاول مجدداً.');
    } finally {
      if (mounted.current && id === requestId.current) {
        pending.current = false;
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => { if (AppState.currentState === 'active') void load(1, 'background'); };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const timer = setInterval(refresh, 30000);
    return () => {
      mounted.current = false;
      ++requestId.current;
      pending.current = false;
      subscription.remove();
      clearInterval(timer);
    };
  }, [load]);

  return (
    <View style={styles.container}>
      <Header title="الإشعارات" showBack onBack={() => navigateTo('home')} onRefresh={() => load()} />
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: (cart.length ? 164 : 90) + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View>
            <View style={styles.intro}>
              <View style={styles.icon}><AppIcon name="bell" size={24} color={colors.primary} /></View>
              <View style={styles.introText}>
                <Text style={styles.heading}>رسائل الإدارة</Text>
                <Text style={styles.subtitle}>آخر العروض والإعلانات وتحديثات التطبيق</Text>
              </View>
            </View>
            {error && <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إعادة تحميل الإشعارات" onPress={() => void load(failedPage, failedPage > 1 ? 'more' : 'refresh')} style={styles.button}>
                <Text style={styles.buttonText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>}
          </View>
        }
        ListEmptyComponent={refreshing ? <ActivityIndicator style={styles.empty} color={colors.primary} size="large" /> : !error ? (
          <View style={styles.empty}>
            <AppIcon name="message" size={42} color={colors.onSurfaceVariant} />
            <Text style={styles.heading}>لا توجد إشعارات بعد</Text>
            <Text style={styles.subtitle}>ستظهر هنا رسائل الإدارة عند وصولها</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AppIcon name={item.type === 'offer' || item.type === 'promotion' ? 'gift' : 'bell'} size={18} color={colors.primary} />
              <Text style={styles.category}>{notificationLabels[item.type]}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body} selectable>{item.body}</Text>
            <View style={styles.timestamp}>
              <AppIcon name="clock" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.date}>{formatNotificationDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : hasMore ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="عرض الإشعارات الأقدم" style={[styles.button, styles.footer]} disabled={refreshing} onPress={() => void load(page + 1, 'more')}>
            <Text style={styles.buttonText}>عرض الإشعارات الأقدم</Text>
          </TouchableOpacity>
        ) : null}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.screenGutter, flexGrow: 1 },
  intro: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  introText: { flex: 1 },
  icon: { width: 52, height: 52, borderRadius: borderRadius.lg, backgroundColor: colors.iconBadgeBg, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: 19, color: colors.onSurface, textAlign: 'right' },
  subtitle: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 23, color: colors.onSurfaceVariant, textAlign: 'right' },
  card: { backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.xl, padding: 18, marginBottom: 12, gap: 10 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  category: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: colors.onSurfaceVariant },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 18, lineHeight: 28, color: colors.onSurface, textAlign: 'right' },
  body: { fontFamily: typography.fontFamily.regular, fontSize: 16, lineHeight: 27, color: colors.onSurface, textAlign: 'right' },
  timestamp: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant, paddingTop: 10 },
  date: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'right' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 14 },
  error: { backgroundColor: colors.surfaceSolid, borderRadius: borderRadius.lg, padding: 16, marginBottom: 16, gap: 12 },
  errorText: { fontFamily: typography.fontFamily.medium, color: colors.error, textAlign: 'right', lineHeight: 24 },
  button: { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.md, padding: 14, alignItems: 'center' },
  buttonText: { fontFamily: typography.fontFamily.bold, fontSize: 14, color: colors.onPrimaryContainer },
  footer: { marginVertical: 12 },
});
