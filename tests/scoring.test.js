import test from 'node:test';
import assert from 'node:assert/strict';
import { duracionFlash, tiempoFase, roundDurations, GAME } from '../js/config.js';
import { scoreRound, raceBoard, standings, precisionFor } from '../js/scoring.js';
import { monsterSequence, roundPhase } from '../js/race.js';
import { rotateRoles } from '../js/coop.js';
test('dificultad y mínimos',()=>{
  assert.equal(duracionFlash(1),1);assert.equal(duracionFlash(2),.96);assert.equal(tiempoFase(1),60);assert.equal(tiempoFase(2),58);
  assert.equal(duracionFlash(20),.25);assert.equal(tiempoFase(19),25);
  for(let round=1;round<=1000;round++){const times=roundDurations(round);assert(times.flashMs>=250&&times.phaseMs>=25000);if(round>1){assert(times.flashMs<=roundDurations(round-1).flashMs);assert(times.phaseMs<=roundDurations(round-1).phaseMs);}}
  assert.equal(GAME.countMs,3000);assert.equal(GAME.suspenseMs,3000);
});
test('puntos, racha, fallos y tiempo del pasillo actual',()=>{
  assert.deepEqual(scoreRound({ok:false,precision:1,ms:0},1,10),{points:0,streak:0});
  assert.equal(scoreRound({ok:true,precision:1,ms:0},1).points,880);
  assert.equal(scoreRound({ok:true,precision:1,ms:0},1,8).points,1200);
  assert.equal(scoreRound({ok:true,precision:.5,ms:30000},1).points,447);
  assert.equal(scoreRound({ok:true,precision:.5,ms:29000},2).points,447);
  assert.equal(scoreRound({ok:true,precision:.5,ms:60000},1).points,330);
  assert.equal(scoreRound({ok:true,precision:.5,ms:25000},20).points,330);
  const board=raceBoard({a:{},b:{ausente:true}}, {}, {a:{ok:true,precision:1,ms:0},b:{ok:true,precision:1,ms:0}},1);assert.equal(board.a.points,880);assert.equal(board.b.points,0);assert.equal(board.b.lives,2);
  assert.equal(standings({a:{points:100,precision:.2,attempts:1},b:{points:100,precision:.8,attempts:1}})[0][0],'b');
  assert.equal(precisionFor([{label:'sun',score:.6},{label:'candle',score:.2}],{debilidades:[{en:'sun'},{en:'candle'}]}),.8);
});
test('secuencia común y reloj sincronizado',()=>{
  const monsters=[{id:1},{id:2},{id:3}];const seq=monsterSequence(123,monsters,100);assert.deepEqual(seq,monsterSequence(123,monsters,100));for(let i=1;i<seq.length;i++)assert.notEqual(seq[i].id,seq[i-1].id);
  const meta={modo:'race',ronda:2,inicioFase:1000};assert.equal(roundPhase(meta,2000).state,'count');assert.equal(roundPhase(meta,4000).state,'flash');assert.equal(roundPhase(meta,4960).state,'book');assert.equal(roundPhase(meta,4960).remaining,58000);
  assert.equal(roundPhase({modo:'coop',ronda:8,pasillos:1,inicioFase:1000},4960).remaining,58000);
  assert.deepEqual(rotateRoles({a:'vigia',b:'bibliotecario',c:'dibujante'}),{a:'bibliotecario',b:'dibujante',c:'vigia'});
});
