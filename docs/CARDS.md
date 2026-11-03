# Cartas y sobres · Cards and packs

## Español

**Estado:** pedido por el usuario e implementado (2026-11-03). Solo interfaz y
datos de lectura: no cambia ninguna partida.

### Cartas

La página **Cartas** muestra cada Pokémon del banco como una carta coleccionable de
**diseño propio de PokéVault**. Sigue la estructura habitual de un juego de cartas
(PS arriba a la derecha, fase, ilustración, ataques, debilidad/resistencia, número
de colección y rareza), sin copiar el marco, los logos ni los símbolos de energía
del JCC oficial.

| Dato | Origen |
| --- | --- |
| PS | Cálculo real con nivel, DV/IV y experiencia de estadísticas/EV del guardado (fórmulas de Gen I–II y III–V; Shedinja = 1) y estadística base de PokéAPI. |
| Fase y «Evoluciona de…» | `evolves_from_species_id` de PokéAPI, limitado a las especies que existen en la generación del juego (sin Pichu en Gen I ni Munchlax antes de Gen IV). |
| Ataques | Movimientos del guardado con el tipo, la potencia y los PP de esa generación (`moves.csv` + `move_changelog.csv`). |
| Debilidad / resistencia | Tabla de tipos de la generación: Gen I (Fantasma no afecta a Psíquico, Bicho⇄Veneno ×2, Hielo→Fuego ×1, sin Acero/Siniestro) y Gen II–V (Acero resiste Fantasma y Siniestro). |
| Categoría, altura, peso | `pokemon_species_names` (español) y `pokemon` de PokéAPI. |
| Rareza | ✦ Variocolor (holográfica), ★ Legendaria/singular, ◆ Rara (fase 2), ◇ Poco común (fase 1), ● Común. |
| Reverso | Entrenador, partida, ubicación, DV/IV, entrenamiento y texto de Pokédex. |

Datos generados por `scripts/build-card-data.mjs` (`dist/card-data.js`) a partir de
PokéAPI en la misma revisión fijada que la Pokédex. Inclinación y brillo con el
puntero; desactivados con «reducir movimiento» o con las animaciones reducidas.

### Sobres

- Los Pokémon que entran en el banco **por primera vez** llegan en sobres de hasta
  10 cartas. La identidad usa la misma huella que los duplicados del modo mover
  (`entityIdentity`): reimportar una partida no crea sobres repetidos, pero un
  Pokémon que evoluciona al moverlo es una carta nueva.
- La primera vez que se abre Cartas, la colección actual llega en sobres de bienvenida.
- Abrir: el sobre se rasga, las cartas salen bocabajo y se giran de una en una; la
  más rara va al final, con un destello especial en legendarias y variocolor. El
  sobre queda abierto al rasgarlo, como uno real. «Ver todas» salta al resumen.
- Estado en `state.packs` (`collected` e `items`); campos opcionales, compatibles
  con bancos y respaldos anteriores. El `.pvault` no copia los sobres: tras
  restaurar en un banco nuevo, la colección vuelve como sobres de bienvenida.

Código: `dist/cards.js`, `dist/cards-view.js`, `dist/cards-page.js`, `dist/packs.js`,
`dist/packs-view.js`. Pruebas: `tests/cards.test.js` y `tests/packs.test.js`.

## English (summary)

The **Cartas** page shows every bank Pokémon as a trading card with PokéVault's own
design (no official TCG frame, logos or energy symbols): real HP from level, IV/DV
and training; generation-aware stage; moves with that generation's type, power and
PP; generation type chart for weakness/resistance; genus, height, weight and rarity
(shiny cards are holographic). Pokémon entering the bank for the first time arrive
in packs of up to 10 cards with a tear-and-reveal animation, rarest last. Data comes
from PokéAPI at the pinned revision (`scripts/build-card-data.mjs`). Read only.
