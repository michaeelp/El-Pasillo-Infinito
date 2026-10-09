# Avatares 1.3.1

Doce retratos. `avatars.json` contiene únicamente `id`, `nombre`, `ruta` y `color`; el nombre es el del avatar, no el de usuario. La selección conserva la cuenta y permite cambiar de avatar; en una sala se respetan las reclamaciones de avatares únicos.

| ID | Nombre | WebP 256 px | Borde |
|---:|---|---|---|
| 1 | El Superviviente | assets/avatars/01-el-superviviente.webp | #dfad6d |
| 2 | La Niña del Impermeable | assets/avatars/02-la-nina-del-impermeable.webp | #efca49 |
| 3 | El Monje Ciego | assets/avatars/03-el-monje-ciego.webp | #b6b3a2 |
| 4 | La Bibliotecaria Fantasma | assets/avatars/04-la-bibliotecaria-fantasma.webp | #a7dadd |
| 5 | El Gato Negro | assets/avatars/05-el-gato-negro.webp | #83d875 |
| 6 | El Cuervo Cojo | assets/avatars/06-el-cuervo-cojo.webp | #e97870 |
| 7 | El Muñeco de Trapo | assets/avatars/07-el-muneco-de-trapo.webp | #c8a288 |
| 8 | La Enfermera Sin Prisa | assets/avatars/08-la-enfermera-sin-prisa.webp | #a4c3a1 |
| 9 | El Leñador | assets/avatars/09-el-lenador.webp | #8b3e50 |
| 10 | El Emo | assets/avatars/10-el-emo.webp | #9f79ba |
| 11 | El Esqueleto Deprimido | assets/avatars/11-el-esqueleto-deprimido.webp | #a6b5c3 |
| 12 | El Robot Demacrado | assets/avatars/12-el-robot-demacrado.webp | #58b8b0 |

Los ocho originales conservan sus archivos 1024, 256 y 64 px, comprobados por SHA-256 contra la versión anterior. Los cuatro nuevos incluyen **seis archivos cada uno**: `nombre.webp`/`nombre.png` (256), `nombre-64.webp`/`nombre-64.png` (64), `nombre-1024.webp`/`nombre-1024.png` (1024). El render usa 256 en perfil y 64 en listas, con PNG de respaldo para los nuevos.

Generación: herramienta integrada de imágenes, referencias originales 01 y 08, óleo sucio/gravado antiguo, negro, retrato centrado para recorte circular, sin texto. Prompts finales en `assets/PROMPTS-AMPLIACION4.md`.
