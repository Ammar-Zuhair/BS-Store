import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { CachedImage } from './CachedImage';
import { useApp } from '../context/AppContext';
import { chooseValue, OptionsDefinition, selection, VariantChoice } from '../options/model';

export function OptionSelector({ definition, fallbackImage, onChoice, onImage }: {
  definition: OptionsDefinition; fallbackImage: string; onChoice: (choice: VariantChoice | null) => void; onImage?: (url: string) => void;
}) {
  const { colors } = useApp();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [imageValueId, setImageValueId] = useState<string>();
  const callbacks = useRef({ onChoice, onImage }); callbacks.current = { onChoice, onImage };
  const choice = useMemo(() => selection(definition, selected, imageValueId, fallbackImage), [definition, selected, imageValueId, fallbackImage]);
  useEffect(() => { callbacks.current.onChoice(choice); }, [choice]);
  useEffect(() => {
    const values = definition.groups.flatMap(g => g.values).filter(v => Object.values(selected).includes(v.id));
    const pictured = values.find(v => v.id === imageValueId && v.imageUrl) || values.find(v => v.imageUrl);
    callbacks.current.onImage?.(pictured?.imageUrl || fallbackImage);
  }, [definition, selected, imageValueId, fallbackImage]);
  const activeIds = new Set(definition.variants.filter(v => v.isActive).flatMap(v => v.valueIds));
  return <View style={s.root}>
    {definition.groups.map(group => <View key={group.id} style={s.group}>
      <Text style={[s.label, { color: colors.onSurface }]}>{group.name}: {group.values.find(v => v.id === selected[group.id])?.name || 'اختر'}</Text>
      <FlatList horizontal data={group.values} keyExtractor={v => v.id} showsHorizontalScrollIndicator={false}
        renderItem={({ item: value }) => {
          const enabled = activeIds.has(value.id), chosen = selected[group.id] === value.id;
          return <TouchableOpacity accessibilityRole="radio" accessibilityLabel={`${group.name}: ${value.name}`} accessibilityState={{ selected: chosen, disabled: !enabled }}
            disabled={!enabled} style={[s.value, { borderColor: chosen ? colors.primary : colors.outlineVariant, backgroundColor: colors.surfaceContainerLow, opacity: enabled ? 1 : 0.4 }]}
            onPress={() => {
              const next = chooseValue(definition, selected, group.id, value.id);
              setSelected(next);
              setImageValueId(value.imageUrl ? value.id : imageValueId && Object.values(next).includes(imageValueId) ? imageValueId : undefined);
            }}>
            {value.imageUrl && <CachedImage source={{ uri: value.imageUrl }} style={s.image} resizeMode="contain" />}
            <Text style={{ color: chosen ? colors.primary : colors.onSurface }}>{value.name}</Text>
          </TouchableOpacity>;
        }} />
    </View>)}
    {definition.variants.every(v => !v.isActive) && <Text style={{ color: colors.error }}>لا توجد تركيبة متاحة لهذا المنتج حالياً</Text>}
    <Text style={{ color: colors.onSurfaceVariant, textAlign: 'right' }}>{choice ? 'تم تحديد الاختيارات' : 'حدد قيمة من كل خاصية لإكمال الاختيار'}</Text>
  </View>;
}
const s = StyleSheet.create({ root: { gap: 12 }, group: { gap: 8 }, label: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  value: { minWidth: 68, minHeight: 48, borderWidth: 2, borderRadius: 10, padding: 8, marginEnd: 8, alignItems: 'center', gap: 4 },
  image: { width: 58, height: 58, borderRadius: 6 } });
