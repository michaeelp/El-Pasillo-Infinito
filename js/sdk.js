import { FIREBASE_CONFIG, ONLINE } from './config.js?v=1.4.0';
import { APP_CHECK } from './config.js?v=1.4.0';
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
let databasePromise;
export function databaseService() {
  return databasePromise ||= Promise.all([firebaseApp(),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')]).then(([app,r])=>({r,db:r.getDatabase(app)})).catch(e=>{databasePromise=null;throw e;});
}
// No hay servidor propio: Authentication y RTDB usan sus reglas del plan Spark.
export async function readData(path) {const {r,db}=await databaseService();return withDeadline(r.get(r.ref(db,path)));}
