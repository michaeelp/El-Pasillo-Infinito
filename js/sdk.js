import { FIREBASE_CONFIG, ONLINE } from './config.js?v=1.2.0';
let appPromise;
export const isConfigured = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
export function withDeadline(promise, ms = ONLINE.networkMs) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('Sin respuesta de la red.')), ms);})]).finally(() => clearTimeout(timer));
}
export function firebaseApp() {
  if (!isConfigured()) return Promise.reject(new Error('Firebase no configurado.'));
  if (!appPromise) appPromise = import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js').then(sdk => sdk.getApps()[0] || sdk.initializeApp(FIREBASE_CONFIG)).catch(error => {appPromise = null; throw error;});
  return withDeadline(appPromise);
}
