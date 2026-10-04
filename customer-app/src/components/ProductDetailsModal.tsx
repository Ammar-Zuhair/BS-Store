import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CachedImage } from './CachedImage';
import { Product } from '../types';
import { borderRadius, spacing, ThemeColors, typography } from '../theme';
import { useApp } from '../context/AppContext';
import { AppIcon } from './AppIcon';
import { BoosthisScreenTracker } from '../monitoring/BoosthisRuntime';

interface Props { product: Product | null; onClose: () => void }

export const ProductDetailsModal: React.FC<Props> = ({ product, onClose }) => {
  const { addToCart, colors } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [imageIndex, setImageIndex] = useState(0);
  const images = useMemo(() => Array.from(new Set([...(product?.images || []), product?.imageUrl].filter((item): item is string => Boolean(item)))), [product]);

  useEffect(() => setImageIndex(0), [product?.id]);
  if (!product) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BoosthisScreenTracker screen="ProductDetails" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="إغلاق تفاصيل المنتج"
            >
              <AppIcon name="close" size={19} color={colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تفاصيل المنتج</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <CachedImage source={{ uri: images[imageIndex] || product.imageUrl }} style={styles.hero} resizeMode="contain" accessibilityLabel={'صورة ' + product.name} />
            {images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
              {images.map((uri, index) => <TouchableOpacity key={`${uri}-${index}`} onPress={() => setImageIndex(index)} style={[styles.thumbWrap, index === imageIndex && styles.thumbSelected]} accessibilityRole="button" accessibilityLabel={`عرض الصورة ${index + 1} من ${images.length}`} accessibilityState={{ selected: index === imageIndex }}>
                <CachedImage source={{ uri }} style={styles.thumb} resizeMode="cover" />
              </TouchableOpacity>)}
            </ScrollView>}
            <Text style={styles.name}>{product.name}</Text>
            <View style={styles.storeRow}>
              <AppIcon name="store" size={15} color={colors.onSurfaceVariant} />
              <Text style={styles.store}>{product.storeName}</Text>
            </View>
            {!!product.description?.trim() && <Text style={styles.description}>{product.description}</Text>}
            <Text style={styles.price}>{(product.discountPrice ?? product.sellingPrice).toLocaleString()} ر.ي</Text>
            {product.discountPrice != null && product.discountPrice < product.sellingPrice && <Text style={styles.oldPrice}>{product.sellingPrice.toLocaleString()} ر.ي</Text>}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => { void addToCart(product, 1); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel={'إضافة ' + product.name + ' إلى السلة'}
            >
              <AppIcon name="shopping-bag" size={18} color={colors.onPrimary} />
              <Text style={styles.addText}>إضافة إلى السلة</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  sheet: { maxHeight: '92%', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { minHeight: 54, paddingHorizontal: spacing.baseMd, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerLowest },
  close: { width: 44, height: 44, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerHigh },
  headerTitle: { fontFamily: typography.fontFamily.bold, color: colors.onSurface, fontSize: typography.fontSize.md },
  body: { padding: spacing.baseMd, paddingBottom: 32 },
  hero: { width: '100%', height: 280, borderRadius: borderRadius.xl, backgroundColor: colors.surfaceContainerLow },
  thumbnails: { gap: 8, paddingVertical: 12 },
  thumbWrap: { width: 60, height: 60, borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbSelected: { borderColor: colors.primary },
  thumb: { width: '100%', height: '100%' },
  name: { marginTop: 8, fontFamily: typography.fontFamily.bold, color: colors.onSurface, textAlign: 'right', fontSize: 20 },
  storeRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 6, marginTop: 6 },
  store: { fontFamily: typography.fontFamily.medium, color: colors.onSurfaceVariant, textAlign: 'right' },
  description: { marginTop: 14, fontFamily: typography.fontFamily.regular, color: colors.onSurface, textAlign: 'right', lineHeight: 24, fontSize: 15 },
  price: { marginTop: 14, fontFamily: typography.fontFamily.bold, color: colors.primary, textAlign: 'right', fontSize: 21 },
  oldPrice: { fontFamily: typography.fontFamily.medium, color: colors.onSurfaceVariant, textAlign: 'right', textDecorationLine: 'line-through' },
  addButton: { marginTop: 18, minHeight: 52, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 8 },
  addText: { fontFamily: typography.fontFamily.bold, color: colors.onPrimary, fontSize: 16 },
});
