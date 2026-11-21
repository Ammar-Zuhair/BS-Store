// node tests/receipts/run.cjs (requires .NET 10 and customer-app dependencies)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const nativeFetch = global.fetch;
const platform = { OS: 'android' };
const files = new Map();
const tokens = new Map([['@bs_customer_token', 'test-customer']]);
const cache = new Map();
const originalFileReader = global.FileReader;
global.FileReader = class {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload?.(); }).catch(() => this.onerror?.());
  }
};
let requests = [];
let failRead = false;
let server;
const fileSystem = {
  EncodingType: { Base64: 'base64' },
  getInfoAsync: async uri => files.has(uri) ? { exists: true, isDirectory: false, size: files.get(uri).length } : { exists: false },
  readAsStringAsync: async uri => { if (failRead) throw new Error('Read failed'); return files.get(uri).toString('base64'); },
};
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = specifier => {
    if (specifier === 'expo-crypto') return { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => require('node:crypto').createHash('sha256').update(value).digest('hex') };
    if (specifier === 'expo-file-system/legacy') return fileSystem;
    if (specifier === 'expo-image-picker') return {};
    if (specifier === 'react-native') return { Platform: platform };
    if (specifier === 'expo-constants') return { expoConfig: { extra: { apiBaseUrl: 'https://implosive-exchange-compacter.ngrok-free.dev/api' } } };
    if (specifier === './tokenStorage') return { tokenStorage: {
      get: async key => tokens.get(key) || null, set: async (key, value) => tokens.set(key, value),
      remove: async keys => keys.forEach(key => tokens.delete(key)),
    } };
    const target = path.resolve(path.dirname(file), specifier) + '.ts';
    if (fs.existsSync(target)) return load(target);
    throw new Error(`Unexpected dependency ${specifier}`);
  };
  vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(localRequire, module, module.exports, false);
  return module.exports;
}
async function main() {
  const dotnet = fs.existsSync(path.join(root, '.tools/dotnet/dotnet')) ? path.join(root, '.tools/dotnet/dotnet') : 'dotnet';
  const testEnvironment = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'DOTNET_CLI_HOME', 'NUGET_PACKAGES', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
    .filter(name => process.env[name]).map(name => [name, process.env[name]]));
  const child = spawn(dotnet, ['run', '--project', path.join(__dirname, 'ReceiptFlow.csproj'), '--no-launch-profile'], {
    cwd: root, env: { ...testEnvironment, ...(path.isAbsolute(dotnet) ? { DOTNET_ROOT: path.dirname(dotnet) } : {}), DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => {
      output += chunk;
      for (const line of output.split('\n').slice(0, -1)) {
        if (line.startsWith('{"url":')) { resolve(JSON.parse(line)); return; }
      }
    });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('exit', code => reject(new Error(`Receipt test host exited ${code}: ${output}`)));
  });
  const timeout = setTimeout(() => { child.kill('SIGTERM'); }, 180000);
  try {
    server = await ready;
    console.log(output.split("\n").find(line => line.startsWith("PASS address edit/delete")));
    console.log(output.split("\n").find(line => line.startsWith("PASS account deletion")));
    console.log(output.split("\n").find(line => line.startsWith("PASS login security")));
    console.log(output.split("\n").find(line => line.startsWith("PASS R2 upload")));
    console.log(output.split("\n").find(line => line.startsWith("PASS receipt size/quality")));
    const jpeg = Buffer.from(server.receiptBase64, 'base64');
    const uri = 'file:///receipt-test.jpg'; files.set(uri, jpeg);
    global.fetch = async (url, options) => {
      requests.push({ url, options });
      if (String(url).endsWith('/auth/refresh')) {
        const admin = JSON.parse(options.body).refreshToken === 'admin-refresh';
        return Response.json({ data: { accessToken: admin ? 'test-admin' : 'test-customer', refreshToken: admin ? 'admin-refresh' : 'test-refresh' } });
      }
      const parsed = new URL(String(url));
      const target = parsed.hostname.endsWith('.r2.cloudflarestorage.com')
        ? `${server.url}/test/r2-object/${parsed.pathname.replace(/^\/test-bucket\//, '')}${parsed.search}`
        : String(url).replace('https://implosive-exchange-compacter.ngrok-free.dev', server.url);
      return nativeFetch(target, options);
    };
    const { paymentsApi, api } = load(path.join(root, 'customer-app/src/api/index.ts'));
    const { prepareReceiptUpload } = load(path.join(root, 'customer-app/src/utils/receiptUpload.ts'));
    const call = async (endpoint, token = 'test-admin', body) => {
      const response = await nativeFetch(`${server.url}/api${endpoint}`, {
        method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(response.status, 200, await response.clone().text());
      return (await response.json()).data;
    };

    assert.equal((await call('/admin/payments')).length, 0, 'unsent receipts are not listed for review');
    const upload = await paymentsApi.uploadReceipt(server.orderId, uri, 'إيصال.jpg', 'image/jpeg');
    assert.equal(upload.newStatus, 1);
    assert.equal(requests[0].options.headers.Authorization, 'Bearer test-customer');
    assert.equal(requests[0].options.headers['ngrok-skip-browser-warning'], 'true');
    assert.match(requests[0].options.headers['Content-Type'], /^multipart\/form-data; boundary=/, 'JSON default must not overwrite multipart');
    assert.ok(requests[0].options.body instanceof ArrayBuffer, 'native upload sends bytes instead of a URI object');
    const info = await paymentsApi.getTransferInfo(server.orderId);
    assert.equal(info.status, 1); assert.equal(info.receiptUrl, upload.receiptUrl);
    const adminPayments = await call('/admin/payments/pending');
    assert.equal(adminPayments.length, 1); assert.equal(adminPayments[0].receipts[0].id, upload.receiptId);
    for (const token of ['test-customer', 'test-admin']) {
      let receipt = await nativeFetch(`${server.url}${upload.receiptUrl}`, { headers: { Authorization: `Bearer ${token}` }, redirect: 'manual' });
      assert.equal(receipt.status, 302);
      const direct = new URL(receipt.headers.get('location'));
      receipt = await nativeFetch(`${server.url}/test/r2-object/${direct.pathname.replace(/^\/test-bucket\//, '')}${direct.search}`);
      assert.equal(receipt.status, 200); assert.equal(receipt.headers.get('content-type'), 'image/jpeg');
      assert.ok(Buffer.from(await receipt.arrayBuffer()).equals(jpeg), 'suitable compressed JPEG bytes survive upload and protected download');
    }
    assert.equal((await nativeFetch(`${server.url}${upload.receiptUrl}`)).status, 401);
    assert.equal((await nativeFetch(`${server.url}${upload.receiptUrl}`, { headers: { Authorization: 'Bearer test-other' } })).status, 404);

    tokens.set('@bs_admin_access_token', 'expired-admin'); tokens.set('@bs_admin_refresh_token', 'admin-refresh');
    const adminClient = load(path.join(root, 'admin-app/src/api/client.ts')).api;
    const receiptUrl = `https://implosive-exchange-compacter.ngrok-free.dev${upload.receiptUrl}`;
    const receiptData = await adminClient.getReceiptImage(receiptUrl);
    assert.deepEqual(Buffer.from(receiptData.split(',')[1], 'base64'), jpeg, 'admin renderer gets the image through authenticated fetch');
    const imageRequests = requests.filter(item => item.url.endsWith(`${upload.receiptUrl}/download-link`));
    assert.equal(imageRequests.at(-2).options.headers.Authorization, 'Bearer expired-admin');
    assert.equal(imageRequests.at(-1).options.headers.Authorization, 'Bearer test-admin');
    {
      const directRequests = requests.filter(item => new URL(item.url).hostname.endsWith('.r2.cloudflarestorage.com'));
      assert.equal(directRequests.length, 1);
      assert.equal(directRequests[0].options.headers.Authorization, undefined);
      assert.equal(directRequests[0].options.headers['ngrok-skip-browser-warning'], undefined);
      assert.equal(directRequests[0].options.credentials, 'omit');
      assert.equal((await nativeFetch(`${server.url}${upload.receiptUrl}/download-link`)).status, 401);
      assert.equal((await nativeFetch(`${server.url}${upload.receiptUrl}/download-link`, { headers: { Authorization: 'Bearer test-other' } })).status, 404);
    }
    const beforeUnsafeImage = requests.length;
    await assert.rejects(adminClient.getReceiptImage('https://untrusted.example/image.jpg'), /غير صالح/);
    assert.equal(requests.length, beforeUnsafeImage, 'receipt tokens must not be sent to a foreign host');

    const { uploadCatalogueImage } = load(path.join(root, 'admin-app/src/services/imageStorage.ts'));
    const source = Buffer.from(await (await nativeFetch(`${server.url}/test/catalogue-source`)).arrayBuffer());
    for (const folder of ['stores', 'products', 'offers', 'payment-methods']) {
      const savedUrl = await uploadCatalogueImage({ uri: 'file:///catalogue.png', base64: source.toString('base64'), mimeType: 'image/png' }, folder);
      assert.match(savedUrl, new RegExp(`/api/images/${folder}/[a-f0-9]{32}\\.jpg$`));
      {
        const redirect = await nativeFetch(savedUrl.replace('https://implosive-exchange-compacter.ngrok-free.dev', server.url), { redirect: 'manual' });
        assert.equal(redirect.status, 302);
        assert.match(redirect.headers.get('cache-control'), /max-age=300/);
        const direct = new URL(redirect.headers.get('location'));
        const image = await nativeFetch(`${server.url}/test/r2-object/${direct.pathname.replace(/^\/test-bucket\//, '')}${direct.search}`);
        assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/jpeg');
        assert.ok((await image.arrayBuffer()).byteLength < source.length / 2);
      }
    }
    {
      assert.equal((await nativeFetch(`${server.url}/api/images/receipts/${'a'.repeat(32)}.jpg`)).status, 404);
      assert.equal((await nativeFetch(`${server.url}/api/images/private/${'a'.repeat(32)}.jpg`)).status, 404);
    }
    assert.equal((await (await nativeFetch(`${server.url}/test/r2-read-count`)).json()).getCount, 0,
      'backend display controllers sign URLs without fetching object bodies');
    const stored = await (await nativeFetch(`${server.url}/test/catalogue-upload`)).json();
    assert.equal(stored.uploadCount, 4); assert.equal(stored.lastMime, 'image/jpeg');
    assert.ok(stored.size < source.length / 10, 'payment logos are reduced before storage rather than retaining the full original');
    assert.ok(stored.lastWidth <= 256 && stored.lastHeight <= 256, 'payment logos are stored as thumbnails with a maximum side of 256px');
    const invalidImage = await nativeFetch(`${server.url}/api/admin/images?folder=products`, { method: 'POST', headers: { Authorization: 'Bearer test-admin', 'Content-Type': 'application/octet-stream' }, body: 'not an image' });
    assert.equal(invalidImage.status, 400);
    assert.equal((await nativeFetch(`${server.url}/api/admin/images`, { method: 'POST', headers: { Authorization: 'Bearer test-customer' }, body: source })).status, 403);
    console.log(`PASS authenticated receipt display/refresh, same-origin protection, stores/products/offers/payment-methods compression (${source.length} to ${stored.size} bytes), invalid images and upload authorization`);

    await call(`/admin/payments/${server.paymentId}/reject`, 'test-admin', { reason: 'Test rejection' });
    const rejected = await paymentsApi.getTransferInfo(server.orderId);
    assert.equal(rejected.status, 3); assert.equal(rejected.rejectionReason, 'Test rejection');
    await api.setToken('expired'); await api.setRefreshToken('test-refresh');
    await paymentsApi.uploadReceipt(server.orderId, uri);
    assert.equal((await paymentsApi.getTransferInfo(server.orderId)).status, 1, 'retry after rejection restores pending review');
    const uploads = requests.filter(item => item.url.endsWith('/upload-receipt'));
    assert.equal(uploads.at(-2).options.headers.Authorization, 'Bearer expired');
    assert.equal(uploads.at(-1).options.headers.Authorization, 'Bearer test-customer');
    assert.strictEqual(uploads.at(-2).options.body, uploads.at(-1).options.body, 'session refresh preserves all multipart bytes');
    await call(`/admin/payments/${server.paymentId}/approve`, 'test-admin', { amountReceived: 2500 });
    assert.equal((await paymentsApi.getTransferInfo(server.orderId)).status, 2);
    const reviewed = await call('/admin/payments');
    assert.equal(reviewed[0].status, 'VERIFIED'); assert.equal(reviewed[0].amountReceived, 2500); assert.equal(reviewed[0].receipts.length, 2);
    await assert.rejects(paymentsApi.uploadReceipt(server.orderId, uri), /حالة الطلب الحالية/, 'approved payment cannot be changed');

    const rawUpload = async (bytes, name, mime, status = 200) => {
      const body = new FormData(); body.append('file', new Blob([bytes], { type: mime }), name);
      const response = await nativeFetch(`${server.url}/api/payments/${server.compressionOrderId}/upload-receipt`, {
        method: 'POST', headers: { Authorization: 'Bearer test-customer' }, body,
      });
      assert.equal(response.status, status, await response.clone().text());
      return (await response.json()).data;
    };
    const compressed = await rawUpload(source, 'original.jpg', 'image/jpeg');
    const metadata = await (await nativeFetch(`${server.url}/test/receipt-record/${compressed.receiptId}`)).json();
    assert.match(metadata.storageKey, /^r2:private\/receipts\/[a-f0-9]{32}\.jpg$/);
    assert.equal(metadata.mimeType, 'image/jpeg'); assert.equal(metadata.width, 2200);
    assert.ok(metadata.fileSize < source.length / 2, 'older clients get conservative receipt compression on the server');
    const compressedUrl = await adminClient.getReceiptImage(`https://implosive-exchange-compacter.ngrok-free.dev${compressed.receiptUrl}`);
    assert.equal(Buffer.from(compressedUrl.split(',')[1], 'base64').length, metadata.fileSize, 'database records optimized file size');
    const originalPng = Buffer.from(await (await nativeFetch(`${server.url}/test/receipt-png-source`)).arrayBuffer());
    files.set('file:///digital-receipt.png', originalPng);
    const pngReceipt = await paymentsApi.uploadReceipt(server.compressionOrderId, 'file:///digital-receipt.png', 'digital.png', 'image/png');
    const pngMetadata = await (await nativeFetch(`${server.url}/test/receipt-record/${pngReceipt.receiptId}`)).json();
    assert.match(pngMetadata.storageKey, /^r2:private\/receipts\/[a-f0-9]{32}\.png$/);
    assert.equal(pngMetadata.mimeType, 'image/png'); assert.equal(pngMetadata.width, 360); assert.equal(pngMetadata.height, 720);
    assert.ok(pngMetadata.fileSize < originalPng.length, 'digital PNG receipt is compressed losslessly before private storage');
    const displayedPng = await adminClient.getReceiptImage(`https://implosive-exchange-compacter.ngrok-free.dev${pngReceipt.receiptUrl}`);
    assert.match(displayedPng, /^data:image\/png;base64,/);
    assert.equal(Buffer.from(displayedPng.split(',')[1], 'base64').length, pngMetadata.fileSize);
    await rawUpload(Buffer.from([255, 216, 255, 0, 1, 2, 3, 4]), 'corrupt.jpg', 'image/jpeg', 400);
    const pdf = Buffer.from('%PDF-1.4\nTest document: not subject to lossy image encoding\n%%EOF');
    const document = await rawUpload(pdf, 'receipt.pdf', 'application/pdf');
    const documentMetadata = await (await nativeFetch(`${server.url}/test/receipt-record/${document.receiptId}`)).json();
    assert.match(documentMetadata.storageKey, /\.pdf$/); assert.equal(documentMetadata.mimeType, 'application/pdf');
    assert.equal(documentMetadata.fileSize, pdf.length);
    const documentRedirect = await nativeFetch(`${server.url}${document.receiptUrl}`, { headers: { Authorization: 'Bearer test-admin' }, redirect: 'manual' });
    assert.equal(documentRedirect.status, 302);
    const documentLink = new URL(documentRedirect.headers.get('location'));
    const downloadedDocument = await nativeFetch(`${server.url}/test/r2-object/${documentLink.pathname.replace(/^\/test-bucket\//, '')}${documentLink.search}`);
    assert.ok(Buffer.from(await downloadedDocument.arrayBuffer()).equals(pdf), 'PDF bytes are preserved in R2');
    console.log(`PASS R2-only receipt uploads, original receipt compression (${source.length} to ${metadata.fileSize} bytes), stored size/MIME, corrupt JPEG rejection and untouched PDF`);

    const before = requests.length;
    await assert.rejects(paymentsApi.uploadReceipt(server.orderId, 'file:///missing.jpg'), /غير متاح/);
    files.set('file:///large.jpg', Buffer.alloc(5 * 1024 * 1024 + 1));
    await assert.rejects(paymentsApi.uploadReceipt(server.orderId, 'file:///large.jpg'), /5 ميجابايت/);
    files.set('file:///empty.jpg', Buffer.alloc(0));
    await assert.rejects(paymentsApi.uploadReceipt(server.orderId, 'file:///empty.jpg'), /فارغ/);
    failRead = true; await assert.rejects(paymentsApi.uploadReceipt(server.orderId, uri), /تعذر قراءة/); failRead = false;
    await assert.rejects(paymentsApi.uploadReceipt(server.orderId, uri, 'x.gif', 'image/gif'), /غير مسموح/);
    assert.equal(requests.length, before, 'invalid local files fail before contacting the API');

    const dataUpload = await prepareReceiptUpload(`data:image/jpeg;base64,${jpeg.toString('base64')}`, 'receipt.jpg', 'image/jpeg');
    const dataForm = await new Response(dataUpload.body, { headers: { 'Content-Type': dataUpload.contentType } }).formData();
    assert.deepEqual(Buffer.from(await dataForm.get('file').arrayBuffer()), jpeg);
    platform.OS = 'web';
    global.fetch = async () => new Response(jpeg);
    const webUpload = await prepareReceiptUpload('blob:receipt-test', 'receipt.png', 'image/jpeg');
    const webForm = await new Response(webUpload.body, { headers: { 'Content-Type': webUpload.contentType } }).formData();
    assert.equal(webForm.get('file').type, 'image/jpeg'); assert.equal(webForm.get('file').name, 'receipt.jpg');
    assert.deepEqual(Buffer.from(await webForm.get('file').arrayBuffer()), jpeg);
    console.log('PASS receipt bytes, authenticated multipart upload, stored metadata/file, admin receipt access, reject/resubmit/approve, session refresh, upload restrictions, invalid/missing/oversized files, web/data URI encoding');
  } finally {
    clearTimeout(timeout); global.fetch = nativeFetch; global.FileReader = originalFileReader;
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill('SIGTERM'); await exited;
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
