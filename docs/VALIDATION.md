# Persistencia, recuperación y pruebas / Persistence, recovery and tests

[Español](#español) · [English](#english)

## Español

La demo trabaja en memoria. Una importación o restauración desde ella solo
puede pasar al banco real si el estado persistido sigue vacío. Al salir, se
vuelve a leer IndexedDB. La comprobación de revisión ocurre dentro de la misma
transacción que escribe: una pestaña antigua no puede sustituir cambios nuevos.

La base `pokevault-r36s-v1` conserva su nombre y abre la versión 2. Lee registros
antiguos de esquema 1 y guarda metadatos de esquema 2 con los originales en
`blobs`, indexados por SHA-256. La migración se completa atómicamente en la
primera escritura válida. Guardados y respaldos comparten los bytes; editar
notas o favoritos solo escribe metadatos. El esquema interno leído por la
interfaz sigue siendo 1. No uses una versión anterior para escribir en la base
migrada. Los estados desconocidos bloquean escrituras y ofrecen un JSON de
recuperación con todos los almacenes, claves y bytes disponibles.

El `.pvault` v2 tiene un diccionario `blobs`, partidas, respaldos con sus
motivos/fechas, cajas, favoritos, notas, hasta 25 snapshots e historial de planes.
La restauración acepta también v1. Valida hashes, idiomas, fechas, referencias y
el límite combinado de 100 partidas. La fusión mantiene la organización actual;
añade el historial que cabe hasta el límite de 25 puntos, priorizando los
existentes. Un archivo v2 con estructura de guardado ilegible puede conservarse
en cuarentena, pero no se utiliza como origen ni destino de transferencias.
Un hash incorrecto bloquea la restauración normal: el archivo de recuperación
conserva la evidencia en vez de corregir silenciosamente el original.

Solicitar persistencia no garantiza que el navegador la conceda. Se muestran
el resultado y la estimación de uso/cuota; siempre hace falta una copia externa.
La fecha de respaldo registra el clic en descargar, no una confirmación del
sistema de archivos: comprueba el archivo descargado. Consulta la API primaria
de [StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

Cristal compara el payload completo de la caja activa y su copia antes de
aceptar el guardado. La lectura posterior a la exportación vuelve a comprobar
ambos. La referencia es [SaveBoxAddress/LoadBoxAddress de pokecrystal](https://github.com/pret/pokecrystal/blob/master/engine/menus/save.asm):
el juego copia el payload entre ambas ubicaciones y carga la caja desde el
banco al continuar. Se bloquean las discrepancias en vez de elegir una copia
sin revisión. Guarda dentro del juego y vuelve a importar si aparece ese aviso.

### Ejecutar las comprobaciones

Con Node 22 o posterior:

```sh
npm test
npm --prefix server ci --ignore-scripts
npm run test:auth
```

Las regresiones de navegador usan Chromium y perfiles aislados, solo con datos
sintéticos no jugables. Instala las herramientas de prueba en el directorio
ignorado; no son dependencias de la aplicación ni entran en Docker:

```sh
npm install --prefix .test-output/ui-check --no-save playwright@1.64.1
npx --prefix .test-output/ui-check playwright install chromium
npm run test:browser
npm run test:browser:move
npm run test:browser:vault
npm run test:browser:account
```

La suite comprueba el banco con una partida sin Pokémon, demo y cambios desde
otra pestaña, migración v1→v2, bytes sin duplicar, conflicto de revisión, aborto
por cuota, exportación/restauración v2, retirada confirmada, cuarentena, esquema
desconocido y cierre de sesión con una ventana abierta. El servidor de prueba
usa credenciales aleatorias y un puerto temporal en loopback. No abre perfiles
del usuario ni toca su banco real. También se ha probado el flujo móvil de
importación, selección, prevalidación, revisión, respaldo y descarga ZIP.

Las pruebas de Chromium no equivalen a probar Safari/iOS, el teclado virtual o
una consola física. Tampoco simulan un ataque distribuido de gran volumen.

La suite `browser-move.mjs` recorre importación con idioma obligatorio,
Cristal→GBA con objeto y evolución, revisión a 390 px, respaldo y ZIP validado
con Python zipfile (nombres exactos, hashes, origen retirado, destino y Pokédex),
versiones consumidas, reimportación bloqueada, fusión de respaldo antiguo sin
liberar marcas, restauración en otro perfil y anulación confirmada con recarga.
Las rutas de las cinco generaciones, evoluciones, idioma y bolsillos se prueban
también con Node. No se recorrió cada combinación de ruta/objeto/idioma en la
interfaz, ni Firefox/Safari ni un móvil físico; tampoco instalación en consola
o emulador real. No se usa el banco ni las credenciales reales del usuario.

The move browser suite covers required cartridge language, Crystal→GBA item
evolution, mobile-width review, independently validated ZIP, consumed versions,
reimport protection, old-backup merge, isolated restore and confirmed cancellation.
Node tests cover all generations, evolution branches, languages and bag pockets.
Every route/item/language combination was not replayed in the UI. Firefox,
Safari, physical phones, consoles and emulator gameplay remain untested.

## English

Demo edits stay in memory. Importing/restoring from demo can enter the real bank
only if persisted data remains empty. Exiting reloads IndexedDB. Revision checks
and writes share one transaction, so stale tabs cannot overwrite newer changes.

Database `pokevault-r36s-v1` opens version 2. Legacy schema-1 records remain
readable; the first valid write atomically stores schema-2 metadata and immutable
originals in a SHA-256-indexed `blobs` store. Pokémon keys remain stable. Editing
notes/favorites does not rewrite original bytes. Do not downgrade against this
database. Unknown states block writes and offer JSON recovery of all stores,
keys and available bytes.

Portable `.pvault` v2 includes a blob dictionary, saves, original backups with
dates/reasons, boxes, favorites, notes, up to 25 snapshots and preparation history.
v1 imports remain supported. Hashes, languages, dates, references and the combined
100-save limit are validated. Merging preserves current organization; existing
restore points have priority within the 25-point limit. Unreadable v2 saves
remain quarantined and downloadable, never used for transfers. Incorrect hashes
block normal restoration; recovery retains original evidence without silently
changing it.

Persistence is requested, not guaranteed. The UI reports the browser's decision
and storage estimate. External backups are still required. The backup timestamp
records clicking Download, not successful filesystem storage; verify the file.
See [StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

Crystal checks the entire active-box payload against its bank copy on import
and again after writing. This follows [pokecrystal's SaveBoxAddress/LoadBoxAddress](https://github.com/pret/pokecrystal/blob/master/engine/menus/save.asm).
Differences are blocked rather than silently selecting one copy. Save in-game
and import again if this warning appears.

Run `npm test` and `npm run test:auth` (install server dependencies first).
For browser regressions, install Playwright and Chromium with the commands above
and run `npm run test:browser`. Tests use synthetic data, random credentials,
a temporary loopback server and isolated Chromium profiles. They cover demo
isolation, legacy migration, deduplication, stale revisions, failed writes,
portable restoration, confirmed retirement, quarantine, unknown schemas and
logout during an open task. They do not touch the user's actual bank.

Chromium coverage does not establish Safari/iOS, virtual-keyboard or physical
console compatibility, and does not simulate a large distributed traffic attack.
