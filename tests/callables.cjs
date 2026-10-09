// Monta los handlers onCall reales en HTTP local cuando el entorno no admite sockets IPC.
// Auth, Firestore y RTDB siguen siendo emuladores Firebase. No sustituye lógica de las funciones.
const path=require('node:path'),fnRequire=require('node:module').createRequire(path.resolve(__dirname,'../functions/package.json'));
const express=fnRequire('express');
function startCallables() {
 if(!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_DATABASE_EMULATOR_HOST)throw new Error('Solo se permite con los tres emuladores locales.');
 process.env.GCLOUD_PROJECT='demo-pasillo';process.env.FIREBASE_CONFIG=JSON.stringify({projectId:'demo-pasillo',databaseURL:'https://demo-pasillo.firebaseio.com'});
 const handlers=require('../functions/index.cjs'),app=express();app.use(express.json({limit:'1mb'}));
 app.all('/demo-pasillo/us-central1/:name',(req,res)=>{const f=handlers[req.params.name];if(!f?.__endpoint?.callableTrigger)return res.status(404).json({error:{status:'NOT_FOUND',message:'Callable desconocida'}});return f(req,res);});
 return new Promise(resolve=>{const server=app.listen(5001,'127.0.0.1',()=>resolve(server));});
}
module.exports={startCallables};
