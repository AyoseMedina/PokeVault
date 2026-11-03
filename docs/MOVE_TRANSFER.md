# Mover Pokémon (intercambio realista) · Move Pokémon (realistic trade)

## Español

**Estado:** implementada localmente por fases, sin publicar el sitio. Política:
`pokevault-move-v1`. Bloqueos conservadores y fuentes en
[MOVE_IMPLEMENTATION.md](MOVE_IMPLEMENTATION.md), incluido renombrado por idioma
del juego de destino (corrección autorizada del 2026-11-03).

### Objetivo

Las transferencias dejan de ser copias: el Pokémon **sale del guardado de origen
y entra en el de destino**, como en un intercambio real. No debe ser posible
obtener el mismo Pokémon dos veces mediante PokéVault. La honestidad final
(instalar ambos archivos y no restaurar copias antiguas a mano) depende del
usuario; la aplicación no debe facilitar el clonado.

Decisiones del usuario:

1. **Mover sustituye a copiar.** No se ofrece un modo de copia que deje el
   Pokémon en el origen.
2. **Cristal → GBA personalizada se mantiene** (`docs/CUSTOM_TRANSFER.md`),
   ahora también como movimiento.
3. **Evolución por intercambio activa** en las rutas que equivalen a un
   intercambio (ver más abajo).
4. **Los archivos resultantes conservan el nombre y la extensión exactos** del
   archivo importado (`.srm` en R36S/RetroArch, `.sav` en Wii u otros, `.dsv`
   en DraStic), para pegarlos directamente en la SD. Aplica a Game Boy, GBA y DS.

### Rutas y evolución por intercambio

| Ruta | Movimiento | Evolución por intercambio |
|------|-----------|---------------------------|
| Misma generación I, II, III, IV, V (partidas distintas) | Sí | Sí |
| I → II (Cápsula del Tiempo) | Sí | Sí (la Cápsula es un intercambio) |
| II → III personalizada Cristal → GBA | Sí | Sí (decisión del usuario) |
| III → IV (Parque Compi) | Sí | No (en el juego real no evoluciona) |
| IV → V (Pokétransfer) | Sí | No (en el juego real no evoluciona) |
| III → IV → V | Sí | No |
| Origen y destino en la misma partida | Bloqueado: se hace dentro del juego | — |
| Hacia atrás / II → IV/V | Bloqueado (sin cambios) | — |

Evoluciones que se aplican al **llegar** al destino, con los datos de la
generación de destino:

- Sin objeto: Kadabra → Alakazam, Machoke → Machamp, Graveler → Golem,
  Haunter → Gengar; en generación V además Boldore → Gigalith y
  Gurdurr → Conkeldurr.
- Karrablast / Shelmet requieren intercambiarse entre sí: sin contrapartida no
  evolucionan (se indica en la revisión).
- Con objeto equipado, en la generación donde exista cada evolución: Poliwhirl
  + Roca del Rey → Politoed, Slowpoke + Roca del Rey → Slowking, Onix +
  Revestimiento Metálico → Steelix, Scyther + Revestimiento Metálico → Scizor,
  Seadra + Escama Dragón → Kingdra, Porygon + Mejora → Porygon2, Clamperl +
  Diente Marino / Escama Marina → Huntail / Gorebyss, Rhydon + Protector,
  Electabuzz + Electrizador, Magmar + Magmatizador, Porygon2 + Disco Extraño,
  Dusclops + Tela Terrible, Feebas + Escama Bella (V). **El objeto se consume**
  al evolucionar, como en el juego. Las tablas salen de pret/PKHeX por generación.
- **Piedra Eterna** evita la evolución, como en el juego. No se ofrece otra
  casilla para evitar la evolución.

### Objetos equipados

En un intercambio real el objeto viaja con el Pokémon.

- **Misma generación (II–V):** se permite el objeto si existe en el juego de
  destino según una tabla de objetos por juego verificada (por ejemplo, objetos
  de HGSS que no existen en DP). Si no existe, se bloquea. Las Cartas se bloquean
  en v1 (tienen datos aparte en el guardado).
