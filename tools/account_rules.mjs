// Genera las reglas completas y los valores compartidos por Functions desde config.js.
import fs from 'node:fs';
import {USERNAMES,SOCIAL,XP,AVATAR_COUNT,DIFFICULTIES,FUNCTIONS_REGION,REEMPLAZAR_SOLO_SI_MEJOR} from '../js/config.js';
const root=new URL('../',import.meta.url),write=(name,s)=>{const path=new URL(name,root);if(process.argv.includes('--check')){if(fs.readFileSync(path,'utf8')!==s)throw new Error(`Regenera ${name}: npm run generate:rules`);}else fs.writeFileSync(path,s);};
write('functions/settings.json',JSON.stringify({XP,USERNAMES,SOCIAL,DIFFICULTIES,AVATAR_COUNT,FUNCTIONS_REGION,REEMPLAZAR_SOLO_SI_MEJOR},null,2)+'\n');
let total=0;const thresholds=[];for(let level=1;level<=XP.nivelMax;level++){thresholds.push(total);total+=Math.round(XP.base*level**XP.exponente);}
const names=USERNAMES.reservados.join('|'),offenses=USERNAMES.ofensivos.join('|');
const modes=['solo','carrera','coop'];
let rules=`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Una sesión anónima no es una cuenta. Los documentos públicos nunca contienen correo.
    function account() {return request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';}
    function owner(uid) {return account() && request.auth.uid == uid && !exists(/databases/$(database)/documents/accountCleanup/$(uid));}
    function user(uid) {return get(/databases/$(database)/documents/users/$(uid)).data;}
    function validName(name) {return name is string && name.matches('^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_]{3,14}$') && !name.lower().matches('^(${names})$') && !name.lower().matches('.*(${offenses}).*');}
    function validLevel(xp,nivel) {let limits=${JSON.stringify(thresholds)};return xp is int && xp>=0 && nivel is int && nivel>=1 && nivel<=${XP.nivelMax} && xp>=limits[nivel-1] && (nivel==${XP.nivelMax} || xp<limits[nivel]);}
    function validStats(s) {return s is map && s.keys().hasAll(['partidas','pasillos','mejores','precisionTotal','precisionMuestras','tiempoMs','rachaMax','carrerasGanadas','cooperativas','bestiario','logros']) && s.keys().hasOnly(['partidas','pasillos','mejores','precisionTotal','precisionMuestras','tiempoMs','rachaMax','carrerasGanadas','cooperativas','bestiario','logros']) && s.partidas is int && s.partidas>=0 && s.pasillos is int && s.pasillos>=0 && s.precisionTotal is int && s.precisionTotal>=0 && s.precisionMuestras is int && s.precisionMuestras>=0 && s.tiempoMs is int && s.tiempoMs>=0 && s.rachaMax is int && s.rachaMax>=0 && s.carrerasGanadas is int && s.carrerasGanadas>=0 && s.cooperativas is int && s.cooperativas>=0 && s.mejores is map && s.bestiario is map && s.bestiario.size()<=30 && s.logros is list && s.logros.size()<=12;}
    function shape(p) {return p.keys().hasAll(['nombre','nombreLower','avatar','xp','nivel','codigoAmigo','creadoEn','estadisticas','preferencias','ultimaPartida']) && p.keys().hasOnly(['nombre','nombreLower','avatar','xp','nivel','codigoAmigo','creadoEn','estadisticas','preferencias','ultimaPartida']) && validName(p.nombre) && p.nombreLower==p.nombre.lower() && p.avatar is int && p.avatar>=1 && p.avatar<=${AVATAR_COUNT} && validLevel(p.xp,p.nivel) && p.codigoAmigo is string && p.codigoAmigo.matches('^[A-Z2-9]{6}$') && p.creadoEn is timestamp && validStats(p.estadisticas) && p.preferencias.keys().hasOnly(['solicitudes']) && p.preferencias.solicitudes is bool && p.ultimaPartida is string;}
    // getAfter exige las tres reservas en el mismo commit; no hay nombres sueltos.
    match /usernames/{name} {
      allow read: if account();
      allow create: if owner(request.resource.data.uid) && request.resource.data.keys().hasOnly(['uid']) && getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data.nombreLower==name;
      allow update,delete: if false;
    }
    match /friendcodes/{code} {
      allow read: if account();
      allow create: if owner(request.resource.data.uid) && request.resource.data.keys().hasOnly(['uid']) && getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data.codigoAmigo==code;
      allow update,delete: if false;
    }
    match /users/{uid} {
      allow read: if account();
      allow create: if owner(uid) && shape(request.resource.data) && request.resource.data.xp==0 && request.resource.data.nivel==1 && request.resource.data.creadoEn==request.time && request.resource.data.estadisticas.partidas==0 && request.resource.data.estadisticas.pasillos==0 && request.resource.data.ultimaPartida=='' && getAfter(/databases/$(database)/documents/usernames/$(request.resource.data.nombreLower)).data.uid==uid && getAfter(/databases/$(database)/documents/friendcodes/$(request.resource.data.codigoAmigo)).data.uid==uid;
      // Identidad inmutable. Avatar y preferencias son las únicas ediciones libres.
      allow update: if owner(uid) && shape(request.resource.data) && request.resource.data.nombre==resource.data.nombre && request.resource.data.nombreLower==resource.data.nombreLower && request.resource.data.codigoAmigo==resource.data.codigoAmigo && request.resource.data.creadoEn==resource.data.creadoEn && request.resource.data.xp>=resource.data.xp && request.resource.data.nivel>=resource.data.nivel && (
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['avatar','preferencias']) || validMatch(uid)
      );
      allow delete: if false; // La callable elimina ambos extremos, registros y Auth con reintentos.
      function validMatch(uid) {
        let id=request.resource.data.ultimaPartida;
        let receipt=getAfter(/databases/$(database)/documents/users/$(uid)/partidas/$(id)).data;
        return request.resource.data.diff(resource.data).affectedKeys().hasOnly(['xp','nivel','estadisticas','ultimaPartida']) && id!=resource.data.ultimaPartida && !exists(/databases/$(database)/documents/users/$(uid)/partidas/$(id)) && receipt.fecha==request.time && receipt.xp==request.resource.data.xp-resource.data.xp && receipt.xp<=${XP.maxPartida} && request.resource.data.estadisticas.partidas==resource.data.estadisticas.partidas+1 && request.resource.data.estadisticas.pasillos>=resource.data.estadisticas.pasillos && request.resource.data.estadisticas.tiempoMs>=resource.data.estadisticas.tiempoMs;
      }
      match /partidas/{id} {
        allow read: if owner(uid);
        allow create: if owner(uid) && request.resource.data.keys().hasAll(['xp','fecha','modo','dificultad']) && request.resource.data.keys().hasOnly(['xp','fecha','modo','dificultad']) && request.resource.data.xp is int && request.resource.data.xp>=0 && request.resource.data.xp<=${XP.maxPartida} && request.resource.data.fecha==request.time && request.resource.data.modo in ['solo','race','coop'] && request.resource.data.dificultad in ['facil','normal','dificil','pesadilla'] && getAfter(/databases/$(database)/documents/users/$(uid)).data.ultimaPartida==id && getAfter(/databases/$(database)/documents/users/$(uid)).data.xp==user(uid).xp+request.resource.data.xp;
        allow update,delete: if false;
      }
      match /amigos/{otherUid} {
        allow read: if owner(uid);
        allow write: if false; // socialAction valida estados, límites y escribe ambos extremos.
      }
    }
    function record(p,uid,d,max) {return owner(uid) && p.keys().hasAll(['uid','nombre','avatar','nivel','puntuacion','fecha','dificultad']) && p.keys().hasOnly(['uid','nombre','avatar','nivel','puntuacion','fecha','dificultad']) && p.uid==uid && p.nombre==user(uid).nombre && p.avatar==user(uid).avatar && p.nivel==user(uid).nivel && p.puntuacion is int && p.puntuacion>=1 && p.puntuacion<=max && p.fecha==request.time && p.dificultad==d;}
`;
for(const mode of modes)for(const d of Object.keys(DIFFICULTIES)){
 if(mode==='coop')rules+=`    // Hash SHA-256 calculado por publishCoopRecord; miembros ordenados, dueño = menor uid.
    match /records_coop_${d}/{idEquipo} {
      allow read: if true;
      allow write: if false; // Admin únicamente; la callable comprueba la sala, el equipo y la identidad.
    }
`;
 else rules+=`    match /records_${mode}_${d}/{uid} {
      allow read: if true;
      allow create: if record(request.resource.data,uid,'${d}',${mode==='solo'?10000:50000});
      allow update: if record(request.resource.data,uid,'${d}',${mode==='solo'?10000:50000})${REEMPLAZAR_SOLO_SI_MEJOR?' && request.resource.data.puntuacion>=resource.data.puntuacion':''};
      allow delete: if false;
    }
`;
}
rules+=`    match /{document=**} {allow read,write: if false;}
  }
}
`;
write('firestore.rules',rules);
const indexes=[];
for(const d of Object.keys(DIFFICULTIES))indexes.push({collectionGroup:`records_coop_${d}`,queryScope:'COLLECTION',fields:[{fieldPath:'miembros',arrayConfig:'CONTAINS'},{fieldPath:'puntuacion',order:'DESCENDING'}]});
for(const mode of ['solo','carrera'])for(const d of Object.keys(DIFFICULTIES))indexes.push({collectionGroup:`records_${mode}_${d}`,queryScope:'COLLECTION',fields:[{fieldPath:'puntuacion',order:'DESCENDING'},{fieldPath:'__name__',order:'ASCENDING'}]});
write('firestore.indexes.json',JSON.stringify({indexes,fieldOverrides:[]},null,2)+'\n');
console.log('Reglas de cuentas, recibos de XP, 12 listas e índices actualizados.');
