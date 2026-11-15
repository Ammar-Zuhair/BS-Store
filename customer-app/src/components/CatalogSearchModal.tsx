import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, governorateApi } from '../api';
import { useApp } from '../context/AppContext';
import { typography } from '../theme';
import { holdUpdates } from '../system/updateSafety';
import { observeSearchInvalidation } from '../search/cache';
import { createSearchSession, SearchState } from '../search/session';
import { SearchScope, SearchHit, searchCatalog, toProduct, toStore, toDeal } from '../search/catalog';
import { Product } from '../types';
import { AppIcon } from './AppIcon';
import { CachedImage } from './CachedImage';
import { ProductDetailsModal } from './ProductDetailsModal';
import { DealDetailsModal, DealItem } from './DealDetailsModal';

export function CatalogSearchModal({ scope, onClose }: { scope: SearchScope; onClose: () => void }) {
  const { colors: c, setSelectedStore, navigateTo, applyPromoCode, activateProductDiscountDeal, activateDeliveryDeal } = useApp();
  const [type, setType] = useState<'store' | 'product' | null>(scope.storeId ? 'product' : null);
  const [query, setQuery] = useState('');
  const [governorate, setGovernorate] = useState<string>();
  const [contextError, setContextError] = useState('');
  const [contextAttempt, setContextAttempt] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [deal, setDeal] = useState<DealItem | null>(null);
  const [offer, setOffer] = useState<DealItem | null>(null);
  const [activating, setActivating] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [state, setState] = useState<SearchState<SearchHit>>({ items: [], page: 1, hasMore: false, loading: false, error: '', searched: false });
  const session = useRef<ReturnType<typeof createSearchSession<SearchHit>> | null>(null);
  const queryRef = useRef(query); queryRef.current = query;
  const token = api.getToken();
  useEffect(() => holdUpdates(), []);
  useEffect(() => observeSearchInvalidation(() => { session.current?.close(); setState({ items: [], page: 1, hasMore: false, loading: false, error: '', searched: false }); setEpoch(e => e + 1); }), []);
  useEffect(() => {
    let active = true;
    setGovernorate(undefined); setContextError('');
    governorateApi.mine().then(res => { if (active) setGovernorate(res.governorateId || 'none'); })
      .catch(() => { if (active) setContextError('تعذر تحميل نطاق البحث. تحقق من الاتصال وحاول مجدداً.'); });
    return () => { active = false; };
  }, [epoch, token, contextAttempt]);
  useEffect(() => {
    if (!type || governorate === undefined) return;
    const current = createSearchSession<SearchHit>(JSON.stringify([token, governorate, type, scope.categoryId, scope.storeId]),
      (q, page, signal) => searchCatalog(q, type, scope, page, signal), setState);
    session.current = current;
    current.change(queryRef.current);
    return () => { current.close(); if (session.current === current) session.current = null; };
  }, [type, governorate, scope.categoryId, scope.storeId, token, epoch]);
  const changeType = (value: 'store' | 'product') => {
    if (value === type) return;
    session.current?.close(); setType(value); setQuery('');
    setState({ items: [], page: 1, hasMore: false, loading: false, error: '', searched: false });
  };
  const close = () => { session.current?.close(); onClose(); };
  const openHit = (hit: SearchHit) => {
    if (hit.kind === 'store') { setSelectedStore(toStore(hit.data)); close(); navigateTo('store_detail'); }
    else if (hit.kind === 'product') setProduct(toProduct(hit.data));
    else {
      const selected = toDeal(hit.data);
      if (hit.kind === 'offer') { setOffer(selected); setOfferError(''); }
      else setDeal(selected);
    }
  };
  const activate = async () => {
    if (!offer || activating) return;
    setActivating(true); setOfferError('');
    try {
      if (offer.expiresAt && Date.parse(offer.expiresAt) <= Date.now()) throw new Error('انتهت صلاحية هذا العرض.');
      if (offer.couponCode) { if (!await applyPromoCode(offer.couponCode)) throw new Error('تعذر تفعيل كود الخصم. حاول مجدداً.'); }
      else if (offer.dealType === 'PRODUCT_DISCOUNT') {
        if (!(offer.discountPercent > 0 || offer.discountTiers?.some(tier => tier.discountPercent > 0))) throw new Error('لا يتوفر خصم صالح لهذا العرض حالياً.');
        activateProductDiscountDeal(offer.id, offer);
      }
      else {
        const percent = offer.isFreeDelivery ? 100 : offer.deliveryDiscountPercent ?? offer.discountPercent;
        if (!(percent > 0 && percent <= 100)) throw new Error('لا يتوفر خصم صالح لهذا العرض حالياً.');
        activateDeliveryDeal(offer.id, percent);
      }
      setOffer(null); close();
    } catch (error) { setOfferError((error as Error).message); }
    finally { setActivating(false); }
  };
  const textStyle = { color: c.onSurface, fontFamily: typography.fontFamily.bold };
  const button = (label: string, action: () => void, filled = false, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action}
    style={({ pressed }) => [s.button, { backgroundColor: filled ? c.primary : c.surfaceContainerLow, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
    <Text style={[s.buttonText, { color: filled ? c.onPrimary : c.primary }]}>{label}</Text>
  </Pressable>;
  return <Modal visible animationType="none" onRequestClose={close}>
    <SafeAreaView style={[s.container, { backgroundColor: c.surfaceDim }]}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { borderColor: c.outlineVariant }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="إغلاق البحث" onPress={close} style={s.iconButton}><AppIcon name="arrow-right" color={c.onSurface} /></Pressable>
          <View style={{ flex: 1 }}><Text accessibilityRole="header" style={[s.title, textStyle]}>ابحث واكتشف</Text><Text style={[s.caption, { color: c.onSurfaceVariant }]}>{scope.title || 'المتاجر والمنتجات في محافظتك'}</Text></View>
          <AppIcon name="search" color={c.primary} size={26} />
        </View>
        {!scope.storeId && <View style={s.tabs}>{(['store', 'product'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: type === value }} onPress={() => changeType(value)} style={[s.tab, { backgroundColor: type === value ? c.primary : c.surfaceContainerLow }]}>
          <AppIcon name={value === 'store' ? 'store' : 'shopping-bag'} color={type === value ? c.onPrimary : c.onSurfaceVariant} />
          <Text style={[s.buttonText, { color: type === value ? c.onPrimary : c.onSurface }]}>{value === 'store' ? 'متاجر' : 'منتجات وعروض'}</Text>
        </Pressable>)}</View>}
        {type ? <>
          <View style={s.searchRow}>
            <TextInput accessibilityLabel="كلمة البحث" value={query} onChangeText={value => { setQuery(value); session.current?.change(value); }}
              placeholder={type === 'store' ? 'ما المتجر الذي تبحث عنه؟' : 'ما المنتج الذي تبحث عنه؟'} placeholderTextColor={c.onSurfaceVariant}
              maxLength={100} returnKeyType="search" onSubmitEditing={() => session.current?.submit()} autoCorrect={false}
              style={[s.input, { color: c.onSurface, backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant }]} />
            {button('بحث', () => session.current?.submit(), true, !query.trim() || governorate === undefined)}
          </View>
          <Text style={[s.hint, { color: c.onSurfaceVariant }]}>نبحث عن أقرب تطابق، حتى مع اختلاف بسيط في الكتابة.</Text>
          {contextError ? <View style={s.empty}><Text style={[s.copy, { color: c.onSurfaceVariant }]}>{contextError}</Text>{button('إعادة المحاولة', () => setContextAttempt(n => n + 1))}</View> :
          <FlatList data={state.items} keyExtractor={item => `${item.kind}:${item.id}`} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.results}
            renderItem={({ item }) => {
              const title = item.kind === 'store' || item.kind === 'product' ? item.data.name : item.data.title;
              const image = item.kind === 'product' ? item.data.images?.[0] : item.data.imageUrl;
              const subtitle = item.kind === 'store' ? `${item.data.address || ''} · ${item.data.isOpen ? 'مفتوح الآن' : 'مغلق حالياً'}` : item.data.storeName || 'عرض خاص';
              return <Pressable accessibilityRole="button" accessibilityLabel={`${title}، ${subtitle}`} onPress={() => openHit(item)} style={({ pressed }) => [s.result, { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant, opacity: pressed ? 0.8 : 1 }]}>
                {image ? <CachedImage source={{ uri: image }} style={s.image} /> : <View style={[s.image, { backgroundColor: c.surfaceContainerLow }]}><AppIcon name={item.kind === 'store' ? 'store' : item.kind === 'product' ? 'shopping-bag' : 'gift'} size={28} color={c.primary} /></View>}
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={[s.resultTitle, textStyle]}>{title}</Text>
                  <Text style={[s.caption, { color: c.onSurfaceVariant }]}>{subtitle}</Text>
                  {item.kind === 'product' ? <Text style={[s.caption, { color: c.primary }]}>{item.data.hasOptions ? 'يبدأ من ' : ''}{(item.data.minSellingPrice ?? item.data.sellingPrice).toLocaleString('ar')} ر.ي</Text> : null}
                  {item.kind === 'bundle' || item.kind === 'offer' ? <Text style={[s.caption, { color: c.primary }]}>{item.kind === 'bundle' ? 'باقة' : 'عرض'} · عرض التفاصيل</Text> : null}
                </View><AppIcon name="chevron-left" color={c.onSurfaceVariant} />
              </Pressable>;
            }}
            ListEmptyComponent={<View style={s.empty}>
              {state.loading || governorate === undefined ? <ActivityIndicator color={c.primary} /> : <><AppIcon name={state.error ? 'alert' : 'search'} size={44} color={c.primary} /><Text style={[s.copy, { color: c.onSurfaceVariant }]}>{state.error || (state.searched ? 'لم نعثر على نتائج قريبة. جرّب كلمة أخرى.' : 'اكتب حرفين لتظهر النتائج تلقائياً، أو اضغط بحث.')}</Text></>}
              {!!state.error && button('إعادة المحاولة', () => session.current?.retry())}
            </View>}
            ListFooterComponent={state.items.length ? <View style={s.footer}>{state.loading ? <ActivityIndicator color={c.primary} /> : state.error ? <><Text style={[s.copy, { color: c.onSurfaceVariant }]}>{state.error}</Text>{button('إعادة المحاولة', () => session.current?.retry())}</> : state.hasMore ? button('عرض المزيد', () => session.current?.more()) : <Text style={[s.caption, { color: c.onSurfaceVariant }]}>هذه أقرب النتائج لبحثك</Text>}</View> : null}
          />}
        </> : <View style={s.empty}><View style={[s.discover, { backgroundColor: c.surfaceContainerLow }]}><AppIcon name="search" size={48} color={c.primary} /></View><Text style={[s.title, textStyle]}>عمّ تبحث اليوم؟</Text><Text style={[s.copy, { color: c.onSurfaceVariant }]}>اختر المتاجر أو المنتجات والعروض للبدء.</Text></View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
    <ProductDetailsModal product={product} onClose={() => setProduct(null)} />
    <DealDetailsModal visible={!!deal} deal={deal} onClose={() => setDeal(null)} onConfigure={close} onNavigate={close} />
    <Modal visible={!!offer} transparent animationType="none" onRequestClose={() => { if (!activating) setOffer(null); }}>
      <View style={s.scrim}><View style={[s.offer, { backgroundColor: c.surfaceContainerLowest }]}>
        <AppIcon name="gift" color={c.primary} size={40} /><Text style={[s.title, textStyle]}>{offer?.title}</Text><Text style={[s.copy, { color: c.onSurfaceVariant }]}>{offer?.description}</Text>
        {!!offerError && <Text accessibilityRole="alert" style={[s.copy, { color: c.error }]}>{offerError}</Text>}
        {button(activating ? 'جارٍ التفعيل…' : 'تفعيل العرض', () => { void activate(); }, true, activating)}
        {button('إغلاق', () => setOffer(null), false, activating)}
      </View></View>
    </Modal>
  </Modal>;
}
const s = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.fontFamily.bold, fontSize: 23, textAlign: 'right' },
  caption: { fontFamily: typography.fontFamily.regular, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  tabs: { flexDirection: 'row-reverse', padding: 16, gap: 12 }, tab: { flex: 1, minHeight: 52, padding: 12, borderRadius: 16, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  searchRow: { flexDirection: 'row-reverse', paddingHorizontal: 16, gap: 8, paddingTop: 12 },
  input: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 16, textAlign: 'right', fontFamily: typography.fontFamily.regular },
  button: { minHeight: 48, padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: typography.fontFamily.bold, fontSize: 16, textAlign: 'center' },
  hint: { fontFamily: typography.fontFamily.regular, textAlign: 'right', paddingHorizontal: 20, marginVertical: 12, fontSize: 13 },
  results: { padding: 16, paddingTop: 0, flexGrow: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  result: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  image: { width: 64, height: 72, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 17, textAlign: 'right', writingDirection: 'rtl' },
  empty: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  discover: { width: 112, height: 112, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  copy: { fontFamily: typography.fontFamily.regular, fontSize: 16, lineHeight: 25, textAlign: 'center', writingDirection: 'rtl' },
  footer: { padding: 16, alignItems: 'center', gap: 12 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  offer: { borderRadius: 24, padding: 24, gap: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
});
