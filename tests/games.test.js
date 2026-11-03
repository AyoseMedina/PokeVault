import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixtureG3, makeDemoPK3, parseSave } from '../dist/core.js';
import { speciesPool, quizRound, memoryDeck, memoryScore, duelRound, factorAgainst } from '../dist/games.js';
import { wikidexUrl } from '../dist/links.js';
test('WikiDex links use the wiki titles', () => {
  assert.equal(wikidexUrl(25), 'https://www.wikidex.net/wiki/Pikachu'); assert.equal(wikidexUrl(122), 'https://www.wikidex.net/wiki/Mr._Mime');
  assert.equal(wikidexUrl(83), "https://www.wikidex.net/wiki/Farfetch'd"); assert.equal(wikidexUrl(29), 'https://www.wikidex.net/wiki/Nidoran%E2%99%80'); assert.equal(wikidexUrl(0), null);
});

const records = new Map(parseSave(makeFixtureG3('emerald', [makeDemoPK3(25, 20, 1), makeDemoPK3(6, 40, 2)]), 'emerald').records.map((r, i) => [`k${i}`, { ...r, key: `k${i}` }]));
test('pools use your Pokémon first and fill with species of the same generations', () => {
  const pool = speciesPool(records); assert.ok(pool.length >= 8); assert.ok(pool.includes(25) && pool.includes(6)); assert.ok(pool.every(n => n >= 1 && n <= 386));
  const r = quizRound(pool, 25); assert.equal(r.options.length, 4); assert.ok(r.options.includes(25)); assert.equal(new Set(r.options).size, 4);
  const deck = memoryDeck(pool); assert.equal(deck.length, 16); assert.ok(deck.every(n => deck.filter(m => m === n).length === 2));
  assert.equal(memoryScore(8), 10); assert.equal(memoryScore(20), 4); assert.equal(memoryScore(99), 0);
});
test('type duel uses the generation chart and always offers the best attack', () => {
  const charizard = [...records.values()].find(p => p.species === 6);
  const round = duelRound(charizard); assert.equal(round.best, 4, 'Rock ×4 against Fire/Flying');
  assert.ok(round.options.some(o => o.factor === round.best)); assert.equal(round.options.length, 4);
  assert.equal(factorAgainst(8, [14], 1), 0, 'Gen I: Ghost does not affect Psychic'); assert.equal(factorAgainst(8, [14], 2), 2);
  const gen1 = duelRound({ species: 25, generation: 1, types: [13] }); assert.ok(gen1.options.every(o => o.type !== 9 && o.type !== 17), 'no Steel/Dark in Gen I');
});
