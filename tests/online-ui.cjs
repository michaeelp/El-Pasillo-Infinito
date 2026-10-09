const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./ui.cjs'),{chromium}=require(qa.primary+'/playwright');
const {initializeTestEnvironment}=require(qa.runtime+'/@firebase/rules-unit-testing');
const {get,ref}=require(qa.runtime+'/firebase/database');
const monsters=JSON.parse(fs.readFileSync(path.join(__dirname,'../monsters.json')));
async function read(env,code,path=''){let value;await env.withSecurityRulesDisabled(async ctx=>{value=(await get(ref(ctx.database(),`rooms/${code}/${path}`))).val();});return value;}
async function waitMeta(env,code,condition){for(let n=0;n<300;n++){const meta=await read(env,code,'meta');if(condition(meta))return meta;await new Promise(r=>setTimeout(r,150));}throw new Error('La sala no avanzó: '+JSON.stringify(await read(env,code,'meta')));}
async function open(page,mode,code){await page.click('#play');await page.click(`#${mode}-mode`);if(code){await page.fill('#room-input',code);await page.click('#join-form button');}else await page.click('#create-room');try{await page.waitForFunction(()=>!document.getElementById('room-content').hidden,null,{timeout:20000});}catch(error){throw new Error('Lobby: '+await page.locator('#lobby-error').textContent());}}
async function show(page){if(await page.locator('#tab-draw').isVisible())await page.click('#tab-draw');await page.click('#show');}
(async()=>{
 await new Promise(r=>qa.server.listen(8002,'127.0.0.1',r));
 const env=await initializeTestEnvironment({projectId:'demo-pasillo',database:{host:'127.0.0.1',port:9000}});
 const browser=await chromium.launch(qa.browserOptions);
 const contexts=[];
 try{
  const contextA=await browser.newContext({viewport:{width:1440,height:1000}}),contextB=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(contextA,contextB);
  const a=await qa.setup(contextA,'Ana',1,false),b=await qa.setup(contextB,'Bea',2,false);
  await open(a,'race');const code=await a.locator('#room-code').textContent();await open(b,'race',code);await a.waitForFunction(()=>document.querySelectorAll('#players>li').length===2).catch(async()=>{throw new Error('Jugadores de prueba: '+JSON.stringify(await read(env,code,'jugadores')));});
  await a.evaluate(()=>window.__backgroundNode=document.getElementById('corridor'));await qa.bg(a,'lobby online');await qa.fonts(a);
  await a.click('#ready-room');await b.click('#ready-room');await a.click('#start-room');await qa.state(a,'book');await qa.state(b,'book');
  const meta=await read(env,code,'meta'),{monsterSequence}=await import('../js/race.js');const monster=monsterSequence(meta.semilla,monsters,1)[0];await a.evaluate(label=>window.__label=label,monster.debilidades[0].en);
  await qa.ink(a);await show(a);await show(b);await qa.state(a,'win');await qa.state(b,'lose');
  await qa.state(a,'reveal');await qa.state(b,'reveal');await qa.bg(a,'revelado online');await qa.fonts(a);await a.screenshot({path:path.join(qa.shots,'race-reveal.png'),fullPage:true});
  let m=await read(env,code,'meta');const uidA=Object.keys((await read(env,code,'jugadores'))).find(uid=>(m.board[uid]?.points||0)>0);assert(m.board[uidA].points>0);assert.equal(Object.values(m.board).filter(p=>p.lives===2).length,1);
  for(let round=2;round<=4;round++){
   m=await waitMeta(env,code,m=>m.estado==='round'&&m.ronda===round);await qa.state(a,'book');if(round<4)await qa.state(b,'book');assert(Number(await a.locator('#timer').textContent())<=60-(round-1)*2);
   await show(a);if(round<4)await show(b);await qa.state(a,'reveal');if(round===3){await waitMeta(env,code,m=>Object.values(m.board).some(p=>p.lives===0));}
  }
  await qa.state(a,'podium');await qa.bg(a,'podio');await qa.fonts(a);assert((await a.locator('#podium-list').textContent()).includes('Ana'));await a.click('#rematch');await qa.state(a,'lobby');assert.equal(await a.locator('#ready-room').textContent(),'LISTO');await a.click('#leave-room');await b.click('#leave-room');await contextA.close();await contextB.close();
  const coop=[];for(let i=0;i<3;i++){const context=await browser.newContext({viewport:i===2?{width:390,height:844}:{width:1440,height:1000}});contexts.push(context);coop.push(await qa.setup(context,['Luz','Paz','Sol'][i],i+3,false));}
  const [book,watch,draw]=coop;await open(book,'coop');const coopCode=await book.locator('#room-code').textContent();await open(watch,'coop',coopCode);await open(draw,'coop',coopCode);
  await book.selectOption('#role-choice','bibliotecario');await watch.selectOption('#role-choice','vigia');await draw.selectOption('#role-choice','dibujante');for(const p of coop)await p.click('#ready-room');await book.click('#start-room');for(const p of coop)await qa.state(p,'book');
  const room=await read(env,coopCode);const watcher=Object.keys(room.jugadores).find(uid=>room.jugadores[uid].nombre==='Paz'),drawer=Object.keys(room.jugadores).find(uid=>room.jugadores[uid].nombre==='Sol'),key=`${room.meta.match}_1`;
  const target=monsters.find(m=>m.id===room.secreto[key][watcher].monstruoId);await draw.evaluate(label=>window.__label=label,target.debilidades[0].en);
  assert(await book.locator('#book-view').isVisible());assert(!(await book.locator('#draw-view').isVisible()));assert(await draw.locator('#draw-view').isVisible());assert(!(await draw.locator('#book-view').isVisible()));assert(await watch.locator('#role-view').isVisible());
  await book.keyboard.press('l');assert(!(await book.locator('#draw-view').isVisible()));await draw.keyboard.press('b');assert(!(await draw.locator('#book-view').isVisible()));
  await qa.ink(draw);await watch.waitForFunction(()=>document.getElementById('live-drawing').src.startsWith('data:image/'));await show(draw);for(const p of coop)await qa.state(p,'win');for(const p of coop)await qa.state(p,'reveal');
  await book.screenshot({path:path.join(qa.shots,'coop-reveal.png'),fullPage:true});m=await waitMeta(env,coopCode,m=>m.estado==='round'&&m.ronda===2);assert.equal(m.pasillos,1);
  for(const p of coop)await qa.state(p,'book');assert((await draw.locator('#active-role').textContent()).includes('Vigía'));assert.equal(await book.locator('#timer').textContent(),'58');await qa.fonts(draw);
  await draw.evaluate(async()=>{const {app,db}=await import('/qa/firebase.js');db.goOffline(db.getDatabase(app.getApps()[0]));});
  await waitMeta(env,coopCode,m=>m.estado==='paused');await qa.state(book,'reconnecting');
  await draw.evaluate(async()=>{const {app,db}=await import('/qa/firebase.js');db.goOnline(db.getDatabase(app.getApps()[0]));});
  await waitMeta(env,coopCode,m=>m.estado==='round');await qa.state(draw,'book');
  await draw.reload();await draw.click('#accept');await qa.state(draw,'book');assert.equal(Object.keys(await read(env,coopCode,'jugadores')).length,3);
  await book.click('#online-leave');await qa.state(watch,'reconnecting');await qa.state(draw,'reconnecting');await waitMeta(env,coopCode,m=>m.estado==='podium');await qa.state(watch,'podium');
  assert.deepEqual(qa.errors,[]);console.log('PASSED: carrera real entre 2 navegadores, screamer individual, 4 rondas, eliminación, podio, revancha; cooperativo de 3, roles aislados, lienzo en vivo, victoria, rotación, dificultad, reconexión, F5 y desconexión. CLIP simulado solo en QA.');
 }finally{for(const context of contexts)await context.close().catch(()=>{});await browser.close();await env.cleanup();qa.server.close();}
})().catch(error=>{console.error(error);qa.server.close();process.exitCode=1;});
