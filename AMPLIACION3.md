# Ampliación 3 · versión 1.2.0

30 monstruos disponibles en el libro, la tira de miniaturas, SOLO, Carrera y Cooperativo. Los 22 retratos previos conservan sus bytes, comprobados por SHA-256. Los ocho retratos nuevos se generaron individualmente con los originales como referencia de estilo: óleo sucio y grabado antiguo, frontal, contraste alto y fondo negro.

## Imágenes nuevas

WebP y PNG de 1024 × 1024. Sin texto ni marcas de agua. El PNG se utiliza si falla el WebP.

| ID | Nombre | WebP | PNG de respaldo |
|---|---|---|---|
| 23 | Madre Raíz | assets/monsters/23-madre-raiz.webp | assets/monsters/23-madre-raiz.png |
| 24 | Rey Rata | assets/monsters/24-rey-rata.webp | assets/monsters/24-rey-rata.png |
| 25 | El Desollado | assets/monsters/25-el-desollado.webp | assets/monsters/25-el-desollado.png |
| 26 | El Retrato | assets/monsters/26-el-retrato.webp | assets/monsters/26-el-retrato.png |
| 27 | Boca de Mil Dientes | assets/monsters/27-boca-de-mil-dientes.webp | assets/monsters/27-boca-de-mil-dientes.png |
| 28 | El Costurero | assets/monsters/28-el-costurero.webp | assets/monsters/28-el-costurero.png |
| 29 | Polilla Funeraria | assets/monsters/29-polilla-funeraria.webp | assets/monsters/29-polilla-funeraria.png |
| 30 | El Pescador Hundido | assets/monsters/30-el-pescador-hundido.webp | assets/monsters/30-el-pescador-hundido.png |

Prompts de arte: assets/PROMPTS-AMPLIACION3.md. Las descripciones físicas solo están en ese documento de producción, nunca en monsters.json ni en la interfaz.

## Catálogo y pistas

monsters.json contiene las 30 fichas completas. LORE.md entrega los 30 textos; AUDIO.md contiene los 60 nombres de archivo. tools/validate_lore.mjs valida longitud, nombres, plurales, acentos y sinónimos conocidos.

8 monstruos tienen una debilidad, 12 tienen dos y 10 tienen tres. La unión automática contiene 56 objetos y cada debilidad tiene id, nombre y etiquetaCLIP. El libro muestra retrato, nombre, lore y número de página; el lore reemplaza la lista de debilidades.

## IA y puntuación

js/monsters.js genera la unión; js/ai.js traduce las frases descriptivas devueltas por CLIP a IDs; js/ai-worker.js utiliza las frases con la plantilla. Solo la etiqueta más probable determina el acierto. Confusables no añade aciertos. ?debug=1 muestra top 5 y el grupo de luz y llama.

js/scoring.js usa 400 × min(1, p / PRECISION_REF) con PRECISION_REF = 0.6 en js/config.js. p es la probabilidad ganadora, sin sumar otras debilidades. js/online-game.js recalcula el resultado de Carrera y el Vigía valida el resultado cooperativo con el mismo criterio.

## Leaderboard

js/firebase.js confirma y escribe con IDs estables, lee directamente del servidor y conserva la lectura de registros antiguos sin avatar. js/ui.js muestra errores y reintenta la carga de los tres rankings. SOLO y el podio online permiten reintentar el envío sin duplicar un resultado que ya se guardó.

Publica todos los archivos juntos y las reglas completas de ambas bases. La prueba de producción fue solo de lectura; las escrituras se verifican con el SDK real en emuladores.

## Pruebas

npm test valida catálogo, 1.680 combinaciones de victoria, lore, imágenes, selección, sonido, dificultad y puntuación. tests/expansion-ui.cjs comprueba libro, PNG, debug, audio y los rankings. tests/ui.cjs recorre tres partidas; tests/online-ui.cjs prueba los dos modos online. El detalle y el checklist están en PRUEBAS.md.
