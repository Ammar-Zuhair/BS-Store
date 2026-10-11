const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const cache = new Map(), requests = [], storage = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireLocal = spec => {
    if (spec === 'expo-constants') return { expoConfig: { extra: { apiBaseUrl: 'https://implosive-exchange-compacter.ngrok-free.dev/api' } } };
    if (spec.endsWith('/tokenStorage')) return { tokenStorage: {
      get: async key => storage.get(key) || null, set: async (key, value) => storage.set(key, value),
      remove: async keys => keys.forEach(key => storage.delete(key)),
    } };
    if (spec.endsWith('/receiptUpload')) return { prepareReceiptUpload() {} };
    const resolved = path.resolve(path.dirname(file), spec) + '.ts';
    if (fs.existsSync(resolved)) return load(resolved);
    throw new Error(`Unexpected dependency ${spec}`);
  };
  vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(requireLocal, module, module.exports, false);
  return module.exports;
}
async function main() {
  const { authApi } = load(path.join(root, 'customer-app/src/api/index.ts'));
  assert.equal(authApi.checkPhone, undefined);
  global.fetch = async (url, options) => { requests.push({ url, options }); return Response.json({ data: { accessToken: 'test-access', refreshToken: 'test-refresh', user: { id: 'test', role: 'Customer' } } }); };
  await authApi.login('770000001', ' Password123 ');
  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.endsWith('/api/auth/login'));
  assert.deepEqual(JSON.parse(requests[0].options.body), { phone: '770000001', password: ' Password123 ', role: 'Customer' });
  assert.equal(storage.get('@bs_customer_token'), 'test-access');
  for (const [header, json, expected] of [['45', 60, 45], [null, 32, 32], [null, null, 60]]) {
    global.fetch = async () => Response.json({ message: 'محاولات كثيرة', retryAfterSeconds: json }, { status: 429, headers: header ? { 'Retry-After': header } : {} });
    await assert.rejects(authApi.login('770000001', 'wrong'), error => error.status === 429 && error.retryAfterSeconds === expected && error.message === 'محاولات كثيرة');
  }
  console.log('PASS login API: one credentials request, secure token persistence, Retry-After header, JSON CORS fallback and default cooldown');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
