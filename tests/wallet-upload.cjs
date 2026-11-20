const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const moduleObject = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'customer-app/src/utils/receiptUpload.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(name => {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === 'expo-file-system/legacy') return {};
  throw new Error(name);
}, moduleObject, moduleObject.exports);
(async () => {
  const bytes = Buffer.from('receipt bytes');
  const fields = { senderName: 'بلال سعيد', senderPhone: '٧٧٧٠٠٠٠٠٠', transferReference: 'كر-123', amount: '200', methodId: 'test', methodUpdatedAt: '2026-11-20T10:00:00Z', idempotencyKey: 'stable-attempt' };
  const upload = await moduleObject.exports.prepareReceiptUpload(`data:image/png;base64,${bytes.toString('base64')}`, 'receipt.png', 'image/png', fields);
  const request = new Request('http://example.test/wallet/topups', { method: 'POST', headers: { 'Content-Type': upload.contentType }, body: upload.body });
  const parsed = await request.formData();
  for (const [name, value] of Object.entries(fields)) assert.equal(parsed.get(name), value, name);
  assert.deepEqual(Buffer.from(await parsed.get('file').arrayBuffer()), bytes);
  assert.equal(parsed.get('file').type, 'image/png');
  console.log('PASS wallet multipart upload preserves Arabic sender fields, reference, timestamp, retry key and exact receipt bytes');
})().catch(error => { console.error(error); process.exitCode = 1; });
