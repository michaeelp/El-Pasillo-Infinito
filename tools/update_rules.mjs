import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { labelsFrom } from '../js/monsters.js';
import { AVATAR_COUNT,SOCIAL } from '../js/config.js';
const root=new URL('../',import.meta.url),file=fileURLToPath(new URL('database.rules.json',root));
const monsters=JSON.parse(fs.readFileSync(new URL('monsters.json',root),'utf8'));
const rules=JSON.parse(fs.readFileSync(file,'utf8')),room=rules.rules.rooms.$code;
const pattern=labelsFrom(monsters).map(w=>w.id).sort().join('|'),max=Math.max(...monsters.map(m=>m.id));
if(!labelsFrom(monsters).every(w=>/^[a-z_]+$/.test(w.id)))throw new Error('ID de objeto inválido.');
room.meta.lastMonster['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= ${max}`;
room.secreto.$round.$uid.monstruoId['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 1 && newData.val() <= ${max}`;
room.resultados.$round.$uid.distribution.$label['.validate']=`$label.matches(/^(${pattern})$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1`;
room.resultados.$round.$uid.etiqueta['.validate']=`newData.isString() && (newData.val() == '' || newData.val().matches(/^(${pattern})$/))`;
// Autenticación no anónima y perfil reflejado por el servidor.
const signed = "auth != null && auth.token.firebase.sign_in_provider != 'anonymous' && root.child('cuentas').child(auth.uid).child('activo').val() == true";
function restrict(node) {for(const [key,value]of Object.entries(node)){if(value&&typeof value==='object')restrict(value);else if(typeof value==='string'&&value.includes('auth != null')&&!value.includes('sign_in_provider'))node[key]=value.replaceAll('auth != null',signed);}}
restrict(rules.rules.rooms);
room.meta['.validate']="newData.hasChildren(['host','modo','estado','ronda','pasillos','vidas','inicioFase','semilla','createdAt','expiresAt','uniqueAvatars','dificultad','personalizada'])";
room.meta.dificultad={'.validate':"newData.isString() && newData.val().matches(/^(facil|normal|dificil|pesadilla)$/) && (!data.exists() || root.child('rooms').child($code).child('meta/estado').val() == 'lobby' || newData.val() == data.val())"};
room.meta.personalizada={'.validate':"newData.isBoolean() && (!data.exists() || root.child('rooms').child($code).child('meta/estado').val() == 'lobby' || newData.val() == data.val())"};
room.meta.semilla['.validate']="newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= 4294967295 && (!data.exists() || root.child('rooms').child($code).child('meta/estado').val() == 'lobby' || newData.val() == data.val())";
for(const value of [room.meta.vidas,room.meta.board.$uid.lives])value['.validate']="newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= 5";
room.jugadores.$uid.avatar['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 1 && newData.val() <= ${AVATAR_COUNT} && (root.child('rooms').child($code).child('meta/uniqueAvatars').val() == false || root.child('rooms').child($code).child('claims/avatars').child(newData.val()+'').val() == auth.uid)`;
room.jugadores.$uid.nombre['.validate']="newData.isString() && newData.val() == root.child('cuentas').child($uid).child('nombre').val()";
room.claims.$type.$id['.validate']="newData.val() == auth.uid && (($type == 'slots' && ($id.matches(/^[1-3]$/) || (root.child('rooms').child($code).child('meta/modo').val() == 'race' && $id.matches(/^[4-8]$/)))) || ($type == 'avatars' && $id.matches(/^([1-9]|1[0-2])$/)) || ($type == 'roles' && ($id == 'vigia' || $id == 'bibliotecario' || $id == 'dibujante')))";
for(const branch of ['entregas','resultados'])room[branch].$round.$uid.ms['.validate']="newData.isNumber() && newData.val() >= 0 && newData.val() <= 75000";
rules.rules.cuentas={'.read':false,'.write':false};
rules.rules.amigos={$uid:{'.read':`${signed} && auth.uid == $uid`,'.write':false}};
rules.rules.presencia={$uid:{
  '.read':`${signed} && (auth.uid == $uid || root.child('amigos').child(auth.uid).child($uid).val() == true)`,
  '.write':`${signed} && auth.uid == $uid`,
  '.validate':"newData.hasChildren(['estado','sala','t'])",
  estado:{'.validate':"newData.val() == 'enLinea' || newData.val() == 'enSala' || newData.val() == 'desconectado'"},
  sala:{'.validate':"newData.isString() && (newData.val() == '' || (newData.val().matches(/^[A-Z]{4}$/) && root.child('rooms').child(newData.val()).child('jugadores').child($uid).exists()))"},
  t:{'.validate':"newData.isNumber() && newData.val() <= now + 5000 && newData.val() >= now - 15000"},
  $other:{'.validate':false}
}};
rules.rules.invitaciones={$dest:{
  '.read':`${signed} && auth.uid == $dest`,
  $id:{
    '.write':`${signed} && ((!newData.exists() && auth.uid == $dest) || (!data.exists() && newData.child('de').val() == auth.uid && root.child('amigos').child(auth.uid).child($dest).val() == true && root.child('amigos').child($dest).child(auth.uid).val() == true && root.child('rooms').child(newData.child('sala').val()).child('jugadores').child(auth.uid).exists() && root.child('rooms').child(newData.child('sala').val()).child('meta/estado').val() == 'lobby'))`,
    '.validate':"newData.hasChildren(['de','nombre','sala','modo','dificultad','creadoEn','caducaEn'])",
    de:{'.validate':"newData.val() == auth.uid"},
    nombre:{'.validate':"newData.val() == root.child('cuentas').child(auth.uid).child('nombre').val()"},
    sala:{'.validate':"newData.isString() && newData.val().matches(/^[A-Z]{4}$/) && root.child('rooms').child(newData.val()).child('meta/expiresAt').val() > now"},
    modo:{'.validate':"newData.val() == root.child('rooms').child(newData.parent().child('sala').val()).child('meta/modo').val()"},
    dificultad:{'.validate':"newData.val() == root.child('rooms').child(newData.parent().child('sala').val()).child('meta/dificultad').val()"},
    creadoEn:{'.validate':"newData.isNumber() && newData.val() == now"},
    caducaEn:{'.validate':`newData.isNumber() && newData.val() > now && newData.val() <= now + ${SOCIAL.invitacionMs}`},
    $other:{'.validate':false}
  }
}};
const output=JSON.stringify(rules,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw new Error('Regenera las reglas: node tools/update_rules.mjs');}
else fs.writeFileSync(file,output);
const comments={rooms:'Salas: cuenta no anónima, anfitrión, identidad propia, claims, tiempos y campos acotados.',cuentas:'Identidad reflejada por Admin. Clientes sin acceso directo; las reglas consultan activo/nombre.',amigos:'Espejo confirmado mutuo desde Firestore. Solo Admin escribe; lectura de la propia cuenta.',presencia:'Escritura propia y onDisconnect; lectura propia o de amigos confirmados.',invitaciones:'Solo entre amigos mutuos, emisor miembro del lobby, destino propio y caducidad de dos minutos.'};
const annotated='// RTDB 1.3.0: mismo contenido que database.rules.json, con comentarios.\n'+output.split('\n').map(line=>{const match=line.match(/^(\s*)"([^"\n]+)":/);return match&&comments[match[2]]?`${match[1]}// ${comments[match[2]]}\n${line}`:line;}).join('\n');
const commentedFile=new URL('database.rules.commented.jsonc',root);
if(process.argv.includes('--check')){if(fs.readFileSync(commentedFile,'utf8')!==annotated)throw new Error('Regenera las reglas comentadas.');}else fs.writeFileSync(commentedFile,annotated);
console.log(`REGLAS OK: ${monsters.length} monstruos y ${labelsFrom(monsters).length} etiquetas derivadas del JSON.`);
