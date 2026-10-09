import { FIREBASE_CONFIG } from './config.js?v=1.0.1';
import { sanitizeName } from './storage.js?v=1.0.0';
let connection=null;
export const isConfigured=()=>!!(FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.projectId&&FIREBASE_CONFIG.appId);
function deadline(promise,ms=6500){let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error('Tiempo de red agotado.')),ms);})]).finally(()=>clearTimeout(t));}
async function connect(){
  if(!isConfigured())return null;
  if(!connection)connection=(async()=>{const [{initializeApp},f]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);return{f,db:f.getFirestore(initializeApp(FIREBASE_CONFIG))};})().catch(()=>{connection=null;return null;});
  return deadline(connection);
}
export async function globalScores(){
  try{const c=await connect();if(!c)return null;const{f,db}=c;const snap=await deadline(f.getDocs(f.query(f.collection(db,'scores'),f.orderBy('p','desc'),f.limit(10))));return snap.docs.map(d=>d.data()).filter(s=>typeof s.n==='string'&&Number.isInteger(s.p)&&s.p>=1&&s.p<=500).map(s=>({...s,n:sanitizeName(s.n)}));}catch{return null;}
}
export async function publishScore(name,score){
  if(score<1||score>500||!isConfigured())return'local';
  try{const c=await connect();if(!c)return'local';const{f,db}=c;await deadline(f.addDoc(f.collection(db,'scores'),{n:sanitizeName(name),p:score,t:f.serverTimestamp()}));return'global';}catch{return'pending';}
}
