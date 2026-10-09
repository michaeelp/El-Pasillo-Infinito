import {createHash} from 'node:crypto';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {DIFFICULTIES,roundDurations,XP} from '../js/config.js';
import {monsterSequence,MonsterPool} from '../js/pool.js';
import {countdownMs,winningResult} from '../js/difficulty.js';
import {matchXp,levelFor,xpParaSubir,updatedStats,emptyStats} from '../js/xp.js';
import {validateUsername} from '../js/auth.js';
import {scoreRound} from '../js/scoring.js';
const monsters=JSON.parse(fs.readFileSync(new URL('../monsters.json',import.meta.url)));
test('bolsa: 64 semillas × 300 pasillos, bloques completos y frontera sin repetición',()=>{
 for(let seed=0;seed<64;seed++){const seq=monsterSequence(seed,monsters,300);assert.deepEqual(seq,monsterSequence(seed,monsters,300));for(let cycle=0;cycle<10;cycle++)assert.equal(new Set(seq.slice(cycle*30,cycle*30+30).map(m=>m.id)).size,30);for(let i=1;i<seq.length;i++)assert.notEqual(seq[i].id,seq[i-1].id);const pool=new MonsterPool(seed,monsters);assert.deepEqual(Array.from({length:95},()=>pool.next()),seq.slice(0,95));}
});
test('las cuatro dificultades usan los valores y mínimos solicitados',()=>{
 const starts={facil:[75000,1500],normal:[60000,1000],dificil:[50000,800],pesadilla:[40000,600]},mins={facil:[75000,1500],normal:[25000,250],dificil:[20000,200],pesadilla:[15000,150]};
 for(const d of Object.keys(DIFFICULTIES)){const first=roundDurations(1,d),last=roundDurations(1000,d);assert.deepEqual([first.phaseMs,first.flashMs],starts[d]);assert.deepEqual([last.phaseMs,last.flashMs],mins[d]);for(let n=1;n<100;n++){const t=roundDurations(n,d);assert(t.phaseMs>=last.phaseMs&&t.flashMs>=last.flashMs);if(d==='facil')assert.deepEqual(t,first);}}
 const counts=new Set();for(let n=1;n<100;n++){counts.add(countdownMs('pesadilla',12,n));assert.equal(countdownMs('normal',12,n),3000);}assert.deepEqual([...counts].sort(),[2000,3000,4000]);assert.equal(countdownMs('pesadilla',12,8),countdownMs('pesadilla',12,8));
});
test('IA: fácil acepta top 2; difícil y pesadilla exigen su probabilidad',()=>{
 const m=monsters[0],own=m.debilidades[0].id,other=monsters.find(x=>!x.debilidades.some(w=>w.id===own)).debilidades[0].id;
 const second=[{label:other,score:.6},{label:own,score:.3}];assert(winningResult(second,m,'facil'));for(const d of ['normal','dificil','pesadilla'])assert.equal(winningResult(second,m,d),null);
 for(const [d,min]of [['dificil',.25],['pesadilla',.4]]){assert(winningResult([{label:own,score:min}],m,d));assert.equal(winningResult([{label:own,score:min-.001}],m,d),null);}
 for(const m of monsters)for(const weakness of m.debilidades)for(const d of Object.keys(DIFFICULTIES))assert(winningResult([{label:weakness.id,score:.9}],m,d));
});
test('rapidez normalizada por fase actual, también en Fácil y Pesadilla',()=>{for(const d of Object.keys(DIFFICULTIES)){const T=roundDurations(20,d).phaseMs;assert.deepEqual(scoreRound({ok:true,precision:.6,ms:T/2},20,0,d),scoreRound({ok:true,precision:.6,ms:roundDurations(1,d).phaseMs/2},1,0,d));}});
test('XP por modo, curva acumulativa, máximo 99, límite 600 y semillas sin XP',()=>{
 assert.equal(matchXp({modo:'solo',dificultad:'facil',pasillos:2,precisiones:[1,.4]}),17);assert.equal(matchXp({modo:'coop',dificultad:'pesadilla',pasillos:10}),100);assert.equal(matchXp({modo:'race',puntos:4000,puesto:1}),130);assert.equal(matchXp({modo:'solo',pasillos:1000}),600);assert.equal(matchXp({modo:'race',puntos:10000,personalizada:true}),0);
 let xp=0;for(let n=1;n<99;n++){assert.equal(levelFor(xp).nivel,n);assert.equal(levelFor(xp+xpParaSubir(n)-1).nivel,n);xp+=xpParaSubir(n);assert.equal(levelFor(xp).nivel,n+1);}assert.equal(levelFor(xp+1000000000).nivel,99);assert.equal(XP.nivelMax,99);
});
test('estadísticas, mejores y los 12 logros derivan de resultados',()=>{
 const s=updatedStats(emptyStats(),{modo:'race',dificultad:'pesadilla',puesto:1,pasillos:30,puntos:9000,tiempoMs:2000,racha:5,margen3:true,precisiones:[.95],encuentros:monsters.map(m=>({id:m.id,ok:true}))});
 assert.equal(s.partidas,1);assert.equal(s.carrerasGanadas,1);assert.equal(s.mejores.race_pesadilla,9000);assert(s.logros.includes('treinta'));assert(s.logros.includes('vistos'));assert(s.logros.includes('margen'));assert(s.logros.includes('precision'));assert.equal(Object.keys(s.bestiario).length,30);
});
test('nombres permanentes: formato, acentos, reservados y filtro',()=>{assert.equal(validateUsername('Álex_12'),'Álex_12');for(const n of ['ab','demasiado_largo_123','Ana López','<Juan>','admin','ADMIN','puto123'])assert.throws(()=>validateUsername(n));});
test('12 avatares, originales intactos y cuatro nuevos con seis variantes',()=>{
 const avatars=JSON.parse(fs.readFileSync(new URL('../avatars.json',import.meta.url)));assert.equal(avatars.length,12);assert.deepEqual(avatars.map(a=>a.id),Array.from({length:12},(_,i)=>i+1));
 for(const a of avatars){assert.deepEqual(Object.keys(a).sort(),['color','id','nombre','ruta']);assert(/^#[a-f\d]{6}$/i.test(a.color));assert(fs.existsSync(new URL('../'+a.ruta,import.meta.url)));}
 const originals=JSON.parse(fs.readFileSync(new URL('./original-avatars.json',import.meta.url)));assert.equal(Object.keys(originals).length,24);for(const [file,hash]of Object.entries(originals))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
 for(const a of avatars.slice(8))for(const[size,suffix]of [[1024,'-1024'],[256,''],[64,'-64']]){const png=fs.readFileSync(new URL('../'+a.ruta.replace('.webp',suffix+'.png'),import.meta.url));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);assert(fs.existsSync(new URL('../'+a.ruta.replace('.webp',suffix+'.webp'),import.meta.url)));}
});
