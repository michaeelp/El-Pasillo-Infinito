export function hsv(h,s,v) {const f=(n,k=(n+h/60)%6)=>Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1))));return '#'+[f(5),f(3),f(1)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function fromHex(hex) {const [r,g,b]=hex.match(/[a-f\d]{2}/gi).map(s=>parseInt(s,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=d?(max===r?(g-b)/d%6:max===g?(b-r)/d+2:(r-g)/d+4)*60:0;return {h:(h+360)%360,s:max?d/max:0,v:max};}
export class ColorWheel {
  constructor(canvas,onColor){this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});this.onColor=onColor;this.h=0;this.s=0;this.v=.09;this.pointer=null;canvas.width=canvas.height=220;
    canvas.onpointerdown=e=>{this.pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);this.pick(e,true);};canvas.onpointermove=e=>{if(e.pointerId===this.pointer)this.pick(e);};canvas.onpointerup=canvas.onpointercancel=()=>this.pointer=null;this.draw();}
  set(hex){Object.assign(this,fromHex(hex));this.draw();}
  pick(e,start=false){e.preventDefault();const rect=this.canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*220/rect.width,y=(e.clientY-rect.top)*220/rect.height,dist=Math.hypot(x-110,y-110);
    if(start)this.mode=dist>78?'hue':'sv';
    if(this.mode==='hue')this.h=(Math.atan2(y-110,x-110)*180/Math.PI+360)%360;
    else {this.s=Math.max(0,Math.min(1,(x-60)/100));this.v=1-Math.max(0,Math.min(1,(y-60)/100));}
    this.draw();this.onColor(hsv(this.h,this.s,this.v));}
  draw(){const ctx=this.ctx;ctx.clearRect(0,0,220,220);ctx.lineWidth=22;
    for(let h=0;h<360;h++){ctx.strokeStyle=hsv(h,1,1);ctx.beginPath();ctx.arc(110,110,96,h*Math.PI/180,(h+1.6)*Math.PI/180);ctx.stroke();}
    ctx.fillStyle=hsv(this.h,1,1);ctx.fillRect(60,60,100,100);const white=ctx.createLinearGradient(60,0,160,0);white.addColorStop(0,'white');white.addColorStop(1,'#ffffff00');ctx.fillStyle=white;ctx.fillRect(60,60,100,100);
    const black=ctx.createLinearGradient(0,60,0,160);black.addColorStop(0,'#00000000');black.addColorStop(1,'black');ctx.fillStyle=black;ctx.fillRect(60,60,100,100);
    ctx.strokeStyle='white';ctx.lineWidth=2;for(const [x,y]of [[110+Math.cos(this.h*Math.PI/180)*96,110+Math.sin(this.h*Math.PI/180)*96],[60+this.s*100,60+(1-this.v)*100]]){ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();}}
}
