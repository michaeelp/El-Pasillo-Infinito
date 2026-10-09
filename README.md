# El Pasillo Infinito 1.1.0

Juego estático en español: SOLO, Carrera online de 2 a 8 jugadores y Cooperativo de 3. Conserva los 22 monstruos, el libro, el lienzo y CLIP local. Esta versión incluye tu bloque público FIREBASE_CONFIG y actualiza todos los imports y recursos a ?v=1.1.0.

## Publicar

Sube el contenido de esta carpeta a GitHub, manteniendo assets/, js/ y css/. index.html debe estar en la raíz publicada. No subas solamente el ZIP ni mezcles módulos de la versión anterior. Activa GitHub Pages desde main y /(root). Comprueba que el menú muestra v1.1.0 y recarga con Ctrl+F5.

Para probar localmente: python3 -m http.server 8000 y http://localhost:8000. No abras index.html con doble clic.

## Activar online

1. En [Firebase Console](https://console.firebase.google.com/), abre tu proyecto.
2. Authentication > Sign-in method > Anonymous: activar.
3. Authentication > Settings > Authorized domains: añade el dominio de GitHub Pages.
4. Realtime Database: comprueba que está creada y que databaseURL en js/config.js corresponde a ella.
5. En Realtime Database > Rules, reemplaza las reglas completas por database.rules.json y publica.
6. Crea Cloud Firestore si todavía no existe. En Rules publica firestore.rules completo.
7. Publica todos los archivos del juego y prueba con navegadores o dispositivos diferentes. Dos pestañas del mismo navegador pueden compartir el mismo usuario anónimo.

Sin conexión o sin Firebase válido, SOLO sigue disponible. Los modos online se deshabilitan al comprobar la conexión. Las reglas anteriores de récords ya no sirven: ahora los documentos incluyen avatar.

Referencia oficial: [autenticación anónima](https://firebase.google.com/docs/auth/web/anonymous-auth), [presencia y reloj del servidor](https://firebase.google.com/docs/database/web/offline-capabilities). No dejes las bases en modo de prueba.

La apiKey de la aplicación web es pública, no una contraseña. No coloques claves de servicio ni credenciales administrativas en el proyecto. Recomendado: configurar App Check para el dominio y revisar métricas antes de exigirlo.

## Ajustes comunes

El fondo es un único nodo persistente, con capas de z-index no negativo. background.js conserva una caché de Image para hospital, mansión y sótano. Todos los cambios de pantalla pasan por screen(); el fondo se repinta al recuperar visibilidad y al redimensionar. Si un recurso falla o tarda, se usa un degradado oscuro del tono del escenario; una carga tardía sustituye el respaldo sin recrear el nodo.

En js/config.js:
- TIEMPO_FASE: 60 segundos.
- FLASH_INICIAL: 1; FLASH_REDUCCION: 0.04; FLASH_MINIMO: 0.25.
- FASE_REDUCCION: 2 segundos; FASE_MINIMA: 25.
- duracionFlash(n) y tiempoFase(n) calculan la dificultad.
- Cuenta atrás y suspenso: 3 segundos, sin progresión.
- Alerta: el menor entre TIEMPO_ALERTA y un tercio del tiempo actual.

SOLO usa pasillos superados + 1. Cooperativo usa el progreso del equipo + 1, no el número de intentos fallidos. Carrera usa la ronda, común a todos. El reloj y la rapidez usan la duración actual.

El libro solo muestra retrato, nombre, debilidades y número de página. monsters.json no contiene apariencia ni anotaciones. avatars.json solo contiene id, nombre, ruta y color.

## Tipografía y licencias

Tres fuentes locales WOFF2 con @font-face y font-display: swap:
- Pirata One: títulos y menú. Se eligió por su carácter gótico y su legibilidad, sin formas que dificulten leer botones.
- IM Fell English: páginas del libro, con aspecto de imprenta antigua.
- Cutive Mono: controles, marcadores y temporizador, con cifras monoespaciadas.

fonts.js usa document.fonts.load y document.fonts.check. El estado se puede comprobar en document.documentElement.dataset.fonts: ready o fallback. Pilas explícitas serif y monospace; texto visible mínimo de 16 px.

Las tres fuentes tienen licencia SIL OFL 1.1. Los archivos de licencia originales están en assets/fonts/OFL-*.txt. WOFF2 obtenidos de Fontsource 5.2.6; licencias del repositorio [Google Fonts](https://github.com/google/fonts). No se solicitan fuentes a servidores externos durante el juego.

Los retratos, escenarios y avatares se generaron con el generador integrado de imágenes. Prompts en assets/PROMPTS.md y assets/PROMPTS-AVATARS.md. Lista de avatares y tamaños en AVATARES.md.

## Online

Network usa SDK modular Firebase 10.14.1, autenticación anónima, .info/serverTimeOffset y onDisconnect. Solo se escuchan ramas públicas, nunca rooms/{codigo} completo, porque contiene un secreto privado. Los listeners de sala se limpian al salir. La presencia de conexión y el reloj permanecen compartidos por el módulo.

Código de sala de 4 letras sin I ni O. Asientos, avatares y roles se reservan con transacciones: la primera solicitud aceptada gana. El perfil permite cambiar nombre y avatar en el lobby; los avatares ocupados quedan bloqueados. El anfitrión puede cambiar de modo y empezar cuando todos tienen IA y han marcado LISTO. Cambiar de modo o pedir revancha invalida los estados de listo anteriores.

Si una sala de Carrera conserva asientos 4..8 después de salir otros jugadores, crea una sala nueva para Cooperativo. Se evita convertirla a un modo con reservas incompatibles.

Carrera usa semilla compartida y secuencia determinista sin repetición consecutiva. Cada jugador entrega y ve su propio análisis y susto. Los resultados comunes incluyen miniaturas, puntos y vidas. Con 0 vidas pasa a Fantasma, con susurros limitados a uno cada 20 segundos. Gana el mayor total, con desempate por precisión media.

Puntos: (100 + 400*A + 300*(1-t/T)^1.5) * min(1.5, 1 + 0.1*racha). T es el tiempo de esa ronda; t está acotado a ese intervalo. La primera victoria lleva racha 1 y multiplicador 1.1; una derrota da 0 y reinicia la racha. Ejemplos: A=1 y t=0, primera victoria: 880. A=0.5 y t=T/2, primera victoria: 447. Al quinto acierto consecutivo se alcanza el tope de 1.5. Una desconexión no suma puntos en esa ronda.

Cooperativo: Vigía ve el flash; Bibliotecario solo el libro; Dibujante solo el lienzo y ¡MOSTRAR!. Los otros dos reciben una vista de 96 px en lotes de 300 ms. El resultado consume una vida o suma un pasillo y, al acertar, rota los roles. Una desconexión pausa hasta 15 segundos; después termina conservando el progreso. F5 recupera la sala mediante la sesión anónima y sessionStorage.

### Secreto cooperativo

Una semilla pública que permita derivar monstruos contradice el secreto del cooperativo. Por eso SOLO la Carrera publica una semilla útil; en Cooperativo semilla es 0. El Vigía elige el monstruo con crypto y lo guarda en secreto/{partida_ronda}/{uidVigia}, sin repetir el anterior. Bibliotecario y Dibujante nunca reciben su id antes del resultado, aunque el anfitrión sea uno de ellos. El Dibujante clasifica contra todas las debilidades y el Vigía evalúa el resultado.

Esto protege lecturas entre usuarios mediante reglas; no hace imposible que un Vigía o anfitrión modificado haga trampas. La autoridad de partida y la IA siguen estando en clientes. Un competitivo resistente a clientes maliciosos necesitaría arbitraje de servidor.

### Verificación opcional

ONLINE.verifyDrawings está desactivado por defecto. Al activarlo, otros clientes reclasifican las miniaturas y escriben sus comprobaciones. Discrepancias mayores que discrepancyMargin, con votos de al menos la mitad de los jugadores, descartan el acierto. Se añade una ventana de verificación configurable. No equivale a una prueba criptográfica ni elimina el riesgo de colusión.

### Límites y caducidad

Máximo 8 escrituras por segundo en el cliente; chat de 60 caracteres, una vez por segundo; 30 mensajes por usuario. Las reglas también limitan el ritmo del chat, las miniaturas a 20.000 caracteres y el lienzo a intervalos de 300 ms. Cada resultado se escribe una sola vez por usuario y ronda. Valida los límites de database.rules.json si cambias valores de configuración: las reglas no pueden importar JS.

Las salas caducan a las 3 horas desde la última renovación del anfitrión. La caducidad bloquea escritura y acceso a la partida, pero las reglas no pueden ejecutar borrados por sí mismas. Se incluye cleanup/ para el borrado físico programado en Firebase: requiere desplegar esa función, un proyecto compatible con Cloud Functions y revisar su facturación.

Opcional: dentro de cleanup/functions ejecuta npm install; desde cleanup ejecuta firebase deploy --only functions --project el-pasillo-infinito. No está desplegado automáticamente ni se ha ejecutado contra tu base real. La función borra salas caducadas cada hora y vuelve a comprobar su caducidad mediante transacción antes de borrarlas. [Funciones programadas de Firebase](https://firebase.google.com/docs/functions/schedule-functions).

## Privacidad y récords

SOLO analiza el dibujo en el navegador. Online comparte las miniaturas, etiquetas y puntuaciones con los participantes de la sala. El chat y el nombre se muestran mediante textContent. Firestore conserva los récords publicados:
- scores: SOLO.
- scores_carrera: ganador de Carrera.
- scores_coop: equipo de 3 con nombres y avatares.

Documentos inmutables, campos esperados, puntuación entera, avatar 1..8 y timestamp del servidor. Sin publicar resultados 0. Los límites no garantizan legitimidad de una puntuación calculada en cliente.

## Archivos y pruebas

js/background.js y fonts.js: fondos y fuentes. profile.js: perfiles. net.js y sdk.js: conexión. lobby.js: salas. race.js, coop.js, roles.js y online-game.js: modos y estados. scoring.js: fórmulas. css/online.css: nuevas vistas. Reglas comentadas en REGLAS.md.

Sin compilación ni dependencias npm para jugar. Para pruebas opcionales: npm install, npm test. Emuladores: npm run test:rules; requieren Java. Para pruebas de navegador: npx playwright install chromium, iniciar los emuladores locales y ejecutar node tests/ui.cjs y node tests/online-ui.cjs. Usan el SDK real contra emuladores y un doble de CLIP, sin escribir en producción.

PRUEBAS.md distingue lo verificado de las pruebas pendientes. Las pruebas anteriores del CLIP real se conservan en pruebas-clip.json; esta actualización no sustituye el modelo por una simulación.

## Audio

Se mantienen música y efectos sintetizados con Web Audio, controles de volumen, silencio y sustos atenuados. No se han añadido grabaciones externas porque todavía no se proporcionaron archivos de sonido.
