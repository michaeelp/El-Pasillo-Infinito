import { VERSION } from './config.js?v=1.1.0';
export async function loadMonsters() {
  const response = await fetch(`monsters.json?v=${VERSION}`);
  if (!response.ok) throw new Error('No se pudo abrir el bestiario. Recarga la página.');
  const monsters = await response.json();
  if (!Array.isArray(monsters) || monsters.length < 22) throw new Error('El bestiario está incompleto.');
  return monsters;
}
export function chooseMonster(monsters, previous) {
  const pool = monsters.filter(m => m.id !== previous?.id);
  return pool[Math.floor(Math.random() * pool.length)];
}
export function labelsFrom(monsters) {
  return [...new Map(monsters.flatMap(m => m.debilidades).map(w => [w.en, w])).values()];
}
export function fallbackFace(monster) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'), id = monster.id;
  x.fillStyle = '#000'; x.fillRect(0,0,512,512);
  x.fillStyle = `hsl(${id * 27},18%,27%)`; x.beginPath(); x.ellipse(256,255,140-id%4*13,190,0,0,7); x.fill();
  const eyes = [2,8,1,2,0,2,0,2,2,3,4,2,2,2,6,2,2,2,3,4,2,0][id-1] ?? 2;
  for (let i=0;i<eyes;i++) {const a=(i+.5)/Math.max(eyes,1)*Math.PI*2;x.fillStyle='#d8c990';x.beginPath();x.ellipse(256+Math.cos(a)*80,220+Math.sin(a)*40,eyes===1?45:17,eyes===1?35:13,0,0,7);x.fill();x.fillStyle='#000';x.beginPath();x.arc(256+Math.cos(a)*80,220+Math.sin(a)*40,6,0,7);x.fill();}
  x.fillStyle='#050202';x.beginPath();x.ellipse(256,340,65,50+id%3*12,0,0,7);x.fill();
  x.strokeStyle='#aea181';x.lineWidth=4;for(let i=0;i<8;i++){x.beginPath();x.moveTo(205+i*14,310);x.lineTo(210+i*14,327);x.stroke();}
  return c.toDataURL();
}
export function setPortrait(img, monster) {
  img.alt = monster.nombre;
  img.onerror = () => { img.onerror = null; img.src = fallbackFace(monster); };
  img.src = `${monster.imagen}?v=${VERSION}`;
}
export async function preload(monsters) {
  await Promise.all(monsters.map(m => new Promise(resolve => {
    const i = new Image(); i.onload = i.onerror = resolve; i.src = `${m.imagen}?v=${VERSION}`;
    setTimeout(resolve,8000);
  })));
}
