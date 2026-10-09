import { ONLINE } from './config.js?v=1.1.0';
import { Network, networkError, shortError } from './net.js?v=1.1.0';
import { getProfile, playerNode } from './profile.js?v=1.1.0';
import { assignRoles, ROLES } from './coop.js?v=1.1.0';
import { screen, toast } from './ui.js?v=1.1.0';
const $ = id => document.getElementById(id);
export function messages(value) {return Object.values(value || {}).flatMap(branch=>Object.values(branch || {})).filter(item=>item&&typeof item==='object'&&typeof item.texto==='string').sort((a,b)=>a.t-b.t).slice(-30);}
export function createChat(root, net, quick = false) {
  root.replaceChildren();
  const list=document.createElement('ul');list.className='chat-messages';list.setAttribute('aria-live','polite');
  const form=document.createElement('form');form.className='chat-form';const input=document.createElement('input');input.maxLength=60;input.placeholder='Mensaje';input.setAttribute('aria-label','Mensaje');
  const button=document.createElement('button');button.type='submit';button.textContent='ENVIAR';form.append(input,button);root.append(list,form);
  const send=async text=>{try{await net.message(text);}catch(error){toast(shortError(error));}};
  form.onsubmit=async event=>{event.preventDefault();const text=input.value;input.value='';await send(text);};
  if(quick){const actions=document.createElement('div');actions.className='chat-quick';for(const text of ['¡Rápido!','No, otra cosa','¡Es ese!']){const b=document.createElement('button');b.textContent=text;b.onclick=()=>send(text);actions.append(b);}root.append(actions);}
  let previous='';
  return data=>{
    const incoming=messages(data.chat),key=JSON.stringify(incoming);if(key===previous)return;previous=key;
    list.replaceChildren();
    for(const message of incoming){const row=document.createElement('li'),text=document.createElement('span');text.className='message';text.textContent=String(message.texto).slice(0,60);row.append(playerNode(data.jugadores[message.uid]||{nombre:'Jugador',avatar:1}),text);list.append(row);}
    list.scrollTop=list.scrollHeight;
  };
}
export class Lobby {
  constructor(recognizer, onRoom, onMenu) {
    this.recognizer=recognizer;this.onRoom=onRoom;this.onMenu=onMenu;this.mode='race';
    this.net=new Network(data=>{this.render(data);this.onRoom(data);});
    this.chat=createChat($('lobby-chat'),this.net);
    $('create-room').onclick=()=>this.action(()=>this.net.create(this.mode,getProfile()));
    $('join-form').onsubmit=event=>{event.preventDefault();this.action(()=>this.net.join($('room-input').value,getProfile()));};
    $('leave-room').onclick=async()=>{await this.net.leave();this.onMenu();};
    $('copy-code').onclick=()=>this.copy(this.net.code);$('copy-link').onclick=()=>{const url=new URL(location.href);url.search='';url.searchParams.set('sala',this.net.code);this.copy(url.href);};
    $('role-choice').onchange=()=>this.action(()=>this.net.role($('role-choice').value));
    $('ready-room').onclick=()=>this.action(()=>{const own=this.net.data.jugadores[this.net.uid];return this.net.player({listo:!(own?.listo&&(own.readyRevision||0)===(this.net.data.meta?.revision||0)),readyRevision:this.net.data.meta?.revision||0});});
    $('room-mode').onchange=()=>this.action(async()=>{
      const mode=$('room-mode').value;if(mode==='coop'&&Object.keys(this.net.data.jugadores).length>ONLINE.coopPlayers)throw new Error('Cooperativo necesita 3 jugadores.');
      if(mode==='coop'&&Object.values(this.net.data.jugadores).some(player=>player.slot>ONLINE.coopPlayers)){$('room-mode').value=this.net.data.meta.modo;throw new Error('Cooperativo: crea otra sala.');}
      await this.net.meta({modo:mode,revision:(this.net.data.meta?.revision||0)+1});
    });
    $('start-room').onclick=()=>this.action(()=>this.start());
  }
  async open(mode, code='') {
    this.mode=mode;screen('lobby','lobby');$('room-entry').hidden=false;$('room-content').hidden=true;$('lobby-error').textContent='';$('lobby-title').textContent=mode==='race'?'Carrera':'Cooperativo';
    if(code){$('room-input').value=code;await this.action(()=>this.net.join(code,getProfile()));}
  }
  async action(fn) {
    if(this.busy)return;this.busy=true;$('lobby-error').textContent='';$('create-room').disabled=true;
    try{await fn();}catch(error){$('lobby-error').textContent=/sala|partida|Avatar|rol|jugadores|momento/i.test(error.message)?error.message:networkError(error);}
    finally{this.busy=false;$('create-room').disabled=false;}
  }
  async copy(text) {try{await navigator.clipboard.writeText(text);toast('Copiado.');}catch{toast('No se pudo copiar.');}}
  canStart(data=this.net.data) {
    const players=Object.values(data.jugadores),mode=data.meta?.modo;
    return players.length>=(mode==='coop'?ONLINE.coopPlayers:ONLINE.raceMin)&&players.length<=(mode==='coop'?ONLINE.coopPlayers:ONLINE.raceMax)&&players.every(p=>p.iaLista&&p.listo&&!p.ausente&&(p.readyRevision||0)===(data.meta?.revision||0));
  }
  async start() {
    const data=this.net.data;if(!this.canStart()||data.meta.host!==this.net.uid)throw new Error('Faltan jugadores listos.');
    const roles=data.meta.modo==='coop'?assignRoles(data.jugadores):{};
    await this.net.meta({estado:'round',ronda:1,pasillos:0,vidas:ONLINE.lives,inicioFase:this.net.now()+ONLINE.leadMs,semilla:data.meta.modo==='race'?crypto.getRandomValues(new Uint32Array(1))[0]:0,match:Date.now(),roles,board:{},lastMonster:0});
  }
  async aiStatus(status) {
    this.status=status;if(!this.net.code||!this.net.data.jugadores[this.net.uid])return;
    const now=performance.now();if(status.state==='loading'&&now-(this.progressAt||0)<800)return;this.progressAt=now;
    try{await this.net.player({iaLista:status.state==='ready',progreso:status.state==='ready'?100:status.percent||0,...(status.state==='ready'?{}:{listo:false})});}catch{}
  }
  render(data) {
    if(!data.meta)return;
    if(data.meta.expiresAt<this.net.now()){$('lobby-error').textContent='La sala expiró.';return;}
    if(data.meta.estado==='lobby'&&document.body.classList.contains('online')){document.body.classList.remove('online');screen('lobby','lobby');}
    if(data.meta.estado!=='lobby')return;
    const connected=Object.entries(data.jugadores).filter(([,p])=>!p.ausente).map(([uid])=>uid).sort();
    if(!this.migrating&&data.jugadores[data.uid]&&(!data.jugadores[data.meta.host]||data.jugadores[data.meta.host].ausente)&&connected[0]===data.uid){
      this.migrating=true;this.net.transaction('meta/host',uid=>uid===data.meta.host?data.uid:undefined).catch(()=>{}).finally(()=>{this.migrating=false;});
    }
    $('room-entry').hidden=true;$('room-content').hidden=false;$('room-code').textContent=data.code;
    const host=data.meta.host===data.uid;$('room-mode').value=data.meta.modo;$('room-mode').disabled=!host;
    $('role-selector').hidden=data.meta.modo!=='coop';$('start-room').hidden=!host;$('start-room').disabled=!this.canStart(data);
    const own=data.jugadores[data.uid];$('ready-room').disabled=!own?.iaLista||!data.connected;$('ready-room').textContent=own?.listo&&(own.readyRevision||0)===(data.meta.revision||0)?'CANCELAR LISTO':'LISTO';
    $('role-choice').value=own?.rol||'';
    for(const option of $('role-choice').options)option.disabled=!!option.value&&Object.entries(data.jugadores).some(([uid,p])=>uid!==data.uid&&p.rol===option.value);
    $('players').replaceChildren();
    for(const[uid,player]of Object.entries(data.jugadores)){
      const row=document.createElement('li');row.append(playerNode(player,false,player.rol));
      if(uid===data.meta.host){const crown=document.createElement('span');crown.textContent='♛';crown.title='Anfitrión';row.append(crown);}
      if(player.rol){const role=document.createElement('span');role.textContent=ROLES[player.rol];row.append(role);}
      const status=document.createElement('span');status.className='player-status';status.textContent=player.ausente?'Ausente':player.listo&&(player.readyRevision||0)===(data.meta.revision||0)?'Listo':player.iaLista?'Conectado':`IA: ${player.progreso||0} %`;
      const progress=document.createElement('progress');progress.max=100;progress.value=player.progreso||0;progress.setAttribute('aria-label','Descarga de IA');row.append(status,progress);$('players').append(row);
    }
    if(own&&own.iaLista!==this.recognizer.ready)this.aiStatus(this.status||{state:this.recognizer.ready?'ready':'loading',percent:0});
    this.chat(data);
    if(this.net.error)$('lobby-error').textContent=this.net.error;
  }
}
