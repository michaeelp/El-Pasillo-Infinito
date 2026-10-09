import { VERSION } from './config.js?v=1.3.1';
import { getOptions,saveOptions,bestScore,localScores,clearScores } from './storage.js?v=1.3.1';
import {globalScores,leaderboardError} from './records.js?v=1.3.1';
import {currentUser} from './auth.js?v=1.3.1';
import {populateDifficulties} from './difficulty.js?v=1.3.1';
import {friendIds} from './friends.js?v=1.3.1';
import { background } from './background.js?v=1.3.1';
import { playerNode,getProfile } from './profile.js?v=1.3.1';
export const $=id=>document.getElementById(id);
let toastTimer,dialogToken=0;
export function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
export function screen(id,state,round=1){for(const el of document.querySelectorAll('.screen'))el.hidden=el.id!==id;document.body.dataset.state=state;document.body.dataset.screen=id;background.show(state,round);}
export function applyOptions(audio){const o=getOptions();document.body.classList.toggle('reduced',o.flash==='reduced');document.body.classList.toggle('attenuated',o.screamer==='attenuated');audio.setOptions(o);$('mute').textContent=o.muted?'ACTIVAR SONIDO':'SILENCIAR';}
export function refreshBest(){const bests=currentUser()?Object.entries(getProfile()?.estadisticas?.mejores||{}).filter(([k])=>k.startsWith('solo_')).map(([,v])=>v):[];$('personal-best').textContent=String(Math.max(bestScore(),0,...bests)).padStart(2,'0');}
export async function refreshWorld(){if(!currentUser()){$('world-best').textContent='—';return;}try{const scores=await globalScores();$('world-best').textContent=String(scores.entries[0]?.puntuacion||0).padStart(2,'0');$('world-best').title='';}catch(error){$('world-best').textContent='—';$('world-best').title=leaderboardError(error);}}
export function setupUI(audio){
  $('version').textContent=VERSION;applyOptions(audio);refreshBest();
  $('mute').onclick=()=>{saveOptions({muted:!getOptions().muted});applyOptions(audio);};
  $('close-modal').onclick=()=>$('modal').close();
  for(const button of document.querySelectorAll('[data-dialog]'))button.onclick=()=>openDialog(button.dataset.dialog,audio);
}
function scoreList(scores,mode='solo'){
  const ol=document.createElement('ol');ol.className='score-list';
  if(!scores.length){const p=document.createElement('p');p.textContent='Sin récords.';ol.append(p);}
  scores.forEach((s,i)=>{const li=document.createElement('li'),rank=document.createElement('span'),points=document.createElement('strong'),level=document.createElement('span');
    if(currentUser()&&(s.uid===currentUser().uid||s.miembros?.includes(currentUser().uid)))li.className='own';
    rank.className='rank';rank.textContent=s.puesto||i+1;points.textContent=(s.puntuacion??s.p)+(mode==='race'?' puntos':' pasillos');level.className='level-badge';level.textContent=s.nivel?`Niv. ${s.nivel}`:'';
    const identity=playerNode(s);if(s.uid){identity.tabIndex=0;identity.title='Ver perfil';const open=()=>document.dispatchEvent(new CustomEvent('pasillo-profile',{detail:s.uid}));identity.onclick=open;identity.onkeydown=e=>{if(e.key==='Enter')open();};}
    li.append(rank,identity,level,points);if(s.miembros){const team=document.createElement('div');team.className='score-team';team.textContent='Equipo';li.append(team);import('./profile.js?v=1.3.1').then(async p=>{const members=await Promise.all(s.miembros.map(p.readProfile));if(team.isConnected)team.replaceChildren(...members.filter(Boolean).map(m=>p.playerNode(m)));}).catch(()=>{});}ol.append(li);});return ol;
}
async function openDialog(type,audio){
  const content=$('modal-content');content.replaceChildren();$('modal').showModal();$('modal-title').textContent={records:'Lista de Condenados',options:'Opciones',help:'Cómo sobrevivir',credits:'Créditos'}[type];const token=++dialogToken;
  if(type==='records'){
    content.innerHTML='<nav class="records-tabs"><button data-scores-mode="solo" class="active">SOLO</button><button data-scores-mode="race">CARRERA</button><button data-scores-mode="coop">COOPERATIVO</button></nav><div class="record-filters"><label class="sr-only" for="scores-difficulty">Dificultad</label><select id="scores-difficulty"></select><label class="sr-only" for="scores-filter">Filtro</label><select id="scores-filter"><option value="global">Global</option><option value="friends">Amigos</option></select></div><div id="global-list" role="status"></div><button id="scores-retry" hidden>REINTENTAR</button><div id="local-section"><h3>Local</h3><div id="local-list"></div></div>';
    populateDifficulties($('scores-difficulty'));let request=0,mode='solo';
    const load=async()=>{const sequence=++request,list=$('global-list'),retry=$('scores-retry'),d=$('scores-difficulty').value;retry.hidden=true;
      $('local-section').hidden=mode!=='solo';$('local-list').replaceChildren(scoreList(localScores(d).sort((a,b)=>b.p-a.p).slice(0,50)));
      $('scores-filter').hidden=!currentUser();for(const button of content.querySelectorAll('[data-scores-mode]'))button.disabled=!currentUser()&&button.dataset.scoresMode!=='solo';
      if(!currentUser()){list.textContent='Inicia sesión para ver los récords globales.';return;}list.textContent='Cargando…';
      try{const result=await globalScores(mode,d,$('scores-filter').value==='friends'?friendIds():null);if(token!==dialogToken||sequence!==request||!list.isConnected)return;list.replaceChildren(scoreList(result.entries,mode));
        if(result.own&&!result.entries.some(s=>s.id===result.own.id)){const title=document.createElement('h3');title.textContent='Tu puesto';list.append(title,scoreList([result.own],mode));}
      }catch(error){if(token!==dialogToken||sequence!==request||!list.isConnected)return;list.textContent=leaderboardError(error);retry.hidden=false;}};
    for(const b of content.querySelectorAll('[data-scores-mode]'))b.onclick=()=>{mode=b.dataset.scoresMode;for(const other of content.querySelectorAll('[data-scores-mode]'))other.classList.toggle('active',other===b);load();};
    $('scores-retry').onclick=load;$('scores-difficulty').onchange=load;$('scores-filter').onchange=load;load();
  }
  if(type==='help')content.innerHTML='<ol><li>Recuerda el rostro.</li><li>Lee las pistas.</li><li>Dibuja sin texto.</li><li>Pulsa ¡MOSTRAR!.</li></ol>';
  if(type==='credits')content.innerHTML='<p>El Pasillo Infinito '+VERSION+'</p><p>Imágenes: ChatGPT. Audio: WAV y Web Audio.</p><p>IA: CLIP, Xenova y Transformers.js.</p><p>Fuentes: Pirata One, IM Fell English y Cutive Mono. Licencia OFL 1.1.</p>';
  if(type==='options'){
    content.innerHTML='<div class="option-row"><label for="music-volume">Música</label><input id="music-volume" type="range" min="0" max="100"></div><div class="option-row"><label for="effects-volume">Efectos</label><input id="effects-volume" type="range" min="0" max="100"></div><div class="option-row"><label for="flash-option">Destellos</label><select id="flash-option"><option value="normal">Normales</option><option value="reduced">Reducidos</option></select></div><div class="option-row"><label for="scare-option">Sustos</label><select id="scare-option"><option value="normal">Normales</option><option value="attenuated">Atenuados</option></select></div><div class="option-actions"><button id="fullscreen">PANTALLA COMPLETA</button><button id="delete-records">BORRAR RÉCORDS LOCALES</button></div>';
    const o=getOptions();$('music-volume').value=o.music*100;$('effects-volume').value=o.effects*100;$('flash-option').value=o.flash;$('scare-option').value=o.screamer;
    for(const[id,key,volume]of [['music-volume','music',true],['effects-volume','effects',true],['flash-option','flash',false],['scare-option','screamer',false]])$(id).oninput=()=>{saveOptions({[key]:volume?Number($(id).value)/100:$(id).value});applyOptions(audio);};
    $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Pantalla completa no disponible.');}};
    let armed=false;$('delete-records').onclick=()=>{if(!armed){armed=true;$('delete-records').textContent='CONFIRMAR BORRADO';return;}clearScores();refreshBest();$('delete-records').textContent='BORRADOS';$('delete-records').disabled=true;};
  }
}
