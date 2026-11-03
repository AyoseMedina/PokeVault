# Equivalencias de objetos equipados · Held item equivalence

> Generado por `scripts/build-item-transfer.mjs` desde PKHeX (GPL-3.0), commit
> `0660d1e1f4924b8478daec73281bb8071a82ad19` (`ItemConverter.cs`, `Items/ItemStorage*.cs`). No editar a mano.
> Datos para la aplicación: `dist/item-transfer-data.js`. Política: `docs/MOVE_TRANSFER.md`.

## Resumen por ruta

Las tablas incluyen también nombres ES/EN y bolsillos Gen IV generados desde
PlayerBag4DP/Pt/HGSS: offsets relativos al bloque general, capacidad, máximo y
IDs del bolsillo. Se contrastan con pret; ver MOVE_IMPLEMENTATION.md. Las MT y
bayas se ordenan como en Bag_TryAddItem/Bag_AddItem al devolver un objeto.

The generated data also includes Spanish/English names and Gen IV bag pockets
from PlayerBag4DP/Pt/HGSS. Returns preserve all other quantities, enforce native
stack limits and sort TM/berry pockets as the games do. See MOVE_IMPLEMENTATION.md.

| Ruta | Juego real | Política PokéVault |
|---|---|---|
| Misma generación | El objeto viaja con el Pokémon | Se permite si el objeto se puede equipar en el juego de destino (tabla al final); Cartas bloqueadas |
| I → II (Cápsula del Tiempo) | La tasa de captura se lee como objeto | Sin cambios (ya implementado) |
| II → III Cristal → GBA (personalizada) | No existe | Equivalencia PKHeX II → IV → III; MT, Cartas y objetos sin equivalente bloqueados |
| III → IV (Parque Compi) | **Conserva el objeto** | Equivalencia PKHeX `GetItemFuture3`; se bloquea si no existe o no se puede equipar en el destino |
| IV → V (Pokétransfer) | **El objeto vuelve a la mochila del juego de Gen IV** y el Pokémon llega sin él | Escribir el objeto en la mochila del guardado de origen (Gen IV), que en modo mover también se modifica. Si no hay espacio o no se puede escribir de forma verificada, se bloquea. PKHeX conserva el objeto, pero el juego real no |
| III → IV → V | Parque Compi y después Pokétransfer | Se bloquea con objeto (el objeto acabaría en una mochila de Gen IV intermedia que no existe) |

Nunca se borra ni se sustituye un objeto en silencio. Las bayas de Cristal tienen
otro nombre en GBA (por ejemplo, Baya → Baya Aranja): es la equivalencia de PKHeX
y debe mostrarse en la revisión.

## Cristal → GBA (108 permitidos de 192)

