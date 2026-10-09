import { VERSION, ASSET_TIMEOUT_MS } from './config.js?v=1.3.0';
export class Background {
  constructor(node = document.getElementById('corridor')) {
    this.node = node; this.cache = new Map(); this.variant = 'hospital';
    this.environments = ['hospital', 'mansion', 'sotano'];
    this.tones = {hospital:'#102323', mansion:'#221924', sotano:'#16231b'};
    this.ready = Promise.all(this.environments.map(name => this.load(name)));
    this.show('warning');
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.render(); });
    window.addEventListener('resize', () => this.render());
  }
  load(name) {
    if (this.cache.has(name)) return this.cache.get(name).promise;
    const entry = {image:new Image(), loaded:false, url:new URL(`../assets/ui/pasillo-${name}.webp?v=${VERSION}`, import.meta.url).href};
    entry.promise = new Promise(resolve => {
      const finish = loaded => {clearTimeout(entry.timer);entry.loaded = loaded; if (this.variant === name) this.render(); resolve(loaded);};
      entry.timer=setTimeout(()=>finish(false),ASSET_TIMEOUT_MS);
      entry.image.onload = () => finish(true); entry.image.onerror = () => finish(false);
    });
    this.cache.set(name, entry); entry.image.src = entry.url; return entry.promise;
  }
  show(state, round = 1) {
    this.variant = ['warning','menu','modes','profile','lobby'].includes(state) ? 'hospital' : this.environments[Math.floor((Math.max(1, round)-1)/4)%3];
    this.render();
  }
  render() {
    if (!this.node) return;
    const entry = this.cache.get(this.variant);
    this.node.style.setProperty('--background-tone', this.tones[this.variant]);
    this.node.style.backgroundImage = entry?.loaded ? `url("${entry.url}")` : 'radial-gradient(ellipse at center,var(--background-tone),#060a09)';
    this.node.dataset.environment = this.variant; this.node.dataset.loaded = String(!!entry?.loaded);
  }
}
export const background = new Background();
