// Exercise the actual cache and API client across component/session/process lifetimes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'admin-app/node_modules/typescript'));
const disk = new Map();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const jwt = id => `test.${Buffer.from(JSON.stringify({ sub: id, userId: id })).toString('base64url')}.signature`;
const userA = jwt('admin-a'), userB = jwt('admin-b');
const tokens = new Map([['@bs_admin_access_token', userA]]);
const requests = [];
let releaseDownload, blockDownload = false, failDownload = false;
const originalFetch = global.fetch;
global.FileReader = class {
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onload(); }
};
global.fetch = async (url, options) => {
  requests.push({ url, options });
  if (url.endsWith('/download-link')) {
    if (options.headers.Authorization === `Bearer ${userB}`) return new Response(JSON.stringify({ message: 'forbidden' }), { status: 403 });
    return Response.json({ data: { url: `https://test.r2.cloudflarestorage.com/private.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&nonce=${requests.length}`, mimeType: 'image/png' } });
  }
  if (blockDownload) { blockDownload = false; await new Promise(resolve => { releaseDownload = resolve; }); }
  if (failDownload) { failDownload = false; return new Response('failure', { status: 503 }); }
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
const files = {
  documentDirectory: 'file:///documents/', EncodingType: { Base64: 'base64' },
  getInfoAsync: async uri => ({ exists: disk.has(uri), isDirectory: disk.get(uri) === 'dir', size: disk.get(uri)?.length || 0 }),
  makeDirectoryAsync: async uri => { disk.set(uri, 'dir'); },
  writeAsStringAsync: async (uri, data) => { disk.set(uri, Buffer.from(data, 'base64')); },
  moveAsync: async ({ from, to }) => { disk.set(to, disk.get(from)); disk.delete(from); },
  deleteAsync: async uri => { for (const key of disk.keys()) if (key === uri || uri.endsWith('/') && key.startsWith(uri)) disk.delete(key); },
};
function fresh() {
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const req = name => {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-file-system/legacy') return files;
      if (name === 'expo-crypto') return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_, value) => crypto.createHash('sha256').update(value).digest('hex') };
      if (name === 'expo-constants') return { expoConfig: { extra: { apiBaseUrl: 'https://implosive-exchange-compacter.ngrok-free.dev/api' } } };
      if (name === './tokenStorage') return { tokenStorage: { get: async key => tokens.get(key) || null, set: async (key, value) => tokens.set(key, value), remove: async keys => keys.forEach(key => tokens.delete(key)) } };
      return load(path.resolve(path.dirname(file), name) + '.ts');
    };
    vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(req, module, module.exports, false);
    return module.exports;
  }
  return { api: load(path.join(root, 'admin-app/src/api/client.ts')).api, cache: load(path.join(root, 'admin-app/src/services/imageCache.ts')) };
}
const receipt = 'https://implosive-exchange-compacter.ngrok-free.dev/api/payments/receipts/receipt-1';
(async () => {
  let { api, cache } = fresh();
  const results = await Promise.all(Array.from({ length: 12 }, () => api.getReceiptImage(receipt)));
  assert.equal(new Set(results).size, 1); assert.match(results[0], /^file:\/\/\/documents\//); assert.deepEqual(disk.get(results[0]), png);
  assert.equal(requests.length, 2, 'concurrent previews share one authorization and one image download');
  await api.getReceiptImage(receipt); assert.equal(requests.length, 2, 'screen reopening does not fetch a fresh signed URL or image');
  ({ api, cache } = fresh()); await api.getReceiptImage(receipt); assert.equal(requests.length, 2, 'cached bytes survive process restart');
  tokens.set('@bs_admin_access_token', userA.replace('.signature', '.refreshed'));
  ({ api, cache } = fresh()); await api.getReceiptImage(receipt); assert.equal(requests.length, 2, 'token renewal preserves the cache for the same account');
  await api.getReceiptImage(receipt, true); assert.equal(requests.length, 4, 'explicit retry renews both link and bytes');
  disk.delete(results[0]); await api.getReceiptImage(receipt); assert.equal(requests.length, 6, 'missing local files are downloaded again');
  const publicUrl = 'https://images.example.test/product-version-1.png';
  await Promise.all(Array.from({ length: 8 }, () => cache.getPublicImage(publicUrl))); assert.equal(requests.length, 7);
  ({ api, cache } = fresh()); await cache.getPublicImage(publicUrl); assert.equal(requests.length, 7, 'catalogue images persist across restart');
  await cache.getPublicImage('https://images.example.test/product-version-2.png'); assert.equal(requests.length, 8, 'a replaced image has a new key');
  await api.setToken(userB);
  await assert.rejects(api.getReceiptImage(receipt), /صلاحية|forbidden/); assert.equal(requests.length, 9, 'another account cannot use a cached private receipt');
  assert.ok(!disk.has(results[0]), 'switching accounts erases private local images');
  await api.clearSession(); await assert.rejects(api.getReceiptImage(receipt), /سجّل الدخول/);
  const beforePublic = requests.length; await cache.getPublicImage(publicUrl); assert.equal(requests.length, beforePublic, 'logout keeps only public catalogue images');
  await api.setToken(userA);
  blockDownload = true;
  const inflight = api.getReceiptImage(receipt);
  for (let i = 0; !releaseDownload && i < 50; i++) await new Promise(resolve => setImmediate(resolve));
  assert.ok(releaseDownload); await api.clearSession(); releaseDownload();
  await assert.rejects(inflight, /جلسة/);
  assert.ok([...disk.keys()].every(key => !key.includes('/private/')), 'logout prevents a late receipt download from repopulating disk');
  await api.setToken(userA); failDownload = true;
  await assert.rejects(api.getReceiptImage(receipt), /صلاحية|تحميل/);
  const recovered = await api.getReceiptImage(receipt); assert.deepEqual(disk.get(recovered), png, 'failed downloads do not poison subsequent retries');
  for (const request of requests.filter(r => !r.url.endsWith('/download-link'))) {
    assert.equal(request.options.headers.Authorization, undefined); assert.equal(request.options.credentials, 'omit');
  }
  assert.ok([...disk.keys()].every(key => !key.includes(userA) && !key.includes('admin-a')), 'local filenames contain no session tokens or account identifiers');
  console.log('PASS admin persistent image cache: one download under concurrency, screen and process reuse, token refresh, public image versions, account isolation, logout erasure/races, failed download recovery and explicit retry');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
