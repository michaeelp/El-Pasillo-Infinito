# El Pasillo Infinito 1.4.0 · Spark

Juego estático en español, con 38 monstruos, 12 avatares, cuatro dificultades y modos Solo, Carrera y Cooperativo. Esta versión usa **Firebase Authentication (Email/Contraseña) y Realtime Database**. No despliega Cloud Functions, no necesita Firestore y mantiene la arquitectura del plan Spark; consulta sus cuotas antes de publicar. [Planes oficiales de Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

## Sustituir la versión anterior

1. Extrae el ZIP y copia **el contenido de `el-pasillo-infinito/`** a la raíz de tu repositorio.
2. Elimina las carpetas antiguas `functions/` y `cleanup/` si quedaron de la entrega anterior. El ZIP nuevo ya no las incluye.
3. Conserva las carpetas `assets/`, `css/` y `js/` con su estructura. En GitHub puedes usar GitHub Desktop para añadirlas completas.
4. Publica las reglas de Realtime Database indicadas abajo y sube los archivos a GitHub Pages.
5. Recarga con Ctrl+F5. `VERSION`, HTML, CSS e imports usan `1.4.0`; no mezcles recursos viejos con nuevos.

La configuración pública que proporcionaste se conserva en `js/config.js`, como `export const FIREBASE_CONFIG`. El import y el export deben tener exactamente ese nombre. Un error que siga mencionando `v=1.0.0` indica que el navegador o GitHub Pages está entregando archivos anteriores. La URL debe apuntar a la carpeta que contiene `index.html`. `.nojekyll` también está incluido.

## Firebase: configuración gratuita

Usa el mismo proyecto de Authentication y Realtime Database que aparece en `FIREBASE_CONFIG`.

1. En **Authentication → Sign-in method**, activa **Correo electrónico/Contraseña**.
2. En **Authentication → Settings → Password policy**, usa Require y mínimo ocho caracteres, para que coincida con el juego.
3. En **Authentication → Settings → Authorized domains**, añade `TU_USUARIO.github.io`, sin protocolo ni ruta. Para desarrollo local añade `localhost` si falta.
4. En **Realtime Database**, crea o usa la base predeterminada. Verifica que su URL coincida con `databaseURL` de `js/config.js`.
5. Abre **Realtime Database → Reglas**, pega **todo `database.rules.json`** y pulsa **Publicar**. No uses las reglas de Firestore en esta pantalla.
6. En **Authentication → Plantillas**, revisa restablecimiento y verificación de correo: remitente «El Pasillo Infinito», idioma español y dominio de acciones predeterminado de Firebase. La sesión utiliza `languageCode='es'`. Se conserva el cuerpo predeterminado de verificación; el juego no obliga a verificar para jugar.

**No necesitas activar facturación ni desplegar Functions.** Las reglas y sus índices están en un solo archivo de RTDB. Si prefieres la CLI, desde la carpeta del proyecto:

```sh
npx firebase-tools@14.22.0 login
npx firebase-tools@14.22.0 deploy --project el-pasillo-infinito --only database
```

En PowerShell puedes usar `npx.cmd` en ambos comandos para evitar el bloqueo de `npx.ps1`; no hace falta cambiar la política de ejecución. El comando solo publica las reglas de RTDB; GitHub Pages se actualiza desde tu repositorio.

Referencias: [Email/Password](https://firebase.google.com/docs/auth/web/password-auth), [cuentas y recuperación](https://firebase.google.com/docs/auth/web/manage-users), [actualizaciones atómicas de RTDB](https://firebase.google.com/docs/database/web/read-and-write#update_specific_fields), [reglas](https://firebase.google.com/docs/database/security/rules-conditions).


## Activar la tienda (una vez)

Publica primero **database.rules.json** completo. El catálogo se guarda en **Realtime Database**, ruta `catalogo`, y es de solo lectura para clientes. La web no lo crea por sí misma.

En tu PC, instala Node.js, abre una terminal en la carpeta del proyecto y ejecuta `npm install`. En Firebase → Configuración del proyecto → Cuentas de servicio, genera una clave privada y guárdala **fuera del proyecto**, por ejemplo `C:\FirebasePrivado\clave.json`. No la subas a GitHub ni la añadas a la web. En PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\FirebasePrivado\clave.json'
npm.cmd run catalogo
npm.cmd run catalogo -- --apply
```

El primer comando del catálogo muestra una vista previa sin escribir. `--apply` carga los 28 objetos con firebase-admin usando tu cuenta de servicio. Es una herramienta local que ejecutas una vez; no despliega Functions, no aloja un servidor y no modifica perfiles ni saldos. Si editas precios/requisitos, regenera reglas y vuelve a cargar el catálogo y la web juntos. Conserva los IDs de los objetos ya poseídos. Nunca uses la clave privada como `FIREBASE_CONFIG`; ese archivo contiene solo la configuración pública de la aplicación.

## Configuración, tienda y laboratorio

CONFIGURACIÓN está en el menú y en pausa: Audio, Calidad, Juego, Accesibilidad, Cuenta y Datos; RESTABLECER por categoría. Ajustes guardados localmente y en la cuenta para sincronizar dispositivos. **Cerrar sesión, cambiar contraseña y eliminar cuenta están únicamente en Cuenta**. Borrar exige escribir el nombre exacto y reautenticarse. Privacidad: solicitudes, estado, perfil para todos/amigos e invitaciones. Invitado muestra solo acceso/registro.

Libro: índice de 38 retratos dentro de ambas páginas, 4–8 columnas, flechas/Enter/Esc y descartados con clic derecho o pulsación larga que se limpian cada pasillo. Las páginas conservan solo retrato, nombre, lore y número.

TIENDA: 8 marcos, 12 títulos y 8 fondos; compra/equipa/desequipa y desbloqueos por nivel o logro. Almas: Solo `floor(3 × multiplicador × pasillos)`, Cooperativo `floor(2 × multiplicador × pasillos)`, Carrera `floor(puntos/100)+30/20/10` por puesto. Logro nuevo +20 y nivel nuevo +50, hasta 1000 por partida. Invitado, práctica con semilla y laboratorio no dan almas. Detalles en ECONOMIA.md.

LABORATORIO también para invitados: mismo lienzo/preprocesado/CLIP, manual o auto 1 s, top 5 español con barras y miniaturas, objetivo/dificultad ✓/✗. `?debug=1` añade todas las candidatas, tiempo y JSON. No tiene temporizador, vidas ni progreso.

25 originales nuevos y variantes WebP/PNG: ocho monstruos, moneda, ocho marcos y ocho fondos. Lista en ASSETS.md; prompts en assets/PROMPTS-AMPLIACION5.md; 38 lores en LORE.md; 76 efectos y ambience.wav en AUDIO.md. Informe de implementación en AMPLIACION5.md.

## Si ya hay datos en Firestore

Las cuentas de **Authentication conservan su correo y contraseña**. Los datos nuevos del juego se guardan en RTDB. Antes de publicar la versión nueva, puedes copiar perfiles, XP, estadísticas, recibos, amigos, solicitudes y las doce categorías de récords con la herramienta local `tools/migrate-spark.mjs`; instrucciones en **MIGRACION-SPARK.md**. No es una función alojada y no requiere Blaze.

Sin migración, las cuentas existentes pueden iniciar sesión y completar un perfil nuevo, con XP y récords nuevos. Por eso conviene migrar primero si ya tienes progreso guardado. La herramienta conserva el origen como respaldo, verifica conflictos y por defecto solo muestra una vista previa. No ejecutes ambas versiones simultáneamente durante el cambio.

`firestore.rules` es un cierre opcional de la base anterior: después de migrar puedes pegarlo en la consola de Firestore para impedir que la web antigua siga leyendo o escribiendo allí. No se crea una base Firestore nueva ni se despliega ese archivo desde `firebase.json`.

## Si no aparece el ranking

- Usa una cuenta; el invitado conserva únicamente récords locales.
- Publica el archivo nuevo completo en **Realtime Database → Reglas**.
- Comprueba proyecto y `databaseURL`, y recarga los recursos de la versión 1.4.0.
- «Revisa las reglas de Realtime Database» identifica permisos; «Sin conexión» identifica conexión. Un error no se muestra como una lista vacía.
- Solo registra un resultado por UID, modo y dificultad. Cooperativo registra un resultado por equipo. Los empates comparten puesto; se muestran top 50 y tu posición aunque quede fuera.
- Una semilla escrita es práctica: no concede XP, almas ni récord global. Un resultado de cero no crea un récord.

## Cuentas, progreso y seguridad

La advertencia lleva a Iniciar sesión / Crear cuenta / Invitado. El nombre permanente admite 3–14 letras, números y `_`, con filtro configurable de palabras reservadas/ofensivas. Una actualización atómica reserva **perfil + nombre en minúsculas + código de amigo + contadores sociales**; las reglas rechazan un conflicto completo, sin dejar reservas parciales. El correo solo está en Authentication.

Auth y RTDB son servicios separados: no existe una transacción común. Un fallo confirmado del alta elimina el usuario Auth recién creado; una respuesta perdida comprueba el perfil antes de compensar. Si solo se creó Auth, el siguiente acceso ofrece completar el perfil. Se usa `browserLocalPersistence` para F5, cierre y retorno al navegador.

El perfil conserva avatar, XP, nivel, estadísticas, mejores por modo/dificultad, 38 entradas de bestiario y 13 logros. XP: Solo 10×multiplicador por pasillo + 0–5 por precisión; Carrera `floor(puntos/50)` + 50/30/15 por puesto; Cooperativo 5×multiplicador por pasillo. Curva `round(80*n^1.35)`, máximo nivel 99 y 600 XP por partida. Progreso y recibo inmutable se escriben juntos; escrituras concurrentes releen el estado y no duplican una recompensa.

Las puntuaciones, estadísticas y dibujos se calculan en el navegador: las reglas acotan quién escribe y cuánto, pero no certifican que alguien jugó o que CLIP acertó. El ranking sigue siendo apropiado para este juego entre amigos, sin arbitraje de partidas en un servidor.

Eliminar cuenta reautentica y limpia datos antes de eliminar Auth. Un marcador propio bloquea nuevas escrituras de juego y conserva información para reintentar; un registro local cubre un fallo después de liberar las reservas y antes de completar Auth. Si se interrumpe, vuelve a iniciar sesión desde el mismo navegador o reintenta el botón. Queda únicamente una marca privada del UID eliminado, sin nombre ni correo, para impedir recrear su perfil con un token antiguo que todavía no haya caducado. No hay tarea de servidor ejecutándose cuando el navegador está cerrado.

## Datos de Realtime Database

| Ruta | Contenido y acceso |
|---|---|
| `users/{uid}` | perfil visible según privacidad; identidad básica accesible a cuentas; solo propietario modifica; sin correo |
| `users/{uid}/ajustes` | configuración completa y validada por esquema |
| `users/{uid}/monedas`, `inventario`, `equipado` | saldo, propiedad y selección de cosméticos |
| `catalogo/{id}` | catálogo público de solo lectura para clientes |
| `movimientos/{uid}/{operacion}` | registro privado e inmutable ligado a compra o partida |
| `usernames/{nombreLower}`, `friendcodes/{codigo}` | reservas inmutables ligadas al perfil |
| `partidas/{uid}/{id}` | recibo privado e inmutable de XP y almas |
| `social/{uid}/pendientes/{otroUid}` | solicitud con emisor; solo el destinatario acepta |
| `social/{uid}/confirmados/{otroUid}` | amistad mutua; creación y retirada en ambos extremos |
| `socialCounts/{uid}`, `socialLimits/{uid}` | límites 100/50 y diez envíos por hora móvil |
| `presencia/{uid}` | propia escritura, lectura entre amigos, `onDisconnect` |
| `invitaciones/{uid}/{id}`, `enviadas/{uid}/{id}` | lobby, amigos mutuos, dos minutos; índice para limpiar |
| `records_solo_{d}/{uid}`, `records_carrera_{d}/{uid}` | siete campos, identidad propia y mejor puntuación |
| `records_coop_{d}/{equipo}` | tres miembros, sala finalizada, partida y semilla comprobadas |
| `equipos/{uid}/{d}/{equipo}` | índice validado junto al récord cooperativo |
| `rooms/{codigo}`, `salasJugador/{uid}/{codigo}` | salas y pertenencia para limpiar al eliminar cuenta |
| `caducidad/{codigo}` | solo código/tiempo; limpieza limitada de salas caducadas al conectarse |
| `deletedAccounts/{uid}` | marca sin nombre/correo, impide recrear la cuenta con un token antiguo |
| `accountCleanup/{uid}` | marcador privado de eliminación |

`d`: facil / normal / dificil / pesadilla. Las claves cooperativas son **los tres UID ordenados, separados por `|`**: a diferencia del hash anterior, RTDB puede comprobar esta clave en sus reglas y rechazar equipos duplicados. Los récords de equipo añaden `miembros`, `sala` y `partida` a los siete campos individuales. La migración convierte las claves anteriores.

Los índices `puntuacion` de las doce categorías están en `.indexOn`. Para el puesto propio, RTDB consulta los resultados estrictamente superiores y los cuenta en el cliente; su consumo crece con la cantidad de resultados superiores. El filtro Amigos consulta las claves individuales y de equipos y elimina duplicados antes de ordenar.

## Amigos y online

Añade por `@nombre`, sin distinguir mayúsculas, o por `?amigo=CODIGO`. El enlace recibido sin sesión se conserva hasta acceder. Solicitudes: aceptar, rechazar, cancelar, eliminar y desactivar recepción. Las reglas obligan a actualizar ambos extremos y sus contadores. Diez ranuras de tiempo de servidor limitan a diez envíos en cualquier hora móvil, incluso si se cancelan.

El lobby ofrece invitar amigos conectados, con ACEPTAR/RECHAZAR. Las reglas comprueban amistad mutua, identidad, pertenencia al lobby, dificultad y caducidad. `?sala=CODIGO` comparte la sala. Los listeners y `onDisconnect` se limpian al salir. F5 recupera la cuenta y la sala guardada en la pestaña.

Carrera usa diez rondas sincronizadas. Cooperativo rota Vigía → Bibliotecario → Dibujante por acierto y pausa hasta 15 segundos por desconexión. Los tiempos y la bolsa se comparten por semilla. Una semilla visible permite deducir la secuencia desde código; no se ofrece secreto criptográfico.

Sin tarea programada, la limpieza ocurre en el navegador: se descarta la invitación caducada al escuchar la bandeja; al conectarse se revisan hasta ocho entradas del índice de salas y las reglas solo permiten borrar las realmente caducadas. Los datos caducados pueden permanecer mientras nadie usa el juego.

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

Antes de Solo o de crear sala aparece Preparación: dificultad/resumen numérico, destellos, sustos y semilla. Semilla vacía genera una aleatoria; una escrita crea una partida de práctica sin XP, almas ni récord global. `pool.js` hace Fisher–Yates determinista de los monstruos del JSON; cada ciclo deriva `semilla+ciclo`, con corrección en la frontera para no repetir consecutivamente. Se recorre por encuentro, incluso si un intento cooperativo falla.

## Lienzo y CLIP

Pointer Events, muestras agrupadas y requestAnimationFrame. Color HSV con rueda/anillo y cuadrado, hexadecimal, cuentagotas, paleta y últimos ocho colores. Opacidad 5–100 %, tamaño/dureza, seis pinceles (duro, suave, lápiz, marcador, spray con densidad/goteos y sellos procedurales), siete formas con vista previa, contorno/relleno, Shift/proporción fija, goma con tamaño propio, cubo/tolerancia, simetría y 36 pasos de deshacer/rehacer.

Cada trazo se dibuja en una capa temporal y se compone una sola vez con su opacidad. El fondo es blanco opaco. El recorte ignora el 1 % extremo en cada eje y añade margen; exporta PNG con color y blanco para CLIP. El temporizador permanece visible y las secciones son plegables en móvil.

Atajos configurables: B libro, L lienzo, P pausa, V pincel, E goma, F relleno, I cuentagotas; 1–6 pinceles; Ctrl/Cmd+Z deshacer, Ctrl+Shift+Z o Ctrl+Y rehacer. Escape pausa Solo o vuelve al índice desde una ficha. Flechas/Enter navegan el índice y abren ficha. Los iconos tienen nombres accesibles.

CLIP `Xenova/clip-vit-base-patch32`, Transformers.js 3.8.1, local tras descargar el modelo; WebGPU/WASM según disponibilidad. Las 70 candidatas se derivan solo de `monsters.json`. Precisión de Carrera usa la probabilidad **de la debilidad ganadora**, normalizada por `PRECISION_REF=.6`, sin sumar debilidades. Fácil es la única dificultad que admite top 2. `?debug=1` muestra top 5 y el grupos configurables de luz/llama, gafas y recipientes; no acepta confusables como acierto automático.

## Arte, audio, tipografía y fondos

`AVATARES.md` lista los 12, incluidas las variantes WebP/PNG 1024/256/64 de los cuatro nuevos. Prompts exactos en `assets/PROMPTS-AMPLIACION4.md`, generados con la herramienta integrada de imágenes. `LORE.md`, `AUDIO.md`, `ASSETS.md` y `AMPLIACION5.md` documentan el catálogo vigente de 38 monstruos. Las ampliaciones 3/4 se conservan como antecedentes. Los WAV de aparición/screamer se precargan, con respaldo sintetizado si falla un archivo.

Una sola capa de fondo persistente, tres imágenes precargadas/cache de sesión y degradados de respaldo. Se conserva tras menú/partida/libro/lienzo/revelado/podio/muerte, cambio de pestaña, resize y F5.

Máximo tres fuentes locales WOFF2: **Pirata One** (gótico legible para títulos), **IM Fell English** (imprenta antigua para el lore), **Cutive Mono** (interfaz y números). `@font-face`, `font-display:swap`, API de carga, pilas serif/monospace y mínimo 16 px. Licencias **SIL Open Font License 1.1** completas en `assets/fonts/OFL-*.txt`.

## App Check

Puedes registrar tu web en App Check y configurar reCAPTCHA en `APP_CHECK.siteKey`. Comprueba las métricas antes de exigirlo en Realtime Database. App Check complementa las reglas. [Guía oficial](https://firebase.google.com/docs/app-check/web/recaptcha-provider).

## Pruebas

```sh
npm install
npx playwright install chromium
npm test
npm run test:rules
npm run test:expansion
npm run test:spark
npm run test:ampliacion5
# Solo para verificar la migración desde la base antigua:
npm run test:migration
```

Las pruebas usan solo proyectos `demo-pasillo` y emuladores locales de Auth/RTDB, sin tu Firebase real. El navegador usa el SDK real; únicamente CLIP devuelve etiquetas controladas. Los resultados y límites de validación están en `PRUEBAS.md` y `PRUEBAS-RESULTADOS.json`. Los 38 retratos, sonidos, avatares originales y fuentes se verifican también por catálogo, formato y hashes.
