// Card packs (docs/CARDS.md): Pokémon that enter the bank for the first time
// arrive in a pack of up to 10 cards. Pure state helpers; read only towards saves.
// state.packs = { collected: [identity], items: [{ id, at, source, keys, openedAt }] }.
import { entityIdentity } from './transfer.js';

export const PACK_SIZE = 10;
const identity = p => { try { return entityIdentity(p); } catch { return null; } };
const eligible = p => p && p.valid && !p.egg && !p.consumedBy;

function chunks(list, size) { const out = []; for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size)); return out; }

// First use: everything already in the bank becomes welcome packs.
export function ensurePacks(next, records, { at, uid }) {
  if (next.packs) return [];
  const list = [...records.values()].filter(eligible), seen = new Set(), keys = [];
  for (const p of list) { const id = identity(p); if (id && !seen.has(id)) { seen.add(id); keys.push(p.key); } }
  next.packs = { collected: [...seen], items: [] };
  return addPacks(next, keys, 'Sobre de bienvenida', { at, uid });
}
function addPacks(next, keys, source, { at, uid }) {
  const created = chunks(keys, PACK_SIZE).map(group => ({ id: uid(), at, source, keys: group, openedAt: null }));
  next.packs.items.push(...created);
  return created;
}
// New records (with .key) → packs for identities never collected before.
export function packsForNew(next, records, newRecords, source, options) {
  ensurePacks(next, records, options);
  const collected = new Set(next.packs.collected), keys = [];
  for (const p of newRecords.filter(eligible)) {
    const id = identity(p); if (!id || collected.has(id)) continue;
    collected.add(id); keys.push(p.key);
  }
  next.packs.collected = [...collected];
  return addPacks(next, keys, source, options);
}
export const unopened = state => (state.packs?.items || []).filter(p => !p.openedAt);
// Reveal order: commons first, the rarest last (like a real pack).
const RANK = { common: 0, uncommon: 1, rare: 2, legend: 3, shiny: 4 };
export const revealOrder = models => models.slice().sort((a, b) => RANK[a.rarity.key] - RANK[b.rarity.key]);
