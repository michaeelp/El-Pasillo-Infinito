import { FIREBASE_CONFIG, ONLINE } from './config.js?v=1.2.0';
import { firebaseApp, isConfigured, withDeadline } from './sdk.js?v=1.2.0';
import { sanitizeName } from './storage.js?v=1.2.0';
export const onlineConfigured = () => isConfigured() && !!FIREBASE_CONFIG.databaseURL;
export const networkError = error => /permission|denied/i.test(error?.message || '') ? 'Acceso rechazado. Revisa las reglas de Firebase.' : /anonymous|operation-not-allowed/i.test(error?.message || '') ? 'Activa la autenticación anónima en Firebase.' : 'No se pudo conectar. Reintenta.';
export const shortError = error => /^(Espera|Avatar|Ese rol|No se|La sala|La partida|Cooperativo|Faltan|Firebase)/.test(error?.message||'') ? error.message : networkError(error);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export class Network {
  constructor(onChange = () => {}) {
    this.onChange = onChange; this.offset = 0; this.connected = false; this.code = ''; this.uid = ''; this.stops = []; this.globalStops = []; this.writes = [];
    this.data = {meta:null, jugadores:{}, entregas:{}, resultados:{}, veredictos:{}, chat:{}, live:{}, whispers:{}, audits:{}};
  }
  now() {return Date.now() + this.offset;}
  async connect() {
    if (this.db) return;
    if (!onlineConfigured()) throw new Error('Firebase no configurado.');
    if (this.loading) return this.loading;
    this.loading = withDeadline((async () => {
      const app = await firebaseApp();
      const auth = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
      this.sdk = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js');
      const service = auth.getAuth(app);
      const user = service.currentUser || (await auth.signInAnonymously(service)).user;
      this.uid = user.uid; this.db = this.sdk.getDatabase(app);
      this.globalStops.push(this.sdk.onValue(this.sdk.ref(this.db,'.info/serverTimeOffset'), snap => {this.offset = snap.val() || 0;}));
      await new Promise((resolve,reject) => {
        const stop = this.sdk.onValue(this.sdk.ref(this.db,'.info/connected'), snap => {
          this.connected = snap.val() === true;
          if (this.connected) {resolve(); if (this.code) this.presence().catch(error => this.fail(error));}
          this.emit();
        },reject); this.globalStops.push(stop);
      });
    })()).catch(error => {this.db = null; for (const stop of this.globalStops.splice(0)) stop(); throw error;}).finally(() => {this.loading = null;});
    return this.loading;
  }
  ref(path = '') {return this.sdk.ref(this.db, `rooms/${this.code}${path ? '/'+path : ''}`);}
  emit() {this.onChange({...this.data, uid:this.uid, code:this.code, connected:this.connected});}
  fail(error) {this.error = networkError(error); this.emit();}
  async read(path) {return (await withDeadline(this.sdk.get(this.ref(path)))).val();}
  budget() {
    const now = this.now(); this.writes = this.writes.filter(time => now-time<1000);
    if (this.writes.length >= ONLINE.maxWritesPerSecond) throw new Error('Espera un momento.'); this.writes.push(now);
  }
  async set(path, value) {this.budget(); return withDeadline(this.sdk.set(this.ref(path),value));}
  async update(path, values) {this.budget(); return withDeadline(this.sdk.update(this.ref(path),values));}
  async transaction(path, update) {this.budget(); return withDeadline(this.sdk.runTransaction(this.ref(path),update,{applyLocally:false}));}
  async create(mode, profile) {
    await this.connect(); await this.leave();
    for (let attempt=0;attempt<8;attempt++) {
      this.code = Array.from(crypto.getRandomValues(new Uint8Array(4)), n => alphabet[n%alphabet.length]).join('');
      const created = await this.transaction('meta', old => {
        if (old) return;
        return {host:this.uid,modo:mode,estado:'lobby',ronda:0,pasillos:0,vidas:ONLINE.lives,inicioFase:0,semilla:0,createdAt:this.now(),expiresAt:this.now()+ONLINE.roomTtlMs,uniqueAvatars:ONLINE.uniqueAvatars};
      });
      if (created.committed) {await this.join(this.code,profile); return;}
    }
    this.code = ''; throw new Error('No se pudo crear la sala.');
  }
  async join(code, profile) {
    await this.connect(); if (this.code && this.code !== code) await this.leave();
    this.code = String(code).toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);
    try {
      const meta = await this.read('meta');
      if (!meta || meta.expiresAt < this.now()) throw new Error('La sala no existe.');
      const own = await this.read(`jugadores/${this.uid}`);
      if (meta.estado !== 'lobby' && !own) throw new Error('La partida ya empezó.');
      if (!own && meta.uniqueAvatars) await this.claim('avatars',profile.avatar);
      if (!own) {
        const slots=await this.read('claims/slots')||{};let slot=0;
        for(let id=1;id<=(meta.modo==='coop'?ONLINE.coopPlayers:ONLINE.raceMax);id++){
          if(slots[id]&&slots[id]!==this.uid)continue;
          try{await this.claim('slots',id);slot=id;break;}catch{}
        }
        if(!slot)throw new Error('La sala está llena.');
        this.joinSlot=slot;
        await this.set(`jugadores/${this.uid}`, {nombre:sanitizeName(profile.nombre),avatar:profile.avatar,slot,rol:'',listo:false,iaLista:false,progreso:0,ausente:false,changed:this.now()});
      }
      this.subscribe(); await this.presence();
      try {sessionStorage.setItem('pasillo-room',this.code);} catch {}
    } catch (error) {
      try {if (this.code && !await this.read(`jugadores/${this.uid}`)){await this.release('avatars',profile.avatar);await this.release('slots',this.joinSlot);}} catch {}
      this.code=''; throw error;
    }
  }
  subscribe() {
    for (const stop of this.stops.splice(0)) stop();
    for (const branch of Object.keys(this.data)) {
      this.stops.push(this.sdk.onValue(this.ref(branch),snap=>{this.data[branch]=snap.val() || (branch==='meta'?null:{});this.emit();},error=>this.fail(error)));
    }
  }
  async presence() {
    if (!this.code) return;
    const player = this.ref(`jugadores/${this.uid}`);
    await this.sdk.onDisconnect(player).update({ausente:true,listo:false,changed:this.sdk.serverTimestamp()});
    await this.update(`jugadores/${this.uid}`, {ausente:false,changed:this.now()});
  }
  async claim(type, id) {
    const result = await this.transaction(`claims/${type}/${id}`, owner => owner && owner !== this.uid ? undefined : this.uid);
    if (!result.committed) throw new Error(type==='avatars'?'Avatar ocupado. Elige otro en Perfil.':'Ese rol está ocupado.');
  }
  async release(type,id) {if (id === '' || id == null) return; await this.transaction(`claims/${type}/${id}`,owner=>owner===this.uid?null:undefined);}
  async role(role) {
    const old = this.data.jugadores[this.uid]?.rol;
    if (role) await this.claim('roles',role);
    try {await this.update(`jugadores/${this.uid}`,{rol:role,listo:false});} catch (error) {if(role) await this.release('roles',role);throw error;}
    if (old && old!==role) await this.release('roles',old);
  }
  async player(values) {return this.update(`jugadores/${this.uid}`,values);}
  async meta(values) {return this.update('meta',{...values,expiresAt:this.now()+ONLINE.roomTtlMs});}
  watchSecret(round, callback) {return this.sdk.onValue(this.ref(`secreto/${round}/${this.uid}`),snap=>callback(snap.val()),error=>this.fail(error));}
  async secret(round, monsterId) {return this.set(`secreto/${round}/${this.uid}`, {monstruoId:monsterId});}
  async result(round,result) {return this.set(`resultados/${round}/${this.uid}`,{...result,t:this.now()});}
  async submit(round, ms) {return this.set(`entregas/${round}/${this.uid}`,{ms,t:this.now()});}
  async verdict(round,result) {return this.set(`veredictos/${round}/${this.uid}`,result);}
  async message(text, whisper = '') {
    const clean = String(text).normalize('NFKC').replace(/[<>\u0000-\u001f]/g,'').slice(0,60).trim(); if (!clean) return;
    const last = whisper ? this.lastWhisper||this.data.whispers?.[this.uid]?.__last : this.lastChat||this.data.chat?.[this.uid]?.__last;
    if (this.now()-(last || 0) < (whisper?ONLINE.whisperMs:ONLINE.chatMs)) throw new Error('Espera un momento.');
    const branch=whisper?'whispers':'chat',time=this.now(),key=String(Math.floor(time/(whisper?ONLINE.whisperMs:ONLINE.chatMs))%30);
    const values={[`${branch}/${this.uid}/${key}`]:{uid:this.uid,texto:clean,t:time,tipo:whisper || 'chat'},[`${branch}/${this.uid}/__last`]:time};
    const previous=Object.entries(this.data[branch]?.[this.uid]||{}).filter(([id])=>id!=='__last').sort(([,a],[,b])=>a.t-b.t);
    for(const[id]of previous.slice(0,Math.max(0,previous.length-29)))values[`${branch}/${this.uid}/${id}`]=null;
    await this.update('',values);
    if (whisper) this.lastWhisper=this.now(); else this.lastChat=this.now();
  }
  async leave() {
    for (const stop of this.stops.splice(0)) stop();
    if (this.code && this.db) {
      const own = this.data.jugadores[this.uid];
      try {
        await this.sdk.onDisconnect(this.ref(`jugadores/${this.uid}`)).cancel();
        if (this.data.meta?.estado==='lobby') {
          await this.set(`jugadores/${this.uid}`,null);
          if (own?.rol) await this.release('roles',own.rol);
          if (own?.avatar) await this.release('avatars',own.avatar);
          if (own?.slot) await this.release('slots',own.slot);
        } else if (own) await this.player({ausente:true,listo:false,changed:this.now()});
      } catch {}
    }
    this.code=''; this.data={meta:null,jugadores:{},entregas:{},resultados:{},veredictos:{},chat:{},live:{},whispers:{},audits:{}}; this.error='';
    try {sessionStorage.removeItem('pasillo-room');} catch {}
  }
}
