import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { labelsFrom } from '../js/monsters.js';
const root=new URL('../',import.meta.url),file=fileURLToPath(new URL('database.rules.json',root));
const monsters=JSON.parse(fs.readFileSync(new URL('monsters.json',root),'utf8'));
const rules=JSON.parse(fs.readFileSync(file,'utf8')),room=rules.rules.rooms.$code;
const pattern=labelsFrom(monsters).map(w=>w.id).sort().join('|'),max=Math.max(...monsters.map(m=>m.id));
if(!labelsFrom(monsters).every(w=>/^[a-z_]+$/.test(w.id)))throw new Error('ID de objeto inválido.');
room.meta.lastMonster['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 0 && newData.val() <= ${max}`;
room.secreto.$round.$uid.monstruoId['.validate']=`newData.isNumber() && newData.val() % 1 == 0 && newData.val() >= 1 && newData.val() <= ${max}`;
room.resultados.$round.$uid.distribution.$label['.validate']=`$label.matches(/^(${pattern})$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1`;
room.resultados.$round.$uid.etiqueta['.validate']=`newData.isString() && (newData.val() == '' || newData.val().matches(/^(${pattern})$/))`;
const output=JSON.stringify(rules,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw new Error('Regenera las reglas: node tools/update_rules.mjs');}
else fs.writeFileSync(file,output);
console.log(`REGLAS OK: ${monsters.length} monstruos y ${labelsFrom(monsters).length} etiquetas derivadas del JSON.`);
