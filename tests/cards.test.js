import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixtureG2, makeFixtureG3, makeDemoPK3, parseSave } from '../dist/core.js';
import { fixtureYellow } from './fixtures/builders.js';
import { cardModel, stageOf, hpOf, matchupsOf } from '../dist/cards.js';
import { CARD_DATA as C } from '../dist/card-data.js';

test('stages respect the generation of the game', () => {
  assert.deepEqual([stageOf(25, 1).label, stageOf(25, 2).label, stageOf(25, 2).from], ['Básico', 'Fase 1', 172]);
  assert.equal(stageOf(143, 3).label, 'Básico', 'no Munchlax before Gen IV'); assert.equal(stageOf(143, 4).label, 'Fase 1');
  assert.equal(stageOf(6, 3).label, 'Fase 2');
});
test('HP follows the real formulas of each generation', () => {
  const [pika] = parseSave(makeFixtureG3('emerald', [makeDemoPK3(25, 50, 1)]), 'emerald').records;
  const iv = pika.ivs[0]; assert.equal(hpOf(pika), Math.floor((2 * 35 + iv) * 50 / 100) + 60);
  const [suicune] = parseSave(makeFixtureG2([245]), 'crystal').records;
  const dv = suicune.raw[21] << 8 | suicune.raw[22], hpDV = ((dv >> 12 & 1) << 3) | ((dv >> 8 & 1) << 2) | ((dv >> 4 & 1) << 1) | (dv & 1);
  assert.equal(hpOf(suicune), Math.floor((C.stats[245][0] + hpDV) * 2 * suicune.level / 100) + suicune.level + 10);
  assert.equal(hpOf({ species: 292, level: 40, generation: 3 }), 1, 'Shedinja');
});
test('type chart per generation and move power per generation', () => {
  const gengar1 = matchupsOf([8, 4], 1), gengar3 = matchupsOf([8, 4], 3);
  assert.ok(gengar1.weak.some(w => w.name === 'Psíquico')); assert.ok(!gengar1.resist.some(r => r.name === 'Siniestro'));
  assert.ok(gengar3.weak.some(w => w.name === 'Siniestro'));
  assert.ok(matchupsOf([9], 4).resist.some(r => r.name === 'Fantasma'), 'Steel resists Ghost before Gen VI');
  assert.equal(C.moves[1][33][1], 35); assert.equal(C.moves[5][33][1], 50); assert.equal(C.moves[1][44][0], 1, 'Bite is Normal in Gen I');
  const card = cardModel({ ...parseSave(fixtureYellow(), 'yellow').records[0] ?? { species: 25, level: 5, generation: 1, raw: new Uint8Array(33), moves: [], game: 'yellow' } });
  assert.ok(card.number && card.rarity.label);
});
