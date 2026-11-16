const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const root = path.resolve(__dirname, '../src');
const cache = new Map(), timers = new Map(), writes = [], copies = [], mediaModules = [];
let time = 0, timerId = 0, reduceMotion = false, assetFails = false;
let requests = [];
let render;
const native = {
  StyleSheet: { create: s => s, absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } },
  Platform: { OS: 'android' }, StatusBar: 'StatusBar',
  AppState: { addEventListener: () => ({ remove() {} }) }, Linking: { openURL: async () => {} }, Alert: { alert() {} },
  AccessibilityInfo: { isReduceMotionEnabled: async () => reduceMotion, addEventListener: () => ({ remove() {} }) },
  ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'ActivityIndicator', 'Image'].map(name => [name, name])),
};
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const req = name => {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name === 'react-native-webview') return { WebView: 'WebView' };
    if (name === 'expo-constants') return { expoConfig: { version: '1.0.2' } };
    if (name === 'expo-application') return { nativeBuildVersion: '8' };
    if (name === 'expo-asset') return { Asset: { fromModule: source => ({ downloadAsync: async () => { mediaModules.push(source); if (assetFails) throw Error('missing asset'); return { localUri: 'file:///bundled/intro.mp4', hash: String(source) }; } }) } };
    if (name === 'expo-file-system/legacy') return { cacheDirectory: 'file:///cache/', makeDirectoryAsync: async () => {}, getInfoAsync: async () => ({ exists: false }), copyAsync: async data => copies.push(data), writeAsStringAsync: async (uri, html) => writes.push({ uri, html }) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 16 }) };
    if (name.endsWith('/api')) return { api: { get: url => new Promise(resolve => requests.push({ url, resolve })) } };
    if (name.endsWith('/AppIcon')) return { AppIcon: 'AppIcon' };
    if (/\.(mp4|jpg)$/.test(name)) return name.includes('dark.mp4') ? 21 : name.includes('light.mp4') ? 20 : name.includes('dark-poster') ? 31 : 30;
    const base = path.resolve(path.dirname(file), name);
    return load([base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(fs.existsSync));
  };
  vm.runInThisContext(`(function(require,module,exports,setTimeout,clearTimeout,setInterval,clearInterval){${compiled}\n})`, { filename: file })(req, module, module.exports,
    (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: time + ms }); return id; }, id => timers.delete(id), () => ++timerId, () => {});
  return module.exports;
}
function advance(ms) { time += ms; for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); } }
const text = () => render.root.findAllByType('Text').map(node => node.children.join('')).join(' ');
async function main() {
 const { SystemGate } = load(path.join(root, 'system/SystemGate.tsx'));
 const { lightColors, darkColors } = load(path.join(root, 'theme/index.ts'));
 const { canApplyUpdate } = load(path.join(root, 'system/updateSafety.ts'));
 const gate = props => React.createElement(SystemGate, { appType: 'customer', palette: lightColors, ...props }, React.createElement('Text', null, 'APP_READY'));
 const resolveChecks = (required = false) => requests.splice(0).forEach(r => r.resolve(r.url.includes('app-version') ? { updateRequired: required, latestVersion: '2.0' } : { maintenance: false }));
 await act(async () => { render = create(gate({ startupReady: false, themeReady: false })); });
 assert.equal(requests.length, 2, 'version and maintenance checks start while fonts/session/theme are pending');
 assert.equal(render.root.findAllByType('WebView').length, 0, 'wait for persisted theme before choosing movie');
 assert.equal(render.root.findAllByType('ActivityIndicator').length, 0, 'no startup spinner');
 assert.ok(!text().includes('التحقق من حالة النظام'), 'checks have no customer-facing message');
 assert.equal(canApplyUpdate(), false, 'intro holds silent updates');
 await act(async () => render.update(gate({ startupReady: false, themeReady: true, isDarkMode: true, palette: darkColors })));
 assert.equal(mediaModules.at(-1), 21, 'persisted dark appearance selects dark movie');
 assert.equal(render.root.findByType('WebView').props.source.uri, 'file:///cache/customer-intro/intro-21.html');
 assert.ok(writes.at(-1).html.includes('intro-21.mp4') && writes.at(-1).html.includes('muted playsinline'));
 assert.equal(copies.at(-1).from, 'file:///bundled/intro.mp4');
 const before = mediaModules.length;
 await act(async () => resolveChecks());
 assert.ok(!text().includes('APP_READY'), 'ready API cannot skip unfinished video or pending session');
 assert.equal(mediaModules.length, before, 'unrelated readiness changes do not replay movie');
 await act(async () => render.root.findByType('WebView').props.onMessage({ nativeEvent: { data: 'finished' } }));
 assert.ok(!text().includes('APP_READY'), 'finished video still waits for session/fonts');
 await act(async () => render.update(gate({ startupReady: true, themeReady: true, isDarkMode: true, palette: darkColors })));
 assert.ok(text().includes('APP_READY'));
 assert.equal(canApplyUpdate(), true, 'finished startup releases update hold');
 await act(async () => render.unmount());
 await act(async () => { render = create(gate({})); });
 assert.equal(mediaModules.at(-1), 20, 'light appearance selects light movie');
 await act(async () => render.root.findByType('WebView').props.onMessage({ nativeEvent: { data: 'finished' } }));
 assert.ok(!text().includes('APP_READY'), 'video never bypasses unresolved version gate');
 await act(async () => resolveChecks(true));
 assert.ok(text().includes('يلزم تحديث التطبيق') && !text().includes('APP_READY'), 'required native update remains enforced after intro');
 await act(async () => render.unmount());
 assetFails = true;
 await act(async () => { render = create(gate({})); });
 await act(async () => { resolveChecks(); });
 assert.ok(text().includes('APP_READY'), 'missing media falls back without blocking startup');
 await act(async () => render.unmount()); assetFails = false;
 reduceMotion = true;
 const downloads = mediaModules.length;
 await act(async () => { render = create(gate({})); });
 await act(async () => { resolveChecks(); });
 assert.equal(mediaModules.length, downloads, 'reduced-motion setting skips autoplay');
 assert.ok(text().includes('APP_READY'));
 await act(async () => render.unmount()); reduceMotion = false;
 await act(async () => { render = create(gate({})); });
 await act(async () => { advance(12001); });
 assert.ok(text().includes('APP_READY'), 'offline checks and stalled player have bounded fallbacks');
 await act(async () => render.unmount());
 await act(async () => { render = create(gate({})); });
 await act(async () => { resolveChecks(); });
 await act(async () => render.root.findByType('Pressable').props.onPress());
 assert.ok(text().includes('APP_READY'), 'skip intro keeps application usable');
 await act(async () => render.unmount());
 const { SearchTypeChooser } = load(path.join(root, 'search/SearchTypeChooser.tsx'));
 for (const colors of [lightColors, darkColors]) {
  let choice;
  await act(async () => { render = create(React.createElement(SearchTypeChooser, { value: null, colors, onChange: v => { choice = v; } })); });
  assert.ok(text().includes('ابدأ باختيار نوع البحث') && text().includes('إظهار حقل البحث'), 'choice-first guidance visible before typing');
  const cards = render.root.findAllByType('Pressable');
  assert.equal(cards.length, 2);
  assert.equal(cards[0].props.accessibilityRole, 'tab');
  await act(async () => cards[0].props.onPress()); assert.equal(choice, 'store');
  await act(async () => cards[1].props.onPress()); assert.equal(choice, 'product');
  await act(async () => render.update(React.createElement(SearchTypeChooser, { value: choice, colors, onChange() {} })));
  assert.equal(render.root.findAllByType('Pressable')[1].props.accessibilityState.selected, true);
  await act(async () => render.unmount());
 }
 console.log('PASS startup: parallel checks, light/dark media, local WebView, gates, failures, watchdog, reduced motion, skip, OTA hold and search choice guidance');
}
main().catch(async error => { console.error(error); process.exitCode = 1; if (render) await act(async () => render.unmount()); });
