import { TIEMPO_FASE, TIEMPO_ALERTA, VERSION, ASSET_TIMEOUT_MS } from './config.js?v=1.4.0';
export class Atmosphere {
  constructor(options){this.options=options;this.ctx=null;this.beatAt=0;this.ambientAt=0;this.stepAt=0;this.cues=new Map();}
  async start(){
    if(this.ctx){try{await this.ctx.resume();this.startAmbience();}catch{}return;}
    try{
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();const c=this.ctx;
      this.master=c.createGain();this.music=c.createGain();this.fx=c.createGain();this.screamBus=c.createGain();this.ambientBus=c.createGain();
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-8;limiter.ratio.value=12;
      this.music.connect(this.master);this.fx.connect(this.master);this.screamBus.connect(this.master);this.ambientBus.connect(this.master);this.master.connect(limiter);limiter.connect(c.destination);
      this.noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const d=this.noise.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){last=(last+(Math.random()*2-1)*.05)/1.02;d[i]=last*3.5;}
      for(const [f,gain]of [[41,.1],[61.7,.035],[82.3,.025]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.value=gain;o.connect(g);g.connect(this.music);o.start();const lfo=c.createOscillator(),mod=c.createGain();lfo.frequency.value=.07;mod.gain.value=gain*.4;lfo.connect(mod);mod.connect(g.gain);lfo.start();}
      this.setOptions(this.options);await c.resume();
      await Promise.all([...this.cues.values()].map(entry=>this.decodeCue(entry)));
      this.startAmbience();
    }catch{this.ctx=null;}
  }
  setOptions(options){this.options=options;if(!this.ctx)return;const t=this.ctx.currentTime;this.music.gain.setTargetAtTime(options.music,t,.08);this.fx.gain.setTargetAtTime(options.effects,t,.08);this.screamBus.gain.setTargetAtTime(options.screamVolume??.65,t,.08);this.ambientBus.gain.setTargetAtTime(options.ambient??.4,t,.08);this.master.gain.setTargetAtTime(options.muted?0:(options.master??.8),t,.08);}
  async suspend(){try{await this.ctx?.suspend();}catch{}}
  async resume(){try{await this.ctx?.resume();}catch{}}
  startAmbience(){const ambient=this.cues.get('assets/audio/ambience.wav');if(this.ambientSource||!this.ctx||!ambient?.buffer)return;this.ambientSource=this.ctx.createBufferSource();this.ambientSource.buffer=ambient.buffer;this.ambientSource.loop=true;this.ambientSource.connect(this.ambientBus);this.ambientSource.start();}
  async preload(monsters){await Promise.all([...monsters.flatMap(monster=>[monster.sonidoAparicion,monster.sonidoScreamer]),'assets/audio/ambience.wav'].map(path=>this.loadCue(path).promise));await Promise.all([...this.cues.values()].map(entry=>this.decodeCue(entry)));this.startAmbience();}
  loadCue(path){
    if(this.cues.has(path))return this.cues.get(path);
    const entry={buffer:null,bytes:null},controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ASSET_TIMEOUT_MS);
    entry.promise=fetch(new URL(`../${path}?v=${VERSION}`,import.meta.url),{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('Audio no disponible.');return response.arrayBuffer();}).then(bytes=>{entry.bytes=bytes;return bytes;}).catch(()=>null).finally(()=>clearTimeout(timer));
    this.cues.set(path,entry);return entry;
  }
  async decodeCue(entry){
    if(entry.buffer||!this.ctx)return entry.buffer;
    if(!entry.decoding)entry.decoding=entry.promise.then(bytes=>bytes?this.ctx.decodeAudioData(bytes.slice(0)):null).then(buffer=>entry.buffer=buffer).catch(()=>null);
    return entry.decoding;
  }
  monster(kind,monster){
    this.caption(kind==='appear'?'Aparición':'Screamer');
    const path=kind==='appear'?monster?.sonidoAparicion:monster?.sonidoScreamer,entry=this.cues.get(path);
    if(!entry?.buffer){this.effect(kind==='appear'?'flash':'scream');return;}
    if(!this.ctx||this.ctx.state!=='running')return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=entry.buffer;gain.gain.value=kind==='scream'&&this.options.screamer==='attenuated'?.18:.7;
    source.connect(gain);gain.connect(kind==='scream'?this.screamBus:this.fx);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};
  }
  tone(f,duration=.2,volume=.2,type='sine',delay=0,end=f,bus=this.fx){
    if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(bus);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  hiss(duration=.2,volume=.2,frequency=1000,delay=0,bus=this.fx){
    if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+duration+.03);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  effect(type){
    if(type==='heart')this.caption('Latido');if(type==='scream')this.caption('Screamer');if(type==='flash')this.caption('Aparición');
    if(!this.ctx)return;
    switch(type){
      case 'heart':this.tone(65,.18,.36,'sine',0,35);this.tone(57,.16,.23,'sine',.18,30);break;
      case 'step':this.hiss(.15,.25,180);this.tone(90,.1,.11,'triangle',0,25);break;
      case 'count':this.tone(130,.25,.08,'sine',0,65);break;
      case 'flash':this.hiss(.45,.65,1300);this.tone(110,.6,.25,'sawtooth',0,35);break;
      case 'page':this.hiss(.28,.14,2500);break;
      case 'pencil':this.hiss(.07,.06,3200);break;
      case 'breath':this.hiss(1.5,.22,500);break;
      case 'flee':this.tone(490,1.4,.25,'sawtooth',0,80);for(let i=0;i<7;i++)this.hiss(.12,.24/(i+1),220,i*.15);break;
      case 'scream':{const v=this.options.screamer==='attenuated'?.13:.65;this.hiss(1.1,v,1600,0,this.screamBus);this.tone(360,1.1,v*.45,'sawtooth',0,1700,this.screamBus);this.tone(530,.95,v*.25,'sawtooth',.02,330,this.screamBus);break;}
    }
  }
  caption(text){if(this.options.captions)document.dispatchEvent(new CustomEvent('pasillo-sound',{detail:text}));if(this.options.vibration&&['Aparición','Screamer'].includes(text))navigator.vibrate?.(text==='Screamer'?80:25);}
  tick(now,state,remaining,level,phaseMs=TIEMPO_FASE*1000){
    if(!this.ctx||this.ctx.state!=='running')return;
    if(['count','book','suspense'].includes(state)&&now>this.beatAt){this.effect('heart');this.beatAt=now+(state==='suspense'?420:remaining<=Math.min(TIEMPO_ALERTA*1000,phaseMs/3)?400+remaining/50:1000);}
    if(state==='count'&&now>this.stepAt){this.effect('step');this.stepAt=now+570;}
    if(now>this.ambientAt){const choices=[()=>this.hiss(2,.12,800,0,this.ambientBus),()=>this.tone(270,2,.03,'sine',0,265,this.ambientBus),()=>this.tone(70,.8,.06,'triangle',0,32,this.ambientBus)];choices[Math.floor(Math.random()*choices.length)]();this.ambientAt=now+Math.max(2300,9000-level*180)+Math.random()*4000;}
  }
}
