// Una única tabla configura tiempos y aceptación de IA en Solo, Carrera y Cooperativo.
import {DIFFICULTIES,DEFAULT_DIFFICULTY,roundDurations} from './config.js?v=1.3.1';
import {randomFrom,seedNumber} from './pool.js?v=1.3.1';
export const difficulty = id => DIFFICULTIES[id] || DIFFICULTIES[DEFAULT_DIFFICULTY];
export {roundDurations};
// Pesadilla usa la misma cuenta determinista en todos los clientes.
export function countdownMs(id,seed,round=1) {
  const [min,max]=difficulty(id).cuenta;
  return (min+Math.floor(randomFrom(seedNumber(seed)^Math.imul(round,0x9e3779b1))()*(max-min+1)))*1000;
}
export function winningResult(results,monster,id=DEFAULT_DIFFICULTY) {
  const d=difficulty(id), sorted=results.filter(r=>Number.isFinite(r.score)).sort((a,b)=>b.score-a.score);
  return sorted.slice(0,d.top).find(r=>r.score>=d.probabilidad&&monster?.debilidades.some(w=>w.id===r.label)) || null;
}
export function populateDifficulties(select,value=DEFAULT_DIFFICULTY) {
  select.replaceChildren(...Object.entries(DIFFICULTIES).map(([id,d])=>{const o=document.createElement('option');o.value=id;o.textContent=d.nombre;return o;}));select.value=value;
}
