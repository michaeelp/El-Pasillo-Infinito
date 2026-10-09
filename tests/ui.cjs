const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),runtime=process.env.PASILLO_TEST_MODULES||(fs.existsSync(path.join(root,'node_modules'))?path.join(root,'node_modules'):path.join(workspace,'qa-runtime/node_modules'));
const primary=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||runtime;
const {chromium}=require(primary+'/playwright'),sharp=require(primary+'/sharp'),esbuild=require(runtime+'/esbuild');
const executable=path.join(workspace,'browser-bin/chromium');let args=[];try{args=require(runtime+'/@sparticuz/chromium').args.filter(arg=>arg!=='--single-process');}catch{}
const browserOptions={headless:true,...(fs.existsSync(executable)?{executablePath:executable}:{}),args};
const errors=[],checks=[],shots=path.join(workspace,'qa-ajustes');fs.mkdirSync(shots,{recursive:true});
const bundle=esbuild.buildSync({stdin:{contents:"export * as app from 'firebase/app';export * as auth from 'firebase/auth';export * as db from 'firebase/database';export * as store from 'firebase/firestore';export * as fn from 'firebase/functions';",resolveDir:runtime},bundle:true,format:'esm',write:false}).outputFiles[0].text;
const server=http.createServer((req,res)=>{
  if(req.url==='/qa/firebase.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'index.html':new URL(req.url,'http://localhost').pathname));
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.wav':'audio/wav','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('404');}
});
async function sdkRoutes(context){
 await context.route('https://www.gstatic.com/firebasejs/10.14.1/*',route=>{
  const name=route.request().url().split('/').pop();let body='';
  if(name==='firebase-app.js')body="import {app} from '/qa/firebase.js';export const getApps=app.getApps;export const initializeApp=config=>app.initializeApp({...config,projectId:'demo-pasillo',databaseURL:'https://demo-pasillo.firebaseio.com'});";
  if(name==='firebase-auth.js')body="import {auth} from '/qa/firebase.js';export const {browserLocalPersistence,setPersistence,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,deleteUser,sendPasswordResetEmail,reauthenticateWithCredential,EmailAuthProvider,updatePassword}=auth;export const getAuth=app=>{const a=auth.getAuth(app);if(!a.__test){auth.connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});a.__test=true;}return a;};";
  if(name==='firebase-database.js')body="import {db} from '/qa/firebase.js';export const {ref,get,set,update,onValue,onDisconnect,runTransaction,push,serverTimestamp,remove,goOffline,goOnline}=db;export const getDatabase=app=>{const d=db.getDatabase(app);if(!d.__test){db.connectDatabaseEmulator(d,'127.0.0.1',9000);d.__test=true;}return d;};";
  if(name==='firebase-firestore.js')body="import {store} from '/qa/firebase.js';export const {collection,query,where,documentId,orderBy,limit,getDocs,getDocsFromServer,getDoc,getDocFromServer,doc,setDoc,addDoc,updateDoc,runTransaction,onSnapshot,getCountFromServer,serverTimestamp,disableNetwork,enableNetwork,writeBatch}=store;export const getFirestore=app=>{const f=store.getFirestore(app);if(!f.__test){store.connectFirestoreEmulator(f,'127.0.0.1',8081);f.__test=true;}return f;};";
  if(name==='firebase-functions.js')body="import {fn} from '/qa/firebase.js';export const {httpsCallable}=fn;export const getFunctions=(app,region)=>{const f=fn.getFunctions(app,region);if(!f.__test){fn.connectFunctionsEmulator(f,'127.0.0.1',5001);f.__test=true;}return f;};";
  return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:body.replaceAll("from '/qa/","from 'http://127.0.0.1:8002/qa/")});
 });
}
async function setup(context,name='Ana',avatar=1,deterministic=true){
 await sdkRoutes(context);
 await context.addInitScript(({name,avatar,deterministic})=>{
  if(deterministic)Math.random=()=>0;
  window.Worker=class{postMessage(data){setTimeout(()=>{const first=window.__label||'a digging shovel';if(data.labels)window.__candidateLabels=data.labels;this.onmessage?.({data:data.type==='load'?{type:'ready',backend:'test-double'}:{type:'result',id:data.id,results:[{label:first,score:.9},...data.labels.filter(label=>label!==first).slice(0,4).map((label,i)=>({label,score:[.04,.03,.02,.01][i]}))]}});},30);}terminate(){}};
 },{name,avatar,deterministic});
 const page=await context.newPage();page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack);});
 await page.goto('http://127.0.0.1:8002',{waitUntil:'domcontentloaded'});await page.click('#accept');await page.waitForFunction(()=>!document.getElementById('play').disabled).catch(async e=>{console.error(await page.evaluate(()=>({state:document.body.dataset.state,ai:document.getElementById('ai-status').textContent,auth:document.getElementById('auth-status').textContent})));throw e;});await state(page,'access');await page.evaluate(()=>window.__backgroundNode=document.getElementById('corridor'));
 return page;
}
async function state(page,value){await page.waitForFunction(s=>document.body.dataset.state===s,value,{timeout:35000});}
async function bg(page,name,loaded=true){
 const info=await page.locator('#corridor').evaluate(el=>({loaded:el.dataset.loaded,z:getComputedStyle(el).zIndex,bg:getComputedStyle(el).backgroundImage,visible:getComputedStyle(el).visibility,node:el===window.__backgroundNode}));
 assert.equal(info.loaded,String(loaded));assert.equal(info.z,'0');assert(info.bg.includes(loaded?'pasillo-':'radial-gradient'));assert.equal(info.visible,'visible');assert(info.node);
 const before=await page.screenshot();await page.locator('#corridor').evaluate(el=>el.style.visibility='hidden');const after=await page.screenshot();await page.locator('#corridor').evaluate(el=>el.style.visibility='');
 const a=await sharp(before).raw().toBuffer(),b=await sharp(after).raw().toBuffer();let changes=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>3)changes++;assert(changes>a.length*.01,`background painted in ${name}: ${changes}`);checks.push(`Fondo: ${name}`);
}
async function ink(page){if(await page.locator('#tab-draw').isVisible())await page.click('#tab-draw');const box=await page.locator('#drawing').boundingBox();assert(box,'Lienzo visible para dibujar');await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:12});await page.mouse.up();}
async function fonts(page){
 const bad=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>el.getClientRects().length&&Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())).filter(el=>parseFloat(getComputedStyle(el).fontSize)<16||!/(Pirata One|IM Fell English|Cutive Mono)/.test(getComputedStyle(el).fontFamily)).map(el=>`${el.id||el.tagName}: ${getComputedStyle(el).fontFamily} ${getComputedStyle(el).fontSize}`));assert.deepEqual(bad,[]);assert.equal(await page.evaluate(()=>document.documentElement.dataset.fonts),'ready');
}
// Las suites actuales usan este servidor y la IA como doble de prueba; no se altera CLIP del proyecto.
module.exports={server,setup,state,bg,ink,fonts,shots,checks,errors,runtime,primary,browserOptions};