| ID | Objeto origen | Destino | Estado |
|---:|---|---|---|
| 1 | Master Ball (Master Ball) | 1 · Master Ball (Master Ball) | ✅ |
| 2 | Ultra Ball (Ultra Ball) | 2 · Ultra Ball (Ultra Ball) | ✅ |
| 3 | Polvo brillo (BrightPowder) | 179 · Polvo Brillo (BrightPowder) | ✅ |
| 4 | Super Ball (Great Ball) | 3 · Super Ball (Great Ball) | ✅ |
| 5 | Poké Ball (Poké Ball) | 4 · Poké Ball (Poké Ball) | ✅ |
| 8 | Piedra Lunar (Moon Stone) | 94 · Piedra Lunar (Moon Stone) | ✅ |
| 9 | Antídoto (Antidote) | 14 · Antídoto (Antidote) | ✅ |
| 10 | Antiquemar (Burn Heal) | 15 · Antiquemar (Burn Heal) | ✅ |
| 11 | Antihielo (Ice Heal) | 16 · Antihielo (Ice Heal) | ✅ |
| 12 | Despertar (Awakening) | 17 · Despertar (Awakening) | ✅ |
| 13 | Antiparalizador (Parlyz Heal) | 18 · Antiparalizador (Parlyz Heal) | ✅ |
| 14 | Restaurar Todo (Full Restore) | 19 · Restaurar Todo (Full Restore) | ✅ |
| 15 | Poción Máxima (Max Potion) | 20 · Poción Máxima (Max Potion) | ✅ |
| 16 | Hiperpoción (Hyper Potion) | 21 · Hiperpoción (Hyper Potion) | ✅ |
| 17 | Superpoción (Super Potion) | 22 · Superpoción (Super Potion) | ✅ |
| 18 | Poción (Potion) | 13 · Poción (Potion) | ✅ |
| 19 | Cuerda Huida (Escape Rope) | 85 · Cuerda Huida (Escape Rope) | ✅ |
| 20 | Repelente (Repel) | 86 · Repelente (Repel) | ✅ |
| 21 | Elixir Máximo (Max Elixer) | 37 · Elixir Máximo (Max Elixir) | ✅ |
| 22 | Piedra Fuego (Fire Stone) | 95 · Piedra Fuego (Fire Stone) | ✅ |
| 23 | Piedra Trueno (Thunder Stone) | 96 · Piedra Trueno (Thunder Stone) | ✅ |
| 24 | Piedra Agua (Water Stone) | 97 · Piedra Agua (Water Stone) | ✅ |
| 26 | Más PS (HP Up) | 63 · Más PS (HP Up) | ✅ |
| 27 | Proteína (Protein) | 64 · Proteína (Protein) | ✅ |
| 28 | Hierro (Iron) | 65 · Hierro (Iron) | ✅ |
| 29 | Carburante (Carbos) | 66 · Carburante (Carbos) | ✅ |
| 30 | Puño suerte (Lucky Punch) | 222 · Puño Suerte (Lucky Punch) | ✅ |
| 31 | Calcio (Calcium) | 67 · Calcio (Calcium) | ✅ |
| 32 | Caramelo Raro (Rare Candy) | 68 · Caramelo Raro (Rare Candy) | ✅ |
| 33 | Precisión X (X Accuracy) | 78 · Precisión X (X Accuracy) | ✅ |
| 34 | Piedra Hoja (Leaf Stone) | 98 · Piedra Hoja (Leaf Stone) | ✅ |
| 35 | Polvo metálico (Metal Powder) | 223 · Polvo Metálico (Metal Powder) | ✅ |
| 36 | Pepita (Nugget) | 110 · Pepita (Nugget) | ✅ |
| 37 | Poké Muñeco (Poké Doll) | 80 · Poké Muñeco (Poké Doll) | ✅ |
| 38 | Cura Total (Full Heal) | 23 · Cura Total (Full Heal) | ✅ |
| 39 | Revivir (Revive) | 24 · Revivir (Revive) | ✅ |
| 40 | Revivir Máximo (Max Revive) | 25 · Revivir Máximo (Max Revive) | ✅ |
| 41 | Protec. Especial (Guard Spec.) | 73 · Protec. Especial (Guard Spec.) | ✅ |
| 42 | Superrepelente (Super Repel) | 83 · Superrepelente (Super Repel) | ✅ |
| 43 | Repelente Máximo (Max Repel) | 84 · Repelente Máximo (Max Repel) | ✅ |
| 44 | Directo (Dire Hit) | 74 · Directo (Dire Hit) | ✅ |
| 46 | Agua Fresca (Fresh Water) | 26 · Agua Fresca (Fresh Water) | ✅ |
| 47 | Refresco (Soda Pop) | 27 · Refresco (Soda Pop) | ✅ |
| 48 | Limonada (Lemonade) | 28 · Limonada (Lemonade) | ✅ |
| 49 | Ataque X (X Attack) | 75 · Ataque X (X Attack) | ✅ |
| 51 | Defensa X (X Defend) | 76 · Defensa X (X Defend) | ✅ |
| 52 | Velocidad X (X Speed) | 77 · Velocidad X (X Speed) | ✅ |
| 53 | Especial X (X Special) | 79 · Especial X (X Special) | ✅ |
| 57 | Repartir Exp (Exp Share) | 182 · Repartir Exp (Exp. Share) | ✅ |
| 60 | Hoja plata (Silver Leaf) | — | ⛔ Sin equivalente en generaciones posteriores |
| 62 | Más PP (PP Up) | 69 · Más PP (PP Up) | ✅ |
| 63 | Éter (Ether) | 34 · Éter (Ether) | ✅ |
| 64 | Éter Máximo (Max Ether) | 35 · Éter Máximo (Max Ether) | ✅ |
| 65 | Elixir (Elixer) | 36 · Elixir (Elixir) | ✅ |
| 72 | Leche Mu-mu (Moomoo Milk) | 29 · Leche Mu-mu (Moomoo Milk) | ✅ |
| 73 | Garra Rápida (Quick Claw) | 183 · Garra Rápida (Quick Claw) | ✅ |
| 74 | Bayantídoto (PSNCureBerry) | 135 · Baya Meloc (Pecha Berry) | ✅ |
| 75 | Hoja oro (Gold Leaf) | — | ⛔ Sin equivalente en generaciones posteriores |
| 76 | Arena Fina (Soft Sand) | 203 · Arena Fina (Soft Sand) | ✅ |
| 77 | Pico Afilado (Sharp Beak) | 210 · Pico Afilado (Sharp Beak) | ✅ |
| 78 | Antiparabaya (PRZCureBerry) | 133 · Baya Zreza (Cheri Berry) | ✅ |
| 79 | Antiquembaya (Burnt Berry) | 137 · Baya Perasi (Aspear Berry) | ✅ |
| 80 | Baya Hielo (Ice Berry) | 136 · Baya Safre (Rawst Berry) | ✅ |
| 81 | Flecha venenosa (Poison Barb) | 211 · Flecha Venenosa (Poison Barb) | ✅ |
| 82 | Roca del Rey (King's Rock) | 187 · Roca del Rey (King's Rock) | ✅ |
| 83 | Bayamarga (Bitter Berry) | 140 · Baya Caquic (Persim Berry) | ✅ |
| 84 | Baya Menta (Mint Berry) | 134 · Baya Atania (Chesto Berry) | ✅ |
| 85 | Bonguri rojo (Red Apricorn) | — | ⛔ No existe en generación III |
| 86 | Mini Seta (TinyMushroom) | 103 · Mini Seta (TinyMushroom) | ✅ |
| 87 | Seta Grande (Big Mushroom) | 104 · Seta Grande (Big Mushroom) | ✅ |
| 88 | Polvo Plata (SilverPowder) | 188 · Polvo Plata (SilverPowder) | ✅ |
| 89 | Bonguri azul (Blu Apricorn) | — | ⛔ No existe en generación III |
| 91 | Moneda Amuleto (Amulet Coin) | 189 · Moneda Amuleto (Amulet Coin) | ✅ |
| 92 | Bonguri amarillo (Ylw Apricorn) | — | ⛔ No existe en generación III |
| 93 | Bonguri verde (Grn Apricorn) | — | ⛔ No existe en generación III |
| 94 | Amuleto (Cleanse Tag) | 190 · Amuleto (Cleanse Tag) | ✅ |
| 95 | Agua Mística (Mystic Water) | 209 · Agua Mística (Mystic Water) | ✅ |
| 96 | Cuchara Torcida (TwistedSpoon) | 214 · Cuchara Torcida (TwistedSpoon) | ✅ |
| 97 | Bonguri blanco (Wht Apricorn) | — | ⛔ No existe en generación III |
| 98 | Cinturón Negro (Black Belt) | 207 · Cinturón Negro (Black Belt) | ✅ |
| 99 | Bonguri negro (Blk Apricorn) | — | ⛔ No existe en generación III |
| 101 | Bonguri rosa (Pnk Apricorn) | — | ⛔ No existe en generación III |
| 102 | Gafas de Sol (BlackGlasses) | 206 · Gafas de Sol (BlackGlasses) | ✅ |
| 103 | Cola Slowpoke (SlowpokeTail) | — | ⛔ No existe en generación III |
| 104 | Lazo rosa (Pink Bow) | — | ⛔ Sin equivalente en generaciones posteriores |
| 105 | Palo (Stick) | 225 · Palo (Stick) | ✅ |
| 106 | Bola humo (Smoke Ball) | 194 · Bola Humo (Smoke Ball) | ✅ |
| 107 | Antiderretir (NeverMeltIce) | 212 · Antiderretir (NeverMeltIce) | ✅ |
| 108 | Imán (Magnet) | 208 · Imán (Magnet) | ✅ |
| 109 | Baya Milagro (MiracleBerry) | 141 · Baya Ziuela (Lum Berry) | ✅ |
| 110 | Perla (Pearl) | 106 · Perla (Pearl) | ✅ |
| 111 | Perla Grande (Big Pearl) | 107 · Perla Grande (Big Pearl) | ✅ |
| 112 | Piedra Eterna (Everstone) | 195 · Piedra Eterna (Everstone) | ✅ |
| 113 | Hechizo (Spell Tag) | 213 · Hechizo (Spell Tag) | ✅ |
| 114 | Caramelo furia (RageCandyBar) | — | ⛔ No existe en generación III |
| 117 | Semilla milagro (Miracle Seed) | 205 · Semilla Milagro (Miracle Seed) | ✅ |
| 118 | Hueso grueso (Thick Club) | 224 · Hueso Grueso (Thick Club) | ✅ |
| 119 | Cinta Focus (Focus Band) | 196 · Cinta Focus (Focus Band) | ✅ |
| 121 | Polvo Energía (EnergyPowder) | 30 · Polvo Energía (EnergyPowder) | ✅ |
| 122 | Raíz Energía (Energy Root) | 31 · Raíz Energía (Energy Root) | ✅ |
| 123 | Polvo Curación (Heal Powder) | 32 · Polvo Curación (Heal Powder) | ✅ |
| 124 | Hierba Revivir (Revival Herb) | 33 · Hierba Revivir (Revival Herb) | ✅ |
| 125 | Piedra dura (Hard Stone) | 204 · Piedra Dura (Hard Stone) | ✅ |
| 126 | Huevo Suerte (Lucky Egg) | 197 · Huevo Suerte (Lucky Egg) | ✅ |
| 131 | Polvoestelar (Stardust) | 108 · Polvoestelar (Stardust) | ✅ |
| 132 | Trozo Estrella (Star Piece) | 109 · Trozo Estrella (Star Piece) | ✅ |
| 138 | Carbón (Charcoal) | 215 · Carbón (Charcoal) | ✅ |
| 139 | Zumo de Baya (Berry Juice) | 44 · Zumo de Baya (Berry Juice) | ✅ |
| 140 | Periscopio (Scope Lens) | 198 · Periscopio (Scope Lens) | ✅ |
| 143 | Revest. Metálico (Metal Coat) | 199 · Revest. Metálico (Metal Coat) | ✅ |
| 144 | Colmillo Dragón (Dragon Fang) | 216 · Colmillo Dragón (Dragon Fang) | ✅ |
| 146 | Restos (Leftovers) | 200 · Restos (Leftovers) | ✅ |
| 150 | Baya Misterio (MysteryBerry) | 138 · Baya Zanama (Leppa Berry) | ✅ |
| 151 | Escamadragón (Dragon Scale) | 201 · Escamadragón (Dragon Scale) | ✅ |
| 152 | Gen loco (Berserk Gene) | — | ⛔ Sin equivalente en generaciones posteriores |
| 156 | Ceniza Sagrada (Sacred Ash) | 45 · Ceniza Sagrada (Sacred Ash) | ✅ |
| 157 | Peso Ball (Heavy Ball) | — | ⛔ No existe en generación III |
| 158 | Carta flor (Flower Mail) | — | ⛔ Carta: bloqueada |
| 159 | Nivel Ball (Level Ball) | — | ⛔ No existe en generación III |
| 160 | Cebo Ball (Lure Ball) | — | ⛔ Sin equivalente en generaciones posteriores |
| 161 | Rapid Ball (Fast Ball) | — | ⛔ No existe en generación III |
| 163 | Bolaluminosa (Light Ball) | 202 · Bolaluminosa (Light Ball) | ✅ |
| 164 | Amigo Ball (Friend Ball) | — | ⛔ No existe en generación III |
| 165 | Luna Ball (Moon Ball) | — | ⛔ No existe en generación III |
| 166 | Amor Ball (Love Ball) | — | ⛔ No existe en generación III |
| 167 | Caja Normal (Normal Box) | — | ⛔ Sin equivalente en generaciones posteriores |
| 168 | Caja Grande (Gorgeous Box) | — | ⛔ Sin equivalente en generaciones posteriores |
| 169 | Piedra Solar (Sun Stone) | 93 · Piedra Solar (Sun Stone) | ✅ |
| 170 | Cinta lunares (Polkadot Bow) | — | ⛔ Sin equivalente en generaciones posteriores |
| 172 | Mejora (Up-Grade) | 218 · Mejora (Up-Grade) | ✅ |
| 173 | Baya (Berry) | 139 · Baya Aranja (Oran Berry) | ✅ |
| 174 | Baya Dorada (Gold Berry) | 142 · Baya Zidra (Sitrus Berry) | ✅ |
| 180 | Ladrillo (Brick Piece) | — | ⛔ Sin equivalente en generaciones posteriores |
| 181 | Carta surf (Surf Mail) | — | ⛔ Carta: bloqueada |
| 182 | Carta azul (Litebluemail) | — | ⛔ Carta: bloqueada |
| 183 | Carta retrato (Portraitmail) | — | ⛔ Carta: bloqueada |
| 184 | Carta amor (Lovely Mail) | — | ⛔ Carta: bloqueada |
| 185 | Carta eón (Eon Mail) | — | ⛔ Carta: bloqueada |
| 186 | Carta morfosis (Morph Mail) | — | ⛔ Carta: bloqueada |
| 187 | Carta celeste (Bluesky Mail) | — | ⛔ Carta: bloqueada |
| 188 | Carta música (Music Mail) | — | ⛔ Carta: bloqueada |
| 189 | Carta espejismo (Mirage Mail) | — | ⛔ Carta: bloqueada |
| 191 | MT01 (TM01) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 192 | MT02 (TM02) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 193 | MT03 (TM03) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 194 | MT04 (TM04) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 196 | MT05 (TM05) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 197 | MT06 (TM06) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 198 | MT07 (TM07) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 199 | MT08 (TM08) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 200 | MT09 (TM09) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 201 | MT10 (TM10) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 202 | MT11 (TM11) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 203 | MT12 (TM12) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 204 | MT13 (TM13) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 205 | MT14 (TM14) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 206 | MT15 (TM15) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 207 | MT16 (TM16) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 208 | MT17 (TM17) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 209 | MT18 (TM18) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 210 | MT19 (TM19) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 211 | MT20 (TM20) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 212 | MT21 (TM21) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 213 | MT22 (TM22) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 214 | MT23 (TM23) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 215 | MT24 (TM24) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 216 | MT25 (TM25) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 217 | MT26 (TM26) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 218 | MT27 (TM27) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 219 | MT28 (TM28) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 221 | MT29 (TM29) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 222 | MT30 (TM30) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 223 | MT31 (TM31) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 224 | MT32 (TM32) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 225 | MT33 (TM33) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 226 | MT34 (TM34) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 227 | MT35 (TM35) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 228 | MT36 (TM36) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 229 | MT37 (TM37) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 230 | MT38 (TM38) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 231 | MT39 (TM39) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 232 | MT40 (TM40) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 233 | MT41 (TM41) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 234 | MT42 (TM42) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 235 | MT43 (TM43) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 236 | MT44 (TM44) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 237 | MT45 (TM45) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 238 | MT46 (TM46) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 239 | MT47 (TM47) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 240 | MT48 (TM48) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 241 | MT49 (TM49) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |
| 242 | MT50 (TM50) | — | ⛔ MT: el número de MT no corresponde al mismo movimiento entre generaciones |

