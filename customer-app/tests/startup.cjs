const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const root = path.resolve(__dirname, '../src');
const cache = new Map(), timers = new Map();
let time = 0, timerId = 0;
let requests = [];
let render;
const native = {
  StyleSheet: { create: s => s, absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } },
  Platform: { OS: 'android' }, StatusBar: 'StatusBar',
  AppState: { addEventListener: () => ({ remove() {} }) }, Linking: { openURL: async () => {} }, Alert: { alert() {} },
  ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'ActivityIndicator', 'Image'].map(name => [name, name])),
};
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const req = name => {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name === 'expo-constants') return { expoConfig: { version: '1.0.2' } };
    if (name === 'expo-application') return { nativeBuildVersion: '8' };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 16 }) };
    if (name.endsWith('/api')) return { api: { get: url => new Promise(resolve => requests.push({ url, resolve })) } };
    if (name.endsWith('.png')) return 1;
    if (name.endsWith('/AppIcon')) return { AppIcon: 'AppIcon' };
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
 const gate = props => React.createElement(SystemGate, { appType: 'customer', palette: lightColors, ...props }, React.createElement('Text', null, 'APP_READY'));
 const resolveChecks = (required = false, maintenance = false) => requests.splice(0).forEach(r => r.resolve(r.url.includes('app-version') ? { updateRequired: required, latestVersion: '2.0' } : { maintenance }));
 await act(async () => { render = create(gate({ startupReady: false, themeReady: false })); });
 assert.equal(requests.length, 2, 'checks start in parallel before session/theme/fonts are ready');
 assert.equal(render.root.findAllByType('Image').length, 1, 'only the static logo is displayed');
 assert.equal(render.root.findAllByType('WebView').length, 0);
 assert.equal(render.root.findAllByType('ActivityIndicator').length, 0, 'no startup spinner');
 assert.ok(!text().includes('التحقق من حالة النظام'), 'checks remain invisible');
 await act(async () => resolveChecks());
 assert.ok(!text().includes('APP_READY'), 'wait for theme/session/fonts even after checks finish');
 await act(async () => render.update(gate({ startupReady: true, themeReady: false })));
 assert.ok(!text().includes('APP_READY'), 'persisted theme is required');
 await act(async () => render.update(gate({ startupReady: true, themeReady: true })));
 assert.ok(text().includes('APP_READY'), 'proceed immediately without a video timer');
 await act(async () => render.unmount());
 for (const [dark, colors] of [[false, lightColors], [true, darkColors]]) {
  await act(async () => { render = create(gate({ isDarkMode: dark, palette: colors })); });
  assert.equal(render.root.findByProps({ testID: 'startup-logo' }).props.style[1].backgroundColor, colors.background);
  assert.equal(render.root.findByType('StatusBar').props.barStyle, dark ? 'light-content' : 'dark-content');
  await act(async () => resolveChecks(true));
  assert.ok(text().includes('يلزم تحديث التطبيق') && !text().includes('APP_READY'), 'required native update remains enforced');
  await act(async () => render.unmount());
 }
 await act(async () => { render = create(gate({})); });
 await act(async () => resolveChecks(false, true));
 assert.ok(!text().includes('APP_READY'), 'maintenance remains enforced');
 await act(async () => render.unmount());
 await act(async () => { render = create(gate({})); });
 await act(async () => { advance(5001); });
 assert.ok(text().includes('APP_READY'), 'offline checks retain their bounded timeout');
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
 console.log('PASS startup: static logo, parallel invisible checks, readiness, both themes, required update/maintenance, offline timeout and search guidance');
}
main().catch(async error => { console.error(error); process.exitCode = 1; if (render) await act(async () => render.unmount()); });
