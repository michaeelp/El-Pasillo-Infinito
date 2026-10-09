import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const aliases={dog:['can','sabueso'],cat:['felino','minino'],shovel:['palita'],sunglasses:['gafas','anteojos','lentes oscuros'],pencil:['lapicero'],crown:['diadema'],diamond:['brillante'],smiley_face:['carita feliz','rostro sonriente'],teddy_bear:['peluche','osito'],flower:['florecilla'],ring:['sortija','alianza'],hammer:['mazo'],alarm_clock:['despertador'],coffee_cup:['café'],sun:['astro rey','astro del día'],scales:['báscula'],book:['tomo'],snowflake:['copo','nieve'],life_ring:['flotador'],ball:['balón'],bucket:['balde','cubeta'],rope:['cuerda','cordel','maroma'],axe:['segur'],fire:['hoguera','fogata','llama','incendio'],saw:['serrucho'],mousetrap:['ratonera'],bandage:['vendaje','apósito'],umbrella:['sombrilla','parasol'],paintbrush:['brocha'],house:['hogar','vivienda','caserón'],toothbrush:['cepillo','cepillo dental'],cake:['torta','tarta','bizcocho'],magnet:['magneto'],lamp:['candil'],candle:['cirio','bujía'],fishing_net:['malla','trasmallo'],fishing_hook:['gancho','garfio']};
const normalize=text=>String(text).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[a-z0-9]+/g)?.join(' ')||'';
const plural=word=>/z$/.test(word)?word.slice(0,-1)+'ces':/[aeiou]$/.test(word)?word+'s':/s$/.test(word)?word:word+'es';
const singular=word=>/ces$/.test(word)?word.slice(0,-3)+'z':/es$/.test(word)?word.slice(0,-2):/s$/.test(word)?word.slice(0,-1):word;
function forms(text){const words=normalize(text).split(' ');return [...new Set([words.join(' '),words.map(plural).join(' '),[plural(words[0]),...words.slice(1)].join(' '),words.map(singular).join(' '),[singular(words[0]),...words.slice(1)].join(' ')])];}
export function validateLore(monsters){
  const errors=[],counts=[];
  for(const monster of monsters){
    const count=String(monster.lore||'').match(/\p{L}+(?:['’\-]\p{L}+)*/gu)?.length||0,[min,max]=monster.debilidades.length===1?[20,35]:[30,50];counts.push({id:monster.id,words:count,min,max});
    if(count<min||count>max)errors.push(`${monster.id}: ${count} palabras; debe tener ${min}..${max}.`);
    const text=' '+normalize(monster.lore)+' ';
    for(const weakness of monster.debilidades)for(const term of [weakness.nombre,...(aliases[weakness.id]||[])])if(forms(term).some(form=>text.includes(' '+form+' ')))errors.push(`${monster.id}: revela «${term}».`);
  }
  return {errors:[...new Set(errors)],counts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const file=process.argv[2]||fileURLToPath(new URL('../monsters.json',import.meta.url));
  const {errors,counts}=validateLore(JSON.parse(fs.readFileSync(file,'utf8')));
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`LORE OK: ${counts.length} textos; rangos y nombres/sinónimos conocidos validados.`);
}
