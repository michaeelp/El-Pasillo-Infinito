# Pruebas 1.2.0

## Verificado

- Tres partidas SOLO seguidas, con victoria, siguiente pasillo, muerte y regreso al menú cada vez.
- Fondo pintado mediante comparación de píxeles, no solo por presencia del nodo: menú, cuenta, flash, libro, lienzo, suspenso, huida, susto, muerte, pausa y recarga.
- Identidad del nodo de fondo conservada durante los recorridos.
- Redimensionado y eventos de ocultar/recuperar la pestaña, conservando el fondo y la pausa.
- Fallo de imágenes: degradado pintado en menú y libro. Carga posterior al plazo: el degradado se sustituye por la imagen.
- Segundo pasillo a 58 segundos; fórmulas probadas hasta 1.000 pasillos, mínimos de 250 ms y 25 segundos.
- Cuenta y suspenso siguen en 3 segundos.
- Puntuación, tiempo de cada ronda, racha, límite, desconexión y desempate: pruebas automatizadas.
- Fuentes WOFF2 cargadas mediante la API de fuentes. Texto visible de al menos 16 px en escritorio y móvil de 390x844.
- Libro y lienzo sin desbordamiento horizontal en móvil.
- Libro con retrato, nombre, lore y página; sin lista de debilidades ni descripción física. JSON de avatares sin frases de presentación.
- Perfil, cambio de nombre sanitizado, avatar y guardado.
- Firebase SDK real contra emuladores: Carrera en dos contextos independientes, cuatro rondas, susto individual, pérdida de vidas, eliminación, podio y revancha.
- Cooperativo en tres contextos: tres roles separados, teclado sin acceso a herramientas ajenas, miniatura en vivo, victoria común, rotación y dificultad por pasillo.
- Reconexión cooperativa dentro del plazo: pausa y continuación. Recarga F5: recuperación de la misma sala y de los tres jugadores.
- Desconexión cooperativa: pausa y fin al pasar 15 segundos.
- Reglas compiladas por los emuladores. Lectura del secreto denegada a Bibliotecario y Dibujante, incluso si el primero es anfitrión.
- Escritura ajena, avatar fuera de rango, nombre largo, rol incorrecto, chat demasiado rápido y récords mal formados: rechazados.
- Tres colecciones de récords y prohibición de actualización: verificadas.
- Sin errores JavaScript en los recorridos completados.

Las pruebas de interfaz simulan CLIP para hacer los resultados reproducibles; no se modifica el Recognizer ni el Worker del juego. Las pruebas previas del modelo real se conservan en pruebas-clip.json como historial del vocabulario anterior, no como validación de los 56 candidatos actuales. La IA del juego sigue siendo CLIP real.

## Ejecutar

npm test: fórmulas, catálogo, 1.680 combinaciones, lore, imágenes, sonidos y reglas generadas.
npm run test:rules: reglas en emuladores.
Con los emuladores iniciados: node tests/ui.cjs, node tests/expansion-ui.cjs y node tests/online-ui.cjs.
Los tests necesitan las dependencias de desarrollo y Chromium de Playwright. Las capturas se crean fuera del proyecto, en qa-ajustes/.

## Checklist de Publicación

- [ ] Activar Authentication anónima, añadir dominio y publicar reglas completas en tu proyecto real.
- [ ] Comprobar GitHub Pages con rutas relativas y versión 1.2.0, sin mezclar archivos viejos.
- [ ] Primera descarga real de CLIP en dos dispositivos; todos deben terminar antes de empezar.
- [ ] Tres partidas seguidas en móvil real con tacto, rotación y cambio de pestaña.
- [x] Forzar fallo de un fondo y comprobar degradado; repetir con carga tardía en navegador automatizado.
- [ ] Crear y unirse simultáneamente con avatar o rol ocupado: solo uno debe ganar la transacción.
- [ ] Activar verifyDrawings y calibrar el margen usando dibujos reales, no solo respuestas simuladas.
- [ ] Probar distinta latencia y WebGPU/WASM en dispositivos reales.
- [ ] Desplegar limpieza programada solo tras revisar configuración y facturación de Firebase.
- [ ] Revisar App Check antes de exigirlo.

## Ampliación 3 y leaderboard

- [x] 30 fichas con la asignación exacta: 8 de una debilidad, 12 de dos y 10 de tres.
- [x] 56 candidatos derivados del JSON; las frases descriptivas se convierten a IDs antes del juicio.
- [x] 1.680 combinaciones: cada monstruo acepta todas sus debilidades y rechaza objetos ajenos, excepto objetos que comparta por la asignación prevista.
- [x] Gana únicamente el top 1; una debilidad en segundo lugar no basta. Los confusables no se aceptan automáticamente.
- [x] Precisión con p ganadora y PRECISION_REF=0.6; con la misma p y tiempo, los monstruos de una, dos y tres debilidades reciben los mismos puntos.
- [x] Los 30 aparecen en el libro y miniaturas, selección SOLO y secuencias por semilla. Todas las páginas muestran el lore correcto, nombre y número.
- [x] 30 textos con el rango de palabras requerido, sin nombres de sus debilidades ni sinónimos conocidos; prueba de plurales, tildes y límites de palabra.
- [x] Revisión editorial: pistas de comportamiento/historia, una por objeto, sin descripción física del monstruo.
- [x] SHA-256: los 22 WebP originales no cambiaron. Ocho retratos nuevos de 1024 × 1024 con PNG de respaldo; navegador cambia a PNG si falla WebP.
- [x] 60 WAV distintos, PCM16 mono, cabeceras válidas, señal sin saturación. Los 60 se decodifican en el navegador; aparición, screamer y atenuación se reproducen por el bus de efectos.
- [x] ?debug=1: top 5 traducido y grupo de los cinco objetos de luz/llama.
- [x] Reglas: el ID 30 es válido; el 31 y las etiquetas fuera del catálogo se rechazan.
- [x] Tres rankings reales en emuladores: orden, avatars, equipo y lectura de registros antiguos sin avatar.
- [x] Escritura y confirmación de las tres colecciones; repetir el ID devuelve confirmación sin duplicar el documento.
- [x] Lectura con permiso denegado: error visible y REINTENTAR.
- [x] Desconectar la red de Firestore: error de conexión, restaurar red y reintentar la lectura correctamente.
- [x] SOLO: envío rechazado, conservación local, reintento y confirmación; resultado cero no se publica.
- [x] Carrera: el podio muestra un rechazo de escritura y permite reintentar; se confirma exactamente un récord del ganador con el ID de esa partida.
- [x] Cooperativo: el podio confirma un récord con el progreso y los tres nombres originales, incluso tras salir un participante.
- [x] Fuentes en el leaderboard y el libro móvil: mínimo 16 px y carga de las tres fuentes locales.

La lectura pública de la colección real se comprobó con una solicitud de solo lectura que devolvió HTTP 200. No se escribieron resultados de prueba ni se cambiaron las reglas de producción.

## Calibración y publicación pendientes

- [ ] Publicar juntos los módulos 1.2.0 y las reglas completas de Firestore y Realtime Database en el proyecto real.
- [ ] Probar dibujos reales de los 56 objetos, especialmente linterna/sol/fuego/vela/lámpara, usando el top 5 de debug. Las 1.680 combinaciones verifican la regla de victoria, no garantizan la calidad del reconocimiento visual de cualquier dibujo.
- [ ] Confirmar guardado y lectura desde tu dominio de GitHub Pages con las reglas nuevas.
- [ ] Revisar las pistas con jugadores para ajustar ambigüedad; el validador no puede evaluar el significado ni reconocer todos los sinónimos posibles.
