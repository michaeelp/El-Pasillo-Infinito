import { VERSION } from './config.js?v=1.2.0';
import { getOptions,saveOptions,bestScore,localScores,clearScores } from './storage.js?v=1.2.0';
import { globalScores,leaderboardError } from './firebase.js?v=1.2.0';
import { background } from './background.js?v=1.2.0';
import { playerNode } from './profile.js?v=1.2.0';
export const $=id=>document.getElementById(id);
let toastTimer,dialogToken=0;
export function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
export function screen(id,state,round=1){for(const el of document.querySelectorAll('.screen'))el.hidden=el.id!==id;document.body.dataset.state=state;document.body.dataset.screen=id;background.show(state,round);}
export function applyOptions(audio){const o=getOptions();document.body.classList.toggle('reduced',o.flash==='reduced');document.body.classList.toggle('attenuated',o.screamer==='attenuated');audio.setOptions(o);$('mute').textContent=o.muted?'ACTIVAR SONIDO':'SILENCIAR';}
export function refreshBest(){$('personal-best').textContent=String(bestScore()).padStart(2,'0');}
export async function refreshWorld(){try{const scores=await globalScores();$('world-best').textContent=String(scores[0]?.p||0).padStart(2,'0');$('world-best').title='';}catch(error){$('world-best').textContent='—';$('world-best').title=leaderboardError(error);}}
export function setupUI(audio){
  $('version').textContent=VERSION;applyOptions(audio);refreshBest();
  $('mute').onclick=()=>{saveOptions({muted:!getOptions().muted});applyOptions(audio);};
  $('close-modal').onclick=()=>$('modal').close();
  for(const button of document.querySelectorAll('[data-dialog]'))button.onclick=()=>openDialog(button.dataset.dialog,audio);
}
function scoreList(scores,mode='solo'){
  const ol=document.createElement('ol');ol.className='score-list';
  if(!scores.length){const p=document.createElement('p');p.textContent='Sin récords.';ol.append(p);}
  scores.forEach((s,i)=>{const li=document.createElement('li'),rank=document.createElement('span'),points=document.createElement('strong');rank.className='rank';rank.textContent=i+1;points.textContent=s.p+(mode==='race'?' puntos':' pasillos');li.append(rank,playerNode(s),points);
    if(s.equipo){const team=document.createElement('div');team.className='coop-result';for(const p of s.equipo)team.append(playerNode(p));li.append(team);}ol.append(li);});return ol;
}
async function openDialog(type,audio){
  const content=$('modal-content');content.replaceChildren();$('modal').showModal();$('modal-title').textContent={records:'Récords',options:'Opciones',help:'Cómo sobrevivir',credits:'Créditos'}[type];const token=++dialogToken;
  if(type==='records'){
    content.innerHTML='<label for="scores-mode">Modo</label><select id="scores-mode"><option value="solo">Solo</option><option value="race">Carrera</option><option value="coop">Cooperativo</option></select><h3>Global</h3><div id="global-list" role="status"></div><button id="scores-retry" hidden>REINTENTAR</button><div id="local-section"><h3>Local</h3><div id="local-list"></div></div>';
    let request=0;
    const load=async()=>{const sequence=++request,mode=$('scores-mode').value,list=$('global-list'),retry=$('scores-retry');list.textContent='Cargando…';retry.hidden=true;$('local-section').hidden=mode!=='solo';try{const scores=await globalScores(mode);if(token!==dialogToken||sequence!==request||!list.isConnected)return;list.replaceChildren(scoreList(scores,mode));}catch(error){if(token!==dialogToken||sequence!==request||!list.isConnected)return;list.textContent=leaderboardError(error);retry.hidden=false;}};
    $('scores-retry').onclick=load;
    $('local-list').append(scoreList(localScores().sort((a,b)=>b.p-a.p).slice(0,10)));$('scores-mode').onchange=load;load();
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
