export type OptionValue = { id: string; name: string; imageUrl?: string | null };
export type OptionGroup = { id: string; name: string; values: OptionValue[] };
export type OptionVariant = { id: string; valueIds: string[]; sellingPrice: number; expectedPurchasePrice?: number | null;
  sellingPriceOverride?: number | null; expectedPurchasePriceOverride?: number | null; isActive: boolean };
export type OptionsDefinition = { groups: OptionGroup[]; variants: OptionVariant[] };
export type SelectedOption = { groupId: string; groupName: string; valueId: string; valueName: string };
export type VariantChoice = { variantId?: string; imageValueId?: string; selectedOptions?: SelectedOption[]; imageUrl?: string; unitPrice?: number };
export type BundleSelection = VariantChoice & { dealProductId: string };
export const MAX_COMBINATIONS = 1000;
export const emptyOptions = (): OptionsDefinition => ({ groups: [], variants: [] });
export const combinationKey = (ids: string[]) => [...ids].sort().join('-');
export function combinations(groups: OptionGroup[]): string[][] {
  if (groups.length > 12) throw new Error('الحد المسموح 12 خاصية لكل منتج أو قطعة');
  if (!groups.length || groups.some(g => !g.values.length)) return [];
  let size = 1;
  for (const group of groups) { size *= group.values.length; if (size > MAX_COMBINATIONS) throw new Error(`الحد المسموح ${MAX_COMBINATIONS} تركيبة لكل منتج أو قطعة`); }
  return groups.reduce<string[][]>((rows, group) => rows.flatMap(row => group.values.map(value => [...row, value.id])), [[]]);
}
export function optionsInput(options: OptionsDefinition) {
  const names = options.groups.map(g => g.name.trim());
  if (names.some(n => !n || n.length > 100) || new Set(names.map(n => n.toLowerCase())).size !== names.length) throw new Error('أسماء الخصائص مطلوبة ولا تتكرر ولا تتجاوز 100 حرف');
  for (const group of options.groups) {
    const values = group.values.map(v => v.name.trim());
    if (!values.length || values.some(n => !n || n.length > 100) || new Set(values.map(n => n.toLowerCase())).size !== values.length) throw new Error('قيم كل خاصية مطلوبة ولا تتكرر ولا تتجاوز 100 حرف');
  }
  for (const variant of options.variants) {
    if (variant.sellingPriceOverride != null && (!Number.isFinite(variant.sellingPriceOverride) || variant.sellingPriceOverride <= 0)) throw new Error('سعر البيع يجب أن يكون موجباً');
    if (variant.expectedPurchasePriceOverride != null && (!Number.isFinite(variant.expectedPurchasePriceOverride) || variant.expectedPurchasePriceOverride < 0)) throw new Error('سعر الشراء المتوقع غير صالح');
  }
  combinations(options.groups);
  return { groups: options.groups, variants: options.variants.map(v => ({ valueIds: v.valueIds,
    sellingPrice: v.sellingPriceOverride ?? null, expectedPurchasePrice: v.expectedPurchasePriceOverride ?? null, isActive: v.isActive })) };
}
export function selection(definition: OptionsDefinition, selected: Record<string, string>, imageValueId?: string, fallbackImage = ''): VariantChoice | null {
  if (definition.groups.some(g => !selected[g.id])) return null;
  const ids = definition.groups.map(g => selected[g.id]);
  const variant = definition.variants.find(v => v.isActive && combinationKey(v.valueIds) === combinationKey(ids));
  if (!variant) return null;
  const selectedOptions = definition.groups.map(g => ({ groupId: g.id, groupName: g.name,
    valueId: selected[g.id], valueName: g.values.find(v => v.id === selected[g.id])!.name }));
  const values = definition.groups.flatMap(g => g.values).filter(v => ids.includes(v.id));
  const pictured = values.find(v => v.id === imageValueId && v.imageUrl) || values.find(v => v.imageUrl);
  return { variantId: variant.id, imageValueId: pictured?.id, imageUrl: pictured?.imageUrl || fallbackImage,
    unitPrice: variant.sellingPrice, selectedOptions };
}
export function chooseValue(definition: OptionsDefinition, selected: Record<string, string>, groupId: string, valueId: string): Record<string, string> {
  const next = { ...selected, [groupId]: valueId }, ids = Object.values(next);
  return definition.variants.some(v => v.isActive && ids.every(id => v.valueIds.includes(id))) ? next : { [groupId]: valueId };
}
export const optionsLabel = (options?: SelectedOption[]) => (options || []).map(o => `${o.groupName}: ${o.valueName}`).join(' — ');
export function bundleUnitPrice(pieces: { id: string; price: number }[], offerPrice: number, choices: BundleSelection[]) {
  const base = pieces.reduce((sum, p) => sum + Number(p.price), 0);
  if (!(base > 0)) return 0;
  const selected = pieces.reduce((sum, p) => sum + (choices.find(c => c.dealProductId === p.id)?.unitPrice ?? p.price), 0);
  return Math.round((selected * offerPrice / base + Number.EPSILON) * 100) / 100;
}
