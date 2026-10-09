const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./ui.cjs'),{chromium}=require(qa.primary+'/playwright');
const {initializeTestEnvironment}=require(qa.runtime+'/@firebase/rules-unit-testing');
const {doc,setDoc,getDocs,collection}=require(qa.runtime+'/firebase/firestore');
const root=path.resolve(__dirname,'..'),monsters=JSON.parse(fs.readFileSync(path.join(root,'monsters.json'))),rules=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
const temporaryEnvs=[];
async function loadRules(content){const env=await initializeTestEnvironment({projectId:'demo-pasillo',firestore:{host:'127.0.0.1',port:8081,rules:content}});temporaryEnvs.push(env);}
async function documents(env,name){let records;await env.withSecurityRulesDisabled(async context=>{records=(await getDocs(collection(context.firestore(),name))).docs.map(d=>({id:d.id,...d.data()}));});return records;}
(async()=>{
 await new Promise(resolve=>qa.server.listen(8002,'127.0.0.1',resolve));
 const env=await initializeTestEnvironment({projectId:'demo-pasillo',firestore:{host:'127.0.0.1',port:8081,rules}});
 const browser=await chromium.launch(qa.browserOptions),contexts=[];
 try{
  await env.clearFirestore();await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();await setDoc(doc(db,'scores/legacy'),{n:'Antiguo',p:8,t:new Date()});await setDoc(doc(db,'scores/current'),{n:'Actual',p:3,a:2,t:new Date()});
   await setDoc(doc(db,'scores_carrera/current'),{n:'Carrera',p:9000,a:4,t:new Date()});await setDoc(doc(db,'scores_coop/current'),{n:'Equipo',p:4,a:3,equipo:[{n:'A',a:3},{n:'B',a:4},{n:'C',a:5}],t:new Date()});
  });
  const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);const page=await qa.setup(context);
  await page.click('[data-dialog="records"]');await page.waitForFunction(()=>document.querySelectorAll('#global-list li').length===2);
  assert.deepEqual(await page.locator('#global-list li strong').allTextContents(),['8 pasillos','3 pasillos']);assert((await page.locator('#global-list').textContent()).includes('Antiguo'));
  await page.selectOption('#scores-mode','race');await page.waitForFunction(()=>document.getElementById('global-list').textContent.includes('9000 puntos'));assert(await page.locator('#local-section').isHidden());
  await page.selectOption('#scores-mode','coop');await page.waitForFunction(()=>document.getElementById('global-list').textContent.includes('4 pasillos'));assert.equal(await page.locator('#global-list .coop-result .player-identity').count(),3);
  await qa.fonts(page);await page.screenshot({path:path.join(qa.shots,'leaderboard.png'),fullPage:true});await page.click('#close-modal');
  const publish=await page.evaluate(async()=>{
   const f=await import('./js/firebase.js?v=1.2.0'),team=[{nombre:'Uno',avatar:1},{nombre:'Dos',avatar:2},{nombre:'Tres',avatar:3}];
   const a=await f.publishScore('Solo',2,1,'solo',[],'solo-idempotente'),b=await f.publishScore('Carrera',880,2,'race',[],'race-idempotente'),c=await f.publishScore('Equipo',1,1,'coop',team,'coop-idempotente');
   const repeat=await f.publishScore('Solo',2,1,'solo',[],'solo-idempotente'),repeatTeam=await f.publishScore('Equipo',1,1,'coop',team,'coop-idempotente');return [a,b,c,repeat,repeatTeam];
  });assert(publish.every(result=>result.status==='global'));assert.equal((await documents(env,'scores')).filter(d=>d.id==='solo-idempotente').length,1);
  await loadRules("rules_version = '2'; service cloud.firestore {match /databases/{database}/documents {match /{path=**} {allow read, write: if false;}}}");
  await page.click('[data-dialog="records"]');await page.waitForFunction(()=>document.getElementById('global-list').textContent.includes('reglas de Firestore'));assert(await page.locator('#scores-retry').isVisible());await loadRules(rules);await page.click('#scores-retry');await page.waitForFunction(()=>document.querySelectorAll('#global-list li').length===3);await page.click('#close-modal');
  await page.evaluate(async()=>{const {app,store}=await import('/qa/firebase.js');await store.disableNetwork(store.getFirestore(app.getApps()[0]));});
  await page.click('[data-dialog="records"]');await page.waitForFunction(()=>document.getElementById('global-list').textContent.includes('Sin conexión con Firestore'));assert(await page.locator('#scores-retry').isVisible());
  await page.evaluate(async()=>{const {app,store}=await import('/qa/firebase.js');await store.enableNetwork(store.getFirestore(app.getApps()[0]));});await page.click('#scores-retry');await page.waitForFunction(()=>document.querySelectorAll('#global-list li').length===3);await page.click('#close-modal');
  await page.goto('http://127.0.0.1:8002/?debug=1');await page.click('#accept');await page.waitForFunction(()=>!document.getElementById('play').disabled);assert((await page.locator('#debug-confusables').textContent()).includes('linterna, sol, fuego, vela, lámpara'));
  await page.click('#play');await page.click('#solo-mode');await qa.state(page,'book');assert.equal(await page.locator('#bookmarks button').count(),30);
  for(const [index,monster]of monsters.entries()){
   await page.waitForFunction(()=>!document.getElementById('book').classList.contains('turning'));await page.locator('#bookmarks button').nth(index).click();
   assert.equal(await page.locator('#book-name').textContent(),monster.nombre);assert.equal(await page.locator('#book-lore').textContent(),monster.lore);assert.equal(await page.locator('#page-count').textContent(),`${index+1} / 30`);assert.equal(await page.locator('#page-number').textContent(),String(index+1));
  }
  assert.equal(await page.locator('#book-description,#book-weaknesses,.page ul').count(),0);assert.equal(await page.locator('.page-right #book-name,.page-right #book-lore,.page-right #page-number').count(),3);await qa.fonts(page);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await qa.fonts(page);await page.screenshot({path:path.join(qa.shots,'book-lore-mobile.png'),fullPage:true});
  const logic=await page.evaluate(async()=>{
   const {OnlineSession}=await import('./js/online-game.js?v=1.2.0'),monster=(await(await fetch('monsters.json')).json())[29];
   const base={etiqueta:'fishing_net',distribution:{fishing_net:.5,seagull:.3,sun:.2},timeout:false,precision:.99};
   return OnlineSession.prototype.resolvedResults.call({data:{resultados:{test:{a:base,b:{...base,etiqueta:'sun',distribution:{sun:.6,fishing_net:.4}}}},entregas:{test:{a:{ms:123},b:{ms:234}}}},key:'test',monster,phase:{phaseMs:60000}});
  });assert.deepEqual(Object.keys(logic),['a','b']);assert.equal(logic.a.ok,true);assert.equal(logic.a.precision,.5);assert.equal(logic.a.ms,123);assert.equal(logic.b.ok,false);assert.equal(logic.b.precision,0);
  const audio=await page.evaluate(async()=>{
   const {Atmosphere}=await import('./js/audio.js?v=1.2.0'),monsters=await(await fetch('monsters.json')).json(),a=new Atmosphere({music:0,effects:.6,muted:false,screamer:'normal'});
   await a.preload(monsters);await a.start();const buffers=[...a.cues.values()].filter(e=>e.buffer);let plays=0,gains=[];const source=a.ctx.createBufferSource.bind(a.ctx),gain=a.ctx.createGain.bind(a.ctx);
   a.ctx.createBufferSource=()=>{const s=source(),start=s.start.bind(s);s.start=(...args)=>{plays++;start(...args);};return s;};a.ctx.createGain=()=>{const g=gain();gains.push(g);return g;};
   a.monster('appear',monsters[29]);a.monster('scream',monsters[29]);a.setOptions({...a.options,screamer:'attenuated'});a.monster('scream',monsters[29]);const values=gains.map(g=>g.gain.value);a.setOptions({...a.options,muted:true});const muted=a.options.muted;await a.ctx.close();return {buffers:buffers.length,plays,values,muted};
  });assert.equal(audio.buffers,60);assert.equal(audio.plays,3);assert(Math.abs(audio.values[2]-.18)<.0001);assert(audio.muted);
  await page.setViewportSize({width:1440,height:1000});await qa.ink(page);await page.click('#show');await qa.state(page,'win');assert((await page.locator('#encounter-message').textContent()).includes('pala (90 %)'));assert((await page.locator('#debug-results').textContent()).includes('pala: 90.0 %'));assert.equal((await page.locator('#debug-results').textContent()).split('\n').length,5);assert.equal(await page.evaluate(()=>window.__candidateLabels.length),56);
  await qa.state(page,'book');await page.click('#tab-draw');await page.click('#show');await qa.state(page,'over');assert.equal(await page.locator('#final-score').textContent(),'1');
  await loadRules("rules_version = '2'; service cloud.firestore {match /databases/{database}/documents {match /{path=**} {allow read: if true; allow write: if false;}}}");
  await page.click('#save-score');await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('reglas de Firestore'));assert(!(await page.locator('#save-score').isDisabled()));assert.equal(await page.locator('#save-score').textContent(),'REINTENTAR ENVÍO');
  await loadRules(rules);await page.click('#save-score');await page.waitForFunction(()=>document.getElementById('save-status').textContent==='Récord guardado.');assert(await page.locator('#save-score').isDisabled());assert.equal((await documents(env,'scores')).filter(d=>d.n==='Ana'&&d.p===1).length,1);
  await page.click('#back-menu');await page.click('#play');await page.click('#solo-mode');await qa.state(page,'book');await page.click('#tab-draw');await page.click('#show');await qa.state(page,'over');assert(await page.locator('#save-score').isDisabled());assert((await page.locator('#save-status').textContent()).includes('Sin pasillos'));await context.close();
  const fallback=await browser.newContext({viewport:{width:1280,height:900}});contexts.push(fallback);await fallback.route('**/assets/monsters/23-madre-raiz.webp*',route=>route.abort());const alternate=await qa.setup(fallback);await alternate.click('#play');await alternate.click('#solo-mode');await qa.state(alternate,'book');await alternate.locator('#bookmarks button').nth(22).click();await alternate.waitForFunction(()=>document.getElementById('book-portrait').src.includes('23-madre-raiz.png')&&document.getElementById('book-portrait').naturalWidth===1024);
  assert.deepEqual(qa.errors,[]);console.log('PASSED: 30 páginas y miniaturas, lore móvil, respaldo PNG, debug, 60 WAV decodificados/reproducidos, resultado de carrera recalculado, tres rankings reales, lectura legacy, errores de permisos, reintento sin duplicados y bloqueo de resultado cero.');
 }finally{await loadRules(rules);for(const context of contexts)await context.close().catch(()=>{});await browser.close();for(const e of temporaryEnvs)await e.cleanup();await env.cleanup();qa.server.close();}
})().catch(error=>{console.error(error);qa.server.close();process.exitCode=1;});
