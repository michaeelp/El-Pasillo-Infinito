import { roundDurations } from './config.js?v=1.3.1';
import { countdownMs } from './difficulty.js?v=1.3.1';
export {monsterSequence} from './pool.js?v=1.3.1';
export function roundPhase(meta, now) {
  const round=meta.modo==='coop'?meta.pasillos+1:meta.ronda;
  const duration=roundDurations(round,meta.dificultad),countMs=countdownMs(meta.dificultad,meta.semilla,meta.ronda);
  const elapsed = now - meta.inicioFase;
  const searchStart = meta.inicioFase + countMs + duration.flashMs;
  const end = searchStart + duration.phaseMs;
  return {state:elapsed < countMs ? 'count' : elapsed < countMs + duration.flashMs ? 'flash' : 'book', elapsed, remaining:Math.max(0,end-now), searchStart, end, countMs, ...duration};
}
