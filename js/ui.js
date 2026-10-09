import { VERSION } from './config.js?v=1.0.0';
import { getOptions,saveOptions,bestScore,localScores,clearScores } from './storage.js?v=1.0.0';
import { globalScores } from './firebase.js?v=1.0.0';
export const $=id=>document.getElementById(id);
let toastTimer;
export function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
export function screen(id,state){for(const el of document.querySelectorAll('.screen'))el.hidden=el.id!==id;document.body.dataset.state=state;}
export function applyOptions(audio){const o=getOptions();document.body.classList.toggle('reduced',o.flash==='reduced');document.body.classList.toggle('attenuated',o.screamer==='attenuated');audio.setOptions(o);$('mute').textContent=o.muted?'ACTIVAR SONIDO':'SILENCIAR';}
export function refreshBest(){$('personal-best').textContent=String(bestScore()).padStart(2,'0');}
export async function refreshWorld(){const scores=await globalScores();$('world-best').textContent=scores===null?'LOCAL':String(scores[0]?.p||0).padStart(2,'0');}
export function setupUI(audio){
  $('version').textContent=VERSION;applyOptions(audio);refreshBest();
  $('mute').onclick=()=>{saveOptions({muted:!getOptions().muted});applyOptions(audio);};
  $('close-modal').onclick=()=>$('modal').close();
  for(const button of document.querySelectorAll('[data-dialog]'))button.onclick=()=>openDialog(button.dataset.dialog,audio);
}
function scoreList(scores){const ol=document.createElement('ol');ol.className='score-list';if(!scores.length){const p=document.createElement('p');p.textContent='Todavía no hay nombres en estas paredes.';ol.append(p);}
  scores.forEach((s,i)=>{const li=document.createElement('li');for(const[tag,cls,text]of [['span','rank',String(i+1).padStart(2,'0')],['span','',s.n],['strong','',`${s.p} pasillos`]]){const el=document.createElement(tag);el.className=cls;el.textContent=text;li.append(el);}ol.append(li);});return ol;
}
async function openDialog(type,audio){
  const content=$('modal-content');content.replaceChildren();$('modal').showModal();
  if(type==='records'){
    content.innerHTML='<h2>Lista de condenados</h2><p>No todos llegaron igual de lejos.</p><h3>Los diez del mundo</h3><div id="global-list"><p>Buscando nombres…</p></div><h3>En este dispositivo</h3><div id="local-list"></div><h3>Últimos pasos</h3><div id="recent-list"></div>';
    $('local-list').append(scoreList(localScores().sort((a,b)=>b.p-a.p).slice(0,10)));$('recent-list').append(scoreList(localScores().slice(0,5)));
    const list=$('global-list'),scores=await globalScores();if(!list.isConnected)return;list.replaceChildren();if(scores===null){const p=document.createElement('p');p.textContent='Por ahora, los nombres se conservan en este dispositivo.';list.append(p);}else list.append(scoreList(scores));
  }
  if(type==='help')content.innerHTML='<h2>Cómo sobrevivir</h2><ol><li><strong>Mira.</strong> Oirás tres pasos. Un rostro aparecerá durante un segundo. Recuérdalo.</li><li><strong>Busca.</strong> Encuentra ese rostro en el libro y lee sus tres debilidades.</li><li><strong>Dibuja.</strong> Elige una sola debilidad y dibújala. Tienes 60 segundos para buscar y dibujar, entre ambas tareas.</li><li><strong>Muestra.</strong> Pulsa ¡MOSTRAR! y espera. La IA decide qué objeto ve.</li></ol><p>Usa colores y formas grandes. No escribas el nombre: dibuja el objeto. Puedes consultar el libro todas las veces que quieras, pero el reloj sigue avanzando.</p><h3>Controles</h3><p>Flechas: pasar páginas. B: libro. L: lienzo. P o Escape: pausa. Ctrl / ⌘ + Z: deshacer. Ratón, lápiz o dedo: dibujar.</p><p>La pausa oculta el libro y el lienzo. La IA compara tu dibujo con los objetos del bestiario; puede equivocarse y sus porcentajes son puntuaciones relativas.</p>';
  if(type==='credits')content.innerHTML='<h2>Los que abrieron la puerta</h2><p>EL PASILLO INFINITO · versión '+VERSION+'</p><p>Diseño y desarrollo a partir del concepto proporcionado por el creador del proyecto. Código, retratos, escenarios y texturas preparados con ChatGPT.</p><p>Audio original sintetizado con Web Audio. No se utilizan grabaciones de terceros.</p><p>Reconocimiento local: CLIP de OpenAI, modelo ONNX de Xenova y Transformers.js de Hugging Face. Récords globales opcionales: Firebase.</p><p>Tu dibujo se procesa en este navegador. Al grabar un récord global se publican tu nombre elegido, tu puntuación y la fecha.</p>';
  if(type==='options'){
    content.innerHTML='<h2>Opciones</h2><div class="option-row"><label for="music-volume">Música ambiental</label><input id="music-volume" type="range" min="0" max="100"></div><div class="option-row"><label for="effects-volume">Efectos de sonido</label><input id="effects-volume" type="range" min="0" max="100"></div><div class="option-row"><label for="flash-option">Destellos</label><select id="flash-option"><option value="normal">Normales</option><option value="reduced">Reducidos</option></select></div><div class="option-row"><label for="scare-option">Susto final</label><select id="scare-option"><option value="normal">Normal</option><option value="attenuated">Atenuado</option></select></div><div class="option-actions"><button id="fullscreen">PANTALLA COMPLETA</button><button id="delete-records">BORRAR RÉCORDS LOCALES</button></div><p><small>Los cambios se guardan automáticamente en este dispositivo.</small></p>';
    const o=getOptions();$('music-volume').value=o.music*100;$('effects-volume').value=o.effects*100;$('flash-option').value=o.flash;$('scare-option').value=o.screamer;
    for(const[id,key,volume]of [['music-volume','music',true],['effects-volume','effects',true],['flash-option','flash',false],['scare-option','screamer',false]])$(id).oninput=()=>{saveOptions({[key]:volume?Number($(id).value)/100:$(id).value});applyOptions(audio);};
    $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Este navegador no permite activar pantalla completa.');}catch{toast('No se pudo activar pantalla completa.');}};
    let armed=false;$('delete-records').onclick=()=>{if(!armed){armed=true;$('delete-records').textContent='CONFIRMAR BORRADO';return;}clearScores();refreshBest();$('delete-records').textContent='RÉCORDS BORRADOS';$('delete-records').disabled=true;};
  }
}
