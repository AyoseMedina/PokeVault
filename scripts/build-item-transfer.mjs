// Generates dist/item-transfer-data.js and docs/ITEM_TRANSFER.md from PKHeX
// (GPL-3.0) at a pinned commit. Run: node scripts/build-item-transfer.mjs
// Network access is needed only at generation time; the app ships the tables.
import { writeFile } from 'node:fs/promises';

const COMMIT = '0660d1e1f4924b8478daec73281bb8071a82ad19';
const BASE = `https://raw.githubusercontent.com/kwsch/PKHeX/${COMMIT}/PKHeX.Core`;
const NaN_ITEM = 128;

async function fetchText(path) {
  const response = await fetch(`${BASE}/${path}`);
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
}
// Parses `Name => [ numbers ];` blocks (numbers, NaN and comments) from a C# file.
function arrays(source) {
  const out = {};
  for (const [, name, body] of source.matchAll(/(\w+)\s*=>\s*\[([^\]]*)\];/g)) {
    out[name] = body.replace(/\/\/.*$/gm, '').split(',').map(s => s.trim()).filter(Boolean)
      .map(s => s === 'NaN' ? NaN_ITEM : Number(s));
    if (out[name].some(Number.isNaN)) delete out[name];
  }
  return out;
}
const lines = text => text.split(/\r?\n/);

const [conv, s2, s3, s4, s4hg, s5, g2es, g2en, g3es, g3en, g4es, g4en] = await Promise.all([
  'PKM/Util/Conversion/ItemConverter.cs', 'Items/ItemStorage2.cs', 'Items/ItemStorage3RS.cs',
  'Items/ItemStorage4.cs', 'Items/ItemStorage4HGSS.cs', 'Items/ItemStorage5.cs',
  'Resources/text/items/gen2/text_ItemsG2_es.txt', 'Resources/text/items/gen2/text_ItemsG2_en.txt',
  'Resources/text/items/gen3/text_ItemsG3_es.txt', 'Resources/text/items/gen3/text_ItemsG3_en.txt',
  'Resources/text/items/text_Items_es.txt', 'Resources/text/items/text_Items_en.txt',
].map(fetchText));

const C = arrays(conv), I2 = arrays(s2), I3 = arrays(s3), I4 = arrays(s4), I4H = arrays(s4hg), I5 = arrays(s5);
const names = { 2: [lines(g2es), lines(g2en)], 3: [lines(g3es), lines(g3en)], 4: [lines(g4es), lines(g4en)] };
const name = (gen, id) => `${names[gen][0][id] || '?'} (${names[gen][1][id] || '?'})`;
const isMail = (gen, id) => /mail/i.test(names[gen][1][id] || '');

// Held-item sets, mirroring PKHeX ItemStorage*.GetAllHeld(). HGSS has no
// GetAllHeld in PKHeX; it is composed like Pt with the HGSS ball pouch.
const sorted = a => [...new Set(a)].sort((x, y) => x - y);
const tm4 = I4.Machine.slice(0, -8);
const held = {
  crystal: sorted([...I2.General, ...I2.Balls, ...I2.Machine.slice(0, 50)]),
  gen3: sorted([...I3.General, ...I3.Balls, ...I3.Berry, ...I3.Machine.slice(0, 50)]),
  dp: sorted([...I4.GeneralDP, ...I4.Mail, ...I4.Medicine, ...I4.Berry, ...I4.BallsDPPt, ...I4.Battle, ...tm4]),
  pt: sorted([...I4.GeneralPt, ...I4.Mail, ...I4.Medicine, ...I4.Berry, ...I4.BallsDPPt, ...I4.Battle, ...tm4]),
  hgss: sorted([...I4.GeneralPt, ...I4.Mail, ...I4.Medicine, ...I4.Berry, ...I4H.BallsHGSS, ...I4.Battle, ...tm4]),
  gen5: sorted([...I5.General, ...I5.Medicine, ...I5.Berry]),
};
const gen2TMs = new Set(I2.Machine);
const item2to4 = C.Item2to4, item3to4 = C.Item3to4;
const old3 = id4 => { const i = item3to4.indexOf(id4); return id4 === NaN_ITEM || i < 0 ? 0 : i; };