## GBA → DS IV, Parque Compi (232 permitidos de 244)

⚠️ = el objeto existe en generación IV, pero no se puede equipar en algún juego de destino: se bloquea solo para ese destino.

| ID | Objeto origen | Destino | Estado |
|---:|---|---|---|
| 1 | Master Ball (Master Ball) | 1 · Master Ball (Master Ball) | ✅ |
| 2 | Ultra Ball (Ultra Ball) | 2 · Ultra Ball (Ultra Ball) | ✅ |
| 3 | Super Ball (Great Ball) | 3 · Super Ball (Great Ball) | ✅ |
| 4 | Poké Ball (Poké Ball) | 4 · Poké Ball (Poké Ball) | ✅ |
| 5 | Safari Ball (Safari Ball) | 5 · Safari Ball (Safari Ball) | ⚠️ No equipable en: dp, pt, hgss |
| 6 | Malla Ball (Net Ball) | 6 · Malla Ball (Net Ball) | ✅ |
| 7 | Buceo Ball (Dive Ball) | 7 · Buceo Ball (Dive Ball) | ✅ |
| 8 | Nido Ball (Nest Ball) | 8 · Nido Ball (Nest Ball) | ✅ |
| 9 | Acopio Ball (Repeat Ball) | 9 · Acopio Ball (Repeat Ball) | ✅ |
| 10 | Turno Ball (Timer Ball) | 10 · Turno Ball (Timer Ball) | ✅ |
| 11 | Lujo Ball (Luxury Ball) | 11 · Lujo Ball (Luxury Ball) | ✅ |
| 12 | Honor Ball (Premier Ball) | 12 · Honor Ball (Premier Ball) | ✅ |
| 13 | Poción (Potion) | 17 · Poción (Potion) | ✅ |
| 14 | Antídoto (Antidote) | 18 · Antídoto (Antidote) | ✅ |
| 15 | Antiquemar (Burn Heal) | 19 · Antiquemar (Burn Heal) | ✅ |
| 16 | Antihielo (Ice Heal) | 20 · Antihielo (Ice Heal) | ✅ |
| 17 | Despertar (Awakening) | 21 · Despertar (Awakening) | ✅ |
| 18 | Antiparalizador (Parlyz Heal) | 22 · Antiparalizador (Paralyze Heal) | ✅ |
| 19 | Restaurar Todo (Full Restore) | 23 · Restaurar Todo (Full Restore) | ✅ |
| 20 | Poción Máxima (Max Potion) | 24 · Poción Máxima (Max Potion) | ✅ |
| 21 | Hiperpoción (Hyper Potion) | 25 · Hiperpoción (Hyper Potion) | ✅ |
| 22 | Superpoción (Super Potion) | 26 · Superpoción (Super Potion) | ✅ |
| 23 | Cura Total (Full Heal) | 27 · Cura Total (Full Heal) | ✅ |
| 24 | Revivir (Revive) | 28 · Revivir (Revive) | ✅ |
| 25 | Revivir Máximo (Max Revive) | 29 · Revivir Máximo (Max Revive) | ✅ |
| 26 | Agua Fresca (Fresh Water) | 30 · Agua Fresca (Fresh Water) | ✅ |
| 27 | Refresco (Soda Pop) | 31 · Refresco (Soda Pop) | ✅ |
| 28 | Limonada (Lemonade) | 32 · Limonada (Lemonade) | ✅ |
| 29 | Leche Mu-mu (Moomoo Milk) | 33 · Leche Mu-mu (Moomoo Milk) | ✅ |
| 30 | Polvo Energía (EnergyPowder) | 34 · Polvo Energía (Energy Powder) | ✅ |
| 31 | Raíz Energía (Energy Root) | 35 · Raíz Energía (Energy Root) | ✅ |
| 32 | Polvo Curación (Heal Powder) | 36 · Polvo Curación (Heal Powder) | ✅ |
| 33 | Hierba Revivir (Revival Herb) | 37 · Hierba Revivir (Revival Herb) | ✅ |
| 34 | Éter (Ether) | 38 · Éter (Ether) | ✅ |
| 35 | Éter Máximo (Max Ether) | 39 · Éter Máximo (Max Ether) | ✅ |
| 36 | Elixir (Elixir) | 40 · Elixir (Elixir) | ✅ |
| 37 | Elixir Máximo (Max Elixir) | 41 · Elixir Máximo (Max Elixir) | ✅ |
| 38 | Galleta Lava (Lava Cookie) | 42 · Galleta Lava (Lava Cookie) | ✅ |
| 39 | Flauta Azul (Blue Flute) | 65 · Flauta Azul (Blue Flute) | ✅ |
| 40 | Flauta Amarilla (Yellow Flute) | 66 · Flauta Amarilla (Yellow Flute) | ✅ |
| 41 | Flauta Roja (Red Flute) | 67 · Flauta Roja (Red Flute) | ✅ |
| 42 | Flauta Negra (Black Flute) | 68 · Flauta Negra (Black Flute) | ✅ |
| 43 | Flauta Blanca (White Flute) | 69 · Flauta Blanca (White Flute) | ✅ |
| 44 | Zumo de Baya (Berry Juice) | 43 · Zumo de Baya (Berry Juice) | ✅ |
| 45 | Ceniza Sagrada (Sacred Ash) | 44 · Ceniza Sagrada (Sacred Ash) | ✅ |
| 46 | Sal Cardumen (Shoal Salt) | 70 · Sal Cardumen (Shoal Salt) | ✅ |
| 47 | Concha Cardumen (Shoal Shell) | 71 · Concha Cardumen (Shoal Shell) | ✅ |
| 48 | Parte Roja (Red Shard) | 72 · Parte Roja (Red Shard) | ✅ |
| 49 | Parte Azul (Blue Shard) | 73 · Parte Azul (Blue Shard) | ✅ |
| 50 | Parte Amarilla (Yellow Shard) | 74 · Parte Amarilla (Yellow Shard) | ✅ |
| 51 | Parte Verde (Green Shard) | 75 · Parte Verde (Green Shard) | ✅ |
| 63 | Más PS (HP Up) | 45 · Más PS (HP Up) | ✅ |
| 64 | Proteína (Protein) | 46 · Proteína (Protein) | ✅ |
| 65 | Hierro (Iron) | 47 · Hierro (Iron) | ✅ |
| 66 | Carburante (Carbos) | 48 · Carbohidratos (Carbos) | ✅ |
| 67 | Calcio (Calcium) | 49 · Calcio (Calcium) | ✅ |
| 68 | Caramelo Raro (Rare Candy) | 50 · Caramelo Raro (Rare Candy) | ✅ |
| 69 | Más PP (PP Up) | 51 · Más PP (PP Up) | ✅ |
| 70 | Zinc (Zinc) | 52 · Zinc (Zinc) | ✅ |
| 71 | PP Máximos (PP Max) | 53 · PP Máximos (PP Max) | ✅ |
| 73 | Protec. Especial (Guard Spec.) | 55 · Protección X (Guard Spec.) | ✅ |
| 74 | Directo (Dire Hit) | 56 · Crítico X (Dire Hit) | ✅ |
| 75 | Ataque X (X Attack) | 57 · Ataque X (X Attack) | ✅ |
| 76 | Defensa X (X Defend) | 58 · Defensa X (X Defense) | ✅ |
| 77 | Velocidad X (X Speed) | 59 · Velocidad X (X Speed) | ✅ |
| 78 | Precisión X (X Accuracy) | 60 · Precisión X (X Accuracy) | ✅ |
| 79 | Especial X (X Special) | 61 · Ataque Especial X (X Sp. Atk) | ✅ |
| 80 | Poké Muñeco (Poké Doll) | 63 · Pokémuñeco (Poké Doll) | ✅ |
| 81 | Cola Skitty (Fluffy Tail) | 64 · Cola de Skitty (Fluffy Tail) | ✅ |
| 83 | Superrepelente (Super Repel) | 76 · Superrepelente (Super Repel) | ✅ |
| 84 | Repelente Máximo (Max Repel) | 77 · Repelente Máximo (Max Repel) | ✅ |
| 85 | Cuerda Huida (Escape Rope) | 78 · Cuerda Huida (Escape Rope) | ✅ |
| 86 | Repelente (Repel) | 79 · Repelente (Repel) | ✅ |
| 93 | Piedra Solar (Sun Stone) | 80 · Piedra Solar (Sun Stone) | ✅ |
| 94 | Piedra Lunar (Moon Stone) | 81 · Piedra Lunar (Moon Stone) | ✅ |
| 95 | Piedra Fuego (Fire Stone) | 82 · Piedra Fuego (Fire Stone) | ✅ |
| 96 | Piedra Trueno (Thunder Stone) | 83 · Piedra Trueno (Thunder Stone) | ✅ |
| 97 | Piedra Agua (Water Stone) | 84 · Piedra Agua (Water Stone) | ✅ |
| 98 | Piedra Hoja (Leaf Stone) | 85 · Piedra Hoja (Leaf Stone) | ✅ |
| 103 | Mini Seta (TinyMushroom) | 86 · Miniseta (Tiny Mushroom) | ✅ |
| 104 | Seta Grande (Big Mushroom) | 87 · Seta Grande (Big Mushroom) | ✅ |
| 106 | Perla (Pearl) | 88 · Perla (Pearl) | ✅ |
| 107 | Perla Grande (Big Pearl) | 89 · Perla Grande (Big Pearl) | ✅ |
| 108 | Polvoestelar (Stardust) | 90 · Polvo Estelar (Stardust) | ✅ |
| 109 | Trozo Estrella (Star Piece) | 91 · Trozo de Estrella (Star Piece) | ✅ |
| 110 | Pepita (Nugget) | 92 · Pepita de Oro (Nugget) | ✅ |
| 111 | Escama Corazón (Heart Scale) | 93 · Escama Corazón (Heart Scale) | ✅ |
| 121 | Carta Naranja (Orange Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 122 | Carta Puerto (Harbor Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 123 | Carta Brillo (Glitter Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 124 | Carta Imán (Mech Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 125 | Carta Madera (Wood Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 126 | Carta Ola (Wave Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 127 | Carta Imagen (Bead Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 128 | Carta Sombra (Shadow Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 129 | Carta Tropical (Tropic Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 130 | Carta Sueño (Dream Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 131 | Carta Fabulosa (Fab Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 132 | Carta Retro (Retro Mail) | — | ⛔ Carta: no puede estar en el PC del juego real |
| 133 | Baya Zreza (Cheri Berry) | 149 · Baya Zreza (Cheri Berry) | ✅ |
| 134 | Baya Atania (Chesto Berry) | 150 · Baya Atania (Chesto Berry) | ✅ |
| 135 | Baya Meloc (Pecha Berry) | 151 · Baya Meloc (Pecha Berry) | ✅ |
| 136 | Baya Safre (Rawst Berry) | 152 · Baya Safre (Rawst Berry) | ✅ |
| 137 | Baya Perasi (Aspear Berry) | 153 · Baya Perasi (Aspear Berry) | ✅ |
| 138 | Baya Zanama (Leppa Berry) | 154 · Baya Zanama (Leppa Berry) | ✅ |
| 139 | Baya Aranja (Oran Berry) | 155 · Baya Aranja (Oran Berry) | ✅ |
| 140 | Baya Caquic (Persim Berry) | 156 · Baya Caquic (Persim Berry) | ✅ |
| 141 | Baya Ziuela (Lum Berry) | 157 · Baya Ziuela (Lum Berry) | ✅ |
| 142 | Baya Zidra (Sitrus Berry) | 158 · Baya Zidra (Sitrus Berry) | ✅ |
| 143 | Baya Higog (Figy Berry) | 159 · Baya Higog (Figy Berry) | ✅ |
| 144 | Baya Wiki (Wiki Berry) | 160 · Baya Wiki (Wiki Berry) | ✅ |
| 145 | Baya Ango (Mago Berry) | 161 · Baya Ango (Mago Berry) | ✅ |
| 146 | Baya Guaya (Aguav Berry) | 162 · Baya Guaya (Aguav Berry) | ✅ |
| 147 | Baya Pabaya (Iapapa Berry) | 163 · Baya Pabaya (Iapapa Berry) | ✅ |
| 148 | Baya Frambu (Razz Berry) | 164 · Baya Frambu (Razz Berry) | ✅ |
| 149 | Baya Oram (Bluk Berry) | 165 · Baya Oram (Bluk Berry) | ✅ |
| 150 | Baya Latano (Nanab Berry) | 166 · Baya Latano (Nanab Berry) | ✅ |
| 151 | Baya Peragu (Wepear Berry) | 167 · Baya Peragu (Wepear Berry) | ✅ |
| 152 | Baya Pinia (Pinap Berry) | 168 · Baya Pinia (Pinap Berry) | ✅ |
| 153 | Baya Grana (Pomeg Berry) | 169 · Baya Grana (Pomeg Berry) | ✅ |
| 154 | Baya Algama (Kelpsy Berry) | 170 · Baya Algama (Kelpsy Berry) | ✅ |
| 155 | Baya Ispero (Qualot Berry) | 171 · Baya Ispero (Qualot Berry) | ✅ |
| 156 | Baya Meluce (Hondew Berry) | 172 · Baya Meluce (Hondew Berry) | ✅ |
| 157 | Baya Uvav (Grepa Berry) | 173 · Baya Uvav (Grepa Berry) | ✅ |
| 158 | Baya Tamate (Tamato Berry) | 174 · Baya Tamate (Tamato Berry) | ✅ |
| 159 | Baya Mais (Cornn Berry) | 175 · Baya Mais (Cornn Berry) | ✅ |
| 160 | Baya Aostan (Magost Berry) | 176 · Baya Aostan (Magost Berry) | ✅ |
| 161 | Baya Rautan (Rabuta Berry) | 177 · Baya Rautan (Rabuta Berry) | ✅ |
| 162 | Baya Monli (Nomel Berry) | 178 · Baya Monli (Nomel Berry) | ✅ |
| 163 | Baya Wikano (Spelon Berry) | 179 · Baya Wikano (Spelon Berry) | ✅ |
| 164 | Baya Plama (Pamtre Berry) | 180 · Baya Plama (Pamtre Berry) | ✅ |
| 165 | Baya Sambia (Watmel Berry) | 181 · Baya Sambia (Watmel Berry) | ✅ |
| 166 | Baya Rudion (Durin Berry) | 182 · Baya Rudion (Durin Berry) | ✅ |
| 167 | Baya Andano (Belue Berry) | 183 · Baya Andano (Belue Berry) | ✅ |
| 168 | Baya Lichi (Liechi Berry) | 201 · Baya Lichi (Liechi Berry) | ✅ |
| 169 | Baya Gonlan (Ganlon Berry) | 202 · Baya Gonlan (Ganlon Berry) | ✅ |
| 170 | Baya Aslac (Salac Berry) | 203 · Baya Aslac (Salac Berry) | ✅ |
| 171 | Baya Yapati (Petaya Berry) | 204 · Baya Yapati (Petaya Berry) | ✅ |
| 172 | Baya Aricoc (Apicot Berry) | 205 · Baya Aricoc (Apicot Berry) | ✅ |
| 173 | Baya Zonlan (Lansat Berry) | 206 · Baya Zonlan (Lansat Berry) | ✅ |
| 174 | Baya Arabol (Starf Berry) | 207 · Baya Arabol (Starf Berry) | ✅ |
| 175 | Baya Enigma (Enigma Berry) | 208 · Baya Enigma (Enigma Berry) | ✅ |
| 179 | Polvo Brillo (BrightPowder) | 213 · Polvo Brillo (Bright Powder) | ✅ |
| 180 | Hierba Blanca (White Herb) | 214 · Hierba Blanca (White Herb) | ✅ |
| 181 | Brazal Firme (Macho Brace) | 215 · Brazal Firme (Macho Brace) | ✅ |
| 182 | Repartir Exp (Exp. Share) | 216 · Repartir Experiencia (Exp. Share) | ✅ |
| 183 | Garra Rápida (Quick Claw) | 217 · Garra Rápida (Quick Claw) | ✅ |
| 184 | Campana Alivio (Soothe Bell) | 218 · Cascabel Alivio (Soothe Bell) | ✅ |
| 185 | Hierba Mental (Mental Herb) | 219 · Hierba Mental (Mental Herb) | ✅ |
| 186 | Cinta Elegida (Choice Band) | 220 · Cinta Elección (Choice Band) | ✅ |
| 187 | Roca del Rey (King's Rock) | 221 · Roca del Rey (King’s Rock) | ✅ |
| 188 | Polvo Plata (SilverPowder) | 222 · Polvo Plata (Silver Powder) | ✅ |
| 189 | Moneda Amuleto (Amulet Coin) | 223 · Moneda Amuleto (Amulet Coin) | ✅ |
| 190 | Amuleto (Cleanse Tag) | 224 · Amuleto (Cleanse Tag) | ✅ |
| 191 | Rocío Bondad (Soul Dew) | 225 · Rocío Bondad (Soul Dew) | ✅ |
| 192 | Diente Marino (DeepSeaTooth) | 226 · Diente Marino (Deep Sea Tooth) | ✅ |
| 193 | Escama Marina (DeepSeaScale) | 227 · Escama Marina (Deep Sea Scale) | ✅ |
| 194 | Bola Humo (Smoke Ball) | 228 · Bola de Humo (Smoke Ball) | ✅ |
| 195 | Piedra Eterna (Everstone) | 229 · Piedra Eterna (Everstone) | ✅ |
| 196 | Cinta Focus (Focus Band) | 230 · Cinta Aguante (Focus Band) | ✅ |
| 197 | Huevo Suerte (Lucky Egg) | 231 · Huevo Suerte (Lucky Egg) | ✅ |
| 198 | Periscopio (Scope Lens) | 232 · Periscopio (Scope Lens) | ✅ |
| 199 | Revest. Metálico (Metal Coat) | 233 · Revest. Metálico (Metal Coat) | ✅ |
| 200 | Restos (Leftovers) | 234 · Restos (Leftovers) | ✅ |
| 201 | Escamadragón (Dragon Scale) | 235 · Escama de Dragón (Dragon Scale) | ✅ |
| 202 | Bolaluminosa (Light Ball) | 236 · Bola Luminosa (Light Ball) | ✅ |
| 203 | Arena Fina (Soft Sand) | 237 · Arena Fina (Soft Sand) | ✅ |
| 204 | Piedra Dura (Hard Stone) | 238 · Piedra Dura (Hard Stone) | ✅ |
| 205 | Semilla Milagro (Miracle Seed) | 239 · Semilla Milagro (Miracle Seed) | ✅ |
| 206 | Gafas de Sol (BlackGlasses) | 240 · Gafas de Sol (Black Glasses) | ✅ |
| 207 | Cinturón Negro (Black Belt) | 241 · Cinturón Negro (Black Belt) | ✅ |
| 208 | Imán (Magnet) | 242 · Imán (Magnet) | ✅ |
| 209 | Agua Mística (Mystic Water) | 243 · Agua Mística (Mystic Water) | ✅ |
| 210 | Pico Afilado (Sharp Beak) | 244 · Pico Afilado (Sharp Beak) | ✅ |
| 211 | Flecha Venenosa (Poison Barb) | 245 · Flecha Venenosa (Poison Barb) | ✅ |
| 212 | Antiderretir (NeverMeltIce) | 246 · Hielo Perpetuo (Never-Melt Ice) | ✅ |
| 213 | Hechizo (Spell Tag) | 247 · Hechizo (Spell Tag) | ✅ |
| 214 | Cuchara Torcida (TwistedSpoon) | 248 · Cuchara Torcida (Twisted Spoon) | ✅ |
| 215 | Carbón (Charcoal) | 249 · Carbón (Charcoal) | ✅ |
| 216 | Colmillo Dragón (Dragon Fang) | 250 · Colmillo de Dragón (Dragon Fang) | ✅ |
| 217 | Pañuelo Seda (Silk Scarf) | 251 · Pañuelo de Seda (Silk Scarf) | ✅ |
| 218 | Mejora (Up-Grade) | 252 · Mejora (Upgrade) | ✅ |
| 219 | Campana Concha (Shell Bell) | 253 · Cascabel Concha (Shell Bell) | ✅ |
| 220 | Incienso Marino (Sea Incense) | 254 · Incienso Marino (Sea Incense) | ✅ |
| 221 | Incienso Suave (Lax Incense) | 255 · Incienso Suave (Lax Incense) | ✅ |
| 222 | Puño Suerte (Lucky Punch) | 256 · Puño Suerte (Lucky Punch) | ✅ |
| 223 | Polvo Metálico (Metal Powder) | 257 · Polvo Metálico (Metal Powder) | ✅ |
| 224 | Hueso Grueso (Thick Club) | 258 · Hueso Grueso (Thick Club) | ✅ |
| 225 | Palo (Stick) | 259 · Puerro (Leek) | ✅ |
| 254 | Pañuelo Rojo (Red Scarf) | 260 · Pañuelo Rojo (Red Scarf) | ✅ |
| 255 | Pañuelo Azul (Blue Scarf) | 261 · Pañuelo Azul (Blue Scarf) | ✅ |
| 256 | Pañuelo Rosa (Pink Scarf) | 262 · Pañuelo Rosa (Pink Scarf) | ✅ |
| 257 | Pañuelo Verde (Green Scarf) | 263 · Pañuelo Verde (Green Scarf) | ✅ |
| 258 | Pañuelo Amarillo (Yellow Scarf) | 264 · Pañuelo Amarillo (Yellow Scarf) | ✅ |
| 289 | MT01 (TM01) | 328 · MT01 (TM01) | ✅ |
| 290 | MT02 (TM02) | 329 · MT02 (TM02) | ✅ |
| 291 | MT03 (TM03) | 330 · MT03 (TM03) | ✅ |
| 292 | MT04 (TM04) | 331 · MT04 (TM04) | ✅ |
| 293 | MT05 (TM05) | 332 · MT05 (TM05) | ✅ |
| 294 | MT06 (TM06) | 333 · MT06 (TM06) | ✅ |
| 295 | MT07 (TM07) | 334 · MT07 (TM07) | ✅ |
| 296 | MT08 (TM08) | 335 · MT08 (TM08) | ✅ |
| 297 | MT09 (TM09) | 336 · MT09 (TM09) | ✅ |
| 298 | MT10 (TM10) | 337 · MT10 (TM10) | ✅ |
| 299 | MT11 (TM11) | 338 · MT11 (TM11) | ✅ |
| 300 | MT12 (TM12) | 339 · MT12 (TM12) | ✅ |
| 301 | MT13 (TM13) | 340 · MT13 (TM13) | ✅ |
| 302 | MT14 (TM14) | 341 · MT14 (TM14) | ✅ |
| 303 | MT15 (TM15) | 342 · MT15 (TM15) | ✅ |
| 304 | MT16 (TM16) | 343 · MT16 (TM16) | ✅ |
| 305 | MT17 (TM17) | 344 · MT17 (TM17) | ✅ |
| 306 | MT18 (TM18) | 345 · MT18 (TM18) | ✅ |
| 307 | MT19 (TM19) | 346 · MT19 (TM19) | ✅ |
| 308 | MT20 (TM20) | 347 · MT20 (TM20) | ✅ |
| 309 | MT21 (TM21) | 348 · MT21 (TM21) | ✅ |
| 310 | MT22 (TM22) | 349 · MT22 (TM22) | ✅ |
| 311 | MT23 (TM23) | 350 · MT23 (TM23) | ✅ |
| 312 | MT24 (TM24) | 351 · MT24 (TM24) | ✅ |
| 313 | MT25 (TM25) | 352 · MT25 (TM25) | ✅ |
| 314 | MT26 (TM26) | 353 · MT26 (TM26) | ✅ |
| 315 | MT27 (TM27) | 354 · MT27 (TM27) | ✅ |
| 316 | MT28 (TM28) | 355 · MT28 (TM28) | ✅ |
| 317 | MT29 (TM29) | 356 · MT29 (TM29) | ✅ |
| 318 | MT30 (TM30) | 357 · MT30 (TM30) | ✅ |
| 319 | MT31 (TM31) | 358 · MT31 (TM31) | ✅ |
| 320 | MT32 (TM32) | 359 · MT32 (TM32) | ✅ |
| 321 | MT33 (TM33) | 360 · MT33 (TM33) | ✅ |
| 322 | MT34 (TM34) | 361 · MT34 (TM34) | ✅ |
| 323 | MT35 (TM35) | 362 · MT35 (TM35) | ✅ |
| 324 | MT36 (TM36) | 363 · MT36 (TM36) | ✅ |
| 325 | MT37 (TM37) | 364 · MT37 (TM37) | ✅ |
| 326 | MT38 (TM38) | 365 · MT38 (TM38) | ✅ |
| 327 | MT39 (TM39) | 366 · MT39 (TM39) | ✅ |
| 328 | MT40 (TM40) | 367 · MT40 (TM40) | ✅ |
| 329 | MT41 (TM41) | 368 · MT41 (TM41) | ✅ |
| 330 | MT42 (TM42) | 369 · MT42 (TM42) | ✅ |
| 331 | MT43 (TM43) | 370 · MT43 (TM43) | ✅ |
| 332 | MT44 (TM44) | 371 · MT44 (TM44) | ✅ |
| 333 | MT45 (TM45) | 372 · MT45 (TM45) | ✅ |
| 334 | MT46 (TM46) | 373 · MT46 (TM46) | ✅ |
| 335 | MT47 (TM47) | 374 · MT47 (TM47) | ✅ |
| 336 | MT48 (TM48) | 375 · MT48 (TM48) | ✅ |
| 337 | MT49 (TM49) | 376 · MT49 (TM49) | ✅ |
| 338 | MT50 (TM50) | 377 · MT50 (TM50) | ✅ |

## Misma generación: objetos que no existen en el juego de destino

- Generación III (Rubí/Zafiro, Esmeralda, Rojo Fuego/Verde Hoja): misma lista de objetos equipables.
- Generación IV, Platino → Diamante/Perla: Griseosfera (Griseous Orb)
- Generación IV, HeartGold/SoulSilver → Diamante/Perla: Griseosfera (Griseous Orb), Rapid Ball (Fast Ball), Nivel Ball (Level Ball), Cebo Ball (Lure Ball), Peso Ball (Heavy Ball), Amor Ball (Love Ball), Amigo Ball (Friend Ball), Luna Ball (Moon Ball), Competi Ball (Sport Ball), Parque Ball (Park Ball)
- Generación IV, HeartGold/SoulSilver → Platino: Rapid Ball (Fast Ball), Nivel Ball (Level Ball), Cebo Ball (Lure Ball), Peso Ball (Heavy Ball), Amor Ball (Love Ball), Amigo Ball (Friend Ball), Luna Ball (Moon Ball), Competi Ball (Sport Ball), Parque Ball (Park Ball)
- Generación IV, Diamante/Perla/Platino → HeartGold/SoulSilver: —
- Generación V (Negro/Blanco ↔ Negro 2/Blanco 2): misma lista de objetos equipables.
