import { ResponsiveModal as Modal } from './ResponsiveModal';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { catalogApi } from '../api';
import { BundlePiece, Product } from '../types';
import { BundleSelection, bundleUnitPrice, OptionsDefinition, VariantChoice } from '../options/model';
import { OptionSelector } from './OptionSelector';
import { CachedImage } from './CachedImage';

function PieceChoices({ dealId, piece, fallbackImage, onChoice }: {
  dealId: string; piece: BundlePiece; fallbackImage: string; onChoice: (choice: VariantChoice | null) => void;
}) {
  const { colors } = useApp();
  const [definition, setDefinition] = useState<OptionsDefinition | null>(null), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [preview, setPreview] = useState(piece.imageUrl || fallbackImage);
  useEffect(() => {
    let active = true;
    catalogApi.getPiece(dealId, piece.id).then(detail => { if (active) { setDefinition(detail.options); setError(''); } })
      .catch(error => { if (active) setError(error.message || 'تعذر تحميل الخيارات'); });
    return () => { active = false; };
  }, [dealId, piece.id, reload]);
  return <View style={s.piece}>
    <Text style={[s.title, { color: colors.onSurface }]}>{piece.name}</Text>
    <CachedImage source={{ uri: preview }} style={s.image} resizeMode="contain" />
    {error ? <TouchableOpacity onPress={() => setReload(n => n + 1)}><Text>{error} — إعادة المحاولة</Text></TouchableOpacity>
      : definition ? <OptionSelector definition={definition} fallbackImage={piece.imageUrl || fallbackImage} onChoice={onChoice} onImage={setPreview} /> : <ActivityIndicator />}
  </View>;
}

export function BundleOptionsModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { addToCart, colors } = useApp();
  const [choices, setChoices] = useState<Record<string, VariantChoice | null>>({}), [saving, setSaving] = useState(false);
  useEffect(() => { setChoices({}); }, [product?.id]);
  const pieces = product?.bundleItems || [];
  const selections: BundleSelection[] = useMemo(() => pieces.map(piece => ({ dealProductId: piece.id,
    ...(choices[piece.id] || { unitPrice: piece.price, imageUrl: piece.imageUrl, selectedOptions: [] }) })), [pieces, choices]);
  if (!product) return null;
  const complete = pieces.every(piece => !piece.hasOptions || !!choices[piece.id]?.variantId);
  const price = bundleUnitPrice(pieces, product.discountPrice ?? product.sellingPrice, selections);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={[s.sheet, { backgroundColor: colors.sheetBackground, borderColor: colors.outlineVariant }]}>
      <View style={s.row}><Text style={[s.title, { color: colors.onSurface }]}>اختيارات {product.name}</Text><TouchableOpacity onPress={onClose}><Text style={[s.close, { color: colors.primary }]}>إغلاق</Text></TouchableOpacity></View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[s.hint, { color: colors.onSurfaceVariant }]}>حدد تفاصيل كل قطعة. يطبق خصم الباقة على أسعار الاختيارات.</Text>
        {pieces.map(piece => piece.hasOptions
          ? <PieceChoices key={piece.id} dealId={product.dealId || product.id} piece={piece} fallbackImage={product.imageUrl}
              onChoice={choice => setChoices(current => ({ ...current, [piece.id]: choice }))} />
          : <View key={piece.id} style={[s.piece, { borderBottomColor: colors.outlineVariant }]}><Text style={[s.title, { color: colors.onSurface }]}>{piece.name}</Text><Text style={{ color: colors.onSurface }}>{piece.price.toLocaleString()} ر.ي</Text></View>)}
      </ScrollView>
      <Text style={[s.title, { color: colors.primary }]}>{complete ? 'سعر الباقة' : 'السعر حسب الاختيارات'}: {price.toLocaleString()} ر.ي</Text>
      <TouchableOpacity accessibilityLabel="إضافة الباقة بالاختيارات" disabled={!complete || saving}
        style={[s.button, { backgroundColor: colors.primary, opacity: !complete || saving ? 0.5 : 1 }]}
        onPress={async () => { setSaving(true); try { await addToCart(product, 1, undefined, selections); onClose(); }
          catch (error: any) { Alert.alert('تعذر إضافة الباقة', error.message); } finally { setSaving(false); } }}>
        <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{saving ? 'جارٍ الإضافة...' : 'إضافة الباقة إلى السلة'}</Text>
      </TouchableOpacity>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.72)' },
  sheet: { width: '100%', maxWidth: 760, alignSelf: 'center', maxHeight: '92%', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1.5, borderLeftWidth: 1, borderRightWidth: 1, padding: 18, gap: 14 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 17, textAlign: 'right' },
  close: { padding: 8, fontWeight: '600' },
  hint: { textAlign: 'right', marginBottom: 8 },
  piece: { paddingVertical: 14, gap: 10, borderBottomWidth: 1 },
  image: { width: '100%', height: 160, borderRadius: 12 },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