// Crystal -> GBA (custom route): PKHeX Gen2 -> Gen4 -> Gen3 (GetItemOld3).
const g2to3 = {}, g2to3Rows = [];
for (const id of held.crystal) {
  let reason = '', to = 0;
  const id4 = item2to4[id] ?? NaN_ITEM;
  if (isMail(2, id)) reason = 'Carta: bloqueada';
  else if (gen2TMs.has(id)) reason = 'MT: el número de MT no corresponde al mismo movimiento entre generaciones';
  else if (id4 === NaN_ITEM) reason = 'Sin equivalente en generaciones posteriores';
  else if (!(to = old3(id4))) reason = 'No existe en generación III';
  else if (!held.gen3.includes(to)) reason = 'No se puede equipar en GBA';
  if (!reason) g2to3[id] = to;
  g2to3Rows.push({ id, from: name(2, id), to: reason ? '—' : `${to} · ${name(3, to)}`, reason });
}
// GBA -> DS IV (Pal Park keeps held items): PKHeX GetItemFuture3 + IsItemTransferable34.
const g3to4 = {}, g3to4Rows = [];
for (const id of held.gen3) {
  let reason = '';
  const id4 = item3to4[id] ?? NaN_ITEM;
  // MT01–MT50 contain the same moves in generations III and IV; PKHeX maps them by number.
  if (isMail(3, id)) reason = 'Carta: no puede estar en el PC del juego real';
  else if (!(id4 !== NaN_ITEM && id4 > 0)) reason = 'Sin equivalente en generación IV';
  const missing = reason ? [] : ['dp', 'pt', 'hgss'].filter(g => !held[g].includes(id4));
  if (!reason) g3to4[id] = id4;
  g3to4Rows.push({ id, from: name(3, id), to: reason ? '—' : `${id4} · ${name(4, id4)}`, reason: reason || (missing.length ? `No equipable en: ${missing.join(', ')}` : '') });
}
for (const id of held.dp) if (!held.pt.includes(id)) throw new Error(`DP item ${id} missing from Pt`);

// Bag offsets/maxima from PlayerBag4*.cs. Capacities follow the consecutive
// native pockets (pret pokeplatinum/include/bag.h, pokeheartgold/include/bag.h).
// The final BattleItems pocket has 30 native slots in DP/Pt/HGSS.
const bags={};
for(const [family,suffix] of [['dp','DP'],['pt','Pt'],['hgss','HGSS']]){
  const source=await fetchText(`Items/Bags/PlayerBag4${suffix}.cs`),base=Number(source.match(/BaseOffset = (0x[0-9A-F]+)/i)?.[1]);
  const rows=[...source.matchAll(/new\((0x[0-9A-F]+),\s*(\d+), info, (\w+)\)/gi)].map(([,o,n,type])=>({offset:Number(o),max:Number(n),type}));
  if(!base||rows.length!==8)throw new Error('Unrecognized bag source');
  const lists={Items:family==='dp'?I4.GeneralDP:I4.GeneralPt,KeyItems:family==='hgss'?I4H.KeyHGSS:I4.Key,TMHMs:I4.Machine,MailItems:I4.Mail,Medicine:I4.Medicine,Berries:I4.Berry,Balls:family==='hgss'?I4H.BallsHGSS:I4.BallsDPPt,BattleItems:I4.Battle};
  bags[family]={base,pockets:rows.map((row,i)=>({...row,capacity:i<rows.length-1?(rows[i+1].offset-row.offset)/4:30,items:lists[row.type]}))};
  if(bags[family].pockets.some(p=>!p.items||!Number.isInteger(p.capacity)||p.capacity<1))throw new Error('Invalid pocket');
}

