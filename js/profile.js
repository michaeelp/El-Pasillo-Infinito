import {VERSION,AVATAR_COUNT,DIFFICULTIES} from './config.js?v=1.4.0';
import {currentUser,authError} from './auth.js?v=1.4.0';
import {cosmetic,coinNode} from './economy.js?v=1.4.0';
import {background} from './background.js?v=1.4.0';
import {databaseService,readData} from './sdk.js?v=1.4.0';
import {normalizeProfile,setAvatar} from './accounts.js?v=1.4.0';
import {levelFor,ACHIEVEMENTS,emptyStats} from './xp.js?v=1.4.0';
export let avatars=[];
let profile={nombre:'Invitado',avatar:1,xp:0,nivel:1,estadisticas:emptyStats()},stop;
export async function loadProfile() {
  if(!avatars.length){const response=await fetch(`avatars.json?v=${VERSION}`);if(!response.ok)throw new Error('No se cargaron los avatares.');avatars=await response.json();if(avatars.length!==AVATAR_COUNT)throw new Error('Catálogo de avatares incompleto.');}
  return refreshProfile();
}
export async function refreshProfile(onChange=()=>{}) {
  stop?.();stop=null;const user=currentUser();
  if(!user){profile={nombre:'Invitado',avatar:1,xp:0,nivel:1,estadisticas:emptyStats()};onChange(getProfile());return getProfile();}
  const {r,db}=await databaseService(),ref=r.ref(db,`users/${user.uid}`),snap=await readData(`users/${user.uid}`);
  if(!snap.exists()){profile=null;return null;}
  profile={uid:user.uid,...normalizeProfile(snap.val())};
  stop=r.onValue(ref,s=>{if(s.exists()){profile={uid:user.uid,...normalizeProfile(s.val())};onChange(getProfile());}},()=>{});return getProfile();
}
export const getProfile=()=>profile?structuredClone(profile):null;
export async function readProfile(uid) {try{const snap=await readData(`users/${uid}`);return snap.exists()?{uid,...normalizeProfile(snap.val())}:null;}catch(e){if(/permission/i.test(e.code||e.message))throw new Error('Perfil privado.');throw e;}}
const identities=new Map(),identityRequests=new Map();
export async function readIdentity(uid){if(uid===currentUser()?.uid)return getProfile();if(identityRequests.has(uid))return identityRequests.get(uid);const promise=Promise.all(['nombre','avatar','nivel','equipado'].map(async key=>[key,(await readData(`users/${uid}/${key}`)).val()])).then(entries=>{const p={uid,...Object.fromEntries(entries)};if(!p.nombre)return null;identities.set(uid,p);return p;}).finally(()=>identityRequests.delete(uid));identityRequests.set(uid,promise);return promise;}
export function avatarNode(player={},small=false,role='') {
  const avatar=avatars.find(item=>item.id===(player.avatar||player.a))||avatars[0],root=document.createElement('span');root.className=`avatar${small?' small':''}`;
  root.style.setProperty('--avatar-color',avatar?.color||'#88c1a0');const fallback=document.createElement('span');fallback.textContent=String(player.nombre||player.n||'Jugador').slice(0,1);root.append(fallback);
  if(avatar){const image=document.createElement('img');image.alt=avatar.nombre;image.src=`${small?avatar.ruta.replace('.webp','-64.webp'):avatar.ruta}?v=${VERSION}`;image.onerror=()=>{if(image.dataset.fallback)image.remove();else{image.dataset.fallback='1';image.src=image.src.replace('.webp','.png');}};root.append(image);}
  const frame=cosmetic(player.equipado?.marco);if(frame?.tipo==='marco'){root.classList.add('framed');const img=document.createElement('img');img.className='cosmetic-frame';img.src=`${frame.archivo}?v=${VERSION}`;img.alt=frame.nombre;img.onerror=()=>{img.onerror=null;img.src=img.src.replace('.webp','.png');};root.append(img);}
  if(role){const badge=document.createElement('span');badge.className='role-badge';badge.textContent={vigia:'◉',bibliotecario:'▤',dibujante:'✎'}[role];badge.title={vigia:'Vigía',bibliotecario:'Bibliotecario',dibujante:'Dibujante'}[role];root.append(badge);}return root;
}
export function playerNode(player={},small=true,role='') {
  const hydrate=player.uid&&currentUser()&&player.uid!==currentUser().uid&&!player.equipado;
  if(player.uid===currentUser()?.uid&&!player.equipado)player={...player,equipado:getProfile()?.equipado};else if(player.uid&&!player.equipado&&identities.has(player.uid))player={...player,equipado:identities.get(player.uid).equipado};
  const root=document.createElement('span');root.className='player-identity';const name=document.createElement('span');name.textContent=player.nombre||player.n||'Jugador';const title=cosmetic(player.equipado?.titulo),text=document.createElement('span');text.className='identity-text';text.append(name);if(title?.tipo==='titulo'){const sub=document.createElement('span');sub.className='cosmetic-title';sub.textContent=title.nombre;text.append(sub);}root.append(avatarNode(player,small,role),text);
  if(hydrate)readIdentity(player.uid).then(p=>{if(p&&root.isConnected)root.replaceChildren(...playerNode({...player,equipado:p.equipado||{}},small,role).childNodes);}).catch(()=>{});return root;
}
function textRow(root,label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;root.append(dt,dd);}
export async function setupProfile(onBack,onSave,blocked=[],beforeSave=null,uid=currentUser()?.uid,monsters=[]) {
  if(!uid)throw new Error('Inicia sesión.');const $=id=>document.getElementById(id),own=uid===currentUser()?.uid,p=own?getProfile():await readProfile(uid);
  if(!p)throw new Error('Perfil no disponible.');let selected=p.avatar;
  $('profile-back').onclick=onBack;$('profile-name').replaceChildren(playerNode(p,false));$('profile-coins').replaceChildren(coinNode(p.monedas));$('profile-level').textContent=`Nivel ${p.nivel}`;const bg=cosmetic(p.equipado?.fondo);if(bg?.tipo==='fondo')background.profile(bg.archivo);
  const progress=levelFor(p.xp);$('profile-xp').max=progress.necesaria;$('profile-xp').value=p.nivel===99?progress.necesaria:progress.actual;$('profile-xp-label').textContent=p.nivel===99?'Nivel máximo':`${progress.actual} / ${progress.necesaria} XP`;
  const s={...emptyStats(),...p.estadisticas};$('profile-stats').replaceChildren();
  for(const [label,value]of [['Partidas',s.partidas],['Pasillos',s.pasillos],['Precisión media',`${s.precisionMuestras?Math.round(s.precisionTotal/s.precisionMuestras/10):0} %`],['Tiempo',`${Math.floor(s.tiempoMs/60000)} min`],['Racha máxima',s.rachaMax],['Victorias en carrera',s.carrerasGanadas],['Cooperativas',s.cooperativas]])textRow($('profile-stats'),label,value);
  $('profile-bests').replaceChildren();for(const [key,value]of Object.entries(s.mejores))textRow($('profile-bests'),`${{solo:'Solo',race:'Carrera',coop:'Cooperativo'}[key.split('_')[0]]} · ${DIFFICULTIES[key.split('_')[1]]?.nombre||''}`,value);
  if(!Object.keys(s.mejores).length)$('profile-bests').textContent='Sin récords.';
  $('achievements').replaceChildren(...ACHIEVEMENTS.map(([id,icon,name])=>{const span=document.createElement('span');span.className=s.logros.includes(id)?'achievement unlocked':'achievement';span.textContent=`${icon} ${name}`;span.title=s.logros.includes(id)?'Conseguido':'Pendiente';return span;}));
  $('bestiary').replaceChildren(...monsters.map(m=>{const item=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption'),b=s.bestiario[m.id];item.className=b?'':'unseen';image.src=m.imagen;image.alt=b?m.nombre:'Sin descubrir';caption.textContent=b?`${m.nombre} · ${b.vistos} / ${b.vencidos}`:'Sin descubrir';item.append(image,caption);return item;}));
  function preview(){$('avatar-preview').replaceChildren(avatarNode({...p,avatar:selected}));$('avatar-name').textContent=avatars.find(a=>a.id===selected)?.nombre||'';for(const b of $('avatar-grid').children)b.setAttribute('aria-pressed',String(Number(b.dataset.id)===selected));}
  $('avatar-grid').replaceChildren(...avatars.map(a=>{const b=document.createElement('button');b.type='button';b.dataset.id=a.id;b.title=a.nombre;b.setAttribute('aria-label',a.nombre);b.disabled=blocked.includes(a.id);b.append(avatarNode({nombre:a.nombre,avatar:a.id}));b.onclick=()=>{selected=a.id;preview();};return b;}));preview();
  $('avatar-editor').hidden=!own;$('profile-status').textContent='';
  $('profile-form').onsubmit=async e=>{e.preventDefault();const button=$('save-avatar');button.disabled=true;try{if(beforeSave)await beforeSave(p.nombre,selected);await setAvatar(uid,selected);await refreshProfile();$('profile-status').textContent='Guardado.';onSave();}catch(e){$('profile-status').textContent=authError(e);}finally{button.disabled=false;}};
}
