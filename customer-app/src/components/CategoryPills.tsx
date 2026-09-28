import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { mockCategories } from '../mock';
import { useApp } from '../context/AppContext';

export const CategoryPills: React.FC = () => {
  const { selectedCategory, setSelectedCategory, categories } = useApp();
  const displayCategories = categories.length > 0
    ? (categories.some((c) => c.id === 'cat-all') ? categories : [{ id: 'cat-all', name: 'الكل', icon: 'apps', itemCount: 0 }, ...categories])
    : mockCategories;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayCategories.map((cat) => {
          const isSelected = cat.id === selectedCategory;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.baseXs,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenGutter,
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  pill: {
    paddingHorizontal: spacing.baseMd,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '50',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.onSurfaceVariant,
  },
  pillTextActive: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.bold,
  },
});
