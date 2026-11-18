import { useResponsiveLayout } from '../layout/ResponsiveLayout';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, borderRadius, shadows } from '../theme';
import { useApp, ScreenName } from '../context/AppContext';
import { AppIcon, AppIconName } from './AppIcon';

export const BottomNav: React.FC = () => {
  const { currentScreen, navigateTo, colors: themeColors } = useApp();
  const insets = useSafeAreaInsets();
  const { compact, navHeight } = useResponsiveLayout();

  const tabs: { id: ScreenName; label: string; icon: AppIconName }[] = [
    { id: 'home', label: 'الرئيسية', icon: 'home' },
    { id: 'tracking', label: 'طلباتي', icon: 'receipt' },
    { id: 'profile', label: 'حسابي', icon: 'user' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surfaceContainerLowest,
          borderTopColor: themeColors.outlineVariant,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={[styles.bar, { minHeight: navHeight, paddingTop: compact ? 0 : 4 }]}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, compact && { flexDirection: 'row-reverse', gap: 8, minHeight: 48 }]}
              onPress={() => navigateTo(tab.id)}
              activeOpacity={0.78}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <View
                style={[
                  styles.iconWrap,
                  isActive && {
                    backgroundColor: themeColors.primaryContainer,
                    borderWidth: 1,
                    borderColor: themeColors.outlineVariant,
                  },
                ]}
              >
                <AppIcon
                  name={tab.icon}
                  size={20}
                  color={isActive ? themeColors.primary : themeColors.onSurfaceVariant}
                  strokeWidth={isActive ? 2.15 : 1.8}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? themeColors.primary : themeColors.onSurfaceVariant },
                  isActive && styles.tabLabelActive,
                ]}
              >
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
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...shadows.header,
    zIndex: 80,
  },
  bar: {
    minHeight: 64,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  tab: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 30,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
  },
  tabLabelActive: {
    fontFamily: typography.fontFamily.bold,
  },
});
