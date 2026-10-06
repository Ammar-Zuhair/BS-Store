// node tests/admin-payments.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const React = require(path.join(root, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(root, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = new Map();
const calls = [];
const alerts = [];
let blockRefresh = false;
let approve;
let approvalFailed = false;
let imageFails = false;
let imageCalls = 0;
const pending = { id: 'payment-1', orderId: 'order-1', orderNumber: 'TEST', status: 'PENDING', rawStatus: 1, amount: 2500, receipts: [{ url: 'payments/receipts/receipt-1' }] };
const apiMock = {
  api: { getToken: () => 'test-admin', initSession: async () => null, getReceiptImage: async () => {
    imageCalls++; if (imageFails) throw new Error('تعذر الاتصال'); return 'data:image/jpeg;base64,dGVzdA==';
  } },
  authApi: {},
  adminApi: new Proxy({}, { get: (_, name) => async () => {
    calls.push(name);
    if (name === 'approvePayment') {
      if (approvalFailed) throw new Error('Not saved');
      return new Promise(resolve => { approve = () => resolve({ orderId: 'order-1', orderStatus: 13, amountReceived: 2400, amountReceivedAt: '2026-10-06T18:00:00Z', amountReceivedBy: 'admin-1' }); });
    }
    if (blockRefresh && ['getDashboard', 'getOrders', 'getPayments'].includes(name)) return new Promise(() => {});
    if (name === 'getPayments') return [pending];
    if (name === 'getOrders') return [{ id: 'order-1', status: 1, paymentStatus: 1, paymentMethod: 1 }];
    if (name === 'getDashboard') return { pendingVerificationPayments: 1 };
    if (name === 'getProducts') return { items: [] };
    if (name === 'getDriverProfitShare') return { percent: 10 };
    return [];
  } }),
};
const native = {
  StyleSheet: { create: value => value }, Alert: { alert: (...args) => alerts.push(args) },
  ...Object.fromEntries(['View', 'Text', 'Image', 'TextInput', 'ScrollView', 'TouchableOpacity', 'ActivityIndicator'].map(name => [name, name])),
};
let asset = { uri: 'file:///receipt.jpg', width: 4400, height: 2200 };
let cancelled = false;
const manipulations = [];
const picker = { requestMediaLibraryPermissionsAsync: async () => ({ granted: true }), launchImageLibraryAsync: async () => ({ canceled: cancelled, assets: [asset] }) };
const manipulator = { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: () => ({
  resize: options => manipulations.push(['resize', options]),
  renderAsync: async () => ({ saveAsync: async options => { manipulations.push(['save', options]); return { uri: 'file:///optimized.jpg' }; }, release: () => manipulations.push(['releaseImage']) }),
  release: () => manipulations.push(['releaseContext']),
}) } };
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = specifier => {
    if (specifier === 'react-native') return native;
    if (specifier === 'react') return React;
    if (specifier === 'react/jsx-runtime') return require(path.join(root, 'customer-app/node_modules/react/jsx-runtime'));
    if (specifier === '../api') return apiMock;
    if (specifier === '../api/client') return { API_BASE_URL: 'https://example.test/api' };
    if (specifier.endsWith('/notifications')) return {};
    if (specifier.endsWith('/BoosthisRuntime')) return { BoosthisScreenTracker: () => null };
    if (specifier.endsWith('/AdminHeader')) return { AdminHeader: 'AdminHeader' };
    if (specifier === 'expo-image-picker') return picker;
    if (specifier === 'expo-image-manipulator') return manipulator;
    const base = path.resolve(path.dirname(file), specifier);
    const target = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync);
    if (!target) throw new Error(`Unexpected dependency ${specifier}`);
    return load(target);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
