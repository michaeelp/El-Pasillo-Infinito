export async function loadFonts() {
  const loaded = await Promise.all(['Pirata One','IM Fell English','Cutive Mono'].map(async name => {
    try {await document.fonts.load(`16px "${name}"`, 'ÁÉÍÓÚñ0123456789'); return document.fonts.check(`16px "${name}"`);} catch {return false;}
  }));
  document.documentElement.dataset.fonts = loaded.every(Boolean) ? 'ready' : 'fallback';
  return loaded.every(Boolean);
}
