import { GAME, ONLINE, roundDurations } from './config.js?v=1.4.0';
import { roundPhase, monsterSequence } from './race.js?v=1.4.0';
import { rotateRoles, roleUid } from './coop.js?v=1.4.0';
import { roleView } from './roles.js?v=1.4.0';
import { precisionFor, raceBoard, standings } from './scoring.js?v=1.4.0';
import { playerNode } from './profile.js?v=1.4.0';
import { createChat, messages } from './lobby.js?v=1.4.0';
import { setPortrait } from './monsters.js?v=1.4.0';
import { publishRecord } from './records.js?v=1.4.0';
import { awardMatch } from './xp.js?v=1.4.0';
import {showReward} from './economy.js?v=1.4.0';
import { difficulty,winningResult } from './difficulty.js?v=1.4.0';
import { background } from './background.js?v=1.4.0';
import { shortError } from './net.js?v=1.4.0';
import { $, toast } from './ui.js?v=1.4.0';
import { judge, topResult } from './ai.js?v=1.4.0';
import { showDebug } from './debug.js?v=1.4.0';
const validImage = value => typeof value==='string' && value.length<=ONLINE.maxThumbnail && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value);
export class OnlineSession {
  constructor(deps) {
    Object.assign(this,deps);this.active=false;this.key='';this.viewKey='';this.hostBusy=false;this.seenWhispers=new Set();
    this.chat=createChat($('game-chat'),this.net,true);
    this.drawing.onChange=()=>this.scheduleLive();
    for(const id of ['online-leave','podium-leave','reconnect-leave'])$(id).onclick=()=>this.leave();
    $('rematch').onclick=()=>this.rematch();
    $('online-save-retry').onclick=()=>this.saveScores(this.ranking);
    for(const button of document.querySelectorAll('[data-whisper]'))button.onclick=async()=>{
      try{await this.net.message('Aquí',button.dataset.whisper);$('whisper-status').textContent='Enviado.';}catch(error){toast(shortError(error));}
    };
  }
  stop() {
    this.active=false;clearInterval(this.interval);clearTimeout(this.liveTimer);this.secretStop?.();this.secretStop=null;
    this.key='';this.viewKey='';this.local=null;this.pendingRecord=null;this.drawing.enabled=false;this.monster=null;
  }
  async leave() {this.stop();await this.net.leave();this.onMenu();}
  sync(data) {
    this.data=data;
    if(!data.meta){if(this.active){this.leave();toast('La sala ya no existe.');}return;}
    if(!data.jugadores[data.uid])return;
    if(data.meta.estado==='lobby'){if(this.active)this.stop();return;}
    if(!this.active){this.active=true;document.body.classList.add('online');this.interval=setInterval(()=>this.tick(),ONLINE.pollMs);this.savedMatch=0;}
    if(data.meta.expiresAt<this.net.now()){this.leave();toast('La sala expiró.');return;}
    this.chat(data);$('game-chat').querySelector('.chat-quick').hidden=data.meta.modo!=='coop';this.consumeWhispers();this.tick();
  }
  view(state,screenId,extra='') {
    const key=`${this.key}:${state}:${screenId}:${extra}`;
    if(this.viewKey===key)return;this.viewKey=key;this.enter(state,screenId);
    background.show(state,this.data.meta.modo==='coop'?this.data.meta.pasillos+1:this.data.meta.ronda);
    $('inference-retry').hidden=true;$('inference-menu').hidden=true;$('encounter-message').textContent='';
    $('count-number').hidden=state!=='count';$('monster-face').hidden=!['flash','suspense','win','lose'].includes(state)||!this.monster;
    if(this.monster)setPortrait($('monster-face'),this.monster);
    $('encounter-caption').hidden=state!=='count';$('encounter-caption').textContent=`${this.data.meta.modo==='race'?'RONDA':'PASILLO'} ${this.data.meta.modo==='race'?this.data.meta.ronda:this.data.meta.pasillos+1}`;
    $('game-chat').hidden=screenId==='encounter'||screenId==='reconnecting'||screenId==='podium';
    if(state==='flash'&&this.monster)this.audio.monster('appear',this.monster);if(state==='suspense')this.audio.effect('breath');if(state==='lose')this.audio.monster('scream',this.monster);if(state==='win')this.audio.effect('flee');
  }
  prepareRound(key) {
    this.key=key;this.viewKey='';this.local=null;this.pendingRecord=null;this.verdictPending=false;this.verified=new Set();this.lastCount=0;this.monster=null;
    this.role=this.data.meta.modo==='coop'?this.data.meta.roles?.[this.net.uid]:'';
    this.secretStop?.();this.secretStop=null;this.drawing.enabled=false;this.drawing.clear(false);
    if(this.data.meta.modo==='race')this.monster=monsterSequence(this.data.meta.semilla,this.getMonsters(),this.data.meta.ronda).at(-1);
    else if(this.role==='vigia') {
      this.secretStop=this.net.watchSecret(key,secret=>{if(secret&&this.key===key){this.monster=this.getMonsters().find(m=>m.id===secret.monstruoId);this.tick();}});
      this.net.read(`secreto/${key}/${this.net.uid}`).then(secret=>{
        if(this.key!==key)return;if(secret){this.monster=this.getMonsters().find(m=>m.id===secret.monstruoId);return;}
        const monster=monsterSequence(this.data.meta.semilla,this.getMonsters(),this.data.meta.ronda).at(-1);return this.net.secret(key,monster.id);
      }).catch(()=>toast('No se pudo cargar el monstruo.'));
    }
    this.getBook()?.reset();this.drawing.applyDefaults?.();
    $('round-label').textContent=this.data.meta.modo==='race'?'RONDA':'PASILLO';
    $('level').textContent=String(this.data.meta.modo==='race'?this.data.meta.ronda:this.data.meta.pasillos+1).padStart(2,'0');
    $('pause').hidden=true;$('online-leave').hidden=false;$('online-board').hidden=this.data.meta.modo==='coop';
    if(this.data.resultados[key]?.[this.net.uid])this.local={state:'done'};
  }
  tick() {
    if(!this.active||!this.data?.meta)return;
    const meta=this.data.meta,now=this.net.now(),key=`${meta.match}_${meta.ronda}`;
    if(this.key!==key)this.prepareRound(key);
    if(!this.net.connected){this.view('reconnecting','reconnecting','offline');$('reconnect-timer').textContent='Sin conexión.';return;}
    if(meta.estado==='paused'){this.view('reconnecting','reconnecting');$('reconnect-timer').textContent=Math.max(0,Math.ceil((meta.pausedAt+ONLINE.reconnectMs-now)/1000));this.hostTick(now);return;}
    if(meta.estado==='podium'){this.podium();this.hostTick(now);return;}
    if(meta.estado==='reveal'){this.reveal(now);this.hostTick(now);return;}
    if(meta.estado!=='round')return;
    const phase=roundPhase(meta,now);this.phase=phase;
    this.audio.tick(performance.now(),this.local?.state||phase.state,phase.remaining,meta.ronda,phase.phaseMs);
    if(meta.modo==='coop')this.coopVerdict();
    if(this.pendingRecord&&!this.sending)this.sendResult();
    const ghost=(meta.board?.[this.net.uid]?.lives??difficulty(meta.dificultad).vidas)<=0;
    this.ghost=ghost;$('ghost-tools').hidden=!ghost;
    for(const button of document.querySelectorAll('[data-whisper]'))button.disabled=now-(this.net.lastWhisper||0)<ONLINE.whisperMs;
    const teamSubmit=meta.modo==='coop'&&this.data.entregas[this.key]?.[roleUid(meta,'dibujante')];
    if(this.local?.state==='suspense'||teamSubmit&&!this.data.veredictos[this.key]?.[roleUid(meta,'vigia')]) {
      this.view('suspense','encounter');$('encounter-message').textContent=this.local?.error||'Analizando…';
      this.drawing.enabled=false;
      if(this.local?.error){$('inference-retry').hidden=false;$('inference-retry').onclick=()=>this.analyze();}
    } else if(this.local?.state==='outcome'&&now-this.local.start<(this.local.ok?GAME.winMs:GAME.loseMs)) {
      this.view(this.local.ok?'win':'lose','encounter');$('encounter-message').textContent=this.recognized(this.local.record);
    } else if(phase.state==='count'||phase.state==='flash') {
      if(meta.modo==='race'||this.role==='vigia') {
        this.view(phase.state,'encounter',!!this.monster);const count=Math.max(1,Math.ceil((phase.countMs-Math.max(0,phase.elapsed))/1000));
        $('count-number').textContent=count;if(count!==this.lastCount){this.lastCount=count;this.audio.effect('count');}
      } else {this.view(phase.state,'workbench');roleView(this.role,this.selectTab,this.drawing,phase.state);}
    } else {
      this.view('book','workbench',this.local?'submitted':'playing');
      if(meta.modo==='coop')roleView(this.role,this.selectTab,this.drawing,'book');
      else {document.querySelector('.tabs').hidden=false;$('role-view').hidden=true;$('live-view').hidden=true;$('active-role').hidden=true;}
      this.updateClock(Math.min(phase.phaseMs,phase.remaining),phase.phaseMs);
      this.drawing.enabled=!ghost&&!this.local&&(meta.modo==='race'||this.role==='dibujante')&&!$('draw-view').hidden;
      $('show').disabled=!this.drawing.enabled||phase.remaining<=0;
      if(phase.remaining<=0&&!this.local&&!ghost&&(meta.modo==='race'||this.role==='dibujante'))this.timeout();
      this.renderBoard($('online-board'),meta.board||{});
      const live=this.data.live[this.key]?.[roleUid(meta,'dibujante')];if(live&&validImage(live.miniatura))$('live-drawing').src=live.miniatura;
    }
    this.verifyDrawings();this.hostTick(now);
  }
  recognized(record) {
    if(!record?.etiqueta)return record?.timeout?'Se acabó el tiempo.':'No dibujaste nada.';
    const word=this.getLabels().find(w=>w.id===record.etiqueta)?.nombre||record.etiqueta;
    return `La IA reconoció: ${word} (${Math.round((record.confianza||0)*100)} %)`;
  }
  async thumbnail(source,size=ONLINE.thumbnailSize) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,size,size);ctx.drawImage(source,0,0,size,size);return canvas.toDataURL('image/webp',.6);
  }
  async submit() {
    if(!this.active||this.data.meta.estado!=='round'||this.local||this.ghost)return;
    const phase=roundPhase(this.data.meta,this.net.now());if(phase.state!=='book'||phase.remaining<=0)return;
    if(this.data.meta.modo==='coop'&&this.role!=='dibujante')return;
    const key=this.key;this.local={state:'suspense',start:this.net.now(),ms:Math.min(phase.phaseMs,Math.max(0,this.net.now()-phase.searchStart))};this.drawing.enabled=false;this.viewKey='';this.tick();
    try{await this.net.submit(key,this.local.ms);if(key!==this.key||!this.active)return;this.local.blob=await this.drawing.exportBlob();await this.analyze();}
    catch(error){if(this.active&&key===this.key){this.local.error='No se pudo enviar. Reintenta.';}}
  }
  async analyze() {
    if(!this.local||this.local.analyzing)return;
    const local=this.local,key=this.key;local.analyzing=true;local.error='';
    try {
      if(!this.data.entregas[key]?.[this.net.uid])await this.net.submit(key,local.ms);
      const results=local.blob?await this.recognizer.classify(local.blob,this.getLabels()):[];
      if(key!==this.key||!this.active)return;
      let miniatura='';if(local.blob){const image=await createImageBitmap(local.blob);miniatura=await this.thumbnail(image);image.close();}
      showDebug(results,this.getLabels());const top=topResult(results);this.pendingRecord={etiqueta:top?.label||'',confianza:top?.score||0,precision:this.monster?precisionFor(results,this.monster,this.data.meta.dificultad):0,ms:local.ms,miniatura,distribution:Object.fromEntries(results.map(r=>[r.label,r.score])),timeout:false};
    } catch(error) {if(key===this.key&&this.active)local.error='No se pudo analizar. Reintenta.';}
    finally {local.analyzing=false;}
  }
  async sendResult() {
    if(!this.local||this.net.now()-this.local.start<GAME.suspenseMs||!this.pendingRecord)return;
    this.sending=true;const key=this.key,record=this.pendingRecord;
    try {
      if(!this.data.resultados[key]?.[this.net.uid])await this.net.result(key,record);
      if(this.key!==key||!this.active)return;
      this.pendingRecord=null;
      if(this.data.meta.modo==='race'){const results=Object.entries(record.distribution||{}).map(([label,score])=>({label,score})),ok=!record.timeout&&!!winningResult(results,this.monster,this.data.meta.dificultad);this.local={state:'outcome',ok,start:this.net.now(),record};}
      else this.local.state='done';
      this.viewKey='';
    } catch {if(this.key===key)this.local.error='No se pudo enviar. Reintentando…';}
    finally {this.sending=false;}
  }
  timeout() {
    this.local={state:'suspense',start:this.net.now()-GAME.suspenseMs,ms:this.phase.phaseMs};
    this.pendingRecord={etiqueta:'',confianza:0,precision:0,ms:this.phase.phaseMs,miniatura:'',distribution:{},timeout:true};
  }
  scheduleLive() {
    if(!this.active||this.role!=='dibujante'||this.data.meta.estado!=='round'||this.local||this.liveTimer)return;
    const key=this.key;
    this.liveTimer=setTimeout(async()=>{this.liveTimer=null;if(key!==this.key||!this.active)return;
      try{await this.net.set(`live/${key}/${this.net.uid}`,{miniatura:await this.thumbnail(this.drawing.canvas,ONLINE.liveSize),t:this.net.now()});}catch{}
    },ONLINE.liveMs);
  }
  async coopVerdict() {
    if(this.role!=='vigia'||!this.monster||this.verdictPending)return;
    const drawer=roleUid(this.data.meta,'dibujante'),record=this.data.resultados[this.key]?.[drawer];
    if(!record||this.data.veredictos[this.key]?.[this.net.uid])return;
    this.verdictPending=true;const key=this.key;
    const results=Object.entries(record.distribution||{}).map(([label,score])=>({label,score}));
    try{await this.net.verdict(key,{monstruoId:this.monster.id,ok:!record.timeout&&record.etiqueta===topResult(results)?.label&&!!winningResult(results,this.monster,this.data.meta.dificultad),precision:precisionFor(results,this.monster,this.data.meta.dificultad)});}catch{this.verdictPending=false;}
  }
  resolvedResults() {
    const results={};
    for(const[uid,record]of Object.entries(this.data.resultados[this.key]||{})){
      const distribution=Object.entries(record.distribution||{}).map(([label,score])=>({label,score})),monster=this.monster,precision=precisionFor(distribution,monster,this.data.meta.dificultad);let ok=!record.timeout&&record.etiqueta===topResult(distribution)?.label&&!!winningResult(distribution,monster,this.data.meta.dificultad);
      if(ONLINE.verifyDrawings){const audits=Object.values(this.data.audits[this.key]||{}).map(v=>v[uid]).filter(Boolean);const disputes=audits.filter(a=>Math.abs(a.precision-record.precision)>ONLINE.discrepancyMargin||a.ok!==ok).length;if(disputes>=(Object.keys(this.data.jugadores).length/2))ok=false;}
      const ms=this.data.entregas[this.key]?.[uid]?.ms??this.phase.phaseMs;
      results[uid]={...record,ok,ms,precision};
    }return results;
  }
  async hostTick(now) {
    if(this.hostBusy||!this.active)return;
    const meta=this.data.meta,host=this.net.uid===meta.host,players=this.data.jugadores;
    const connected=Object.entries(players).filter(([,p])=>!p.ausente).map(([uid])=>uid).sort();
    if(players[meta.host]?.ausente||!players[meta.host]){
      if(connected[0]===this.net.uid){this.hostBusy=true;try{await this.net.transaction('meta/host',uid=>uid===meta.host?this.net.uid:undefined);}catch{}finally{this.hostBusy=false;}}return;
    }
    if(!host)return;
    this.hostBusy=true;
    try {
      const absent=Object.values(players).some(p=>p.ausente);
      if(meta.modo==='coop'&&absent&&!['paused','podium'].includes(meta.estado)) {await this.net.meta({estado:'paused',previousState:meta.estado,pausedAt:now});return;}
      if(meta.estado==='paused') {
        if(!absent)await this.net.meta({estado:meta.previousState,inicioFase:meta.inicioFase+now-meta.pausedAt});
        else if(now-meta.pausedAt>=ONLINE.reconnectMs)await this.net.meta({estado:'podium',endedByDisconnect:true});return;
      }
      if(meta.estado==='round') {
        const phase=roundPhase(meta,now);const results=this.data.resultados[this.key]||{};
        if(meta.modo==='race') {
          const alive=Object.keys(players).filter(uid=>!players[uid].ausente&&(meta.board?.[uid]?.lives??difficulty(meta.dificultad).vidas)>0);
          const all=alive.every(uid=>results[uid]);
          if(!all&&now<phase.end+ONLINE.verificationMs)return;
          if(all&&now<Math.max(...Object.values(results).map(result=>result.t),phase.searchStart)+GAME.winMs)return;
          if(ONLINE.verifyDrawings&&all&&now<Math.max(...Object.values(results).map(r=>r.t),phase.searchStart)+ONLINE.verificationMs)return;
          const board=raceBoard(players,meta.board||{},this.resolvedResults(),meta.ronda,meta.dificultad);
          await this.net.meta({estado:'reveal',board,inicioFase:now+ONLINE.leadMs});
        } else {
          const verdict=this.data.veredictos[this.key]?.[roleUid(meta,'vigia')];
          if(!verdict&&now<phase.end+ONLINE.verificationMs)return;
          await this.net.meta({estado:'reveal',ok:!!verdict?.ok,lastMonster:verdict?.monstruoId||meta.lastMonster,pasillos:meta.pasillos+(verdict?.ok?1:0),vidas:meta.vidas-(verdict?.ok?0:1),inicioFase:now+ONLINE.leadMs});
        }
      } else if(meta.estado==='reveal'&&now>=meta.inicioFase+ONLINE.revealMs+(meta.modo==='coop'?(meta.ok?GAME.winMs:GAME.loseMs):0)) {
        if(meta.modo==='race'&&(meta.ronda>=ONLINE.rounds||Object.values(meta.board||{}).every(p=>p.lives<=0))||meta.modo==='coop'&&meta.vidas<=0)await this.net.meta({estado:'podium'});
        else await this.net.meta({estado:'round',ronda:meta.ronda+1,inicioFase:now+ONLINE.leadMs,roles:meta.modo==='coop'&&meta.ok&&ONLINE.rotateRoles?rotateRoles(meta.roles):meta.roles||{}});
      }
    } catch(error) {if(this.active)toast('No se pudo actualizar la sala.');}
    finally {this.hostBusy=false;}
  }
  renderBoard(root,board) {
    const key=JSON.stringify([board,this.data.jugadores]);if(root.dataset.boardKey===key)return;root.dataset.boardKey=key;
    const list=document.createElement('ul');list.className='scoreboard';
    for(const[uid,player]of Object.entries(this.data.jugadores)){
      const score=board[uid]||{points:0,lives:difficulty(this.data.meta.dificultad).vidas};const row=document.createElement('li');row.className=score.lives<=0?'ghost':score.gained===0?'failed':'';
      const text=document.createElement('span');text.textContent=`${score.points} · ${score.lives} vidas`;row.append(playerNode({...player,uid}),text);list.append(row);
    }root.replaceChildren(list);
  }
  resultCard(uid,record,points=0,ok=false) {
    const card=document.createElement('article');card.className=`drawing-result ${ok?'ok':'failed'}`;
    if(validImage(record?.miniatura)){const image=document.createElement('img');image.alt='Dibujo';image.src=record.miniatura;card.append(image);}
    card.append(playerNode({...this.data.jugadores[uid],uid}));
    const label=document.createElement('p');label.textContent=this.recognized(record);card.append(label);
    const total=document.createElement('p');total.textContent=`${points} puntos`;card.append(total);return card;
  }
  reveal(now) {
    const meta=this.data.meta;
    if(meta.modo==='coop') {
      this.monster=this.getMonsters().find(m=>m.id===meta.lastMonster);
      if(now<meta.inicioFase+(meta.ok?GAME.winMs:GAME.loseMs)) {
        this.view(now<meta.inicioFase?'suspense':meta.ok?'win':'lose','encounter');$('encounter-message').textContent=this.recognized(this.data.resultados[this.key]?.[roleUid(meta,'dibujante')]);return;
      }
    }
    this.view('reveal','reveal');$('game-chat').hidden=false;$('ghost-tools').hidden=true;
    $('reveal-timer').textContent=Math.max(0,Math.ceil((meta.inicioFase+ONLINE.revealMs+(meta.modo==='coop'?(meta.ok?GAME.winMs:GAME.loseMs):0)-now)/1000));
    $('reveal-results').replaceChildren();$('reveal-monster').replaceChildren();
    if(this.monster){const image=document.createElement('img'),name=document.createElement('span');setPortrait(image,this.monster);name.textContent=this.monster.nombre;$('reveal-monster').append(image,name);}
    if(meta.modo==='race') {
      for(const[uid,player]of Object.entries(this.data.jugadores))$('reveal-results').append(this.resultCard(uid,this.data.resultados[this.key]?.[uid],meta.board?.[uid]?.gained||0,(meta.board?.[uid]?.gained||0)>0));
      this.renderBoard($('reveal-board'),meta.board||{});
    } else {
      const drawer=roleUid(meta,'dibujante');$('reveal-results').append(this.resultCard(drawer,this.data.resultados[this.key]?.[drawer],0,meta.ok));
      const team=document.createElement('div');team.className='coop-result';for(const[uid,player]of Object.entries(this.data.jugadores))team.append(playerNode({...player,uid},false,meta.roles[uid]));
      const score=document.createElement('p');score.textContent=`${meta.pasillos} pasillos · ${meta.vidas} vidas`;$('reveal-board').replaceChildren(team,score);
    }
  }
  podium() {
    const meta=this.data.meta;this.view('podium','podium');$('ghost-tools').hidden=true;$('podium-list').replaceChildren();$('gallery').replaceChildren();
    $('rematch').disabled=meta.host!==this.net.uid;
    const ranking=meta.modo==='race'?standings(meta.board||{}):Object.keys(this.data.jugadores).map(uid=>[uid,{points:meta.pasillos}]);
    this.ranking=ranking;
    for(const[uid,score]of ranking){const row=document.createElement('div'),total=document.createElement('strong');row.append(playerNode({...this.data.jugadores[uid],uid},false));total.textContent=score.points+(meta.modo==='coop'?' pasillos':' puntos');row.append(total);$('podium-list').append(row);}
    const drawings=Object.entries(this.data.resultados).filter(([key])=>key.startsWith(`${meta.match}_`)).flatMap(([key,results])=>Object.entries(results).map(([uid,record])=>({uid,record,key}))).filter(item=>validImage(item.record.miniatura)).sort((a,b)=>b.record.precision-a.record.precision);
    const chosen=drawings.length>6?[...drawings.slice(0,3),...drawings.slice(-3)]:drawings;for(const item of chosen)$('gallery').append(this.resultCard(item.uid,item.record));
    if(this.savedMatch!==meta.match){this.savedMatch=meta.match;$('online-save-retry').hidden=true;this.saveScores(ranking);}
  }
  async saveScores(ranking) {
    if(this.savingScore||!this.active)return;
    this.savingScore=true;const meta=this.data.meta,match=meta.match,id=`${this.net.code}-${meta.createdAt}-${match}`;
    $('online-save-retry').hidden=true;$('online-save-status').textContent='Guardando…';
    const uid=this.net.uid,entries=Object.entries(this.data.resultados).filter(([key])=>key.startsWith(`${match}_`)),encuentros=[],precisiones=[];
    let pasillos=meta.modo==='coop'?meta.pasillos:0,racha=0,maxRacha=0,margen3=false;
    for(const [key,records]of entries.sort(([a],[b])=>Number(a.split('_').at(-1))-Number(b.split('_').at(-1)))) {
      const n=Number(key.split('_').at(-1)),monster=monsterSequence(meta.semilla,this.getMonsters(),n).at(-1);
      if(meta.modo==='race') {
        const record=records[uid];if(!record)continue;const result=Object.entries(record.distribution||{}).map(([label,score])=>({label,score}));
        const win=!record.timeout&&winningResult(result,monster,meta.dificultad);encuentros.push({id:monster.id,ok:!!win});precisiones.push(win?win.score:0);
        if(win){pasillos++;racha++;if(roundDurations(n,meta.dificultad).phaseMs-record.ms<=3000)margen3=true;}else racha=0;maxRacha=Math.max(maxRacha,racha);
      }else {const verdict=Object.values(this.data.veredictos[key]||{})[0];if(verdict){encuentros.push({id:verdict.monstruoId,ok:verdict.ok});precisiones.push(verdict.ok?verdict.precision:0);}}
    }
    const position=ranking.findIndex(([id])=>id===uid)+1,points=meta.board?.[uid]?.points||0;
    let result;
    try {
      const awarded=await awardMatch({id,modo:meta.modo,dificultad:meta.dificultad,personalizada:meta.personalizada,pasillos,puntos:points,puesto:position,precisiones,encuentros,racha:meta.modo==='coop'?pasillos:maxRacha,margen3,tiempoMs:Math.max(0,Date.now()-match)});
      showReward('online-reward',awarded);if(awarded.nivel>awarded.nivelAnterior)this.onLevelUp?.(awarded.nivel);
      result=await publishRecord({modo:meta.modo,dificultad:meta.dificultad,puntuacion:meta.modo==='race'?points:pasillos,personalizada:meta.personalizada,sala:this.net.code,partida:match});
    }catch{result={status:'pending',message:'No se pudo guardar. Reintenta.'};}
    this.savingScore=false;if(!this.active||this.data.meta.match!==match||this.data.meta.estado!=='podium')return;
    $('online-save-status').textContent=result.message;$('online-save-retry').hidden=result.status!=='pending';
  }
  async rematch() {
    if(this.data.meta.host!==this.net.uid)return;
    try{await this.net.meta({estado:'lobby',revision:(this.data.meta.revision||0)+1});}catch{toast('No se pudo reiniciar la sala.');}
  }
  consumeWhispers() {
    for(const whisper of messages(this.data.whispers)) {
      const key=`${whisper.uid}:${whisper.t}`;if(this.seenWhispers.has(key))continue;this.seenWhispers.add(key);
      if(this.net.now()-whisper.t<3000&&whisper.uid!==this.net.uid){if(whisper.tipo==='message')toast('Aquí');else this.audio.effect(whisper.tipo);}
    }
  }
  async verifyDrawings() {
    if(!ONLINE.verifyDrawings||this.data.meta.modo!=='race'||this.verifying||this.recognizer.pending||this.local?.state==='suspense')return;
    const pending=Object.entries(this.data.resultados[this.key]||{}).find(([uid,record])=>uid!==this.net.uid&&!this.verified.has(uid)&&validImage(record.miniatura));if(!pending)return;
    const [uid,record]=pending,key=this.key;this.verified.add(uid);this.verifying=true;
    try {
      const blob=await(await fetch(record.miniatura)).blob(),results=await this.recognizer.classify(blob,this.getLabels());
      if(key!==this.key)return;showDebug(results,this.getLabels());const precision=precisionFor(results,this.monster,this.data.meta.dificultad),ok=!!winningResult(results,this.monster,this.data.meta.dificultad);
      await this.net.set(`audits/${key}/${this.net.uid}/${uid}`,{precision,ok,t:this.net.now()});
    }catch{}finally{this.verifying=false;}
  }
}
