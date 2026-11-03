# Public Pokémon reference fixtures

[Español](#español) · [English](#english)

## Español

Los ejemplos descifrados `.pk4` y `.pk5` proceden de la suite de pruebas
GPL-3.0 de kwsch/PKHeX:

- `upstream.pk4`: `Tests/PKHeX.Core.Tests/Legality/Legal/General/172 - Egg - 7D3CF55CFC10.pk4`
- `upstream.pk5`: `Tests/PKHeX.Core.Tests/Legality/Legal/General/300 - Egg - 0673311A3560.pk5`

Fuente: https://github.com/kwsch/PKHeX . Son ejemplos de entidades públicas, no
guardados de usuarios. El codificador independiente de `builders.js` vuelve a
cifrarlos para comprobar todos los selectores de permutación, checksums,
nombres, especies, huevos e importación de guardados. Los contenedores de
guardado generados son sintéticos y no jugables. Nunca se incluyen en `dist`.

## English

The decrypted `.pk4` and `.pk5` examples are from kwsch/PKHeX's GPL-3.0 test suite:

- `upstream.pk4`: `Tests/PKHeX.Core.Tests/Legality/Legal/General/172 - Egg - 7D3CF55CFC10.pk4`
- `upstream.pk5`: `Tests/PKHeX.Core.Tests/Legality/Legal/General/300 - Egg - 0673311A3560.pk5`

Source: https://github.com/kwsch/PKHeX . They are public entity examples, not user saves. The independent test encoder in `builders.js` re-encrypts them to check every shuffle selector, checksums, names, species, eggs and save import. Generated save containers are synthetic and not playable game saves. They are never included in `dist`.
