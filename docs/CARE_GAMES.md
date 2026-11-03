# Cuidados, compañero y juegos · Care, buddy and games

## Español

**Estado:** pedido por el usuario e implementado (2026-11-03). **Todo se queda en
PokéVault:** nada de esto cambia tus partidas (ni la amistad ni la experiencia
del juego). Es la regla «sin trampas» del resto del banco.

- **Cuidados** (ficha de cada Pokémon): acariciar, jugar y dar bayas suben su
  cariño (0–255, cinco corazones). El ánimo cambia con el tiempo: hambre a las
  12 h sin comer, ganas de jugar a las 24 h y sueño de 23:00 a 7:00 (hora de
  Canarias). Hay tiempos de espera para que no sea infinito.
- **Bayas:** Zreza (picante), Atania (seca), Meloc (dulce), Safre (amarga), Perasi
  (ácida), Aranja y Zidra. En Gen III–V el sabor favorito y el que no le gusta salen
  de su **naturaleza real** (PID % 25), como en los juegos; en Gen I–II, que no
  tienen naturalezas, PokéVault le asigna un gusto estable y lo indica.
- El cariño se guarda por la **huella del Pokémon** (`entityIdentity`): se conserva
  aunque reimportes una versión nueva de la partida o lo muevas.
- **Compañero:** el Pokémon elegido te recibe en Mi banco, con su ánimo y accesos
  rápidos para cuidarlo.
- **Recompensa diaria:** 3 bayas de sabor y una Aranja cada día, con racha; cada 7
  días seguidos, una Zidra. La racha se reinicia si te saltas un día.
- **Juegos** (sección Juegos): ¿Quién es? (siluetas), Parejas, Lluvia de bayas
  (30 s) y Duelo de tipos (tabla de tipos de la generación de cada Pokémon). Dan
  bayas según la puntuación y guardan tu récord. Usan primero tus Pokémon y
  completan con especies de tus mismas generaciones.
- **WikiDex:** la ficha, la Pokédex y el reverso de las cartas enlazan a la ficha
  de WikiDex en otra pestaña. Solo se enlaza: su contenido (CC BY-NC-SA) no se copia.

Estado en `state.care` (campos opcionales, compatibles con bancos anteriores).
Código: `dist/care.js`, `dist/care-view.js`, `dist/games.js`, `dist/links.js`.
Pruebas: `tests/care.test.js` y `tests/games.test.js`.

## English (summary)

Bank-only care: petting, playing and berries raise affection (five hearts) with
time-based moods; liked flavours follow the real nature in Gen III–V. Affection is
keyed by the Pokémon's identity. A chosen buddy greets you on the bank page, a
daily reward grants berries with a streak, and four minigames (silhouette quiz,
memory, berry rain, type duel with the generation chart) award berries and keep
records. Species link to WikiDex in a new tab; nothing is copied from it. Nothing
here ever changes a save.
