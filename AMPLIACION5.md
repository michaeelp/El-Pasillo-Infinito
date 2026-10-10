# Ampliación 5 · 1.4.0

Implementación completa sobre Authentication + Realtime Database, compatible con la arquitectura Spark existente. La referencia a Firestore del documento se adapta a RTDB para mantener la instrucción de no usar Functions ni depender de un plan de pago.

## Configuración

Audio, Calidad, Juego, Accesibilidad, Cuenta y Datos. Un esquema común genera controles, normalización y reglas; ajustes locales separados para invitado y sincronización por cuenta en users/uid/ajustes. Reinicio por categoría y total. Siete atajos reasignables sin duplicados. FPS 30/60, herramientas iniciales, texto/contraste/color, sacudida y efectos. Operaciones de contraseña, cierre y borrado únicamente en Cuenta; borrado exige nombre exacto y contraseña actual.

## Libro y monstruos

Índice dentro de las dos páginas, adaptable entre cuatro y ocho columnas; por defecto ocho en escritorio. Solo retratos en las celdas. Flechas/Enter/Esc, índice, páginas con animación, clic derecho y pulsación larga para descartar; reset por pasillo. 38 fichas, pool determinista sin repetición y bestiario derivados del JSON. 70 etiquetas CLIP unidas automáticamente, con confusables nuevos en debug.

| ID | Monstruo nuevo | WebP |
|---|---|---|
| 31 | El Último Huésped | assets/monsters/31-el-ultimo-huesped.webp |
| 32 | El Abrelatas | assets/monsters/32-el-abrelatas.webp |
| 33 | El Ombliguero | assets/monsters/33-el-ombliguero.webp |
| 34 | El Enjambre | assets/monsters/34-el-enjambre.webp |
| 35 | El Ahogado Seco | assets/monsters/35-el-ahogado-seco.webp |
| 36 | El Parásito | assets/monsters/36-el-parasito.webp |
| 37 | La Máscara de Carne | assets/monsters/37-la-mascara-de-carne.webp |
| 38 | El Invertido | assets/monsters/38-el-invertido.webp |

PNG de respaldo junto a cada WebP. Todos los lores están en LORE.md y el JSON; validación de rangos, nombres/plurales/alias conocidos en tools/validate_lore.mjs. No hay apariencia física en monsters.json. Sonidos propios y ambience.wav en AUDIO.md.

## Economía y tienda

Almas enteras con recibo de partida y movimiento inmutables. Bonificaciones de logros y niveles, cap 1000/partida; invitado, semilla personalizada y laboratorio dan cero. 28 cosméticos: 8 marcos, 12 títulos, 8 fondos; precios/rareza/requisitos en cosmeticos.json y constantes configurables. El catálogo remoto de solo lectura se carga con tools/load-catalog.mjs.

Compra atómica de saldo + inventario + movimiento, validada por precio remoto; relectura ante carreras. Equipar exige propiedad y tipo correcto. Marcos/títulos junto al avatar/nombre en lobby, marcadores, revelado, podio, amigos, chat y récords; fondos únicamente en perfiles mediante la capa persistente.

## Laboratorio

La misma instancia Drawing, exportBlob y Recognizer del juego, sin llamadas a XP, economía o récords. Todas las herramientas, manual/auto 1 s, top 5 español/progreso animado/miniaturas, objetivo y regla de dificultad. Debug entrega todas las candidatas, tiempo y JSON copiable.

## Archivos y activación

js/settings.js, settings-schema.js, shop.js, lab.js, book.js, economy.js, xp.js, config.js, CSS nuevo, monsters.json, cosmeticos.json, reglas completas RTDB, herramienta Admin y recursos de ASSETS.md. Se conserva avatars.json sin cambiar imágenes originales. Publica las reglas y carga el catálogo antes de habilitar la tienda; instrucciones exactas en README.md.

## Validación

PRUEBAS.md indica scripts y checklist. Informes JSON incluyen los resultados realmente ejecutados: reglas adversarias, configuración/sincronización, tienda/cosméticos/privacidad, laboratorio, tres partidas seguidas y Carrera/Cooperativo. La prueba adicional verifica el cargador de catálogo, buses de audio, JSON debug, cambio de cosméticos y respaldo PNG. Inferencia CLIP en pruebas de interfaz: doble controlado; la calidad con dibujos reales y percepción del sonido se revisan manualmente. Las reglas acotan operaciones; no existe servidor que certifique que se jugó una partida.
