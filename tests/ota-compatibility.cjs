const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
function evaluate(file, requireLocal) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(requireLocal,module,module.exports);
  return module.exports;
}
const {formatOrderDate} = evaluate(path.join(root,'customer-app/src/utils/orderDate.ts'), () => {throw Error('Unexpected dependency');});
assert.match(formatOrderDate('2026-10-06T21:30:00Z'), /٠٧.*١٠.*٢٠٢٦.*·.*١٢:٣٠/);
assert.equal(formatOrderDate(null),'');assert.equal(formatOrderDate('invalid-date'),'');
(async()=>{
 for(const app of ['customer-app','admin-app']){
  const core=evaluate(path.join(root,app,'src/api/tokenStorageCore.ts'),()=>{throw Error('Unexpected dependency');});
  for(const available of [false,true]){
   const legacyValues=new Map([['@bs_token','legacy-session']]), secureValues=new Map();
   let wrapperImports=0;
   const legacy={getItem:async k=>legacyValues.get(k)??null,setItem:async(k,v)=>legacyValues.set(k,v),removeItem:async k=>legacyValues.delete(k),multiRemove:async keys=>keys.forEach(k=>legacyValues.delete(k))};
   const secure={getItemAsync:async k=>secureValues.get(k)??null,setItemAsync:async(k,v)=>secureValues.set(k,v),deleteItemAsync:async k=>secureValues.delete(k)};
   const {tokenStorage}=evaluate(path.join(root,app,'src/api/tokenStorage.ts'),spec=>{
    if(spec==='@react-native-async-storage/async-storage')return legacy;
    if(spec==='react-native')return {Platform:{OS:'android'}};
    if(spec==='expo-modules-core')return {requireOptionalNativeModule:()=>available?{}:null};
    if(spec==='expo-secure-store'){wrapperImports++;if(!available)throw Error('Missing native SecureStore');return secure;}
    if(spec==='./tokenStorageCore')return core;
    throw Error('Unexpected dependency '+spec);
   });
   assert.equal(await tokenStorage.get('@bs_token'),'legacy-session');
   await tokenStorage.set('@bs_token','new-session');assert.equal(await tokenStorage.get('@bs_token'),'new-session');
   assert.equal(wrapperImports,available?1:0);
   if(available){assert.equal(legacyValues.size,0);assert.equal(secureValues.get('bs.token'),'new-session');}
   else assert.equal(legacyValues.get('@bs_token'),'new-session');
   await tokenStorage.remove(['@bs_token']);assert.equal(await tokenStorage.get('@bs_token'),null);
  }
  const configure=require(path.join(root,app,'app.config.js'));
  const config=require(path.join(root,app,'app.json')).expo;
  const saved=process.env.BSSTORE_OTA_RUNTIME_VERSION;
  const savedBuild=process.env.EAS_BUILD;
  try{
   delete process.env.BSSTORE_OTA_RUNTIME_VERSION;delete process.env.EAS_BUILD;
   assert.deepEqual(configure({config}).runtimeVersion,{policy:'appVersion'});
   process.env.BSSTORE_OTA_RUNTIME_VERSION='1.0.0';assert.equal(configure({config}).runtimeVersion,'1.0.0');
   process.env.BSSTORE_OTA_RUNTIME_VERSION='1.0.1';assert.equal(configure({config}).runtimeVersion,'1.0.1');
   process.env.BSSTORE_OTA_RUNTIME_VERSION='invalid';assert.throws(()=>configure({config}),/OTA/);
   process.env.BSSTORE_OTA_RUNTIME_VERSION='1.0.0';process.env.EAS_BUILD='true';assert.throws(()=>configure({config}),/OTA/);
  }finally{
   if(saved===undefined)delete process.env.BSSTORE_OTA_RUNTIME_VERSION;else process.env.BSSTORE_OTA_RUNTIME_VERSION=saved;
   if(savedBuild===undefined)delete process.env.EAS_BUILD;else process.env.EAS_BUILD=savedBuild;
  }
 }
 console.log('PASS complete order date/time, midnight rollover, missing dates, older-binary token storage, encrypted migration, OTA runtime targeting and native-build protection');
})().catch(e=>{console.error(e);process.exitCode=1;});
