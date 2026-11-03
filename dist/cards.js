// Trading-card view of the bank (docs/CARDS.md). Original PokéVault design: it
// does not copy the official TCG frame, logos or energy symbols. Read only: it
// derives everything from the parsed entity and never changes saves or the bank.
import { DATA } from './data.js';
import { CARD_DATA as C } from './card-data.js';
import { decrypt3, TYPE_NAMES } from './core.js';
import { decryptPK45 } from './formats.js';

const be16 = (b, o) => (b[o] << 8) | b[o + 1];
// Legendary and mythical species of generations I–V (rarity only).
const LEGENDARY = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649]);

// Pre-evolution from PokéAPI pokemon_species.evolves_from_species_id (scripts/build-card-data.mjs).
const PARENT = C.parent;
// Only pre-evolutions that exist in that generation count (no Pichu in Gen I, no Munchlax before Gen IV).
const MAX_SPECIES = [0, 151, 251, 386, 493, 649];
export function stageOf(species, generation = 5) {
  const max = MAX_SPECIES[generation] || 649, parentOf = s => PARENT[s] && PARENT[s] <= max ? PARENT[s] : 0;
  let depth = 0, current = species;
  while (parentOf(current) && depth < 3) { current = parentOf(current); depth++; }
  return { stage: depth, label: depth === 0 ? 'Básico' : `Fase ${depth}`, from: parentOf(species) || null };
}

// Real HP stat of this Pokémon with its level, IV/DV and training.
export function hpOf(p) {
  if (p.species === 292) return 1; // Shedinja
  const base = C.stats[p.species]?.[0], level = p.level;
  if (!base || !level) return null;
  if (p.generation <= 2) {
    const dv = be16(p.raw, p.generation === 1 ? 27 : 21), hpDV = (((dv >> 12) & 1) << 3) | (((dv >> 8) & 1) << 2) | (((dv >> 4) & 1) << 1) | (dv & 1);
    const statExp = be16(p.raw, p.generation === 1 ? 17 : 11);
    return Math.floor((((base + hpDV) * 2 + Math.floor(Math.ceil(Math.sqrt(statExp)) / 4)) * level) / 100) + level + 10;
  }
  const ev = p.generation === 3 ? decrypt3(p.raw)[24] : decryptPK45(p.raw)[0x18];
  return Math.floor(((2 * base + (p.ivs?.[0] ?? 0) + Math.floor(ev / 4)) * level) / 100) + level + 10;
}
// Effort values as the card back shows them (Gen I–II stat experience).
export function trainingOf(p) {
  if (p.generation <= 2) { const o = p.generation === 1 ? 17 : 11; return { kind: 'Experiencia de estadísticas', values: [0, 1, 2, 3, 4].map(i => be16(p.raw, o + i * 2)), labels: ['PS', 'Atq', 'Def', 'Vel', 'Esp'], max: 65535 }; }
  const plain = p.generation === 3 ? decrypt3(p.raw) : decryptPK45(p.raw), o = p.generation === 3 ? 24 : 0x18;
  return { kind: 'EV', values: [...plain.subarray(o, o + 6)], labels: ['PS', 'Atq', 'Def', 'Vel', 'AtE', 'DeE'], max: 255 };
}
export function geneticsOf(p) {
  if (p.generation <= 2) { const [a, d, s, sp] = p.ivs || []; const hp = ((a & 1) << 3) | ((d & 1) << 2) | ((s & 1) << 1) | (sp & 1); return { kind: 'DV', values: [hp, a, d, s, sp], labels: ['PS', 'Atq', 'Def', 'Vel', 'Esp'], max: 15 }; }
  return { kind: 'IV', values: p.ivs || [], labels: ['PS', 'Atq', 'Def', 'Vel', 'AtE', 'DeE'], max: 31 };
}

// Weakness (≥ ×2) and resistance (≤ ×½) against this Pokémon's types in its generation.
export function matchupsOf(types, generation) {
  const chart = C.charts[generation] || C.charts[5], weak = [], resist = [];
  for (let attack = 1; attack <= 17; attack++) {
    if (generation === 1 && (attack === 9 || attack === 17)) continue; // no Steel/Dark in Gen I
    const factor = types.reduce((f, t) => f * (chart[attack]?.[t] ?? 100) / 100, 1);
    if (factor >= 2) weak.push({ type: attack, name: TYPE_NAMES[attack], factor });
    else if (factor <= 0.5) resist.push({ type: attack, name: TYPE_NAMES[attack], factor });
  }
  return { weak: weak.sort((a, b) => b.factor - a.factor), resist: resist.sort((a, b) => a.factor - b.factor) };
}
export function cardModel(p) {
  const types = [...new Set(p.types || DATA.types[p.species] || [1])], stage = stageOf(p.species, p.generation);
  const moves = (p.moves || []).filter(Boolean).map(id => {
    const [type, power, pp] = C.moves[p.generation]?.[id] || [1, 0, 0];
    return { id, name: DATA.moves[id] || `Movimiento ${id}`, type, typeName: TYPE_NAMES[type] || '', power, pp };
  });
  const rarity = p.shiny ? { key: 'shiny', label: 'Variocolor', symbol: '✦' } : LEGENDARY.has(p.species) ? { key: 'legend', label: 'Legendaria', symbol: '★' } : stage.stage >= 2 ? { key: 'rare', label: 'Rara', symbol: '◆' } : stage.stage === 1 ? { key: 'uncommon', label: 'Poco común', symbol: '◇' } : { key: 'common', label: 'Común', symbol: '●' };
  return {
    key: p.key, species: p.species, speciesName: DATA.names[p.species] || p.name,
    title: p.nickname && p.nickname.toLocaleLowerCase('es') !== (DATA.names[p.species] || '').toLocaleLowerCase('es') ? p.nickname : DATA.names[p.species] || p.name,
    nicknamed: !!p.nickname && p.nickname.toLocaleLowerCase('es') !== (DATA.names[p.species] || '').toLocaleLowerCase('es'),
    level: p.level, hp: p.egg ? null : hpOf(p), matchups: matchupsOf([...new Set(p.types || DATA.types[p.species] || [1])], p.generation), egg: !!p.egg, shiny: !!p.shiny, types, typeNames: types.map(t => TYPE_NAMES[t] || ''),
    stage, stageFrom: stage.from ? DATA.names[stage.from] : null, genus: C.genus[p.species] || '', height: C.size[p.species]?.[0] / 10, weight: C.size[p.species]?.[1] / 10, moves, rarity, number: String(p.species).padStart(3, '0'),
    generation: p.generation, game: p.game, ot: p.ot, tid: p.tid, location: p.location === 'party' ? 'Equipo' : `${p.boxName} · casilla ${p.slot + 1}`,
  };
}
