# EL PASILLO INFINITO

Juego de terror estático en español. HTML, CSS y módulos JavaScript, sin compilación ni servidor propio. Incluye 22 retratos de monstruos generados individualmente, tres escenarios, texturas de papel y cuero, herramientas de dibujo, sonido sintetizado, CLIP local y récords locales/globales.

## Empezar

1. Descomprime el proyecto conservando las carpetas.
2. Abre una terminal dentro de `el-pasillo-infinito`.
3. Ejecuta `python -m http.server 8000` (en algunos sistemas: `python3 -m http.server 8000`).
4. Visita `http://localhost:8000`.
5. Acepta la advertencia, espera a que termine la descarga de CLIP y pulsa JUGAR.

También puedes usar Live Server en VS Code. No abras `index.html` con doble clic: los módulos, el Worker y `fetch` necesitan HTTP/HTTPS. El servidor local es solo para desarrollar; la versión publicada no necesita un servidor propio.

## Publicar en GitHub Pages

1. Crea un repositorio y sube **el contenido** de esta carpeta: `index.html` debe quedar en la raíz elegida para publicar.
2. Incluye `assets`, `js`, `css`, `monsters.json` y `.nojekyll`. No hace falta subir el ZIP.
3. En el repositorio entra en Settings → Pages.
4. Elige Deploy from a branch, rama `main`, carpeta `/ (root)` y guarda.
5. Cuando GitHub termine el despliegue, abre la URL que muestra Pages por HTTPS.
6. Comprueba la versión visible `1.0.0` en el menú y la carga del modelo.

Todas las rutas de recursos son relativas, por lo que funcionan también bajo `https://usuario.github.io/repositorio/`. Si decides publicar desde `/docs`, coloca el proyecto completo dentro de esa carpeta y selecciona `/docs` como origen.

Para una actualización, cambia `VERSION` en `js/config.js` **y todos los parámetros `?v=1.0.0`** de HTML, CSS y módulos a la nueva versión. No hay Service Worker que retenga una copia antigua. Puedes comprobar cambios con una recarga forzada. La caché del modelo es independiente de la del juego.

## Cómo se juega

- Tres segundos a oscuras y pasos. Un monstruo aparece durante 1.000 ms en primer plano; no se repite el de la ronda anterior.
- Encuentra su rostro en el libro. Hay tres debilidades por monstruo.
- Dibuja una debilidad. Libro y lienzo comparten **60 segundos**; cambiar de pestaña no borra el dibujo.
- Pulsa ¡MOSTRAR! para detener el reloj. Hay un mínimo de tres segundos de suspenso mientras se analiza el dibujo.
- Si CLIP elige una debilidad correcta, el monstruo huye y sumas un pasillo. Si elige otra, pierdes. Lienzo vacío o tiempo agotado también producen derrota.
- No hay final ni límite local de puntuación. El escenario cambia cada cuatro pasillos y aumenta gradualmente la frecuencia de sonidos ambientales. Los 60 segundos y el segundo de aparición se mantienen.

El monitor solo puede presentar cambios en sus fotogramas; la aparición de 1.000 ms está temporizada con reloj monotónico y se retira en el primer fotograma disponible. Cambiar de pestaña del navegador pausa el juego y oculta la escena; no permite consumir ni ganar tiempo en segundo plano.

### Controles

| Acción | Control |
|---|---|
| Dibujar | Ratón, lápiz o dedo |
| Pasar página | Flechas izquierda/derecha |
| Libro / lienzo | B / L |
| Pausa | P / Escape o botón de pausa |
| Deshacer | Ctrl+Z / Cmd+Z o botón |
| Elegir monstruo en el libro | Miniatura |

La pausa oculta el libro, el lienzo y el monstruo. No se puede editar el dibujo durante el análisis. El lienzo tiene 12 colores, pincel, goma, relleno con tolerancia, grosor de 1 a 40, 25 estados de deshacer y borrado completo. Borrar puede deshacerse.

