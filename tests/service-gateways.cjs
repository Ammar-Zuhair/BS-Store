const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'admin-app/node_modules/typescript'));
const calls = [];
let enabled;
const nativeFetch = async (url, options) => { calls.push({ url, options }); return new Response('{}'); };
const runtime = {
  enableTelemetry: options => { enabled = options; }, markBoot() {}, setControlCensusEnabled() {}, setRouteListEnabled() {},
  useFidSampler: () => ({ panHandlers: {} }), useLongSessionDiagnostic() {}, useBoosthis() {},
};
const react = { useEffect: effect => effect(), createElement() {}, useState() {}, useRef() {} };
const native = { Platform: { OS: 'android', select: values => values.android ?? values.default }, InteractionManager: { runAfterInteractions: fn => { fn(); return { cancel() {} }; } }, StyleSheet: { create: x => x }, View: () => null };
function load(filename, extra = '') {
  const source = fs.readFileSync(filename, 'utf8') + extra;
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const requireMock = name => {
    if (name === 'react') return react;
    if (name === 'react-native') return native;
    if (name === '@react-native-async-storage/async-storage') return { getItem: async () => '00000000-0000-4000-8000-000000000001', setItem: async () => {} };
    if (name === 'expo-crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000001' };
    if (name === 'expo/fetch') return { fetch: nativeFetch };
    if (name === '@workspace/boosthis-runtime-rn') return runtime;
    if (name === '../api/client') return { API_BASE_URL: 'https://api.test/api' };
    if (name === '../context/AppContext' || name === './AppIcon') return {};
    if (name === 'react-native-webview' || name === 'expo-location' || name === 'expo-image-manipulator') return {};
    if (name === '../theme') return { colors: {}, typography: { fontFamily: {} }, borderRadius: {}, shadows: {}, spacing: {} };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(requireMock, module, module.exports);
  return module.exports;
}
(async () => {
  for (const app of ['admin', 'customer', 'courier']) {
    enabled = null;
    load(path.join(root, `${app}-app/src/monitoring/BoosthisRuntime.tsx`)).BoosthisRuntime({ children: null });
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(enabled);
    assert.equal(enabled.inviteKey, 'bsstore_backend_gateway');
    await enabled.fetchOptions.fetchImpl('https://www.boosthis.com/api/installs/consent', {
      method: 'POST', body: '{"installId":"test"}', headers: { Authorization: 'Bearer bsstore_backend_gateway', 'X-Boosthis-Install-Token': 'per-install-test' },
    });
    const consent = calls.at(-1);
    assert.equal(consent.url, `https://api.test/api/telemetry/${app}/consent`);
    assert.equal(consent.options.headers.get('Authorization'), null);
    assert.equal(consent.options.headers.get('X-Boosthis-Install-Token'), 'per-install-test');
    assert.equal(consent.options.headers.get('ngrok-skip-browser-warning'), 'true');
    await enabled.fetchOptions.fetchImpl('https://www.boosthis.com/api/samples', { headers: { Authorization: 'Bearer per-install-test' } });
    assert.equal(calls.at(-1).url, 'https://www.boosthis.com/api/samples');
  }
  for (const [app, builder] of [['admin', 'buildLeafletHtml'], ['customer', 'buildCustomerLeafletHtml']]) {
    const file = path.join(root, `${app}-app/src/components/LocationPickerModal.tsx`);
    const { __build } = load(file, `\nexport const __build = ${builder};`);
    const html = __build(15.3, 44.2, 'https://api.test/api/maps/tiles/{z}/{x}/{y}.png');
    assert.ok(html.includes('https://api.test/api/maps/tiles/{z}/{x}/{y}.png'));
    assert.ok(html.includes('ngrok-skip-browser-warning'));
    assert.ok(!html.includes('?key='));
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length);
    for (const script of scripts) new Function(script[1]);
  }
  console.log('PASS all three mobile telemetry gateways, per-install credentials, map tile gateways and embedded map script syntax');
})().catch(error => { console.error(error); process.exitCode = 1; });
