const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const React = require(path.join(root, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(root, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = new Map(); let counter = 0;
const definition = { groups: [
 { id: 'color', name: 'اللون', values: [{ id: 'black', name: 'أسود', imageUrl: 'https://example.test/black.jpg' }, { id: 'white', name: 'أبيض' }] },
 { id: 'size', name: 'المقاس', values: [{ id: 'm', name: 'M' }, { id: 'l', name: 'L' }] },
], variants: [
 { id: 'black-m', valueIds: ['black','m'], sellingPrice: 150, isActive: true },
 { id: 'white-m', valueIds: ['white','m'], sellingPrice: 100, isActive: true },
 { id: 'black-l', valueIds: ['black','l'], sellingPrice: 140, isActive: true },
 { id: 'white-l', valueIds: ['white','l'], sellingPrice: 100, isActive: false },
] };
const storageDefinition = { groups: [{ id: 'storage', name: 'السعة', values: [{ id: '128', name: '128 GB' }, { id: '256', name: '256 GB' }] }], variants: [
 { id: 'storage-128', valueIds: ['128'], sellingPrice: 100, isActive: true }, { id: 'storage-256', valueIds: ['256'], sellingPrice: 150, isActive: true },
] };
const product = { id: 'shirt', name: 'شميز', storeId: 'store', storeName: 'متجر', categoryId: 'cat', description: '', imageUrl: 'https://example.test/main.jpg', sellingPrice: 100, hasOptions: true, sourceType: 'EXTERNAL_STORE', inStock: true };
const pieces = [{ id: 'phone', name: 'هاتف', price: 100, hasOptions: true }, { id: 'accessory', name: 'ملحق', price: 300 }];
const deal = { id: 'bundle', title: 'باقة هاتف', storeId: 'store', storeName: 'متجر', categoryId: 'cat', imageUrl: product.imageUrl, originalPrice: 400, offerPrice: 300,
 products: pieces, dealType: 'BUNDLE', dealKind: 'BUNDLE', isActive: true, isPublic: true, expiresAt: '2099-01-01T00:00:00Z' };
const api = { api: { get: async () => ({ isEnabled: false, serverTime: new Date().toISOString() }), initToken: async () => null, getToken: () => null, setSessionExpiredHandler() {} },
 authApi: {}, cartApi: {}, addressApi: {}, paymentsApi: {}, ordersApi: {}, catalogApi: {
 getProducts: async () => ({ items: [product] }), getCategories: async () => [], getStores: async () => [{ id: 'store', name: 'متجر', is24Hours: true }],
 getDeals: async () => [deal], getProduct: async () => ({ ...product, options: definition }), getPiece: async () => ({ options: storageDefinition }),
 } };
const native = {
 ...Object.fromEntries(['View','Text','TextInput','TouchableOpacity','ScrollView','Modal','ActivityIndicator','Image','Switch'].map(name => [name,name])),
 StyleSheet: { create: value => value }, Platform: { OS: 'android' }, Alert: { alert() {} },
 AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
 FlatList: ({ data, renderItem }) => React.createElement('View', null, data.map((item,index) => React.createElement(React.Fragment, { key: item.id }, renderItem({ item,index })))),
};
function load(file) {
 if (cache.has(file)) return cache.get(file).exports;
 const module = { exports: {} }; cache.set(file,module);
 const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
 const local = spec => {
  if (spec === 'react' || spec === 'react/jsx-runtime') return require(path.join(root, 'customer-app/node_modules',spec));
  if (spec === 'react-native') return native;
    if (spec === 'react-native-safe-area-context') return { SafeAreaView: 'View', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
  if (spec === 'expo-crypto') return { randomUUID: () => `generated-${++counter}` };
  if (spec === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, multiRemove: async () => {} };
  if (spec.endsWith('/api')) return api;
  if (spec.endsWith('/notifications')) return {};
  if (spec.endsWith('/BoosthisRuntime')) return { BoosthisScreenTracker: () => null };
  const name = path.basename(spec);
  if (['CachedImage','AppIcon','ImagePickerModal'].includes(name)) return { [name]: name };
  const base = path.resolve(path.dirname(file),spec), target = [base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(fs.existsSync);
  if (!target) throw new Error(spec); return load(target);
 };
 vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}
})`, { filename:file })(local,module,module.exports,false);
 return module.exports;
}
async function main() {
 const { AppProvider, useApp } = load(path.join(root,'customer-app/src/context/AppContext.tsx'));
 const { ProductDetailsModal } = load(path.join(root,'customer-app/src/components/ProductDetailsModal.tsx'));
 const { BundleOptionsModal } = load(path.join(root,'customer-app/src/components/BundleOptionsModal.tsx'));
 const model = load(path.join(root,'customer-app/src/options/model.ts'));
 const { createReadLimiter } = load(path.join(root,'customer-app/src/utils/requests.ts'));
 const limitReads = createReadLimiter(3); let running = 0, maximum = 0;
 const boundedReads = await Promise.allSettled(Array.from({length:12}, (_,i) => limitReads(async () => {
  running++; maximum = Math.max(maximum,running);
  try { await new Promise(resolve => setTimeout(resolve,2)); if (i === 2) throw new Error('read failed'); return i; } finally { running--; }
 })));
 assert.equal(maximum,3); assert.equal(boundedReads.filter(r=>r.status==='fulfilled').length,11,'failed piece reads do not strand queued reads');
 assert.throws(() => model.combinations([{ id:'large',name:'Large',values:Array.from({length:1001},(_,i)=>({id:String(i),name:String(i)})) }]),/1000/);
 assert.equal(model.bundleUnitPrice(pieces,300,[{dealProductId:'phone',unitPrice:150}]),337.5);
 let app,tree;
 function Harness() { app = useApp(); return React.createElement(React.Fragment,null,
  app.productOptionsRequest ? React.createElement(ProductDetailsModal,{product:app.productOptionsRequest,onClose:app.closeProductOptions}) : null,
  app.bundleOptionsRequest ? React.createElement(BundleOptionsModal,{product:app.bundleOptionsRequest,onClose:app.closeBundleOptions}) : null); }
 const find = label => tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityLabel === label);
 const click = async label => act(async () => { await find(label).props.onPress(); });
 try {
  await act(async () => { tree = create(React.createElement(AppProvider,null,React.createElement(Harness))); });
  await act(async () => { await app.refreshCatalog(); await app.addToCart(product,1); });
  assert.equal(app.cart.length,0,'configured product does not enter cart before selection');
  assert.equal(find('إضافة شميز إلى السلة').props.disabled,true);
  await click('اللون: أسود');
  assert.equal(tree.root.findAllByType('CachedImage')[0].props.source.uri,'https://example.test/black.jpg','color updates product photo before the configuration is complete');
  await click('المقاس: M'); assert.equal(find('إضافة شميز إلى السلة').props.disabled,false);
  await click('إضافة شميز إلى السلة'); assert.equal(app.cart[0].variantId,'black-m'); assert.equal(app.cartSubtotal,150);
  await act(async () => { await app.addToCart(product,1); });
  await click('اللون: أبيض'); await click('المقاس: M');
  assert.equal(tree.root.findAllByType('CachedImage')[0].props.source.uri,product.imageUrl,'option without photo uses the general image');
  await click('المقاس: L'); assert.equal(find('إضافة شميز إلى السلة').props.disabled,true,'incompatible selection clears other choices instead of picking a substitute');
  await click('اللون: أسود'); await click('المقاس: M'); await click('إضافة شميز إلى السلة');
  assert.equal(app.cart.length,1); assert.equal(app.cart[0].quantity,2);
  await act(async () => { await app.addToCart(product,1,model.selection(definition,{color:'white',size:'m'})); });
  assert.equal(app.cart.length,2); assert.equal(app.cartSubtotal,400);
  const whiteKey = app.getItemKey(app.cart.find(i=>i.variantId==='white-m'));
  await act(async () => { await app.removeFromCart(whiteKey); });
  assert.equal(app.cart.length,1); assert.equal(app.cart[0].quantity,2);
  const whole = { ...product,id:'bundle',name:deal.title,hasOptions:false,isBundle:true,dealId:'bundle',sellingPrice:400,discountPrice:300,bundleItems:pieces };
  await act(async () => { await app.addToCart(whole,1); });
  assert.equal(find('إضافة الباقة بالاختيارات').props.disabled,true);
  await click('السعة: 256 GB'); await click('إضافة الباقة بالاختيارات');
  const bundle = app.cart.find(i=>i.product.isBundle);
  assert.equal(bundle.unitPrice,337.5); assert.equal(bundle.bundleSelections[0].variantId,'storage-256');
  await act(async () => { await app.addToCart(whole,1,undefined,[{dealProductId:'phone',variantId:'storage-128',unitPrice:100,selectedOptions:[]},{dealProductId:'accessory',unitPrice:300}]); });
  assert.equal(app.cart.filter(i=>i.product.isBundle).length,2,'whole bundles with different piece choices remain separate');
  assert.equal(app.cartSubtotal,937.5);
 } finally { if(tree) await act(async()=>tree.unmount()); }
 const { ProductOptionsEditor } = load(path.join(root,'admin-app/src/components/ProductOptionsEditor.tsx'));
 let draft = model.emptyOptions(), editor;
 function EditorHarness() { const [value,setValue] = React.useState(draft); draft=value; return React.createElement(ProductOptionsEditor,{value,onChange:setValue,price:100,cost:80}); }
 await act(async()=> { editor=create(React.createElement(EditorHarness)); });
 const button = text => editor.root.findAllByType('TouchableOpacity').find(node=>node.findAllByType('Text').some(t=>t.props.children===text));
 await act(async()=> { button('+ إضافة خاصية').props.onPress(); });
 await act(async()=> { editor.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel==='اسم الخاصية 1').props.onChangeText('اللون'); });
 await act(async()=> { editor.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel==='قيمة اللون 1').props.onChangeText('أسود'); });
 const originalValueId=draft.groups[0].values[0].id;
 await act(async()=> { button('صورة').props.onPress(); });
 await act(async()=> { editor.root.findByType('ImagePickerModal').props.onImageSelected('file:///black.jpg'); });
 assert.equal(draft.groups[0].values[0].imageUrl,'file:///black.jpg');
 await act(async()=> { button('+ إضافة قيمة').props.onPress(); });
 assert.equal(draft.groups[0].values[0].id,originalValueId,'adding values does not change existing IDs');
 assert.equal(draft.variants.length,2);
 await act(async()=> { editor.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel?.startsWith('سعر بيع')).props.onChangeText('150'); });
 assert.equal(draft.variants[0].sellingPriceOverride,150);
 await act(async()=> { editor.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel?.startsWith('سعر بيع')).props.onChangeText('150.'); });
 assert.equal(editor.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel?.startsWith('سعر بيع')).props.value,'150.','typing preserves the decimal separator');
 await act(async()=> { editor.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel?.startsWith('سعر بيع')).props.onChangeText('150.5'); });
 assert.equal(draft.variants[0].sellingPriceOverride,150.5);
 await act(async()=> { editor.root.findAllByType('Switch')[0].props.onValueChange(false); });
 assert.equal(draft.variants[0].isActive,false);
 await act(async()=>editor.unmount());
 console.log('PASS actual customer/admin UI: required selections, color photos, image fallback, conflict reset, prices, variant cart identity, configurable whole bundles, stable draft IDs and availability');
}
const deadline=setTimeout(()=>{console.error('FAIL options UI timed out');process.exit(1);},20000);
main().then(()=>clearTimeout(deadline)).catch(error=>{clearTimeout(deadline);console.error(error);process.exitCode=1;});
