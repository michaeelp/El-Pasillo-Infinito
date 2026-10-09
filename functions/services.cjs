// Lógica reutilizable por callables, triggers y pruebas con los emuladores.
const {randomBytes,createHash}=require('node:crypto');
const settings=require('./settings.json');
class ServiceError extends Error {constructor(code,message){super(message);this.code=code;}}
const fail=(code,message)=>{throw new ServiceError(code,message);};
const blankStats=()=>({partidas:0,pasillos:0,mejores:{},precisionTotal:0,precisionMuestras:0,tiempoMs:0,rachaMax:0,carrerasGanadas:0,cooperativas:0,bestiario:{},logros:[]});
function username(value) {
  const name=String(value||'').normalize('NFKC').trim(),lower=name.toLowerCase();
  if(!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_]{3,14}$/.test(name))fail('invalid-argument','Nombre: 3–14 letras, números o _.');
  if(settings.USERNAMES.reservados.includes(lower)||settings.USERNAMES.ofensivos.some(w=>lower.includes(w)))fail('invalid-argument','Nombre no permitido.');
  return {name,lower};
}
function createServices({fs,rt,auth,FieldValue}) {
  const userRef=uid=>fs.doc(`users/${uid}`), friendRef=(uid,other)=>userRef(uid).collection('amigos').doc(other);
  async function mirrorPair(a,b) {
    const [left,right]=await Promise.all([friendRef(a,b).get(),friendRef(b,a).get()]);
    const confirmed=left.data()?.estado==='amigos'&&right.data()?.estado==='amigos';
    await rt.ref().update({[`amigos/${a}/${b}`]:confirmed?true:null,[`amigos/${b}/${a}`]:confirmed?true:null});
  }
  async function provisionAccount(uid,value) {
    try{await auth.getUser(uid);}catch{fail('unauthenticated','Vuelve a iniciar sesión.');}
    if((await fs.doc(`accountCleanup/${uid}`).get()).exists)fail('failed-precondition','La cuenta se está eliminando.');
    const {name,lower}=username(value),owner=userRef(uid),existing=await owner.get();
    if(existing.exists){await mirrorAccount(uid,existing.data());return existing.data();}
    // Perfil, nombre y código se reservan en UNA transacción; ningún fallo parcial reserva un nombre.
    for(let attempt=0;attempt<12;attempt++) {
      const code=Array.from(randomBytes(6),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
      const nameRef=fs.doc(`usernames/${lower}`),codeRef=fs.doc(`friendcodes/${code}`);
      const profile={nombre:name,nombreLower:lower,avatar:1,xp:0,nivel:1,codigoAmigo:code,creadoEn:FieldValue.serverTimestamp(),estadisticas:blankStats(),preferencias:{solicitudes:true},ultimaPartida:''};
      try {
        const result=await fs.runTransaction(async tx=>{
          const [user,n,c,cleanup]=await Promise.all([tx.get(owner),tx.get(nameRef),tx.get(codeRef),tx.get(fs.doc(`accountCleanup/${uid}`))]);
          if(cleanup.exists)fail('failed-precondition','La cuenta se está eliminando.');
          if(user.exists)return user.data();
          if(n.exists)fail('already-exists','Nombre en uso.');
          if(c.exists)fail('aborted','Código repetido.');
          tx.create(nameRef,{uid});tx.create(codeRef,{uid});tx.create(owner,profile);return profile;
        });
        await mirrorAccount(uid,result);return result;
      } catch(e) {if(e.code!=='aborted')throw e;}
    }
    fail('unavailable','No se pudo crear el código. Reintenta.');
  }
  async function mirrorAccount(uid,p) {
    // Leer el estado actual evita que un evento antiguo restaure una cuenta ya eliminada.
    p=(await userRef(uid).get()).data();
    try{await auth.getUser(uid);}catch(e){if(e.code==='auth/user-not-found')p=null;else throw e;}
    if(!p || (await fs.doc(`accountCleanup/${uid}`).get()).exists)await rt.ref(`cuentas/${uid}`).remove();
    else await rt.ref(`cuentas/${uid}`).set({nombre:p.nombre,avatar:p.avatar,activo:true});
  }
  async function resolveTarget(value) {
    const text=String(value||'').trim();let snap;
    if(text.startsWith('@'))snap=await fs.doc(`usernames/${username(text.slice(1)).lower}`).get();
    else {const code=text.toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))fail('invalid-argument','Usa @nombre o un código de 6 caracteres.');snap=await fs.doc(`friendcodes/${code}`).get();}
    if(!snap.exists)fail('not-found','Jugador no encontrado.');return snap.data().uid;
  }
  async function socialAction(uid,{accion,otroUid,etiqueta}) {
    const other=accion==='enviar'?await resolveTarget(etiqueta):String(otroUid||'');
    if(!other||other.includes('/')||uid===other)fail('invalid-argument','Elige otro jugador.');
    const left=friendRef(uid,other),right=friendRef(other,uid),rateRef=fs.doc(`socialLimits/${uid}`);
    await fs.runTransaction(async tx=>{
      const [me,them,l,r,rate,myList,theirList,cleanMe,cleanOther]=await Promise.all([
        tx.get(userRef(uid)),tx.get(userRef(other)),tx.get(left),tx.get(right),tx.get(rateRef),
        tx.get(userRef(uid).collection('amigos')),tx.get(userRef(other).collection('amigos')),
        tx.get(fs.doc(`accountCleanup/${uid}`)),tx.get(fs.doc(`accountCleanup/${other}`))
      ]);
      await Promise.all([tx.get(fs.doc(`socialMutex/${uid}`)),tx.get(fs.doc(`socialMutex/${other}`))]);
      if(!me.exists||!them.exists||cleanMe.exists||cleanOther.exists)fail('failed-precondition','Perfil no disponible.');
      const state=l.data()?.estado,peer=r.data()?.estado,now=Date.now();
      const count=(snap,status)=>snap.docs.filter(d=>status==='pendiente'?d.data().estado!=='amigos':d.data().estado===status).length;
      if(accion==='enviar') {
        if(state)fail('already-exists',state==='amigos'?'Ya sois amigos.':'Solicitud pendiente.');
        if(them.data().preferencias?.solicitudes===false)fail('permission-denied','No recibe solicitudes.');
        if(count(myList,'amigos')>=settings.SOCIAL.amigosMax||count(theirList,'amigos')>=settings.SOCIAL.amigosMax)fail('resource-exhausted','Límite de amigos.');
        if(count(myList,'pendiente')>=settings.SOCIAL.pendientesMax||count(theirList,'pendiente')>=settings.SOCIAL.pendientesMax)fail('resource-exhausted','Límite de solicitudes.');
        const times=(rate.data()?.envios||[]).filter(t=>now-t<3600000);
        if(times.length>=settings.SOCIAL.solicitudesHora)fail('resource-exhausted','Límite de solicitudes por hora.');
        tx.set(rateRef,{envios:[...times,now]});
        tx.create(left,{estado:'pendienteEnviada',fecha:FieldValue.serverTimestamp()});tx.create(right,{estado:'pendienteRecibida',fecha:FieldValue.serverTimestamp()});
      } else if(accion==='aceptar') {
        if(state!=='pendienteRecibida'||peer!=='pendienteEnviada')fail('failed-precondition','Solicitud no disponible.');
        if(count(myList,'amigos')>=settings.SOCIAL.amigosMax||count(theirList,'amigos')>=settings.SOCIAL.amigosMax)fail('resource-exhausted','Límite de amigos.');
        tx.set(left,{estado:'amigos',fecha:FieldValue.serverTimestamp()});tx.set(right,{estado:'amigos',fecha:FieldValue.serverTimestamp()});
      } else {
        const expected={rechazar:'pendienteRecibida',cancelar:'pendienteEnviada',eliminar:'amigos'}[accion];
        if(!expected||state!==expected)fail('failed-precondition','Solicitud no disponible.');
        tx.delete(left);tx.delete(right);
      }
      // Documento mutex: serializa también aceptaciones concurrentes dirigidas al mismo jugador.
      tx.set(fs.doc(`socialMutex/${uid}`),{t:now});tx.set(fs.doc(`socialMutex/${other}`),{t:now});
    });
    await mirrorPair(uid,other);return {ok:true,uid:other};
  }
  async function setAvatar(uid,avatar) {
    if(!Number.isInteger(avatar)||avatar<1||avatar>settings.AVATAR_COUNT)fail('invalid-argument','Avatar inválido.');
    const ref=userRef(uid),p=await ref.get();if(!p.exists)fail('failed-precondition','Perfil no disponible.');
    await ref.update({avatar});await mirrorAccount(uid,{...p.data(),avatar});return {ok:true};
  }
  async function publishCoopRecord(uid,{sala,partida}) {
    if(!/^[A-Z]{4}$/.test(sala||''))fail('invalid-argument','Sala inválida.');
    const room=(await rt.ref(`rooms/${sala}`).get()).val(),meta=room?.meta;
    if(!meta||meta.modo!=='coop'||meta.estado!=='podium'||meta.match!==partida||meta.personalizada||!room.jugadores?.[uid])fail('permission-denied','Partida no válida.');
    const members=Object.keys(room.jugadores).sort();if(members.length!==3)fail('failed-precondition','Equipo incompleto.');
    const caller=await userRef(uid).get();if(!caller.exists)fail('permission-denied','Perfil no disponible.');
    const id=createHash('sha256').update(members.join('|')).digest('hex'),owner=members[0],ref=fs.doc(`records_coop_${meta.dificultad}/${id}`);
    if(!settings.DIFFICULTIES[meta.dificultad]||!Number.isInteger(meta.pasillos)||meta.pasillos<1||meta.pasillos>10000)fail('invalid-argument','Puntuación inválida.');
    await fs.runTransaction(async tx=>{
      const [previous,player]=await Promise.all([tx.get(ref),tx.get(userRef(owner))]);
      if(!player.exists)fail('failed-precondition','Perfil no disponible.');
      if(settings.REEMPLAZAR_SOLO_SI_MEJOR&&previous.exists&&previous.data().puntuacion>=meta.pasillos)return;
      const p=player.data();tx.set(ref,{uid:owner,nombre:p.nombre,avatar:p.avatar,nivel:p.nivel,puntuacion:meta.pasillos,fecha:FieldValue.serverTimestamp(),dificultad:meta.dificultad,miembros:members});
    });return {ok:true};
  }
  async function deleteAccount(uid) {
    const marker=fs.doc(`accountCleanup/${uid}`),profile=await userRef(uid).get();
    // El marcador conserva lo necesario para reanudar una eliminación interrumpida.
    if(profile.exists)await marker.set({nombreLower:profile.data().nombreLower,codigoAmigo:profile.data().codigoAmigo,inicio:FieldValue.serverTimestamp()},{merge:true});
    await cleanupAccount(uid);return {ok:true};
  }
  async function cleanupAccount(uid) {
    const marker=fs.doc(`accountCleanup/${uid}`),m=await marker.get();if(!m.exists)return;
    await rt.ref(`cuentas/${uid}`).remove();
    // Revocar vínculos antes de borrar documentos para que las reglas no acepten invitaciones residuales.
    const friends=await userRef(uid).collection('amigos').get(),patch={[`amigos/${uid}`]:null,[`presencia/${uid}`]:null,[`invitaciones/${uid}`]:null};
    for(const f of friends.docs)patch[`amigos/${f.id}/${uid}`]=null;
    const batch=fs.batch();for(const f of friends.docs){batch.delete(f.ref);batch.delete(friendRef(f.id,uid));}await batch.commit();
    const invites=await rt.ref('invitaciones').get();invites.forEach(dest=>dest.forEach(inv=>{if(inv.val().de===uid)patch[`invitaciones/${dest.key}/${inv.key}`]=null;}));
    const rooms=await rt.ref('rooms').get();rooms.forEach(room=>{if(room.child(`jugadores/${uid}`).exists())patch[`rooms/${room.key}`]=null;});await rt.ref().update(patch);
    for(const mode of ['solo','carrera','coop'])for(const d of Object.keys(settings.DIFFICULTIES)) {
      const collection=fs.collection(`records_${mode}_${d}`);
      if(mode==='coop'){const records=await collection.where('miembros','array-contains',uid).get();const b=fs.batch();for(const record of records.docs)b.delete(record.ref);await b.commit();}
      else await collection.doc(uid).delete();
    }
    await fs.recursiveDelete(userRef(uid));
    const {nombreLower,codigoAmigo}=m.data();
    await fs.runTransaction(async tx=>{const nr=fs.doc(`usernames/${nombreLower}`),cr=fs.doc(`friendcodes/${codigoAmigo}`);const [n,c]=await Promise.all([tx.get(nr),tx.get(cr)]);if(n.data()?.uid===uid)tx.delete(nr);if(c.data()?.uid===uid)tx.delete(cr);});
    await Promise.all([fs.doc(`socialLimits/${uid}`).delete(),fs.doc(`socialMutex/${uid}`).delete()]);
    try{await auth.deleteUser(uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;}await marker.delete();
  }
  return {provisionAccount,socialAction,setAvatar,mirrorPair,mirrorAccount,deleteAccount,cleanupAccount,publishCoopRecord};
}
module.exports={createServices,ServiceError,username};
