import test from 'node:test';import assert from 'node:assert/strict';
import {migrationPatch} from '../tools/migration_data.mjs';
import {teamId} from '../js/records.js';
import {levelFor,emptyStats} from '../js/xp.js';
const profile=(nombre,code)=>({nombre,nombreLower:nombre.toLowerCase(),codigoAmigo:code,avatar:1,xp:500,nivel:1,creadoEn:{toMillis:()=>1000},estadisticas:{...emptyStats(),pasillos:12},preferencias:{solicitudes:true},ultimaPartida:'previa',correo:'privado@example.invalid'});
const profiles={ana:profile('Ana','ANA234'),bob:profile('Bob','BOB234'),cara:profile('Cara','CAR234'),dan:profile('Dan','DAN234')};
test('equipo canónico: las seis permutaciones usan una sola clave',async()=>{for(const team of [['ana','bob','cara'],['ana','cara','bob'],['bob','ana','cara'],['bob','cara','ana'],['cara','ana','bob'],['cara','bob','ana']])assert.equal(await teamId(team),'ana|bob|cara');assert.notEqual(await teamId(['ana','bob','dan']),'ana|bob|cara');});
test('migración conserva UID, progreso/fechas/recibos y excluye correo',()=>{
 const p=migrationPatch({profiles,receipts:{ana:{previa:{xp:12,fecha:{toMillis:()=>1200},modo:'solo',dificultad:'normal'}}}});
 assert.equal(p['users/ana'].xp,500);assert.equal(p['users/ana'].nivel,levelFor(500).nivel);assert.equal(p['users/ana'].creadoEn,1000);assert.equal(p['users/ana'].estadisticas.pasillos,12);assert(!('correo'in p['users/ana']));assert.equal(p['usernames/ana'],'ana');assert.equal(p['friendcodes/ANA234'],'ana');assert.equal(p['partidas/ana/previa'].fecha,1200);
 assert.throws(()=>migrationPatch({profiles:{ana:profiles.ana,bob:{...profiles.bob,nombre:'ANA'}}}),/Conflicto/);assert.throws(()=>migrationPatch({profiles:{ana:profiles.ana,bob:{...profiles.bob,codigoAmigo:'ANA234'}}}),/Conflicto/);
});
test('migración solo conserva amistades mutuas y pendientes coherentes; recalcula contadores',()=>{
 const friends={ana:{bob:{estado:'amigos'},cara:{estado:'pendienteEnviada',fecha:1500},dan:{estado:'amigos'}},bob:{ana:{estado:'amigos'}},cara:{ana:{estado:'pendienteRecibida',fecha:1500}},dan:{}};
 const p=migrationPatch({profiles,friends});assert.equal(p['social/ana/confirmados/bob'],true);assert.equal(p['social/bob/confirmados/ana'],true);assert(!p['social/ana/confirmados/dan']);assert.equal(p['social/ana/pendientes/cara'].de,'ana');assert.equal(p['social/cara/pendientes/ana'].de,'ana');assert.equal(p['socialCounts/ana'].amigos,1);assert.equal(p['socialCounts/ana'].pendientes,1);
});
test('migración fusiona equipos previos sin duplicados y omite cuentas inexistentes',()=>{
 const records={records_solo_normal:{ana:{uid:'ana',puntuacion:12,fecha:2000},ghost:{uid:'ghost',puntuacion:50}},records_coop_normal:{hashA:{uid:'ana',miembros:['cara','ana','bob'],puntuacion:3,fecha:2000},hashB:{uid:'ana',miembros:['bob','cara','ana'],puntuacion:5,fecha:2500},hashGhost:{uid:'ana',miembros:['ana','bob','ghost'],puntuacion:30}}};
 const p=migrationPatch({profiles,records});assert.equal(p['records_solo_normal/ana'].puntuacion,12);assert(!p['records_solo_normal/ghost']);assert.equal(p['records_coop_normal/ana|bob|cara'].puntuacion,5);assert.equal(p['equipos/cara/normal/ana|bob|cara'],true);assert.equal(Object.keys(p).filter(k=>k.startsWith('records_coop')).length,1);
});