## CLIP real en el navegador

Se utiliza `@huggingface/transformers@3.8.1`, una versión exacta fijada por CDN, con `Xenova/clip-vit-base-patch32` y el pipeline `zero-shot-image-classification`. Se eligió Transformers.js 3 por su soporte de WebGPU. `env.allowLocalModels = false` y el fallback es WASM de un hilo, compatible con GitHub Pages sin cabeceras de aislamiento adicionales.

El Worker intenta WebGPU si hay un adaptador disponible y pasa a WASM si la inicialización falla. La descarga se guarda en la caché del navegador cuando está permitida. El tamaño depende del backend: aproximadamente 150 MB cuantizado en WASM y más si se usa precisión completa en GPU; reserva memoria suficiente. Una primera carga lenta es normal. El progreso promedia la descarga de los dos archivos ONNX principales y queda en 99 % durante la preparación final; si el proveedor no informa su tamaño, se actualiza cuando termina cada archivo; 100 % significa que el modelo ya está listo. JUGAR permanece bloqueado hasta entonces.

La unión de las debilidades de `monsters.json` es la **única** lista de candidatos. CLIP recibe etiquetas en inglés y la interfaz muestra sus traducciones. No se envían dibujos a un servidor. La descarga inicial sí contacta con jsDelivr y Hugging Face.

El dibujo se mantiene en un canvas auxiliar transparente. Se buscan píxeles visibles de tinta, se recorta su bounding box, se centra sobre blanco a 256 × 256 con margen de 20 px y se conserva el color. Se convierte a Blob; el Worker crea una URL de objeto y la libera en `finally`. Trazos totalmente borrados, blancos sobre blanco o menos de 45 píxeles significativos cuentan como vacíos.

La clasificación tiene un límite de 25 segundos y corre fuera del hilo de animación. Una falla técnica no mata al jugador: muestra un mensaje y permite volver a analizar el mismo Blob. Si supera el tiempo máximo, se termina el Worker y se vuelve a cargar al reintentar. Si la inferencia supera los tres segundos de suspenso, la escena espera el resultado con un mensaje visible; nunca se inventa un resultado para respetar un plazo.

La puntuación de CLIP es relativa a las etiquetas candidatas, no una probabilidad calibrada de acierto. No se puede garantizar el reconocimiento de cualquier garabato. La plantilla inicial es `a rough hand-drawn doodle of a {}.`; debe calibrarse con dibujos reales del público objetivo. Los resultados de pruebas y sus límites están en `PRUEBAS.md`.

## Firebase opcional

Sin configuración, o si la red falla, el juego continúa con récords locales. Las opciones, las últimas 50 partidas y el récord personal usan `localStorage`. Cada derrota registra el resultado local automáticamente; el formulario añade el nombre y solicita su publicación global. El nombre está limitado a 14 caracteres, se sanitiza y se inserta con `textContent`.

### Configurar Firestore

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Registra una aplicación web en Project settings → Your apps.
3. Copia los campos del objeto público de configuración dentro de `FIREBASE_CONFIG` al inicio de `js/config.js`.
4. Crea Cloud Firestore y elige su ubicación. Usa reglas de producción; no dejes la base completamente abierta.
5. En Firestore → Rules pega **todo** `firestore.rules` y publica las reglas.
6. Publica la versión actualizada del juego. Guarda un resultado entre 1 y 500 para crear el primer documento de `scores`.
7. Comprueba que aparece en la Lista de Condenados y en el récord mundial del menú.

El SDK modular `10.14.1` se importa desde gstatic solamente cuando hay configuración. Cada documento contiene exactamente `{ n: string, p: integer, t: serverTimestamp() }`. La consulta del top 10 ordena por `p` descendente; los empates no tienen desempate adicional, por lo que no requiere un índice compuesto.

