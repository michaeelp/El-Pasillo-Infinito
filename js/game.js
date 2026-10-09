import { GAME, VERSION } from './config.js?v=1.0.0';
import { loadMonsters,chooseMonster,labelsFrom,setPortrait,preload } from './monsters.js?v=1.0.0';
import { Drawing,COLORS } from './draw.js?v=1.0.0';
import { Book } from './book.js?v=1.0.0';
import { Atmosphere } from './audio.js?v=1.0.0';
import { Recognizer,judge } from './ai.js?v=1.0.0';
import { getOptions,saveOptions,addResult,nameResult,sanitizeName,canPersist } from './storage.js?v=1.0.0';
import { publishScore } from './firebase.js?v=1.0.0';
import { $,screen,setupUI,applyOptions,refreshBest,refreshWorld,toast } from './ui.js?v=1.0.0';
const audio=new Atmosphere(getOptions());
let state='warning',monsters=[],labels=[],book=null,current=null,score=0,startedAt=0,deadline=0,paused=false,pausedAt=0,lastCount=0,tab='book',resultId=null,saved=false,runToken=0,analysis=null,analysisError='',submittedBlob=null,lastReason='',assetsReady=false;
const debug=new URLSearchParams(location.search).get('debug')==='1';
const drawing=new Drawing($('drawing'),type=>audio.effect(type));
const recognizer=new Recognizer(status=>{
  if(status.state==='ready'){$('ai-status').textContent='La IA está despierta. Puedes entrar.';$('ai-progress').value=100;$('retry-ai').hidden=true;}
  else if(status.state==='error'){$('ai-status').textContent='La IA no pudo despertar. Comprueba tu conexión.';$('retry-ai').hidden=false;}
  else{$('ai-status').textContent=`La IA está despertando… ${status.percent||0} %`;$('ai-progress').value=status.percent||0;$('retry-ai').hidden=true;}
  $('play').disabled=!(recognizer.ready&&assetsReady);
});
setupUI(audio);
function enter(next,view){state=next;startedAt=performance.now();screen(view,next);drawing.enabled=next==='book'&&!paused&&tab==='draw';$('debug').hidden=!debug;}
function hideAnalysisActions(){$('inference-retry').hidden=true;$('inference-menu').hidden=true;}
function menu(){runToken++;paused=false;document.body.classList.remove('paused');if($('pause-modal').open)$('pause-modal').close();audio.resume();hideAnalysisActions();enter('menu','menu');refreshBest();refreshWorld();if(!recognizer.ready)recognizer.load().catch(()=>{});}
function selectTab(next){tab=next;$('book-view').hidden=next!=='book';$('draw-view').hidden=next!=='draw';for(const key of ['book','draw']){$(`tab-${key}`).classList.toggle('active',key===next);$(`tab-${key}`).setAttribute('aria-pressed',String(key===next));}drawing.active=null;drawing.enabled=state==='book'&&!paused&&next==='draw';}
async function boot(){
  try{monsters=await loadMonsters();labels=labelsFrom(monsters);book=new Book(monsters,audio);await preload(monsters);assetsReady=true;$('play').disabled=!recognizer.ready;}
  catch(error){$('ai-status').textContent=error.message;$('retry-ai').hidden=false;$('retry-ai').onclick=()=>location.reload();}
}
$('accept').onclick=async()=>{
  if($('gentle-start').checked)saveOptions({flash:'reduced',screamer:'attenuated'});
  applyOptions(audio);await audio.start();menu();
};
$('retry-ai').onclick=()=>recognizer.load().catch(()=>{});
$('play').onclick=()=>{if(!recognizer.ready||!assetsReady)return;score=0;current=null;runToken++;nextRound();};
function nextRound(){
  current=chooseMonster(monsters,current);drawing.clear(false);lastCount=3;analysis=null;analysisError='';submittedBlob=null;
  const variants=['hospital','mansion','sotano'],variant=variants[Math.floor(score/4)%3];
  document.documentElement.style.setProperty('--hall',`url('assets/ui/pasillo-${variant}.webp?v=${VERSION}')`);
  $('encounter-caption').textContent=`PASILLO ${String(score+1).padStart(2,'0')} · ESCUCHA LOS PASOS`;$('encounter-caption').hidden=false;
  $('count-number').textContent='3';$('count-number').hidden=false;$('monster-face').hidden=true;$('encounter-message').textContent='';hideAnalysisActions();
  setPortrait($('monster-face'),current);enter('count','encounter');audio.effect('count');
}
function flash(){enter('flash','encounter');$('count-number').hidden=true;$('encounter-caption').hidden=true;$('monster-face').hidden=false;audio.effect('flash');}
function beginSearch(){enter('book','workbench');deadline=performance.now()+GAME.roundMs;$('level').textContent=String(score+1).padStart(2,'0');book.go(Math.floor(Math.random()*monsters.length),false);selectTab('book');updateClock(GAME.roundMs);}
function updateClock(ms){$('timer').textContent=String(Math.max(0,Math.ceil(ms/1000))).padStart(2,'0');$('timer').parentElement.classList.toggle('urgent',ms<=20000);}
async function submit(){
  if(state!=='book'||paused)return;
  if(performance.now()>=deadline){lose('Se acabó el tiempo. El pasillo no espera.');return;}
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
  if(!analysis){$('encounter-message').textContent='Algo está mirando tu dibujo…';return;}
  if(analysis.empty){lose('No dibujaste nada.');return;}
  const results=analysis.results,top=results[0];
  if(!top){analysisError='La IA no devolvió un resultado. Puedes reintentar.';return;}
  const word=labels.find(w=>w.en===top.label)?.es||top.label,recognized=`La IA reconoció: ${word} (${Math.round(top.score*100)} %).`;
  if(judge(results,current)){score++;enter('win','encounter');audio.effect('flee');$('encounter-message').textContent=recognized+' '+['Por ahora, sigues aquí.','Hay otra puerta al fondo.','Los pasos vuelven a alejarse.','Algo ha aprendido tu nombre.'][score%4];}
  else lose(`${recognized} ${current.nombre} no le temía a eso.`);
}
function lose(reason){lastReason=reason;hideAnalysisActions();setPortrait($('monster-face'),current);$('monster-face').hidden=false;$('count-number').hidden=true;$('encounter-caption').hidden=true;$('encounter-message').textContent='';enter('lose','encounter');audio.effect('scream');}
function gameOver(){
  enter('over','over');$('death-reason').textContent=lastReason;$('final-score').textContent=score;$('save-status').textContent='';$('save-score').disabled=false;$('player-name').value='';saved=false;resultId=addResult(score);refreshBest();
  if(!canPersist())$('save-status').textContent='El navegador no permite guardar de forma permanente.';
  $('restart').focus({preventScroll:true});
}
function togglePause(){
  if(!['book','count','flash','suspense','win'].includes(state))return;
  if(!paused){paused=true;pausedAt=performance.now();drawing.enabled=false;drawing.active=null;document.body.classList.add('paused');$('pause-modal').showModal();audio.suspend();}
  else{const dt=performance.now()-pausedAt;startedAt+=dt;if(state==='book')deadline+=dt;paused=false;document.body.classList.remove('paused');$('pause-modal').close();drawing.enabled=state==='book'&&tab==='draw';audio.resume();}
}
$('pause').onclick=togglePause;$('resume').onclick=togglePause;$('quit').onclick=menu;$('pause-modal').addEventListener('cancel',e=>{e.preventDefault();togglePause();});
$('tab-book').onclick=()=>selectTab('book');$('tab-draw').onclick=()=>selectTab('draw');$('show').onclick=submit;$('restart').onclick=()=>{score=0;current=null;runToken++;nextRound();};$('back-menu').onclick=menu;
$('inference-retry').onclick=()=>{if(submittedBlob)analyze(runToken);};$('inference-menu').onclick=menu;
$('save-form').onsubmit=async e=>{e.preventDefault();if(saved)return;saved=true;const name=sanitizeName($('player-name').value),local=nameResult(resultId,name);$('player-name').value=name;$('save-score').disabled=true;$('save-status').textContent=local?'Nombre guardado. Consultando el archivo mundial…':'El nombre solo durará durante esta sesión.';const token=runToken,result=await publishScore(name,score);if(token!==runToken||state!=='over')return;$('save-status').textContent=result==='global'?'Tu nombre quedó en el archivo local y mundial.':result==='pending'?'Guardado localmente. El envío mundial no pudo confirmarse.':local?'Tu nombre quedó guardado en este dispositivo.':'El navegador no permite guardar de forma permanente.';};
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(!paused&&['count','flash','book','suspense','win'].includes(state))togglePause();else audio.suspend();}else if(!paused)audio.resume();});
function tick(now){
  if(!paused){const elapsed=now-startedAt,remaining=state==='book'?Math.max(0,deadline-now):60000;audio.tick(now,state,remaining,score);
    if(state==='count'){const n=Math.max(1,3-Math.floor(elapsed/1000));if(n!==lastCount){lastCount=n;$('count-number').textContent=n;audio.effect('count');}if(elapsed>=GAME.countMs)flash();}
    else if(state==='flash'&&elapsed>=GAME.flashMs)beginSearch();
    else if(state==='book'){updateClock(remaining);if(remaining<=0)lose('Se acabó el tiempo. El pasillo no espera.');}
    else if(state==='suspense'&&elapsed>=GAME.suspenseMs)resolveAnalysis();
    else if(state==='win'&&elapsed>=GAME.winMs)nextRound();
    else if(state==='lose'&&elapsed>=GAME.loseMs)gameOver();
  }requestAnimationFrame(tick);
}
boot();requestAnimationFrame(tick);
