# Entrega 1.3.1 — Ampliación 4

El proyecto completo conserva los 30 monstruos, lore, sonidos, fondos persistentes y fuentes locales de la versión anterior. Añade las cuentas, perfiles, amigos, dificultades, bolsa y lienzo de esta ampliación. No requiere compilar el cliente.

## Código integrado

| Área | Archivos |
|---|---|
| Cuentas y SDK compartido | `js/auth.js`, `js/accounts.js`, `js/sdk.js` |
| Perfil, estadísticas, bestiario y 12 logros | `js/profile.js`, `js/xp.js` |
| Solicitudes, presencia, enlaces e invitaciones | `js/friends.js` |
| Récord único, top 50 y puesto propio | `js/records.js`, `js/firebase.js`, `js/ui.js` |
| Cuatro dificultades y bolsa común | `js/config.js`, `js/difficulty.js`, `js/pool.js`, `js/race.js`, `js/scoring.js` |
| Preparación, Solo, lobby y online | `js/game.js`, `js/lobby.js`, `js/net.js`, `js/online-game.js` |
| Lienzo | `js/draw.js`, `js/draw/wheel.js`, `js/draw/shapes.js`, `js/draw/brushes.js`, `js/draw/tools.js` |
| Interfaz en español | `index.html`, `css/accounts.css`, `css/draw.css` |
| Identidad sin servidor propio | `js/accounts.js`, `tools/account_rules.mjs` |
| Reglas e índices de Spark | `database.rules.json`, `database.rules.commented.jsonc` |

Los imports y recursos del cliente usan `v=1.3.1`. Subir juntos los archivos evita mezclar módulos de versiones distintas.

## Cuatro avatares nuevos

Todos están en `assets/avatars/`. Se entregan 24 archivos: WebP y PNG en cada tamaño. Los ocho avatares originales se conservan por SHA-256.

| Avatar | 256 px | 64 px | Original 1024 px |
|---|---|---|---|
| El Leñador | `09-el-lenador.webp`, `09-el-lenador.png` | `09-el-lenador-64.webp`, `09-el-lenador-64.png` | `09-el-lenador-1024.webp`, `09-el-lenador-1024.png` |
| El Emo | `10-el-emo.webp`, `10-el-emo.png` | `10-el-emo-64.webp`, `10-el-emo-64.png` | `10-el-emo-1024.webp`, `10-el-emo-1024.png` |
| El Esqueleto Deprimido | `11-el-esqueleto-deprimido.webp`, `11-el-esqueleto-deprimido.png` | `11-el-esqueleto-deprimido-64.webp`, `11-el-esqueleto-deprimido-64.png` | `11-el-esqueleto-deprimido-1024.webp`, `11-el-esqueleto-deprimido-1024.png` |
| El Robot Demacrado | `12-el-robot-demacrado.webp`, `12-el-robot-demacrado.png` | `12-el-robot-demacrado-64.webp`, `12-el-robot-demacrado-64.png` | `12-el-robot-demacrado-1024.webp`, `12-el-robot-demacrado-1024.png` |

Los prompts y las referencias de estilo se documentan en `assets/PROMPTS-AMPLIACION4.md`; nombres, rutas y colores están en `avatars.json` y `AVATARES.md`.

## Activación y pruebas

`README.md` explica la publicación de reglas de Realtime Database, Email/Contraseña, plantillas de correo y dominio autorizado de GitHub Pages. `REGLAS.md` describe cada rama de seguridad. `PRUEBAS.md` distingue las comprobaciones automáticas de las que requieren Firebase publicado, correo real, dispositivos o inferencia CLIP real.

La ejecución de interfaz usa el SDK real contra emuladores de Auth/RTDB; solo sustituye CLIP por etiquetas controladas. Su informe está en `PRUEBAS-RESULTADOS.json`. `CAMBIOS-SPARK.md` y `MIGRACION-SPARK.md` describen la adaptación y la copia opcional de datos anteriores.
