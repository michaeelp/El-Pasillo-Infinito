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
export const VERSION = '1.1.0';
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
export const roundDurations = n => ({flashMs: Math.round(duracionFlash(n) * 1000), phaseMs: tiempoFase(n) * 1000});
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
  template: 'a rough hand-drawn doodle of a {}.',
  timeoutMs: 25000, loadTimeoutMs: 600000,
  acceptSecond: false, secondMargin: 0.04, minimumInk: 45
};
export const DEFAULT_OPTIONS = { music: 0.35, effects: 0.6, flash: 'normal', screamer: 'normal', muted: false };
