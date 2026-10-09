# Reglas de Seguridad

Los archivos completos para publicar son database.rules.json y firestore.rules. Reemplaza las reglas anteriores, no pegues fragmentos debajo de un permiso global abierto.

## Realtime Database

| Rama | Lectura | Escritura |
|---|---|---|
| meta | Usuario autenticado, incluido un código aún vacío para crear mediante transacción | Anfitrión; creación por su futuro anfitrión |
| meta/host | Igual que meta | Miembro que sustituye a un anfitrión ausente |
| jugadores/{uid} | Autenticados con código de sala | Solo ese uid |
| claims | Autenticados con código de sala | Reserva vacía o reserva propia, solo en lobby |
| secreto/{partida_ronda}/{uid} | Solo ese uid cuando es Vigía | Solo ese Vigía, una vez y en la ronda vigente |
| entregas, resultados | Miembros de la sala | Resultado propio; en Cooperativo solo el Dibujante |
| veredictos | Miembros | Solo el Vigía y con el monstruo de su secreto |
| live | Miembros | Dibujante actual, máximo un envío cada 300 ms |
| chat/{uid} | Miembros | Propietario; 60 caracteres y un segundo entre mensajes |
| whispers/{uid} | Miembros | Fantasma; 20 segundos entre susurros |
| audits/{ronda}/{uid}/{otro} | Miembros | Verificador; nunca para su propio resultado |

El nodo raíz de la sala no permite lecturas. Firebase propaga los permisos de lectura desde un padre: conceder lectura al padre revelaría también secreto. Por eso el cliente escucha ramas separadas.

Los asientos se reservan en claims/slots/1..8, o 1..3 para Cooperativo. La propiedad slot del jugador debe corresponder a una reserva suya. Los avatares 1..8 también tienen reserva propia si uniqueAvatars está activo. Transacciones evitan que dos solicitudes simultáneas consigan el mismo asiento, rol o avatar.

Solo el anfitrión cambia ronda, estado y semilla. La transferencia de anfitrión concede escritura únicamente sobre host, no sobre el resto de meta. El cliente elige el primer uid conectado como sucesor.

Cada resultado requiere entrega previa salvo timeout, valida etiquetas del vocabulario, puntuaciones 0..1, tiempo 0..60.000 y miniatura de imagen base64 de hasta 20.000 caracteres. Los nodos de resultado son de una sola escritura. Los valores calculados por clientes pueden manipularse; las reglas validan forma y propiedad, no ejecutan CLIP.

La validación de la sala rechaza escrituras después de expiresAt. El borrado de una sala expirada puede autorizarse a un usuario autenticado; cleanup/ proporciona el trabajo programado para ejecutar los borrados sin depender de visitas.

## Firestore

Lectura pública en las tres colecciones. Crear solo con las claves previstas y valores válidos. Actualizar o borrar: denegado.

scores y scores_carrera: n, p, a, t. scores_coop añade equipo con exactamente tres pares n/a. Nombre: 1..14 caracteres, sin corchetes HTML; avatar entero 1..8; puntuación entera 1..500, o hasta 50.000 en Carrera; t igual al tiempo de servidor.

App Check es recomendable para reducir abuso. Ni App Check ni estas validaciones convierten una puntuación del navegador en una prueba de juego legítimo.

## Pruebas

tests/rules.test.cjs carga estas reglas en emuladores y verifica accesos permitidos y rechazados. No usa ni modifica bases de producción. Ampliar las reglas exige repetir las pruebas y no reintroducir permisos en padres.

## Catálogo 1.2.0

Secreto y lastMonster admiten IDs hasta 30. Las etiquetas y las claves de distribution se generan automáticamente con node tools/update_rules.mjs desde monsters.json; no se mantiene una lista manual. node tools/update_rules.mjs --check detecta un catálogo cambiado sin regenerar reglas. Las nuevas reglas prueban el monstruo 30, rechazan el 31 y rechazan etiquetas ajenas al catálogo.

El cliente usa IDs estables para publicar récords y confirma el documento existente antes de reintentar. La inmutabilidad se conserva. La lectura permite registros históricos sin avatar; las nuevas escrituras exigen a y los campos actuales.
