// Fórmulas puras para XP/estadísticas y persistencia exactamente una vez por partida.
// Son resúmenes de cliente: las reglas acotan escrituras, no certifican que se jugó.
import {XP,MONSTER_COUNT,DIFFICULTIES} from './config.js?v=1.3.1';
import {currentUser} from './auth.js?v=1.3.1';
import {databaseService,readData,withDeadline} from './sdk.js?v=1.3.1';
export const xpParaSubir=n=>Math.round(XP.base*Math.pow(n,XP.exponente));
export function levelFor(xp) {let nivel=1,total=0;while(nivel<XP.nivelMax&&xp>=total+xpParaSubir(nivel)){total+=xpParaSubir(nivel++);}return {nivel,actual:Math.max(0,xp-total),necesaria:xpParaSubir(nivel),total};}
export const emptyStats=()=>({partidas:0,pasillos:0,mejores:{},precisionTotal:0,precisionMuestras:0,tiempoMs:0,rachaMax:0,carrerasGanadas:0,cooperativas:0,bestiario:{},logros:[]});
export const ACHIEVEMENTS=[
  ['primera','✦','Primer pasillo'],['diez','Ⅹ','10 pasillos'],['cincuenta','♜','50 pasillos'],['carrera','♛','Primera victoria'],
  ['margen','⌛','A tiempo'],['treinta','▤','Bestiario completo'],['vistos','◉','30 encuentros'],['racha','⚡','Racha de 5'],
  ['coop','♧','En equipo'],['precision','◎','Precisión 90 %'],['pesadilla','☾','Pesadilla'],['veterano','★','20 partidas']
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
  for(const e of match.encuentros||[]){if(e.id<1||e.id>MONSTER_COUNT)continue;const b=s.bestiario[e.id]||{vistos:0,vencidos:0};b.vistos++;if(e.ok)b.vencidos++;s.bestiario[e.id]=b;}
  const unlock=(id,test)=>{if(test&&!s.logros.includes(id))s.logros.push(id);};
  unlock('primera',s.pasillos>=1);unlock('diez',s.pasillos>=10);unlock('cincuenta',s.pasillos>=50);unlock('carrera',s.carrerasGanadas>=1);
  unlock('margen',match.margen3===true);unlock('treinta',Object.values(s.bestiario).filter(b=>b.vencidos>0).length===MONSTER_COUNT);unlock('vistos',Object.keys(s.bestiario).length===MONSTER_COUNT);
  unlock('racha',s.rachaMax>=5);unlock('coop',s.cooperativas>=1);unlock('precision',ps.some(p=>p>=.9));unlock('pesadilla',match.dificultad==='pesadilla'&&match.pasillos>=1);unlock('veterano',s.partidas>=20);
  return s;
}
// El recibo y el progreso se escriben atómicamente. Las reglas comprueban el valor anterior;
// una pestaña concurrente obliga a releer, sin repetir la recompensa de una partida.
export async function awardMatch(match) {
  const user=currentUser();if(!user||match.personalizada)return {xp:0,nivelAnterior:1,nivel:1};
  const {r,db}=await databaseService();
  for(let attempt=0;attempt<5;attempt++){
    const [profile,previous]=await Promise.all([readData(`users/${user.uid}`),readData(`partidas/${user.uid}/${match.id}`)]);if(!profile.exists())throw new Error('Perfil no disponible.');
    const p=profile.val();if(previous.exists())return {xp:0,nivelAnterior:p.nivel,nivel:p.nivel};
    const gained=matchXp(match),xp=p.xp+gained,nivel=levelFor(xp).nivel;
    try{await withDeadline(r.update(r.ref(db),{[`partidas/${user.uid}/${match.id}`]:{xp:gained,fecha:r.serverTimestamp(),modo:match.modo,dificultad:match.dificultad},[`users/${user.uid}/xp`]:xp,[`users/${user.uid}/nivel`]:nivel,[`users/${user.uid}/estadisticas`]:updatedStats(p.estadisticas,match),[`users/${user.uid}/ultimaPartida`]:match.id}));return {xp:gained,nivelAnterior:p.nivel,nivel};}
    catch(error){if(attempt===4)throw error;}
  }
}
