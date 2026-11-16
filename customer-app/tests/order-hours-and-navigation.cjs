// Run with: node tests/order-hours-and-navigation.cjs
// Exercise the actual provider and screens with native/network boundaries mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const cache = new Map();
const appStateListeners = new Set();
const alerts = [];
const sourceRoot = path.resolve(__dirname, '../src');
let restoredTheme = null;
let serverOrders = [{ id: 'order-1', orderNumber: '101', status: 9, subOrders: [], createdAt: '2026-10-06T06:00:00Z' }];
const serverHours = { isEnabled: true, openingTime: '09:00', closingTime: '23:00', serverTime: '2026-10-06T06:00:00Z', timeZone: 'Asia/Aden' };
const serverStore = { id: 'store-1', name: 'متجر الاختبار', phone: '', address: 'صنعاء', isActive: true, openingTime: '09:00', closingTime: '23:00', is24Hours: false };
const storage = {
  getItem: async (key) => key === '@bs_theme_mode' ? restoredTheme : key === '@bs_customer_user' ? JSON.stringify({ name: 'عميل الاختبار', phone: '0000000' }) : key === 'auth_token' ? 'test-token' : null,
  setItem: async () => {},
  removeItem: async () => {},
  multiRemove: async () => {},
};
const native = {
  StyleSheet: { create: value => value, flatten: value => value, absoluteFillObject: {} },
  AppState: { currentState: 'active', addEventListener: (_, callback) => {
    appStateListeners.add(callback); return { remove() { appStateListeners.delete(callback); } };
  } },
  Alert: { alert: (...args) => alerts.push(args) }, Linking: { openURL() {} }, Platform: { OS: 'android' },
  ...Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'RefreshControl', 'ActivityIndicator', 'TextInput'].map(name => [name, name])),
};
const apiMock = {
  api: { getToken: () => 'test-token', initToken: async () => 'test-token', refreshSession: async () => true,
    setSessionExpiredHandler() {}, get: async () => serverHours },
  authApi: { me: async () => ({ fullName: 'عميل الاختبار', phone: '0000000' }) },
  catalogApi: { getCategories: async () => [], getStores: async () => [serverStore], getProducts: async () => ({ items: [] }), getDeals: async () => [] },
  cartApi: {}, ordersApi: { getMyOrders: async () => serverOrders }, addressApi: { getAddresses: async () => [] }, paymentsApi: {},
};

function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = specifier => {
    if (specifier === 'react-native') return native;
    if (specifier === 'react' || specifier === 'react/jsx-runtime') return require(specifier);
    if (specifier === '@react-native-async-storage/async-storage') return storage;
    if (specifier === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (specifier === 'react-native-svg') return {
      default: 'Svg',
      Svg: 'Svg',
      Path: 'Path',
      Defs: 'Defs',
      LinearGradient: 'LinearGradient',
      RadialGradient: 'RadialGradient',
      Stop: 'Stop',
      Circle: 'Circle',
      Rect: 'Rect',
      G: 'G',
    };
    if (specifier.endsWith('/api')) return apiMock;
    if (specifier.endsWith('/notifications')) return { unregisterPushDevice: async () => {} };
    const name = path.basename(specifier);
    if (['Header', 'AppIcon', 'CachedImage', 'KeyboardAwareScrollView', 'BoosthisRuntime', 'AppBackground'].includes(name)) {
      return { [name]: name, BoosthisScreenTracker: () => null, AppBackground: () => null };
    }
    if (specifier.endsWith('/transferReceipt')) return {};
    const base = path.resolve(path.dirname(file), specifier);
    const resolved = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync);
    if (resolved) return load(resolved);
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  const run = vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file });
  run(localRequire, module, module.exports, false);
  return module.exports;
}

