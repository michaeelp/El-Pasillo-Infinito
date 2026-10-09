# Pruebas y checklist 1.3.0

Ejecutar con Node.js y emuladores: `npm test`, `npm run test:rules`, `npm run test:expansion`. La suite de navegador monta los **handlers onCall reales por HTTP local**, junto con Auth/Firestore/RTDB emulados; el entorno de trabajo bloquea los sockets IPC internos del emulador de Functions. Esa adaptación está aislada en `tests/callables.cjs`. El único doble de comportamiento del juego es la inferencia CLIP, que devuelve etiquetas controladas: la biblioteca/modelo real permanece en el juego.

## Cobertura automática

- [x] 30 monstruos, 56 etiquetas derivadas del JSON y 1680 combinaciones de debilidades en Normal.
- [x] Reglas de IA por dificultad: top 2 únicamente en Fácil, umbrales .25/.40, todas las debilidades propias.
- [x] 64 semillas × 300 encuentros: cada bloque de 30 es completo, determinismo y frontera sin repetición; `MonsterPool` incremental coincide.
- [x] Los cuatro tiempos iniciales, reducciones y mínimos; Fácil fijo; cuentas 2/3/4 de Pesadilla sincronizadas por semilla/ronda.
- [x] Puntuación normalizada por duración actual, precisión ganadora, curva de XP hasta nivel 99 y máximo 600 por partida.
- [x] Nombres válidos, reservados/ofensivos y acentos.
- [x] 22 retratos originales y 24 archivos de los ocho avatares originales intactos por SHA-256; nuevos avatares con WebP/PNG 1024/256/64.
- [x] 30 lores con rangos, nombres/plurales/sinónimos conocidos y 60 WAV PCM16 válidos, distintos y sin saturación.
- [x] Transacción de perfil/nombre/código; reserva suelta y nombre duplicado rechazados; nombre fijo, avatar 12 válido y 13 rechazado.
- [x] XP/recibo/diferencia exacta, nivel coherente, no descenso y no cobro doble; ediciones/borrados ajenos rechazados.
- [x] Un registro propio, solo mayor, sin campos extra ni nombre ajeno; lectura pública y borrado cliente prohibido.
- [x] Solicitudes por etiqueta/código: enviar, aceptar, rechazar, cancelar y eliminar; no recibir solicitudes y diez por hora.
- [x] Espejo mutuo Admin; clientes no falsifican amistades; presencia propia y lectura restringida.
- [x] Invitaciones válidas entre amigos; nombre falso, destinatario no amigo y lectura ajena rechazados.
- [x] Eliminación de Auth, perfil, subcolecciones, reservas, registros y ambos extremos de amistad.

La suite de interfaz comprueba además cuentas y sesión persistente, invitado, preparación, tres partidas seguidas con fondos, F5/resize/evento de visibilidad/degradado de respaldo, herramientas en móvil, opacidad de trazo sin acumulación, 35 pasos de historia, exportación en color con blanco opaco, recorte de manchas aisladas, puesto propio 56 por conteo, filtro/dificultad, solicitudes por link antes del acceso, invitación y los modos online. En cooperativo mantiene un trazo durante al menos 600 ms, atravesando varios refrescos de roles, y comprueba acierto, rotación, derrota y récord único de equipo. Ver `tests/accounts-ui.cjs`; los resultados observados de la ejecución final se guardan en `PRUEBAS-RESULTADOS.json`.

## Antes de publicar en tu Firebase real

- [ ] Activar Email/Password, configurar plantillas españolas y autorizar `usuario.github.io`.
- [ ] Crear Firestore si falta; desplegar reglas, índices y Functions del mismo proyecto; esperar índices Enabled.
- [ ] Verificar v1.3.0 en GitHub Pages y que se suben todas las carpetas; Ctrl+F5.
- [ ] Crear dos cuentas en dos dispositivos; intentar mismo nombre con otras mayúsculas; comprobar que la segunda no reserva nombre.
- [ ] Iniciar/cerrar sesión, F5, cambio y recuperación de contraseña; verificar el correo real (el emulador no envía email).
- [ ] El invitado solo Solo/local, sin XP, perfiles, amigos ni global; semilla personalizada sin XP/global también para cuentas y online.
- [ ] Confirmar avatar persistente 1–12, vista ajena de solo lectura, niveles/barra, doce logros y treinta entradas/siluetas del bestiario.
- [ ] Repetir un récord menor y mayor en cada modo/dificultad: un único documento; probar `REEMPLAZAR_SOLO_SI_MEJOR=false` tras regenerar/desplegar.
- [ ] Comprobar Global/Amigos y puesto propio fuera del top 50, incluidos empates y equipos que comparten miembros.
- [ ] Enviar/aceptar/rechazar/cancelar solicitudes por @nombre y link; probar límites de 100 amigos y 50 pendientes con cuentas de prueba.
- [ ] Invitación instantánea, aceptar/rechazar y caducidad a dos minutos; `onDisconnect` en dos dispositivos, salir de sala y F5 durante una partida.
- [ ] Jugar Solo, Carrera y Coop en las cuatro dificultades; Fácil no acelera y Pesadilla usa una sola vida online.
- [ ] Comparar el mismo flash/semilla/ronda en varios dispositivos y jugar 31 encuentros para verificar reinicio de bolsa.
- [ ] Tres partidas reales seguidas volviendo al menú: fondos en acceso/preparación/lobby/pasillo/flash/libro/lienzo/suspenso/revelado/podio/muerte; pestaña, resize, F5 y fallo de imagen con degradado.
- [ ] Usar rueda HSV/hex/cuentagotas/últimos ocho, opacidad 5–100, tamaño/dureza, seis pinceles, siete formas (contorno/relleno, proporción), goma/cubo/tolerancia, 30+ deshacer/rehacer y simetría en móvil/escritorio.
- [ ] Probar **CLIP real** con dibujos coloreados de cada debilidad en las cuatro dificultades y `?debug=1`. Las pruebas automáticas no certifican la precisión del modelo real; ajustar confusables y umbrales sin aceptar objetos incorrectos.
- [ ] Escuchar los 60 sonidos con volumen bajo, comprobar atenuación y fallback; API de fuentes cargada y contraste/lectura en dispositivos reales.
- [ ] Eliminar una cuenta con amigos/récords/equipos; comprobar documentos y Auth, reintentar después de una interrupción.
- [ ] Activar App Check después de verificar métricas y probar la restricción de callables/bases. Validación autoritativa avanzada si la competición requiere resistencia a trampas.
