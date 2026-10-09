export const BRUSHES=[['hard','Redondo'],['soft','Suave'],['pencil','Lápiz'],['marker','Marcador'],['spray','Spray'],['stamp','Manchas']];
const TAU=Math.PI*2;
const stampCache=new Map();
function stamp(color) {
  if(stampCache.has(color))return stampCache.get(color);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<18;i++){const angle=i/18*TAU,r=25+Math.random()*18,x=48+Math.cos(angle)*r,y=48+Math.sin(angle)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
  for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(Math.random()*96,Math.random()*96,1+Math.random()*4,0,TAU);ctx.fill();}
  stampCache.set(color,canvas);if(stampCache.size>16)stampCache.delete(stampCache.keys().next().value);return canvas;
}
export function dab(ctx,point,{brush,size,color,hardness=1,density=25}) {
  const {x,y}=point,r=size/2;ctx.save();ctx.fillStyle=color;
  if(brush==='spray') {
    for(let i=0;i<density;i++){const angle=Math.random()*TAU,d=Math.sqrt(Math.random())*r,px=x+Math.cos(angle)*d,py=y+Math.sin(angle)*d;ctx.beginPath();ctx.arc(px,py,.45+Math.random()*1.3,0,TAU);ctx.fill();
      if(Math.random()<.009){ctx.strokeStyle=color;ctx.lineWidth=1+Math.random();ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+.8,py+Math.random()*size*.8);ctx.stroke();}}
  }else if(brush==='stamp'){ctx.translate(x,y);ctx.rotate(Math.random()*TAU);const s=size*(.7+Math.random()*.6);ctx.drawImage(stamp(color),-s/2,-s/2,s,s);}
  else if(brush==='pencil'){ctx.globalAlpha=.85;for(let i=0;i<Math.max(5,size*2);i++){const angle=Math.random()*TAU,d=Math.sqrt(Math.random())*r;ctx.fillRect(x+Math.cos(angle)*d,y+Math.sin(angle)*d,.7,.7);}}
  else if(brush==='marker'){ctx.fillRect(x-r,y-r*.55,size,size*.55);}
  else {
    const inner=brush==='soft'?Math.min(.25,hardness):hardness;
    if(inner<.99){const gradient=ctx.createRadialGradient(x,y,r*inner,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,`${color}00`);ctx.fillStyle=gradient;}
    ctx.beginPath();ctx.arc(x,y,Math.max(.5,r),0,TAU);ctx.fill();
  }ctx.restore();
}
export function brushSegment(ctx,a,b,settings) {
  const distance=Math.hypot(b.x-a.x,b.y-a.y),step=Math.max(1,settings.size*(settings.brush==='stamp'?.35:settings.brush==='spray'?.3:.12)),steps=Math.max(1,Math.ceil(distance/step));
  for(let i=1;i<=steps;i++)dab(ctx,{x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},settings);
}
