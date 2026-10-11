const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const React = require(path.join(root, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(root, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = new Map(), calls = [];
const native = {}, picker = {}, manipulator = {};
let category = { id: 'category-1', name: 'Before', iconName: 'folder', sortOrder: 1, isActive: false };
let blockReads = false, failSave = false, inFlight = 0, maximumReads = 0;
const blocked = [];
const apiMock = {
 api: { getToken: () => 'test', initSession: async () => null }, authApi: {},
 adminApi: new Proxy({}, { get: (_, name) => async (...args) => {
  calls.push(name);
  if (name === 'updateCategory') {
   if (failSave) throw new Error('Save failed');
   category = { ...category, ...args[1] }; return {};
  }
  if (name === 'createCategory') return { ...category, id: 'new-category', name: args[0].name };
  if (String(name).startsWith('get')) {
   inFlight++; maximumReads = Math.max(maximumReads, inFlight);
   if (blockReads) await new Promise(resolve => blocked.push(resolve));
   else await new Promise(resolve => setTimeout(resolve, 10));
   inFlight--;
  }
  if (name === 'getCategories') return [category];
  if (name === 'getProducts') return { items: [] };
  if (name === 'getDashboard') return {};
  if (name === 'getDriverProfitShare') return { percent: 10 };
  return [];
 } }),
};
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = specifier => {
    if (specifier === 'react-native') return native;
    if (specifier === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
    if (specifier === 'react') return React;
    if (specifier === 'react/jsx-runtime') return require(path.join(root, 'customer-app/node_modules/react/jsx-runtime'));
    if (specifier === '../api') return apiMock;
    if (specifier === '../api/client') return { API_BASE_URL: 'https://example.test/api' };
    if (specifier.endsWith('/notifications')) return {};
    if (specifier.endsWith('/BoosthisRuntime')) return { BoosthisScreenTracker: () => null };
    if (specifier.endsWith('/AdminHeader')) return { AdminHeader: 'AdminHeader' };
    if (specifier === 'expo-file-system/legacy') return {};
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
 let context, tree;
 function Harness() { context = useAdmin(); return null; }
 await act(async () => { tree = create(React.createElement(AdminProvider, null, React.createElement(Harness))); });
 await act(async () => { await Promise.all([context.refreshData(), context.refreshData()]); });
 assert.equal(calls.filter(x => x === 'getCategories').length, 1, 'overlapping full refreshes share one request');
 assert.equal(calls.filter(x => x === 'getOrders').length, 1);
 assert.ok(maximumReads <= 3, 'dashboard has a shared three-request concurrency budget');
 calls.length = 0; blockReads = true;
 await act(async () => { await context.updateCategory('category-1', { name: 'After' }); });
 assert.equal(context.categories[0].name, 'After', 'saved category updates immediately while the refresh is blocked');
 assert.equal(context.categories[0].isActive, false, 'partial edit preserves existing active state');
 assert.deepEqual(calls.sort(), ['getCategories', 'updateCategory'], 'category edit does not reload unrelated dashboard resources');
 assert.equal(context.isLoading, false, 'save does not activate full dashboard loading');
 await act(async () => {
  blockReads = false; blocked.splice(0).forEach(resolve => resolve());
  await new Promise(resolve => setTimeout(resolve, 20));
 });
 failSave = true;
 await act(async () => { await assert.rejects(context.updateCategory('category-1', { name: 'Unsaved' }), /Save failed/); });
 assert.equal(context.categories[0].name, 'After', 'failed save never produces a successful UI update');
 failSave = false; calls.length = 0;
 await act(async () => { await context.addCategory({ name: 'New', icon: 'folder' }); });
 assert.ok(context.categories.some(category => category.id === 'new-category'), 'creation uses the returned server ID immediately');
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); tree.unmount(); });
 console.log('PASS admin refresh: bounded parallel reads, deduplication, saved category immediately visible despite blocked reads, targeted refresh, partial fields preserved, failure stays unsaved');
}
const deadline = setTimeout(() => { console.error('FAIL test timed out'); process.exit(1); }, 10000);
main().then(() => clearTimeout(deadline)).catch(error => { clearTimeout(deadline); console.error(error); process.exitCode = 1; });
