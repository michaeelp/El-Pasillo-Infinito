import { firebaseApp, isConfigured, withDeadline } from './sdk.js?v=1.2.0';
import { sanitizeName } from './storage.js?v=1.2.0';
export { isConfigured };
let connection;
async function connect() {
  if (!isConfigured()) throw new Error('Firebase no configurado.');
  if (!connection) connection = (async () => {
    const app = await firebaseApp(), sdk = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    return {f:sdk, db:sdk.getFirestore(app)};
  })().catch(error => {connection=null;throw error;});
  return withDeadline(connection);
}
const collections = {solo:'scores',race:'scores_carrera',coop:'scores_coop'};
export function leaderboardError(error) {
  const code=String(error?.code||'').replace('firestore/','');
  if(code==='permission-denied')return 'Firebase rechazó el acceso. Revisa las reglas de Firestore.';
  if(code==='not-found')return 'No existe la base de Firestore.';
  if(code==='failed-precondition')return 'Revisa la configuración de Firestore.';
  if(code==='invalid-argument')return 'Récord inválido.';
  if(code==='already-exists')return 'Este resultado ya tiene un récord.';
  if(!isConfigured())return 'Firebase no configurado.';
  return 'Sin conexión con Firestore. Reintenta.';
}
const maximum = mode => mode==='race'?50000:500;
export async function globalScores(mode='solo') {
  if(!collections[mode])throw Object.assign(new Error('Modo inválido.'),{code:'invalid-argument'});
  const c=await connect(),snap=await withDeadline(c.f.getDocsFromServer(c.f.query(c.f.collection(c.db,collections[mode]),c.f.orderBy('p','desc'),c.f.limit(10))));
  return snap.docs.map(d=>d.data()).filter(s=>typeof s.n==='string'&&Number.isInteger(s.p)&&s.p>=1&&s.p<=maximum(mode)).map(s=>({...s,n:sanitizeName(s.n),a:Number.isInteger(s.a)&&s.a>=1&&s.a<=8?s.a:1}));
}
export async function publishScore(name, score, avatar=1, mode='solo', team=[], id=crypto.randomUUID()) {
  if(score===0)return {status:'local',message:'Sin pasillos superados.'};
  if(!collections[mode]||!Number.isInteger(score)||score<1||score>maximum(mode)||!Number.isInteger(avatar)||avatar<1||avatar>8||!/^[-A-Za-z0-9_]{1,180}$/.test(id))return {status:'local',message:'Récord inválido.'};
  const record={n:sanitizeName(name),p:score,a:avatar};
  if(mode==='coop')record.equipo=team.map(p=>({n:sanitizeName(p.nombre),a:p.avatar}));
  const matches = data => data?.n===record.n&&data.p===record.p&&data.a===record.a&&(data.equipo||[]).length===(record.equipo||[]).length&&(data.equipo||[]).every((p,i)=>p.n===record.equipo[i].n&&p.a===record.equipo[i].a);
  let c,ref;
  try {
    c=await connect();ref=c.f.doc(c.db,collections[mode],id);
    const existing=await withDeadline(c.f.getDocFromServer(ref));
    if(existing.exists()){
      if(matches(existing.data()))return {status:'global',message:'Récord guardado.'};
      throw Object.assign(new Error('Resultado ya guardado.'),{code:'already-exists'});
    }
    await withDeadline(c.f.setDoc(ref,{...record,t:c.f.serverTimestamp()}));
    return {status:'global',message:'Récord guardado.'};
  } catch(error) {
    if(c&&ref&&String(error.code).includes('permission-denied')){
      try{const existing=await withDeadline(c.f.getDocFromServer(ref));if(existing.exists()&&matches(existing.data()))return {status:'global',message:'Récord guardado.'};}catch{}
    }
    return {status:'pending',message:leaderboardError(error)};
  }
}
