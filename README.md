# El Pasillo Infinito 1.3.0

Juego estático en español para GitHub Pages: Solo, Carrera (2–8 jugadores) y Cooperativo (3). Incluye 30 monstruos y sus 60 sonidos, 12 avatares, cuatro dificultades, cuentas, amigos, perfiles, XP, récords por categoría y lienzo avanzado. Los 22 retratos y los ocho avatares originales se conservan.

## Publicar el juego

1. Descomprime este proyecto. Sube **el contenido de la carpeta**, con `index.html` en la raíz y las carpetas `assets/`, `css/` y `js/` completas. GitHub no representa carpetas vacías: todos los recursos entregados tienen archivos.
2. En GitHub: **Settings → Pages → Deploy from a branch → main → /(root)**. Abre la URL HTTPS publicada.
3. Publica juntos todos los archivos de esta versión. El menú debe indicar **v1.3.0**. Usa Ctrl+F5 después de actualizar. No renombres `FIREBASE_CONFIG`: los imports usan exactamente ese nombre.
4. Realiza la configuración de Firebase indicada abajo. El invitado puede jugar Solo con récord local; las cuentas, amistades y eliminación completa requieren las funciones incluidas.

No hay compilación del juego. Para servirlo localmente: `python3 -m http.server 8000`. Los módulos ES no funcionan abriendo `index.html` con `file://`.

## Firebase: pasos completos

Se conserva tu configuración pública en `js/config.js`. Usa **el mismo proyecto** para Authentication, Cloud Firestore, Realtime Database y Functions. Una `databaseURL` no crea Firestore ni publica sus reglas: el leaderboard usa **Cloud Firestore**.

1. **Authentication → Sign-in method:** activa **Email/Password**. En **Authentication → Settings → Password policy**, fija longitud mínima **8** y modo **Require**; así el proveedor también exige el mínimo del juego. Esta versión no utiliza sesiones anónimas. Puedes desactivar el proveedor anónimo después de sustituir los archivos antiguos.
2. **Authentication → Settings → Authorized domains:** añade **`usuario.github.io`**, sustituyendo `usuario` por tu usuario de GitHub. Es el dominio, sin `https://`, `/repositorio` ni barras. Añade también tu dominio propio si lo usas; para pruebas locales añade `localhost` cuando sea necesario.
3. **Authentication → Templates:** configura en español el remitente, asunto y texto de recuperación de contraseña; revisa también verificación y cambio de dirección. Conserva los marcadores de Firebase y su manejador de acciones predeterminado si no implementas otro. El SDK establece `languageCode = 'es'`. Prueba la recepción real, incluida la carpeta de spam.
4. Crea **Cloud Firestore**, si aún no existe. La pantalla Database de Realtime Database es otro producto.
5. Comprueba que la URL de **Realtime Database** coincide con `FIREBASE_CONFIG.databaseURL`.
6. Instala Node.js 22, Java para los emuladores y las dependencias. Desde esta carpeta:

```sh
npm install
npm install --prefix functions
npm run generate:rules
npx firebase login
npx firebase deploy --project el-pasillo-infinito --only firestore:rules,firestore:indexes,database,functions
```

El comando publica `firestore.rules`, `firestore.indexes.json`, `database.rules.json` y las ocho funciones de `functions/`. No modifica GitHub Pages. Cambia el identificador del proyecto si usas otro. La región configurada es `us-central1`; `FUNCTIONS_REGION` debe coincidir al regenerar y desplegar.

