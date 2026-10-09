// SDK de cliente y reglas reales, sin Admin ni servidor en las operaciones bajo prueba.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),runtime=process.env.PASILLO_TEST_MODULES||(fs.existsSync(path.join(root,'node_modules/firebase'))?path.join(root,'node_modules'):path.resolve(root,'../qa-runtime/node_modules'));
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(runtime+'/@firebase/rules-unit-testing'),db=require(runtime+'/firebase/database');
const stats=()=>({partidas:0,pasillos:0,mejores:{},precisionTotal:0,precisionMuestras:0,tiempoMs:0,rachaMax:0,carrerasGanadas:0,cooperativas:0,bestiario:{},logros:[]});
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-pasillo',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(path.join(root,'database.rules.json'),'utf8')}});
 const contexts=new Map(),ctx=id=>{if(!contexts.has(id))contexts.set(id,env.authenticatedContext(id,{firebase:{sign_in_provider:'password'}}).database());return contexts.get(id);};
 const read=async(database,p)=>(await db.get(db.ref(database,p))).val(),put=(database,p,v)=>db.set(db.ref(database,p),v),patch=(database,v)=>db.update(db.ref(database),v);
 const seed=async v=>env.withSecurityRulesDisabled(c=>patch(c.database(),v));
 const profile=(nombre,code)=>({nombre,nombreLower:nombre.toLowerCase(),avatar:12,xp:0,nivel:1,codigoAmigo:code,creadoEn:db.serverTimestamp(),estadisticas:stats(),preferencias:{solicitudes:true},ultimaPartida:''});
 const create=(id,nombre,code)=>patch(ctx(id),{[`users/${id}`]:profile(nombre,code),[`usernames/${nombre.toLowerCase()}`]:id,[`friendcodes/${code}`]:id,[`socialCounts/${id}`]:{amigos:0,pendientes:0,otroUid:'',accion:'crear',fecha:db.serverTimestamp()}});
 const social=async(id,other,action,slot=0)=>{
  const database=ctx(id),values={},mine=(await read(database,`social/${id}`))||{};
  if(action==='enviar'){const pending={de:id,fecha:db.serverTimestamp(),slot};values[`social/${id}/pendientes/${other}`]=pending;values[`social/${other}/pendientes/${id}`]=pending;values[`socialLimits/${id}/${slot}`]={t:db.serverTimestamp(),dest:other};}
  else if(action==='aceptar'){values[`social/${id}/confirmados/${other}`]=true;values[`social/${other}/confirmados/${id}`]=true;values[`social/${id}/pendientes/${other}`]=null;values[`social/${other}/pendientes/${id}`]=null;}
  else if(action==='eliminar'){values[`social/${id}/confirmados/${other}`]=null;values[`social/${other}/confirmados/${id}`]=null;}
  else {values[`social/${id}/pendientes/${other}`]=null;values[`social/${other}/pendientes/${id}`]=null;}
  for(const person of [id,other]){const old=await read(database,`socialCounts/${person}`);values[`socialCounts/${person}`]={...old,amigos:old.amigos+(action==='aceptar'?1:action==='eliminar'?-1:0),pendientes:old.pendientes+(action==='enviar'?1:['aceptar','rechazar','cancelar'].includes(action)?-1:0),otroUid:person===id?other:id,accion:action,fecha:db.serverTimestamp()};}
  return patch(database,values);
 };
 const ana=ctx('ana'),bob=ctx('bob'),cara=ctx('cara'),anon=env.authenticatedContext('anon',{firebase:{sign_in_provider:'anonymous'}}).database(),guest=env.unauthenticatedContext().database();
 try{
  await env.clearDatabase();await assertSucceeds(create('ana','Ana','ANA234'));await assertFails(create('bob','ANA','BOB234'));assert.equal(await read(bob,'users/bob'),null);assert.equal(await read(bob,'friendcodes/BOB234'),null);
  await assertFails(put(bob,'usernames/suelto','bob'));await assertSucceeds(create('bob','Bob','BOB234'));await assertSucceeds(create('cara','Cara','CAR234'));
  const race=await Promise.allSettled([create('one','Unico','ONE234'),create('two','UNICO','TWO234')]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  await assertFails(put(ana,'users/ana/nombre','Otra'));await assertFails(put(ana,'users/ana/avatar',13));await assertSucceeds(put(ana,'users/ana/avatar',11));await assertFails(db.get(db.ref(guest,'users/ana')));await assertFails(put(anon,'users/ana/avatar',2));await assertFails(put(ana,'users/ana/correo','privado@example.invalid'));
  const award=(gain,level,id)=>patch(ana,{[`partidas/ana/${id}`]:{xp:gain,fecha:db.serverTimestamp(),modo:'solo',dificultad:'normal'},'users/ana/xp':gain,'users/ana/nivel':level,'users/ana/ultimaPartida':id,'users/ana/estadisticas':{...stats(),partidas:1,pasillos:1}});
  await assertFails(award(601,4,'demasiado'));await assertFails(award(80,1,'nivel-falso'));await assertSucceeds(award(80,2,'correcto'));await assertFails(award(80,2,'correcto'));await assertFails(put(ana,'users/ana/xp',0));
  const record={uid:'ana',nombre:'Ana',avatar:11,nivel:2,puntuacion:10,fecha:db.serverTimestamp(),dificultad:'normal'};
  await assertSucceeds(put(ana,'records_solo_normal/ana',record));await assertSucceeds(put(ana,'records_solo_normal/ana',{...record,puntuacion:12}));await assertFails(put(ana,'records_solo_normal/ana',{...record,puntuacion:11}));await assertFails(put(ana,'records_solo_normal/ana',{...record,nombre:'Falsa'}));await assertFails(put(bob,'records_solo_normal/ana',record));await assertFails(put(ana,'records_solo_normal/ana',{...record,correo:'privado'}));await assertSucceeds(db.get(db.ref(guest,'records_solo_normal/ana')));await assertFails(db.remove(db.ref(ana,'records_solo_normal/ana')));await assertFails(db.remove(db.ref(ana,'users/ana')));
  console.log('OK identidad/XP/ranking: reserva atómica, carrera entre nombres, nombre fijo, avatar 12, 600 XP, recibo y récord único/mejor.');
  await assertFails(put(ana,'social/ana/confirmados/cara',true));await assertFails(put(ana,'socialCounts/ana',{amigos:0,pendientes:0,otroUid:'',accion:'crear',fecha:db.serverTimestamp()}));
  await assertSucceeds(social('ana','bob','enviar'));await assertFails(social('ana','bob','aceptar'));await assertSucceeds(social('bob','ana','aceptar'));assert.equal(await read(ana,'social/ana/confirmados/bob'),true);
  await assertSucceeds(social('cara','ana','enviar'));await assertSucceeds(social('ana','cara','rechazar'));await assertSucceeds(social('cara','bob','enviar',1));await assertSucceeds(social('cara','bob','cancelar'));
  await put(bob,'users/bob/preferencias/solicitudes',false);await assertFails(social('cara','bob','enviar',2));await put(bob,'users/bob/preferencias/solicitudes',true);
  await assertSucceeds(social('ana','bob','eliminar'));await assertFails(put(ana,'social/ana/confirmados/bob',true));
  // Cada solicitud cuenta aun después de cancelarse; la undécima no puede reutilizar una ranura.
  for(let n=0;n<8;n++){const id='rate'+n;await create(id,'Tasa'+n,'TAS23'+(n+2));await assertSucceeds(social('cara',id,'enviar',n+2));await assertSucceeds(social('cara',id,'cancelar'));}
  await assertFails(social('cara','ana','enviar',0));await assertFails(db.remove(db.ref(cara,'socialLimits/cara')));
  await seed({'socialCounts/ana':{amigos:0,pendientes:50,otroUid:'',accion:'crear',fecha:Date.now()}});await assertFails(social('bob','ana','enviar',0));await seed({'socialCounts/ana':{amigos:100,pendientes:0,otroUid:'',accion:'crear',fecha:Date.now()}});await assertFails(social('bob','ana','enviar',0));await seed({'socialCounts/ana':{amigos:0,pendientes:0,otroUid:'',accion:'crear',fecha:Date.now()}});
  await assertSucceeds(social('ana','bob','enviar',1));await assertSucceeds(social('bob','ana','aceptar'));console.log('OK social: solo destinatario acepta; dos extremos, cancelar/rechazar/eliminar, 100/50 y diez envíos por hora.');
  const now=Date.now(),meta={host:'ana',modo:'race',estado:'lobby',ronda:0,pasillos:0,vidas:5,inicioFase:0,semilla:123,dificultad:'facil',personalizada:false,createdAt:now,expiresAt:now+100000,uniqueAvatars:false};
  await assertFails(put(anon,'rooms/ANON/meta',{...meta,host:'anon'}));await assertSucceeds(put(ana,'rooms/TEST/meta',meta));await assertSucceeds(put(ana,'rooms/TEST/claims/slots/1','ana'));
  const player={nombre:'Ana',avatar:12,slot:1,rol:'',listo:false,iaLista:true,progreso:100,ausente:false,changed:Date.now()};await assertSucceeds(put(ana,'rooms/TEST/jugadores/ana',player));await assertFails(put(ana,'rooms/TEST/jugadores/ana/nombre','Otro'));
  await assertSucceeds(put(ana,'presencia/ana',{estado:'enSala',sala:'TEST',t:db.serverTimestamp()}));await assertSucceeds(db.get(db.ref(bob,'presencia/ana')));await assertFails(db.get(db.ref(cara,'presencia/ana')));
  const invitation={de:'ana',nombre:'Ana',sala:'TEST',modo:'race',dificultad:'facil',creadoEn:db.serverTimestamp(),caducaEn:Date.now()+119000};
  await assertSucceeds(patch(ana,{'invitaciones/bob/inv1':invitation,'enviadas/ana/inv1':{dest:'bob'}}));await assertFails(patch(ana,{'invitaciones/cara/inv2':invitation,'enviadas/ana/inv2':{dest:'cara'}}));await assertFails(patch(ana,{'invitaciones/bob/inv2':{...invitation,nombre:'Otra'},'enviadas/ana/inv2':{dest:'bob'}}));await assertFails(db.get(db.ref(ana,'invitaciones/bob')));await assertSucceeds(patch(bob,{'invitaciones/bob/inv1':null,'enviadas/ana/inv1':null}));
  // Regla de equipo: clave canónica, sala cooperativa, miembros, dificultad y semilla.
  await seed({'rooms/COOP':{meta:{...meta,modo:'coop',estado:'podium',match:123,pasillos:4},jugadores:{ana:player,bob:{...player,nombre:'Bob'},cara:{...player,nombre:'Cara'}}}});
  const team={...record,puntuacion:4,dificultad:'facil',miembros:['ana','bob','cara'],sala:'COOP',partida:123},tp={'records_coop_facil/ana|bob|cara':team,'equipos/ana/facil/ana|bob|cara':true,'equipos/bob/facil/ana|bob|cara':true,'equipos/cara/facil/ana|bob|cara':true};
  await assertSucceeds(patch(bob,tp));await assertFails(patch(bob,{...tp,'records_coop_facil/ana|bob|cara':{...team,puntuacion:5}}));await assertFails(put(bob,'records_coop_facil/duplicado',team));await seed({'rooms/COOP/meta/personalizada':true});await assertFails(patch(bob,tp));await seed({'rooms/COOP/meta/personalizada':false});console.log('OK online: presencia privada, invitación mutua, nombre real, equipo canónico y semilla personalizada rechazada.');
  await seed({'rooms/EXPI':{meta:{...meta,expiresAt:Date.now()-10000}},'caducidad/EXPI':Date.now()-10000});
  await assertFails(db.remove(db.ref(bob,'rooms/TEST')));await assertFails(put(bob,'caducidad/TEST',Date.now()-10000));
  await assertSucceeds(db.get(db.query(db.ref(bob,'caducidad'),db.orderByValue(),db.endAt(Date.now()),db.limitToFirst(8))));
  await assertSucceeds(patch(bob,{'rooms/EXPI':null,'caducidad/EXPI':null}));
  console.log('OK caducidad: índice consultable, no anticipar ni borrar sala activa, borrado de sala vencida.');
  const marker={nombreLower:'ana',codigoAmigo:'ANA234',inicio:db.serverTimestamp()};await assertFails(put(bob,'accountCleanup/ana',marker));await assertSucceeds(put(ana,'accountCleanup/ana',marker));await assertFails(put(ana,'users/ana/avatar',10));
  await assertSucceeds(patch(ana,{'social/ana/confirmados/bob':null,'social/bob/confirmados/ana':null,'socialCounts/ana':null,'socialCounts/bob':{amigos:0,pendientes:0,otroUid:'ana',accion:'limpiar',fecha:db.serverTimestamp()},'socialLimits/ana':null,'presencia/ana':null,'rooms/TEST':null,'rooms/COOP':null,'records_solo_normal/ana':null,'records_coop_facil/ana|bob|cara':null,'equipos/ana/facil/ana|bob|cara':null,'equipos/bob/facil/ana|bob|cara':null,'equipos/cara/facil/ana|bob|cara':null}));
  await assertSucceeds(patch(ana,{'users/ana':null,'usernames/ana':null,'friendcodes/ANA234':null,'partidas/ana':null,'deletedAccounts/ana':true}));await assertSucceeds(db.remove(db.ref(ana,'accountCleanup/ana')));assert.equal(await read(bob,'usernames/ana'),null);await assertFails(create('ana','Reactivada','REA234'));await assertFails(db.remove(db.ref(ana,'deletedAccounts/ana')));await assertSucceeds(create('replacement','Ana','REA235'));
  console.log('OK borrado: marcador propio, revocación de escrituras, dos extremos, récords/equipos, perfil y reservas.');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
