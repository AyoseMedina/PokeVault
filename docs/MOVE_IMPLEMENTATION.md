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