**Functions necesita el plan Blaze para desplegarse.** Los emuladores funcionan localmente. Consulta la [documentación oficial de despliegue](https://firebase.google.com/docs/functions/get-started) antes de activar facturación. Esta versión utiliza Functions para las reservas, la sincronización segura de amistades, récords de equipo y eliminación completa: no basta con subir el HTML.

Referencias oficiales: [Email/Password](https://firebase.google.com/docs/auth/web/password-auth), [gestión y recuperación de cuentas](https://firebase.google.com/docs/auth/web/manage-users), [dominios de acciones de correo](https://firebase.google.com/docs/auth/web/passing-state-in-email-actions), [funciones callable](https://firebase.google.com/docs/functions/callable).

## Si no aparecen récords

- Entra con una cuenta. El invitado solo ve récords locales.
- Selecciona el modo y la dificultad correctos. Una partida con semilla personalizada no publica récord ni XP.
- Crea Firestore y despliega las reglas **de este proyecto**, no las de Realtime Database en Firestore.
- Publica un resultado de al menos un pasillo o un punto. El guardado es automático; no se pide otro nombre.
- Espera a que los índices terminen de crearse. El mensaje «Falta un índice de Firestore» identifica ese caso. Pulsa REINTENTAR después de corregirlo.
- «Revisa las reglas de Firestore» indica permisos. «Sin conexión» indica conexión; no se presenta como una lista vacía.

Las colecciones antiguas `scores`, `scores_carrera` y `scores_coop` quedan sin acceso desde este cliente y las reglas. **No se migran automáticamente:** tenían nombres libres y no permiten atribuir con seguridad un resultado a un UID. Los archivos antiguos no se borran del proyecto real por este trabajo.

## Cuentas e identidad

Email/Password modular 10.14.1 por gstatic, con `browserLocalPersistence`. El correo se guarda exclusivamente en Authentication: ningún documento público ni pantalla del juego lo muestra. El nombre tiene 3–14 letras (incluidos acentos españoles), números o `_`, unicidad por minúsculas y filtro configurable `USERNAMES`. Nombre, código personal y fecha de creación son inmutables. El avatar admite 1–12.

`provisionAccount` reserva `users/{uid}`, `usernames/{nombreLower}` y `friendcodes/{codigo}` en una transacción Firestore. Si falla, no queda un nombre reservado a medias. **Auth y Firestore no admiten una transacción común:** el cliente compensa un fallo confirmado eliminando el usuario de Auth recién creado. Si se pierde una respuesta, comprueba si el perfil se creó; una cuenta Auth pendiente ofrece COMPLETAR CUENTA al iniciar sesión. Así una interrupción no borra una cuenta correctamente creada.

Cambiar contraseña y eliminar cuenta requieren la contraseña actual. La eliminación usa un marcador privado, se puede reanudar y borra perfil/subcolecciones, nombre, código, récords individuales y de sus equipos, amistades de ambos extremos, presencia, invitaciones y salas donde participa; termina eliminando Authentication. Una tarea horaria retoma operaciones interrumpidas. No se cambian nombres desde el perfil.

## Datos y reglas

| Ruta | Contenido / acceso |
|---|---|
| `users/{uid}` | nombre, nombreLower, avatar, xp, nivel, codigoAmigo, creadoEn, estadisticas, preferencias y ultimaPartida; lectura para cuentas |
| `usernames/{nombreLower}` | `{uid}`, único e inmutable |
| `friendcodes/{codigo}` | `{uid}`, seis caracteres, único |
| `users/{uid}/partidas/{id}` | recibo inmutable de XP; propia cuenta |
| `users/{uid}/amigos/{otroUid}` | pendienteEnviada, pendienteRecibida o amigos; propia lectura, servidor escribe ambos extremos |
| `records_solo_{dificultad}/{uid}` | un récord por cuenta y dificultad |
| `records_carrera_{dificultad}/{uid}` | un récord por cuenta y dificultad |
| `records_coop_{dificultad}/{hash}` | un récord por equipo: SHA-256 de UIDs ordenados unidos por `|` |
| RTDB `cuentas/{uid}` | identidad mínima reflejada por Admin; los clientes no escriben |
| RTDB `amigos/{uid}/{otroUid}` | `true` solo para amistad confirmada mutua; los clientes no escriben |
| RTDB `presencia/{uid}` | estado/sala/tiempo; propia escritura y lectura de amigos, `onDisconnect` |
| RTDB `invitaciones/{destino}/{id}` | emisor, nombre, sala, modo, dificultad, creación y caducidad de dos minutos |
| RTDB `rooms/{codigo}` | sala, jugadores, claims, chat, entregas, resultados y roles |

El registro individual tiene exactamente `uid,nombre,avatar,nivel,puntuacion,fecha,dificultad`. El registro cooperativo añade **`miembros`**, necesario para el filtro Amigos y eliminar récords de una cuenta que perteneció al equipo. Su dueño canónico es el menor UID; la callable comprueba la sala terminada y escribe un hash único, sin confiar en un ID enviado por el cliente. Cada miembro puede solicitar el mismo guardado; no produce duplicados. Los nombres se recuperan de `users`, nunca de un formulario de resultados.

`REEMPLAZAR_SOLO_SI_MEJOR=true` conserva el mayor. Si lo cambias a `false`, ejecuta `npm run generate:rules` y despliega de nuevo: cliente, reglas y Functions deben compartir el valor. La lista muestra top 50, niveles, avatares, nombres, puntuación y puesto propio incluso fuera del top; los empates comparten puesto. El puesto global se obtiene con `getCountFromServer`. Para Amigos se filtran UIDs confirmados y se eliminan equipos duplicados.

Reglas completas: `firestore.rules`, `database.rules.json`. Versión comentada de RTDB: `database.rules.commented.jsonc`, con las mismas reglas. Explicación por rama: `REGLAS.md`. Índices compuestos desplegables: `firestore.indexes.json`; las cuatro consultas cooperativas combinan `miembros CONTAINS` y `puntuacion DESCENDING`. Los demás índices incluidos fijan el orden de puntuación/ID. Las consultas simples de puntuación y conteo utilizan los índices de campo de Firestore. [Consultas de conteo oficiales](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).

## XP, estadísticas y logros

Solo: 10 × multiplicador por pasillo más 0–5 por precisión ganadora. Carrera: `floor(puntos/50)` más 50/30/15 por los tres primeros puestos. Cooperativo: 5 × multiplicador por pasillo. Se acumula al finalizar la partida en una transacción con recibo único, límite 600 XP, para evitar cobro duplicado al reconectar o reintentar.

`xpParaSubir(n)=round(80*n^1.35)`, máximo nivel 99. Se suman costes de niveles consecutivos; las reglas validan el nivel exacto para esa XP y prohíben bajar nivel/XP. La subida muestra una pantalla breve. Los mejores por modo/dificultad, partidas, pasillos, precisión (fallos cuentan 0), tiempo, racha, victorias, cooperativas, 30 entradas de bestiario y 12 logros se derivan del resumen de partida. Los no vistos se representan como siluetas. «A tiempo» requiere un acierto con como máximo tres segundos restantes.

**La XP, estadísticas y resultados calculados en el cliente pueden falsificarse.** El límite y los recibos no demuestran que alguien jugó. Como opción avanzada, una Cloud Function debe calcular el resumen desde eventos de partida validados por el servidor y confirmar dibujos/tiempos; después debe bloquearse la actualización directa de XP. `functions/VALIDACION-AVANZADA.md` explica el contrato y los puntos de integración. Las Functions incluidas administran identidad/social/borrado; no se presentan como verificación autoritativa de la IA.

## Amigos y salas

Añadir por `@nombre` (sin distinguir mayúsculas) o por `?amigo=CODIGO`. El código recibido sin sesión permanece hasta el acceso. Máximo 100 amigos, 50 solicitudes pendientes en total y 10 envíos por hora. Se puede rechazar, cancelar, eliminar y desactivar nuevas solicitudes. Las funciones escriben los dos extremos en una transacción; los triggers reparan el espejo RTDB con reintentos.

En el lobby, «Invitar amigos» muestra los conectados y envía una notificación con ACEPTAR/RECHAZAR. RTDB comprueba amistad mutua, emisor, sala y caducidad. `?sala=CODIGO` comparte una sala. Los listeners se limpian al salir y al cerrar sesión. F5 recupera la cuenta y la sala guardada en la pestaña.

Carrera sincroniza tiempos y resultados, con 10 rondas. Cooperativo mantiene Vigía/Bibliotecario/Dibujante y rotación por acierto; una desconexión pausa hasta 15 segundos. La bolsa de monstruos es común por semilla: en cooperativo los otros roles no ven el flash, pero una semilla visible permite deducir la secuencia desde código; no se afirma secreto criptográfico en este diseño solicitado.

## Dificultades y bolsa

| Valor | Fácil | Normal | Difícil | Pesadilla |
|---|---:|---:|---:|---:|
| Fase inicial / reducción / mínimo (s) | 75 / 0 / 75 | 60 / 2 / 25 | 50 / 2.5 / 20 | 40 / 3 / 15 |
| Flash inicial / reducción / mínimo (s) | 1.5 / 0 / 1.5 | 1 / .04 / .25 | .8 / .05 / .2 | .6 / .05 / .15 |
| Cuenta atrás (s) | 3 | 3 | 3 | 2, 3 o 4 |
| IA | top 2 | top 1 | top 1 y p ≥ .25 | top 1 y p ≥ .40 |
| Vidas online | 5 | 3 | 2 | 1 |
| Multiplicador XP | .5 | 1 | 1.5 | 2 |

Un fallo mata en Solo en todas las dificultades. Fácil no se acelera. Los otros tiempos usan `max(mínimo,inicial−reducción*(n−1))`; `n` es pasillos superados+1 en Solo/Coop y ronda en Carrera. Suspenso: tres segundos. Aviso de tiempo y bonus de rapidez utilizan la fase actual. El anfitrión cambia dificultad en el lobby e invalida la preparación anterior.

Antes de Solo o de crear sala aparece Preparación: dificultad/resumen numérico, destellos, sustos y semilla. Semilla vacía genera una aleatoria; una escrita crea una partida de práctica sin XP ni récord global. `pool.js` hace Fisher–Yates determinista de los 30; cada ciclo deriva `semilla+ciclo`, con corrección en la frontera para no repetir consecutivamente. Se recorre por encuentro, incluso si un intento cooperativo falla.

## Lienzo y CLIP

Pointer Events, muestras agrupadas y requestAnimationFrame. Color HSV con rueda/anillo y cuadrado, hexadecimal, cuentagotas, paleta y últimos ocho colores. Opacidad 5–100 %, tamaño/dureza, seis pinceles (duro, suave, lápiz, marcador, spray con densidad/goteos y sellos procedurales), siete formas con vista previa, contorno/relleno, Shift/proporción fija, goma con tamaño propio, cubo/tolerancia, simetría y 36 pasos de deshacer/rehacer.

Cada trazo se dibuja en una capa temporal y se compone una sola vez con su opacidad. El fondo es blanco opaco. El recorte ignora el 1 % extremo en cada eje y añade margen; exporta PNG con color y blanco para CLIP. El temporizador permanece visible y las secciones son plegables en móvil.

Atajos con el lienzo activo: B pincel, E goma, G cubo, I cuentagotas; 1–6 pinceles; L línea, R rectángulo, C elipse, T triángulo, S estrella, H corazón, A flecha; Ctrl/Cmd+Z deshacer, Ctrl+Shift+Z o Ctrl+Y rehacer. P/Escape pausa Solo. Con el libro activo, flechas cambian página y L abre lienzo. Los iconos tienen nombres accesibles y tooltip.

CLIP `Xenova/clip-vit-base-patch32`, Transformers.js 3.8.1, local tras descargar el modelo; WebGPU/WASM según disponibilidad. Las 56 candidatas se derivan solo de `monsters.json`. Precisión de Carrera usa la probabilidad **de la debilidad ganadora**, normalizada por `PRECISION_REF=.6`, sin sumar debilidades. Fácil es la única dificultad que admite top 2. `?debug=1` muestra top 5 y el grupo configurable de luz/llama; no acepta confusables como acierto automático.

## Arte, audio, tipografía y fondos

`AVATARES.md` lista los 12, incluidas las variantes WebP/PNG 1024/256/64 de los cuatro nuevos. Prompts exactos en `assets/PROMPTS-AMPLIACION4.md`, generados con la herramienta integrada de imágenes. `LORE.md`, `AUDIO.md` y `AMPLIACION3.md` conservan catálogo y recursos de los 30 monstruos. Los WAV de aparición/screamer se precargan, con respaldo sintetizado si falla un archivo.

Una sola capa de fondo persistente, tres imágenes precargadas/cache de sesión y degradados de respaldo. Se conserva tras menú/partida/libro/lienzo/revelado/podio/muerte, cambio de pestaña, resize y F5.

Máximo tres fuentes locales WOFF2: **Pirata One** (gótico legible para títulos), **IM Fell English** (imprenta antigua para el lore), **Cutive Mono** (interfaz y números). `@font-face`, `font-display:swap`, API de carga, pilas serif/monospace y mínimo 16 px. Licencias **SIL Open Font License 1.1** completas en `assets/fonts/OFL-*.txt`.

## App Check

Recomendado para reducir solicitudes automatizadas: registra la web en Firebase App Check, configura reCAPTCHA para tu dominio y activa el cliente con tu clave pública en `APP_CHECK.siteKey` de `js/config.js`. Comprueba las métricas antes de exigirlo. Para las callables, `ENFORCE_APP_CHECK=true` en las variables de despliegue activa su validación; activa también la exigencia en Firestore y Realtime Database desde la consola. App Check no sustituye reglas ni validación de partidas. [Guía oficial](https://firebase.google.com/docs/app-check/web/recaptcha-provider).

## Pruebas

```sh
npm test
npm run test:rules
npm run test:expansion
```

`npm test`: catálogo/lore/sonidos/imágenes, dificultades, puntuación, XP, nombres y 64 semillas × 300 encuentros. `test:rules`: creación atómica, invariantes, identidad, límites, espejo social, invitaciones y borrado con emuladores. `test:expansion`: navegador y SDK reales contra emuladores, doble de IA explícito. Instala el navegador de Playwright con `npx playwright install chromium` si falta. Ver `PRUEBAS.md` para cobertura y verificaciones manuales pendientes. Ninguna prueba escribe en tu Firebase real.
