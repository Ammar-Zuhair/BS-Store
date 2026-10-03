import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { AppIcon } from './AppIcon';

interface SearchBarProps {
  onFilterPress?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onFilterPress }) => {
  const { searchQuery, setSearchQuery, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={onFilterPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="خيارات البحث والتصفية"
      >
        <AppIcon name="filter" size={19} color={themeColors.primary} />
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="ابحث عن وجبة، منتج، أو متجر محلي..."
          placeholderTextColor={themeColors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
          accessibilityLabel="البحث عن وجبة أو منتج أو متجر"
        />
        <AppIcon name="search" size={19} color={themeColors.onSurfaceVariant} />
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseSm,
    paddingHorizontal: spacing.screenGutter,
    marginVertical: spacing.baseXs,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.baseSm,
    minHeight: 50,
    height: 50,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: spacing.baseXs,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
  },
});
