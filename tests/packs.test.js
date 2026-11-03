import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixtureG3, makeDemoPK3, parseSave } from '../dist/core.js';
import { ensurePacks, packsForNew, unopened, revealOrder, sealedKeys, PACK_SIZE } from '../dist/packs.js';

let n = 0; const uid = () => `id${++n}`, at = '2026-11-03T12:00:00.000Z';
const recordsOf = (bytes, saveId) => new Map(parseSave(bytes, 'emerald').records.map(r => { const key = `${saveId}/${r.location}/${r.box}/${r.slot}`; return [key, { ...r, key, game: 'emerald' }]; }));
test('welcome packs cover the current collection in packs of 10', () => {
  const records = recordsOf(makeFixtureG3('emerald', Array.from({ length: 23 }, (_, i) => makeDemoPK3(1 + i, 10, i))), 's1'), state = {};
  const created = ensurePacks(state, records, { at, uid });
  assert.deepEqual(created.map(p => p.keys.length), [10, 10, 3]); assert.equal(PACK_SIZE, 10);
  assert.equal(state.packs.collected.length, 23); assert.deepEqual(ensurePacks(state, records, { at, uid }), [], 'only once');
  assert.equal(sealedKeys(state).size, 23, 'unopened cards are not in the collection');
  state.packs.items[0].openedAt = at; assert.equal(sealedKeys(state).size, 13);
});
test('only Pokémon never collected before make a new pack; evolutions count as new cards', () => {
  const old = recordsOf(makeFixtureG3('emerald', [makeDemoPK3(64, 30, 1), makeDemoPK3(25, 10, 2)]), 'old'), state = {};
  ensurePacks(state, old, { at, uid }); state.packs.items.forEach(p => { p.openedAt = at; });
  // Same Pokémon re-imported in a new save version + one new Pokémon + Kadabra now as Alakazam (same PID).
  const fresh = recordsOf(makeFixtureG3('emerald', [makeDemoPK3(64, 30, 1), makeDemoPK3(25, 10, 2), makeDemoPK3(133, 5, 3), makeDemoPK3(65, 30, 1)]), 'new');
  const created = packsForNew(state, old, [...fresh.values()], 'Pokémon Esmeralda', { at, uid });
  assert.equal(created.length, 1); assert.deepEqual(created[0].keys.map(k => fresh.get(k).species).sort(), [133, 65].sort());
  assert.equal(unopened(state).length, 1);
  assert.deepEqual(packsForNew(state, old, [...fresh.values()], 'otra vez', { at, uid }), [], 'no duplicates');
});
test('reveal order leaves the rarest for last', () => {
  const r = k => ({ rarity: { key: k } });
  assert.deepEqual(revealOrder([r('shiny'), r('common'), r('legend'), r('rare')]).map(x => x.rarity.key), ['common', 'rare', 'legend', 'shiny']);
});
