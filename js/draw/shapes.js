export const SHAPES=['line','rectangle','ellipse','triangle','star','heart','arrow'];
// Un único trazado sirve tanto para la vista previa como para la confirmación.
export function shapePath(ctx,type,a,b,fixed=false) {
  let dx=b.x-a.x,dy=b.y-a.y;
  if(fixed){const side=Math.max(Math.abs(dx),Math.abs(dy));dx=Math.sign(dx||1)*side;dy=Math.sign(dy||1)*side;}
  const x=Math.min(a.x,a.x+dx),y=Math.min(a.y,a.y+dy),w=Math.max(1,Math.abs(dx)),h=Math.max(1,Math.abs(dy)),cx=x+w/2,cy=y+h/2;
  ctx.beginPath();
  if(type==='line'||type==='arrow') {
    const end={x:a.x+dx,y:a.y+dy};
    if(type==='line'){ctx.moveTo(a.x,a.y);ctx.lineTo(end.x,end.y);}
    else {const angle=Math.atan2(dy,dx),length=Math.hypot(dx,dy),head=Math.min(32,Math.max(10,length*.28)),shaft=Math.max(2,ctx.lineWidth/2),base=Math.max(0,length-head),points=[[0,-shaft],[base,-shaft],[base,-head*.45],[length,0],[base,head*.45],[base,shaft],[0,shaft]];
      points.forEach(([along,across],i)=>{const px=a.x+Math.cos(angle)*along-Math.sin(angle)*across,py=a.y+Math.sin(angle)*along+Math.cos(angle)*across;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();}
  }else if(type==='rectangle')ctx.rect(x,y,w,h);
  else if(type==='ellipse')ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);
  else if(type==='triangle'){ctx.moveTo(cx,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();}
  else if(type==='star'){for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,r=i%2?.44:1,px=cx+Math.cos(angle)*w/2*r,py=cy+Math.sin(angle)*h/2*r;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();}
  else if(type==='heart'){ctx.moveTo(cx,y+h);ctx.bezierCurveTo(x-w*.12,y+h*.48,x,y-h*.22,cx,y+h*.28);ctx.bezierCurveTo(x+w,y-h*.22,x+w*1.12,y+h*.48,cx,y+h);ctx.closePath();}
}
export function paintShape(ctx,type,a,b,{color,outline,width,filled,fixed}) {
  ctx.save();ctx.lineCap=ctx.lineJoin='round';ctx.lineWidth=width;ctx.fillStyle=color;ctx.strokeStyle=outline;
  shapePath(ctx,type,a,b,fixed);if(filled&&type!=='line')ctx.fill();ctx.stroke();ctx.restore();
}
