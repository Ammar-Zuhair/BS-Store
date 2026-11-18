// Exercise the real bell, inbox screen and API adapter with native/network boundaries mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const root = path.resolve(__dirname, '../src');
const cache = new Map();
const listeners = new Set();
const requests = [];
const navigations = [];
let responder;
let refreshedCatalog = 0;
const api = { get: async endpoint => { requests.push(endpoint); return responder(endpoint); } };
const app = {
  colors: null, cart: [], addresses: [], selectedAddress: null,
  navigateTo: screen => navigations.push(screen),
  refreshData: async () => { refreshedCatalog++; },
};
function FlatList(props) {
  return React.createElement('List', props,
    props.ListHeaderComponent,
    props.data.length ? props.data.map(item => React.createElement(React.Fragment, { key: item.id }, props.renderItem({ item }))) : props.ListEmptyComponent,
    props.ListFooterComponent);
}
const native = {
  StyleSheet: { create: value => value, hairlineWidth: 1 },
  FlatList,
  AppState: { currentState: 'active', addEventListener: (_, callback) => {
    listeners.add(callback); return { remove: () => listeners.delete(callback) };
  } },
  Alert: { alert: () => {} },
  ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'Image', 'Modal', 'ActivityIndicator', 'ScrollView', 'RefreshControl'].map(name => [name, name])),
};
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = specifier => {
    if (specifier === 'react-native') return native;
    if (specifier === 'react' || specifier === 'react/jsx-runtime') return require(specifier);
    if (specifier === 'react-native-safe-area-context') return { SafeAreaView: 'View', useSafeAreaInsets: () => ({ bottom: 12 }) };
    if (specifier.endsWith('/context/AppContext')) return { useApp: () => app };
    if (specifier === './client') return { api };
    if (specifier.endsWith('/CatalogSearchModal')) return { CatalogSearchModal: () => null };
    if (specifier.endsWith('/AppIcon')) return { AppIcon: 'Icon' };
    if (specifier.endsWith('/LocationPickerModal')) return { LocationPickerModal: () => null };
    if (specifier.endsWith('.png')) return 1;
    const base = path.resolve(path.dirname(file), specifier);
    const resolved = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync);
    if (!resolved) throw new Error(`Unexpected dependency ${specifier}`);
    return load(resolved);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}

async function main() {
  const { lightColors, darkColors } = load(path.join(root, 'theme/index.ts'));
  const { notificationDestination, formatNotificationDate } = load(path.join(root, 'utils/notificationInbox.ts'));
  const { Header } = load(path.join(root, 'components/Header.tsx'));
  const { NotificationsScreen } = load(path.join(root, 'screens/NotificationsScreen.tsx'));
  const note = (id, type, createdAt) => ({ id, type, createdAt, title: `عنوان ${id}`, body: `رسالة كاملة ${id}\nالسطر الثاني`, isRead: false });
  const first = note('offer-1', 'offer', '2026-10-16T06:00:00Z');
  const older = note('update-1', 'update', '2026-10-15T06:00:00Z');
  const pageOne = { items: [first, note('order-1', 'order_status', '2026-10-16T07:00:00Z')], hasMore: true, unreadCount: 1 };
  assert.equal(notificationDestination('broadcast'), 'notifications');
  assert.equal(notificationDestination('promotion'), 'notifications');
  assert.equal(notificationDestination('order_status'), 'tracking');
  assert.equal(formatNotificationDate('2026-10-16T06:00:00'), formatNotificationDate(first.createdAt), 'UTC timestamps without suffix display the same time');
  assert.match(formatNotificationDate(first.createdAt), /٢٠٢٦.*٠٩:٠٠/);

  app.colors = lightColors;
  let tree;
  const press = label => tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label).props.onPress();
  const text = () => tree.root.findAllByType('Text').map(node => node.props.children).flat().join(' ');
  try {
    await act(async () => { tree = create(React.createElement(Header)); });
    await act(async () => { press('الانتقال إلى الإشعارات'); });
    assert.equal(navigations.at(-1), 'notifications', 'bell opens the inbox');
    await act(async () => { tree.unmount(); });

    responder = async () => pageOne;
    await act(async () => { tree = create(React.createElement(NotificationsScreen)); });
    assert.match(requests.at(-1), /inboxOnly=true&page=1&pageSize=30/);
    assert.match(text(), /رسالة كاملة offer-1/);
    assert.match(text(), /السطر الثاني/);
    assert.doesNotMatch(text(), /order-1/, 'order status must never render in the inbox');
    assert.equal(tree.root.findByType('List').props.data.length, 1);
    const message = tree.root.findAllByType('Text').find(node => node.props.children === first.body);
    assert.equal(message.props.numberOfLines, undefined, 'message body is never truncated');

    responder = async () => { throw new Error('تعذر الاتصال'); };
    await act(async () => { press('عرض الإشعارات الأقدم'); });
    assert.match(text(), /تعذر الاتصال/);
    assert.match(text(), /offer-1/, 'older-page failure preserves already loaded messages');
    responder = async () => ({ items: [first, older], hasMore: false, unreadCount: 1 });
    await act(async () => { press('إعادة تحميل الإشعارات'); });
    assert.match(requests.at(-1), /page=2/);
    assert.deepEqual(tree.root.findByType('List').props.data.map(item => item.id), ['offer-1', 'update-1'], 'older pages append and deduplicate');

    responder = async () => ({ ...pageOne, items: [note('new-alert', 'alert', '2026-10-16T09:00:00Z'), first] });
    await act(async () => { for (const listener of listeners) listener('active'); });
    assert.deepEqual(tree.root.findByType('List').props.data.map(item => item.id), ['new-alert', 'offer-1', 'update-1'], 'foreground refresh retains older loaded pages');

    app.colors = darkColors;
    await act(async () => { tree.update(React.createElement(NotificationsScreen)); });
    const title = tree.root.findAllByType('Text').find(node => node.props.children === first.title);
    assert.equal(title.props.style.color, darkColors.onSurface, 'dark mode uses visible text');

    // A response from an older request must not overwrite a later refresh.
    let releaseStale;
    responder = () => new Promise(resolve => { releaseStale = resolve; });
    let stale;
    await act(async () => { stale = tree.root.findByType('List').props.refreshControl.props.onRefresh(); });
    responder = async () => ({ items: [], hasMore: false, unreadCount: 0 });
    await act(async () => { press('تحديث البيانات'); });
    await act(async () => { releaseStale(pageOne); await stale; });
    assert.equal(tree.root.findByType('List').props.data.length, 0);
    assert.match(text(), /لا توجد إشعارات بعد/);
    assert.equal(refreshedCatalog, 0, 'inbox header refresh fetches notifications instead of the catalog');

    responder = async () => { throw new Error('الإنترنت غير متصل'); };
    await act(async () => { press('تحديث البيانات'); });
    assert.match(text(), /الإنترنت غير متصل/);
    assert.doesNotMatch(text(), /لا توجد إشعارات بعد/, 'failed loading is distinct from an empty inbox');
    console.log('PASS bell and push destinations, admin-only messages, full bodies, Yemen timestamps, pagination, retry, deduplication, foreground refresh, dark mode, empty/error states and stale responses');
  } finally {
    if (tree) await act(async () => { tree.unmount(); });
  }
  assert.equal(listeners.size, 0, 'screen listeners are cleaned up');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
