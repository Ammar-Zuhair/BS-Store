import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAdmin, AdminScreenName } from '../context/AdminContext';

export const AdminBottomNav: React.FC = () => {
  const { currentScreen, navigateTo } = useAdmin();
  const insets = useSafeAreaInsets();

  const tabs: { id: AdminScreenName; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: '📊' },
    { id: 'orders', label: 'الطلبات', icon: '📋' },
    { id: 'payments', label: 'التحويلات', icon: '💳' },
    { id: 'inventory', label: 'المنتجات', icon: '🏷' },
    { id: 'financials', label: 'الضبط', icon: '⚙️' },
  ];

  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => navigateTo(tab.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                {isActive && <View style={styles.activeDot} />}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '30',
    ...shadows.header,
    zIndex: 80,
  },
  bar: {
    height: 68,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapActive: {
    transform: [{ scale: 1.1 }],
  },
  tabIcon: {
    fontSize: 18,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
