// Las doce categorías viven en RTDB, con índice de puntuación y reglas de identidad.
import {REEMPLAZAR_SOLO_SI_MEJOR,DIFFICULTIES} from './config.js?v=1.4.0';
import {currentUser} from './auth.js?v=1.4.0';
import {databaseService,readData,withDeadline} from './sdk.js?v=1.4.0';
export const collectionName=(mode,d)=>{if(!['solo','race','coop'].includes(mode)||!DIFFICULTIES[d])throw new Error('Categoría inválida.');return `records_${mode==='race'?'carrera':mode}_${d}`;};
export function leaderboardError(error){const c=error?.code||error?.message||'';return /permission.denied/i.test(c)?'Revisa las reglas de Realtime Database.':/unavailable|deadline|offline|Sin respuesta/i.test(c)?'Sin conexión. Reintenta.':'No se pudo cargar. Reintenta.';}
// RTDB puede validar esta clave canónica; no puede calcular SHA-256 en sus reglas.
export const teamId=async uids=>[...uids].sort().join('|');
export async function publishRecord({modo='solo',dificultad='normal',puntuacion=0,personalizada=false,sala,partida}){
  const user=currentUser();if(!user||personalizada)return {status:'local',message:personalizada?'Semilla personalizada.':'Récord local.'};
  if(puntuacion<1)return {status:'global',message:'Sin récord.'};
  try{
    const {r,db}=await databaseService(),category=collectionName(modo,dificultad);
    if(modo==='coop'){
      const [meta,players]=await Promise.all([readData(`rooms/${sala}/meta`),readData(`rooms/${sala}/jugadores`)]),m=meta.val(),members=Object.keys(players.val()||{}).sort();
      if(!m||m.modo!=='coop'||m.estado!=='podium'||m.match!==partida||m.personalizada||!members.includes(user.uid)||members.length!==3)throw new Error('Partida no válida.');
      const id=await teamId(members),owner=members[0],p=(await readData(`users/${owner}`)).val(),previous=(await readData(`${category}/${id}`)).val();
      if(REEMPLAZAR_SOLO_SI_MEJOR&&previous?.puntuacion>=m.pasillos)return {status:'global',message:'Se conserva el mejor récord.'};
      const record={uid:owner,nombre:p.nombre,avatar:p.avatar,nivel:p.nivel,puntuacion:m.pasillos,fecha:r.serverTimestamp(),dificultad,miembros:members,sala,partida},patch={[`${category}/${id}`]:record};
      for(const uid of members)patch[`equipos/${uid}/${dificultad}/${id}`]=true;
      try{await withDeadline(r.update(r.ref(db),patch));}catch(error){const committed=(await readData(`${category}/${id}`)).val();if(!committed||committed.puntuacion<m.pasillos)throw error;}
      return {status:'global',message:'Récord guardado.'};
    }
    const p=(await readData(`users/${user.uid}`)).val();if(!p)throw new Error('Perfil no disponible.');
    const result=await withDeadline(r.runTransaction(r.ref(db,`${category}/${user.uid}`),previous=>{
      if(REEMPLAZAR_SOLO_SI_MEJOR&&previous?.puntuacion>=puntuacion)return;
      return {uid:user.uid,nombre:p.nombre,avatar:p.avatar,nivel:p.nivel,puntuacion,fecha:r.serverTimestamp(),dificultad};
    },{applyLocally:false}));
    return {status:'global',message:result.committed?'Récord guardado.':'Se conserva tu mejor récord.'};
  }catch(error){return {status:'pending',message:leaderboardError(error)};}
}
const entriesFrom=s=>Object.entries(s.val()||{}).map(([id,p])=>({id,...p}));
const sorted=list=>list.sort((a,b)=>b.puntuacion-a.puntuacion||a.id.localeCompare(b.id));
export async function globalScores(mode='solo',d='normal',friends=null){
  const {r,db}=await databaseService(),category=collectionName(mode,d),ref=r.ref(db,category),user=currentUser();
  const recordsFor=async uid=>{
    if(mode!=='coop'){const s=await readData(`${category}/${uid}`);return s.exists()?[{id:uid,...s.val()}]:[];}
    const ids=Object.keys((await readData(`equipos/${uid}/${d}`)).val()||{});
    return (await Promise.all(ids.map(async id=>{const s=await readData(`${category}/${id}`);return s.exists()?{id,...s.val()}:null;}))).filter(Boolean);
  };
  let entries;
  if(friends){const ids=[...new Set([user?.uid,...friends].filter(Boolean))],all=(await Promise.all(ids.map(recordsFor))).flat();entries=sorted([...new Map(all.map(e=>[e.id,e])).values()]);}
  else entries=sorted(entriesFrom(await withDeadline(r.get(r.query(ref,r.orderByChild('puntuacion'),r.limitToLast(50))))));
  entries=entries.map((e,i,list)=>({...e,puesto:1+list.filter(p=>p.puntuacion>e.puntuacion).length}));
  let own=user?sorted(await recordsFor(user.uid))[0]||null:null;
  if(own){const greater=friends?entries.filter(p=>p.puntuacion>own.puntuacion).length:Object.keys((await withDeadline(r.get(r.query(ref,r.orderByChild('puntuacion'),r.startAt(own.puntuacion+1))))).val()||{}).length;own={...own,puesto:1+greater};}
  return {entries:entries.slice(0,50),own};
}
