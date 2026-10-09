// Perfil, nombre y código se reservan en una actualización atómica de RTDB.
// Las reglas comprueban los tres destinos y rechazan conflictos, incluso entre pestañas.
import {databaseService,readData,withDeadline} from './sdk.js?v=1.3.1';
import {DIFFICULTIES,AVATAR_COUNT} from './config.js?v=1.3.1';
import {emptyStats} from './xp.js?v=1.3.1';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normalizeProfile=p=>p?{...p,estadisticas:{...emptyStats(),...p.estadisticas,mejores:p.estadisticas?.mejores||{},bestiario:p.estadisticas?.bestiario||{},logros:p.estadisticas?.logros||[]}}:null;
export async function provisionAccount(uid,nombre) {
  const {r,db}=await databaseService(),existing=await readData(`users/${uid}`);
  if(existing.exists())return normalizeProfile(existing.val());
  if((await readData(`deletedAccounts/${uid}`)).exists())throw new Error('Cuenta eliminada. Completa la eliminación al acceder.');
  if((await readData(`accountCleanup/${uid}`)).exists())throw new Error('Cuenta en eliminación. Reintenta el acceso.');
  const nombreLower=nombre.toLowerCase();
  for(let attempt=0;attempt<12;attempt++){
    const codigoAmigo=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join('');
    const [name,code]=await Promise.all([readData(`usernames/${nombreLower}`),readData(`friendcodes/${codigoAmigo}`)]);
    if(name.exists())throw Object.assign(new Error('Nombre en uso.'),{code:'already-exists'});
    if(code.exists())continue;
    const profile={nombre,nombreLower,avatar:1,xp:0,nivel:1,codigoAmigo,creadoEn:r.serverTimestamp(),estadisticas:emptyStats(),preferencias:{solicitudes:true},ultimaPartida:''};
    try{await withDeadline(r.update(r.ref(db),{[`users/${uid}`]:profile,[`usernames/${nombreLower}`]:uid,[`friendcodes/${codigoAmigo}`]:uid,[`socialCounts/${uid}`]:{amigos:0,pendientes:0,otroUid:'',accion:'crear',fecha:r.serverTimestamp()}}));return normalizeProfile((await readData(`users/${uid}`)).val());}
    catch(error){
      // Una respuesta perdida no debe borrar una cuenta cuyo commit ya terminó.
      const committed=await readData(`users/${uid}`);if(committed.exists())return normalizeProfile(committed.val());
      if((await readData(`usernames/${nombreLower}`)).exists())throw Object.assign(new Error('Nombre en uso.'),{code:'already-exists'});
      if((await readData(`friendcodes/${codigoAmigo}`)).exists())continue;
      throw error;
    }
  }
  throw new Error('No se pudo crear el código. Reintenta.');
}
export async function setAvatar(uid,avatar){if(!Number.isInteger(avatar)||avatar<1||avatar>AVATAR_COUNT)throw new Error('Avatar inválido.');const {r,db}=await databaseService();await withDeadline(r.set(r.ref(db,`users/${uid}/avatar`),avatar));}
// El marcador impide nuevas partidas y permite reanudar una eliminación interrumpida.
// Auth se borra al final, después de todos los datos, para conservar autorización.
export async function cleanupAccount(uid) {
  const {r,db}=await databaseService(),markerRef=r.ref(db,`accountCleanup/${uid}`);
  let marker=(await withDeadline(r.get(markerRef))).val();
  if(!marker){const profile=(await readData(`users/${uid}`)).val();if(!profile)return;
    marker={nombreLower:profile.nombreLower,codigoAmigo:profile.codigoAmigo,inicio:r.serverTimestamp()};await withDeadline(r.set(markerRef,marker));}
  const [social,outgoing,rooms,teams,incoming]=await Promise.all(['social','enviadas','salasJugador','equipos','invitaciones'].map(branch=>readData(`${branch}/${uid}`)));
  const patch={[`presencia/${uid}`]:null,[`invitaciones/${uid}`]:null,[`socialLimits/${uid}`]:null,[`socialCounts/${uid}`]:null};
  for(const branch of ['pendientes','confirmados'])for(const peer of Object.keys(social.val()?.[branch]||{})){
    patch[`social/${uid}/${branch}/${peer}`]=null;patch[`social/${peer}/${branch}/${uid}`]=null;
    const counts=(await readData(`socialCounts/${peer}`)).val();if(counts)patch[`socialCounts/${peer}`]={...counts,amigos:counts.amigos-(branch==='confirmados'?1:0),pendientes:counts.pendientes-(branch==='pendientes'?1:0),otroUid:uid,accion:'limpiar',fecha:r.serverTimestamp()};
  }
  for(const [id,inv]of Object.entries(outgoing.val()||{})){patch[`invitaciones/${inv.dest}/${id}`]=null;patch[`enviadas/${uid}/${id}`]=null;}
  for(const [id,inv]of Object.entries(incoming.val()||{}))patch[`enviadas/${inv.de}/${id}`]=null;
  for(const code of Object.keys(rooms.val()||{})){
    try{const player=await readData(`rooms/${code}/jugadores/${uid}`);if(player.exists()){patch[`rooms/${code}`]=null;patch[`caducidad/${code}`]=null;}}catch{try{await r.remove(r.ref(db,`rooms/${code}`));await r.remove(r.ref(db,`caducidad/${code}`));}catch{}}
    patch[`salasJugador/${uid}/${code}`]=null;
  }
  for(const d of Object.keys(DIFFICULTIES)){
    patch[`records_solo_${d}/${uid}`]=null;patch[`records_carrera_${d}/${uid}`]=null;
    for(const id of Object.keys(teams.val()?.[d]||{})){
      const record=(await readData(`records_coop_${d}/${id}`)).val();
      if(record){patch[`records_coop_${d}/${id}`]=null;for(const peer of record.miembros)patch[`equipos/${peer}/${d}/${id}`]=null;}
      else patch[`equipos/${uid}/${d}/${id}`]=null;
    }
  }
  await withDeadline(r.update(r.ref(db),patch));
  // Historial y reservas se eliminan junto al perfil. El marcador se conserva hasta terminar Auth.
  await withDeadline(r.update(r.ref(db),{[`partidas/${uid}`]:null,[`users/${uid}`]:null,[`usernames/${marker.nombreLower}`]:null,[`friendcodes/${marker.codigoAmigo}`]:null,[`deletedAccounts/${uid}`]:true}));
}
export async function finishCleanup(uid){if(!(await readData(`accountCleanup/${uid}`)).exists())return;const {r,db}=await databaseService();await withDeadline(r.remove(r.ref(db,`accountCleanup/${uid}`)));}
