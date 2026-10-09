// Firestore conserva solicitudes; RTDB aporta presencia e invitaciones en tiempo real.
// generation/revision descartan respuestas antiguas al cambiar de cuenta o de lista.
import {SOCIAL} from './config.js?v=1.3.0';
import {currentUser,authError} from './auth.js?v=1.3.0';
import {firestoreService,databaseService,callServer,withDeadline} from './sdk.js?v=1.3.0';
import {readProfile,playerNode,getProfile} from './profile.js?v=1.3.0';
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
export const sendRequest=etiqueta=>callServer('socialAction',{accion:'enviar',etiqueta});
export const friendAction=(accion,otroUid)=>callServer('socialAction',{accion,otroUid});
export async function setPresence(estado='enLinea',sala='') {
  const user=currentUser();if(!user)return;const {r,db}=await databaseService(),ref=r.ref(db,`presencia/${user.uid}`);
  await r.onDisconnect(ref).set({estado:'desconectado',sala:'',t:r.serverTimestamp()});await r.set(ref,{estado,sala,t:r.serverTimestamp()});
}
export async function stopFriends() {
  generation++;for(const stop of [...stops.splice(0),...peerStops.splice(0)])stop();list=[];presence={};seen.clear();
}
export async function startFriends(changed=()=>{},invite=()=>{}) {
  await stopFriends();onChange=changed;invitationCallback=invite;const user=currentUser();if(!user)return;
  const token=generation,{f,db}=await firestoreService(),realtime=await databaseService(),r=realtime.r;
  stops.push(r.onValue(r.ref(realtime.db,'.info/serverTimeOffset'),s=>serverOffset=s.val()||0));
  stops.push(r.onValue(r.ref(realtime.db,'.info/connected'),s=>{if(s.val())setPresence().catch(()=>{});}));
  stops.push(f.onSnapshot(f.collection(db,'users',user.uid,'amigos'),async snapshot=>{
    const revision=++startFriends.revision;
    const profiles=await Promise.all(snapshot.docs.map(async doc=>{const p=await readProfile(doc.id);return p?{...p,estado:doc.data().estado}:null;}));
    if(token!==generation||revision!==startFriends.revision)return;list=profiles.filter(Boolean);for(const stop of peerStops.splice(0))stop();
    for(const p of list.filter(p=>p.estado==='amigos'))peerStops.push(r.onValue(r.ref(realtime.db,`presencia/${p.uid}`),snap=>{presence[p.uid]=snap.val();onChange(friendList());}));onChange(friendList());
  },error=>changed([],authError(error))));
  stops.push(r.onValue(r.ref(realtime.db,`invitaciones/${user.uid}`),snapshot=>{
    snapshot.forEach(s=>{const invitation={id:s.key,...s.val()};if(invitation.caducaEn<=socialNow()||seen.has(s.key))return;seen.add(s.key);invitationCallback(invitation);});
  }));
}
startFriends.revision=0;
export async function inviteFriend(uid,room) {
  const user=currentUser();if(!user||!friendIds().includes(uid))throw new Error('Solo puedes invitar a amigos.');
  const {r,db}=await databaseService(),ref=r.push(r.ref(db,`invitaciones/${uid}`));
  await withDeadline(r.set(ref,{de:user.uid,nombre:getProfile().nombre,sala:room.code,modo:room.meta.modo,dificultad:room.meta.dificultad,creadoEn:r.serverTimestamp(),caducaEn:socialNow()+SOCIAL.invitacionMs}));
}
export async function dismissInvitation(id) {const user=currentUser();if(!user)return;const {r,db}=await databaseService();await r.remove(r.ref(db,`invitaciones/${user.uid}/${id}`));}
export async function requestsEnabled(value) {const user=currentUser();if(!user)return;const {f,db}=await firestoreService();await withDeadline(f.updateDoc(f.doc(db,'users',user.uid),{'preferencias.solicitudes':value}));}
export function renderFriends(root,openProfile,inviteRoom=null) {
  root.replaceChildren();const friends=friendList().filter(p=>!inviteRoom||p.estado==='amigos'&&p.presencia!=='desconectado');
  if(!friends.length){root.textContent=inviteRoom?'Ningún amigo en línea.':'Sin amigos ni solicitudes.';return;}
  for(const p of friends){const row=document.createElement('article');row.className='friend-row';const identity=document.createElement('button');identity.append(playerNode(p));identity.onclick=()=>openProfile(p.uid);row.append(identity);
    const status=document.createElement('span');status.textContent=`Nivel ${p.nivel} · ${{enLinea:'En línea',enSala:'En sala',desconectado:'Desconectado'}[p.presencia]}`;row.append(status);
    const actions=inviteRoom?[['INVITAR',null]]:p.estado==='amigos'?[['ELIMINAR','eliminar']]:p.estado==='pendienteRecibida'?[['ACEPTAR','aceptar'],['RECHAZAR','rechazar']]:[['CANCELAR','cancelar']];
    for(const [label,action]of actions){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{button.disabled=true;try{if(inviteRoom)await inviteFriend(p.uid,inviteRoom);else await friendAction(action,p.uid);if(inviteRoom)button.textContent='ENVIADA';}catch(e){button.disabled=false;document.dispatchEvent(new CustomEvent('pasillo-toast',{detail:authError(e)}));}};row.append(button);}root.append(row);
  }
}