Las reglas permiten lectura pública y creación con nombre no vacío de hasta 14 caracteres, puntuación entera entre 1 y 500 y timestamp igual al tiempo del servidor. No permiten actualizar ni eliminar. Las puntuaciones 0 o mayores de 500 se guardan solo localmente, sin recortar ni falsificar su valor.

La `apiKey` de Firebase es pública por diseño: identifica el proyecto, no concede por sí sola permiso sobre los datos. La protección de Firestore depende de sus reglas. Se recomienda activar **App Check** con un proveedor compatible con tu web para reducir abuso. Registra el dominio de Pages, integra el proveedor de App Check y revisa sus métricas antes de exigir tokens en Firestore. El proyecto no incluye una clave de sitio de App Check porque debes crearla para tu dominio.

Una clasificación y una puntuación calculadas íntegramente en cliente pueden manipularse. Estas reglas validan formato y rango; no demuestran que una partida sea legítima. App Check reduce abuso, pero no convierte el ranking estático en un ranking imposible de falsificar.

Si un envío no puede confirmarse en plazo, el mensaje lo indica y el resultado local permanece. El SDK podría completar un envío pendiente al reconectar; no se reintenta automáticamente para evitar duplicados.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Todas las pantallas en español |
| `css/styles.css` | Atmósfera, responsive, libro y animaciones |
| `js/config.js` | Firebase, duración de fases y ajustes de CLIP |
| `js/game.js` | Máquina de estados y coordinación |
| `js/monsters.js` | Datos, selección sin repetición y rostro de respaldo |
| `js/book.js` | Bestiario, marcadores y páginas 3D |
| `js/draw.js` | Dibujo, relleno, historial y preprocesado |
| `js/ai.js` | Comunicación con el Worker, tiempos y regla de victoria |
| `js/ai-worker.js` | Descarga y ejecución real de CLIP |
| `js/audio.js` | Música y efectos originales con Web Audio |
| `js/firebase.js` | Récords globales con fallback local |
| `js/storage.js` | Preferencias, nombres y resultados locales |
| `js/ui.js` | Menú, diálogos, récords y opciones |
| `monsters.json` | Los 22 monstruos y sus debilidades bilingües |
| `assets/monsters/` | 22 retratos WebP de 1024 × 1024 |
| `assets/ui/` | Hospital, mansión, sótano, cuero y papel |
| `assets/PROMPTS.md` | Prompts utilizados para todas las imágenes |
| `ASSETS.md` | Lista numerada de recursos |
| `firestore.rules` | Reglas completas de seguridad |
| `PRUEBAS.md` | Verificación realizada y pruebas pendientes |

Estados: `warning → menu → count → flash → book → suspense → win → count`, o `lose → over`. `book` contiene las pestañas de libro y lienzo; la pausa es un estado superpuesto que conserva los relojes. Los tokens de partida impiden que resultados de análisis atrasados alteren una nueva partida.

## Ajustes finos

| Ajuste | Dónde | Valor inicial / efecto |
|---|---|---|
| Plantilla CLIP | `AI.template`, `js/config.js` | Doodle manual sencillo; puedes probar `a simple drawing of a {}.` |
| Aceptar segunda etiqueta | `AI.acceptSecond` | `false`; activar para mayor tolerancia |
| Cercanía de la segunda | `AI.secondMargin` | `0.04`, diferencia absoluta entre puntuaciones normalizadas |
| Dibujo mínimo | `AI.minimumInk` | 45 píxeles visibles en el canvas de 512 px |
| Inferencia máxima | `AI.timeoutMs` | 25.000 ms |
| Carga máxima | `AI.loadTimeoutMs` | 600.000 ms |
| Búsqueda + dibujo | `GAME.roundMs` | 60.000 ms |
| Aparición | `GAME.flashMs` | 1.000 ms |
| Suspenso mínimo | `GAME.suspenseMs` | 3.000 ms |
| Huida / susto | `GAME.winMs`, `GAME.loseMs` | 2.600 / 1.400 ms |
| Volúmenes iniciales | `DEFAULT_OPTIONS` | Música 0,35 / efectos 0,60 |
| Frecuencia ambiental | `Atmosphere.tick`, `js/audio.js` | Aumenta suavemente con los pasillos |
| Tolerancia del cubo | `Drawing.fill`, `js/draw.js` | 36 unidades por canal RGB |
| Historial | `Drawing.snapshot` | 25 estados |
| Cambio de escenario | `nextRound`, `js/game.js` | Cada cuatro pasillos |

