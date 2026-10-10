# Reglas y datos de Spark 1.4.0

`database.rules.json` contiene **todas** las reglas e índices de la base activa. `database.rules.commented.jsonc` tiene el mismo contenido con comentarios. Se regeneran con `npm run generate:rules` desde `tools/update_rules.mjs` y `tools/account_rules.mjs` y `tools/expansion_rules.mjs`. El SDK usa Auth modular v10 y RTDB; no llama a Firestore ni a Functions.

## Identidad y progreso

- La raíz deniega lectura/escritura por defecto. Una cuenta debe estar autenticada y no ser anónima; las escrituras de juego además requieren un perfil y ningún marcador de borrado.
- `users/{uid}`: lectura propia o según privacidad todos/amigos; nombre, avatar, nivel y equipado accesibles a cuentas para las listas; escritura propia. Datos públicos sin correo; campos desconocidos rechazados. El nombre, nombre en minúsculas, código y fecha son inmutables.
- `usernames/{nombreLower}` y `friendcodes/{codigo}`: no pueden crearse sueltos ni reasignarse. `newData.parent()` exige las reservas y el perfil en el mismo estado futuro. Una colisión rechaza todo el commit.
- Registro inicial con XP cero, nivel 1 y estadísticas vacías. Avatar 1–12, código de seis caracteres, nombre validado y filtro generado desde configuración.
- `partidas/{uid}/{id}`: privado, inmutable, máximo 600 XP, fecha de servidor y modos/dificultades permitidos. Debe existir el mismo ID en el progreso futuro y coincidir el incremento de XP.
- El nivel debe corresponder exactamente a la curva de XP. No se permite bajar XP ni reutilizar un recibo.

## Economía, catálogo y ajustes

- Catálogo público de solo lectura; lo carga una herramienta firebase-admin local. Los clientes nunca pueden escribir precios, rarezas ni requisitos.
- Saldo inicial cero; entero no negativo. Solo cambia con un movimiento nuevo de fecha de servidor, ligado al mismo saldo futuro y a ultimaOperacion.
- Recibo de recompensa completo: fórmula de modo/dificultad, floor de la base, logros/niveles nuevos, semilla no personalizada, máximo 1000. Movimiento partida-ID + recibo + perfil/progreso en la misma actualización. Un recibo existente no puede reutilizarse.
- Compra: precio exacto, objeto no poseído, inventario true y saldo/movimiento coincidentes. Desbloqueo: coste cero y requisito de nivel/logro existente. Movimiento inmutable y propio. No se puede quitar inventario para comprar de nuevo.
- Equipado tiene marco/titulo/fondo; cada ID debe existir, ser del tipo correcto y estar en inventario. Vacío desequipa.
- El bestiario usa IDs de monsters.json y los logros se validan por criterios; los logros obtenidos no se borran/reordenan, evitando bonos repetidos. Se conserva compatibilidad con recibos antiguos sin moneda.
- Ajustes: esquema completo, rangos/tipos/enums permitidos, siete atajos de una letra sin duplicados; campos adicionales rechazados. Preferencias: solicitudes, estadoVisible, perfil todos/amigos e invitaciones.
- Eliminación requiere quitar también el registro de movimientos. El marcador propio concede únicamente la limpieza necesaria y bloquea nuevas partidas/compras.

Las pruebas adversarias reproducibles están en tests/expansion5-rules.cjs; ECONOMIA.md detalla fórmulas y límites.

## Social

