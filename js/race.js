import { GAME, roundDurations } from './config.js?v=1.2.0';
export function monsterSequence(seed, monsters, count) {
  let value = seed >>> 0, last = -1;
  return Array.from({length:count}, () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ value >>> 15, value | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    const pool = monsters.filter(monster => monster.id !== last);
    const monster = pool[Math.floor(((n ^ n >>> 14) >>> 0) / 4294967296 * pool.length)];
    last = monster.id; return monster;
  });
}
export function roundPhase(meta, now) {
  const duration = roundDurations(meta.modo === 'coop' ? meta.pasillos + 1 : meta.ronda);
  const elapsed = now - meta.inicioFase;
  const searchStart = meta.inicioFase + GAME.countMs + duration.flashMs;
  const end = searchStart + duration.phaseMs;
  return {state:elapsed < GAME.countMs ? 'count' : elapsed < GAME.countMs + duration.flashMs ? 'flash' : 'book', elapsed, remaining:Math.max(0,end-now), searchStart, end, ...duration};
}
