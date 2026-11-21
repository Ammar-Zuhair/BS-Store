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
let appOverrides = {};
let methodList = null;
const method = { id: 'method', name: 'كريمي', accountName: 'شركة التجربة', accountNumber: 'TEST', instructions: 'تعليمات', code: 'CUSTOM_TEST', updatedAt: '2026-11-21T00:00:00Z', accountType: 'حساب مشترك', accountDetails: 'نقطة مشتريات تجريبية', imageUrl: 'https://example.test/method.png' };
const summary = { balance: 800, transactions: [{ id: 'entry', amount: 200, balanceAfter: 800, description: 'باقي نقدي', createdAt: '2026-11-20T10:00:00Z' }], topUps: [{ id: 'old', amount: 20, methodName: 'كريمي', status: 'Rejected', rejectionReason: 'الحوالة غير مستلمة', transferReference: 'OLD', createdAt: '2026-11-20T10:00:00Z' }], hasMore: false };
const topUp = { id: 'pending', customerName: 'عميل', customerPhone: '777', amount: 200, methodName: 'كريمي', senderName: 'المرسل', senderPhone: '777', transferReference: 'REF', status: 'Pending', receiptUrl: '/api/wallet/receipts/pending', createdAt: '2026-11-20T10:00:00Z' };
const walletApi = { balance: async () => ({ balance: 800 }), get: async () => summary, methods: async () => methodList || [method], topUp: async (_image, fields) => {
  calls.push(['topup', fields]); if (failUpload) throw new Error('فشل الاتصال'); await new Promise(resolve => { finishUpload = resolve; }); return { id: 'new', status: 'Pending' };
} };
const api = { get: async endpoint => endpoint.includes('/topups') ? [topUp] : endpoint.includes('/methods') ? [method] : { transactions: [], customers: [], changesToday: [], deniedAttempts: [], mismatches: 0, changeLimit: 1000, dailyLimit: 5000 },
  post: async (endpoint, body) => { calls.push([endpoint, body]); }, put: async (endpoint, body) => { calls.push([endpoint, body]); } };
