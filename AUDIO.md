# Tabla de audio

60 efectos originales de síntesis, propios de cada monstruo: WAV PCM16 mono, 22.050 Hz, sin muestras externas. Aparición: 0,44–0,77 s; screamer: 1,05–1,49 s. Los IDs 23–30 tienen timbres diferenciados de madera, chillidos, voz raspada, vibración líquida, chasquidos, golpes metálicos, aleteo y resonancia acuática.

| ID | Monstruo | Aparición | Screamer |
|---|---|---|---|
| 1 | El Descarnado | assets/audio/appear/1.wav | assets/audio/scream/1.wav |
| 2 | Madre Araña | assets/audio/appear/2.wav | assets/audio/scream/2.wav |
| 3 | Cíclope Hueco | assets/audio/appear/3.wav | assets/audio/scream/3.wav |
| 4 | Sombra Sonriente | assets/audio/appear/4.wav | assets/audio/scream/4.wav |
| 5 | Devora-Luz | assets/audio/appear/5.wav | assets/audio/scream/5.wav |
| 6 | Rey Cuervo | assets/audio/appear/6.wav | assets/audio/scream/6.wav |
| 7 | Niño Sin Rostro | assets/audio/appear/7.wav | assets/audio/scream/7.wav |
| 8 | La Novia Cosida | assets/audio/appear/8.wav | assets/audio/scream/8.wav |
| 9 | Gárgola Llorona | assets/audio/appear/9.wav | assets/audio/scream/9.wav |
| 10 | Comeduermes | assets/audio/appear/10.wav | assets/audio/scream/10.wav |
| 11 | Hongo Podrido | assets/audio/appear/11.wav | assets/audio/scream/11.wav |
| 12 | Verdugo Hueco | assets/audio/appear/12.wav | assets/audio/scream/12.wav |
| 13 | Payaso Abisal | assets/audio/appear/13.wav | assets/audio/scream/13.wav |
| 14 | Reptante | assets/audio/appear/14.wav | assets/audio/scream/14.wav |
| 15 | Ojo Múltiple | assets/audio/appear/15.wav | assets/audio/scream/15.wav |
| 16 | Espectro Mojado | assets/audio/appear/16.wav | assets/audio/scream/16.wav |
| 17 | Ciervo Pálido | assets/audio/appear/17.wav | assets/audio/scream/17.wav |
| 18 | Santo Podrido | assets/audio/appear/18.wav | assets/audio/scream/18.wav |
| 19 | El Mordedor | assets/audio/appear/19.wav | assets/audio/scream/19.wav |
| 20 | Larva Real | assets/audio/appear/20.wav | assets/audio/scream/20.wav |
| 21 | Muñeco de Ceniza | assets/audio/appear/21.wav | assets/audio/scream/21.wav |
| 22 | Voz del Pozo | assets/audio/appear/22.wav | assets/audio/scream/22.wav |
| 23 | Madre Raíz | assets/audio/appear/23.wav | assets/audio/scream/23.wav |
| 24 | Rey Rata | assets/audio/appear/24.wav | assets/audio/scream/24.wav |
| 25 | El Desollado | assets/audio/appear/25.wav | assets/audio/scream/25.wav |
| 26 | El Retrato | assets/audio/appear/26.wav | assets/audio/scream/26.wav |
| 27 | Boca de Mil Dientes | assets/audio/appear/27.wav | assets/audio/scream/27.wav |
| 28 | El Costurero | assets/audio/appear/28.wav | assets/audio/scream/28.wav |
| 29 | Polilla Funeraria | assets/audio/appear/29.wav | assets/audio/scream/29.wav |
| 30 | El Pescador Hundido | assets/audio/appear/30.wav | assets/audio/scream/30.wav |

Los archivos se cargan una vez y se reproducen en SOLO, Carrera y Cooperativo según el monstruo. En Cooperativo el sonido de aparición se reproduce en el Vigía que ve el flash. Volumen, silencio y sustos atenuados se aplican mediante el bus de efectos. La música y los efectos de pasos, hojas y latidos siguen en Web Audio.

Puedes sustituir cualquier WAV por tus sonidos conservando la ruta. Si cambias la ruta, actualiza el campo correspondiente en monsters.json. Usa archivos que tengas derecho a utilizar. Incrementa VERSION y los sufijos de recursos al publicar otro conjunto para evitar caché antigua.

Generación reproducible: python3 tools/generate_audio.py. Código y sonidos originales: puedes usarlos y modificarlos en este proyecto.