`?debug=1` muestra en pantalla y consola las cinco puntuaciones más altas. No activa victorias de prueba ni falsea inferencias. La opción de aceptar la segunda etiqueta es global y modifica la dificultad; documenta su valor al comparar rankings.

## Checklist antes de publicar

- [ ] Advertencia inicial y audio desbloqueado tras clic; mute y volúmenes persistentes.
- [ ] Carga real del modelo desde caché vacía, progreso, error de conexión y reintento.
- [ ] WebGPU en un equipo compatible y WASM en otro; segundo arranque con caché.
- [ ] Cinco dibujos malos distintos: sol, corazón, llave, manzana y paraguas. Guardar el top 5 en debug y ajustar solo a partir de evidencia.
- [ ] Victoria por debilidad correcta, huida, aumento de puntuación y siguiente monstruo distinto.
- [ ] Derrota por objeto equivocado, lienzo vacío y agotamiento de 60 segundos.
- [ ] Exactitud aproximada del segundo de aparición según refresco de pantalla.
- [ ] Pincel, goma, cubo, colores, cambio de pestaña, al menos 20 deshacer y borrado reversible.
- [ ] Pausa manual y automática al ocultar pestaña; no consume tiempo ni permite estudiar el libro.
- [ ] Sustos normales y atenuados; destellos reducidos y preferencia de movimiento reducido.
- [ ] Nombre sanitizado, guardado local y permanencia después de recargar.
- [ ] Firebase configurado: crear score válido y consultar top 10.
- [ ] En Rules Playground/emulador: rechazar campo extra, nombre largo, float, puntuación 0/501, timestamp falso, actualización y borrado.
- [ ] Firebase sin configurar o desconectado: juego y récords locales operativos.
- [ ] Móvil real: dibujo táctil sin desplazar el lienzo, retrato/rotación y opciones legibles.
- [ ] GitHub Pages bajo subcarpeta, recursos sin 404, versión visible actualizada.

## Audio, recursos y atribuciones

Los retratos, escenarios y texturas se generaron para este proyecto con el generador integrado de ChatGPT. Los retratos fueron convertidos a WebP de 1024 × 1024. Los prompts exactos se conservan en `assets/PROMPTS.md`. Los rostros canvas son un respaldo si falla un archivo, no sustituyen los 22 retratos incluidos.

La música drone, latidos, pasos, respiración, papel, lápiz, crujidos, campanas, huida y grito son síntesis procedural original. No hay samples ni pistas de terceros. Un compresor limita picos, y todos los efectos pasan por su control de volumen. La interfaz usa fuentes del sistema y no necesita descargar tipografías.

Dependencias: Transformers.js (Apache-2.0), CLIP/modelo Xenova (consulta su ficha y licencia), Firebase JavaScript SDK (Apache-2.0). Conserva las licencias aplicables si redistribuyes las bibliotecas o los pesos; este proyecto los obtiene desde sus proveedores.

Referencias oficiales:
- https://huggingface.co/docs/transformers.js/guides/webgpu
- https://huggingface.co/docs/transformers.js/api/pipelines
- https://huggingface.co/Xenova/clip-vit-base-patch32
- https://firebase.google.com/docs/firestore/security/rules-fields
- https://firebase.google.com/docs/projects/api-keys
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
