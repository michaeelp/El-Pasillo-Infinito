// Fórmulas puras para XP/estadísticas y persistencia exactamente una vez por partida.
// Son resúmenes de cliente: las reglas acotan escrituras, no certifican que se jugó.
import {XP,DIFFICULTIES} from './config.js?v=1.4.0';
import {matchReward} from './economy.js?v=1.4.0';
import {currentUser} from './auth.js?v=1.4.0';
import {databaseService,readData,withDeadline} from './sdk.js?v=1.4.0';
export const xpParaSubir=n=>Math.round(XP.base*Math.pow(n,XP.exponente));
export function levelFor(xp) {let nivel=1,total=0;while(nivel<XP.nivelMax&&xp>=total+xpParaSubir(nivel)){total+=xpParaSubir(nivel++);}return {nivel,actual:Math.max(0,xp-total),necesaria:xpParaSubir(nivel),total};}
export const emptyStats=()=>({partidas:0,pasillos:0,mejores:{},precisionTotal:0,precisionMuestras:0,tiempoMs:0,rachaMax:0,carrerasGanadas:0,cooperativas:0,bestiario:{},logros:[]});
let monsterIds=new Set();
export function setMonsterCatalog(monsters){monsterIds=new Set(monsters.map(m=>m.id));}
export const ACHIEVEMENTS=[
  ['primera','✦','Primer pasillo'],['diez','Ⅹ','10 pasillos'],['cincuenta','♜','50 pasillos'],['carrera','♛','Primera victoria'],
  ['margen','⌛','A tiempo'],['treinta','▤','Bestiario completo'],['vistos','◉','Todos encontrados'],['racha','⚡','Racha de 5'],
  ['coop','♧','En equipo'],['precision','◎','Precisión 90 %'],['pesadilla','☾','Pesadilla'],['veterano','★','20 partidas'],['pesadilla10','☾','10 en Pesadilla']
];
export function matchXp(match) {
  if(match.personalizada)return 0;
  const multiplier=DIFFICULTIES[match.dificultad]?.xp||1,corridors=match.pasillos||0;
  let value=match.modo==='race'?Math.floor((match.puntos||0)/XP.puntosCarrera)+(XP.puestos[(match.puesto||99)-1]||0):match.modo==='coop'?corridors*XP.coop*multiplier:corridors*XP.solo*multiplier+(match.precisiones||[]).reduce((n,p)=>n+Math.round(Math.max(0,Math.min(1,p))*XP.precision),0);
  return Math.min(XP.maxPartida,Math.max(0,Math.round(value)));
}
export function updatedStats(old,match) {
  const s={...emptyStats(),...old,mejores:{...old?.mejores},bestiario:structuredClone(old?.bestiario||{}),logros:[...(old?.logros||[])]};
  s.partidas++;s.pasillos+=match.pasillos||0;s.tiempoMs+=Math.max(0,Math.round(match.tiempoMs||0));s.rachaMax=Math.max(s.rachaMax,match.racha||0);
  if(match.modo==='race'&&match.puesto===1)s.carrerasGanadas++;if(match.modo==='coop')s.cooperativas++;
  const key=`${match.modo}_${match.dificultad}`,score=match.modo==='race'?match.puntos:match.pasillos;s.mejores[key]=Math.max(s.mejores[key]||0,score||0);
  const ps=match.precisiones||[];s.precisionTotal+=ps.reduce((n,p)=>n+Math.round(Math.max(0,Math.min(1,p))*1000),0);s.precisionMuestras+=ps.length;
  for(const e of match.encuentros||[]){if(!Number.isInteger(e.id)||e.id<1||monsterIds.size&&!monsterIds.has(e.id))continue;const b=s.bestiario[e.id]||{vistos:0,vencidos:0};b.vistos++;if(e.ok)b.vencidos++;s.bestiario[e.id]=b;}
  const unlock=(id,test)=>{if(test&&!s.logros.includes(id))s.logros.push(id);};
  unlock('primera',s.pasillos>=1);unlock('diez',s.pasillos>=10);unlock('cincuenta',s.pasillos>=50);unlock('carrera',s.carrerasGanadas>=1);
  unlock('margen',match.margen3===true);unlock('treinta',monsterIds.size>0&&[...monsterIds].every(id=>s.bestiario[id]?.vencidos>0));unlock('vistos',monsterIds.size>0&&[...monsterIds].every(id=>s.bestiario[id]?.vistos>0));
  unlock('racha',s.rachaMax>=5);unlock('coop',s.cooperativas>=1);unlock('precision',ps.some(p=>p>=.9));unlock('pesadilla',match.dificultad==='pesadilla'&&match.pasillos>=1);unlock('veterano',s.partidas>=20);
  unlock('pesadilla10',match.dificultad==='pesadilla'&&match.pasillos>=10);
  return s;
}
// El recibo y el progreso se escriben atómicamente. Las reglas comprueban el valor anterior;
// una pestaña concurrente obliga a releer, sin repetir la recompensa de una partida.
export async function awardMatch(match) {
  const user=currentUser();if(!user||match.personalizada)return {xp:0,nivelAnterior:1,nivel:1,monedas:0,saldo:user?(await readData(`users/${user.uid}/monedas`)).val()||0:0};
  const {r,db}=await databaseService();
  for(let attempt=0;attempt<5;attempt++){
    const [profile,previous]=await Promise.all([readData(`users/${user.uid}`),readData(`partidas/${user.uid}/${match.id}`)]);if(!profile.exists())throw new Error('Perfil no disponible.');
    const p=profile.val();if(previous.exists())return {xp:0,nivelAnterior:p.nivel,nivel:p.nivel,monedas:previous.val().monedas||0,saldo:p.monedas||0};
    const gained=matchXp(match),xp=p.xp+gained,nivel=levelFor(xp).nivel,estadisticas=updatedStats(p.estadisticas,match),reward=matchReward(match,p,{nivel,estadisticas}),saldo=(p.monedas||0)+reward.monedas,op=`partida-${match.id}`;
    const receipt={xp:gained,fecha:r.serverTimestamp(),modo:match.modo,dificultad:match.dificultad,monedas:reward.monedas,baseMonedas:reward.base,pasillos:Math.max(0,Math.floor(match.pasillos||0)),puntos:Math.max(0,Math.floor(match.puntos||0)),puesto:match.puesto||99,logrosNuevos:reward.logros,nivelesNuevos:reward.niveles,personalizada:false,margen3:match.margen3===true,precisionMax:Math.max(0,...(match.precisiones||[]).map(p=>Math.max(0,Math.min(1,p))))};
    try{await withDeadline(r.update(r.ref(db),{[`partidas/${user.uid}/${match.id}`]:receipt,[`users/${user.uid}/xp`]:xp,[`users/${user.uid}/nivel`]:nivel,[`users/${user.uid}/estadisticas`]:estadisticas,[`users/${user.uid}/ultimaPartida`]:match.id,[`users/${user.uid}/monedas`]:saldo,[`users/${user.uid}/ultimaOperacion`]:op,[`movimientos/${user.uid}/${op}`]:{tipo:'partida',delta:reward.monedas,saldo,fecha:r.serverTimestamp(),partida:match.id}}));return {xp:gained,nivelAnterior:p.nivel,nivel,monedas:reward.monedas,saldo};}
    catch(error){if(attempt===4)throw error;}
  }
}
