# Implementación / Implementation · pokevault-move-v1

## Fase 1 / Phase 1

`dist/move.js` construye un resultado por origen y uno para el destino. Los
originales son inmutables. La escritura tiene máscara de rangos, recalcula las
sumas afectadas y relee los guardados. Las listas GB se compactan conservando
datos, OT y motes de los supervivientes; la comprobación admite su nueva casilla.
Los huecos GBA son 80 bytes cero; DS usa 136 bytes de entidad vacía cifrada.
No se reescriben las particiones antiguas de GBA/DS: son generaciones anteriores
del guardado, no espejos de la versión activa. Los pies DSV quedan intactos.

`dist/consumed.js` conserva un registro por SHA-256 aunque se retire la partida.
La exportación registra originales, historial y consumos en la misma transacción
de IndexedDB, antes de ofrecer la descarga. Una restauración antigua no libera
versiones. Anular requiere confirmación y se bloquea si un resultado ya entró
en el banco o fue consumido. Los campos son opcionales para respaldos schema 1.
La protección es local: no impide editar archivos externos, borrar el navegador
o restaurar un banco anterior en otro dispositivo.

The move writer returns one output per source and one for the destination,
preserving immutable originals and exact filenames. Every changed byte belongs
to an allowed range; all surviving entities and checksums are verified. The
SHA-256 consumption ledger survives save retirement and portable backups.
Export and consumption are one IndexedDB transaction. Cancellation requires
confirmation and is blocked once an output has been imported or consumed.
This is a local guard, not protection against external file/browser manipulation.

### Fuentes primarias / Primary sources

