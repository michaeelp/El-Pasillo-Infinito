// Conversión pura de datos 1.3.0 de Firestore a las rutas de RTDB 1.3.1.
import {DIFFICULTIES} from '../js/config.js';
import {emptyStats,levelFor} from '../js/xp.js';
import {validateUsername} from '../js/auth.js';
const millis=value=>typeof value==='number'?value:value?.toMillis?.()??Date.now();
export function migrationPatch({profiles={},friends={},receipts={},records={}}){
 const patch={},counts={},names=new Set(),codes=new Set();
 for(const [uid,source]of Object.entries(profiles)){
  const nombre=validateUsername(source.nombre),lower=nombre.toLowerCase(),code=source.codigoAmigo;
  if(names.has(lower)||codes.has(code)||!/^[A-Z2-9]{6}$/.test(code||''))throw new Error('Conflicto de nombre o código.');names.add(lower);codes.add(code);
  const xp=Math.max(0,Math.round(source.xp||0));
  patch[`users/${uid}`]={nombre,nombreLower:lower,codigoAmigo:code,avatar:source.avatar||1,xp,nivel:levelFor(xp).nivel,creadoEn:millis(source.creadoEn),estadisticas:{...emptyStats(),...source.estadisticas},preferencias:{solicitudes:source.preferencias?.solicitudes!==false},ultimaPartida:source.ultimaPartida||''};
  patch[`usernames/${lower}`]=uid;patch[`friendcodes/${code}`]=uid;counts[uid]={amigos:0,pendientes:0,otroUid:'',accion:'crear',fecha:Date.now()};
  for(const [id,p]of Object.entries(receipts[uid]||{}))patch[`partidas/${uid}/${id}`]={xp:p.xp,fecha:millis(p.fecha),modo:p.modo,dificultad:p.dificultad};
 }
 const pairs=new Set();
 for(const [uid,list]of Object.entries(friends))for(const [other,left]of Object.entries(list)){
  if(!profiles[uid]||!profiles[other]||uid===other)continue;const key=[uid,other].sort().join('|');if(pairs.has(key))continue;pairs.add(key);const right=friends[other]?.[uid];
  if(left.estado==='amigos'&&right?.estado==='amigos'){
   patch[`social/${uid}/confirmados/${other}`]=true;patch[`social/${other}/confirmados/${uid}`]=true;counts[uid].amigos++;counts[other].amigos++;
  }else if(left.estado==='pendienteEnviada'&&right?.estado==='pendienteRecibida'||left.estado==='pendienteRecibida'&&right?.estado==='pendienteEnviada'){
   const de=left.estado==='pendienteEnviada'?uid:other,p={de,fecha:millis(left.fecha),slot:0};patch[`social/${uid}/pendientes/${other}`]=p;patch[`social/${other}/pendientes/${uid}`]=p;counts[uid].pendientes++;counts[other].pendientes++;
  }
 }
 for(const [uid,count]of Object.entries(counts)){if(count.amigos>100||count.pendientes>50)throw new Error('Límite social excedido en origen.');patch[`socialCounts/${uid}`]=count;}
 for(const mode of ['solo','carrera','coop'])for(const d of Object.keys(DIFFICULTIES))for(const [id,source]of Object.entries(records[`records_${mode}_${d}`]||{})){
  let key=id,owner=source.uid;
  const members=mode==='coop'?[...new Set(source.miembros||[])].sort():null;
  if(members){if(members.length!==3||members.some(uid=>!profiles[uid]))continue;key=members.join('|');owner=members[0];}else if(!profiles[owner]||id!==owner)continue;
  if(!Number.isInteger(source.puntuacion)||source.puntuacion<1)continue;
  const p=profiles[owner],record={uid:owner,nombre:p.nombre,avatar:source.avatar||p.avatar||1,nivel:source.nivel||p.nivel||1,puntuacion:source.puntuacion,fecha:millis(source.fecha),dificultad:d};
  if(members){Object.assign(record,{miembros:members,sala:'ARCH',partida:0});for(const uid of members)patch[`equipos/${uid}/${d}/${key}`]=true;}
  const path=`records_${mode}_${d}/${key}`;if(!patch[path]||patch[path].puntuacion<record.puntuacion)patch[path]=record;
 }
 return patch;
}
