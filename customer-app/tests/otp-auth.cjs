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
const storage = new Map();
const requests = [];
const verifications = [];
const saves = [];
let now = Date.now();
const RealDate = Date;
global.Date = class extends RealDate { static now() { return now; } };
const timers = new Set();
const native = {
  StyleSheet: { create: value => value },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'Image', 'Modal', 'ScrollView', 'ActivityIndicator'].map(n => [n, n])),
};
const app = { needsProfileCompletion: false, user: null, verifyOtp: async (...args) => verifications.push(args),
  completeProfile: async (...args) => saves.push(args), logout: async () => {} };
let sendResponse = async phone => ({ phone, expiresIn: 300, resendAfter: 60 });
const authApi = { requestOtp: async phone => { requests.push(phone); return sendResponse(phone); } };
const governorateApi = { list: async () => [{ id: 'gov-1', name: 'صنعاء' }] };
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = name => {
    if (name === 'react-native') return native;
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === '@react-native-async-storage/async-storage') return { getItem: async k => storage.get(k), setItem: async (k, v) => storage.set(k, v) };
    if (name === 'expo-crypto') return { randomUUID: () => 'test-device-uuid-123456' };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 16 }) };
    if (name.endsWith('/context/AppContext')) return { useApp: () => app };
    if (name === '../api') return { authApi, governorateApi };
    if (name.endsWith('/KeyboardAwareScrollView')) return { KeyboardAwareScrollView: 'ScrollView' };
    if (name.endsWith('/LocationPickerModal')) return { LocationPickerModal: 'LocationPicker' };
    if (name.endsWith('/TermsModal')) return { TermsModal: 'TermsModal' };
    if (name.endsWith('.png')) return 1;
    const base = path.resolve(path.dirname(file), name);
    return load([base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync));
  };
  vm.runInThisContext(`(function(require,module,exports,setInterval,clearInterval,setTimeout){${code}\n})`, { filename: file })(localRequire, module, module.exports,
    callback => { timers.add(callback); return callback; }, callback => timers.delete(callback), () => 0);
  return module.exports;
}
const text = node => (node.children || []).map(c => typeof c === 'string' ? c : text(c)).join('');
async function main() {
  const utils = load(path.join(root, 'utils/otp.ts'));
  for (const n of ['771234567', '0771234567', '967771234567', '+967771234567', '00967771234567', '٧٧١٢٣٤٥٦٧']) assert.equal(utils.normalizeYemenPhone(n), '+967771234567');
  for (const n of ['', '123', '+966771234567', '7712345678', 'abc']) assert.equal(utils.normalizeYemenPhone(n), null);
  assert.equal(await utils.getOtpDeviceId(), await utils.getOtpDeviceId());
  const { lightColors, darkColors } = load(path.join(root, 'theme/index.ts'));
  const { AuthScreen } = load(path.join(root, 'screens/AuthScreen.tsx'));
  app.colors = lightColors;
  let tree;
  await act(async () => { tree = create(React.createElement(AuthScreen)); });
  const input = label => tree.root.findAllByType('TextInput').find(n => n.props.accessibilityLabel === label);
  const button = label => tree.root.findAllByType('TouchableOpacity').find(n => text(n).includes(label));
  assert.equal(tree.root.findAllByType('TextInput').length, 1, 'unified phone-only entry');
  await act(async () => { await button('متابعة').props.onPress(); });
  assert.equal(requests.length, 0, 'invalid phone stays local');
  await act(async () => { input('رقم الهاتف').props.onChangeText('0771234567'); });
  let resolveSend;
  sendResponse = phone => new Promise(resolve => { resolveSend = () => resolve({ phone, expiresIn: 300, resendAfter: 60 }); });
  await act(async () => { button('متابعة').props.onPress(); button('متابعة').props.onPress(); });
  assert.equal(requests.length, 1, 'duplicate taps send only once');
  await act(async () => { resolveSend(); });
  assert.equal(requests[0], '+967771234567');
  assert.ok(input('رمز التحقق المكون من ستة أرقام'));
  assert.equal(button('إعادة إرسال').props.disabled, true, 'resend cooldown enforced');
  await act(async () => { input('رمز التحقق المكون من ستة أرقام').props.onChangeText('١٢٣٤٥٦'); });
  await act(async () => { button('تأكيد الرمز').props.onPress(); });
  assert.deepEqual(verifications[0], ['+967771234567', '123456']);
  assert.equal(input('رمز التحقق المكون من ستة أرقام').props.value, '', 'successful code cleared from memory');
  now += 61000;
  await act(async () => { for (const timer of timers) timer(); });
  assert.equal(button('إعادة إرسال').props.disabled, false);
  sendResponse = async () => { throw new Error('تعذر الاتصال بالإنترنت'); };
  await act(async () => { button('إعادة إرسال').props.onPress(); });
  assert.ok(tree.root.findAllByType('Text').some(n => text(n).includes('تعذر الاتصال بالإنترنت')), 'network failure displayed');
  await act(async () => { button('تعديل رقم الهاتف').props.onPress(); });
  assert.ok(input('رقم الهاتف'));
  for (const palette of [lightColors, darkColors]) {
    app.colors = palette; app.needsProfileCompletion = true;
    await act(async () => { tree.update(React.createElement(AuthScreen)); });
    assert.ok(input('الاسم الكامل'));
    assert.equal(tree.root.findAllByType('TextInput').some(n => n.props.secureTextEntry), false);
  }
  await act(async () => tree.unmount());
  assert.equal([...storage.keys()].some(k => /code|token/.test(k)), false, 'OTP is never persisted');
  console.log('PASS OTP normalization, unified entry, duplicate taps, verify, resend, edit, network errors, onboarding and both themes');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
