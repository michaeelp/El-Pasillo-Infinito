// Un único esquema alimenta controles, normalización y generación de reglas.
import {DEFAULT_DIFFICULTY} from './config.js?v=1.4.0';
export const SETTINGS_SCHEMA={
 master:{categoria:'audio',nombre:'Volumen general',tipo:'range',min:0,max:1,valor:0.8},
 music:{categoria:'audio',nombre:'Música',tipo:'range',min:0,max:1,valor:0.35},
 effects:{categoria:'audio',nombre:'Efectos',tipo:'range',min:0,max:1,valor:0.6},
 screamVolume:{categoria:'audio',nombre:'Screamers',tipo:'range',min:0,max:1,valor:0.65},
 ambient:{categoria:'audio',nombre:'Ambiente',tipo:'range',min:0,max:1,valor:0.4},
 muteOnBlur:{categoria:'audio',nombre:'Silenciar al perder el foco',tipo:'boolean',valor:true},
 muted:{categoria:'audio',nombre:'Silencio',tipo:'boolean',valor:false},
 quality:{categoria:'calidad',nombre:'Calidad de efectos',tipo:'select',opciones:['baja','media','alta'],valor:'alta'},
 grain:{categoria:'calidad',nombre:'Grano',tipo:'boolean',valor:true},
 vignette:{categoria:'calidad',nombre:'Viñeta',tipo:'boolean',valor:true},
 scanlines:{categoria:'calidad',nombre:'Líneas de escaneo',tipo:'boolean',valor:false},
 chromatic:{categoria:'calidad',nombre:'Aberración cromática',tipo:'boolean',valor:false},
 fog:{categoria:'calidad',nombre:'Niebla',tipo:'boolean',valor:true},
 shake:{categoria:'calidad',nombre:'Sacudida de cámara',tipo:'range',min:0,max:1,valor:0.5},
 fps:{categoria:'calidad',nombre:'Límite de FPS',tipo:'select',opciones:[30,60],valor:60},
 difficulty:{categoria:'juego',nombre:'Dificultad por defecto',tipo:'select',opciones:['facil','normal','dificil','pesadilla'],valor:DEFAULT_DIFFICULTY},
 timerSize:{categoria:'juego',nombre:'Temporizador',tipo:'select',opciones:['normal','grande','enorme'],valor:'normal'},
 vibration:{categoria:'juego',nombre:'Vibración',tipo:'boolean',valor:true},
 bookColumns:{categoria:'juego',nombre:'Columnas del libro',tipo:'select',opciones:[4,5,6,7,8],valor:8},
 defaultBrush:{categoria:'juego',nombre:'Pincel inicial',tipo:'select',opciones:['hard','soft','pencil','marker','spray','stamp'],valor:'hard'},
 defaultTool:{categoria:'juego',nombre:'Herramienta inicial',tipo:'select',opciones:['brush','eraser','fill','eyedropper','line','rectangle','ellipse','triangle','star','heart','arrow'],valor:'brush'},
 keyBook:{categoria:'juego',nombre:'Libro',tipo:'key',valor:'b'},keyCanvas:{categoria:'juego',nombre:'Lienzo',tipo:'key',valor:'l'},keyPause:{categoria:'juego',nombre:'Pausa',tipo:'key',valor:'p'},
 keyBrush:{categoria:'juego',nombre:'Pincel',tipo:'key',valor:'v'},keyEraser:{categoria:'juego',nombre:'Goma',tipo:'key',valor:'e'},keyFill:{categoria:'juego',nombre:'Relleno',tipo:'key',valor:'f'},keyPicker:{categoria:'juego',nombre:'Cuentagotas',tipo:'key',valor:'i'},
 flash:{categoria:'accesibilidad',nombre:'Flash',tipo:'select',opciones:['normal','reduced'],valor:'normal'},
 screamer:{categoria:'accesibilidad',nombre:'Screamer',tipo:'select',opciones:['normal','attenuated'],valor:'normal'},
 largeText:{categoria:'accesibilidad',nombre:'Texto grande',tipo:'boolean',valor:false},
 highContrast:{categoria:'accesibilidad',nombre:'Alto contraste',tipo:'boolean',valor:false},
 colorblind:{categoria:'accesibilidad',nombre:'Modo daltónico',tipo:'select',opciones:['no','protanopia','deuteranopia','tritanopia'],valor:'no'},
 captions:{categoria:'accesibilidad',nombre:'Subtítulos de sonido',tipo:'boolean',valor:false}
};
export const DEFAULT_SETTINGS=Object.fromEntries(Object.entries(SETTINGS_SCHEMA).map(([key,s])=>[key,s.valor]));
export function normalizeSettings(value={}){const result={...DEFAULT_SETTINGS};for(const[key,s]of Object.entries(SETTINGS_SCHEMA)){const v=value[key];if(s.tipo==='boolean'&&typeof v==='boolean'||s.tipo==='range'&&Number.isFinite(v)&&v>=s.min&&v<=s.max||s.tipo==='select'&&s.opciones.includes(v)||s.tipo==='key'&&typeof v==='string'&&/^[a-z0-9]$/.test(v))result[key]=v;}return result;}
