# Validación autoritativa opcional

La implementación incluida limita y deduplica XP, pero acepta resúmenes de cliente. Para una competición con premios o resistencia a trampas, añade una callable `finalizeMatch({matchId})` que no reciba XP, nombre, nivel, puesto ni puntuación como autoridad.

1. El servidor crea `matchId`, semilla y dificultad y un roster inmutable al empezar. Rechaza semillas personalizadas e invitados.
2. Cada entrega guarda UID, ronda, hora del servidor y dibujo; comprueba participantes, fase, tamaño y repetición. Un servidor de inferencia decide la etiqueta y probabilidad contra el catálogo versionado.
3. `finalizeMatch` carga los eventos validados. Calcula bolsa, dificultad, aciertos, puntos, puesto, XP y estadísticas con las fórmulas de `js/difficulty.js`, `js/scoring.js`, `js/pool.js` y `js/xp.js`; no confía en el anfitrión de RTDB ni en `distribution` de un cliente.
4. Una transacción verifica un recibo `users/{uid}/partidas/{matchId}` inexistente, actualiza el perfil y el único récord por categoría y crea el recibo. Reintentar devuelve el resultado previo. Guarda la versión del catálogo/fórmulas.
5. Sustituye `awardMatch`/`publishRecord` por esa callable y cambia las reglas de XP, recibos y récords individuales a escritura Admin exclusiva. Mantén únicamente avatar y preferencias como ediciones propias.

El espejo social y la eliminación ya usan servidor. `publishCoopRecord` comprueba identidad, equipo y estado de sala; la sala todavía es calculada por un anfitrión cliente, por lo que tampoco demuestra un resultado real. No activar una bandera que afirme «sin trampas» sin implementar la verificación anterior. Incluye App Check, límites por UID y pruebas concurrentes.
