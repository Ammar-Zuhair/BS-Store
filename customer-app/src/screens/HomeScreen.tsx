import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { typography, spacing, ThemeColors } from '../theme';
import { Header } from '../components/Header';
import { OffersDealsSection } from '../components/OffersDealsSection';
import { CategoryGrid } from '../components/CategoryGrid';
import { HomeSkeleton } from '../components/Shimmer';
import { useApp } from '../context/AppContext';

export const HomeScreen: React.FC = () => {
  const { isLoadingCatalog, categories, colors: themeColors } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  // Show YouTube-style Shimmer skeleton when catalog is loading initially
  const showSkeleton = isLoadingCatalog && categories.length === 0;

  return (
    <View style={styles.container}>
      <Header />

      {showSkeleton ? (
        <HomeSkeleton />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Offers & Deals Section (بداية بالعروض مثل عروض المتاجر أو التوصيل المجاني) */}
          <OffersDealsSection />

          {/* 2. Categories 2-Column GridView (الفئات مرتبة 2 في كل سطر) */}
          <CategoryGrid />
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  section: {
    marginTop: spacing.baseMd,
    paddingHorizontal: spacing.screenGutter,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.baseSm,
  },
  titleInfo: {
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
  seeAllText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.secondary,
  },
});
