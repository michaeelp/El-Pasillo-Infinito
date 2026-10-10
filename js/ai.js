import { AI } from './config.js?v=1.4.0';
export class Recognizer {
  constructor(onStatus){this.onStatus=onStatus;this.worker=null;this.ready=false;this.pending=null;this.loading=null;this.sequence=0;this.backend='';}
  load(){
    if(this.ready)return Promise.resolve();if(this.loading)return this.loading;
    this.worker?.terminate();this.ready=false;const files=new Map();let peak=0;
    this.loading=new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./ai-worker.js?v=1.4.0',import.meta.url),{type:'module'});this.worker=worker;
      const fail=()=>{clearTimeout(this.loadTimer);this.ready=false;this.loading=null;worker.terminate();this.onStatus({state:'error'});reject(new Error('La IA no pudo cargarse. Comprueba tu conexión y vuelve a intentarlo.'));};
      this.loadTimer=setTimeout(fail,AI.loadTimeoutMs);
      worker.onerror=()=>{if(!this.ready)fail();else{this.pending?.reject(new Error('El reconocimiento se interrumpió.'));this.reset();}};
      worker.onmessage=({data})=>{
        if(data.type==='progress'){if(data.file?.endsWith('.onnx'))files.set(data.file,Number.isFinite(data.progress)?data.progress:0);let totalProgress=0;for(const progress of files.values())totalProgress+=progress;peak=Math.max(peak,Math.min(99,Math.floor(totalProgress/Math.max(2,files.size))));this.onStatus({state:'loading',percent:peak});}
        if(data.type==='ready'){clearTimeout(this.loadTimer);this.ready=true;this.backend=data.backend;this.loading=null;this.onStatus({state:'ready',backend:data.backend});resolve();}
        if(data.type==='result'&&this.pending?.id===data.id){this.pending.resolve(data.results);this.pending=null;}
        if(data.type==='error'){console.warn('CLIP:',data.message);if(!this.ready)fail();else if(this.pending?.id===data.id){this.pending.reject(new Error('No se pudo interpretar el dibujo. Puedes reintentar sin perder tu partida.'));this.pending=null;}}
      };this.onStatus({state:'loading',percent:0});worker.postMessage({type:'load'});
    });return this.loading;
  }
  reset(){clearTimeout(this.loadTimer);this.worker?.terminate();this.worker=null;this.ready=false;this.loading=null;this.pending=null;this.onStatus({state:'error'});}
  async classify(blob,labels){
    if(!this.ready)await this.load();if(this.pending)throw new Error('Ya hay un dibujo en análisis.');
    return new Promise((resolve,reject)=>{
      const id=++this.sequence,timer=setTimeout(()=>{this.reset();reject(new Error('La IA tardó más de 25 segundos. Reintenta el análisis; tu partida está a salvo.'));},AI.timeoutMs);
      const candidates=new Map(labels.map(word=>[word.etiquetaCLIP,word.id]));
      this.pending={id,resolve:r=>{clearTimeout(timer);resolve(r.map(item=>({...item,label:candidates.get(item.label)||item.label})).sort((a,b)=>b.score-a.score));},reject:e=>{clearTimeout(timer);reject(e);}};
      this.worker.postMessage({type:'classify',id,blob,labels:labels.map(word=>word.etiquetaCLIP)});
    });
  }
}
export const topResult = results => results.reduce((best,item)=>Number.isFinite(item.score)&&(!best||item.score>best.score)?item:best,null);
export function judge(results,monster){const top=topResult(results);return !!top&&!!monster?.debilidades.some(word=>word.id===top.label);}