async function main() {
  const { AdminProvider, useAdmin } = load(path.join(root, 'admin-app/src/context/AdminContext.tsx'));
  const { PaymentsScreen } = load(path.join(root, 'admin-app/src/screens/PaymentsScreen.tsx'));
  const { ReceiptImage } = load(path.join(root, 'admin-app/src/components/ReceiptImage.tsx'));
  let context;
  function Harness() { context = useAdmin(); return React.createElement(PaymentsScreen); }
  let tree, standalone;
  try {
    await act(async () => { tree = create(React.createElement(AdminProvider, null, React.createElement(Harness))); });
    await act(async () => { await context.refreshData(); });
    assert.equal(context.bankTransfers[0].status, 'PENDING');
    const image = tree.root.findByType('Image');
    assert.match(image.props.source.uri, /^data:image\//, 'native Image displays an authenticated download, not a raw protected URL');
    assert.equal(image.props.source.headers, undefined);
    await act(async () => { tree.root.findByType('TextInput').props.onChangeText('2400'); });
    const button = tree.root.findAllByType('TouchableOpacity').find(node => node.findAllByType('Text').some(text => text.props.children === 'اعتماد وتسجيل المبلغ'));
    calls.length = 0; blockRefresh = true;
    await act(async () => { button.props.onPress(); button.props.onPress(); await Promise.resolve(); });
    assert.equal(calls.filter(name => name === 'approvePayment').length, 1, 'rapid taps must send only one approval');
    assert.equal(context.bankTransfers[0].status, 'PENDING', 'do not claim success before server confirmation');
    await act(async () => { approve(); await Promise.resolve(); });
    assert.equal(context.bankTransfers[0].status, 'VERIFIED');
    assert.equal(context.bankTransfers[0].amountReceived, 2400);
    assert.equal(context.bankTransfers[0].amountReceivedAt, '2026-10-06T18:00:00Z');
    assert.equal(context.orders[0].status, 'PENDING_ADMIN_APPROVAL');
    assert.match(alerts.at(-1)[1], /تم اعتماد/);
    assert.deepEqual(calls.filter(name => name !== 'approvePayment').sort(), ['getDashboard', 'getOrders', 'getPayments'], 'only relevant data refreshes after approval');
    assert.equal(tree.root.findAllByType('TouchableOpacity').some(node => node.findAllByType('Text').some(text => text.props.children === 'جارٍ...')), false, 'busy state clears even when all background refreshes are still pending');
    approvalFailed = true;
    const before = context.bankTransfers[0];
    await act(async () => { await assert.rejects(context.verifyBankTransfer('payment-1', true, undefined, 2500), /Not saved/); });
    assert.deepEqual(context.bankTransfers[0], before, 'failed save must leave confirmed state intact');

    imageFails = true;
    await act(async () => { standalone = create(React.createElement(ReceiptImage, { url: 'https://example.test/api/payments/receipts/test' })); });
    assert.equal(standalone.root.findAllByType('Image').length, 0);
    assert.equal(standalone.root.findAllByType('ActivityIndicator').length, 0);
    const previousImageCalls = imageCalls; imageFails = false;
    await act(async () => { standalone.root.findByType('TouchableOpacity').props.onPress(); });
    assert.equal(imageCalls, previousImageCalls + 1); assert.match(standalone.root.findByType('Image').props.source.uri, /^data:image\//);

    const { chooseTransferReceipt } = load(path.join(root, 'customer-app/src/utils/transferReceipt.ts'));
    const receipt = await chooseTransferReceipt();
    assert.equal(receipt.mimeType, 'image/jpeg');
    assert.deepEqual(manipulations[0], ['resize', { width: 2200 }]);
    assert.deepEqual(manipulations[1], ['save', { format: 'jpeg', compress: 0.85 }]);
    assert.deepEqual(manipulations.slice(-2), [['releaseImage'], ['releaseContext']]);
    manipulations.length = 0; asset = { ...asset, width: 600, height: 800 }; await chooseTransferReceipt();
    assert.equal(manipulations.some(call => call[0] === 'resize'), false, 'small receipts must not be upscaled');
    cancelled = true; assert.equal(await chooseTransferReceipt(), null);
    console.log('PASS authenticated image display/retry, single approval per tap sequence, immediate confirmed payment despite blocked refreshes, no false success on failure, receipt compression/cleanup/cancellation');
  } finally {
    if (tree) await act(async () => tree.unmount());
    if (standalone) await act(async () => standalone.unmount());
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
