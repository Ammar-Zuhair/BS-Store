import { api, ApiProduct, ApiStore } from '../api';
import { Product, Store } from '../types';
import { DealItem } from '../components/DealDetailsModal';
export type SearchScope = { categoryId?: string; storeId?: string; title?: string };
export type SearchHit = { kind: 'product'; id: string; data: ApiProduct } | { kind: 'store'; id: string; data: ApiStore } | { kind: 'bundle' | 'offer'; id: string; data: DealItem };
export function searchCatalog(q: string, type: 'store' | 'product', scope: SearchScope, page: number, signal: AbortSignal) {
  const params = new URLSearchParams({ q, type, page: String(page) });
  if (scope.storeId) params.set('storeId', scope.storeId);
  else if (scope.categoryId) params.set('categoryId', scope.categoryId);
  return api.request<{ items: SearchHit[]; page: number; hasMore: boolean }>(`/catalog/search?${params}`, { method: 'GET', signal });
}
export function toProduct(p: ApiProduct): Product {
  const parts = (p.description || '').match(/^\[النوع:\s*([^\]]+)\]\s*(.*)$/s);
  return { ...p, description: parts ? parts[2].trim() : p.description || '', subcategoryId: parts?.[1]?.trim(),
    imageUrl: p.images?.[0] || '', images: p.images || [], inStock: p.isActive,
    sourceType: p.sourceType === 'ExternalStore' ? 'EXTERNAL_STORE' : 'IN_STOCK' };
}
export function toStore(s: ApiStore): Store {
  return { ...s, category: '', categoryId: s.categoryIds?.[0] || '', subcategories: [], imageUrl: s.imageUrl || '', isOpen: s.isOpen ?? null };
}
export function toDeal(raw: DealItem & { dealKind?: DealItem['dealType']; discountPrice?: number }): DealItem {
  return { ...raw, dealType: raw.discountKind || raw.dealType || raw.dealKind, products: raw.products || [],
    description: raw.description || '', storeName: raw.storeName || '', imageUrl: raw.imageUrl || '', badge: raw.badge || '',
    originalPrice: Number(raw.originalPrice) || 0, offerPrice: Number(raw.offerPrice ?? raw.discountPrice) || 0 };
}
