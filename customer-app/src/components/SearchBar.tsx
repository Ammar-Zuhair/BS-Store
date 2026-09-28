import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

interface SearchBarProps {
  onFilterPress?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onFilterPress }) => {
  const { searchQuery, setSearchQuery } = useApp();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterBtn}
        onPress={onFilterPress}
        activeOpacity={0.8}
      >
        <Text style={styles.filterIcon}>⚙️</Text>
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="ابحث عن وجبة، منتج، أو متجر محلي..."
          placeholderTextColor={colors.onSurfaceVariant + '90'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.baseXs,
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
    height: 48,
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
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
    ...shadows.card,
  },
  filterIcon: {
    fontSize: 18,
  },
});
