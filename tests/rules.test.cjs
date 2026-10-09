const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const local=path.resolve(__dirname,'../node_modules');const runtime=process.env.PASILLO_TEST_MODULES||(fs.existsSync(local)?local:path.resolve(__dirname,'../../qa-runtime/node_modules'));
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(runtime+'/@firebase/rules-unit-testing');
const {ref,set,get,update}=require(runtime+'/firebase/database');
const {doc,setDoc,updateDoc,serverTimestamp}=require(runtime+'/firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-pasillo',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(path.join(__dirname,'../database.rules.json'),'utf8')},firestore:{host:'127.0.0.1',port:8081,rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 try{
 console.log('Reglas cargadas.');await env.clearDatabase();await env.clearFirestore();console.log('Bases de prueba vacías.');
 const now=Date.now(),meta={host:'host',modo:'coop',estado:'round',ronda:1,pasillos:0,vidas:3,inicioFase:now,semilla:0,createdAt:now,expiresAt:now+10800000,uniqueAvatars:true,match:1,roles:{host:'bibliotecario',watch:'vigia',draw:'dibujante'}};
 const player=(name,a,rol)=>({nombre:name,avatar:a,slot:a,rol,listo:true,iaLista:true,progreso:100,ausente:false,changed:now});
 await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database(),'rooms/TEST'),{meta,jugadores:{host:player('Ana',1,'bibliotecario'),watch:player('Bea',2,'vigia'),draw:player('Caro',3,'dibujante')},claims:{slots:{1:'host',2:'watch',3:'draw'},avatars:{1:'host',2:'watch',3:'draw'},roles:{bibliotecario:'host',vigia:'watch',dibujante:'draw'}}}));
 console.log('Sala de prueba creada.');const host=env.authenticatedContext('host').database(),watch=env.authenticatedContext('watch').database(),draw=env.authenticatedContext('draw').database(),stranger=env.authenticatedContext('stranger').database(),anon=env.unauthenticatedContext().database();
 await assertSucceeds(set(ref(watch,'rooms/TEST/secreto/1_1/watch'),{monstruoId:1}));
 await assertSucceeds(get(ref(watch,'rooms/TEST/secreto/1_1/watch')));
 await assertFails(get(ref(host,'rooms/TEST/secreto/1_1/watch')));await assertFails(get(ref(draw,'rooms/TEST/secreto/1_1/watch')));await assertFails(get(ref(host,'rooms/TEST')));await assertFails(get(ref(anon,'rooms/TEST/meta')));
 await assertFails(update(ref(draw,'rooms/TEST/meta'),{ronda:2}));await assertSucceeds(update(ref(host,'rooms/TEST/meta'),{revision:1}));
 await assertFails(update(ref(draw,'rooms/TEST/jugadores/host'),{nombre:'X'}));
 await assertFails(update(ref(draw,'rooms/TEST/jugadores/draw'),{avatar:9}));await assertFails(update(ref(draw,'rooms/TEST/jugadores/draw'),{nombre:'x'.repeat(15)}));
 await assertFails(set(ref(stranger,'rooms/TEST/claims/avatars/1'),'stranger'));
 await assertSucceeds(set(ref(draw,'rooms/TEST/entregas/1_1/draw'),{ms:1000,t:Date.now()}));
 const result={etiqueta:'sun',confianza:.9,precision:0,ms:1000,miniatura:'data:image/webp;base64,AAAA',timeout:false,t:Date.now(),distribution:{sun:.9,apple:.1}};
 await assertSucceeds(set(ref(draw,'rooms/TEST/resultados/1_1/draw'),result));await assertFails(set(ref(draw,'rooms/TEST/resultados/1_1/host'),result));await assertFails(set(ref(watch,'rooms/TEST/resultados/1_1/watch'),result));
 await assertSucceeds(set(ref(watch,'rooms/TEST/veredictos/1_1/watch'),{monstruoId:1,ok:true,precision:.9}));
 await assertSucceeds(set(ref(draw,'rooms/TEST/live/1_1/draw'),{miniatura:'data:image/webp;base64,AAAA',t:Date.now()}));await assertFails(set(ref(host,'rooms/TEST/live/1_1/host'),{miniatura:'data:image/webp;base64,AAAA',t:Date.now()}));
 const t=Date.now();await assertSucceeds(update(ref(draw,'rooms/TEST/chat/draw'),{0:{uid:'draw',texto:'Hola',t,tipo:'chat'},__last:t}));await assertFails(update(ref(draw,'rooms/TEST/chat/draw'),{1:{uid:'draw',texto:'Otra',t:t+1,tipo:'chat'},__last:t+1}));
 const store=env.unauthenticatedContext().firestore();const good={n:'Ana',p:1,a:1,t:serverTimestamp()};await assertSucceeds(setDoc(doc(store,'scores/a'),good));await assertFails(setDoc(doc(store,'scores/b'),{...good,a:9}));await assertFails(setDoc(doc(store,'scores/c'),{...good,extra:1}));await assertFails(updateDoc(doc(store,'scores/a'),{p:2}));
 await assertSucceeds(setDoc(doc(store,'scores_carrera/a'),{...good,p:800}));await assertSucceeds(setDoc(doc(store,'scores_coop/a'),{...good,equipo:[{n:'Ana',a:1},{n:'Bea',a:2},{n:'Caro',a:3}]}));
 console.log('PASSED: permisos de roles, aislamiento del secreto, autoría, avatares, nombres, envío, chat y tres rankings.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