- `social/{uid}/pendientes/{otroUid}` tiene `de`, `fecha` y `slot`; ambos extremos deben coincidir en la misma escritura.
- `social/{uid}/confirmados/{otroUid}=true` solo se crea al aceptar una solicitud existente **como destinatario**; ambos pendientes desaparecen y ambos confirmados se crean juntos.
- Rechazar, cancelar y retirar amistad actualizan ambos extremos, con la acción y el actor comprobados.
- `socialCounts/{uid}` limita a 100 amigos y 50 solicitudes. No se puede poner a cero ni incrementar libremente: cada cambio está ligado a un único vínculo y a su contraparte en el mismo commit. Las escrituras concurrentes se rechazan si usan un contador obsoleto; reintentar relee el estado.
- `socialLimits/{uid}/{slot}` tiene diez ranuras. Una ranura solo puede reutilizarse al cumplir una hora, tiene fecha `now` y destino ligado a la nueva solicitud. No se puede borrarla para reiniciar la tasa. Cancelar solicitudes no recupera ranuras.
- `presencia/{uid}`: escritura propia con perfil activo, lectura propia o de amigo confirmado si el estado está visible; sala y tiempo validados. `onDisconnect` se cancela al cerrar sesión/borrar cuenta.
- `invitaciones/{dest}/{id}`: emisor miembro de un lobby activo y amistad mutua; nombre real, modo/dificultad de la sala preferencia de invitaciones activa y máximo dos minutos. Solo el destino lee su bandeja. `enviadas/{uid}/{id}` se valida junto a la invitación y permite limpiar los dos extremos.

## Récords

Cada dificultad tiene `records_solo_*`, `records_carrera_*` y `records_coop_*`, con lectura pública e índice `puntuacion`.

- Individual: clave UID, exactamente siete campos, identidad/avatar/nivel del perfil, puntuación entera acotada y fecha `now`. Solo el dueño escribe; el valor no puede bajar cuando `REEMPLAZAR_SOLO_SI_MEJOR` está activo.
- Cooperativo: clave `uidMenor|uidIntermedio|uidMayor`, tres miembros distintos y ordenados, perfil del dueño canónico y diez campos (`miembros`, `sala`, `partida` además de los siete individuales).
- El emisor debe ser miembro; la sala debe ser cooperativa, estar en podio, contener los miembros y coincidir en dificultad, partida y pasillos. Una semilla personalizada se rechaza. Los índices `equipos/{uid}/{d}/{equipo}` se escriben junto al mismo récord.
- El borrado de un récord individual o de equipo solo se admite durante la eliminación de la cuenta de su dueño/miembro. No hay borrado arbitrario desde el menú.
- El puesto se calcula contando resultados superiores; los empates comparten puesto. RTDB no tiene `count()` del servidor: el cliente descarga los registros superiores mediante el índice. Conviene tenerlo en cuenta si crece mucho el ranking.

## Salas y limpieza

Se mantienen anfitrión, claims exclusivos, nombre del perfil, roles, secreto por destinatario, límite de chat y campos/tiempos acotados de la versión anterior. `salasJugador/{uid}` registra la pertenencia para eliminar las salas pertinentes cuando se borra la cuenta.

`caducidad/{codigo}` expone únicamente código y fecha, con índice de valor. Al conectarse, el cliente revisa hasta ocho entradas. La eliminación de una sala se permite únicamente si expiró, o si la cuenta que se elimina es participante. No se concede lectura global de chats/dibujos para hacer mantenimiento.

`accountCleanup/{uid}` es privado. Solo su dueño puede crearlo, con su nombre/código actuales. Bloquea nuevas escrituras de juego. La limpieza elimina ambos extremos sociales y corrige contadores; después borra perfil, reservas, recibos y movimientos juntos. Por último libera el marcador y elimina Auth, con un registro local de reintento. Auth y RTDB no pueden borrarse en una transacción común; el navegador debe completar o reintentar la operación.

`deletedAccounts/{uid}` conserva solo el UID con valor true, privado e inmutable. Impide que un token anterior a la eliminación, todavía válido, vuelva a crear un perfil. No conserva nombre, correo ni estadísticas.

Los datos temporales pueden permanecer mientras no haya clientes conectados. No existe una tarea periódica alojada. Las reglas restringen permisos y tamaños; los resultados de IA, tiempo y XP siguen calculándose en clientes, sin validación autoritativa de partidas.

## Firestore anterior

`firestore.rules` se entrega como cierre opcional de una base anterior. No forma parte del despliegue activo; no es necesario crear Firestore. La migración local puede leer la base como administrador aun si los clientes ya no tienen permisos. El respaldo se conserva hasta que su propietario decida limpiarlo.
