export const ROLES = {vigia:'Vigía', bibliotecario:'Bibliotecario', dibujante:'Dibujante'};
export function assignRoles(players) {
  const roles = {}, remaining = Object.keys(ROLES);
  for (const [uid, player] of Object.entries(players)) {
    if (remaining.includes(player.rol)) {roles[uid] = player.rol; remaining.splice(remaining.indexOf(player.rol),1);}
  }
  for (const uid of Object.keys(players)) if (!roles[uid]) roles[uid] = remaining.shift();
  return roles;
}
export function rotateRoles(roles) {
  const order = Object.keys(ROLES);
  return Object.fromEntries(Object.entries(roles).map(([uid, role]) => [uid, order[(order.indexOf(role)+1)%order.length]]));
}
export function roleUid(meta, role) {return Object.keys(meta.roles || {}).find(uid => meta.roles[uid] === role);}
export function chooseSecret(monsters, previousId) {
  const pool = monsters.filter(monster => monster.id !== previousId);
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  return pool[Math.floor(random * pool.length)];
}
