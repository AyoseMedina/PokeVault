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
experiencia, IVs/DVs, EVs, movimientos y PP. Se mantiene el mote exacto; sin mote,
se codifica el nombre de la evolución en el idioma de la entidad. Un movimiento
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

### Fuentes adicionales / Additional sources

- [PKHeX EvolutionSet](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Legality/Evolutions/EvolutionSet.cs), [LearnsetReader](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Legality/Learnset/LearnsetReader.cs), [SpeciesName](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PKM/Util/SpeciesName.cs) y [PersonalInfo](https://github.com/kwsch/PKHeX/tree/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/PersonalInfo/Info).
- [Cristal: evoluciones](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/data/pokemon/evos_attacks.asm), [rutina](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/engine/pokemon/evolve.asm), [Unown](https://github.com/pret/pokecrystal/blob/3c813b0b4d82b39bf62185aceffb76fd6026c70b/engine/pokedex/unown_dex.asm).
- [Esmeralda: TradeMons](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/trade.c) y [SAV3.SetDex](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/SAV3.cs), [SaveBlock3 layouts](https://github.com/kwsch/PKHeX/tree/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Blocks/Gen3).
- [Platino: evolución y nombres](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/evolution.c), [intercambio y amistad](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/applications/trade_room/application.c), [Pokédex](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pokedex.c), [idiomas](https://github.com/pret/pokeplatinum/blob/c6689696d5fb51a644239702cb556eb52012a46a/src/pokedex_language.c).
- [HGSS: Pokédex](https://github.com/pret/pokeheartgold/blob/e1d5a4606640e31c44d36714ad0b5cdd9c8763fd/src/pokedex.c), [PKHeX Zukan4](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/PokeDex/Zukan4.cs) y [Zukan5](https://github.com/kwsch/PKHeX/blob/0660d1e1f4924b8478daec73281bb8071a82ad19/PKHeX.Core/Saves/Substructures/PokeDex/Zukan5.cs). Para español IV se sigue pret (bit 5), no el fallback japonés de Zukan4.
