// Conversión de formato y tamaños de los originales de ImageGen, conservando el alfa.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'):'sharp');
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),root=path.resolve(new URL('../',import.meta.url).pathname);
for(const job of jobs){const dir=path.join(root,'assets',job.folder);fs.mkdirSync(dir,{recursive:true});const sizes=job.key==='moneda'?[64,128,256]:[job.folder==='monsters'?1024:job.folder.endsWith('marcos')?256:1920];for(const size of sizes){const height=job.folder.endsWith('fondos')?1080:size,base=path.join(dir,job.key+(job.key==='moneda'&&size!==256?`-${size}`:''));await sharp(job.path).resize(size,height,{fit:'fill'}).webp({quality:86,alphaQuality:100}).toFile(base+'.webp');await sharp(job.path).resize(size,height,{fit:'fill'}).png({compressionLevel:9}).toFile(base+'.png');}}
fs.writeFileSync(path.join(root,'assets/PROMPTS-AMPLIACION5.md'),'# Arte de la Ampliación 5\n\nGenerado individualmente con ImageGen integrado. Los PNG son el respaldo de los WebP. Las descripciones de producción no aparecen en los catálogos ni en la interfaz.\n\n'+jobs.map(j=>`## assets/${j.folder}/${j.key}\n\n${j.prompt}\n`).join('\n'));
console.log(`${jobs.length} originales convertidos; alfa preservado en moneda y marcos.`);
