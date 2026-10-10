// Authentication conserva la sesión; RTDB reserva la identidad con reglas atómicas.
// El modo invitado queda separado incluso si llega tarde un callback de persistencia.
import {USERNAMES} from './config.js?v=1.4.0';
import {firebaseApp,readData,withDeadline} from './sdk.js?v=1.4.0';
import {provisionAccount,cleanupAccount,finishCleanup} from './accounts.js?v=1.4.0';
let service,sdk,ready,guest=false;
const subscribers=new Set();
const beforeExit=new Set();
export const onBeforeSignOut=callback=>{beforeExit.add(callback);return ()=>beforeExit.delete(callback);};
export const currentUser=()=>!guest&&!service?.currentUser?.isAnonymous?service?.currentUser || null:null;
export const isGuest=()=>guest || !currentUser();
export function validateUsername(value) {
  const name=String(value).normalize('NFKC').trim(),lower=name.toLowerCase();
  if(!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_]{3,14}$/.test(name))throw new Error('Nombre: 3–14 letras, números o _.');
  if(USERNAMES.reservados.includes(lower)||USERNAMES.ofensivos.some(word=>lower.includes(word)))throw new Error('Nombre no permitido.');
  return name;
}
export function authError(error) {
  const code=String(error?.code||'');
  if(/^(Nombre|Elige|Solicitud|Límite|Ya sois|No recibe|Perfil|Partida|Sala|Equipo|Avatar|Jugador|Cuenta|Contraseña|Almas|Ya lo tienes|Requisito|Objeto|Inicia sesión|Carga el catálogo|Recarga la tienda|Atajo)/.test(error?.message||''))return error.message;
  if(code.includes('invalid-email'))return 'Correo inválido.';
  if(code.includes('email-already-in-use'))return 'Correo en uso.';
  if(/invalid-credential|wrong-password|user-not-found/.test(code))return 'Correo o contraseña incorrectos.';
  if(/weak-password/.test(code))return 'Contraseña: mínimo 8 caracteres.';
  if(/user-disabled/.test(code))return 'Cuenta desactivada.';
  if(/too-many-requests|resource-exhausted/.test(code))return 'Espera antes de reintentar.';
  if(/network-request-failed|unavailable|deadline-exceeded/.test(code)||/Sin respuesta|Failed to fetch/i.test(error?.message||''))return 'Sin conexión. Reintenta.';
  if(/operation-not-allowed/.test(code))return 'Activa Email/Contraseña en Firebase.';
  if(/requires-recent-login|unauthenticated/.test(code))return 'Vuelve a iniciar sesión.';
  if(/permission.denied/i.test(code)||/permission.denied/i.test(error?.message||''))return 'Revisa las reglas de Realtime Database.';
  return 'No se pudo completar. Reintenta.';
}
export function onSession(callback) {subscribers.add(callback);return ()=>subscribers.delete(callback);}
export function initAuth() {
  if(ready)return ready;
  ready=withDeadline((async()=>{
    sdk=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');service=sdk.getAuth(await firebaseApp());service.languageCode='es';
    await sdk.setPersistence(service,sdk.browserLocalPersistence);
    await new Promise(resolve=>{let first=true;sdk.onAuthStateChanged(service,user=>{for(const cb of subscribers)cb(currentUser());if(first){first=false;resolve();}});});
    // Las antiguas sesiones anónimas no tienen acceso a los datos online.
    if(service.currentUser?.isAnonymous)await sdk.signOut(service);
    return currentUser();
  })()).catch(e=>{ready=null;throw e;});return ready;
}
export async function signIn(email,password) {await initAuth();guest=false;const {user}=await sdk.signInWithEmailAndPassword(service,email.trim(),password);if((await readData(`accountCleanup/${user.uid}`)).exists()){await completeDeletion(user);throw new Error('Cuenta eliminada.');}return user;}
export async function createAccount(email,password,username) {
  const nombre=validateUsername(username);if(password.length<8)throw new Error('Contraseña: mínimo 8 caracteres.');
  await initAuth();guest=false;const {user}=await sdk.createUserWithEmailAndPassword(service,email.trim(),password);
  try {await provisionAccount(user.uid,nombre);return user;}
  catch(error) {
    // Si la respuesta se pierde después del commit, comprobar antes de compensar.
    let snap;
    try{snap=await readData(`users/${user.uid}`);}catch{}
    if(snap?.exists())return user;
    if(snap&&!/unavailable|deadline-exceeded/.test(error.code||''))await sdk.deleteUser(user).catch(()=>{});
    throw error;
  }
}
export async function completeAccount(name) {if(!currentUser())throw new Error('Inicia sesión.');return provisionAccount(currentUser().uid,validateUsername(name));}
export async function playAsGuest() {await initAuth().catch(()=>{});guest=true;if(service?.currentUser)await sdk.signOut(service);for(const cb of subscribers)cb(null);}
export async function signOut() {
  for(const callback of beforeExit)await callback();
  if(currentUser()){try{const friends=await import('./friends.js?v=1.4.0');await friends.setPresence('desconectado');await friends.stopFriends();}catch{}}
  if(service)await sdk.signOut(service);guest=false;
}
export async function resetPassword(email) {await initAuth();await sdk.sendPasswordResetEmail(service,email.trim());}
async function reauthenticate(password) {const user=currentUser();if(!user)throw new Error('Inicia sesión.');await sdk.reauthenticateWithCredential(user,sdk.EmailAuthProvider.credential(user.email,password));}
export async function changePassword(current,newPassword) {if(newPassword.length<8)throw new Error('Contraseña: mínimo 8 caracteres.');await reauthenticate(current);await sdk.updatePassword(currentUser(),newPassword);}
export async function deleteAccount(password) {
  await reauthenticate(password);for(const callback of beforeExit)await callback();
  const friends=await import('./friends.js?v=1.4.0');await friends.stopFriends();await completeDeletion(currentUser());
}
export async function resumeDeletion(){const user=currentUser();if(!user)return;let pending=false;try{pending=localStorage.getItem(`pasillo-delete-${user.uid}`)==='1';}catch{}if(pending||(await readData(`accountCleanup/${user.uid}`)).exists()||(await readData(`deletedAccounts/${user.uid}`)).exists()){await completeDeletion(user);throw new Error('Cuenta eliminada.');}}
async function completeDeletion(user){
  try{localStorage.setItem(`pasillo-delete-${user.uid}`,'1');}catch{}
  await cleanupAccount(user.uid);await finishCleanup(user.uid);await sdk.deleteUser(user);
  try{localStorage.removeItem(`pasillo-delete-${user.uid}`);}catch{}guest=false;for(const cb of subscribers)cb(null);
}
