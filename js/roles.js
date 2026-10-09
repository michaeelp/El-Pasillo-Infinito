import { ROLES } from './coop.js?v=1.1.0';
const $ = id => document.getElementById(id);
export function roleView(role, selectTab, drawing, phase = 'book') {
  $('active-role').hidden = !role; $('active-role').textContent = ROLES[role] || '';
  document.querySelector('.tabs').hidden = !!role;
  $('role-view').hidden = role !== 'vigia'; $('role-name').textContent = ROLES[role] || '';
  $('live-view').hidden = !role || role === 'dibujante';
  $('book-view').hidden = role === 'vigia' || role === 'dibujante';
  $('draw-view').hidden = !!role && role !== 'dibujante';
  if (role === 'bibliotecario') selectTab('book');
  if (role === 'dibujante') selectTab('draw');
  drawing.enabled = phase === 'book' && (!role || role === 'dibujante') && !$('draw-view').hidden;
}