const native = { Platform: { OS: 'android' }, StyleSheet: { create: v => v, flatten: v => Array.isArray(v) ? Object.assign({}, ...v) : v }, Alert: { alert: () => {} },
  AppState: { addEventListener: () => ({ remove() {} }) },
  ...Object.fromEntries(['Text', 'View', 'TextInput', 'Image', 'TouchableOpacity', 'ActivityIndicator', 'Switch', 'ScrollView', 'KeyboardAvoidingView'].map(name => [name, name])),
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
    if (spec.endsWith('/context/AppContext')) return { useApp: () => ({ colors: load(path.join(base, 'customer-app/src/theme/index.ts'))[dark ? 'darkColors' : 'lightColors'], user: { name: 'عميل', phone: '777' }, navigateTo() {}, ...appOverrides }) };
    if (spec.endsWith('/context/DriverContext')) return { useDriver: () => driver };
    if (spec.endsWith('/services/imageStorage')) return { pickImageFromGallery: async () => ({ uri: 'file:///method.png' }), stageCatalogueImage: image => image.uri, saveCatalogueForm: async (payload, _folder, save) => save(payload) };
    if (spec === '../api') return { api, walletApi, governorateApi: { mine: async () => ({ governorateId: 'governorate' }) } };
    if (spec.endsWith('/transferReceipt')) return { chooseTransferReceipt: async () => ({ uri: 'file:///receipt.png', fileName: 'receipt.png', mimeType: 'image/png' }) };
    if (/\/(Header|AdminHeader|DriverHeader|AppIcon|ReceiptImage|KeyboardAwareScrollView|LocationPickerModal)$/.test(spec)) return { [spec.split('/').pop()]: spec.split('/').pop() };
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
  appOverrides = { selectedAddress: { label: 'المنزل', city: 'صنعاء', district: 'تجربة', street: 'تجربة' }, cartTotal: 1800, cartSubtotal: 1700, cartDeliveryFee: 100, cartDiscount: 0, cartFarthestStoreDistanceKm: 1,
    hasDeliveryQuote: true, cartSubOrders: [], stores: [], isAuthenticated: true, placeOrder: async (...args) => calls.push(['checkout', args]) };
  const { CheckoutScreen } = load(path.join(base, 'customer-app/src/screens/CheckoutScreen.tsx'));
  await act(async () => { screen = create(React.createElement(CheckoutScreen)); });
  await press(screen, 'تحويل بنكي / إشعار سداد'); await press(screen, 'كريمي');
  assert.match(text(screen.toJSON()), /حساب مشترك/); assert.match(text(screen.toJSON()), /نقطة مشتريات تجريبية/);
  assert.doesNotMatch(text(screen.toJSON()), /1888356|783053937/);
  await input(screen, 'اسم مرسل التحويل', 'مرسل الطلب'); await input(screen, 'هاتف مرسل التحويل', '777000002'); await input(screen, 'رقم الحوالة أو العملية', 'ORDER-TRANSFER');
  await press(screen, 'إرفاق صورة إيصال التحويل'); await press(screen, 'تأكيد الطلب');
  const checkout = calls.find(call => call[0] === 'checkout'); assert.ok(checkout, 'checkout reaches the context');
  assert.equal(checkout[1][1].transferMethodId, method.id); assert.equal(checkout[1][1].transferMethodUpdatedAt, method.updatedAt); assert.equal(checkout[1][1].transferReference, 'ORDER-TRANSFER'); assert.equal(checkout[1][1].transferSenderName, 'مرسل الطلب'); assert.equal(checkout[1][1].receiptUri, 'file:///receipt.png');
  methodList = []; await press(screen, 'تحديث طرق الدفع'); assert.match(text(screen.toJSON()), /لا توجد طرق دفع مفعلة/);
  await press(screen, 'تأكيد الطلب'); assert.equal(calls.filter(call => call[0] === 'checkout').length, 1, 'empty catalogue blocks another transfer checkout');
  await act(async () => screen.unmount()); appOverrides = {}; methodList = null;
  const { CustomerWalletScreen } = load(path.join(base, 'admin-app/src/screens/CustomerWalletScreen.tsx'));
  await act(async () => { screen = create(React.createElement(CustomerWalletScreen)); });
  await press(screen, 'مراجعة بيانات'); await press(screen, 'رفض مع السبب'); await press(screen, 'تأكيد العملية');
  assert.equal(calls.filter(c => c[0].includes('/reject')).length, 0, 'empty rejection reason never reaches the API');
  await input(screen, 'سبب الرفض الذي سيظهر للعميل', 'لم يصل التحويل'); await press(screen, 'تأكيد العملية');
  assert.equal(calls.find(c => c[0].includes('/reject'))[1].reason, 'لم يصل التحويل');
  await act(async () => screen.unmount());
  await act(async () => { screen = create(React.createElement(CustomerWalletScreen, { methodsOnly: true })); });
  assert.match(text(screen.toJSON()), /تسديد الطلب إلكترونياً/);
  await press(screen, 'إضافة طريقة دفع'); await input(screen, 'اسم الطريقة', 'جيب'); await input(screen, 'اسم المستفيد', 'شركة التجربة');
  await input(screen, 'نوع الحساب / وصف آخر', 'حساب مشترك'); await input(screen, 'تفاصيل إضافية للحساب', 'نقطة مشتريات'); await input(screen, 'رقم الحساب / المحفظة', '123');
  await press(screen, 'اختيار صورة الطريقة'); await press(screen, 'حفظ الطريقة');
  const savedMethod = calls.find(call => call[0] === '/admin/wallet/methods');
  assert.equal(savedMethod[1].imageUrl, 'file:///method.png'); assert.equal(savedMethod[1].accountType, 'حساب مشترك'); assert.equal(savedMethod[1].accountDetails, 'نقطة مشتريات');
  await act(async () => screen.unmount());
  const { paymentLabel } = load(path.join(base, 'courier-app/src/utils/paymentSummary.ts'));
  assert.equal(paymentLabel({ ...driver.activeTask, walletPaidAmount: 1800, amountToCollect: 0 }), 'مدفوع من المحفظة');
  assert.equal(paymentLabel({ ...driver.activeTask, walletPaidAmount: 800, amountToCollect: 1000 }), 'المحفظة + المتبقي نقداً');
  assert.match(paymentLabel({ ...driver.activeTask, paymentMethod: 'MANUAL_TRANSFER', transferMethodName: 'جيب' }), /دفع إلكتروني · جيب/);
  assert.equal(paymentLabel(driver.activeTask), 'نقداً عند الاستلام');
  const { ActiveTaskRouteScreen } = load(path.join(base, 'courier-app/src/screens/ActiveTaskRouteScreen.tsx'));
  await act(async () => { screen = create(React.createElement(ActiveTaskRouteScreen)); });
  await input(screen, 'النقد المستلم من العميل', '٢٠٠٠'); await act(async () => screen.root.findByType('Switch').props.onValueChange(true));
  await press(screen, 'إتمام التسليم وتحصيل'); assert.match(text(screen.toJSON()), /تأكيد التسليم/);
  assert.equal(calls.filter(c => c[0] === 'delivery').length, 0, 'collection preview precedes the financial write');
  await press(screen, 'تأكيد التحصيل والتسليم'); assert.deepEqual(calls.find(c => c[0] === 'delivery')[1], [false, 2000, true]);
  await act(async () => screen.unmount());
  console.log('PASS shared payment methods, checkout snapshots, empty catalogue, courier payment labels and wallet screens: Arabic amounts, pending approval, rejection reasons, upload retry identity, duplicate-tap protection, dark theme and 1800/2000 collection confirmation');
})().catch(e => { console.error(e); process.exitCode = 1; });
