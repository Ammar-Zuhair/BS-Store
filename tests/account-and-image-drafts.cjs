// Native/UI boundaries are mocked; form, picker and screen logic are real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'customer-app/node_modules/typescript'));
const React = require(path.join(root, 'customer-app/node_modules/react'));
const { act, create } = require(path.join(root, 'customer-app/node_modules/react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = new Map();
let picked = 0, calls = [], opened = [], alerts = [], changes = [], receiptUploads = [], nativeExits = 0, fallbackExits = 0;
let exitNative = null;
const native = {
  ...Object.fromEntries(['View','Text','ScrollView','TouchableOpacity','TextInput','Modal','Switch','ActivityIndicator','Image','RefreshControl'].map(s=>[s,s])),
  StyleSheet: { create: s=>s }, Platform: { OS: 'android' }, BackHandler: { exitApp:()=>fallbackExits++ },
  Linking: { openURL: async url=>opened.push(url) }, Alert: { alert: (...args)=>alerts.push(args) },
};
const app = {
  user: { name:'عميل الاختبار', phone:'123456789' }, addresses:[{ id:'address', label:'المنزل', city:'صنعاء', street:'شارع', latitude:15, longitude:44, isDefault:true }],
  isAuthenticated:true, isDarkMode:false, refreshData:async()=>{}, refreshCatalog:async()=>{}, navigateTo:()=>{},
  updateSavedAddress:async(...args)=>changes.push(['update',...args]), deleteSavedAddress:async id=>changes.push(['delete',id]), addNewAddress:async addr=>changes.push(['add',addr]),
  logout:async()=>changes.push(['logout']),
  orders:[], stores:[], currentOrder:null, setCurrentOrder:()=>{}, refreshOrders:async()=>{},
};
const apiMock = {
  governorateApi: { list:async()=>[{id:'gov',name:'صنعاء'}], mine:async()=>({governorateId:'gov'}) },
  authApi: { changePassword:async(...args)=>changes.push(['password',...args]), deleteAccount:async password=>{changes.push(['account-delete',password]);} },
  api: { request:async(endpoint,options)=>{
    calls.push({endpoint,options});
    if(options.method==='DELETE')return {};
    return {url:`https://api.test/api/images/products/${String(calls.length).padStart(32,'0')}.jpg`};
  } },
  ordersApi: {}, paymentsApi: { getTransferInfo:async()=>({status:0}), uploadReceipt:async(...args)=>receiptUploads.push(args) },
};
const picker = { requestMediaLibraryPermissionsAsync:async()=>({status:'granted'}), launchImageLibraryAsync:async()=>({assets:[{uri:`file:///chosen-${++picked}.jpg`,base64:Buffer.alloc(100,picked).toString('base64'),mimeType:'image/jpeg'}]}) };
function load(file) {
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}}; cache.set(file,module);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
  function requireLocal(spec) {
    if(spec==='react')return React;
    if(spec==='react/jsx-runtime')return require(path.join(root,'customer-app/node_modules/react/jsx-runtime'));
    if(spec==='react-native')return native;
    if(spec==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
    if(spec==='expo-modules-core')return {requireOptionalNativeModule:()=>exitNative};
    if(spec.endsWith('.png'))return {uri:'test-icon'};
    if(spec.endsWith('/context/AdminContext'))return {useAdmin:()=>({currentUser:{name:'admin'},refreshData:app.refreshData,navigateTo:()=>{},logout:async()=>{}})};
    if(spec.endsWith('/context/DriverContext'))return {useDriver:()=>({driver:{shiftStatus:'OFFLINE'},refreshData:app.refreshData,navigateTo:()=>{},navigateBack:()=>{},toggleShiftStatus:async()=>{},signOut:async()=>{}})};
    if(spec==='expo-constants')return {expoConfig:{version:'1.0.1'}};
    if(spec==='expo-image-picker')return picker;
    if(spec==='expo-file-system/legacy')return {};
    if(spec.endsWith('/context/AppContext'))return {useApp:()=>app};
    if(spec==='../api'||spec==='../api/client')return apiMock;
    const name=path.basename(spec);
    if(['Header','AppIcon','LocationPickerModal','KeyboardAwareScrollView','CachedImage','BoosthisRuntime'].includes(name))return {[name]:name,BoosthisScreenTracker:()=>null};
    if(name==='transferReceipt')return {chooseTransferReceipt:async()=>({uri:`file:///receipt-${++picked}.jpg`,fileName:'receipt.jpg',mimeType:'image/jpeg'})};
    const base=path.resolve(path.dirname(file),spec);
    const resolved=[base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(fs.existsSync);
    if(resolved)return load(resolved);
    throw Error('Unexpected dependency '+spec);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(requireLocal,module,module.exports);
  return module.exports;
}
function texts(tree){return tree.root.findAllByType('Text').map(n=>n.props.children).flat().join(' ');}
function pressByText(tree,label){const b=tree.root.findAllByType('TouchableOpacity').find(n=>n.findAllByType('Text').some(t=>t.props.children===label));assert.ok(b,label+' button');return b.props.onPress();}
async function main(){
  const {colors}=load(path.join(root,'customer-app/src/theme/index.ts'));app.colors=colors;
  const {ImagePickerModal}=load(path.join(root,'admin-app/src/components/ImagePickerModal.tsx'));
  const {saveCatalogueForm}=load(path.join(root,'admin-app/src/services/imageStorage.ts'));
  let selected, tree;
  await act(async()=>{tree=create(React.createElement(ImagePickerModal,{visible:true,onClose:()=>{},onImageSelected:uri=>selected=uri}));});
  await act(async()=>pressByText(tree,'اختر صورة من جهازك'));const discarded=selected;
  await act(async()=>pressByText(tree,'اختر صورة من جهازك'));
  assert.equal(calls.length,0,'Choosing/replacing never contacts R2');assert.notEqual(selected,discarded);
  let saved;
  await saveCatalogueForm({images:[selected]},'products',async data=>{saved=data;});
  assert.equal(calls.length,1);assert.match(saved.images[0],/api\/images/);
  await saveCatalogueForm(saved,'products',async()=>{});assert.equal(calls.length,1,'Existing stored image is reused');
  await act(async()=>pressByText(tree,'اختر صورة من جهازك'));
  await assert.rejects(saveCatalogueForm({imageUrl:selected},'products',async()=>{throw Error('save failed');}),/save failed/);
  assert.equal(calls.at(-1).options.method,'DELETE','A failed entity save schedules uploaded image cleanup');
  await act(async()=>tree.unmount());
  const {ProfileScreen}=load(path.join(root,'customer-app/src/screens/ProfileScreen.tsx'));
  await act(async()=>{tree=create(React.createElement(ProfileScreen));});
  assert.match(texts(tree),/عميل الاختبار/);assert.doesNotMatch(texts(tree),/سجل الطلبات/);
  await act(async()=>pressByText(tree,'تواصل مع الدعم الفني'));
  assert.match(texts(tree),/783053937/);
  await act(async()=>pressByText(tree,'التواصل عبر واتساب'));
  assert.equal(opened.at(-1),'https://wa.me/967783053937');
  await act(async()=>tree.root.findAllByType('TouchableOpacity').find(n=>n.props.accessibilityLabel==='إغلاق').props.onPress());
  await act(async()=>pressByText(tree,'حول التطبيق'));
  assert.match(texts(tree),/عمار المقطري/);assert.match(texts(tree),/775479340/);
  await act(async()=>tree.root.findAllByType('TouchableOpacity').find(n=>n.props.accessibilityLabel==='إغلاق').props.onPress());
  await act(async()=>pressByText(tree,'تغيير كلمة المرور'));
  const inputs=tree.root.findAllByType('TextInput');
  await act(async()=>{inputs[0].props.onChangeText('old12345');inputs[1].props.onChangeText('new12345');inputs[2].props.onChangeText('different');});
  await act(async()=>pressByText(tree,'حفظ كلمة المرور'));assert.equal(changes.length,0);
  await act(async()=>tree.root.findAllByType('TextInput')[2].props.onChangeText('new12345'));
  await act(async()=>pressByText(tree,'حفظ كلمة المرور'));assert.deepEqual(changes.pop(),['password','old12345','new12345']);
  await act(async()=>pressByText(tree,'تعديل'));
  await act(async()=>tree.root.findAllByType('TextInput')[0].props.onChangeText('عدن'));
  await act(async()=>pressByText(tree,'حفظ العنوان'));assert.equal(changes.at(-1)[0],'update');assert.equal(changes.at(-1)[2].city,'عدن');
  await act(async()=>pressByText(tree,'حذف'));
  await act(async()=>alerts.at(-1)[2].find(b=>b.text==='حذف').onPress());assert.deepEqual(changes.at(-1),['delete','address']);
  await act(async()=>pressByText(tree,'سياسة الخصوصية'));
  assert.equal(opened.at(-1),'https://ammar-zuhair.github.io/BS-Store/privacy-policy/');
  await act(async()=>pressByText(tree,'حذف الحساب'));
  await act(async()=>pressByText(tree,'حذف حسابي نهائياً'));
  assert.equal(alerts.at(-1)[0],'كلمة المرور مطلوبة');
  await act(async()=>tree.root.findAllByType('TextInput')[0].props.onChangeText('DeletePass123'));
  const beforeDelete=changes.length;
  await act(async()=>pressByText(tree,'حذف حسابي نهائياً'));
  assert.equal(changes.length,beforeDelete,'Deletion requires explicit final confirmation');
  await act(async()=>alerts.at(-1)[2].find(b=>b.text==='حذف نهائي').onPress());
  assert.deepEqual(changes.slice(-2),[['account-delete','DeletePass123'],['logout']]);
  assert.equal(alerts.at(-1)[0],'تم حذف الحساب');

  await act(async()=>tree.unmount());
  for (const [directory, component] of [['customer-app','Header'],['admin-app','AdminHeader'],['courier-app','DriverHeader']]) {
    let finish, refreshed = 0;
    app.refreshData=()=>{refreshed++; return new Promise(resolve=>{finish=resolve;});};
    const HeaderComponent=load(path.join(root,directory,'src/components',component+'.tsx'))[component];
    await act(async()=>{tree=create(React.createElement(HeaderComponent,{title:'اختبار التحديث'}));});
    let pending;
    await act(async()=>{pending=tree.root.findAllByType('TouchableOpacity').find(n=>n.props.accessibilityLabel==='تحديث البيانات').props.onPress();});
    assert.equal(refreshed,1); assert.equal(tree.root.findAllByType('TouchableOpacity').find(n=>n.props.accessibilityLabel==='تحديث البيانات').props.disabled,true);
    await act(async()=>{finish(); await pending;});
    assert.equal(tree.root.findAllByType('TouchableOpacity').find(n=>n.props.accessibilityLabel==='تحديث البيانات').props.disabled,false);
    await act(async()=>tree.unmount());
  }
  const {exitApplication}=load(path.join(root,'customer-app/src/utils/exitApplication.ts'));
  exitNative={exit:async()=>nativeExits++}; await exitApplication(); assert.equal(nativeExits,1);assert.equal(fallbackExits,0);
  exitNative=null;await exitApplication();assert.equal(fallbackExits,1,'Older APKs use the safe compatibility fallback');
  app.currentOrder={id:'order',orderNumber:'101',status:'PENDING_PAYMENT',paymentMethod:'MANUAL_TRANSFER',paymentStatus:'PENDING',subOrders:[],items:[],totalAmount:100,createdAt:new Date().toISOString(),deliveryFee:0};
  app.orders=[app.currentOrder];
  const {TrackingScreen}=load(path.join(root,'customer-app/src/screens/TrackingScreen.tsx'));
  await act(async()=>{tree=create(React.createElement(TrackingScreen));});
  await act(async()=>pressByText(tree,'اختيار صورة إيصال التحويل'));
  await act(async()=>pressByText(tree,'تعديل صورة الإيصال'));
  assert.equal(receiptUploads.length,0,'Receipt replacements remain local until send');
  await act(async()=>pressByText(tree,'إرسال الإيصال'));assert.equal(receiptUploads.length,1);
  await act(async()=>tree.unmount());
  console.log('PASS image selection/replacement without uploads, upload only on save, retry cleanup, account name/history/support/About/WhatsApp, password confirmation, confirmed account deletion/logout/privacy link, address editing/deletion explicit receipt submission, all three refresh buttons and native-exit compatibility');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
