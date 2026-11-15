// Memory only; never persists searches or customer data to device storage.
let generation = 0;
const entries = new Map<string, { until: number; data: unknown }>();
const listeners = new Set<() => void>();
export const searchGeneration = () => generation;
export function invalidateSearchCache() {
  generation++; entries.clear(); listeners.forEach(listener => listener());
}
export const observeSearchInvalidation = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function readSearchCache<T>(key: string): T | undefined {
  const entry = entries.get(key);
  if (!entry || entry.until <= Date.now()) { entries.delete(key); return undefined; }
  return entry.data as T;
}
export function writeSearchCache(key: string, data: unknown) {
  if (entries.size >= 100) entries.delete(entries.keys().next().value!);
  entries.set(key, { until: Date.now() + 30_000, data });
}
