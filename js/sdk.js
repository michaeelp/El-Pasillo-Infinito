import { FIREBASE_CONFIG, ONLINE } from './config.js?v=1.3.0';
import { FUNCTIONS_REGION,APP_CHECK } from './config.js?v=1.3.0';
let appPromise;
export const isConfigured = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
export function withDeadline(promise, ms = ONLINE.networkMs) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('Sin respuesta de la red.')), ms);})]).finally(() => clearTimeout(timer));
}
export function firebaseApp() {
  if (!isConfigured()) return Promise.reject(new Error('Firebase no configurado.'));
  if (!appPromise) appPromise = import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js').then(async sdk => {
    const app=sdk.getApps()[0] || sdk.initializeApp(FIREBASE_CONFIG);
    if(APP_CHECK.siteKey){const check=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js');check.initializeAppCheck(app,{provider:new check.ReCaptchaV3Provider(APP_CHECK.siteKey),isTokenAutoRefreshEnabled:true});}
    return app;
  }).catch(error => {appPromise = null; throw error;});
  return withDeadline(appPromise);
}
let firestorePromise, databasePromise;
export function firestoreService() {
  return firestorePromise ||= Promise.all([firebaseApp(),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]).then(([app,f])=>({f,db:f.getFirestore(app)})).catch(e=>{firestorePromise=null;throw e;});
}
export function databaseService() {
  return databasePromise ||= Promise.all([firebaseApp(),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')]).then(([app,r])=>({r,db:r.getDatabase(app)})).catch(e=>{databasePromise=null;throw e;});
}
export async function callServer(name,data={}) {
  const app=await firebaseApp(), f=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js');
  return (await f.httpsCallable(f.getFunctions(app,FUNCTIONS_REGION),name,{timeout:60000})(data)).data;
}
