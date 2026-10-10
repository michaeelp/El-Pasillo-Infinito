// ink es la imagen confirmada y opaca; layer contiene solo el trazo en curso.
// El canvas visible combina ambas para la vista previa, sin modificar el historial.
import {AI} from './config.js?v=1.4.0';
import {dab,brushSegment} from './draw/brushes.js?v=1.4.0';
import {SHAPES,paintShape} from './draw/shapes.js?v=1.4.0';
const SIZE=512;
export const COLORS=[['Negro','#171717'],['Rojo','#dc3232'],['Naranja','#eb852a'],['Amarillo','#efce37'],['Verde','#329248'],['Azul','#3370cd'],['Violeta','#8c48b1'],['Rosa','#ed91bc'],['Marrón','#815133'],['Gris','#818181'],['Celeste','#70cfe0'],['Blanco','#ffffff']];
export class Drawing {
  constructor(canvas,sound) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});
    this.ink=document.createElement('canvas');this.layer=document.createElement('canvas');this.ink.width=this.ink.height=this.layer.width=this.layer.height=SIZE;
    this.ix=this.ink.getContext('2d',{willReadFrequently:true});this.lx=this.layer.getContext('2d',{willReadFrequently:true});
    this.sound=sound;this.color='#171717';this.outline='#171717';this.tool='brush';this.brush='hard';this.size=7;this.eraserSize=24;this.opacity=1;this.hardness=1;this.density=25;this.tolerance=36;this.filled=false;this.fixed=false;this.symmetry=false;this.history=[];this.future=[];this.active=null;this.enabled=false;this.queue=[];
    canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>this.end(e));
    this.clear(false);
  }
  point(e){const r=this.canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(SIZE-1,(e.clientX-r.left)*SIZE/r.width)),y:Math.max(0,Math.min(SIZE-1,(e.clientY-r.top)*SIZE/r.height))};}
  snapshot(){this.history.push(this.ix.getImageData(0,0,SIZE,SIZE));if(this.history.length>36)this.history.shift();this.future=[];}
  cancel(){this.active=null;this.queue=[];cancelAnimationFrame(this.frame);this.frame=0;this.lx.clearRect(0,0,SIZE,SIZE);this.render();}
  render(){this.ctx.drawImage(this.ink,0,0);if(this.active!==null){this.ctx.save();this.ctx.globalAlpha=this.strokeSettings.opacity;this.ctx.drawImage(this.layer,0,0);this.ctx.restore();}this.onChange?.();}
  settings(){return {brush:this.tool==='eraser'?'hard':this.brush,size:this.tool==='eraser'?this.eraserSize:this.size,color:this.tool==='eraser'?'#ffffff':this.color,hardness:this.tool==='eraser'?1:this.hardness,density:this.density,opacity:this.tool==='eraser'?1:this.opacity,outline:this.outline,width:this.size,filled:this.filled,fixed:this.fixed,symmetry:this.symmetry,tool:this.tool};}
  down(e){if(!this.enabled||this.active!==null||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();const p=this.point(e);
    if(this.tool==='eyedropper'){const pixel=this.ix.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data;this.setColor?.('#'+[...pixel.slice(0,3)].map(n=>n.toString(16).padStart(2,'0')).join(''));return;}
    this.snapshot();if(this.tool==='fill'){this.fill(Math.floor(p.x),Math.floor(p.y));return;}
    this.active=e.pointerId;this.start=this.last=p;this.shift=e.shiftKey;this.strokeSettings=this.settings();this.lx.clearRect(0,0,SIZE,SIZE);this.canvas.setPointerCapture(e.pointerId);
    if(!SHAPES.includes(this.tool)){dab(this.lx,p,this.strokeSettings);if(this.symmetry)dab(this.lx,{x:SIZE-p.x,y:p.y},this.strokeSettings);}this.render();this.sound?.('pencil');this.schedule();
  }
  move(e){this.cursor?.(this.point(e));if(e.pointerId!==this.active||!this.enabled)return;e.preventDefault();for(const sample of e.getCoalescedEvents?.()||[e])this.queue.push({...this.point(sample),shift:e.shiftKey});this.schedule();}
  schedule(){if(this.frame||this.active===null)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.flush();this.render();if(this.active!==null&&this.strokeSettings.brush==='spray'&&this.tool==='brush')this.schedule();});}
  flush(){if(this.active===null)return;const settings=this.strokeSettings;
    if(SHAPES.includes(settings.tool)){const p=this.queue.at(-1)||this.last;this.last=p;this.queue=[];this.lx.clearRect(0,0,SIZE,SIZE);paintShape(this.lx,settings.tool,this.start,p,{...settings,fixed:settings.fixed||p.shift});if(settings.symmetry){this.lx.save();this.lx.translate(SIZE,0);this.lx.scale(-1,1);paintShape(this.lx,settings.tool,this.start,p,{...settings,fixed:settings.fixed||p.shift});this.lx.restore();}}
    else {for(const p of this.queue.splice(0)){brushSegment(this.lx,this.last,p,settings);if(settings.symmetry)brushSegment(this.lx,{x:SIZE-this.last.x,y:this.last.y},{x:SIZE-p.x,y:p.y},settings);this.last=p;}
      if(settings.brush==='spray'){dab(this.lx,this.last,settings);if(settings.symmetry)dab(this.lx,{x:SIZE-this.last.x,y:this.last.y},settings);}}
  }
  end(e){if(e.pointerId!==this.active)return;this.flush();cancelAnimationFrame(this.frame);this.frame=0;
    // La opacidad se aplica una sola vez al componer la capa completa del trazo.
    this.ix.save();this.ix.globalAlpha=this.strokeSettings.opacity;this.ix.drawImage(this.layer,0,0);this.ix.restore();this.active=null;this.lx.clearRect(0,0,SIZE,SIZE);this.onColorUsed?.(this.color);this.render();}
  undo(){if(!this.enabled)return;this.cancel();const image=this.history.pop();if(!image)return;this.future.push(this.ix.getImageData(0,0,SIZE,SIZE));this.ix.putImageData(image,0,0);this.render();}
  redo(){if(!this.enabled)return;this.cancel();const image=this.future.pop();if(!image)return;this.history.push(this.ix.getImageData(0,0,SIZE,SIZE));this.ix.putImageData(image,0,0);this.render();}
  clear(record=true){this.cancel();if(record)this.snapshot();else{this.history=[];this.future=[];}this.ix.fillStyle='#fff';this.ix.fillRect(0,0,SIZE,SIZE);this.render();}
  fill(sx,sy){const image=this.ix.getImageData(0,0,SIZE,SIZE),data=image.data,target=[...data.slice((sy*SIZE+sx)*4,(sy*SIZE+sx)*4+3)],rgb=this.color.match(/[a-f\d]{2}/gi).map(h=>parseInt(h,16));
    const seen=new Uint8Array(SIZE*SIZE),queue=new Int32Array(SIZE*SIZE);let head=0,tail=1;queue[0]=sy*SIZE+sx;seen[queue[0]]=1;
    while(head<tail){const q=queue[head++],index=q*4;if(target.some((v,i)=>Math.abs(v-data[index+i])>this.tolerance))continue;
      for(let i=0;i<3;i++)data[index+i]=Math.round(data[index+i]*(1-this.opacity)+rgb[i]*this.opacity);data[index+3]=255;
      const x=q%SIZE,y=Math.floor(q/SIZE);for(const next of [x>0?q-1:-1,x<SIZE-1?q+1:-1,y>0?q-SIZE:-1,y<SIZE-1?q+SIZE:-1])if(next>=0&&!seen[next]){seen[next]=1;queue[tail++]=next;}
    }this.ix.putImageData(image,0,0);this.onColorUsed?.(this.color);this.render();}
  bounds(){const data=this.ix.getImageData(0,0,SIZE,SIZE).data,xs=new Uint32Array(SIZE),ys=new Uint32Array(SIZE);let count=0;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const index=(y*SIZE+x)*4;if(255-Math.min(data[index],data[index+1],data[index+2])<6)continue;count++;xs[x]++;ys[y]++;}
    if(count<AI.minimumInk)return null;
    const quantile=(hist,fromEnd)=>{let sum=0;for(let i=0;i<SIZE;i++){const index=fromEnd?SIZE-1-i:i;sum+=hist[index];if(sum>count*.01)return index;}return 0;};
    const minX=Math.max(0,quantile(xs,false)-6),maxX=Math.min(SIZE-1,quantile(xs,true)+6),minY=Math.max(0,quantile(ys,false)-6),maxY=Math.min(SIZE-1,quantile(ys,true)+6);
    return {x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count};}
  async exportBlob(){const b=this.bounds();if(!b)return null;const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);const scale=216/Math.max(b.w,b.h),w=b.w*scale,h=b.h*scale;ctx.drawImage(this.ink,b.x,b.y,b.w,b.h,(256-w)/2,(256-h)/2,w,h);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo leer el dibujo.')),'image/png'));}
}
