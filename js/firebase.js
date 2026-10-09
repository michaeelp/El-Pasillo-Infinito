import { firebaseApp, isConfigured, withDeadline } from './sdk.js?v=1.1.0';
import { sanitizeName } from './storage.js?v=1.1.0';
export { isConfigured };
let connection;
async function connect() {
  if (!isConfigured()) return null;
  if (!connection) connection = (async () => {
    const app = await firebaseApp(), sdk = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    return {f:sdk, db:sdk.getFirestore(app)};
  })().catch(() => {connection=null;return null;});
  return withDeadline(connection);
}
const collections = {solo:'scores',race:'scores_carrera',coop:'scores_coop'};
export async function globalScores(mode='solo') {
  try {
    const c=await connect(); if (!c) return null;
    const snap=await withDeadline(c.f.getDocs(c.f.query(c.f.collection(c.db,collections[mode]),c.f.orderBy('p','desc'),c.f.limit(10))));
    return snap.docs.map(d=>d.data()).filter(s=>typeof s.n==='string'&&Number.isInteger(s.p)&&s.p>=1).map(s=>({...s,n:sanitizeName(s.n)}));
  } catch {return null;}
}
export async function publishScore(name, score, avatar=1, mode='solo', team=[]) {
  const max=mode==='race'?50000:500;
  if (!Number.isInteger(score)||score<1||score>max||!isConfigured()) return 'local';
  try {
    const c=await connect(); if (!c) return 'local';
    const record={n:sanitizeName(name),p:score,a:avatar,t:c.f.serverTimestamp()};
    if (mode==='coop') record.equipo=team.map(p=>({n:sanitizeName(p.nombre),a:p.avatar}));
    await withDeadline(c.f.addDoc(c.f.collection(c.db,collections[mode]),record));return 'global';
  } catch {return 'pending';}
}
