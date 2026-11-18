import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows, ThemeColors } from '../theme';
import { useApp } from '../context/AppContext';
import { Category } from '../types';

interface CategoryGridProps {
  onCategoryPress?: (cat: Category) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onCategoryPress }) => {
  const { categories, setSelectedCategory, navigateTo, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridWidth >= 960 ? 4 : gridWidth >= 600 ? 3 : 2;
  const cardWidth = gridWidth ? (gridWidth - 12 * (columns - 1)) / columns : undefined;
  const allCategories = categories;
  // Exclude 'cat-all' from the grid so grid shows real categories in pairs
  const displayCats = allCategories.filter((c) => c.id !== 'cat-all');

  const handlePress = (cat: Category) => {
    setSelectedCategory(cat.id);
    if (onCategoryPress) {
      onCategoryPress(cat);
    } else {
      navigateTo('category_stores');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>{displayCats.length} فئات</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.sectionTitle}>تصفح الفئات والأقسام</Text>
          <Text style={styles.sectionSubtitle}>اختر الفئة لاستعراض المتاجر والعروض التابعة لها</Text>
        </View>
      </View>

      <View style={styles.gridContainer} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
        {displayCats.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.gridItem, cardWidth !== undefined && { width: cardWidth }]}
            activeOpacity={0.85}
            onPress={() => handlePress(cat)}
            accessibilityRole="button"
            accessibilityLabel={'تصفح فئة ' + cat.name}
            accessibilityHint="يفتح متاجر وعروض هذه الفئة"
          >
            <View style={styles.iconCircle}>
              <Text style={styles.categoryIcon} accessible={false}>
                {cat.icon}
              </Text>
            </View>

            <Text style={styles.categoryName} numberOfLines={1}>
              {cat.name}
            </Text>

            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>
                {cat.itemCount ? `${cat.itemCount} صنف متاح` : 'تصفح المتاجر'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    marginVertical: spacing.baseMd,
    paddingHorizontal: spacing.screenGutter,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseMd,
  },
  titleWrap: {
    flex: 1, marginStart: 8,
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  badgeWrap: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
  },
  gridContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    padding: spacing.baseMd,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.baseSm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  categoryIcon: {
    fontSize: 32,
    lineHeight: 38,
  },
  categoryName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 6,
  },
  itemCountBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  itemCountText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});
