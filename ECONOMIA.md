# Almas y cosméticos · 1.4.0

Constantes en js/config.js: ECONOMY y COSMETIC_PRICES. Multiplicador de dificultad: Fácil 0,5; Normal 1; Difícil 1,5; Pesadilla 2. Se redondea hacia abajo la base antes de añadir bonificaciones.

| Modo | Almas base |
|---|---|
| Solo | floor(3 × multiplicador × pasillos superados) |
| Cooperativo | floor(2 × multiplicador × pasillos superados), por jugador |
| Carrera | floor(puntos / 100) + puesto: 1º 30, 2º 20, 3º 10, resto 0 |

Logro nuevo: +20. Nivel nuevo: +50 por cada nivel subido. Máximo total: 1000 por partida, incluida la base y las bonificaciones. Invitados, semilla personalizada y laboratorio no obtienen almas, XP ni récords globales. Ejemplo: Solo Normal, un pasillo y nuevos logros Primera/Precisión: 3 + 20 + 20 = 43.

El resumen de fin de partida muestra +ganadas animadas y saldo. Moneda WebP/PNG 64/128/256 en menú, perfil, tienda y resultado. La misma actualización atómica crea el recibo privado de partida, suma XP, actualiza nivel/estadísticas, suma almas y añade un movimiento inmutable. Dos pestañas con el mismo ID conceden una sola recompensa; un ID ya registrado se consulta para mostrar el resultado original.

## Compra y desbloqueo

cosmeticos.json: 8 marcos, 12 títulos y 8 fondos. Precio por rareza: común 100, raro 250, épico 600, legendario 1500. Los objetos con requisito no se compran: se desbloquean por nivel/logro con coste cero. Sangre Seca/Pesadilla Viviente necesitan 10 pasillos en Pesadilla; otros títulos requieren niveles 10/20; objetos de libro requieren bestiario completo.

El catálogo se carga en `catalogo/{id}` de RTDB con la herramienta Admin local del README. Los clientes solo leen. Una compra es **un commit**: nuevo saldo + propiedad true + última operación + movimiento `{tipo,itemId,delta,saldo,fecha}`. Las reglas exigen el precio exacto del catálogo del servidor, saldo entero no negativo y propiedad anterior ausente. No se pueden comprar dos veces, añadir varios objetos con un movimiento, cambiar precios, borrar inventario ni alterar/borrar movimientos.

Dos compras con saldo para una: el primer commit se acepta y el otro se rechaza; el cliente relee y devuelve «Almas insuficientes». La selección equipada exige propiedad y tipo correcto. DESEQUIPAR usa una cadena vacía y mantiene el objeto.

## Alcance de las reglas

El recibo exige la fórmula de modo/dificultad, bonificaciones nuevas y máximo; se valida junto al saldo y movimiento. Logros existentes se conservan en su índice y no pueden eliminarse para cobrar su bono otra vez. Estadísticas/XP/partida están ligados a un recibo nuevo.

El navegador calcula los resultados de partida. Las reglas comprueban coherencia, permisos y límites de escritura; no acreditan dibujos, tiempo de juego ni resultados CLIP en un servidor. No hay Functions ni servicio autoritativo. Esto conserva el diseño de juego entre amigos y la infraestructura solicitada.
