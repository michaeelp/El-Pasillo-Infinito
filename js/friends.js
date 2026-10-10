// RTDB conserva solicitudes, amistades, presencia e invitaciones sin espejos de servidor.
// generation/revision descartan respuestas antiguas al cambiar de cuenta o de lista.
import {SOCIAL} from './config.js?v=1.4.0';
import {currentUser,authError,validateUsername} from './auth.js?v=1.4.0';
import {databaseService,readData,withDeadline} from './sdk.js?v=1.4.0';
import {readIdentity,playerNode,getProfile} from './profile.js?v=1.4.0';
let list=[],stops=[],peerStops=[],presence={},onChange=()=>{},invitationCallback=()=>{},seen=new Set(),generation=0;
let serverOffset=0;
export const socialNow=()=>Date.now()+serverOffset;
export const friendIds=()=>list.filter(p=>p.estado==='amigos').map(p=>p.uid);
export const friendList=()=>list.map(p=>({...p,presencia:presence[p.uid]?.estado||'desconectado',sala:presence[p.uid]?.sala||''}));
const PENDING='pasillo-pending-friend';
export function rememberFriendLink() {const code=new URL(location.href).searchParams.get('amigo');if(code){try{localStorage.setItem(PENDING,code.toUpperCase());}catch{}return code;}}
export async function completeFriendLink() {if(!currentUser())return;let code;try{code=localStorage.getItem(PENDING);}catch{}if(!code)return;
  try{await sendRequest(code);localStorage.removeItem(PENDING);return 'Solicitud enviada.';}catch(e){if(/already-exists|invalid-argument|not-found/.test(e.code||''))localStorage.removeItem(PENDING);return authError(e);}
}
async function resolveTarget(value){const text=String(value||'').trim();let path;
  if(text.startsWith('@'))path=`usernames/${validateUsername(text.slice(1)).toLowerCase()}`;
  else {const code=text.toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('Elige @nombre o un código de 6 caracteres.');path=`friendcodes/${code}`;}
  const target=(await readData(path)).val();if(!target)throw Object.assign(new Error('Jugador no encontrado.'),{code:'not-found'});return target;
}
export const sendRequest=async etiqueta=>friendAction('enviar',await resolveTarget(etiqueta));
export async function friendAction(accion,other){
  const uid=currentUser()?.uid;if(!uid)throw new Error('Inicia sesión.');if(!other||other===uid||/[.#$\[\]/]/.test(other))throw new Error('Elige otro jugador.');
  const {r,db}=await databaseService(),mine=(await readData(`social/${uid}`)).val()||{},patch={};
  if(accion==='enviar'){
    const p=await readIdentity(other);if(!p)throw new Error('Perfil no disponible.');if((await readData(`users/${other}/preferencias/solicitudes`)).val()===false)throw new Error('No recibe solicitudes.');
    if(mine.confirmados?.[other]||mine.pendientes?.[other])throw Object.assign(new Error(mine.confirmados?.[other]?'Ya sois amigos.':'Solicitud pendiente.'),{code:'already-exists'});
    const rate=(await readData(`socialLimits/${uid}`)).val()||{};let slot=-1;for(let i=0;i<SOCIAL.solicitudesHora;i++)if(!rate[i]||rate[i].t<=socialNow()-3600000){slot=i;break;}
    if(slot<0)throw new Error('Límite de solicitudes por hora.');
    const pending={de:uid,fecha:r.serverTimestamp(),slot};
    patch[`social/${uid}/pendientes/${other}`]=pending;patch[`social/${other}/pendientes/${uid}`]=pending;patch[`socialLimits/${uid}/${slot}`]={t:r.serverTimestamp(),dest:other};
  }else{
    const pending=mine.pendientes?.[other],confirmed=mine.confirmados?.[other];
    if(accion==='aceptar'){
      if(!pending||pending.de===uid)throw new Error('Solicitud no disponible.');
      patch[`social/${uid}/confirmados/${other}`]=true;patch[`social/${other}/confirmados/${uid}`]=true;
    }else if(accion==='eliminar'){
      if(!confirmed)throw new Error('Solicitud no disponible.');patch[`social/${uid}/confirmados/${other}`]=null;patch[`social/${other}/confirmados/${uid}`]=null;
    }else if(!pending||!['rechazar','cancelar'].includes(accion)||accion==='cancelar'&&pending.de!==uid||accion==='rechazar'&&pending.de===uid)throw new Error('Solicitud no disponible.');
    if(accion!=='eliminar'){patch[`social/${uid}/pendientes/${other}`]=null;patch[`social/${other}/pendientes/${uid}`]=null;}
  }
  const counts=await Promise.all([readData(`socialCounts/${uid}`),readData(`socialCounts/${other}`)]);
  for(const [i,person]of [uid,other].entries()){
    const old=counts[i].val();if(!old)throw new Error('Perfil no disponible.');
    const friendsDelta=accion==='aceptar'?1:accion==='eliminar'?-1:0,pendingDelta=accion==='enviar'?1:['aceptar','rechazar','cancelar'].includes(accion)?-1:0;
    const amigos=old.amigos+friendsDelta,pendientes=old.pendientes+pendingDelta;
    if(amigos>SOCIAL.amigosMax||pendientes>SOCIAL.pendientesMax||accion==='enviar'&&amigos>=SOCIAL.amigosMax)throw new Error('Límite de amigos o solicitudes.');
    patch[`socialCounts/${person}`]={amigos,pendientes,otroUid:person===uid?other:uid,accion,fecha:r.serverTimestamp()};
  }
  try{await withDeadline(r.update(r.ref(db),patch));return {ok:true,uid:other};}
  catch(error){if(/permission.denied/i.test(error.code||error.message))throw new Error('Solicitud rechazada. Revisa los límites o reintenta.');throw error;}
}
export async function setPresence(estado='enLinea',sala='') {
  const user=currentUser();if(!user)return;const {r,db}=await databaseService(),ref=r.ref(db,`presencia/${user.uid}`);
  if(getProfile()?.preferencias?.estadoVisible===false){estado='desconectado';sala='';}
  await r.onDisconnect(ref).set({estado:'desconectado',sala:'',t:r.serverTimestamp()});await r.set(ref,{estado,sala,t:r.serverTimestamp()});
}
export async function stopFriends() {
  generation++;for(const stop of [...stops.splice(0),...peerStops.splice(0)])stop();list=[];presence={};seen.clear();
  if(currentUser())try{const {r,db}=await databaseService();await r.onDisconnect(r.ref(db,`presencia/${currentUser().uid}`)).cancel();}catch{}
}
export async function startFriends(changed=()=>{},invite=()=>{}) {
  await stopFriends();onChange=changed;invitationCallback=invite;const user=currentUser();if(!user)return;
  const token=generation,realtime=await databaseService(),r=realtime.r;
  stops.push(r.onValue(r.ref(realtime.db,'.info/serverTimeOffset'),s=>serverOffset=s.val()||0));
  stops.push(r.onValue(r.ref(realtime.db,'.info/connected'),s=>{if(s.val())setPresence().catch(()=>{});}));
  stops.push(r.onValue(r.ref(realtime.db,`social/${user.uid}`),async snapshot=>{
    const revision=++startFriends.revision;
    const social=snapshot.val()||{},entries=[...Object.keys(social.confirmados||{}).map(uid=>[uid,'amigos']),...Object.entries(social.pendientes||{}).map(([uid,p])=>[uid,p.de===user.uid?'pendienteEnviada':'pendienteRecibida'])];
    const profiles=await Promise.all(entries.map(async([uid,estado])=>{const p=await readIdentity(uid);return p?{...p,estado}:null;}));
    if(token!==generation||revision!==startFriends.revision)return;list=profiles.filter(Boolean);for(const stop of peerStops.splice(0))stop();
    for(const p of list.filter(p=>p.estado==='amigos')){let off;const stopPrivacy=r.onValue(r.ref(realtime.db,`users/${p.uid}/preferencias/estadoVisible`),s=>{off?.();off=null;if(s.val()===false){presence[p.uid]=null;onChange(friendList());}else off=r.onValue(r.ref(realtime.db,`presencia/${p.uid}`),snap=>{presence[p.uid]=snap.val();onChange(friendList());},()=>{presence[p.uid]=null;onChange(friendList());});});peerStops.push(()=>{stopPrivacy();off?.();});}onChange(friendList());
  },error=>changed([],authError(error))));
  stops.push(r.onValue(r.ref(realtime.db,`invitaciones/${user.uid}`),snapshot=>{
    snapshot.forEach(s=>{const invitation={id:s.key,...s.val()};if(invitation.caducaEn<=socialNow()){dismissInvitation(s.key).catch(()=>{});return;}if(seen.has(s.key))return;seen.add(s.key);invitationCallback(invitation);});
  }));
}
startFriends.revision=0;
export async function inviteFriend(uid,room) {
  const user=currentUser();if(!user||!friendIds().includes(uid))throw new Error('Solo puedes invitar a amigos.');
  if((await readData(`users/${uid}/preferencias/invitaciones`)).val()===false)throw new Error('No recibe invitaciones.');
  const {r,db}=await databaseService(),ref=r.push(r.ref(db,`invitaciones/${uid}`));
  await withDeadline(r.update(r.ref(db),{[`invitaciones/${uid}/${ref.key}`]:{de:user.uid,nombre:getProfile().nombre,sala:room.code,modo:room.meta.modo,dificultad:room.meta.dificultad,creadoEn:r.serverTimestamp(),caducaEn:socialNow()+SOCIAL.invitacionMs-1000},[`enviadas/${user.uid}/${ref.key}`]:{dest:uid}}));
}
export async function dismissInvitation(id) {const user=currentUser();if(!user)return;const {r,db}=await databaseService(),p=(await readData(`invitaciones/${user.uid}/${id}`)).val();if(p)await withDeadline(r.update(r.ref(db),{[`invitaciones/${user.uid}/${id}`]:null,[`enviadas/${p.de}/${id}`]:null}));}
export async function requestsEnabled(value) {const user=currentUser();if(!user)return;const {r,db}=await databaseService();await withDeadline(r.set(r.ref(db,`users/${user.uid}/preferencias/solicitudes`),!!value));}
export function renderFriends(root,openProfile,inviteRoom=null) {
  root.replaceChildren();const friends=friendList().filter(p=>!inviteRoom||p.estado==='amigos'&&p.presencia!=='desconectado');
  if(!friends.length){root.textContent=inviteRoom?'Ningún amigo en línea.':'Sin amigos ni solicitudes.';return;}
  for(const p of friends){const row=document.createElement('article');row.className='friend-row';const identity=document.createElement('button');identity.append(playerNode(p));identity.onclick=()=>openProfile(p.uid);row.append(identity);
    const status=document.createElement('span');status.textContent=`Nivel ${p.nivel} · ${{enLinea:'En línea',enSala:'En sala',desconectado:'Desconectado'}[p.presencia]}`;row.append(status);
    const actions=inviteRoom?[['INVITAR',null]]:p.estado==='amigos'?[['ELIMINAR','eliminar']]:p.estado==='pendienteRecibida'?[['ACEPTAR','aceptar'],['RECHAZAR','rechazar']]:[['CANCELAR','cancelar']];
    for(const [label,action]of actions){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{button.disabled=true;try{if(inviteRoom)await inviteFriend(p.uid,inviteRoom);else await friendAction(action,p.uid);if(inviteRoom)button.textContent='ENVIADA';}catch(e){button.disabled=false;document.dispatchEvent(new CustomEvent('pasillo-toast',{detail:authError(e)}));}};row.append(button);}root.append(row);
  }
}
