const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getDatabase}=require('firebase-admin/database');
initializeApp();
// Expired rooms stay inaccessible even when the cleanup job has not run yet.
exports.deleteExpiredRooms=onSchedule('every 60 minutes',async()=>{
  const rooms=getDatabase().ref('rooms');
  const expired=await rooms.orderByChild('meta/expiresAt').endAt(Date.now()).limitToFirst(500).once('value');
  for(const code of Object.keys(expired.val()||{})){
    await rooms.child(code).transaction(room=>room&&room.meta?.expiresAt<Date.now()?null:undefined);
  }
});
