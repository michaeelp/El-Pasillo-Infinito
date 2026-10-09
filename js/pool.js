// Bolsa Fisher–Yates compartida por los tres modos. Cada ciclo contiene todo el catálogo.
export function seedNumber(seed) {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261;
  for (const c of String(seed)) {h ^= c.charCodeAt(0); h = Math.imul(h,16777619);}
  return h >>> 0;
}
export function randomFrom(seed) {
  let value = seedNumber(seed);
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let n = Math.imul(value ^ value >>> 15,value | 1);
    n ^= n + Math.imul(n ^ n >>> 7,n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
export function monsterSequence(seed, monsters, count) {
  if (!monsters.length) return [];
  const sequence = [], base = seedNumber(seed);
  for (let cycle=0; sequence.length<count; cycle++) {
    const bag = [...monsters], random = randomFrom((base+cycle)>>>0);
    for (let i=bag.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    if (bag.length>1 && sequence.at(-1)?.id===bag[0].id) [bag[0],bag[1]]=[bag[1],bag[0]];
    sequence.push(...bag);
  }
  return sequence.slice(0,count);
}
export class MonsterPool {
  constructor(seed,monsters) {this.seed=seedNumber(seed);this.monsters=monsters;this.index=0;this.sequence=[];}
  next() {if(this.index>=this.sequence.length)this.sequence=monsterSequence(this.seed,this.monsters,this.index+this.monsters.length);return this.sequence[this.index++];}
}
