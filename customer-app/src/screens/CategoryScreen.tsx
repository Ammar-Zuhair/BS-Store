import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Header } from '../components/Header';
import { CategoryPills } from '../components/CategoryPills';
import { ProductCard } from '../components/ProductCard';
import { mockProducts, mockStores } from '../mock';
import { useApp } from '../context/AppContext';

export const CategoryScreen: React.FC = () => {
  const { selectedCategory, navigateTo, products, stores } = useApp();
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');

  const allProducts = products.length > 0 ? products : mockProducts;
  const allStores = stores.length > 0 ? stores : mockStores;

  // Filter products by category and store
  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === 'cat-all' || product.categoryId === selectedCategory;
    const matchesStore =
      selectedStoreFilter === 'all' || product.storeId === selectedStoreFilter;
    return matchesCategory && matchesStore;
  });

  return (
    <View style={styles.container}>
      <Header title="تصفح الأقسام والمتاجر" showBack onBack={() => navigateTo('home')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Categories selector */}
        <CategoryPills />

        {/* Store Filter Pills */}
        <View style={styles.storeFilterWrap}>
          <Text style={styles.filterTitle}>تصفية حسب المتجر:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storeFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.storePill,
                selectedStoreFilter === 'all' && styles.storePillActive,
              ]}
              onPress={() => setSelectedStoreFilter('all')}
            >
              <Text
                style={[
                  styles.storePillText,
                  selectedStoreFilter === 'all' && styles.storePillTextActive,
                ]}
              >
                جميع المتاجر
              </Text>
            </TouchableOpacity>

            {allStores.map((st) => (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.storePill,
                  selectedStoreFilter === st.id && styles.storePillActive,
                ]}
                onPress={() => setSelectedStoreFilter(st.id)}
              >
                <Text
                  style={[
                    styles.storePillText,
                    selectedStoreFilter === st.id && styles.storePillTextActive,
                  ]}
                >
                  {st.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Count and Results */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            تم العثور على {filteredProducts.length} صنف متاح
          </Text>
          <View style={styles.badgeRtl}>
            <Text style={styles.badgeRtlText}>أسعار شاملة الضريبة</Text>
          </View>
        </View>

        {/* Product Cards List */}
        <View style={styles.productsList}>
          {filteredProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}

          {filteredProducts.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>لا توجد أصناف مطابقة لهذا التصنيف</Text>
              <Text style={styles.emptySubtitle}>
                جرب اختيار تصنيف آخر أو تصفح جميع المتاجر
              </Text>
            </View>
          )}
        </View>
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
    paddingBottom: 150,
  },
  storeFilterWrap: {
    paddingHorizontal: spacing.screenGutter,
    marginTop: spacing.baseXs,
    marginBottom: spacing.baseSm,
  },
  filterTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginBottom: 6,
  },
  storeFilterScroll: {
    flexDirection: 'row-reverse',
    gap: spacing.baseXs,
  },
  storePill: {
    paddingHorizontal: spacing.baseSm,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  storePillActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  storePillText: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurface,
  },
  storePillTextActive: {
    color: colors.onSecondary,
    fontWeight: typography.fontWeight.bold,
  },
  resultsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
    marginBottom: spacing.baseXs,
  },
  resultsCount: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.fontWeight.bold,
  },
  badgeRtl: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeRtlText: {
    fontSize: 10,
    color: colors.outline,
  },
  productsList: {
    paddingHorizontal: spacing.screenGutter,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.baseXs,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.onSurface,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
});
