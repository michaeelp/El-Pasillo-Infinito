# Pruebas y checklist 1.3.1 · Spark

Ejecutar `npm test`, `npm run test:rules` y `npm run test:expansion`. La web usa el SDK real contra emuladores **Auth/Realtime Database**; no se monta ningún servidor callable. CLIP devuelve etiquetas controladas en estas pruebas, y la biblioteca/modelo real se mantiene en el juego. El informe de navegador está en `PRUEBAS-RESULTADOS.json`.

## Cobertura automática

- [x] 30 fichas, asignación exacta y 56 objetos derivados del JSON; 1.680 pares de acierto/rechazo.
- [x] Lore con longitudes, nombres, plurales y sinónimos conocidos; ausencia de campos de apariencia.
- [x] 22 retratos y ocho avatares originales intactos por SHA-256; nuevos WebP/PNG y 60 WAV distintos sin saturación.
- [x] 64 semillas × 300 encuentros, bolsa completa y frontera sin repetición.
- [x] Cuatro dificultades, tiempos/minimos, cuenta sincronizada, umbrales IA y rapidez/precisión.
- [x] Curva de XP hasta 99, límite 600, semillas sin XP y mejores/estadísticas/logros.
- [x] Equipo canónico igual para las seis permutaciones.
- [x] Migración: UID/XP/fechas/recibos conservados, sin correo, conflictos rechazados, social coherente y equipos fusionados.
- [x] Reglas con SDK real: alta atómica, colisión por mayúsculas y dos altas concurrentes; sin reservas sueltas.
- [x] Nombre fijo, avatar 1–12, datos propios, sin invitado/anónimo ni correo añadido al perfil.
- [x] XP/recibo/nivel, recompensa repetida rechazada, récord único/mejor y sin borrado arbitrario.
- [x] Social: no fabricar amigos ni aceptar la solicitud propia; aceptar/rechazar/cancelar/eliminar con ambos extremos.
- [x] Límites 100 amigos/50 pendientes y diez envíos por hora, incluso cancelados; contadores y tasa no reiniciables.
- [x] Presencia entre amigos, invitación mutua, nombre real, lectura propia y limpieza del índice de invitación.
- [x] Cooperativo: clave/miembros/dificultad/sala/partida, semilla personalizada y puntuación falsa rechazadas.
- [x] Borrado autorizado por marcador propio, revocación de escrituras, amigos/contadores, equipos/récords, perfil y reservas, sin permitir recreación con un token anterior.

La suite de navegador recorre tres partidas seguidas como invitado con fondos en cada estado y regreso al menú; herramientas de lienzo en 390×844, opacidad sin acumulación, 35 pasos, recorte y PNG opaco en color; F5, redimensionado, visibilidad, imagen fallida y tipografías locales. Prueba cuentas y sesión persistente, avatar 12, XP, top 50 más puesto 56, dificultades, Amigos, enlaces, invitaciones, Carrera y Cooperativo. Mantiene un trazo de 600 ms durante los refrescos de roles y verifica acierto/rotación/derrota/récord único. Comprueba cambio de contraseña, eliminación de datos/Auth y ausencia de solicitudes a Functions/Firestore.

`npm run test:spark` verifica además XP/recibos y máximos concurrentes, limpieza de salas caducadas y eliminación interrumpida/reanudada.

## Antes de publicar en tu Firebase real

- [ ] Activar Email/Contraseña y política de contraseña de ocho caracteres.
- [ ] Autorizar tu dominio de GitHub Pages; revisar plantillas de correos.
- [ ] Si hay progreso anterior, ejecutar vista previa/migración **antes** de publicar la web nueva.
- [ ] Publicar `database.rules.json` en Realtime Database, con la URL correcta del mismo proyecto.
- [ ] Sustituir web por v1.3.1, quitar carpetas antiguas functions/cleanup y recargar con Ctrl+F5.
- [ ] Dos cuentas y dos dispositivos: nombre repetido, acceso, sesión tras F5, perfil y avatar.
- [ ] Invitado solo/local; cuenta con semilla personalizada sin XP/global.
- [ ] Amistad por @nombre/link; aceptar/rechazar/cancelar/eliminar, recepción desactivada e invitación de dos minutos.
- [ ] Carrera y Cooperativo desde redes distintas; dificultad compartida, roles, sincronización y reconexión.
- [ ] Dibujos reales con CLIP en CPU/WASM/WebGPU; top 5 debug de confusables y umbrales.
- [ ] Comprobar ranking tras recargar y desde otra cuenta; récord inferior conserva el mayor.
- [ ] Restablecimiento por correo real, contraseña nueva y verificación de las plantillas.
- [ ] Eliminar cuenta y reintentar una operación interrumpida desde el mismo navegador.
- [ ] Observar cuotas de Spark y, si lo activas, métricas/exigencia de App Check.

Las pruebas automáticas no escriben en tu Firebase real. La inferencia CLIP real, entrega de correo, despliegue y redes/dispositivos reales requieren las comprobaciones manuales anteriores. La CLI de migración se probó con Auth/Firestore/RTDB emulados: vista previa sin escrituras, copia completa, repetición idempotente y origen/Auth intactos. `npm run test:migration` reproduce esa comprobación. No acredita los datos de tu proyecto concreto.
