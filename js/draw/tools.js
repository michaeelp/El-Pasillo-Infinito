import {COLORS} from '../draw.js?v=1.4.0';
import {ColorWheel} from './wheel.js?v=1.4.0';
import {BRUSHES} from './brushes.js?v=1.4.0';
import {getSettings} from '../settings.js?v=1.4.0';
const names={brush:'Pincel',eraser:'Goma',fill:'Cubo',eyedropper:'Cuentagotas',line:'Línea',rectangle:'Rectángulo',ellipse:'Elipse',triangle:'Triángulo',star:'Estrella',heart:'Corazón',arrow:'Flecha'};
export function setupTools(drawing) {
  const $=id=>document.getElementById(id),recent=[];
  const mobile=matchMedia('(max-width:600px)');
  const compact=()=>{if(mobile.matches)for(const details of document.querySelectorAll('.tools details'))details.open=false;};compact();mobile.addEventListener('change',compact);
  const wheel=new ColorWheel($('color-wheel'),hex=>setColor(hex,false));
  function setColor(hex,redraw=true){if(!/^#[a-f\d]{6}$/i.test(hex))return;drawing.color=hex.toLowerCase();drawing.outline=drawing.color;$('hex-color').value=drawing.color;$('outline-color').value=drawing.outline;if(redraw)wheel.set(drawing.color);for(const b of $('palette').children)b.setAttribute('aria-pressed',String(b.dataset.hex===drawing.color));}
  const swatch=(name,hex)=>{const b=document.createElement('button');b.type='button';b.dataset.hex=hex;b.style.setProperty('--swatch',hex);b.title=name;b.setAttribute('aria-label',name);b.onclick=()=>setColor(hex);return b;};
  $('palette').replaceChildren(...COLORS.map(([name,hex])=>swatch(name,hex)));drawing.setColor=setColor;
  drawing.onColorUsed=hex=>{const i=recent.indexOf(hex);if(i>=0)recent.splice(i,1);recent.unshift(hex);recent.length=Math.min(8,recent.length);$('recent-colors').replaceChildren(...recent.map(h=>swatch(h,h)));};
  $('hex-color').onchange=()=>{let hex=$('hex-color').value;if(!hex.startsWith('#'))hex='#'+hex;if(/^#[a-f\d]{6}$/i.test(hex))setColor(hex);else $('hex-color').value=drawing.color;};
  $('outline-color').oninput=()=>drawing.outline=$('outline-color').value;
  function selectTool(tool){drawing.cancel();drawing.tool=tool;for(const b of document.querySelectorAll('[data-tool]')){b.setAttribute('aria-pressed',String(b.dataset.tool===tool));b.classList.toggle('selected',b.dataset.tool===tool);}cursor();}
  for(const b of document.querySelectorAll('[data-tool]')){b.title=names[b.dataset.tool];b.setAttribute('aria-label',names[b.dataset.tool]);b.onclick=()=>selectTool(b.dataset.tool);}
  $('brush-kind').replaceChildren(...BRUSHES.map(([id,name],i)=>{const o=document.createElement('option');o.value=id;o.textContent=`${i+1} · ${name}`;return o;}));$('brush-kind').onchange=()=>{drawing.brush=$('brush-kind').value;selectTool('brush');};
  for(const [id,key,scale]of [['brush-size','size',1],['eraser-size','eraserSize',1],['opacity','opacity',100],['hardness','hardness',100],['spray-density','density',1],['fill-tolerance','tolerance',1]]){
    $(id).oninput=()=>{drawing[key]=Number($(id).value)/scale;const out=$(id+'-value');if(out)out.textContent=$(id).value;cursor();};
  }
  for(const [id,key]of [['shape-fill','filled'],['fixed-proportion','fixed'],['symmetry','symmetry']])$(id).onchange=()=>drawing[key]=$(id).checked;
  $('undo').onclick=()=>drawing.undo();$('redo').onclick=()=>drawing.redo();$('clear').onclick=()=>{if(drawing.enabled)drawing.clear();};
  let pointer={x:256,y:256};const circle=$('brush-cursor');function cursor(){const rect=drawing.canvas.getBoundingClientRect(),scale=rect.width/512,size=(drawing.tool==='eraser'?drawing.eraserSize:drawing.size)*scale;circle.style.width=circle.style.height=size+'px';circle.style.left=pointer.x*scale+'px';circle.style.top=pointer.y*scale+'px';}
  drawing.cursor=p=>{pointer=p;circle.hidden=!drawing.enabled;cursor();};drawing.canvas.onpointerleave=()=>circle.hidden=true;
  drawing.applyDefaults=()=>{const s=getSettings();drawing.brush=s.defaultBrush;$('brush-kind').value=drawing.brush;selectTool(s.defaultTool);};
  drawing.handleKey=e=>{if(!drawing.enabled)return false;const key=e.key.toLowerCase(),s=getSettings(),keys={[s.keyBrush]:'brush',[s.keyEraser]:'eraser',[s.keyFill]:'fill',[s.keyPicker]:'eyedropper'};if((e.ctrlKey||e.metaKey)&&key==='z'){e.shiftKey?drawing.redo():drawing.undo();return true;}if((e.ctrlKey||e.metaKey)&&key==='y'){drawing.redo();return true;}if(keys[key]&&!e.ctrlKey&&!e.metaKey){selectTool(keys[key]);return true;}const n=Number(key);if(n>=1&&n<=6){drawing.brush=BRUSHES[n-1][0];$('brush-kind').value=drawing.brush;selectTool('brush');return true;}return false;};
  setColor(drawing.color);
}
