import { VERSION, ASSET_TIMEOUT_MS } from './config.js?v=1.4.0';
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
  load(name,path=null) {
    if (this.cache.has(name)) return this.cache.get(name).promise;
    const entry = {image:new Image(), loaded:false, url:new URL(`../${path||`assets/ui/pasillo-${name}.webp`}?v=${VERSION}`, import.meta.url).href};
    entry.promise = new Promise(resolve => {
      const finish = loaded => {clearTimeout(entry.timer);entry.loaded = loaded; if (this.variant === name) this.render(); resolve(loaded);};
      entry.timer=setTimeout(()=>finish(false),ASSET_TIMEOUT_MS);
      entry.image.onload = () => finish(true); entry.image.onerror = () => {if(path&&entry.url.includes('.webp')){entry.url=entry.url.replace('.webp','.png');entry.image.src=entry.url;}else finish(false);};
    });
    this.cache.set(name, entry); entry.image.src = entry.url; return entry.promise;
  }
  preloadProfiles(catalog){return Promise.all(catalog.filter(item=>item.tipo==='fondo').map(item=>this.load(`profile:${item.archivo}`,item.archivo)));}
  show(state, round = 1) {
    if(state==='profile'&&this.profilePending){this.profilePending=false;return;}
    document.body.classList.remove('profile-background');
    this.variant = ['warning','menu','modes','profile','lobby'].includes(state) ? 'hospital' : this.environments[Math.floor((Math.max(1, round)-1)/4)%3];
    this.render();
  }
  profile(path){const name=`profile:${path}`;this.variant=name;this.tones[name]='#191d18';this.profilePending=true;document.body.classList.add('profile-background');this.load(name,path).then(()=>{if(this.variant===name)this.render();});this.render();}
  render() {
    if (!this.node) return;
    const entry = this.cache.get(this.variant);
    this.node.style.setProperty('--background-tone', this.tones[this.variant]);
    this.node.style.backgroundImage = entry?.loaded ? `url("${entry.url}")` : 'radial-gradient(ellipse at center,var(--background-tone),#060a09)';
    this.node.dataset.environment = this.variant; this.node.dataset.loaded = String(!!entry?.loaded);
  }
}
export const background = new Background();
