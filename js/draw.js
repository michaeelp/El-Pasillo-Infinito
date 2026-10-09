import { AI } from './config.js?v=1.0.0';
export class Drawing {
  constructor(canvas, sound) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});
    this.ink=document.createElement('canvas');this.ink.width=this.ink.height=512;
    this.ix=this.ink.getContext('2d',{willReadFrequently:true});
    this.sound=sound;this.color='#171717';this.tool='brush';this.size=7;this.history=[];this.active=null;this.enabled=false;
    canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,e=>this.end(e));
    this.render();
  }
  point(e) { const r=this.canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(511,(e.clientX-r.left)*512/r.width)),y:Math.max(0,Math.min(511,(e.clientY-r.top)*512/r.height))}; }
  snapshot() { this.history.push(this.ix.getImageData(0,0,512,512));if(this.history.length>25)this.history.shift(); }
  render() { this.ctx.fillStyle='#fff';this.ctx.fillRect(0,0,512,512);this.ctx.drawImage(this.ink,0,0); }
  down(e) {
    if(!this.enabled||this.active!==null||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();this.snapshot();const p=this.point(e);
    if(this.tool==='fill'){this.fill(Math.floor(p.x),Math.floor(p.y));return;}
    this.active=e.pointerId;this.last=p;this.canvas.setPointerCapture(e.pointerId);this.stroke(p,p);this.sound?.('pencil');
  }
  move(e) { if(e.pointerId!==this.active||!this.enabled)return;e.preventDefault();for(const sample of e.getCoalescedEvents?.()||[e]){const p=this.point(sample);this.stroke(this.last,p);this.last=p;} }
  end(e) { if(e.pointerId===this.active)this.active=null; }
  stroke(a,b) {
    const x=this.ix;x.save();x.globalCompositeOperation=this.tool==='eraser'?'destination-out':'source-over';x.strokeStyle=this.color;x.fillStyle=this.color;x.lineWidth=this.size;x.lineCap=x.lineJoin='round';
    x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();x.beginPath();x.arc(b.x,b.y,this.size/2,0,Math.PI*2);x.fill();x.restore();this.render();
  }
  undo() { if(!this.enabled)return;this.active=null;const image=this.history.pop();if(image)this.ix.putImageData(image,0,0);this.render(); }
  clear(record=true) { this.active=null;if(record)this.snapshot();else this.history=[];this.ix.clearRect(0,0,512,512);this.render(); }
  // La búsqueda usa el color visible; los píxeles pintados permanecen en el canvas transparente.
  fill(sx,sy,tolerance=36) {
    const image=this.ctx.getImageData(0,0,512,512),d=image.data,ink=this.ix.getImageData(0,0,512,512),k=ink.data;
    const origin=(sy*512+sx)*4,target=[d[origin],d[origin+1],d[origin+2]],rgb=this.color.match(/[a-f\d]{2}/gi).map(h=>parseInt(h,16));
    if(target.every((v,i)=>Math.abs(v-rgb[i])<2))return;
    const seen=new Uint8Array(512*512),queue=new Int32Array(512*512);let head=0,tail=1;queue[0]=sy*512+sx;seen[queue[0]]=1;
    while(head<tail){const q=queue[head++],p=q*4;if(target.some((v,i)=>Math.abs(v-d[p+i])>tolerance))continue;
      k[p]=rgb[0];k[p+1]=rgb[1];k[p+2]=rgb[2];k[p+3]=255;
      const x=q%512,y=Math.floor(q/512);for(const n of [x>0?q-1:-1,x<511?q+1:-1,y>0?q-512:-1,y<511?q+512:-1])if(n>=0&&!seen[n]){seen[n]=1;queue[tail++]=n;}
    }this.ix.putImageData(ink,0,0);this.render();
  }
  bounds() {
    const d=this.ix.getImageData(0,0,512,512).data;let minX=512,minY=512,maxX=-1,maxY=-1,count=0;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){const p=(y*512+x)*4;const contrast=(255-Math.min(d[p],d[p+1],d[p+2]))*d[p+3]/255;if(contrast<18)continue;count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    return count<AI.minimumInk?null:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count};
  }
  async exportBlob() {
    const b=this.bounds();if(!b)return null;
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);
    const scale=216/Math.max(b.w,b.h),w=b.w*scale,h=b.h*scale;x.drawImage(this.canvas,b.x,b.y,b.w,b.h,(256-w)/2,(256-h)/2,w,h);
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo leer el dibujo.')),'image/png'));
  }
}
export const COLORS=[['Negro','#171717'],['Rojo','#dc3232'],['Naranja','#eb852a'],['Amarillo','#efce37'],['Verde','#329248'],['Azul','#3370cd'],['Violeta','#8c48b1'],['Rosa','#ed91bc'],['Marrón','#815133'],['Gris','#818181'],['Celeste','#70cfe0'],['Blanco','#ffffff']];
