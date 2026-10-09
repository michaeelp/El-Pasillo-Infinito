import { VERSION } from './config.js?v=1.1.0';
import { sanitizeName } from './storage.js?v=1.1.0';
import { shortError } from './net.js?v=1.1.0';
const KEY = 'pasillo-profile-v1';
export let avatars = [];
let profile = {nombre:'Jugador', avatar:1};
export async function loadProfile() {
  const response = await fetch(`avatars.json?v=${VERSION}`);
  if (!response.ok) throw new Error('No se cargaron los avatares.');
  avatars = await response.json();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    profile = stored ? {nombre:sanitizeName(stored.nombre), avatar:avatars.some(a => a.id === stored.avatar) ? stored.avatar : 1} : {nombre:'Jugador', avatar:1+Math.floor(Math.random()*avatars.length)};
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
  return getProfile();
}
export function getProfile() {return {...profile};}
export function saveProfile(name, id) {
  profile = {nombre:sanitizeName(name), avatar:avatars.some(a => a.id === id) ? id : 1};
  try {localStorage.setItem(KEY,JSON.stringify(profile));return true;} catch {return false;}
}
export function avatarNode(player, small = false, role = '') {
  const avatar = avatars.find(item => item.id === (player.avatar || player.a)) || avatars[0];
  const root = document.createElement('span'); root.className = `avatar${small?' small':''}`;
  root.style.setProperty('--avatar-color', avatar?.color || '#88c1a0');
  const fallback = document.createElement('span'); fallback.textContent = sanitizeName(player.nombre || player.n).slice(0,1); root.append(fallback);
  if (avatar) {
    const image = document.createElement('img'); image.alt = avatar.nombre;
    image.src = `${small ? avatar.ruta.replace('.webp','-64.webp') : avatar.ruta}?v=${VERSION}`;
    image.onerror = () => image.remove(); root.append(image);
  }
  if (role) {const badge = document.createElement('span'); badge.className = 'role-badge'; badge.textContent = {vigia:'◉',bibliotecario:'▤',dibujante:'✎'}[role]; badge.title = {vigia:'Vigía',bibliotecario:'Bibliotecario',dibujante:'Dibujante'}[role]; root.append(badge);}
  return root;
}
export function playerNode(player, small = true, role = '') {
  const root = document.createElement('span'); root.className = 'player-identity';
  const name = document.createElement('span'); name.textContent = sanitizeName(player.nombre || player.n);
  root.append(avatarNode(player,small,role),name); return root;
}
export function setupProfile(onBack, onSave, blocked = [], beforeSave = null) {
  const $ = id => document.getElementById(id); let selected = profile.avatar;
  function preview() {
    $('avatar-preview').replaceChildren(avatarNode({nombre:$('profile-name').value,avatar:selected}));
    $('avatar-name').textContent = avatars.find(a=>a.id===selected)?.nombre || '';
    for (const button of $('avatar-grid').children) button.setAttribute('aria-pressed', String(Number(button.dataset.id) === selected));
  }
  $('avatar-grid').replaceChildren();
  for (const avatar of avatars) {
    const button = document.createElement('button'); button.type='button'; button.dataset.id=avatar.id; button.title=avatar.nombre; button.setAttribute('aria-label',avatar.nombre);button.disabled=blocked.includes(avatar.id);
    button.append(avatarNode({nombre:avatar.nombre,avatar:avatar.id})); button.onclick=()=>{selected=avatar.id;preview();}; $('avatar-grid').append(button);
  }
  $('profile-name').value=profile.nombre; preview();
  $('profile-name').oninput=preview; $('profile-back').onclick=onBack;
  $('profile-status').textContent='';
  $('profile-form').onsubmit=async e=>{e.preventDefault();try{if(beforeSave)await beforeSave(sanitizeName($('profile-name').value),selected);const stored=saveProfile($('profile-name').value,selected);$('profile-name').value=profile.nombre;$('profile-status').textContent=stored?'Guardado.':'Guardado en esta sesión.';onSave();}catch(error){$('profile-status').textContent=shortError(error);}};
}