- **I → II:** sin cambios (la tasa de captura pasa a objeto según la Cápsula del Tiempo).
- **Entre generaciones:** usar las tablas de `docs/ITEM_TRANSFER.md` /
  `dist/item-transfer-data.js`, generadas desde PKHeX con
  `scripts/build-item-transfer.mjs`:
  - **II → III personalizada:** equivalencia PKHeX II → IV → III. Se bloquean MT,
    Cartas y objetos sin equivalente. La revisión muestra el nombre nuevo (por
    ejemplo, Baya → Baya Aranja).
  - **III → IV (Parque Compi):** el objeto se conserva convertido, como en el
    juego real. Se bloquea si no se puede equipar en el juego de destino.
  - **IV → V (Pokétransfer):** como en el juego real, **el objeto vuelve a la
    mochila del guardado de Gen IV de origen** y el Pokémon llega sin él. Hay que
    escribir el bolsillo correcto, verificado con pokeplatinum/pokeheartgold y
    PKHeX, y recalcular el CRC del bloque general. Si no hay hueco o el máximo
    de unidades está lleno, se bloquea.
  - **III → IV → V:** bloqueado con objeto.
  - No se borra ni se sustituye ningún objeto en silencio.

Cambios al evolucionar, verificados con pret (pokeyellow, pokecrystal,
pokeemerald, pokefirered), pokeplatinum/pokeheartgold y PKHeX antes de escribir:

- Especie (en generación I, índice interno, lista de especies y tipos de la
  estructura de caja). Experiencia, nivel, DVs/IVs, EVs, PID, OT, movimientos,
  PP, amistad y cintas se conservan salvo que la fuente primaria indique otra cosa.
- Mote: seguir el idioma del **juego de destino**. Esmeralda/RF/VH renombra solo
  si coinciden idioma del Pokémon y juego, y nombre anterior de especie.
  Rubí/Zafiro depende de revisión: si las variantes verificadas discrepan,
  bloquear sin inventar la revisión. IV usa el nombre del cartucho cuando no
  hay mote (bit de mote), aunque el Pokémon sea extranjero. En V, bloquear el
  renombrado extranjero sin mote hasta verificarlo con una rutina primaria.
  Los motes se conservan intactos. III pide idioma al importar; IV/V lo leen
  de campos verificados. Si falta el idioma necesario, bloquear la evolución.
- Habilidad (III–V): misma posición de habilidad, de la especie evolucionada.
- Si la especie evolucionada aprende un movimiento **exactamente en el nivel
  actual**, se **bloquea** con una explicación: el juego pediría elegir y
  PokéVault no inventa esa elección.
- Comprobar y aplicar solo lo verificado sobre otros efectos de un intercambio
  real (por ejemplo, amistad). No añadir cambios no documentados.
- La identidad para detectar duplicados se comprueba antes y después de evolucionar.

### Escritura en el origen (retirar el Pokémon)

Mismas garantías que el destino: copia de trabajo, rangos permitidos, checksums,
relectura y comprobación de que **los demás Pokémon del origen siguen idénticos**.

- **Amarillo (I):** quitar la entrada de la lista de la caja y **compactar**
  (lista de especies, datos, OT y motes), contador −1 y terminador `0xFF`.
  Actualizar la caja activa (`0x30C0`) si es la actual y la copia del banco si
  las cajas están inicializadas. Recalcular los checksums del banco y el principal
  (`0x3523`). Los Pokémon desplazados cambian de casilla: la verificación
  compara por orden y contenido, no por casilla.
- **Cristal (II):** compactar igual en el banco y en `sBox` (`0x2D10`) si es
  la caja activa. Comprobar antes que `sBox` coincide con la copia del banco.
- **GBA (III):** poner a cero los 80 bytes de la casilla en la copia activa y
  recalcular los checksums de sector.
- **DS (IV/V):** vaciar la casilla **igual que el juego** (verificar si escribe
  ceros o la estructura vacía cifrada) y recalcular el CRC de almacenamiento
  (IV, incluida la marca de caja modificada de HGSS) o el CRC del bloque y su
  espejo (V). La casilla debe leerse como vacía.
- Solo desde el PC (el equipo sigue bloqueado). Si hay varios orígenes, se genera
  un archivo modificado por cada uno.

### Paquete ZIP

```
copiar-a-la-SD/gb/<nombre exacto>.srm|.sav      (Amarillo)
copiar-a-la-SD/gbc/<nombre exacto>.srm|.sav     (Cristal)
copiar-a-la-SD/gba/<nombre exacto>.srm|.sav
copiar-a-la-SD/nds/<nombre exacto>.dsv|.sav|.srm
originales/…                                     (respaldo; NO copiar a la SD)
manifiesto.json
LEEME.txt
```

- Nombre exacto del archivo importado, sin `safeName` que cambie espacios ni
  acentos. Solo se rechazan separadores de ruta, `..` y caracteres de control.
  Si dos archivos de la misma carpeta comparten nombre, se bloquea.
- Mismo tamaño y contenedor: el pie DSV se conserva íntegro.
- `manifiesto.json`: por cada archivo, el SHA-256 **que debe tener en la SD antes**
  y el SHA-256 resultante, más los movimientos y las evoluciones.
