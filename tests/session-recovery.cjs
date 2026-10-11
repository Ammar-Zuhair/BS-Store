const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
let cache = new Map(), storage = new Map();
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
 for (const [app, accessKey, refreshKey] of [
  ['customer-app', '@bs_customer_token', '@bs_customer_refresh_token'],
  ['admin-app', '@bs_admin_access_token', '@bs_admin_refresh_token'],
  ['courier-app', '@bs_courier_access_token', '@bs_courier_refresh_token'],
 ]) {
  cache = new Map(); storage = new Map();
  const { api } = load(path.join(root, app, 'src/api/client.ts'));
  if (api.initSession) await api.initSession(); else await api.initToken();
  await api.setToken('expired-test'); await api.setRefreshToken('valid-refresh');
  global.fetch = async url => Response.json({ message: 'temporarily unavailable' }, { status: url.endsWith('/auth/refresh') ? 503 : 401 });
  await assert.rejects(api.get('/private'), error => error.status === 503);
  assert.equal(api.getToken(), 'expired-test', app + ' keeps access token during transient refresh failure');
  assert.equal(storage.get(refreshKey), 'valid-refresh', app + ' keeps refresh token during transient failure');
  global.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(api.get('/private'), error => error.status === 401);
  assert.equal(api.getToken(), null, app + ' clears definitively rejected session');
  await api.setToken('old-access'); await api.setRefreshToken('test-refresh');
  let refreshes = 0, reads = 0, releaseSlow;
  global.fetch = async (url, options) => {
   if (url.endsWith('/auth/refresh')) { refreshes++; return Response.json({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }); }
   reads++;
   if (options.headers.Authorization === 'Bearer new-access') return Response.json({ data: { ok: true } });
   if (url.endsWith('/slow')) await new Promise(resolve => { releaseSlow = resolve; });
   return Response.json({}, { status: 401 });
  };
  const slow = api.get('/slow');
  await api.get('/fast');
  releaseSlow(); await slow;
  assert.equal(refreshes, 1, app + ' late unauthorized response uses the renewed token without rotating again');
  let releaseGet; reads = 0;
  global.fetch = async () => { reads++; await new Promise(resolve => { releaseGet = resolve; }); return Response.json({ data: { ok: true } }); };
  const first = api.get('/shared'), second = api.get('/shared');
  await new Promise(resolve => setTimeout(resolve, 0)); releaseGet();
  await Promise.all([first, second]); assert.equal(reads, 1, app + ' shares overlapping reads');
  const { fetchWithTimeout } = load(path.join(root, app, 'src/utils/requests.ts'));
  global.fetch = async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  await assert.rejects(fetchWithTimeout('https://example.test', {}, 20), /aborted/);
  console.log('PASS ' + app + ': transient session recovery, invalid-session removal, concurrent refresh race, duplicate reads and timeout');
 }
}
const deadline = setTimeout(() => { console.error('FAIL session test timed out'); process.exit(1); }, 10000);
main().then(() => clearTimeout(deadline)).catch(error => { clearTimeout(deadline); console.error(error); process.exitCode = 1; });
