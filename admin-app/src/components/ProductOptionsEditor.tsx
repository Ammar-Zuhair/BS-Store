import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Switch, StyleSheet } from 'react-native';
import * as Crypto from 'expo-crypto';
import { ImagePickerModal } from './ImagePickerModal';
import { OptionsDefinition, OptionGroup, combinations, combinationKey } from '../options/model';

export function ProductOptionsEditor({ value, onChange, price, cost }: {
  value: OptionsDefinition; onChange: (value: OptionsDefinition) => void; price: number; cost: number;
}) {
  const [query, setQuery] = useState(''), [bulkPrice, setBulkPrice] = useState(''), [bulkCost, setBulkCost] = useState('');
  const [imageTarget, setImageTarget] = useState<{ group: string; value: string } | null>(null);
  const [limitError, setLimitError] = useState(''), [page, setPage] = useState(0);
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const changeGroups = (groups: OptionGroup[]) => {
    try {
      const known = new Map(value.variants.map(v => [combinationKey(v.valueIds), v]));
      const variants = combinations(groups).map(ids => known.get(combinationKey(ids)) || {
        id: Crypto.randomUUID(), valueIds: ids, sellingPrice: price, expectedPurchasePrice: cost,
        sellingPriceOverride: null, expectedPurchasePriceOverride: null, isActive: true,
      });
      onChange({ groups, variants }); setLimitError(''); setPage(0);
    } catch (error: any) { setLimitError(error.message); }
  };
  const updateValue = (groupId: string, valueId: string, patch: object) => changeGroups(value.groups.map(g => g.id === groupId
    ? { ...g, values: g.values.map(v => v.id === valueId ? { ...v, ...patch } : v) } : g));
  const labels = useMemo(() => new Map(value.groups.flatMap(g => g.values.map(v => [v.id, `${g.name}: ${v.name}`] as const))), [value.groups]);
  const rows = value.variants.filter(v => v.valueIds.map(id => labels.get(id)).join(' ').toLowerCase().includes(query.toLowerCase()));
  const updateVariant = (id: string, patch: object) => onChange({ ...value, variants: value.variants.map(v => v.id === id ? { ...v, ...patch } : v) });
  const amount = (text: string) => text.trim() ? Number(text) : null;
  const editPrice = (id: string, field: 'sellingPriceOverride' | 'expectedPurchasePriceOverride', text: string) => {
    setPriceEdits(current => ({ ...current, [`${id}:${field}`]: text }));
    updateVariant(id, { [field]: amount(text) });
  };
  return <View style={s.box}>
    <Text style={s.title}>خيارات المنتج</Text>
    <Text style={s.hint}>أضف أي خاصية مثل المقاس أو اللون أو السعة. الصورة اختيارية لكل قيمة.</Text>
    {value.groups.map((group, gi) => <View key={group.id} style={s.group}>
      <View style={s.row}>
        <TextInput accessibilityLabel={`اسم الخاصية ${gi + 1}`} placeholder="اسم الخاصية، مثال: اللون" style={s.input} value={group.name}
          onChangeText={name => changeGroups(value.groups.map(g => g.id === group.id ? { ...g, name } : g))} />
        <TouchableOpacity onPress={() => changeGroups(value.groups.filter(g => g.id !== group.id))}><Text style={s.remove}>حذف الخاصية</Text></TouchableOpacity>
        {gi > 0 && <TouchableOpacity onPress={() => { const groups = [...value.groups]; [groups[gi - 1], groups[gi]] = [groups[gi], groups[gi - 1]]; changeGroups(groups); }}><Text>↑</Text></TouchableOpacity>}
      </View>
      {group.values.map((option, vi) => <View key={option.id} style={s.row}>
        <TextInput accessibilityLabel={`قيمة ${group.name} ${vi + 1}`} placeholder="القيمة، مثال: أسود" style={s.input} value={option.name} onChangeText={name => updateValue(group.id, option.id, { name })} />
        {option.imageUrl ? <Image source={{ uri: option.imageUrl }} style={s.image} /> : null}
        <TouchableOpacity onPress={() => setImageTarget({ group: group.id, value: option.id })}><Text style={s.link}>{option.imageUrl ? 'تغيير الصورة' : 'صورة'}</Text></TouchableOpacity>
        {option.imageUrl && <TouchableOpacity onPress={() => updateValue(group.id, option.id, { imageUrl: null })}><Text style={s.remove}>إزالة الصورة</Text></TouchableOpacity>}
        <TouchableOpacity onPress={() => changeGroups(value.groups.map(g => g.id === group.id ? { ...g, values: g.values.filter(v => v.id !== option.id) } : g))}><Text style={s.remove}>×</Text></TouchableOpacity>
      </View>)}
      <TouchableOpacity onPress={() => changeGroups(value.groups.map(g => g.id === group.id ? { ...g, values: [...g.values, { id: Crypto.randomUUID(), name: '' }] } : g))}><Text style={s.link}>+ إضافة قيمة</Text></TouchableOpacity>
    </View>)}
    <TouchableOpacity onPress={() => changeGroups([...value.groups, { id: Crypto.randomUUID(), name: '', values: [{ id: Crypto.randomUUID(), name: '' }] }])}><Text style={s.link}>+ إضافة خاصية</Text></TouchableOpacity>
    {!!limitError && <Text style={s.remove}>{limitError}</Text>}
    {!!value.variants.length && <>
      <Text style={s.title}>التركيبات ({value.variants.length})</Text>
      <Text style={s.hint}>اترك السعر فارغاً لاستخدام السعر الأساسي. عطّل أي تركيبة غير متاحة.</Text>
      <TextInput placeholder="بحث في التركيبات" accessibilityLabel="بحث في التركيبات" style={s.input} value={query} onChangeText={q => { setQuery(q); setPage(0); }} />
      <View style={s.row}>
        <TextInput style={s.input} placeholder="بيع للجميع" keyboardType="decimal-pad" value={bulkPrice} onChangeText={setBulkPrice} />
        <TextInput style={s.input} placeholder="شراء للجميع" keyboardType="decimal-pad" value={bulkCost} onChangeText={setBulkCost} />
        <TouchableOpacity onPress={() => { const ids = new Set(rows.map(v => v.id));
          setPriceEdits(current => Object.fromEntries(Object.entries(current).filter(([key]) => !ids.has(key.split(':')[0]))));
          onChange({ ...value, variants: value.variants.map(v => ids.has(v.id) ? { ...v, sellingPriceOverride: amount(bulkPrice), expectedPurchasePriceOverride: amount(bulkCost) } : v) }); }}><Text style={s.link}>تطبيق على النتائج</Text></TouchableOpacity>
      </View>
      {rows.slice(page * 20, (page + 1) * 20).map(v => <View style={s.variant} key={v.id}>
        <Text style={s.label}>{v.valueIds.map(id => labels.get(id)).join(' — ')}</Text>
        <View style={s.row}>
          <TextInput style={s.input} accessibilityLabel={`سعر بيع ${v.id}`} placeholder={`بيع: ${price}`} keyboardType="decimal-pad" value={priceEdits[`${v.id}:sellingPriceOverride`] ?? (v.sellingPriceOverride == null ? '' : String(v.sellingPriceOverride))} onChangeText={text => editPrice(v.id, 'sellingPriceOverride', text)} />
          <TextInput style={s.input} accessibilityLabel={`سعر شراء ${v.id}`} placeholder={`شراء: ${cost}`} keyboardType="decimal-pad" value={priceEdits[`${v.id}:expectedPurchasePriceOverride`] ?? (v.expectedPurchasePriceOverride == null ? '' : String(v.expectedPurchasePriceOverride))} onChangeText={text => editPrice(v.id, 'expectedPurchasePriceOverride', text)} />
          <Text>{v.isActive ? 'متاح' : 'معطل'}</Text><Switch accessibilityLabel={`توفر ${v.id}`} value={v.isActive} onValueChange={isActive => updateVariant(v.id, { isActive })} />
        </View>
      </View>)}
      <View style={s.row}>
        {page > 0 && <TouchableOpacity onPress={() => setPage(page - 1)}><Text style={s.link}>السابق</Text></TouchableOpacity>}
        <Text>{page + 1} / {Math.max(1, Math.ceil(rows.length / 20))}</Text>
        {(page + 1) * 20 < rows.length && <TouchableOpacity onPress={() => setPage(page + 1)}><Text style={s.link}>التالي</Text></TouchableOpacity>}
      </View>
    </>}
    <ImagePickerModal visible={!!imageTarget} onClose={() => setImageTarget(null)} onImageSelected={(uri: string) => {
      if (imageTarget) updateValue(imageTarget.group, imageTarget.value, { imageUrl: uri }); setImageTarget(null);
    }} />
  </View>;
}
const s = StyleSheet.create({ box: { padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'right', color: '#172554' }, hint: { color: '#64748B', textAlign: 'right' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, group: { padding: 10, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, gap: 8 },
  input: { flexGrow: 1, minWidth: 90, minHeight: 44, padding: 8, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, textAlign: 'right', color: '#111827', backgroundColor: '#FFF' },
  link: { color: '#2563EB', paddingVertical: 8 }, remove: { color: '#DC2626', paddingVertical: 8 }, image: { width: 40, height: 40, borderRadius: 6 },
  variant: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 6 }, label: { textAlign: 'right', fontWeight: '600', color: '#334155' } });