async function main() {
  const { isOpenNow, formatTime, hoursDescription } = load(path.join(sourceRoot, 'utils/openingHours.ts'));
  const at = value => Date.parse(value);
  assert.equal(isOpenNow(serverStore, at('2026-10-06T05:59:59Z')), false);
  assert.equal(isOpenNow(serverStore, at('2026-10-06T06:00:00Z')), true);
  assert.equal(isOpenNow(serverStore, at('2026-10-06T20:00:00Z')), false);
  const overnight = { openingTime: '20:00', closingTime: '02:00' };
  assert.equal(isOpenNow(overnight, at('2026-10-06T21:30:00Z')), true);
  assert.equal(isOpenNow(overnight, at('2026-10-06T23:00:00Z')), false);
  assert.equal(isOpenNow({}, Date.now()), null);
  assert.equal(isOpenNow({ is24Hours: true }, Date.now()), true);
  assert.equal(formatTime('00:00'), '12:00 ص');
  assert.equal(formatTime('12:00'), '12:00 م');
  assert.match(hoursDescription(overnight), /اليوم التالي/);

  const { AppProvider, useApp } = load(path.join(sourceRoot, 'context/AppContext.tsx'));
  const { TrackingScreen } = load(path.join(sourceRoot, 'screens/TrackingScreen.tsx'));
  const { OrderHoursBanner } = load(path.join(sourceRoot, 'components/OrderHoursBanner.tsx'));
  const { StoreCard } = load(path.join(sourceRoot, 'components/StoreCard.tsx'));
  let app;
  let showHours = false;
  function Harness() {
    app = useApp();
    return showHours ? React.createElement(React.Fragment, null, React.createElement(OrderHoursBanner), React.createElement(StoreCard, { store: app.stores[0] }))
      : React.createElement(TrackingScreen);
  }
  let tree;
  try {
    await act(async () => { tree = create(React.createElement(AppProvider, null, React.createElement(Harness))); });
    await act(async () => { await app.refreshOrders(); });
    assert.equal(app.orders.length, 1);
    assert.match(app.orders[0].createdAt, /٢٠٢٦/, 'the complete year must be shown beside the order time');
    assert.match(app.orders[0].createdAt, /٠٦.*١٠.*٢٠٢٦.*·.*٠٩:٠٠/, 'order dates and times use the same Yemen time zone');
    assert.equal(app.currentOrder, null, 'refresh must not select the most recent order');
    assert.equal(tree.root.findByType('Header').props.title, 'طلباتي');

    await act(async () => { app.setCurrentOrder(app.orders[0]); });
    assert.match(tree.root.findByType('Header').props.title, /تفاصيل طلب/);
    await act(async () => { await app.refreshOrders(); });
    assert.equal(app.currentOrder.id, 'order-1', 'refresh preserves an explicit selection');
    await act(async () => { app.navigateTo('tracking'); });
    assert.equal(tree.root.findByType('Header').props.title, 'طلباتي', 'tapping Orders returns to its list');
    await act(async () => { await app.refreshOrders(); });
    assert.equal(app.currentOrder, null, 'list refresh stays in the list');

    await act(async () => { app.setCurrentOrder(app.orders[0]); });
    await act(async () => { tree.root.findByType('Header').props.onBack(); });
    assert.equal(tree.root.findByType('Header').props.title, 'طلباتي', 'back from details returns to list');

    await act(async () => { app.setCurrentOrder(app.orders[0]); });
    serverOrders = [{ ...serverOrders[0], id: 'order-2', orderNumber: '102' }];
    await act(async () => { await app.refreshOrders(); });
    assert.equal(app.currentOrder, null, 'missing selected order must not open another order');
    assert.equal(tree.root.findByType('Header').props.title, 'طلباتي');

    showHours = true;
    await act(async () => { tree.update(React.createElement(AppProvider, null, React.createElement(Harness))); });
    const text = () => tree.root.findAllByType('Text').map(node => node.props.children).flat().join(' ');
    assert.match(text(), /استقبال الطلبات مفتوح الآن/);
    assert.match(text(), /مفتوح/);
    const details = tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === 'مواعيد متجر متجر الاختبار');
    let propagationStopped = false;
    await act(async () => { details.props.onPress({ stopPropagation() { propagationStopped = true; } }); });
    assert.equal(propagationStopped, true, 'Details press does not open the product screen');
    assert.match(alerts.at(-1)[1], /يفتح 9:00 ص.*يقفل 11:00 م/);

    serverHours.openingTime = '20:00'; serverHours.closingTime = '02:00';
    serverStore.openingTime = '20:00'; serverStore.closingTime = '02:00';
    await act(async () => { for (const callback of appStateListeners) callback('active'); });
    assert.match(text(), /استقبال الطلبات مغلق الآن/, 'admin schedule edits refresh on foreground');
    assert.equal(app.stores[0].openingTime, '20:00', 'store schedule edits also refresh');
    const originalAddress = { id: 'address-original', label: 'المنزل', city: 'صنعاء', street: 'شارع', latitude: 15, longitude: 44, isDefault: true };
    apiMock.addressApi.getAddresses = async () => [originalAddress];
    await act(async () => { await app.refreshData(); });
    assert.equal(app.selectedAddress.id, originalAddress.id);
    let resolveStale;
    apiMock.addressApi.getAddresses = () => new Promise(resolve => { resolveStale = resolve; });
    let pendingRefresh;
    await act(async () => { pendingRefresh = app.refreshData(); });
    apiMock.addressApi.getAddresses = async () => { throw new Error('Temporary refresh failure'); };
    apiMock.addressApi.updateAddress = async () => ({ id: 'address-replacement', isDefault: true });
    await act(async () => { await app.updateSavedAddress(originalAddress.id, { ...originalAddress, city: 'عدن' }); });
    assert.equal(app.addresses[0].id, 'address-replacement');
    assert.equal(app.selectedAddress.city, 'عدن', 'confirmed edits remain visible if the following refresh fails');
    await act(async () => { resolveStale([originalAddress]); await pendingRefresh; });
    assert.equal(app.addresses[0].id, 'address-replacement', 'an earlier refresh cannot undo a confirmed address edit');
    apiMock.addressApi.deleteAddress = async () => {};
    await act(async () => { await app.deleteSavedAddress('address-replacement'); });
    assert.equal(app.addresses.length, 0, 'confirmed deletion must immediately remove the address even if refresh fails');
    assert.equal(app.selectedAddress, null);
    // Theme restoration must not wait for a slow refresh-token request during startup.
    await act(async () => tree.unmount());
    restoredTheme = 'dark';
    let resumeSession;
    apiMock.api.refreshSession = () => new Promise(resolve => { resumeSession = resolve; });
    function ThemeHarness() { app = useApp(); return null; }
    await act(async () => { tree = create(React.createElement(AppProvider, null, React.createElement(ThemeHarness))); });
    assert.equal(app.isThemeReady, true);
    assert.equal(app.isDarkMode, true);
    assert.equal(app.isAuthLoading, true, 'correct logo theme is available while session restoration is still pending');
    await act(async () => resumeSession(true));
    assert.equal(app.isAuthLoading, false);
    // Real provider keeps the current auth screen until verified-success feedback completes.
    for (const isNewUser of [false, true]) {
      await act(async () => app.navigateTo('auth'));
      apiMock.authApi.verifyOtp = async () => ({ requiresProfileCompletion: isNewUser, user: { fullName: 'عميل موثق', phone: '+967771234567' } });
      let finishFeedback, login;
      await act(async () => { login = app.verifyOtp('+967771234567', '123456', () => new Promise(resolve => { finishFeedback = resolve; })); });
      assert.equal(app.currentScreen, 'auth', 'verified session waits for success acknowledgement');
      await act(async () => { finishFeedback(); await login; });
      assert.equal(app.currentScreen, isNewUser ? 'auth' : 'home');
      assert.equal(app.needsProfileCompletion, isNewUser, 'existing and new accounts keep the correct destination');
    }
    let acknowledged = false;
    apiMock.authApi.verifyOtp = async () => { throw Error('invalid code'); };
    await act(async () => { await assert.rejects(app.verifyOtp('phone', '000000', async () => { acknowledged = true; }), /invalid code/); });
    assert.equal(acknowledged, false, 'failed verification cannot trigger success feedback');
    apiMock.authApi.verifyOtp = async () => ({ requiresProfileCompletion: false, user: { fullName: 'عميل موثق', phone: '+967771234567' } });
    await act(async () => { await app.verifyOtp('phone', '123456', async () => { throw Error('presentation failure'); }); });
    assert.equal(app.currentScreen, 'home', 'presentation failure cannot discard a verified session');
    console.log('PASS opening/closing boundaries, overnight hours, 24-hour and unknown schedules, Arabic times, order navigation, live hours banner, store details, foreground/manual refresh, confirmed address mutations and stale response protection');
  } finally {
    if (tree) await act(async () => { tree.unmount(); });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
