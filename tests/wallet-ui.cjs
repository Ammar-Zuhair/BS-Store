// Render the real wallet screens with native/network boundaries stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const ts = require(path.join(base, 'customer-app/node_modules/typescript'));
const React = require(path.join(base, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(base, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = new Map();
const calls = [];
let failUpload = true;
let finishUpload;
let dark = false;
const method = { id: 'method', name: 'كريمي', accountName: 'شركة التجربة', accountNumber: 'TEST', instructions: 'تعليمات' };
const summary = { balance: 800, transactions: [{ id: 'entry', amount: 200, balanceAfter: 800, description: 'باقي نقدي', createdAt: '2026-11-20T10:00:00Z' }], topUps: [{ id: 'old', amount: 20, methodName: 'كريمي', status: 'Rejected', rejectionReason: 'الحوالة غير مستلمة', transferReference: 'OLD', createdAt: '2026-11-20T10:00:00Z' }], hasMore: false };
const topUp = { id: 'pending', customerName: 'عميل', customerPhone: '777', amount: 200, methodName: 'كريمي', senderName: 'المرسل', senderPhone: '777', transferReference: 'REF', status: 'Pending', receiptUrl: '/api/wallet/receipts/pending', createdAt: '2026-11-20T10:00:00Z' };
const walletApi = { get: async () => summary, methods: async () => [method], topUp: async (_image, fields) => {
  calls.push(['topup', fields]); if (failUpload) throw new Error('فشل الاتصال'); await new Promise(resolve => { finishUpload = resolve; }); return { id: 'new', status: 'Pending' };
} };
const api = { get: async endpoint => endpoint.includes('/topups') ? [topUp] : endpoint.includes('/methods') ? [method] : { transactions: [], customers: [], changesToday: [], deniedAttempts: [], mismatches: 0, changeLimit: 1000, dailyLimit: 5000 },
  post: async (endpoint, body) => { calls.push([endpoint, body]); }, put: async () => {} };
const native = { StyleSheet: { create: v => v }, Alert: { alert: () => {} },
  AppState: { addEventListener: () => ({ remove() {} }) },
  ...Object.fromEntries(['Text', 'View', 'TextInput', 'Image', 'TouchableOpacity', 'ActivityIndicator', 'Switch', 'ScrollView'].map(name => [name, name])),
};
const driver = { activeTask: { id: 'order', orderNumber: 'ORDER', customerName: 'عميل', customerPhone: '777', customerAddress: 'Test', paymentMethod: 'CASH_ON_DELIVERY', amountToCollect: 1800,
  totalAmount: 1800, transferredAmount: 0, isTransferAmountConfirmed: true, stops: [{ id: 'delivery', type: 'DELIVERY_CUSTOMER', status: 'PENDING', name: 'عميل', address: 'Test' }], items: [], status: 'EN_ROUTE_DELIVERY' },
  completeDeliveryAndCollect: async (...args) => calls.push(['delivery', args]), navigateBack() {}, refreshData() {}, navigateTo() {}, isRefreshing: false };
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  function req(spec) {
    if (spec === 'react' || spec === 'react/jsx-runtime') return require(path.join(base, 'customer-app/node_modules', spec));
    if (spec === 'react-native') return native;
    if (spec.endsWith('/context/AppContext')) return { useApp: () => ({ colors: load(path.join(base, 'customer-app/src/theme/index.ts'))[dark ? 'darkColors' : 'lightColors'], user: { name: 'عميل', phone: '777' }, navigateTo() {} }) };
    if (spec.endsWith('/context/DriverContext')) return { useDriver: () => driver };
    if (spec === '../api') return { api, walletApi };
    if (spec.endsWith('/transferReceipt')) return { chooseTransferReceipt: async () => ({ uri: 'file:///receipt.png', fileName: 'receipt.png', mimeType: 'image/png' }) };
    if (/\/(Header|AdminHeader|DriverHeader|AppIcon|ReceiptImage|KeyboardAwareScrollView)$/.test(spec)) return { [spec.split('/').pop()]: spec.split('/').pop() };
    const root = path.resolve(path.dirname(file), spec); const found = [root + '.ts', root + '.tsx', path.join(root, 'index.ts')].find(fs.existsSync);
    if (!found) throw new Error('Unexpected dependency ' + spec); return load(found);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(req, module, module.exports); return module.exports;
}
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
const press = async (view, label) => { const button = view.root.findAllByType('TouchableOpacity').find(n => text(n).includes(label)); assert.ok(button, label); await act(async () => { button.props.onPress(); }); };
const input = async (view, label, value) => { await act(async () => view.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value)); };
(async () => {
  const { WalletScreen } = load(path.join(base, 'customer-app/src/screens/WalletScreen.tsx'));
  let screen; await act(async () => { screen = create(React.createElement(WalletScreen)); });
  assert.match(text(screen.toJSON()), /الحوالة غير مستلمة/);
  await press(screen, 'شحن الرصيد'); await input(screen, 'مبلغ الشحن بالريال', '٢٠٠'); await input(screen, 'رقم الحوالة / العملية', 'REF');
  await press(screen, 'إرفاق صورة التحويل'); await act(async () => screen.root.findByType('Switch').props.onValueChange(true));
  await press(screen, 'إرسال طلب الشحن'); assert.match(text(screen.toJSON()), /فشل الاتصال/);
  assert.equal(calls[0][1].amount, '200');
  failUpload = false; const oldKey = calls[0][1].idempotencyKey;
  await press(screen, 'إرسال طلب الشحن'); await press(screen, 'جارٍ إرسال');
  assert.equal(calls.filter(c => c[0] === 'topup').length, 2, 'double tap cannot issue a third request');
  assert.equal(calls[1][1].idempotencyKey, oldKey, 'retry preserves its idempotency key');
  assert.doesNotMatch(text(screen.toJSON()), /أُرسل طلب الشحن/);
  await act(async () => finishUpload()); assert.match(text(screen.toJSON()), /أُرسل طلب الشحن/);
  dark = true; await act(async () => screen.update(React.createElement(WalletScreen))); await act(async () => screen.unmount());
  const { CustomerWalletScreen } = load(path.join(base, 'admin-app/src/screens/CustomerWalletScreen.tsx'));
  await act(async () => { screen = create(React.createElement(CustomerWalletScreen)); });
  await press(screen, 'مراجعة بيانات'); await press(screen, 'رفض مع السبب'); await press(screen, 'تأكيد العملية');
  assert.equal(calls.filter(c => c[0].includes('/reject')).length, 0, 'empty rejection reason never reaches the API');
  await input(screen, 'سبب الرفض الذي سيظهر للعميل', 'لم يصل التحويل'); await press(screen, 'تأكيد العملية');
  assert.equal(calls.find(c => c[0].includes('/reject'))[1].reason, 'لم يصل التحويل');
  await act(async () => screen.unmount());
  const { ActiveTaskRouteScreen } = load(path.join(base, 'courier-app/src/screens/ActiveTaskRouteScreen.tsx'));
  await act(async () => { screen = create(React.createElement(ActiveTaskRouteScreen)); });
  await input(screen, 'النقد المستلم من العميل', '٢٠٠٠'); await act(async () => screen.root.findByType('Switch').props.onValueChange(true));
  await press(screen, 'إتمام التسليم وتحصيل'); assert.match(text(screen.toJSON()), /تأكيد التسليم/);
  assert.equal(calls.filter(c => c[0] === 'delivery').length, 0, 'collection preview precedes the financial write');
  await press(screen, 'تأكيد التحصيل والتسليم'); assert.deepEqual(calls.find(c => c[0] === 'delivery')[1], [false, 2000, true]);
  await act(async () => screen.unmount());
  console.log('PASS wallet screens: Arabic amounts, pending approval, rejection reasons, upload retry identity, duplicate-tap protection, dark theme and 1800/2000 collection confirmation');
})().catch(e => { console.error(e); process.exitCode = 1; });
