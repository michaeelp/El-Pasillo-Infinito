# Reglas y datos 1.3.0

`firestore.rules` y `database.rules.json` son los archivos completos que despliega `firebase.json`. `database.rules.commented.jsonc` contiene el mismo JSON con comentarios de cada rama. Se generan con `npm run generate:rules`; `npm test` detecta límites o configuraciones desactualizados. No pegar un fragmento encima de reglas anteriores: sustituir el archivo completo.

## Firestore

- `account()` requiere Authentication no anónima. Perfil y búsqueda de nombres/códigos requieren cuenta; los registros admiten lectura pública, aunque la interfaz de invitado muestra solo su lista local.
- `usernames` y `friendcodes` permiten crear solo con el perfil correspondiente en el mismo commit (`getAfter`); no permiten editar ni borrar. `users` exige ambas reservas, forma exacta, avatar 1–12, nivel 1, XP 0 y fecha de servidor al crear.
- Nombre, minúsculas, código y fecha permanecen fijos. Avatar/preferencias se editan por el dueño. La curva de nivel se comprueba con umbrales generados desde la configuración.
- XP y nivel no disminuyen. Cada aumento de XP/estadísticas debe incluir un recibo nuevo de partida con la diferencia exacta de XP (0–600), un incremento de una partida y fecha de servidor. Los recibos no se actualizan ni se borran. Se deduplican reintentos.
- `users/{uid}/amigos`: solo lectura propia. Las callables, con Admin, comprueban acciones, amistad mutua, recepción de solicitudes, límites 100/50 y ventana móvil de diez solicitudes/hora; una transacción escribe ambos extremos. Los documentos de tasa y mutex son privados.
- Los ocho registros individuales por modo/dificultad tienen siete campos exactos. Documento y campo UID pertenecen al usuario autenticado. Nombre/avatar/nivel coinciden con su perfil al guardar; fecha de servidor, puntuación entera 1–10000 Solo o 1–50000 Carrera. No puede bajar si `REEMPLAZAR_SOLO_SI_MEJOR` está activo.
- Los cuatro registros cooperativos son Admin exclusivos. `publishCoopRecord` deriva los tres UID de una sala terminada, comprueba al solicitante y la dificultad, elige el menor UID como dueño y calcula SHA-256 sobre UIDs ordenados unidos por `|`. Añade `miembros` para filtrado y borrado. Guarda solo una vez por equipo/categoría y conserva el mayor con la configuración por defecto.
- No se permite borrar desde el cliente. `deleteAccount` reautentica, marca la operación y elimina Auth, documentos, reservas, registros y ambos extremos sociales; `maintenance` reintenta operaciones pendientes.
- Resto: denegado. Ningún documento público lleva correo ni contraseña.

Los recibos y el límite restringen las escrituras; no prueban la autenticidad de los resultados. Ver `functions/VALIDACION-AVANZADA.md` para una ampliación autoritativa.

## Realtime Database

Toda lectura/escritura cliente permitida requiere cuenta no anónima y `cuentas/{uid}/activo=true`, reflejado por Admin. Cada ruta tiene validación de campos y deniega campos extra.

| Rama | Regla |
|---|---|
| `cuentas` | Lectura/escritura cliente denegada; las reglas consultan la identidad Admin |
| `amigos/{uid}` | Lectura propia; Admin refleja `true` únicamente si ambos documentos FS confirman amistad |
| `presencia/{uid}` | Escritura propia, estados válidos, sala existente si está en sala, tiempo de servidor; lectura propia o de amigos |
| `invitaciones/{destino}/{id}` | Crear solo el emisor miembro de la sala en lobby, con amistad mutua; nombre/UID/modo/dificultad reales y caducidad ≤2 minutos; destinatario lee y elimina |
| `rooms/{codigo}/meta` | Crear por anfitrión; actualizar por anfitrión; migrar si el anterior está ausente; dificultad/semilla/práctica fijas durante la partida |
| `jugadores/{uid}` | Escritura propia; nombre igual a identidad reflejada, avatar entero 1–12, slot/rol reclamado y sala no caducada |
| `claims` | Transacciones propias para slots, avatares 1–12 y los tres roles; evita carreras al ocupar un mismo elemento |
| `secreto` | Solo Vigía lee/escribe el monstruo de su ronda cooperativa; ID 1–30 |
| `entregas`,`resultados` | Entrega única por UID/ronda; dueño en carrera o Dibujante en Coop; milisegundos 0–75000, imagen y probabilidades acotadas |
| `veredictos` | Solo Vigía; monstruo coincide con su documento secreto |
| `live` | Solo Dibujante, miniatura y ritmo mínimo de 300 ms |
| `chat`,`whispers` | Identidad propia, texto acotado y ritmo mínimo; susurros solo con cero vidas |
| `audits` | Propios, sobre otro jugador y una única vez |

Las reglas de RTDB no pueden leer Firestore. Por eso los clientes **no pueden escribir el espejo de amigos**. Los triggers de Functions con reintentos reparan interrupciones. `onDisconnect` marca presencia y jugador ausentes; listeners y claims se limpian al salir. La tarea de mantenimiento elimina salas e invitaciones caducadas.

El último monstruo admite 0–30, las probabilidades solo las 56 etiquetas generadas de `monsters.json`, las vidas 0–5 y el avatar 1–12. Una semilla común permite reconstruir la bolsa desde código; las restricciones del Vigía son de interfaz y acceso a su documento, no una promesa de ocultación criptográfica de la semilla.

## Índices

`firestore.indexes.json` contiene los doce índices compuestos. Cooperativo: `miembros ARRAY_CONTAINS` + `puntuacion DESCENDING`, para las cuatro dificultades. Individuales: `puntuacion DESCENDING` + ID ascendente. El orden sencillo, los filtros por ID y el conteo usan además los índices automáticos de campo. Esperar a estado Enabled antes de probar. No excluir `puntuacion` de los índices.
