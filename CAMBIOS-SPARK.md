# Adaptación sin Functions · 1.3.1

El juego utiliza Firebase Authentication y Realtime Database en el plan Spark. Se retiraron `functions/`, `cleanup/`, las callables, los triggers, la tarea programada, el SDK de Functions y el despliegue de Functions/Firestore/índices de Firestore. `firebase.json` publica únicamente RTDB. No hace falta compilar el cliente.

- Alta: reserva atómica de perfil, nombre, código y contadores en RTDB, con compensación de Auth si falla.
- Perfil y XP: lectura/escritura propia; nivel calculado y comprobado; recibo inmutable por partida y máximo 600 XP.
- Amigos: solicitudes, confirmaciones y contadores en la misma base, sin espejos editables; solo el destinatario acepta. Límites 100/50 y diez solicitudes por hora móvil.
- Presencia/invitaciones: amistad mutua comprobada por reglas, `onDisconnect`, lobby y vencimiento de dos minutos.
- Ranking: doce categorías con `.indexOn`, una entrada por UID o equipo, máximo por transacción, top 50, puesto propio y filtro Amigos.
- Cooperativo: reglas comprueban sala finalizada, miembros, dificultad, partida y semilla no personalizada. Clave verificable de tres UID ordenados en lugar de SHA-256.
- Borrado: reautenticación y limpieza de perfil, reservas, XP, solicitudes/amigos en ambos extremos, invitaciones, salas y récords antes de borrar Auth. Marcador y registro local para reintentar.
- Limpieza temporal: limitada desde el navegador al conectarse; no hay mantenimiento que dependa de un servidor.
- Migración opcional: herramienta local para conservar los datos anteriores de Firestore, con vista previa y escritura explícita.

Se conservan el arte, los 30 monstruos, 12 avatares, 60 efectos, lore, fondos persistentes, tipografías, cuatro dificultades, bolsa por semilla, tres modos y lienzo avanzado. Los sufijos de recursos subieron a `v=1.3.1`.

Publicación: sustituir archivos, borrar carpetas antiguas `functions/` y `cleanup/` del repositorio, publicar el `database.rules.json` completo en Realtime Database y actualizar GitHub Pages. La configuración pública de Firebase permanece en `js/config.js`. Más detalle en `README.md`; migración en `MIGRACION-SPARK.md`.
