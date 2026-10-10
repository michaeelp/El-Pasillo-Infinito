// Herramienta local, de una sola ejecución. No despliega servidor ni Cloud Functions.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(process.env.PASILLO_TEST_MODULES?process.env.PASILLO_TEST_MODULES+'/package.json':new URL('../package.json',import.meta.url));
const {initializeApp,applicationDefault,deleteApp}=require('firebase-admin/app'),{getDatabase}=require('firebase-admin/database');
import {FIREBASE_CONFIG} from '../js/config.js';
const args=process.argv.slice(2),flag=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
const projectId=flag('--project')||FIREBASE_CONFIG.projectId,databaseURL=flag('--database')||FIREBASE_CONFIG.databaseURL;
const entries=JSON.parse(fs.readFileSync(new URL('../cosmeticos.json',import.meta.url)));if(new Set(entries.map(i=>i.id)).size!==entries.length)throw new Error('IDs duplicados.');
const value=Object.fromEntries(entries.map(item=>[item.id,item]));console.log(`Catálogo: ${entries.length} objetos. Proyecto: ${projectId}.`);
if(!args.includes('--apply')){console.log('Vista previa. Añade --apply para cargarlo.');process.exit(0);}
const app=initializeApp({credential:applicationDefault(),projectId,databaseURL});try{await getDatabase(app).ref('catalogo').set(value);console.log('Catálogo publicado en Realtime Database.');}finally{await deleteApp(app);}
