# Verificación de la entrega

## Comprobado

- Sintaxis de los 11 módulos JavaScript, importaciones locales y rutas de los retratos.
- Los 22 retratos WebP abren correctamente y miden 1024 × 1024. Las cinco imágenes de interfaz también se decodifican.
- Datos: 22 monstruos y 42 debilidades distintas; 200 selecciones consecutivas sin repetir el mismo monstruo.
- Pruebas del canvas: trazo, PNG recortado, cubo, goma, blanco sobre blanco, borrado reversible y 25 pasos de historial.
- Regla de victoria por primera etiqueta correcta y derrota por etiqueta incorrecta.
- Chromium de escritorio 1440 × 1000 y viewport móvil 390 × 844: menú, libro y lienzo revisados mediante capturas, sin desbordamiento horizontal.
- Interacción en navegador: pausa, reanudar con Escape, páginas, conservación del dibujo entre pestañas, victoria y siguiente ronda, derrota por lienzo vacío, derrota por tiempo, nombre sanitizado, récord local, lista y persistencia tras recarga.
- El temporizador permanece visible al desplazarse en móvil.
- Las pruebas de las transiciones usaron una respuesta de reconocimiento simulada exclusivamente en el navegador de pruebas. El proyecto entregado no incluye esa simulación.
- Carga real independiente de Transformers.js y CLIP: el menú llegó a «La IA está despierta. Puedes entrar». Sin errores JavaScript de página.

## Alcance

El tamaño de pantalla móvil se verificó en Chromium emulado, no en un teléfono físico. La revisión automatizada comprueba conexiones y comportamiento del audio, pero no sustituye una escucha en distintos altavoces.

El proyecto no se publicó en una cuenta de GitHub ni se conectó a un proyecto Firebase del usuario. El ranking global y la aplicación de sus reglas requieren esa configuración. Las reglas se entregan completas; su evaluación en el emulador de Firebase queda en el checklist del README.

La red del entorno de pruebas usa un proxy con un certificado propio. Se ajustó el navegador de pruebas para ese entorno; el juego entregado no desactiva ni modifica la verificación HTTPS del navegador.

## Reconocimiento real: cinco dibujos simples

Backend: WASM cuantizado. Plantilla: `a rough hand-drawn doodle of a {}.`. Los dibujos son figuras simples trazadas programáticamente para la prueba, no una muestra de dibujos de jugadores. Los cinco quedaron primeros entre las 42 etiquetas candidatas.

| Dibujo | Primera etiqueta | Puntuación relativa |
|---|---|---|
| sol | sol | 78.0 % |
| corazón | corazón | 73.5 % |
| llave | llave | 57.9 % |
| manzana | manzana | 99.6 % |
| paraguas | paraguas | 89.0 % |

Estas puntuaciones no son probabilidades calibradas ni garantizan aciertos con garabatos arbitrarios. WebGPU no estuvo disponible en este navegador de prueba; su selección y fallback están implementados, pero su ejecución en GPU física queda pendiente. El top 5 completo se incluye en `pruebas-clip.json`.
