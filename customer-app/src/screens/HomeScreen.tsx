import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Header } from '../components/Header';
import { OffersDealsSection } from '../components/OffersDealsSection';
import { CategoryGrid } from '../components/CategoryGrid';
import { useApp } from '../context/AppContext';

export const HomeScreen: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Offers & Deals Section (بداية بالعروض مثل عروض المتاجر أو التوصيل المجاني) */}
        <OffersDealsSection />

        {/* 2. Categories 2-Column GridView (الفئات مرتبة 2 في كل سطر) */}
        <CategoryGrid />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
