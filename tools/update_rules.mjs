import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { labelsFrom } from '../js/monsters.js';
import { AVATAR_COUNT,SOCIAL,VERSION } from '../js/config.js';
import {accountRules,account,signed} from './account_rules.mjs';
import {expansionRules} from './expansion_rules.mjs';
const root=new URL('../',import.meta.url),file=fileURLToPath(new URL('database.rules.json',root));
const monsters=JSON.parse(fs.readFileSync(new URL('monsters.json',root),'utf8'));
const rules=JSON.parse(fs.readFileSync(file,'utf8')),room=rules.rules.rooms.$code;
const pattern=labelsFrom(monsters).map(w=>w.id).sort().join('|'),max=Math.max(...monsters.map(m=>m.id));
if(!labelsFrom(monsters).every(w=>/^[a-z_]+$/.test(w.id)))throw new Error('ID de objeto inválido.');
room.meta.lastMonster['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= ${max}`;
room.secreto.$round.$uid.monstruoId['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 1 && newData.val() <= ${max}`;
room.resultados.$round.$uid.distribution.$label['.validate']=`$label.matches(/^(${pattern})$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1`;
room.resultados.$round.$uid.etiqueta['.validate']=`newData.isString() && (newData.val() == '' || newData.val().matches(/^(${pattern})$/))`;
// Todas las reglas consultan el perfil y los vínculos en la misma base.
function replaceLegacy(node){for(const [key,value]of Object.entries(node)){if(value&&typeof value==='object')replaceLegacy(value);else if(typeof value==='string')node[key]=value.replaceAll("root.child('cuentas').child(auth.uid).child('activo').val() == true","root.child('users').child(auth.uid).exists() && !root.child('accountCleanup').child(auth.uid).exists()").replaceAll("root.child('users').child($uid).child('nombre')","root.child('users').child($uid).child('nombre')");}}
replaceLegacy(rules.rules.rooms);
function restrict(node) {for(const [key,value]of Object.entries(node)){if(value&&typeof value==='object')restrict(value);else if(typeof value==='string'&&value.includes('auth != null')&&!value.includes('sign_in_provider'))node[key]=value.replaceAll('auth != null',signed);}}
restrict(rules.rules.rooms);
room.meta['.validate']="newData.hasChildren(['host','modo','estado','ronda','pasillos','vidas','inicioFase','semilla','createdAt','expiresAt','uniqueAvatars','dificultad','personalizada'])";
room.meta.dificultad={'.validate':"newData.isString() && newData.val().matches(/^(facil|normal|dificil|pesadilla)$/) && (!data.exists() || root.child('rooms').child($code).child('meta/estado').val() == 'lobby' || newData.val() == data.val())"};
room.meta.personalizada={'.validate':"newData.isBoolean() && (!data.exists() || root.child('rooms').child($code).child('meta/estado').val() == 'lobby' || newData.val() == data.val())"};
room.meta.semilla['.validate']="newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= 4294967295 && (!data.exists() || root.child('rooms').child($code).child('meta/estado').val() == 'lobby' || newData.val() == data.val())";
for(const value of [room.meta.vidas,room.meta.board.$uid.lives])value['.validate']="newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= 5";
room.jugadores.$uid.avatar['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 1 && newData.val() <= ${AVATAR_COUNT} && (root.child('rooms').child($code).child('meta/uniqueAvatars').val() == false || root.child('rooms').child($code).child('claims/avatars').child(newData.val()+'').val() == auth.uid)`;
room.jugadores.$uid.nombre['.validate']="newData.isString() && newData.val() == root.child('users').child($uid).child('nombre').val()";
room.claims.$type.$id['.validate']="newData.val() == auth.uid && (($type == 'slots' && ($id.matches(/^[1-3]$/) || (root.child('rooms').child($code).child('meta/modo').val() == 'race' && $id.matches(/^[4-8]$/)))) || ($type == 'avatars' && $id.matches(/^([1-9]|1[0-2])$/)) || ($type == 'roles' && ($id == 'vigia' || $id == 'bibliotecario' || $id == 'dibujante')))";
for(const branch of ['entregas','resultados'])room[branch].$round.$uid.ms['.validate']="newData.isNumber() && newData.val() >= 0 && newData.val() <= 75000";
delete rules.rules.cuentas;delete rules.rules.amigos;
Object.assign(rules.rules,accountRules(monsters));
expansionRules(rules.rules,monsters,JSON.parse(fs.readFileSync(new URL('cosmeticos.json',root))));
rules.rules.caducidad={'.read':account,'.indexOn':['.value'],$code:{'.write':`${account} && ((newData.isNumber() && newData.val() == root.child('rooms').child($code).child('meta/expiresAt').val()) || (!newData.exists() && (!root.child('rooms').child($code).exists() || root.child('rooms').child($code).child('meta/expiresAt').val() < now || root.child('accountCleanup').child(auth.uid).exists() && root.child('rooms').child($code).child('jugadores').child(auth.uid).exists())))`,'.validate':"$code.matches(/^[A-Z]{4}$/) && newData.isNumber()"}};
room['.write']=`${account} && !newData.exists() && ((data.child('meta/expiresAt').isNumber() && data.child('meta/expiresAt').val() < now) || (root.child('accountCleanup').child(auth.uid).exists() && data.child('jugadores').child(auth.uid).exists()))`;
room.meta['.read']=`${account} && (!data.exists() || data.child('expiresAt').val() > now)`;
room.jugadores['.read']=`${account} && root.child('rooms').child($code).child('meta/expiresAt').val() > now`;
rules.rules.presencia={$uid:{
  '.read':`${signed} && (auth.uid == $uid || (root.child('users').child($uid).child('preferencias/estadoVisible').val() != false && root.child('social').child(auth.uid).child('confirmados').child($uid).val() == true))`,
  '.write':`${account} && auth.uid == $uid && (!newData.exists() || (${signed}))`,
  '.validate':"newData.hasChildren(['estado','sala','t'])",
  estado:{'.validate':"newData.val() == 'enLinea' || newData.val() == 'enSala' || newData.val() == 'desconectado'"},
  sala:{'.validate':"newData.isString() && (newData.val() == '' || (newData.val().matches(/^[A-Z]{4}$/) && root.child('rooms').child(newData.val()).child('jugadores').child($uid).exists()))"},
  t:{'.validate':"newData.isNumber() && newData.val() <= now + 5000 && newData.val() >= now - 15000"},
  $other:{'.validate':false}
}};
const invitationRoot="newData.parent().parent().parent()";
rules.rules.invitaciones={$dest:{
  '.read':`${account} && auth.uid == $dest`,
  '.write':`${account} && auth.uid == $dest && root.child('accountCleanup').child(auth.uid).exists() && !newData.exists()`,
  $id:{
    '.write':`${account} && ((!newData.exists() && (auth.uid == $dest || auth.uid == data.child('de').val() || !data.exists())) || (${signed} && !data.exists() && newData.child('de').val() == auth.uid && root.child('users').child($dest).child('preferencias/invitaciones').val() != false && root.child('social').child(auth.uid).child('confirmados').child($dest).val() == true && root.child('social').child($dest).child('confirmados').child(auth.uid).val() == true && root.child('rooms').child(newData.child('sala').val()).child('jugadores').child(auth.uid).exists() && root.child('rooms').child(newData.child('sala').val()).child('meta/estado').val() == 'lobby'))`,
    '.validate':`newData.hasChildren(['de','nombre','sala','modo','dificultad','creadoEn','caducaEn']) && ${invitationRoot}.child('enviadas').child(auth.uid).child($id).child('dest').val() == $dest`,
    de:{'.validate':"newData.val() == auth.uid"},
    nombre:{'.validate':"newData.val() == root.child('users').child(auth.uid).child('nombre').val()"},
    sala:{'.validate':"newData.isString() && newData.val().matches(/^[A-Z]{4}$/) && root.child('rooms').child(newData.val()).child('meta/expiresAt').val() > now"},
    modo:{'.validate':"newData.val() == root.child('rooms').child(newData.parent().child('sala').val()).child('meta/modo').val()"},
    dificultad:{'.validate':"newData.val() == root.child('rooms').child(newData.parent().child('sala').val()).child('meta/dificultad').val()"},
    creadoEn:{'.validate':"newData.isNumber() && newData.val() == now"},
    caducaEn:{'.validate':`newData.isNumber() && newData.val() > now && newData.val() <= now + ${SOCIAL.invitacionMs}`},
    $other:{'.validate':false}
  }
}};
const sentRoot="newData.parent().parent().parent()";
rules.rules.enviadas={$uid:{'.read':`${account} && auth.uid == $uid`,$id:{
  '.write':`${account} && ((auth.uid == $uid && newData.exists()) || (!newData.exists() && (auth.uid == $uid || auth.uid == data.child('dest').val())))`,
  '.validate':`newData.hasChildren(['dest']) && ${sentRoot}.child('invitaciones').child(newData.child('dest').val()).child($id).child('de').val() == $uid`,dest:{'.validate':'newData.isString()'},$other:{'.validate':false}
}}};
const output=JSON.stringify(rules,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw new Error('Regenera las reglas: node tools/update_rules.mjs');}
else fs.writeFileSync(file,output);
const comments={deletedAccounts:'Solo UID eliminado: impide recrear el perfil con un token antiguo aún válido.',caducidad:'Índice de tiempos: limpieza de hasta ocho salas caducadas al conectarse.',rooms:'Salas: cuenta no anónima, anfitrión, identidad propia, claims y tiempos.',users:'Perfiles sin correo. Reserva atómica, nombre fijo, nivel y XP con recibo.',usernames:'Nombre único sin distinguir mayúsculas; forma parte del mismo commit que el perfil.',friendcodes:'Código único de seis caracteres; reserva junto al perfil.',social:'Solicitudes y confirmaciones mutuas. Solo el destinatario acepta.',socialCounts:'Contadores 100 amigos / 50 pendientes: solo junto a una transición concreta.',socialLimits:'Diez ranuras de tiempo de servidor; máximo diez envíos en una hora móvil.',partidas:'Recibos privados, inmutables, máximo 600 XP y escritura junto al progreso.',accountCleanup:'Marcador propio de borrado; bloquea nuevas partidas y permite reintentar.',equipos:'Índice de equipos validado junto a su récord.',salasJugador:'Índice propio para limpiar salas al eliminar la cuenta.',presencia:'Escritura propia y onDisconnect; lectura propia o entre amigos confirmados.',invitaciones:'Solo entre amigos mutuos, emisor miembro del lobby y caducidad de dos minutos.',enviadas:'Índice propio de invitaciones para limpiar al borrarse.'};
const annotated=`// RTDB ${VERSION}: mismo contenido que database.rules.json, con comentarios.\n`+output.split('\n').map(line=>{const match=line.match(/^(\s*)"([^"\n]+)":/);return match&&comments[match[2]]?`${match[1]}// ${comments[match[2]]}\n${line}`:line;}).join('\n');
const commentedFile=new URL('database.rules.commented.jsonc',root);
if(process.argv.includes('--check')){if(fs.readFileSync(commentedFile,'utf8')!==annotated)throw new Error('Regenera las reglas comentadas.');}else fs.writeFileSync(commentedFile,annotated);
console.log(`REGLAS OK: ${monsters.length} monstruos y ${labelsFrom(monsters).length} etiquetas derivadas del JSON.`);