const data = `// Generated by scripts/build-item-transfer.mjs. Do not edit by hand.
// Source: PKHeX (GPL-3.0) commit ${COMMIT}:
// PKM/Util/Conversion/ItemConverter.cs and Items/ItemStorage*.cs.
export const ITEM_TRANSFER = ${JSON.stringify({
  source: `PKHeX ${COMMIT}`,
  // Custom Crystal -> GBA: Gen2 item id -> Gen3 item id. Missing key = blocked.
  g2to3,
  // Pal Park III -> IV: Gen3 item id -> Gen4 item id. Missing key = blocked.
  g3to4,
  // Holdable item ids per destination game family (same-generation moves).
  held,
  names,
  bags,
  // Mail ids per generation (blocked in move policy v1).
  mail: {
    2: held.crystal.filter(id => isMail(2, id)),
    3: held.gen3.filter(id => isMail(3, id)),
    4: I4.Mail, 5: I4.Mail,
  },
})};
`;
const table = rows => ['| ID | Objeto origen | Destino | Estado |', '|---:|---|---|---|',
  ...rows.map(r => `| ${r.id} | ${r.from} | ${r.to} | ${r.reason ? (r.to === '—' ? '⛔ ' : '⚠️ ') + r.reason : '✅'} |`)].join('\n');
const diff = (a, b) => held[a].filter(id => !held[b].includes(id)).map(id => name(4, id)).join(', ') || '—';
const doc = `# Equivalencias de objetos equipados · Held item equivalence

> Generado por \`scripts/build-item-transfer.mjs\` desde PKHeX (GPL-3.0), commit
> \`${COMMIT}\` (\`ItemConverter.cs\`, \`Items/ItemStorage*.cs\`). No editar a mano.
> Datos para la aplicación: \`dist/item-transfer-data.js\`. Política: \`docs/MOVE_TRANSFER.md\`.

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
| III → IV (Parque Compi) | **Conserva el objeto** | Equivalencia PKHeX \`GetItemFuture3\`; se bloquea si no existe o no se puede equipar en el destino |
| IV → V (Pokétransfer) | **El objeto vuelve a la mochila del juego de Gen IV** y el Pokémon llega sin él | Escribir el objeto en la mochila del guardado de origen (Gen IV), que en modo mover también se modifica. Si no hay espacio o no se puede escribir de forma verificada, se bloquea. PKHeX conserva el objeto, pero el juego real no |
| III → IV → V | Parque Compi y después Pokétransfer | Se bloquea con objeto (el objeto acabaría en una mochila de Gen IV intermedia que no existe) |

Nunca se borra ni se sustituye un objeto en silencio. Las bayas de Cristal tienen
otro nombre en GBA (por ejemplo, Baya → Baya Aranja): es la equivalencia de PKHeX
y debe mostrarse en la revisión.

## Cristal → GBA (${Object.keys(g2to3).length} permitidos de ${g2to3Rows.length})

${table(g2to3Rows)}

## GBA → DS IV, Parque Compi (${Object.keys(g3to4).length} permitidos de ${g3to4Rows.length})

⚠️ = el objeto existe en generación IV, pero no se puede equipar en algún juego de destino: se bloquea solo para ese destino.

${table(g3to4Rows)}

## Misma generación: objetos que no existen en el juego de destino

- Generación III (Rubí/Zafiro, Esmeralda, Rojo Fuego/Verde Hoja): misma lista de objetos equipables.
- Generación IV, Platino → Diamante/Perla: ${diff('pt', 'dp')}
- Generación IV, HeartGold/SoulSilver → Diamante/Perla: ${diff('hgss', 'dp')}
- Generación IV, HeartGold/SoulSilver → Platino: ${diff('hgss', 'pt')}
- Generación IV, Diamante/Perla/Platino → HeartGold/SoulSilver: ${diff('pt', 'hgss')}
- Generación V (Negro/Blanco ↔ Negro 2/Blanco 2): misma lista de objetos equipables.
`;
await writeFile(new URL('../dist/item-transfer-data.js', import.meta.url), data);
await writeFile(new URL('../docs/ITEM_TRANSFER.md', import.meta.url), doc);
console.log(`g2to3 ${Object.keys(g2to3).length}/${g2to3Rows.length}, g3to4 ${Object.keys(g3to4).length}/${g3to4Rows.length}`);
