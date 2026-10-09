import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { labelsFrom,chooseMonster } from '../js/monsters.js';
import { judge,topResult } from '../js/ai.js';
import { monsterSequence } from '../js/race.js';
import { validateLore } from '../tools/validate_lore.mjs';
import { MONSTER_COUNT,confusables } from '../js/config.js';
const root=new URL('../',import.meta.url),monsters=JSON.parse(fs.readFileSync(new URL('monsters.json',root))),labels=labelsFrom(monsters);
const expected=[['shovel','dog'],['broom','shoe'],['sunglasses','pencil'],['flashlight'],['mirror'],['crown','diamond'],['smiley_face','teddy_bear'],['flower','ring','heart'],['hammer'],['alarm_clock','coffee_cup'],['sun'],['scales','book'],['balloon','ice_cream'],['snowflake'],['camera'],['life_ring','towel'],['tree','apple'],['cross','bell','book'],['bone','ball'],['bird'],['bucket'],['coin','rope'],['axe','fire','saw'],['cat','cheese','mousetrap'],['bandage','umbrella','sun'],['paintbrush','fire','house'],['toothbrush','cake','apple'],['scissors','magnet','cat'],['lamp','broom','candle'],['fishing_net','fishing_hook','seagull']];
test('30 fichas, asignación exacta y unión de 56 objetos desde monsters.json',()=>{
  assert.equal(monsters.length,MONSTER_COUNT);assert.equal(labels.length,56);
  assert.deepEqual(monsters.map(m=>m.id),Array.from({length:30},(_,i)=>i+1));
  const definitions=new Map();
  for(const [index,m]of monsters.entries()){
    assert.deepEqual(Object.keys(m).sort(),['id','nombre','imagen','sonidoAparicion','sonidoScreamer','lore','debilidades'].sort());
    assert.deepEqual(m.debilidades.map(w=>w.id),expected[index]);
    for(const w of m.debilidades){assert.deepEqual(Object.keys(w).sort(),['id','nombre','etiquetaCLIP'].sort());if(definitions.has(w.id))assert.deepEqual(w,definitions.get(w.id));else definitions.set(w.id,w);}
  }
  assert.deepEqual([1,2,3].map(n=>monsters.filter(m=>m.debilidades.length===n).length),[8,12,10]);
});
test('1680 combinaciones: acepta cada debilidad propia y rechaza las demás',()=>{
  let checks=0;
  for(const monster of monsters)for(const word of labels){const own=monster.debilidades.some(w=>w.id===word.id);assert.equal(judge([{label:word.id,score:.9}],monster),own,`${monster.nombre}: ${word.nombre}`);checks++;}
  assert.equal(checks,1680);
  const m=monsters[3];assert.equal(judge([{label:'flashlight',score:.4},{label:'sun',score:.6}],m),false);assert.equal(judge([{label:'sun',score:.2},{label:'flashlight',score:.8}],m),true);
  assert.equal(judge([],m),false);assert.equal(judge([{label:'flashlight',score:NaN}],m),false);
  for(const id of confusables)assert.equal(judge([{label:id,score:.9}],m),id==='flashlight');
  assert.equal(topResult([{label:'dog',score:.2},{label:'cat',score:.8}]).label,'cat');
});
test('selección de los 30 en solo y por semilla, sin repetición consecutiva',()=>{
  const seen=new Set();
  for(let seed=0;seed<16;seed++){const seq=monsterSequence(seed,monsters,1000);assert.deepEqual(seq,monsterSequence(seed,monsters,1000));for(let i=0;i<seq.length;i++){seen.add(seq[i].id);if(i)assert.notEqual(seq[i].id,seq[i-1].id);}}
  assert.equal(seen.size,30);
  const random=Math.random;try{for(let i=0;i<30;i++){Math.random=()=>((i+.1)/30);assert.equal(chooseMonster(monsters,null).id,i+1);}Math.random=()=>0;assert.notEqual(chooseMonster(monsters,monsters[0]).id,1);}finally{Math.random=random;}
});
test('lore: rangos, nombres, plurales, acentos, sinónimos y límites de palabra',()=>{
  assert.deepEqual(validateLore(monsters).errors,[]);
  const changed=structuredClone(monsters);changed[0].lore='Palas '+changed[0].lore;changed[2].lore='LÁPICES '+changed[2].lore;changed[27].lore='Mininos '+changed[27].lore;
  const errors=validateLore(changed).errors;assert(errors.some(e=>e.startsWith('1:')));assert(errors.some(e=>e.startsWith('3:')));assert(errors.some(e=>e.startsWith('28:')));
  assert(validateLore([{...monsters[0],lore:'Una historia demasiado breve.'}]).errors.some(e=>e.includes('palabras')));
  assert.deepEqual(validateLore([{...monsters[10],lore:('Resplandor '+ 'camino antiguo silencio recuerdo verano noche invierno relato secreto umbral campo suelo viajero aldeanos caminar despertar caer dormir desaparecer esperar regresar perder huir regresar.')}]).errors,[]);
});
test('22 imágenes originales intactas y 8 retratos con PNG de respaldo 1024x1024',()=>{
  const hashes=JSON.parse(fs.readFileSync(new URL('tests/original-images.json',root)));
  assert.equal(Object.keys(hashes).length,22);for(const [file,hash]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),hash);
  for(const m of monsters.slice(22)){const png=fs.readFileSync(new URL(m.imagen.replace('.webp','.png'),root)),webp=fs.readFileSync(new URL(m.imagen,root));assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1024);assert.equal(webp.subarray(8,12).toString(),'WEBP');}
});
test('60 sonidos propios: WAV PCM16 mono válidos, distintos y sin saturación',()=>{
  const hashes=new Set();
  for(const m of monsters)for(const key of ['sonidoAparicion','sonidoScreamer']){
    const wav=fs.readFileSync(new URL(m[key],root));assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.subarray(8,12).toString(),'WAVE');assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),22050);assert.equal(wav.readUInt16LE(34),16);
    const duration=wav.readUInt32LE(40)/44100;assert(duration>=.4&&duration<=1.6);let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert(peak>1000&&peak<32767);hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
  }
  assert.equal(hashes.size,60);
});
