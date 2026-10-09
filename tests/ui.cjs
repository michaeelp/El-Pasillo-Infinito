const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),runtime=process.env.PASILLO_TEST_MODULES||(fs.existsSync(path.join(root,'node_modules'))?path.join(root,'node_modules'):path.join(workspace,'qa-runtime/node_modules'));
const primary=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||runtime;
const {chromium}=require(primary+'/playwright'),sharp=require(primary+'/sharp'),esbuild=require(runtime+'/esbuild');
const executable=path.join(workspace,'browser-bin/chromium');let args=[];try{args=require(runtime+'/@sparticuz/chromium').args.filter(arg=>arg!=='--single-process');}catch{}
const browserOptions={headless:true,...(fs.existsSync(executable)?{executablePath:executable}:{}),args};
const errors=[],checks=[],shots=path.join(workspace,'qa-ajustes');fs.mkdirSync(shots,{recursive:true});
const bundle=esbuild.buildSync({stdin:{contents:"export * as app from 'firebase/app';export * as auth from 'firebase/auth';export * as db from 'firebase/database';export * as store from 'firebase/firestore';",resolveDir:runtime},bundle:true,format:'esm',write:false}).outputFiles[0].text;
const server=http.createServer((req,res)=>{
  if(req.url==='/qa/firebase.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'index.html':new URL(req.url,'http://localhost').pathname));
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('404');}
});
async function sdkRoutes(context){
 await context.route('https://www.gstatic.com/firebasejs/10.14.1/*',route=>{
  const name=route.request().url().split('/').pop();let body='';
  if(name==='firebase-app.js')body="import {app} from '/qa/firebase.js';export const getApps=app.getApps;export const initializeApp=config=>app.initializeApp({...config,projectId:'demo-pasillo',databaseURL:'https://demo-pasillo.firebaseio.com'});";
  if(name==='firebase-auth.js')body="import {auth} from '/qa/firebase.js';export const signInAnonymously=auth.signInAnonymously;export const getAuth=app=>{const a=auth.getAuth(app);if(!a.__test){auth.connectAuthEmulator(a,'http://127.0.0.1:9099',{disableWarnings:true});a.__test=true;}return a;};";
  if(name==='firebase-database.js')body="import {db} from '/qa/firebase.js';export const {ref,get,set,update,onValue,onDisconnect,runTransaction,push,serverTimestamp}=db;export const getDatabase=app=>{const d=db.getDatabase(app);if(!d.__test){db.connectDatabaseEmulator(d,'127.0.0.1',9000);d.__test=true;}return d;};";
  if(name==='firebase-firestore.js')body="import {store} from '/qa/firebase.js';export const {collection,query,orderBy,limit,getDocs,addDoc,serverTimestamp}=store;export const getFirestore=app=>{const f=store.getFirestore(app);if(!f.__test){store.connectFirestoreEmulator(f,'127.0.0.1',8081);f.__test=true;}return f;};";
  return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:body.replaceAll("from '/qa/","from 'http://127.0.0.1:8002/qa/")});
 });
}
async function setup(context,name='Ana',avatar=1,deterministic=true){
 await sdkRoutes(context);
 await context.addInitScript(({name,avatar,deterministic})=>{
  if(!localStorage.getItem('pasillo-profile-v1'))localStorage.setItem('pasillo-profile-v1',JSON.stringify({nombre:name,avatar}));if(deterministic)Math.random=()=>0;
  window.Worker=class{postMessage(data){setTimeout(()=>this.onmessage?.({data:data.type==='load'?{type:'ready',backend:'test-double'}:{type:'result',id:data.id,results:[{label:window.__label||'sun',score:.9},{label:'apple',score:.1}]}}),30);}terminate(){}};
 },{name,avatar,deterministic});
 const page=await context.newPage();page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack);});
 await page.goto('http://127.0.0.1:8002',{waitUntil:'domcontentloaded'});await page.click('#accept');await page.waitForFunction(()=>!document.getElementById('play').disabled);
 return page;
}
async function state(page,value){await page.waitForFunction(s=>document.body.dataset.state===s,value,{timeout:35000});}
async function bg(page,name,loaded=true){
 const info=await page.locator('#corridor').evaluate(el=>({loaded:el.dataset.loaded,z:getComputedStyle(el).zIndex,bg:getComputedStyle(el).backgroundImage,visible:getComputedStyle(el).visibility,node:el===window.__backgroundNode}));
 assert.equal(info.loaded,String(loaded));assert.equal(info.z,'0');assert(info.bg.includes(loaded?'pasillo-':'radial-gradient'));assert.equal(info.visible,'visible');assert(info.node);
 const before=await page.screenshot();await page.locator('#corridor').evaluate(el=>el.style.visibility='hidden');const after=await page.screenshot();await page.locator('#corridor').evaluate(el=>el.style.visibility='');
 const a=await sharp(before).raw().toBuffer(),b=await sharp(after).raw().toBuffer();let changes=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>3)changes++;assert(changes>a.length*.01,`background painted in ${name}: ${changes}`);checks.push(`Fondo: ${name}`);
}
async function ink(page){await page.click('#tab-draw').catch(()=>{});const box=await page.locator('#drawing').boundingBox();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:12});await page.mouse.up();}
async function fonts(page){
 const bad=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>el.getClientRects().length&&Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())).filter(el=>parseFloat(getComputedStyle(el).fontSize)<16||!/(Pirata One|IM Fell English|Cutive Mono)/.test(getComputedStyle(el).fontFamily)).map(el=>`${el.id||el.tagName}: ${getComputedStyle(el).fontFamily} ${getComputedStyle(el).fontSize}`));assert.deepEqual(bad,[]);assert.equal(await page.evaluate(()=>document.documentElement.dataset.fonts),'ready');
}
if(require.main===module)(async()=>{
 await new Promise(resolve=>server.listen(8002,'127.0.0.1',resolve));
 const browser=await chromium.launch(browserOptions);
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await setup(context);await page.evaluate(()=>window.__backgroundNode=document.getElementById('corridor'));
  await bg(page,'menú inicial');await fonts(page);
  for(let run=1;run<=3;run++){
   await page.click('#play');await page.click('#solo-mode');await state(page,'count');await bg(page,`cuenta ${run}`);await state(page,'flash');await bg(page,`flash ${run}`);
   await state(page,'book');assert(Number(await page.locator('#timer').textContent())>=58);await bg(page,`libro ${run}`);await fonts(page);assert.equal(await page.locator('#book-description').count(),0);
   await ink(page);await bg(page,`lienzo ${run}`);await page.click('#show');await state(page,'suspense');await bg(page,`suspenso ${run}`);await state(page,'win');await bg(page,`victoria ${run}`);
   await state(page,'book');assert.equal(await page.locator('#timer').textContent(),'58');await page.click('#tab-draw');await page.click('#show');await state(page,'lose');await bg(page,`susto ${run}`);await state(page,'over');await bg(page,`muerte ${run}`);await fonts(page);await page.click('#back-menu');await bg(page,`menú ${run}`);
  }
  console.log('PASSED: tres partidas seguidas con fondos pintados en todos los estados.');
  await page.click('#profile-open');await fonts(page);await page.fill('#profile-name','<Luz>');await page.click('#avatar-grid button[data-id="4"]');await page.click('#profile-form button[type="submit"]');await page.click('#profile-back');assert((await page.locator('#menu-profile').textContent()).includes('Luz'));
  await page.reload();await page.click('#accept');await page.evaluate(()=>window.__backgroundNode=document.getElementById('corridor'));await bg(page,'recarga F5');assert((await page.locator('#menu-profile').textContent()).includes('Luz'));
  await page.setViewportSize({width:390,height:844});await fonts(page);await page.screenshot({path:path.join(shots,'menu-mobile.png'),fullPage:true});await page.click('#play');await page.click('#solo-mode');await state(page,'book');await fonts(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(shots,'book-mobile.png'),fullPage:true});
  await ink(page);await fonts(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(shots,'draw-mobile.png'),fullPage:true});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.body.classList.contains('paused'));await bg(page,'pestaña oculta');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await bg(page,'regreso a la pestaña');await page.click('#resume');await page.setViewportSize({width:844,height:390});await bg(page,'redimensionado');await page.click('#pause');await bg(page,'pausa');await page.click('#quit');await context.close();
  const fallback=await browser.newContext({viewport:{width:1280,height:900}});await fallback.route('**/assets/ui/pasillo-*.webp*',route=>route.abort());const failed=await setup(fallback);await failed.evaluate(()=>window.__backgroundNode=document.getElementById('corridor'));await bg(failed,'respaldo del menú',false);await failed.click('#play');await failed.click('#solo-mode');await state(failed,'book');await bg(failed,'respaldo del libro',false);await fallback.close();
  const delayed=await browser.newContext({viewport:{width:1280,height:900}});await delayed.route('**/assets/ui/pasillo-*.webp*',async route=>{await new Promise(resolve=>setTimeout(resolve,13000));await route.continue();});const late=await setup(delayed);await late.evaluate(()=>window.__backgroundNode=document.getElementById('corridor'));await bg(late,'respaldo durante carga tardía',false);await late.waitForFunction(()=>document.getElementById('corridor').dataset.loaded==='true',null,{timeout:15000});await bg(late,'imagen cargada tras el plazo');await delayed.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,fonts:'3 fuentes cargadas; texto >=16px',pageErrors:errors,recognizer:'doble de prueba; el juego real conserva CLIP'},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
module.exports={server,setup,state,bg,ink,fonts,shots,checks,errors,runtime,primary,browserOptions};
