# Animaciones de intercambio y evolución · Trade and evolution animations

## Español

**Estado:** implementado (2026-11-03). Código: `dist/animations.js` (secuencia pura y
preferencia), reproductor `playMoveAnimation` en `dist/app.js` y estilos en
`dist/styles.css`. Pruebas: `tests/animations.test.js` y el paso de animación de
`tests/browser-move.mjs`. La demo incluye «Ver animación de intercambio» con un
ejemplo fijo (evolución por intercambio, evolución con objeto variocolor y
Piedra Eterna). Cerrar o saltar la animación siempre lleva a la descarga. Solo cambia la
interfaz: no modifica guardados, bytes revisados ni el paquete.

### Cuándo se muestran

- Al **preparar el paquete** de un movimiento ya verificado, después de guardar el
  respaldo y antes del modal «Archivo listo». La animación representa lo que
  pasará al instalar los archivos; el texto lo dice («Así llegará a tu partida»).
- Desde el **historial de movimientos** se puede volver a ver.
- No se muestra en la demo ni si la exportación falla. Nunca retrasa ni bloquea
  la descarga ni la verificación.

### Animación de intercambio

- Diseño **propio** con el tema rojo, blanco y negro de PokéVault. No copiar la
  secuencia, los gráficos ni los sonidos de los juegos (cable, túnel, pantalla de
  intercambio).
- Idea: dos tarjetas de partida (juego, entrenador y caja) y el Pokémon entrando
  en una Poké Ball que viaja de origen a destino. En las rutas entre
  generaciones se indica el puente (Cápsula del Tiempo, Parque Compi,
  Pokétransfer o «Conversión personalizada»).
- Varios Pokémon: uno tras otro, con un contador («2 de 5») y la opción «Ver
  todos de golpe».
- Se muestran los cambios revisados que el usuario debe ver: objeto que vuelve a
  la mochila (IV→V), amistad, objeto consumido.

### Animación de evolución

- Solo en los Pokémon con `placement.evolution` (evolución por intercambio ya
  verificada en `move.js`). La animación **no decide nada**: refleja lo que ya
  está en los bytes revisados.
- Diseño propio: brillo y transición entre el sprite de origen y el de destino
  (`dist/sprites/<especie>.png`, 1–649, locales), con el aviso final «¡Kadabra ha
  evolucionado en Alakazam!» y, si corresponde, «objeto consumido» o «nombre de
  especie actualizado».
- Piedra Eterna, Karrablast/Shelmet sin pareja o rutas sin evolución muestran un
  aviso breve («La Piedra Eterna ha impedido la evolución»), sin la animación.
- **No se puede cancelar** pulsando un botón: en un intercambio real no se puede.
  El botón «Saltar animación» solo salta la animación, no la evolución.
- Variocolor: destellos en el sprite final.

### Requisitos técnicos

- Solo CSS y JS propios. Sin bibliotecas, imágenes remotas ni audio (la CSP solo
  permite `self`). Sin sonidos oficiales; cualquier sonido futuro será propio,
  opcional y desactivado por defecto.
- `prefers-reduced-motion`: sustituir por un fundido sencillo con el mismo texto.
  Añadir también un ajuste en la web «Animaciones: completas / reducidas /
  desactivadas», guardado como preferencia local (`localStorage` protegido con
  try/catch).
- Accesibilidad: foco atrapado en el diálogo, «Saltar» con Escape o Enter, texto
  equivalente en `aria-live`, sin destellos de más de 3 por segundo.
- Rendimiento: debe ir fluido en el móvil (`transform` y `opacity`, sin animar el
  diseño de la página). Duración máxima de unos 4 s por Pokémon y 2 s por evolución.
- Adaptable (diseño móvil existente) y con el tema actual.

### Pruebas

Función pura que construye la secuencia a partir del resultado verificado:
orden, evoluciones, avisos de Piedra Eterna y objetos, y sin evolución en
III→IV/IV→V. Prueba de interfaz: «Saltar» lleva al modal «Archivo listo» con el
mismo ZIP, el modo reducido no anima y no hay errores de consola ni de CSP.

## English (summary)

Original (not game-copied) trade and evolution animations, shown after a
verified move package is prepared and replayable from history. The animations
only reflect reviewed results and never change data or block the download.
Evolution cannot be cancelled, only the animation skipped. CSS/JS only, local
sprites, no remote assets or official sounds. Respects reduced motion, adds a
local animation preference and is accessible and mobile-friendly.
