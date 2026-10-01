import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useDriver, CourierScreenName } from '../context/DriverContext';

export const DriverBottomNav: React.FC = () => {
  const { currentScreen, navigateTo } = useDriver();

  const tabs: { id: CourierScreenName; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'لوحة المهام', icon: '📋' },
    { id: 'route', label: 'المسار', icon: '🗺️' },
    { id: 'wallet', label: 'العهدة والمالية', icon: '💰' },
  ];

  return (
    <View style={styles.container}>
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
    borderTopColor: colors.outlineVariant + '35',
    ...shadows.header,
    zIndex: 80,
  },
  bar: {
    height: Platform.OS === 'ios' ? 76 : 64,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 18 : 6,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 32,
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
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.medium,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
