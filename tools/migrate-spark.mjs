// Herramienta LOCAL opcional: lee Firestore y copia a RTDB. No despliega un servidor.
// Sin --apply únicamente muestra el número de elementos. No cambia Auth ni borra el origen.
import {createRequire} from 'node:module';
import {FIREBASE_CONFIG,DIFFICULTIES} from '../js/config.js';
import {migrationPatch} from './migration_data.mjs';
const require=createRequire(process.env.PASILLO_TEST_MODULES?process.env.PASILLO_TEST_MODULES+'/package.json':new URL('../package.json',import.meta.url));
const {initializeApp,applicationDefault,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getDatabase}=require('firebase-admin/database'),{getAuth}=require('firebase-admin/auth');
const argument=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
const projectId=argument('--project')||FIREBASE_CONFIG.projectId,databaseURL=argument('--database')||FIREBASE_CONFIG.databaseURL;
const app=initializeApp({credential:applicationDefault(),projectId,databaseURL});
try{
 const store=getFirestore(app),database=getDatabase(app),auth=getAuth(app);
 if((await database.ref('migration/spark131').get()).child('completa').val()){console.log('Migración ya completada. No se cambiaron datos.');}
 else{
  if((await database.ref('users').get()).exists())throw new Error('RTDB ya tiene perfiles nuevos. No se sobrescriben; migra antes de publicar la versión 1.3.1.');
  const source={profiles:{},friends:{},receipts:{},records:{}};
  for(const doc of (await store.collection('users').get()).docs){
   try{await auth.getUser(doc.id);}catch(error){if(error.code==='auth/user-not-found')continue;throw error;}
   if((await store.doc(`accountCleanup/${doc.id}`).get()).exists)continue;
   if((await database.ref(`deletedAccounts/${doc.id}`).get()).exists()||(await database.ref(`accountCleanup/${doc.id}`).get()).exists())continue;
   source.profiles[doc.id]=doc.data();source.friends[doc.id]=Object.fromEntries((await doc.ref.collection('amigos').get()).docs.map(p=>[p.id,p.data()]));source.receipts[doc.id]=Object.fromEntries((await doc.ref.collection('partidas').get()).docs.map(p=>[p.id,p.data()]));
  }
  for(const mode of ['solo','carrera','coop'])for(const d of Object.keys(DIFFICULTIES)){const category=`records_${mode}_${d}`;source.records[category]=Object.fromEntries((await store.collection(category).get()).docs.map(p=>[p.id,p.data()]));if((await database.ref(category).get()).exists())throw new Error('RTDB ya tiene récords nuevos. No se sobrescriben.');}
  const patch=migrationPatch(source);patch['migration/spark131']={completa:true,fecha:Date.now(),cuentas:Object.keys(source.profiles).length};
  const bytes=Buffer.byteLength(JSON.stringify(patch));if(bytes>12*1024*1024)throw new Error('Migración mayor de 12 MB. Divide los datos con un administrador antes de continuar.');
  console.log(`${Object.keys(source.profiles).length} perfiles; ${Object.keys(patch).length} rutas; ${bytes} bytes.`);
  if(process.argv.includes('--apply')){await database.ref().update(patch);console.log('Migración completada en una escritura atómica. Firestore y Auth conservados.');}
  else console.log('Vista previa. Añade --apply para copiar estos datos.');
 }
}finally{await deleteApp(app);}
