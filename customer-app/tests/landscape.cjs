const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const root = path.resolve(__dirname, '../src');
const cache = new Map();
let dimensions = { width: 390, height: 844 };
let insets = { top: 24, bottom: 16, left: 0, right: 0 };
const app = { currentScreen: 'home', navigateTo() {}, categories: Array.from({length: 8}, (_, index) => ({ id: String(index), name: 'فئة ' + index })), setSelectedCategory() {} };
const native = { useWindowDimensions: () => dimensions, StyleSheet: { create: v => v, hairlineWidth: 1 },
 ...Object.fromEntries(['View','Text','Image','TouchableOpacity','Modal'].map(name => [name,name])) };
function load(file) {
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}}; cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=name=>{
  if(name==='react'||name==='react/jsx-runtime')return require(name);
  if(name==='react-native')return native;
  if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>insets};
  if(name.endsWith('/AppIcon'))return{AppIcon:'AppIcon'};
  if(name.endsWith('/context/AppContext'))return{useApp:()=>app};
  const p=path.resolve(path.dirname(file),name);return load([p+'.tsx',p+'.ts',path.join(p,'index.ts')].find(fs.existsSync));
 };
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(req,mod,mod.exports);return mod.exports;
}
async function main(){
 const {lightColors}=load(path.join(root,'theme/index.ts')); app.colors=lightColors;
 const {calculateLayout,useResponsiveLayout}=load(path.join(root,'layout/ResponsiveLayout.tsx'));
 const {ResponsiveLayoutProvider}=load(path.join(root,'layout/ResponsiveLayoutProvider.tsx'));
 const {BottomNav}=load(path.join(root,'components/BottomNav.tsx'));
 let layout, textState, setText;
 function Probe(){layout=useResponsiveLayout();[textState,setText]=React.useState('draft');return React.createElement(BottomNav);}
 let tree;
 const render=()=>React.createElement(ResponsiveLayoutProvider,null,React.createElement(Probe));
 await act(async()=>{tree=create(render());}); assert.equal(layout.compact,false); assert.equal(layout.width,390);
 await act(async()=>setText('verification draft'));
 dimensions={width:844,height:390};insets={top:0,bottom:21,left:44,right:44};
 await act(async()=>tree.update(render()));
 assert.equal(layout.compact,true);assert.equal(layout.width,756,'landscape cutouts are deducted');assert.equal(layout.navHeight,52);
 assert.equal(textState,'verification draft','rotation preserves mounted screen state');
 const nav=tree.root.findAllByType('TouchableOpacity');assert.equal(nav.length,3);
 assert.ok(nav.every(node=>node.props.style[1].minHeight>=48),'compact tabs retain usable touch targets');
 dimensions={width:1366,height:1024};insets={top:24,bottom:16,left:0,right:0};
 await act(async()=>tree.update(render()));assert.equal(layout.contentWidth,1120,'tablet/desktop content is bounded');
 await act(async()=>tree.unmount());
 const {CategoryGrid}=load(path.join(root,'components/CategoryGrid.tsx'));
 await act(async()=>{tree=create(React.createElement(CategoryGrid));});
 for(const [width,columns]of [[288,2],[720,3],[1088,4]]){
  const grid=tree.root.findAllByType('View').find(node=>node.props.onLayout);
  await act(async()=>grid.props.onLayout({nativeEvent:{layout:{width}}}));
  const cards=tree.root.findAllByType('TouchableOpacity');const cardWidth=cards[0].props.style[1].width;
  assert.ok(cardWidth*columns+12*(columns-1)<=width+0.01,'grid fits measured parent after resizing');
  assert.ok(cardWidth>=130);
 }
 await act(async()=>tree.unmount());
 const {ResponsiveModal}=load(path.join(root,'components/ResponsiveModal.tsx'));
 await act(async()=>{tree=create(React.createElement(ResponsiveModal,{visible:true,transparent:true},React.createElement('Text',null,'dialog')));});
 assert.ok(tree.root.findByType('Modal').props.supportedOrientations.includes('landscape-left'));
 assert.ok(tree.root.findByType('Modal').props.supportedOrientations.includes('landscape-right'));
 assert.deepEqual(tree.root.findByType('SafeAreaView').props.edges,['top','bottom','left','right']);
 await act(async()=>tree.unmount());
 assert.equal(calculateLayout(568,320).landscape,true);
 console.log('PASS adaptive layout: live rotation, safe cutouts, preserved drafts, compact navigation, bounded wide content, measured category columns and modal landscape/safe areas');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
