const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getDatabase}=require('firebase-admin/database');
const {getAuth}=require('firebase-admin/auth');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {createServices,ServiceError}=require('./services.cjs');
const {FUNCTIONS_REGION}=require('./settings.json');
initializeApp();const fs=getFirestore(),rt=getDatabase(),auth=getAuth(),service=createServices({fs,rt,auth,FieldValue});
const options={region:FUNCTIONS_REGION,maxInstances:10};
function account(request) {
  if(!request.auth||request.auth.token.firebase?.sign_in_provider==='anonymous')throw new HttpsError('unauthenticated','Inicia sesión.');return request.auth.uid;
}
function callable(fn) {return onCall({...options,enforceAppCheck:process.env.ENFORCE_APP_CHECK==='true'},async request=>{try{return await fn(account(request),request.data||{},request);}catch(e){if(e instanceof HttpsError)throw e;if(e instanceof ServiceError)throw new HttpsError(e.code,e.message);console.error(e);throw new HttpsError('unavailable','No se pudo completar. Reintenta.');}});}
exports.provisionAccount=callable(async(uid,d)=>{await service.provisionAccount(uid,d.nombre);return {ok:true};});
exports.socialAction=callable((uid,d)=>service.socialAction(uid,d));
exports.setAvatar=callable((uid,d)=>service.setAvatar(uid,d.avatar));
exports.publishCoopRecord=callable((uid,d)=>service.publishCoopRecord(uid,d));
exports.deleteAccount=callable((uid,d,r)=>{
  if(Date.now()/1000-(r.auth.token.auth_time||0)>300)throw new HttpsError('unauthenticated','Vuelve a iniciar sesión.');return service.deleteAccount(uid);
});
// Los triggers reparan el espejo si una respuesta o una escritura de RTDB se interrumpe.
exports.mirrorFriendship=onDocumentWritten({...options,document:'users/{uid}/amigos/{otherUid}',retry:true},e=>service.mirrorPair(e.params.uid,e.params.otherUid));
exports.mirrorProfile=onDocumentWritten({...options,document:'users/{uid}',retry:true},e=>service.mirrorAccount(e.params.uid,e.data.after.exists?e.data.after.data():null));
exports.maintenance=onSchedule({...options,schedule:'every 60 minutes'},async()=>{
  const pending=await fs.collection('accountCleanup').get();for(const p of pending.docs)await service.cleanupAccount(p.id);
  const rooms=await rt.ref('rooms').orderByChild('meta/expiresAt').endAt(Date.now()).get(),patch={};rooms.forEach(r=>patch[`rooms/${r.key}`]=null);
  const invitations=await rt.ref('invitaciones').get();invitations.forEach(d=>d.forEach(i=>{if(i.val().caducaEn<Date.now())patch[`invitaciones/${d.key}/${i.key}`]=null;}));
  if(Object.keys(patch).length)await rt.ref().update(patch);
});
