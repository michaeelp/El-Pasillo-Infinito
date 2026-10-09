// UID + categoría forman la clave del récord. La transacción conserva el mayor
// incluso con dos pestañas guardando a la vez; el equipo cooperativo lo valida Functions.
import {REEMPLAZAR_SOLO_SI_MEJOR,DIFFICULTIES} from './config.js?v=1.3.0';
import {currentUser} from './auth.js?v=1.3.0';
import {firestoreService,withDeadline,callServer} from './sdk.js?v=1.3.0';
export const collectionName=(mode,d)=>{if(!['solo','race','coop'].includes(mode)||!DIFFICULTIES[d])throw new Error('Categoría inválida.');return `records_${mode==='race'?'carrera':mode}_${d}`;};
export function leaderboardError(error) {const c=error?.code||'';return /permission-denied/.test(c)?'Revisa las reglas de Firestore.':/failed-precondition/.test(c)?'Falta un índice de Firestore.':/unavailable|deadline-exceeded|offline/.test(c)?'Sin conexión. Reintenta.':'No se pudo cargar. Reintenta.';}
export async function teamId(uids) {const text=[...uids].sort().join('|'),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
export async function publishRecord({modo='solo',dificultad='normal',puntuacion=0,personalizada=false,sala,partida}) {
  const user=currentUser();if(!user||personalizada)return {status:'local',message:personalizada?'Semilla personalizada.':'Récord local.'};
  if(puntuacion<1)return {status:'global',message:'Sin récord.'};
  try{
    if(modo==='coop'){await callServer('publishCoopRecord',{sala,partida});return {status:'global',message:'Récord guardado.'};}
    const {f,db}=await firestoreService(),profileRef=f.doc(db,'users',user.uid),ref=f.doc(db,collectionName(modo,dificultad),user.uid);
    const better=await withDeadline(f.runTransaction(db,async tx=>{
      const [profile,record]=await Promise.all([tx.get(profileRef),tx.get(ref)]);if(!profile.exists())throw new Error('Perfil no disponible.');
      if(REEMPLAZAR_SOLO_SI_MEJOR&&record.exists()&&record.data().puntuacion>=puntuacion)return false;
      const p=profile.data();tx.set(ref,{uid:user.uid,nombre:p.nombre,avatar:p.avatar,nivel:p.nivel,puntuacion,fecha:f.serverTimestamp(),dificultad});return true;
    }));return {status:'global',message:better?'Récord guardado.':'Se conserva tu mejor récord.'};
  }catch(e){return {status:'pending',message:leaderboardError(e)};}
}
// Los empates comparten puesto. El conteo permite enseñar el puesto propio fuera del top 50.
export async function globalScores(mode='solo',d='normal',friends=null) {
  const {f,db}=await firestoreService(),collection=f.collection(db,collectionName(mode,d)),user=currentUser();
  const rank=async score=>1+(await f.getCountFromServer(f.query(collection,f.where('puntuacion','>',score)))).data().count;
  let entries=[];
  if(friends){
    const ids=[...new Set([user?.uid,...friends].filter(Boolean))];
    for(let i=0;i<ids.length;i+=30){const chunk=ids.slice(i,i+30),query=f.query(collection,f.where(mode==='coop'?'miembros':f.documentId(),mode==='coop'?'array-contains-any':'in',chunk),f.orderBy('puntuacion','desc'));const snap=await withDeadline(f.getDocsFromServer(query));entries.push(...snap.docs.map(s=>({id:s.id,...s.data()})));}
    entries=[...new Map(entries.map(e=>[e.id,e])).values()].sort((a,b)=>b.puntuacion-a.puntuacion||a.id.localeCompare(b.id));
    entries=entries.map((e,i,list)=>({...e,puesto:1+list.filter(s=>s.puntuacion>e.puntuacion).length}));
  }else {const snap=await withDeadline(f.getDocsFromServer(f.query(collection,f.orderBy('puntuacion','desc'),f.limit(50))));entries=snap.docs.map(s=>({id:s.id,...s.data()}));entries=entries.map((e,i,list)=>({...e,puesto:1+list.filter(s=>s.puntuacion>e.puntuacion).length}));}
  let own=null;
  if(user){if(mode==='coop'){const snap=await withDeadline(f.getDocsFromServer(f.query(collection,f.where('miembros','array-contains',user.uid),f.orderBy('puntuacion','desc'),f.limit(1))));if(snap.docs[0])own={id:snap.docs[0].id,...snap.docs[0].data()};}
    else {const snap=await withDeadline(f.getDocFromServer(f.doc(collection,user.uid)));if(snap.exists())own={id:snap.id,...snap.data()};}
    if(own)own.puesto=friends?1+entries.filter(e=>e.puntuacion>own.puntuacion).length:await withDeadline(rank(own.puntuacion));
  }
  return {entries:entries.slice(0,50),own};
}
