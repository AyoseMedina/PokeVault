# Pokédex · Español / English

## Español

La sección **Pokédex** y el botón de cada partida muestran los registros de
especies vistas y capturadas del archivo importado. Se puede elegir partida,
buscar por nombre/número y filtrar vistas, capturadas o pendientes. Cada ficha
incluye el texto de esa edición y también aparece en el detalle de un Pokémon.

Los contadores son **nacionales**, con 151/251/386/493/649 especies según la
generación, incluidos singulares. No reproducen el contador regional ni indican
si la Pokédex nacional está desbloqueada. «Capturado» significa la marca del
guardado, no que actualmente tengas un ejemplar en las cajas. Las cuatro marcas
de avistamiento de generación V se combinan para contar cada especie una vez.
Las inconsistencias capturado/sin ver se muestran sin corregir los datos.

Es una consulta de solo lectura. Utiliza los bloques ya validados y la copia
activa elegida por el lector; no escribe flags, no cambia checksums y no modifica
el formato `.pvault`. Los respaldos existentes se pueden seguir utilizando.
La demo contiene datos sintéticos y puede mostrar Pokémon en cajas sin registros
en la Pokédex. Las transferencias tampoco añaden marcas de visto/capturado.

Las descripciones **no están extraídas del guardado**: son textos de referencia
de PokéAPI, incluidos localmente en Docker. No se envían partidas ni se consulta
la API desde el navegador. La revisión usada tiene los textos de las 16 ediciones
compatibles en inglés, pero **ninguna edición de generación I–V tiene texto
español en PokéAPI** (el español empieza en X/Y). Por decisión del usuario
(2026-11-03), en español se muestra el texto **oficial de una edición posterior**,
siempre indicándola: Amarillo → Let's Go, Pikachu!; Rojo Fuego → Let's Go,
Pikachu! (y Rubí Omega/X a partir del #152); Verde Hoja → Let's Go, Eevee! (y
Zafiro Alfa/Y); Rubí/Esmeralda → Rubí Omega; Zafiro → Zafiro Alfa; el resto →
X o Y. La opción «English» muestra el texto exacto de la edición. No se incluyen
descripciones de formas alternativas ni se afirma que estos textos provengan de
la ROM del usuario.

## English

The **Pokédex** page and each save's button display seen/caught species flags
from the imported file. Select a save, search by name/number, and filter seen,
caught or missing species. Each species entry includes that edition's description;
the description is also shown in the individual Pokémon detail.

Counts use the **national** roster: 151/251/386/493/649 species by generation,
including mythical species. They are not the game's regional counters and do
not indicate whether the national dex is unlocked. Caught flags do not imply
that a specimen is currently in the PC. Generation V combines all four seen
regions without double-counting. Inconsistent caught/unseen flags are reported
without repairing them.

This is read-only. The reader uses validated active blocks without writing flags,
checksums or a new `.pvault` schema. Existing backups remain compatible. Synthetic
demo saves can contain Pokémon without dex flags. Transfers do not update dex flags.

Descriptions are **not extracted from the save**. They are reference text from
PokéAPI, bundled locally with Docker. No saves are uploaded and the browser never
calls the API. The pinned dataset has English descriptions for all 16 supported
editions, but **no generation I–V edition has Spanish text in PokéAPI** (Spanish
starts with X/Y). By user decision (2026-11-03), Spanish shows the **official
text of a later edition**, always named: Yellow → Let's Go, Pikachu!; FireRed →
Let's Go, Pikachu! (then Omega Ruby/X from #152); LeafGreen → Let's Go, Eevee!
(then Alpha Sapphire/Y); Ruby/Emerald → Omega Ruby; Sapphire → Alpha Sapphire;
the rest → X or Y. "English" shows the exact edition text. Alternate-form
descriptions and extraction from the user's ROM are outside the scope.

## Fuentes y reproducción / Sources and reproduction

PokéAPI revision: `e5b79b2e15d7c50735a945936afd4cd1cfd94eae`.
Run `py scripts/build-pokedex.py` (or `python3`) to rebuild
`dist/pokedex-data.js`. Source CSVs are cached under ignored `.test-output/`.
Whitespace is normalized and words split across lines are joined (soft hyphen U+00AD, or a hyphen at a line break: "moun­ tains" → "mountains", "bluish-
white" → "bluish-white"). Species and language are retained; English keeps the exact version and Spanish records its source version.

- [PokéAPI CSV source](https://github.com/PokeAPI/pokeapi/tree/e5b79b2e15d7c50735a945936afd4cd1cfd94eae/data/v2/csv)
- [PokéAPI license](https://github.com/PokeAPI/pokeapi/blob/e5b79b2e15d7c50735a945936afd4cd1cfd94eae/LICENSE.md)
- Pokémon names and game text belong to Nintendo / Creatures / GAME FREAK.

Save structures are verified against PKHeX revision
`0660d1e1f4924b8478daec73281bb8071a82ad19` (GPL-3.0):

| Juego / Game | Capturados / Caught | Vistos / Seen |
| --- | --- | --- |
| Amarillo / Yellow internacional | `0x25A3` | `0x25B6` |
| Cristal / Crystal internacional | `0x2A27` | `0x2A47` |
| GBA III | Sector 0 activo / active sector 0 + `0x28` | Sector 0 + `0x5C` |
| Diamante/Perla / Diamond/Pearl | General activo / active general + `0x12DC + 4` | General + `0x12DC + 0x44` |
| Platino / Platinum | General + `0x1328 + 4` | General + `0x1328 + 0x44` |
| HeartGold/SoulSilver | General + `0x12B8 + 4` | General + `0x12B8 + 0x44` |
| Negro/Blanco / Black/White | `0x21600 + 8` | `0x21600 + 0x5C`, four regions of `0x54` bytes |
| Negro 2/Blanco 2 / Black 2/White 2 | `0x21400 + 8` | `0x21400 + 0x5C`, four regions of `0x54` bytes |

Species use national ID minus one, least-significant bit first. Padding and
display/form/gender-only regions are excluded from national species counts.

- [Gen I offsets](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/Gen12/SAV1Offsets.cs)
- [Gen II offsets](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/Gen12/SAV2Offsets.cs)
- [Gen III dex](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SAV3.cs)
- [Gen IV dex](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/PokeDex/Zukan4.cs)
- [Gen V dex](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/PokeDex/Zukan5.cs)

Tests cover all supported layouts, active versus stale copies, byte boundaries,
padding, all four Gen V seen regions, DSV preservation, inconsistent flags and
exact-version description coverage. They use synthetic, non-playable saves.
