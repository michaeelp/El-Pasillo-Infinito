# Pruebas y checklist · 1.4.0

`npm test` comprueba catálogo, datos y fórmulas. `npm run test:rules`, `npm run test:expansion`, `npm run test:spark` y `npm run test:ampliacion5` usan proyectos **demo-pasillo** y emuladores locales de Authentication/Realtime Database. Ninguna prueba escribe en tu proyecto real. El SDK Firebase es real; únicamente la inferencia CLIP se sustituye por resultados controlados.

## Catálogo y fórmulas

- [x] 38 fichas, 70 objetos unidos desde monsters.json y 2660 pares de aceptación/rechazo con la regla top 1.
- [x] Los ocho nuevos aceptan cada debilidad asignada; la dificultad Fácil conserva la regla top 2 de la ampliación 4.
- [x] Lore: rangos de palabras, nombres, plurales, acentos y sinónimos conocidos; sin campos de apariencia. La revisión humana de la justicia de las pistas complementa el script.
- [x] 22 retratos y ocho avatares originales intactos por SHA-256; variantes de los cuatro avatares adicionales conservadas.
- [x] Retratos nuevos 1024×1024 WebP/PNG; 76 WAV diferentes, PCM16 mono y sin saturación; ambience.wav incluido.
- [x] 8 marcos, 12 títulos y 8 fondos: precios/requisitos/dimensiones. Moneda en 64/128/256; centros y esquinas transparentes de los ocho marcos comprobados.
- [x] 64 semillas × 300 encuentros: bolsa completa, ciclos derivados del catálogo y frontera sin repetición.
- [x] Cuatro dificultades: fase/flash/mínimos, cuenta sincronizada, umbrales IA y rapidez/precisión por pasillo.
- [x] XP hasta nivel 99, máximo 600; almas por modo/dificultad, floor, bonificaciones y máximo 1000; custom 0.
- [x] Ajustes normalizados, siete atajos diferentes, confusables presentes en la unión y catálogos coherentes.
- [x] Migración pura y equipos canónicos: conserva UID/progreso/fechas; rechaza conflictos y deduplica equipos.

## Reglas con SDK real

- [x] Alta atómica, nombre fijo, colisiones/concurrencia, reservas ligadas, avatar/rangos y ausencia de correo en RTDB.
- [x] XP/nivel/recibo y récord único/mejor. Social mutuo, límites 100/50 y diez envíos por hora.
- [x] Recibo + saldo + movimiento atómicos; idempotencia, fórmulas de los tres modos, bonificaciones y tope.
- [x] Rechazar saldo inflado, compra sin saldo, precio falso, movimiento/recibo ausente, custom, bonificación falsa y >1000.
- [x] Rechazar compra duplicada, inventario extra/suelto, borrado de objeto y alteración/borrado de movimiento.
- [x] Dos compras concurrentes con saldo para una: exactamente una aceptada. Equipar exige propiedad y tipo correcto; desbloqueo exige nivel/logro.
- [x] Conservar logros obtenidos para impedir repetir su bonificación. Bestiario derivado de los IDs, incluido el 38.
- [x] Ajustes completos y tipos/rangos/enums; atajos repetidos/campos extra/escrituras ajenas rechazados.
- [x] Perfil para amigos: extraños no leen perfil completo, pero sí identidad para listas. Estado oculto incluso a amigos.
- [x] Invitaciones según privacidad, presencia privada, equipo canónico y semilla personalizada rechazada.
- [x] Limpieza solo de sala vencida; borrado por marcador propio y barrera de token anterior.

## Interfaz de ampliación 5

- [x] Seis categorías, RESTABLECER, aplicación visual, guardado local/F5 y sincronización real entre dos sesiones de la misma cuenta.
- [x] Invitado: Cuenta solo login/registro. Identidad de solo lectura/correo oculto. Cierre/cambio/borrado solo dentro de Configuración > Cuenta.
- [x] Índice 38, ocho columnas escritorio/cuatro móvil, flechas/Enter/Esc, clic derecho y pulsación larga; descartados limpios al cambiar de pasillo.
- [x] Configuración desde pausa conserva la pausa al volver; pincel/herramienta/dificultad/atajos iniciales.
- [x] Laboratorio: vacío, top 5 español/barras/miniaturas, auto 1 s, objetivo ✓/✗, 70 etiquetas debug. Sin perfil/XP/almas/recibos/récords del invitado.
- [x] Recompensa concurrente de la misma partida una sola vez; custom 0. Compra/saldo/compra repetida desde interfaz.
- [x] Marco/título en menú, lobby y ranking; fondo en perfil propio y de otro jugador, persistente tras visibilidad/resize.
- [x] Privacidad de perfil/estado/invitaciones, contraseña actual, nombre de borrado exacto y limpieza de movimientos/récord.
- [x] Herramienta de catálogo real: vista previa sin escribir y carga Admin de 28 objetos en RTDB emulado, sin cambiar usuarios.
- [x] Cinco buses/ganancias independientes, ambiente descargado después del inicio, subtítulos e integración de vibración.
- [x] COPIAR RESULTADOS: JSON de 70 candidatas; salida del laboratorio por otra ruta devuelve el lienzo a la partida. Cosméticos refrescados al reabrir ranking; PNG de respaldo cuando falla WebP; tienda móvil sin desbordamiento.
- [x] Tipografías locales y mínimo 16 px en pantallas comprobadas; móvil sin desbordamiento horizontal. Cero errores de JavaScript y cero peticiones a Functions/Firestore.

Tres partidas seguidas con fondos en cada estado, regreso al menú, F5/resize/visibilidad/fallo de imagen; Carrera y Cooperativo con tres roles, trazo largo, rotación y récord único: aprobados. XP/recibos concurrentes, sala vencida y borrado interrumpido/reanudado con Auth: aprobados. La regresión de tres partidas y online se registra en PRUEBAS-RESULTADOS.json. Las pruebas económicas y de interfaz tienen informes separados PRUEBAS-AMPLIACION5-REGLAS.json, PRUEBAS-AMPLIACION5-UI.json y PRUEBAS-AMPLIACION5-EXTRAS.json. Solo se marcan como aprobados los recorridos confirmados por esos informes.

## Antes de publicar en el proyecto real

- [ ] Email/Contraseña, política mínima ocho caracteres y dominio autorizado de GitHub Pages.
- [ ] Si hay progreso anterior en Firestore, vista previa/migración antes de publicar. Datos RTDB 1.3.1 funcionan sin reiniciar el progreso.
- [ ] Publicar **database.rules.json completo** y cargar una vez el catálogo con la herramienta Admin local del README.
- [ ] Sustituir web por v1.4.0, quitar carpetas antiguas functions/cleanup y recargar con Ctrl+F5.
- [ ] Dos dispositivos/redes reales: ajustes, amigos, Carrera/Cooperativo, roles/sincronización/reconexión y cosméticos en chat/revelado/podio.
- [ ] Dibujos reales en CLIP, CPU/WASM/WebGPU, incluyendo confusables luz/llama/gafas/recipientes. Afinar umbrales usando laboratorio/debug.
- [ ] Oír los 76 efectos y ambience.wav; probar cinco buses, silencio al perder foco y vibración en un móvil físico.
- [ ] Restablecimiento/verificación por correo real y plantillas de Authentication.
- [ ] Observar cuotas de Spark y, si se usa, métricas/exigencia de App Check.

Las pruebas automáticas validan lógica, datos, operaciones y recorridos; no acreditan la calidad del reconocimiento real, percepción acústica, entrega de correo ni el despliegue del proyecto de producción.
