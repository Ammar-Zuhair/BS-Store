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
const timeouts = new Map(); let timerId = 0, shakeAnimations = 0, focus = -1, navigated = false;
let reduceMotion = false;
const animation = (value, options) => ({ start() { value.value = options.toValue; }, stop() {} });
const Animated = {
 Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } stopAnimation() {} interpolate() { return this; } },
 View: 'AnimatedView', timing: animation, spring: animation,
 sequence: animations => ({ start() { shakeAnimations++; animations.forEach(a => a.start()); }, stop() {} }),
};
const advance = ms => { now += ms; for (const [id, timer] of [...timeouts]) if (timer.at <= now) { timeouts.delete(id); timer.fn(); } };

const native = {
  StyleSheet: { create: value => value }, Animated, Keyboard: { dismiss() {} },
  AccessibilityInfo: { isReduceMotionEnabled: async () => reduceMotion, addEventListener: () => ({ remove() {} }) },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'Image', 'Modal', 'ScrollView', 'ActivityIndicator'].map(n => [n, n])),
};
let verifyResponse = async () => {};
const app = { needsProfileCompletion: false, user: null, verifyOtp: async (phone, code, onVerified) => { verifications.push([phone, code]); await verifyResponse(); await onVerified(); navigated = true; },
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
    if (name.endsWith('/AppIcon')) return { AppIcon: 'AppIcon' };
    if (name.endsWith('/TermsModal')) return { TermsModal: 'TermsModal' };
    if (name.endsWith('.png')) return 1;
    const base = path.resolve(path.dirname(file), name);
    return load([base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync));
  };
  vm.runInThisContext(`(function(require,module,exports,setInterval,clearInterval,setTimeout){${code}\n})`, { filename: file })(localRequire, module, module.exports,
    callback => { timers.add(callback); return callback; }, callback => timers.delete(callback), (fn, ms) => { const id = ++timerId; timeouts.set(id, { fn, at: now + ms }); return id; });
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
  await act(async () => { tree = create(React.createElement(AuthScreen), { createNodeMock: node => node.type === 'TextInput' ? { focus() { focus = Number(node.props.testID?.split('-').at(-1)); } } : null }); });
  const input = label => tree.root.findAllByType('TextInput').find(n => n.props.accessibilityLabel === label);
  const button = label => tree.root.findAllByType('TouchableOpacity').find(n => (n.props.accessibilityLabel || text(n)).includes(label));
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
  const boxes = () => tree.root.findAllByType('TextInput').filter(n => n.props.testID?.startsWith('otp-digit-'));
  assert.equal(boxes().length, 6, 'six separate code boxes');
  assert.equal(focus, 0, 'first box focuses automatically');
  assert.equal(button('إعادة إرسال').props.disabled, true, 'resend cooldown enforced');
  verifyResponse = async () => { throw Object.assign(Error('رمز التحقق غير صحيح'), { status: 400 }); };
  for (let i = 0; i < 5; i++) {
    await act(async () => boxes()[i].props.onChangeText(String(i + 1)));
    assert.equal(focus, i + 1, 'focus advances after each digit');
  }
  assert.equal(verifications.length, 0, 'incomplete code never submits');
  await act(async () => boxes()[5].props.onChangeText('6'));
  assert.deepEqual(verifications[0], ['+967771234567', '123456'], 'sixth digit submits automatically');
  assert.equal(navigated, false, 'failure never signals successful login');
  assert.equal(shakeAnimations, 1, 'invalid code causes a subtle shake');
  assert.ok(boxes().every(box => box.props.style[1].borderColor === lightColors.error), 'all six boxes turn red');
  await act(async () => boxes()[5].props.onChangeText(''));
  await act(async () => boxes()[5].props.onKeyPress({ nativeEvent: { key: 'Backspace' } }));
  assert.equal(focus, 4, 'backspace on empty box returns to previous digit');
  assert.equal(boxes()[4].props.value, '');
  assert.ok(boxes().every(box => box.props.style[1].borderColor !== lightColors.error), 'editing clears invalid state');
  let resolveVerification;
  verifyResponse = () => new Promise(resolve => { resolveVerification = resolve; });
  await act(async () => boxes()[0].props.onChangeText('١٢٣٤٥٦'));
  assert.equal(verifications.length, 2, 'Arabic-digit paste submits once');
  assert.deepEqual(verifications[1], ['+967771234567', '123456']);
  assert.ok(boxes().every(box => !box.props.editable), 'inputs disabled while verifying');
  await act(async () => { button('تأكيد الرمز').props.onPress(); });
  assert.equal(verifications.length, 2, 'manual submit cannot duplicate automatic request');
  assert.equal(tree.root.findAllByProps({ testID: 'otp-success' }).length, 0, 'no success before server confirmation');
  await act(async () => resolveVerification());
  assert.equal(tree.root.findAllByProps({ testID: 'otp-success' }).length, 1, 'verified code displays success check');
  assert.ok(boxes().every(box => box.props.style[1].borderColor === lightColors.success));
  assert.equal(navigated, false, 'success acknowledgement appears before navigation');
  await act(async () => advance(750));
  assert.equal(navigated, true, 'navigation follows success acknowledgement');
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
  // Reduced motion keeps error feedback visible without shaking.
  reduceMotion = true; const shakesBefore = shakeAnimations;
  const { OtpCodeInput } = load(path.join(root, 'components/OtpCodeInput.tsx'));
  await act(async () => { tree = create(React.createElement(OtpCodeInput, { colors: darkColors, status: 'idle', disabled: false, onChange() {}, onComplete() {} })); });
  await act(async () => tree.update(React.createElement(OtpCodeInput, { colors: darkColors, status: 'error', disabled: false, onChange() {}, onComplete() {} })));
  assert.equal(shakeAnimations, shakesBefore, 'reduced-motion preference disables shake');
  await act(async () => tree.unmount());
  assert.equal([...storage.keys()].some(k => /code|token/.test(k)), false, 'OTP is never persisted');
  console.log('PASS OTP normalization, unified entry, duplicate taps, six boxes, focus/backspace/paste, automatic verify, duplicate prevention, success timing, invalid feedback, reduced motion, resend, onboarding and both themes');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