- `LEEME.txt`: comprobar el hash de **todos** los archivos de la SD, copiar **todos**
  los de `copiar-a-la-SD` o ninguno, y no usar `originales/` salvo para deshacer.
  Retirar el texto actual que dice «II a III bloqueado».

### Evitar el clonado dentro de PokéVault

- Al exportar, las versiones usadas (todos los orígenes y el destino) se marcan
  como **consumidas** (`consumedBy`, `consumedAt`). No pueden volver a usarse como
  origen ni destino. En el banco, sus Pokémon aparecen como «trasladado» y no se
  pueden seleccionar.
- Se bloquea importar de nuevo un hash consumido, incluidos los archivos de
  `originales/`, con un mensaje claro.
- La marca se conserva en el respaldo `.pvault` (campo opcional; los respaldos
  anteriores siguen siendo válidos) y la restauración la respeta.
- «Anular exportación» (si no se llegó a instalar) libera las versiones solo tras
  una confirmación explícita. Queda registrado en el historial.
- Para la siguiente transferencia hay que importar los archivos nuevos desde la SD.

### Pokédex del destino (autorizado por el usuario)

Como en un intercambio real, el destino registra la especie recibida como vista
y capturada y, si evoluciona, también la especie evolucionada. Esto sustituye a
la regla anterior de «no se modifica la Pokédex» solo para esta política.

- Replicar la rutina de registro del juego (pret; PKHeX `SetDex` como
  referencia), incluidos los datos extra que guarde esa generación: formas de
  Unown (II–IV), género, forma e idioma vistos (IV–V), etc. No se activa la
  Pokédex Nacional ni otro progreso; solo se marcan las especies.
- Actualizar **todas las copias** que mantiene el juego: en GBA, las marcas de
  vistos duplicadas en otras secciones; en Cristal, la copia de respaldo del
  bloque principal si el juego la mantiene igual. Recalcular los checksums o CRC
  afectados (Amarillo `0x3523`; Cristal principal y respaldo; GBA, sectores; IV,
  bloque general; V, bloque de Pokédex y su espejo).
- Añadir estos rangos a la máscara de escritura permitida y verificarlos al
  releer: las marcas de las demás especies no cambian.
- Las marcas del origen no cambian (en el juego real, quien envía tampoco las pierde).

### Diferencias inevitables con un intercambio real

- El envío es en una sola dirección: no se recibe otro Pokémon a cambio.
- El Pokémon llega a una caja del PC, no al equipo.
- No se actualizan los contadores de estadísticas del juego (número de
  intercambios en la ficha de entrenador). Se puede valorar en una versión futura.

### Pruebas mínimas

Movimiento para cada generación (incluidos la compactación GB y la caja activa),
cada evolución con y sin mote y con Piedra Eterna, evoluciones con objeto
(objeto consumido), objetos equipados en la misma generación (permitido y
objeto inexistente en el destino), Pokédex del destino (todas las copias y
checksums, sin cambiar otras especies), bloqueo por movimiento en el
nivel actual, Karrablast/Shelmet, III→IV y IV→V sin evolución, nombres y
extensiones exactos (`.srm`, `.sav`, `.dsv`), hashes consumidos, reimportación
bloqueada y `.pvault` con y sin la marca.

## English (summary)

User-authorized policy `pokevault-move-v1`, implemented locally with documented
conservative blocks (see MOVE_IMPLEMENTATION.md); no site deployment. Transfers
**move** Pokémon: they are removed from the source save and placed in the
destination, which replaces copy mode. Custom Crystal → GBA remains. Trade
evolutions (Kadabra, Machoke, Graveler, Haunter; Boldore and Gurdurr in Gen V)
apply for same-generation moves, I → II and custom II → III, but not for Pal Park
(III → IV) or Poké Transfer (IV → V). An Everstone prevents them. Item-based
evolutions are included and consume the item. Held items travel with the Pokémon
in same-generation moves when the destination game has the item (mail is
blocked). Cross-generation item blocks stay until a mapping is verified. The
destination Pokédex registers the received species (and the evolved one)
in every copy the game keeps, with checksums recalculated. Evolution names follow
destination cartridge rules: Emerald/FRLG require matching Pokémon language;
IV uses the cartridge name for unnicknamed foreign Pokémon. Ambiguous R/S ROM
revisions and unverified foreign Gen V renaming block. Moves
learned at the current level block the operation. The ZIP has
`copiar-a-la-SD/<system>/` with every changed save under its exact imported
filename and extension (.srm/.sav/.dsv, DSV footer intact). Used save versions
become consumed: they cannot be reused or re-imported, and the flag survives
.pvault backups. Source removal follows each format (GB list compaction,
active box, checksums/CRCs) and is verified like the destination.
