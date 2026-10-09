// CONFIGURACIÓN FIREBASE: pega aquí la configuración pública de tu aplicación web.
export const FIREBASE_CONFIG = {
  apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
};
export const VERSION = '1.0.0';
export const GAME = { roundMs: 60000, countMs: 3000, flashMs: 1000, suspenseMs: 3000, winMs: 2600, loseMs: 1400 };
export const AI = {
  library: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1',
  model: 'Xenova/clip-vit-base-patch32',
  template: 'a rough hand-drawn doodle of a {}.',
  timeoutMs: 25000, loadTimeoutMs: 600000,
  acceptSecond: false, secondMargin: 0.04, minimumInk: 45
};
export const DEFAULT_OPTIONS = { music: 0.35, effects: 0.6, flash: 'normal', screamer: 'normal', muted: false };
