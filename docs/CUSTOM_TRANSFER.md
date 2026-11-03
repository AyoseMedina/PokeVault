# Cristal → GBA · Crystal → GBA

## Español

Esta ruta es una **conversión personalizada no oficial**, autorizada expresamente
para PokéVault. No simula un intercambio original ni certifica legalidad
competitiva. Su política se identifica como `pokevault-crystal-gba-v1`.

Destinos: **Rubí, Zafiro, Esmeralda, Rojo Fuego y Verde Hoja** internacionales.
Importa el guardado de Cristal y el de destino, selecciona Pokémon de una caja,
elige destino y activa **Permitir Cristal → GBA personalizada**. La revisión
muestra los valores generados/adaptados. Tras confirmar, el ZIP contiene los
dos originales, el resultado nuevo y un manifiesto con los detalles y hashes.
La exportación debe reproducir exactamente los bytes revisados.

### Política de conversión v1

- Se conservan especie, mote y nombre del entrenador sin recortar ni sustituir,
  TID, experiencia, nivel coherente con ella, género, estado variocolor y letra
  de Unown. Se conservan movimientos, PP Más, amistad y Pokérus.
- Los nombres se decodifican del texto original, incluidos espacios. El mote
  debe caber en 10 caracteres y el entrenador en 7 caracteres GBA; si no caben
  o algún glifo no es representable, se bloquea la conversión.
- Se deriva el DV de PS de los bits bajos de Ataque, Defensa, Velocidad y
  Especial. Cada IV GBA es `2 × DV + 1`; el DV Especial se usa tanto para Ataque
  Especial como Defensa Especial. Los valores originales y resultantes se muestran.
- El entrenamiento de cada estadística se adapta a `min(252, 4 × floor(sqrt(E)/4))`,
  donde `E` es la experiencia de estadísticas de Cristal. Especial se duplica.
  Si la suma supera 508, se distribuyen 127 grupos de cuatro proporcionalmente
  con el método de restos mayores; los empates siguen PS/Atq/Def/Vel/AtE/DeE.
  **Las estadísticas de combate no serán idénticas** entre generaciones.
- Se genera naturaleza **Fuerte (neutra)** y la primera habilidad de la especie
  en generación III. No existían naturaleza ni habilidad en Cristal.
- El PID es determinista: semilla FNV-1a de especie, TID, DVs y entrenador;
  candidatos `seed + i × 0x9E3779B9` módulo 2³². Se exige naturaleza 0, mismo
  género y forma. Para especies con dos habilidades se exige paridad 0.
  Se bloquea si no aparece candidato en un millón de intentos. No se usa azar,
  hora, destino, experiencia actual ni PP para generar la identidad.
- El SID tampoco existía: para variocolor es `TID XOR PID_low XOR PID_high`;
  para normales parte del DV empaquetado y cambia el bit 3 solo si produciría
  variocolor. Se muestra el ID generado; no es un dato extraído de Cristal.
- Los PP actuales se conservan hasta el máximo de generación III; cualquier
  reducción figura en la revisión. No se borra ningún movimiento.
- La procedencia es **sintética**: versión del destino, lugar 254 (intercambio
  interno), nivel actual y Poké Ball estándar. No afirma que el Pokémon se
  capturó allí. El dato original de lugar/hora y género del entrenador se guarda
  en `customDetails.originalCaughtData`; el género del entrenador pasa a GBA.
  Cintas y concursos se inicializan a cero porque no existen en Cristal.

Se bloquean huevos, objetos, MO, Pokémon fuera del PC, Mew/Celebi de evento,
nombres incompatibles, datos inválidos, duplicados y destinos sin espacio o en
cuarentena. Solo se escribe en casillas libres y sus checksums. No se borra el
origen ni se actualizan la Pokédex o el progreso del destino. El original completo
siempre acompaña al resultado: los campos que cambian no se pierden en el respaldo.

No hay ruta directa II→IV/V ni conversiones hacia atrás. Esta implementación se
ha comprobado con formatos y pruebas sintéticas; no equivale a una prueba en
cartucho, ROM, consola o competición. Verifica una copia del resultado en tu
emulador antes de sustituir tu partida habitual.

