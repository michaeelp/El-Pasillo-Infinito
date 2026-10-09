// Comprobación focalizada de concurrencia, limpieza y eliminación reanudada.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {server,setup,state,runtime,primary,browserOptions,errors,forbiddenServices}=require('./ui.cjs'),{chromium}=require(primary+'/playwright');
const req=require('node:module').createRequire(runtime+'/firebase-admin/package.json'),{initializeApp,deleteApp}=req('firebase-admin/app'),{getDatabase}=req('firebase-admin/database'),{getAuth}=req('firebase-admin/auth');
const {initializeTestEnvironment}=require(runtime+'/@firebase/rules-unit-testing');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-pasillo',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(path.resolve(__dirname,'../database.rules.json'),'utf8')}});
 await env.clearDatabase();await new Promise(resolve=>server.listen(8002,'127.0.0.1',resolve));const browser=await chromium.launch(browserOptions);
 const app=initializeApp({projectId:'demo-pasillo',databaseURL:'https://demo-pasillo.firebaseio.com',credential:{getAccessToken:async()=>({access_token:'owner',expires_in:3600})}},'spark-check'),rt=getDatabase(app),auth=getAuth(app);
 try{
  const context=await browser.newContext(),page=await setup(context);await page.click('#auth-register');await page.fill('#auth-name','SparkQA');await page.fill('#auth-email','sparkqa@example.invalid');await page.fill('#auth-password','Prueba12345');await page.click('#auth-submit');await state(page,'menu');
  const uid=await page.evaluate(async()=>{const {currentUser}=await import('/js/auth.js?v=1.3.1');return currentUser().uid;});
  await page.evaluate(async()=>{const {awardMatch}=await import('/js/xp.js?v=1.3.1');const m={modo:'solo',dificultad:'normal',pasillos:1,precisiones:[.5],tiempoMs:1000};await Promise.all([awardMatch({...m,id:'concurrente-a'}),awardMatch({...m,id:'concurrente-b'}),awardMatch({...m,id:'concurrente-a'})]);});
  assert.equal((await rt.ref(`users/${uid}/xp`).get()).val(),26);assert.equal((await rt.ref(`users/${uid}/estadisticas/partidas`).get()).val(),2);
  const saved=await page.evaluate(async()=>{const {publishRecord}=await import('/js/records.js?v=1.3.1');return Promise.all([publishRecord({puntuacion:8}),publishRecord({puntuacion:3})]);});assert(saved.every(r=>r.status==='global'));assert.equal((await rt.ref(`records_solo_normal/${uid}/puntuacion`).get()).val(),8);
  const now=Date.now(),meta={host:uid,modo:'race',estado:'lobby',ronda:0,pasillos:0,vidas:3,inicioFase:0,semilla:1,dificultad:'normal',personalizada:false,createdAt:now,expiresAt:now-1000,uniqueAvatars:false};
  await rt.ref().update({'rooms/OLDX':{meta},'caducidad/OLDX':now-1000,'rooms/LIVE':{meta:{...meta,expiresAt:now+100000}},'caducidad/LIVE':now+100000});
  await page.evaluate(async()=>{const {Network}=await import('/js/net.js?v=1.3.1');const n=new Network();await n.connect();await n.leave();});assert(!(await rt.ref('rooms/OLDX').get()).exists());assert((await rt.ref('rooms/LIVE').get()).exists());
  // Se simula cerrar el navegador después de crear el marcador de eliminación.
  await page.evaluate(async()=>{const {currentUser}=await import('/js/auth.js?v=1.3.1'),{databaseService}=await import('/js/sdk.js?v=1.3.1');const {r,db}=await databaseService(),uid=currentUser().uid,p=(await r.get(r.ref(db,`users/${uid}`))).val();await r.set(r.ref(db,`accountCleanup/${uid}`),{nombreLower:p.nombreLower,codigoAmigo:p.codigoAmigo,inicio:r.serverTimestamp()});});
  await page.click('#logout');await state(page,'access');await page.fill('#auth-email','sparkqa@example.invalid');await page.fill('#auth-password','Prueba12345');await page.click('#auth-login');await page.click('#auth-submit');await page.waitForFunction(()=>document.getElementById('auth-status').textContent==='Cuenta eliminada.').catch(async error=>{console.error('Diagnóstico',await page.locator('#auth-status').textContent(),await page.evaluate(()=>document.body.dataset.state),(await rt.ref(`accountCleanup/${uid}`).get()).val(),(await rt.ref(`users/${uid}`).get()).exists(),(await rt.ref(`deletedAccounts/${uid}`).get()).val());throw error;});
  assert(!(await rt.ref(`users/${uid}`).get()).exists());assert(!(await rt.ref('usernames/sparkqa').get()).exists());assert(!(await rt.ref(`records_solo_normal/${uid}`).get()).exists());assert.equal((await rt.ref(`deletedAccounts/${uid}`).get()).val(),true);await assert.rejects(()=>auth.getUser(uid),e=>e.code==='auth/user-not-found');
  assert.deepEqual(errors,[]);assert.deepEqual(forbiddenServices,[]);console.log('OK Spark: XP concurrente y recibo repetido; máximo concurrente; limpieza de sala expirada; borrado reanudado con Auth y barrera de token antiguo.');await context.close();
 }finally{await browser.close();server.close();await deleteApp(app);await env.cleanup();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
