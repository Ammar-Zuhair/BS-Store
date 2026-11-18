// Run: node tests/customer-offers.cjs. Actual provider/screens, mocked native/network boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const React = require(path.join(root, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(root, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = new Map(), alerts = [], validations = [];
const store = { id: 'store-1', name: 'متجر العرض', categoryId: 'category-1', subcategories: [], is24Hours: true };
const base = { description: 'تفاصيل العرض', badge: 'عرض', imageUrl: '', isActive: true, visibility: 'home', products: [] };
const offers = [
  { ...base, id: 'coupon', title: 'خصم بالكود', discountKind: 'PRODUCT_DISCOUNT', couponCode: 'SAVE', discountPercent: 20 },
  { ...base, id: 'delivery', title: 'خصم التوصيل', discountKind: 'DELIVERY_DISCOUNT', discountPercent: 40 },
  { ...base, id: 'free', title: 'توصيل مجاني', isFreeDelivery: true },
  { ...base, id: 'order-discount', title: 'خصم الطلب', discountKind: 'PRODUCT_DISCOUNT', discountPercent: 15 },
  { ...base, id: 'bad', title: 'كود غير صالح', discountKind: 'PRODUCT_DISCOUNT', couponCode: 'BAD' },
  { ...base, id: 'zero', title: 'كود دون خصم', discountKind: 'PRODUCT_DISCOUNT', couponCode: 'ZERO' },
  { ...base, id: 'bundle', title: 'باقة المتجر', dealType: 'BUNDLE', couponCode: 'BUNDLE-CODE', storeId: store.id,
    storeName: store.name, originalPrice: 1800, offerPrice: 1500, products: [{ id: 'piece', name: 'منتج الباقة', price: 800 }] },
  { ...base, id: 'other-bundle', title: 'باقة رئيسية أخرى', dealType: 'BUNDLE', storeId: store.id, storeName: store.name,
    products: [{ id: 'piece-2', name: 'قطعة أخرى', price: 900 }] },
  { ...base, id: 'missing-store', title: 'باقة متجر غير متاح', dealType: 'BUNDLE', storeId: 'missing', products: [{ id: 'piece-3', name: 'قطعة', price: 500 }] },
];
let finishCoupon;
const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, multiRemove: async () => {} };
const api = {
  api: { initToken: async () => null, getToken: () => null, setSessionExpiredHandler() {},
    get: async () => ({ isEnabled: false, serverTime: new Date().toISOString() }) },
  authApi: {}, addressApi: {}, paymentsApi: {}, cartApi: {},
  catalogApi: { getCategories: async () => [], getStores: async () => [store], getDeals: async () => offers,
    getProducts: async () => ({ items: [{ id: 'regular', storeId: store.id, storeName: store.name, categoryId: 'category-1',
      name: 'منتج عادي', sellingPrice: 1200, sourceType: 'IN_STOCK', inStock: true }] }) },
  ordersApi: { validateCouponCode: async code => {
    validations.push(code);
    if (code === 'BAD') throw new Error('Invalid coupon');
    if (code === 'ZERO') return { code, discountKind: 'PRODUCT_DISCOUNT', discountPercent: 0 };
    return new Promise(resolve => { finishCoupon = () => resolve({ code: 'SAVE', discountKind: 'PRODUCT_DISCOUNT', discountPercent: 20 }); });
  } },
};
const native = {
  StyleSheet: { create: value => value }, Platform: { OS: 'android' },
  Alert: { alert: (...args) => alerts.push(args) },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  ...Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'Modal', 'ActivityIndicator'].map(name => [name, name])),
};
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = spec => {
    if (spec === 'react' || spec === 'react/jsx-runtime') return require(path.join(root, 'customer-app/node_modules', spec));
    if (spec === 'react-native') return native;
    if (spec === 'react-native-safe-area-context') return { SafeAreaView: 'View', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
    if (spec === '@react-native-async-storage/async-storage') return storage;
    if (spec.endsWith('/api')) return api;
    if (spec.endsWith('/notifications')) return { unregisterPushDevice: async () => {} };
    const name = path.basename(spec);
    if (['Header', 'AppIcon', 'CachedImage', 'ProductDetailsModal'].includes(name)) return { [name]: name === 'ProductDetailsModal' ? () => null : name };
    const target = [path.resolve(path.dirname(file), spec) + '.ts', path.resolve(path.dirname(file), spec) + '.tsx', path.resolve(path.dirname(file), spec, 'index.ts')].find(fs.existsSync);
    if (!target) throw new Error(`Unexpected dependency ${spec}`);
    return load(target);
  };
  vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(localRequire, module, module.exports, false);
  return module.exports;
}
async function main() {
  const source = path.join(root, 'customer-app/src');
  const { AppProvider, useApp } = load(path.join(source, 'context/AppContext.tsx'));
  const { OffersDealsSection } = load(path.join(source, 'components/OffersDealsSection.tsx'));
  const { DealDetailsModal } = load(path.join(source, 'components/DealDetailsModal.tsx'));
  const { StoreDetailScreen } = load(path.join(source, 'screens/StoreDetailScreen.tsx'));
  let app, tree;
  function Harness() {
    app = useApp();
    return React.createElement(app.currentScreen === 'store_detail' ? StoreDetailScreen : OffersDealsSection);
  }
  const find = label => tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
  const text = () => tree.root.findAllByType('Text').map(node => node.props.children).flat(Infinity).join(' ');
  const click = async label => act(async () => { find(label).props.onPress({ stopPropagation() {} }); });
  try {
    await act(async () => { tree = create(React.createElement(AppProvider, null, React.createElement(Harness))); await Promise.resolve(); });
    await act(async () => { await app.refreshCatalog(); });
    await act(async () => { await app.addToCart(app.products[0]); });
    assert.match(text(), /عرض ساري/);
    const coupon = find('تفعيل الخصم خصم بالكود');
    let stopped = 0;
    await act(async () => { coupon.props.onPress({ stopPropagation() { stopped++; } }); coupon.props.onPress({ stopPropagation() { stopped++; } }); });
    assert.equal(stopped, 2); assert.deepEqual(validations, ['SAVE'], 'rapid taps send only one coupon validation');
    assert.match(text(), /جارٍ التفعيل/);
    assert.equal(app.promoCode, '', 'activation stays unconfirmed until the server responds');
    await act(async () => { finishCoupon(); await Promise.resolve(); });
    assert.equal(app.promoCode, 'SAVE'); assert.equal(app.cartDiscount, 240);
    assert.equal(find('تفعيل الخصم خصم بالكود').props.accessibilityState.selected, true);
    assert.match(text(), /تم تفعيل الكود بنجاح/);
    await click('تفعيل الخصم كود غير صالح');
    assert.match(text(), /تعذر تفعيل الكود/); assert.equal(app.promoCode, 'SAVE', 'a failed replacement keeps the current confirmed discount');
    assert.equal(find('تفعيل الخصم كود غير صالح').props.accessibilityState.selected, false);
    await click('تفعيل الخصم كود دون خصم');
    assert.equal(app.promoCode, 'SAVE', 'zero-percent responses must not be claimed as activation');
    assert.equal(find('تفعيل الخصم كود دون خصم').props.accessibilityState.selected, false);
    await click('تفعيل الخصم خصم التوصيل');
    assert.equal(app.activeDeliveryDealId, 'delivery'); assert.equal(app.cart.length, 1, 'delivery action activates a discount rather than adding a fake product');
    assert.equal(find('تفعيل الخصم خصم بالكود').props.accessibilityState.selected, false);
    await click('تفعيل العرض توصيل مجاني');
    assert.equal(app.activeDeliveryDealId, 'free'); assert.equal(app.isFreeDeliveryPromo, true);
    await click('تفعيل الخصم خصم الطلب');
    assert.equal(app.activeOrderDiscountDeal.id, 'order-discount'); assert.equal(app.activeDeliveryDealId, null); assert.equal(app.cartDiscount, 180);
    await act(async () => { tree.update(React.createElement(AppProvider, null, React.createElement(Harness, { key: 'reopen-home' }))); });
    assert.equal(find('تفعيل الخصم خصم الطلب').props.accessibilityState.selected, true, 'activation feedback survives reopening home');
    await act(async () => { app.clearPromoCode(); });
    assert.equal(find('تفعيل الخصم خصم الطلب').props.accessibilityState.selected, false);
    await click('تفاصيل العرض باقة المتجر');
    assert.equal(tree.root.findByType('Modal').props.visible, true);
    assert.match(text(), /منتج الباقة/); assert.match(text(), /السعر الإجمالي للعرض/);
    assert.equal(validations.includes('BUNDLE-CODE'), false, 'a bundle card with a code still opens its product details');
    await click(`استعراض متجر ${store.name}`);
    assert.equal(app.selectedStore.id, store.id); assert.equal(app.currentScreen, 'store_detail'); assert.equal(app.selectedStoreDealId, 'bundle');
    assert.match(text(), /باقة المتجر/); assert.match(text(), /منتج عادي/);
    assert.doesNotMatch(text(), /باقة رئيسية أخرى/, 'only the specifically opened home-only offer is included in this store visit');
    await act(async () => { app.navigateTo('store_detail'); });
    assert.equal(app.selectedStoreDealId, null, 'a regular store visit clears the previous offer selection');
    assert.doesNotMatch(text(), /باقة المتجر/);
    await act(async () => { app.navigateTo('home'); });
    await click('فتح العرض باقة متجر غير متاح');
    await click('استعراض متجر ');
    assert.equal(alerts.at(-1)[0], 'المتجر غير متاح'); assert.equal(app.currentScreen, 'home');
    let searchClosed = 0;
    function SearchDetailHarness() {
      app = useApp();
      return React.createElement(DealDetailsModal, { visible: true, deal: { ...offers.find(d => d.id === 'bundle'), dealType: 'BUNDLE' }, onClose() {}, onNavigate: () => searchClosed++ });
    }
    await act(async () => { tree.update(React.createElement(AppProvider, null, React.createElement(SearchDetailHarness))); });
    await click(`استعراض متجر ${store.name}`);
    assert.equal(searchClosed, 1, 'bundle navigation closes its parent search, including same-store navigation');
    await act(async () => { app.activateProductDiscountDeal('fresh-search-offer', { ...offers.find(d => d.id === 'order-discount'), id: 'fresh-search-offer', dealType: 'PRODUCT_DISCOUNT', discountPercent: 25 }); });
    assert.equal(app.activeOrderDiscountDeal.id, 'fresh-search-offer', 'fresh search offers work without depending on an older loaded catalog snapshot');
    assert.equal(app.cartDiscount, 300);
    console.log('PASS coupon loading/success/failure/single request, valid discount totals, delivery/free/order activation, replacement/clear/reopen state, bundle details and selected-offer store navigation, missing-store feedback');
  } finally { if (tree) await act(async () => { tree.unmount(); }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
