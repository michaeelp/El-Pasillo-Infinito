import { GAME, TIEMPO_ALERTA, roundDurations } from './config.js?v=1.1.0';
import { loadMonsters,chooseMonster,labelsFrom,setPortrait,preload } from './monsters.js?v=1.1.0';
import { Drawing,COLORS } from './draw.js?v=1.1.0';
import { Book } from './book.js?v=1.1.0';
import { Atmosphere } from './audio.js?v=1.1.0';
import { Recognizer,judge } from './ai.js?v=1.1.0';
import { getOptions,saveOptions,addResult,nameResult,sanitizeName,canPersist } from './storage.js?v=1.1.0';
import { publishScore } from './firebase.js?v=1.1.0';
import { $,screen,setupUI,applyOptions,refreshBest,refreshWorld,toast } from './ui.js?v=1.1.0';
import { background } from './background.js?v=1.1.0';
import { loadFonts } from './fonts.js?v=1.1.0';
import { loadProfile,getProfile,playerNode,setupProfile } from './profile.js?v=1.1.0';
import { Lobby } from './lobby.js?v=1.1.0';
import { OnlineSession } from './online-game.js?v=1.1.0';
import { onlineConfigured,networkError } from './net.js?v=1.1.0';
const audio=new Atmosphere(getOptions());
let lobby=null,online=null,roundTimes=roundDurations(1),roundNumber=1;
let state='warning',monsters=[],labels=[],book=null,current=null,score=0,startedAt=0,deadline=0,paused=false,pausedAt=0,lastCount=0,tab='book',resultId=null,saved=false,runToken=0,analysis=null,analysisError='',submittedBlob=null,lastReason='',assetsReady=false;
const debug=new URLSearchParams(location.search).get('debug')==='1';
const drawing=new Drawing($('drawing'),type=>audio.effect(type));
const recognizer=new Recognizer(status=>{
  if(status.state==='ready'){$('ai-status').textContent='IA lista.';$('ai-progress').value=100;$('retry-ai').hidden=true;}
  else if(status.state==='error'){$('ai-status').textContent='No se cargó la IA. Reintenta.';$('retry-ai').hidden=false;}
  else{$('ai-status').textContent=`Cargando IA: ${status.percent||0} %`;$('ai-progress').value=status.percent||0;$('retry-ai').hidden=true;}
  $('play').disabled=!(recognizer.ready&&assetsReady);
  lobby?.aiStatus(status);
});
setupUI(audio);
function enter(next,view){state=next;startedAt=performance.now();screen(view,next,roundNumber);drawing.enabled=next==='book'&&!paused&&tab==='draw';$('debug').hidden=!debug;}
function hideAnalysisActions(){$('inference-retry').hidden=true;$('inference-menu').hidden=true;}
function menu(){online?.stop();runToken++;paused=false;document.body.classList.remove('paused','online');if($('pause-modal').open)$('pause-modal').close();$('game-chat').hidden=true;$('ghost-tools').hidden=true;document.querySelector('.tabs').hidden=false;$('role-view').hidden=true;$('live-view').hidden=true;$('online-board').hidden=true;$('active-role').hidden=true;$('pause').hidden=false;$('online-leave').hidden=true;$('round-label').textContent='PASILLO';audio.resume();hideAnalysisActions();enter('menu','menu');$('menu-profile').replaceChildren(playerNode(getProfile()));refreshBest();refreshWorld();if(!recognizer.ready)recognizer.load().catch(()=>{});}
function selectTab(next){if(online?.active&&online.data?.meta?.modo==='coop'&&(online.role==='vigia'||online.role==='bibliotecario'&&next!=='book'||online.role==='dibujante'&&next!=='draw'))return;tab=next;$('book-view').hidden=next!=='book';$('draw-view').hidden=next!=='draw';for(const key of ['book','draw']){$(`tab-${key}`).classList.toggle('active',key===next);$(`tab-${key}`).setAttribute('aria-pressed',String(key===next));}drawing.active=null;drawing.enabled=state==='book'&&!paused&&next==='draw';}
async function boot(){
  try{monsters=await loadMonsters();labels=labelsFrom(monsters);book=new Book(monsters,audio);await loadProfile();$('menu-profile').replaceChildren(playerNode(getProfile()));setupProfile(menu,()=>{$('menu-profile').replaceChildren(playerNode(getProfile()));});await background.ready;await loadFonts();await preload(monsters);assetsReady=true;$('play').disabled=!recognizer.ready;}
  catch(error){$('ai-status').textContent=error.message;$('retry-ai').hidden=false;$('retry-ai').onclick=()=>location.reload();}
}
$('accept').onclick=async()=>{
  if($('gentle-start').checked)saveOptions({flash:'reduced',screamer:'attenuated'});
  applyOptions(audio);await audio.start();await bootReady;menu();
  let code=new URL(location.href).searchParams.get('sala');try{code ||= sessionStorage.getItem('pasillo-room');}catch{}
  if(code&&assetsReady){state='lobby';await lobby.open('race',code);}
};
$('retry-ai').onclick=()=>recognizer.load().catch(()=>{});
$('play').onclick=async()=>{if(!recognizer.ready||!assetsReady)return;enter('modes','modes');$('online-status').textContent='Conectando…';$('race-mode').disabled=true;$('coop-mode').disabled=true;try{if(!onlineConfigured())throw new Error('Firebase no configurado.');await lobby.net.connect();$('online-status').textContent='';$('race-mode').disabled=false;$('coop-mode').disabled=false;}catch(error){$('online-status').textContent=onlineConfigured()?networkError(error):'Online no configurado.';}};
$('solo-mode').onclick=()=>{score=0;current=null;runToken++;nextRound();};
$('modes-back').onclick=menu;
function openProfile(){
  const room=lobby.net.code&&lobby.net.data.meta?.estado==='lobby',net=lobby.net;
  const back=room?()=>{state='lobby';screen('lobby','lobby');}:menu;
  const blocked=room&&net.data.meta.uniqueAvatars?Object.entries(net.data.jugadores).filter(([uid])=>uid!==net.uid).map(([,p])=>p.avatar):[];
  setupProfile(back,()=>{$('menu-profile').replaceChildren(playerNode(getProfile()));},blocked,room?async(name,avatar)=>{
    const old=net.data.jugadores[net.uid];if(net.data.meta.uniqueAvatars&&avatar!==old.avatar)await net.claim('avatars',avatar);
    try{await net.player({nombre:name,avatar,listo:false});}catch(error){if(avatar!==old.avatar)await net.release('avatars',avatar);throw error;}
    if(avatar!==old.avatar)await net.release('avatars',old.avatar);
  }:null);enter('profile','profile');
}
for(const id of ['profile-open','menu-profile'])$(id).onclick=openProfile;
const lobbyProfile=document.createElement('button');lobbyProfile.textContent='PERFIL';lobbyProfile.onclick=openProfile;$('lobby-title').parentElement.append(lobbyProfile);
$('race-mode').onclick=()=>{state='lobby';lobby.open('race');};$('coop-mode').onclick=()=>{state='lobby';lobby.open('coop');};
function nextRound(){
  current=chooseMonster(monsters,current);drawing.clear(false);lastCount=3;analysis=null;analysisError='';submittedBlob=null;
  roundNumber=score+1;roundTimes=roundDurations(roundNumber);
  $('encounter-caption').textContent=`PASILLO ${String(score+1).padStart(2,'0')}`;$('encounter-caption').hidden=false;
  $('count-number').textContent='3';$('count-number').hidden=false;$('monster-face').hidden=true;$('encounter-message').textContent='';hideAnalysisActions();
  setPortrait($('monster-face'),current);enter('count','encounter');audio.effect('count');
}
function flash(){enter('flash','encounter');$('count-number').hidden=true;$('encounter-caption').hidden=true;$('monster-face').hidden=false;audio.effect('flash');}
function beginSearch(){enter('book','workbench');deadline=performance.now()+roundTimes.phaseMs;$('level').textContent=String(score+1).padStart(2,'0');book.go(Math.floor(Math.random()*monsters.length),false);selectTab('book');updateClock(roundTimes.phaseMs);}
function updateClock(ms,phaseMs=roundTimes.phaseMs){$('timer').textContent=String(Math.max(0,Math.ceil(ms/1000))).padStart(2,'0');$('timer').parentElement.classList.toggle('urgent',ms<=Math.min(TIEMPO_ALERTA*1000,phaseMs/3));}
async function submit(){
  if(online?.active){await online.submit();return;}
  if(state!=='book'||paused)return;
  if(performance.now()>=deadline){lose('Se acabó el tiempo.');return;}
  enter('suspense','encounter');$('monster-face').hidden=false;$('count-number').hidden=true;$('encounter-caption').hidden=true;$('encounter-message').textContent='';hideAnalysisActions();audio.effect('breath');
  const token=runToken;
  try{submittedBlob=await drawing.exportBlob();if(token!==runToken||state!=='suspense')return;if(!submittedBlob){analysis={empty:true};return;}await analyze(token);}catch(error){if(token===runToken&&state==='suspense')analysisError=error.message;}
}
async function analyze(token){
  analysis=null;analysisError='';hideAnalysisActions();$('encounter-message').textContent='';
  try{const results=await recognizer.classify(submittedBlob,labels.map(w=>w.en));if(token!==runToken||state!=='suspense')return;analysis={results};if(debug){console.table(results.slice(0,5));$('debug-results').textContent=results.slice(0,5).map(r=>`${labels.find(w=>w.en===r.label)?.es||r.label}: ${(r.score*100).toFixed(1)} %`).join('\n');}}
  catch(error){if(token===runToken&&state==='suspense')analysisError=error.message;}
}
function resolveAnalysis(){
  if(analysisError){$('encounter-message').textContent=analysisError;$('inference-retry').hidden=false;$('inference-menu').hidden=false;return;}
  if(!analysis){$('encounter-message').textContent='Analizando…';return;}
  if(analysis.empty){lose('No dibujaste nada.');return;}
  const results=analysis.results,top=results[0];
  if(!top){analysisError='La IA no devolvió un resultado. Puedes reintentar.';return;}
  const word=labels.find(w=>w.en===top.label)?.es||top.label,recognized=`La IA reconoció: ${word} (${Math.round(top.score*100)} %).`;
  if(judge(results,current)){score++;enter('win','encounter');audio.effect('flee');$('encounter-message').textContent=recognized;}
  else lose(`${recognized} Debilidad incorrecta.`);
}
function lose(reason){lastReason=reason;hideAnalysisActions();setPortrait($('monster-face'),current);$('monster-face').hidden=false;$('count-number').hidden=true;$('encounter-caption').hidden=true;$('encounter-message').textContent='';enter('lose','encounter');audio.effect('scream');}
function gameOver(){
  enter('over','over');$('death-reason').textContent=lastReason;$('final-score').textContent=score;$('save-status').textContent='';$('save-score').disabled=false;$('player-name').value=getProfile().nombre;$('death-player').replaceChildren(playerNode(getProfile(),false));saved=false;resultId=addResult(score,getProfile().avatar,getProfile().nombre);refreshBest();
  if(!canPersist())$('save-status').textContent='Guardado solo en esta sesión.';
  $('restart').focus({preventScroll:true});
}
function togglePause(){
  if(online?.active)return;
  if(!['book','count','flash','suspense','win'].includes(state))return;
  if(!paused){paused=true;pausedAt=performance.now();drawing.enabled=false;drawing.active=null;document.body.classList.add('paused');$('pause-modal').showModal();audio.suspend();}
  else{const dt=performance.now()-pausedAt;startedAt+=dt;if(state==='book')deadline+=dt;paused=false;document.body.classList.remove('paused');$('pause-modal').close();drawing.enabled=state==='book'&&tab==='draw';audio.resume();}
}
$('pause').onclick=togglePause;$('resume').onclick=togglePause;$('quit').onclick=menu;$('pause-modal').addEventListener('cancel',e=>{e.preventDefault();togglePause();});
$('tab-book').onclick=()=>selectTab('book');$('tab-draw').onclick=()=>selectTab('draw');$('show').onclick=submit;$('restart').onclick=()=>{score=0;current=null;runToken++;nextRound();};$('back-menu').onclick=menu;
$('inference-retry').onclick=()=>{if(submittedBlob)analyze(runToken);};$('inference-menu').onclick=menu;
$('save-form').onsubmit=async e=>{e.preventDefault();if(saved)return;saved=true;const name=sanitizeName($('player-name').value),local=nameResult(resultId,name);$('player-name').value=name;$('save-score').disabled=true;$('save-status').textContent='Enviando…';const token=runToken,result=await publishScore(name,score,getProfile().avatar);if(token!==runToken||state!=='over')return;$('save-status').textContent=result==='global'?'Récord guardado.':result==='pending'?'Guardado local. Envío no confirmado.':local?'Guardado local.':'Guardado en esta sesión.';};
for(const[colorName,hex]of COLORS){const b=document.createElement('button');b.style.setProperty('--swatch',hex);b.setAttribute('aria-label',colorName);b.title=colorName;b.classList.toggle('selected',hex===drawing.color);b.setAttribute('aria-pressed',String(hex===drawing.color));b.onclick=()=>{drawing.color=hex;for(const other of $('palette').children){other.classList.toggle('selected',other===b);other.setAttribute('aria-pressed',String(other===b));}};$('palette').append(b);}
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{drawing.tool=b.dataset.tool;for(const other of document.querySelectorAll('[data-tool]')){other.classList.toggle('selected',other===b);other.setAttribute('aria-pressed',String(other===b));}};
$('brush-size').oninput=()=>{drawing.size=Number($('brush-size').value);$('size-value').textContent=drawing.size;};$('undo').onclick=()=>drawing.undo();$('clear').onclick=()=>{if(drawing.enabled)drawing.clear();};
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('modal').open)return;
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();togglePause();return;}
  if(state!=='book'||paused)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();drawing.undo();}
  if(e.key.toLowerCase()==='b')selectTab('book');if(e.key.toLowerCase()==='l')selectTab('draw');
  if(tab==='book'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();book.go(book.index+(e.key==='ArrowLeft'?-1:1));}
});
document.addEventListener('visibilitychange',()=>{if(online?.active){if(document.hidden)audio.suspend();else{audio.resume();online.tick();}return;}if(document.hidden){if(!paused&&['count','flash','book','suspense','win'].includes(state))togglePause();else audio.suspend();}else if(!paused)audio.resume();});
function tick(now){
  if(!paused&&!online?.active&&!lobby?.net.code){const elapsed=now-startedAt,remaining=state==='book'?Math.max(0,deadline-now):roundTimes.phaseMs;audio.tick(now,state,remaining,score,roundTimes.phaseMs);
    if(state==='count'){const n=Math.max(1,3-Math.floor(elapsed/1000));if(n!==lastCount){lastCount=n;$('count-number').textContent=n;audio.effect('count');}if(elapsed>=GAME.countMs)flash();}
    else if(state==='flash'&&elapsed>=roundTimes.flashMs)beginSearch();
    else if(state==='book'){updateClock(remaining);if(remaining<=0)lose('Se acabó el tiempo.');}
    else if(state==='suspense'&&elapsed>=GAME.suspenseMs)resolveAnalysis();
    else if(state==='win'&&elapsed>=GAME.winMs)nextRound();
    else if(state==='lose'&&elapsed>=GAME.loseMs)gameOver();
  }requestAnimationFrame(tick);
}
lobby=new Lobby(recognizer,data=>online?.sync(data),menu);
online=new OnlineSession({net:lobby.net,recognizer,drawing,audio,getMonsters:()=>monsters,getLabels:()=>labels,getBook:()=>book,enter,selectTab,updateClock,onMenu:menu});
const bootReady=boot();requestAnimationFrame(tick);
