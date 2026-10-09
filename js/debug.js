import { confusables } from './config.js?v=1.3.0';
export function showDebug(results,labels){
  if(new URLSearchParams(location.search).get('debug')!=='1')return;
  const byId=new Map(labels.map(word=>[word.id,word]));
  document.getElementById('debug').hidden=false;
  document.getElementById('debug-results').textContent=[...results].sort((a,b)=>b.score-a.score).slice(0,5).map(item=>`${byId.get(item.label)?.nombre||item.label}: ${(item.score*100).toFixed(1)} %`).join('\n');
  document.getElementById('debug-confusables').textContent='Confusables: '+confusables.map(id=>byId.get(id)?.nombre||id).join(', ');
}
