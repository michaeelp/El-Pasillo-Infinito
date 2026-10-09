import { SCORING, ONLINE, tiempoFase } from './config.js?v=1.1.0';
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function scoreRound({ok, precision = 0, ms = 0}, round, previousStreak = 0) {
  if (!ok) return {points:0, streak:0};
  const duration = tiempoFase(round) * 1000;
  const speed = SCORING.speed * Math.pow(1 - clamp(ms / duration), SCORING.exponent);
  const streak = previousStreak + 1;
  const multiplier = Math.min(SCORING.streakMax, 1 + SCORING.streakStep * streak);
  return {points:Math.round((SCORING.base + SCORING.precision * clamp(precision) + speed) * multiplier), streak};
}
export function precisionFor(results, monster) {
  const accepted = new Set(monster.debilidades.map(word => word.en));
  return clamp(results.filter(item => accepted.has(item.label)).reduce((sum, item) => sum + item.score, 0));
}
export function raceBoard(players, previous = {}, results = {}, round = 1) {
  return Object.fromEntries(Object.entries(players).map(([uid, player]) => {
    const old = previous[uid] || {points:0, lives:ONLINE.lives, streak:0, precision:0, attempts:0};
    if (old.lives <= 0) return [uid, old];
    const result = player.ausente ? {ok:false} : (results[uid] || {ok:false});
    const scored = scoreRound(result, round, old.streak);
    return [uid, {points:old.points + scored.points, lives:Math.max(0, old.lives - (result.ok ? 0 : 1)), streak:scored.streak, precision:old.precision + clamp(result.precision), attempts:old.attempts + 1, gained:scored.points}];
  }));
}
export function standings(board) {
  return Object.entries(board).sort(([,a],[,b]) => b.points - a.points || b.precision / Math.max(1,b.attempts) - a.precision / Math.max(1,a.attempts));
}