- [Amarillo: RemoveMonFromBox](https://github.com/pret/pokeyellow/blob/b452f2ab07185075140061c5084ab866d5e4a794/engine/pokemon/remove_mon.asm): listas paralelas, compactación y terminador.
- [Cristal: MoveMon](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/engine/pokemon/move_mon.asm) y [guardado y cajas](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/engine/menus/save.asm).
- [Esmeralda: ZeroBoxMonData](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c) y [almacenamiento](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon_storage_system.c).
- [Platino: BoxPokemon_Init](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pokemon.c) y [PCBoxes](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pc_boxes.c): inicialización vacía y cifrado con checksum cero.
- [HGSS: PCStorage_DeleteBoxMonByIndexPair](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/src/pokemon_storage_system.c) y [ZeroBoxMonData](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/src/pokemon.c).
- [PKHeX: SaveFile.ClearBoxes](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SaveFile.cs), [SAV5.BlankPKM](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SAV5.cs) y [PK5](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PKM/PK5.cs): entidad vacía, escritura cifrada y CRC. Los layouts y espejos proceden de las fuentes de `formats-data.js` y `README.md`.

Las pruebas usan entidades públicas y guardados sintéticos no jugables. No
equivalen a probar instalación en una consola o emulador con una partida real.
Tests use public entities and synthetic non-playable saves, not console runs.

## Fase 2 / Phase 2

`scripts/build-move-data.mjs` genera evoluciones, movimientos por nivel y datos
personales por juego desde PKHeX fijado al commit citado arriba, con hashes de
cada entrada. Cristal usa las condiciones de objeto de pret: la tabla de
legalidad de PKHeX elimina esa condición en II. No se editan tablas a mano.
Las evoluciones se aplican a la entidad convertida, conservando PID, ID32,
experiencia, IVs/DVs, EVs, movimientos y PP. Se mantiene el mote exacto; el nombre
de especie sigue las reglas del cartucho de destino descritas abajo. Un movimiento
aprendido al nivel actual bloquea el envío. Se comprueban duplicados antes y
después de evolucionar. Karrablast/Shelmet no tienen contrapartida y no evolucionan.

Piedra Eterna impide evolucionar incluso a Kadabra: es la política autorizada,
no una reproducción de la excepción de Kadabra de ciertos juegos. La política
I→II permite las evoluciones del destino; a diferencia del Time Capsule nativo,
también evalúa los objetos resultantes. II→III es explícitamente personalizada.
III→IV, IV→V y III→IV→V nunca disparan evolución.

La amistad se restablece a 70 en los intercambios de III/IV y en la llegada
personalizada II→III, según TradeMons/TradeRoom_ExecuteTrade. Las demás rutas
conservan su conversión documentada; no se inventan otros efectos de intercambio.
No se actualizan estadísticas, desbloqueos de Pokédex Nacional/internacional,
historial Pokétch ni eventos de aventura.

La Pokédex añade solo las especies recibidas y evolucionadas. Cristal actualiza
principal/respaldo y formas Unown; GBA actualiza las tres copias de vistos y el
primer PID de Unown/Spinda; IV añade género, formas, idioma y primer Spinda
(HGSS añade ambas listas Unown). V actualiza vistos por género/variocolor,
presentación, idioma y primer Spinda, y recalcula CRC local/espejo/tabla.
Los flags de todas las demás especies se comparan tras la relectura.

**Bloqueo explícito:** formas no base de especies con registro de formas en V.
`Zukan5.SetDex` de PKHeX fija el bit base de visto en vez de sumar `pk.Form`, y
`GetFormDisplayed` consulta dos veces la región no variocolor. No se ha verificado
la rutina nativa V que resuelva esa discrepancia. Se permite forma base, con
presentación existente conservada; no se normalizan formas automáticamente.

Evolution/learnset/personal tables are reproducibly extracted from pinned PKHeX
inputs, with Crystal held-item conditions from pret. Evolution runs after
conversion, preserves identity and exact nicknames, and blocks current-level
move prompts. Everstone and the route policy are explicit. Destination dex
registration includes mirrors, gender, language and supported form metadata.
Gen V non-base dex forms are blocked pending native-code corroboration of the
PKHeX discrepancy; no forms are silently normalized. Adventure unlocks and
trade statistics are unchanged.

### Corrección de renombrado / Cartridge-language naming correction

En III el idioma del cartucho se pregunta al importar (`gameLanguage`); los
bancos antiguos deben confirmarlo en el destino antes de una evolución que
pueda renombrar. No se infiere del idioma de los Pokémon ni del antiguo valor
por defecto `language: es`. En IV se lee `Trainer1 + 0x19` del bloque general
activo; en V, `PlayerData5.Language`, bloque 27 `0x19400 + 0x1E`. Un valor no
soportado se considera desconocido y bloquea el renombrado, no se sustituye.

Esmeralda y RF/VH requieren `MON_DATA_LANGUAGE == GAME_LANGUAGE` y coincidencia
exacta con el nombre anterior en el idioma del juego. Un extranjero conserva
su nombre. Rubí/Zafiro tienen versiones con/sin `BUGFIX_EVO_NAME`: `config.h`
lo activa para inglés revisión ≥1 o alemán. El guardado no acredita la revisión:
si las variantes discrepan (extranjero cuyo nombre coincide con el nombre del
destino), se bloquea. Los códigos de control de nombre en R/S también bloquean.
IV, incluidos HGSS, usa `MON_DATA_SPECIES_NAME` del cartucho cuando el bit de
mote está apagado, incluso si la entidad es extranjera; no cambia su idioma.

**Bloqueo V:** no se ha verificado la rutina nativa de renombrado extranjero.
Se bloquean evoluciones extranjeras sin mote; con mote se conserva exactamente,
y con el mismo idioma no hay discrepancia entre nombres. Los headers del
proyecto pokebw2 consultado no bastan para acreditar esa implementación.

Gen III cartridge language is explicitly selected on import; legacy banks
must confirm it. Gen IV/V read verified save fields. Emerald/FRLG preserve
foreign names; IV uses the cartridge's species name when the nickname bit is
clear. Ambiguous R/S edition/revision behavior and unverified foreign Gen V
renaming fail closed. Tests cover different source/destination languages,
nickname preservation, unknown language, and every supported game family.

- [Esmeralda EvolutionRenameMon](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c), [RF/VH](https://github.com/pret/pokefirered/blob/ce6406d8c2eaf46d543c8a2606de0c3cb1951982/src/pokemon.c).
- [Rubí/Zafiro EvolutionRenameMon](https://github.com/pret/pokeruby/blob/5784633ce4ef7ade1a7f2d2d0c288e3d5e6cdd7f/src/pokemon_3.c) y [configuración por revisión](https://github.com/pret/pokeruby/blob/5784633ce4ef7ade1a7f2d2d0c288e3d5e6cdd7f/include/config.h).
- [Platino MON_DATA_SPECIES_NAME](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pokemon.c) y [HGSS](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/src/pokemon.c).
- [SAV4.Language](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SAV4.cs), [PlayerData5.Language](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/Gen5/PlayerData5.cs) y [ubicación bloque 27](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs).

## Fase 3 / Phase 3 · Objetos / Items

Las equivalencias y conjuntos equipables se leen exclusivamente de la tabla
generada con `scripts/build-item-transfer.mjs`. Se valida origen y destino,
se bloquean Cartas, y la revisión muestra nombres ES/EN y equivalencias.
Evolucionar con objeto lo consume. IV→V devuelve el objeto al bolsillo de la
partida de origen; III→IV→V con objeto se bloquea porque falta ese guardado IV.

El mismo generador extrae offsets, máximos e IDs de `PlayerBag4DP/Pt/HGSS`.
Las entradas son `(u16 ID, u16 cantidad)` sin cifrado adicional. Se suma a una
pila existente o al primer hueco vacío, se verifica capacidad, máximos 999/99,
IDs y ausencia de duplicados. Los bolsillos de MT/bayas se ordenan por ID como
en el juego, conservando cada cantidad anterior. Se comprueba el multiconjunto
completo y solo se escriben las entradas que cambian, más el CRC general.

Generated held-item sets/mappings validate both ends. Mail and item-bearing
III→IV→V moves are blocked; item evolutions consume their item. IV→V returns
items to the source Gen IV bag. Native pocket limits, stacking and TM/berry
sorting are verified; unrelated quantities and Pokémon remain unchanged.

- [PKHeX PlayerBag4DP](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Items/Bags/PlayerBag4DP.cs), [Pt](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Items/Bags/PlayerBag4Pt.cs), [HGSS](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Items/Bags/PlayerBag4HGSS.cs) e [InventoryPouch4](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/Inventory/Pouch/InventoryPouch4.cs).
- [Platino Bag_TryAddItem](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/bag.c) y [capacidades](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/include/bag.h).
- [HGSS Bag_AddItem/SortPocket](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/src/bag.c) y [capacidades](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/include/bag.h).

### Fuentes adicionales / Additional sources

- [PKHeX EvolutionSet](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Legality/Evolutions/EvolutionSet.cs), [LearnsetReader](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Legality/Learnset/LearnsetReader.cs), [SpeciesName](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PKM/Util/SpeciesName.cs) y [PersonalInfo](https://github.com/kwsch/PKHeX/tree/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PersonalInfo/Info).
- [Cristal: evoluciones](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/data/pokemon/evos_attacks.asm), [rutina](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/engine/pokemon/evolve.asm), [Unown](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/engine/pokedex/unown_dex.asm).
- [Esmeralda: TradeMons](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/trade.c) y [SAV3.SetDex](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SAV3.cs), [SaveBlock3 layouts](https://github.com/kwsch/PKHeX/tree/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Blocks/Gen3).
- [Platino: evolución y nombres](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/evolution.c), [intercambio y amistad](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/applications/trade_room/application.c), [Pokédex](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pokedex.c), [idiomas](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pokedex_language.c).
- [HGSS: Pokédex](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/src/pokedex.c), [PKHeX Zukan4](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/PokeDex/Zukan4.cs) y [Zukan5](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/PokeDex/Zukan5.cs). Para español IV se sigue pret (bit 5), no el fallback japonés de Zukan4.
