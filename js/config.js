export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA9O_zUIjbZ_imUlvQkabXtnFZgVJSHn_U',
  authDomain: 'el-pasillo-infinito.firebaseapp.com',
  databaseURL: 'https://el-pasillo-infinito-default-rtdb.firebaseio.com',
  projectId: 'el-pasillo-infinito',
  storageBucket: 'el-pasillo-infinito.firebasestorage.app',
  messagingSenderId: '274953472552',
  appId: '1:274953472552:web:4bec7187bb8407abbf831d',
  measurementId: 'G-74BM1JDTLW'
};
export const VERSION = '1.3.0';
export const AVATAR_COUNT = 12;
// Tiempos en segundos; Fácil conserva siempre sus valores.
export const DIFFICULTIES = {
  facil: {nombre:'Fácil', fase:75, reduccionFase:0, faseMin:75, flash:1.5, reduccionFlash:0, flashMin:1.5, cuenta:[3,3], top:2, probabilidad:0, vidas:5, xp:0.5},
  normal: {nombre:'Normal', fase:60, reduccionFase:2, faseMin:25, flash:1, reduccionFlash:0.04, flashMin:0.25, cuenta:[3,3], top:1, probabilidad:0, vidas:3, xp:1},
  dificil: {nombre:'Difícil', fase:50, reduccionFase:2.5, faseMin:20, flash:0.8, reduccionFlash:0.05, flashMin:0.2, cuenta:[3,3], top:1, probabilidad:0.25, vidas:2, xp:1.5},
  pesadilla: {nombre:'Pesadilla', fase:40, reduccionFase:3, faseMin:15, flash:0.6, reduccionFlash:0.05, flashMin:0.15, cuenta:[2,4], top:1, probabilidad:0.4, vidas:1, xp:2}
};
export const DEFAULT_DIFFICULTY = 'normal';
export const REEMPLAZAR_SOLO_SI_MEJOR = true;
export const FUNCTIONS_REGION = 'us-central1';
// Clave pública de reCAPTCHA v3; vacío mantiene App Check sin activar.
export const APP_CHECK = {siteKey:''};
// npm run generate:rules copia estos límites a las reglas y las funciones.
export const USERNAMES = {min:3, max:14, reservados:['admin','administrador','firebase','moderador','sistema','invitado'], ofensivos:['puta','puto','mierda','fuck','nazi']};
export const SOCIAL = {amigosMax:100, pendientesMax:50, solicitudesHora:10, invitacionMs:120000};
export const XP = {solo:10, precision:5, coop:5, puntosCarrera:50, puestos:[50,30,15], base:80, exponente:1.35, nivelMax:99, maxPartida:600};
export const MONSTER_COUNT = 30;
export const PRECISION_REF = 0.6;
export const confusables = ['flashlight','sun','fire','candle','lamp'];
export const ASSET_TIMEOUT_MS = 8000;
export const TIEMPO_FASE = 60;
export const TIEMPO_ALERTA = 20;
export const FLASH_INICIAL = 1;
export const FLASH_REDUCCION = 0.04;
export const FLASH_MINIMO = 0.25;
export const FASE_REDUCCION = 2;
export const FASE_MINIMA = 25;
export const duracionFlash = n => Math.max(FLASH_MINIMO, FLASH_INICIAL - FLASH_REDUCCION * (Math.max(1, n) - 1));
export const tiempoFase = n => Math.max(FASE_MINIMA, TIEMPO_FASE - FASE_REDUCCION * (Math.max(1, n) - 1));
export const roundDurations = (n, dificultad = DEFAULT_DIFFICULTY) => {
  const d = DIFFICULTIES[dificultad] || DIFFICULTIES[DEFAULT_DIFFICULTY], avance = Math.max(0,n-1);
  return {flashMs:Math.round(Math.max(d.flashMin,d.flash-d.reduccionFlash*avance)*1000), phaseMs:Math.round(Math.max(d.faseMin,d.fase-d.reduccionFase*avance)*1000)};
};
export const GAME = { countMs: 3000, suspenseMs: 3000, winMs: 2600, loseMs: 1400 };
export const ONLINE = {
  rounds: 10, lives: 3, raceMin: 2, raceMax: 8, coopPlayers: 3,
  revealMs: 8000, leadMs: 1800, reconnectMs: 15000, roomTtlMs: 10800000,
  networkMs: 12000, pollMs: 150, liveMs: 300, chatMs: 1000, whisperMs: 20000,
  maxWritesPerSecond: 8, thumbnailSize: 128, liveSize: 96, maxThumbnail: 20000,
  uniqueAvatars: true, rotateRoles: true,
  verifyDrawings: false, discrepancyMargin: 0.3, verificationMs: 28000
};
export const SCORING = { base: 100, precision: 400, speed: 300, exponent: 1.5, streakStep: 0.1, streakMax: 1.5 };
export const AI = {
  library: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1',
  model: 'Xenova/clip-vit-base-patch32',
  template: 'a rough hand-drawn doodle of {}.',
  timeoutMs: 25000, loadTimeoutMs: 600000,
  minimumInk: 45
};
export const DEFAULT_OPTIONS = { music: 0.35, effects: 0.6, flash: 'normal', screamer: 'normal', muted: false };
