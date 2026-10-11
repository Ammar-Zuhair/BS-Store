// Exercise the real login screen with mocked native UI and API boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const React = require(path.join(root, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(root, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
let calls = [], alerts = [], finishLogin, loginError, attempts = 0;
const animation = () => ({ start() {}, stop() {} });
const native = {
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'ActivityIndicator', 'KeyboardAvoidingView', 'ScrollView', 'Image', 'Modal'].map(name => [name, name])),
  Platform: { OS: 'android' }, StyleSheet: { create: value => value },
  Alert: { alert: (...args) => alerts.push(args) },
  Animated: { View: 'AnimatedView', Value: class { interpolate() { return 0; } }, timing: animation, sequence: animation, parallel: animation, loop: animation },
  Easing: { inOut: value => value, sin() {}, ease() {} },
};
const app = {
  colors: new Proxy({}, { get: () => '#123456' }), registeredUser: null,
  login: async (phone, password) => { attempts++; if (loginError) throw loginError; calls.push([phone, password]); return new Promise(resolve => { finishLogin = resolve; }); },
  register: async () => {},
};
const file = path.join(root, 'customer-app/src/screens/AuthScreen.tsx');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;
function mockRequire(spec) {
  if (spec === 'react') return React;
  if (spec === 'react/jsx-runtime') return require(path.join(root, 'customer-app/node_modules/react/jsx-runtime'));
  if (spec === 'react-native') return native;
  if (spec === '../theme') return { typography: { fontFamily: {}, fontSize: {} }, spacing: {}, borderRadius: {} };
  if (spec === '../context/AppContext') return { useApp: () => app };
  if (spec === '../api') return {
    governorateApi: { list: async () => [] },
    authApi: { checkPhone: () => { throw new Error('Account lookup must never run'); } },
  };
  if (spec.endsWith('.png')) return { uri: 'test-logo' };
  const name = path.basename(spec);
  if (['LocationPickerModal', 'TermsModal', 'AppIcon', 'KeyboardAwareScrollView'].includes(name)) return { [name]: name };
  throw new Error(`Unexpected dependency: ${spec}`);
}
const loaded = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(mockRequire, loaded, loaded.exports);
const { AuthScreen } = loaded.exports;
function input(tree, label) { return tree.root.findAllByType('TextInput').find(node => node.props.accessibilityLabel === label); }
function button(tree, label) { return tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label); }
function text(tree) { return tree.root.findAllByType('Text').map(node => node.props.children).flat().join(' '); }
async function main() {
  let tree;
  await act(async () => { tree = create(React.createElement(AuthScreen)); });
  assert.ok(input(tree, 'رقم الهاتف المحمول') && input(tree, 'كلمة المرور'), 'Both credentials are shown from the start');
  assert.equal(input(tree, 'كلمة المرور').props.secureTextEntry, true);
  await act(async () => { await button(tree, 'تسجيل الدخول').props.onPress(); });
  assert.equal(calls.length, 0, 'Empty credentials never submit');
  await act(async () => { input(tree, 'رقم الهاتف المحمول').props.onChangeText(' 770000001 '); });
  await act(async () => { await button(tree, 'تسجيل الدخول').props.onPress(); });
  assert.equal(calls.length, 0, 'Phone alone does not submit or reveal account existence');
  await act(async () => { input(tree, 'كلمة المرور').props.onChangeText(' Password123 '); });
  let pending;
  await act(async () => {
    pending = button(tree, 'تسجيل الدخول').props.onPress();
    await button(tree, 'تسجيل الدخول').props.onPress();
  });
  assert.deepEqual(calls, [['770000001', ' Password123 ']], 'Rapid duplicate taps send one request, with both credentials and unchanged password');
  assert.equal(button(tree, 'تسجيل الدخول').props.disabled, true);
  await act(async () => { finishLogin(); await pending; });
  assert.equal(button(tree, 'تسجيل الدخول').props.disabled, false);
  loginError = Object.assign(new Error('limited'), { status: 429, retryAfterSeconds: 60 });
  await act(async () => { await button(tree, 'تسجيل الدخول').props.onPress(); });
  assert.equal(button(tree, 'تسجيل الدخول').props.disabled, true);
  assert.match(text(tree), /60.*ثانية/);
  const before = attempts;
  await act(async () => { await input(tree, 'كلمة المرور').props.onSubmitEditing(); });
  assert.equal(attempts, before, 'Keyboard submission cannot bypass cooldown');
  const originalNow = Date.now;
  try {
    const future = originalNow() + 61000;
    Date.now = () => future;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); });
    assert.equal(button(tree, 'تسجيل الدخول').props.disabled, false, 'Login is enabled when the cooldown expires');
  } finally { Date.now = originalNow; }
  await act(async () => { tree.unmount(); });
  // Registration remains an explicit choice and inherits the entered phone.
  await act(async () => { tree = create(React.createElement(AuthScreen)); });
  await act(async () => { input(tree, 'رقم الهاتف المحمول').props.onChangeText('770000001'); });
  const register = tree.root.findAllByType('TouchableOpacity').find(node => node.findAllByType('Text').some(t => t.props.children === 'إنشاء حساب جديد'));
  await act(async () => { register.props.onPress(); await new Promise(resolve => setTimeout(resolve, 150)); });
  assert.match(text(tree), /إنشاء حساب عميل جديد/);
  assert.ok(tree.root.findAllByType('TextInput').some(node => node.props.value === '770000001'));
  await act(async () => { tree.unmount(); });
  console.log('PASS customer login: combined credentials, no lookup, required fields, duplicate-tap protection, password preservation, lockout feedback and registration');
}
let completed = false;
process.on('beforeExit', () => { if (!completed) { console.error('Login test did not finish'); process.exitCode = 1; } });
main().then(() => { completed = true; }).catch(error => { completed = true; console.error(error); process.exitCode = 1; });