## English

This is an explicitly authorized **custom, unofficial conversion**, identified
as `pokevault-crystal-gba-v1`. It is neither an original trade simulation nor a
competitive-legality guarantee. Targets are international **Ruby, Sapphire,
Emerald, FireRed and LeafGreen** saves.

Import both saves, select PC Pokémon, choose a destination and enable the custom
Crystal → GBA option. Review generated/adapted fields before confirming. The ZIP
includes both originals, the new result and a manifest with details and hashes.
Exported bytes must match the review exactly.

### Conversion policy v1

- Species, untrimmed nickname/OT, TID, experience, consistent level, gender,
  shiny state and Unown letter are retained, as are moves, PP Ups, friendship
  and Pokérus. Names must fit GBA's 10-character nickname / 7-character OT and
  be losslessly representable; incompatible text blocks conversion.
- HP DV is reconstructed from the low bits of Attack, Defense, Speed and Special.
  Each IV is `2 × DV + 1`; Special supplies both Sp. Atk and Sp. Def.
- Stat experience `E` maps to `min(252, 4 × floor(sqrt(E)/4))`, duplicating Special.
  Above 508 total, 127 groups of four are allocated proportionally by largest
  remainder, ties ordered HP/Atk/Def/Spe/SpA/SpD. **Battle stats will differ.**
- New fields: neutral **Hardy** nature and the species' first Gen III ability.
  PID candidates derive from FNV-1a of species/TID/DVs/OT using
  `seed + i × 0x9E3779B9` modulo 2³². Candidates must match nature 0, source gender
  and Unown form; dual-ability species also require parity 0. A million-candidate
  bound fails closed. No randomness, clock, destination, current EXP or PP is used.
- SID is generated: `TID XOR PID_low XOR PID_high` for shiny Pokémon; packed DVs
  otherwise, with bit 3 toggled only to prevent accidental shininess. It is
  explicitly generated, not read from Crystal.
- Current PP is capped to Gen III maxima; reductions are disclosed. No moves
  are silently deleted. Origin is synthetic: target version, internal-trade
  location 254, current level and standard Poké Ball. Original caught data is
  retained in `customDetails.originalCaughtData`; OT gender carries over.
  Ribbons and contest stats start at zero because Crystal has neither.

Eggs, items, HMs, party Pokémon, Mew/Celebi events, incompatible names, invalid
data, duplicates, occupied slots and quarantined destinations are blocked. Only
empty PC slots and corresponding checksums are written. Source Pokémon, dex
flags and adventure progress remain untouched. Changed fields remain recoverable
from the complete original save included in the package.

Direct II→IV/V and backward transfers remain blocked. Validation uses primary
format references and synthetic tests, not a cartridge, ROM, physical console
or competitive legality assessment. Check a copy in your emulator before
replacing the save you normally use.

## Fuentes / Sources

The mapping policy above is PokéVault's own policy, not attributed to Nintendo
or PKHeX. Binary formats, gender ratios and move PP use these primary references:

- [PKHeX PK2](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PKM/PK2.cs)
- [PKHeX PK3](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PKM/PK3.cs)
- [Crystal personal table](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Resources/byte/personal/personal_c)
- [Gen III move PP](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Moves/MoveInfo3.cs)
- [pret Emerald Pokémon structures](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/include/pokemon.h)
- [pret Ruby save blocks](https://github.com/pret/pokeruby/blob/5784633ce4ef7ade1a7f2d2d0c288e3d5e6cdd7f/include/global.h)
- [PKHeX Ruby/Sapphire sizes](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SAV3RS.cs)

Ruby/Sapphire checksummed section lengths: `0x890`, three `0xF80`, `0xC40`,
eight `0xF80`, `0x7D0`; party count/records at large-block `0x234`/`0x238`.
LeafGreen uses the existing FireRed layout. Physical sector rotation and active
copy validation remain unchanged. Gender/PP tables are from PKHeX (GPL-3.0),
reproducible with `py scripts/build-custom-transfer.py`.
