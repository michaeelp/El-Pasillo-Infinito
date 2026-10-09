import { SCORING, PRECISION_REF, roundDurations } from './config.js?v=1.3.0';
import { winningResult,difficulty } from './difficulty.js?v=1.3.0';
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const precisionBonus = probability => SCORING.precision * clamp(probability / PRECISION_REF);
export function scoreRound({ok, precision = 0, ms = 0}, round, previousStreak = 0, dificultad='normal') {
  if (!ok) return {points:0, streak:0};
  const duration = roundDurations(round,dificultad).phaseMs;
  const speed = SCORING.speed * Math.pow(1 - clamp(ms / duration), SCORING.exponent);
  const streak = previousStreak + 1;
  const multiplier = Math.min(SCORING.streakMax, 1 + SCORING.streakStep * streak);
  return {points:Math.round((SCORING.base + precisionBonus(precision) + speed) * multiplier), streak};
}
export function precisionFor(results, monster, dificultad='normal') {
  return clamp(winningResult(results,monster,dificultad)?.score || 0);
}
export function raceBoard(players, previous = {}, results = {}, round = 1, dificultad='normal') {
  return Object.fromEntries(Object.entries(players).map(([uid, player]) => {
    const old = previous[uid] || {points:0, lives:difficulty(dificultad).vidas, streak:0, precision:0, attempts:0};
    if (old.lives <= 0) return [uid, old];
    const result = player.ausente ? {ok:false} : (results[uid] || {ok:false});
    const scored = scoreRound(result, round, old.streak,dificultad);
    return [uid, {points:old.points + scored.points, lives:Math.max(0, old.lives - (result.ok ? 0 : 1)), streak:scored.streak, precision:old.precision + clamp(result.precision), attempts:old.attempts + 1, gained:scored.points}];
  }));
}
export function standings(board) {
  return Object.entries(board).sort(([,a],[,b]) => b.points - a.points || b.precision / Math.max(1,b.attempts) - a.precision / Math.max(1,a.attempts));
}
