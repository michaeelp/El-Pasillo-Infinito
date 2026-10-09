import { DEFAULT_OPTIONS } from './config.js?v=1.0.0';
const KEY = 'pasillo-infinito-v1';
let data = { options: { ...DEFAULT_OPTIONS }, scores: [] }, persistent = true;
try {
  const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (stored && typeof stored === 'object') {
    for (const key of ['music','effects']) if (Number.isFinite(stored.options?.[key])) data.options[key] = Math.max(0,Math.min(1,stored.options[key]));
    for (const key of ['flash','screamer']) if (['normal','reduced','attenuated'].includes(stored.options?.[key])) data.options[key] = stored.options[key];
    data.options.muted = stored.options?.muted === true;
    if (Array.isArray(stored.scores)) data.scores = stored.scores.filter(s=>s && typeof s.n==='string' && Number.isInteger(s.p) && s.p>=0).slice(0,50);
  }
} catch { persistent = false; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { persistent = false; return false; } }
export function sanitizeName(name) { return String(name).normalize('NFKC').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,14) || 'Sin nombre'; }
export function getOptions() { return {...data.options}; }
export function saveOptions(options) { data.options = {...data.options,...options}; return persist(); }
export function localScores() { return data.scores.map(s=>({...s})); }
export function bestScore() { return Math.max(0,...data.scores.map(s=>s.p)); }
export function addResult(score) { const s={id:crypto.randomUUID(),n:'Sin nombre',p:score,t:Date.now()};data.scores.unshift(s);data.scores.length=Math.min(50,data.scores.length);persist();return s.id; }
export function nameResult(id,name) { const s=data.scores.find(s=>s.id===id);if(s)s.n=sanitizeName(name);return persist(); }
export function clearScores() { data.scores=[];return persist(); }
export function canPersist() { return persistent; }
