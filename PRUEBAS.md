# Pruebas 1.1.0

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
- Libro sin descripciones ni anotaciones; JSON de monstruos y avatares sin texto decorativo.
- Perfil, cambio de nombre sanitizado, avatar y guardado.
- Firebase SDK real contra emuladores: Carrera en dos contextos independientes, cuatro rondas, susto individual, pérdida de vidas, eliminación, podio y revancha.
- Cooperativo en tres contextos: tres roles separados, teclado sin acceso a herramientas ajenas, miniatura en vivo, victoria común, rotación y dificultad por pasillo.
- Reconexión cooperativa dentro del plazo: pausa y continuación. Recarga F5: recuperación de la misma sala y de los tres jugadores.
- Desconexión cooperativa: pausa y fin al pasar 15 segundos.
- Reglas compiladas por los emuladores. Lectura del secreto denegada a Bibliotecario y Dibujante, incluso si el primero es anfitrión.
- Escritura ajena, avatar fuera de rango, nombre largo, rol incorrecto, chat demasiado rápido y récords mal formados: rechazados.
- Tres colecciones de récords y prohibición de actualización: verificadas.
- Sin errores JavaScript en los recorridos completados.

Las pruebas de interfaz simulan CLIP para hacer los resultados reproducibles; no se modifica el Recognizer ni el Worker del juego. Las pruebas previas del modelo real se conservan en pruebas-clip.json. No se afirma una precisión universal de CLIP.

## Ejecutar

npm test: fórmulas y secuencias.
npm run test:rules: reglas en emuladores.
Con los emuladores iniciados: node tests/ui.cjs y node tests/online-ui.cjs.
Los tests necesitan las dependencias de desarrollo y Chromium de Playwright. Las capturas se crean fuera del proyecto, en qa-ajustes/.

## Checklist de Publicación

- [ ] Activar Authentication anónima, añadir dominio y publicar reglas completas en tu proyecto real.
- [ ] Comprobar GitHub Pages con rutas relativas y versión 1.1.0, sin mezclar archivos viejos.
- [ ] Primera descarga real de CLIP en dos dispositivos; todos deben terminar antes de empezar.
- [ ] Tres partidas seguidas en móvil real con tacto, rotación y cambio de pestaña.
- [x] Forzar fallo de un fondo y comprobar degradado; repetir con carga tardía en navegador automatizado.
- [ ] Crear y unirse simultáneamente con avatar o rol ocupado: solo uno debe ganar la transacción.
- [ ] Activar verifyDrawings y calibrar el margen usando dibujos reales, no solo respuestas simuladas.
- [ ] Probar distinta latencia y WebGPU/WASM en dispositivos reales.
- [ ] Desplegar limpieza programada solo tras revisar configuración y facturación de Firebase.
- [ ] Revisar App Check antes de exigirlo.
