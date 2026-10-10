import { AI } from './config.js?v=1.4.0';
let classifier=null,loading=null,backend='wasm';
async function load(){
  if(classifier)return;
  if(loading)return loading;
  loading=(async()=>{
    const {pipeline,env}=await import(AI.library);env.allowLocalModels=false;env.useBrowserCache=true;
    env.backends.onnx.wasm.numThreads=1;
    const progress_callback=p=>{if(p.status==='progress'||p.status==='done')self.postMessage({type:'progress',file:p.file,loaded:p.loaded,total:p.total,progress:p.status==='done'?100:p.progress});};
    let gpu=false;try{gpu=!!(await navigator.gpu?.requestAdapter());}catch{}
    if(gpu){try{classifier=await pipeline('zero-shot-image-classification',AI.model,{device:'webgpu',dtype:'fp32',progress_callback});backend='webgpu';}catch(error){console.warn('CLIP: WebGPU no disponible; se usará WASM.',error);}}
    if(!classifier)classifier=await pipeline('zero-shot-image-classification',AI.model,{device:'wasm',dtype:'q8',progress_callback});
  })();
  try{await loading;}finally{loading=null;}
}
self.onmessage=async({data})=>{
  try{
    if(data.type==='load'){await load();self.postMessage({type:'ready',backend});return;}
    if(data.type==='classify'){
      if(!classifier)throw new Error('La IA no está lista.');
      const url=URL.createObjectURL(data.blob);
      try{const results=await classifier(url,data.labels,{hypothesis_template:AI.template});self.postMessage({type:'result',id:data.id,results});}finally{URL.revokeObjectURL(url);}
    }
  }catch(error){self.postMessage({type:'error',id:data.id,message:error?.message||'No se pudo iniciar el reconocimiento.'});}
};
