import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixtureG3, makeDemoPK3, parseSave } from '../dist/core.js';
import { searchAll, normalize } from '../dist/search.js';

const records = new Map(parseSave(makeFixtureG3('emerald', [makeDemoPK3(25, 20, 1), makeDemoPK3(6, 40, 2), makeDemoPK3(133, 12, 3)]), 'emerald').records.map(r => { const key = `s/${r.location}/${r.box}/${r.slot}`; return [key, { ...r, key, game: 'emerald' }]; }));
const saves = [{ id: 's', name: 'Pokémon Esmeralda.sav', game: 'emerald', trainer: 'AYO' }];
test('accent and case insensitive; numbers, types, games and sections', () => {
  assert.equal(normalize('  Pokémon  ESMERALDA '), 'pokemon esmeralda');
  assert.equal(searchAll('pikachu', { records, saves }).pokemon[0].p.species, 25);
  assert.equal(searchAll('PIKA', { records, saves }).pokemon.length, 1);
  assert.equal(searchAll('#6', { records, saves }).pokemon[0].p.species, 6);
  assert.equal(searchAll('025', { records, saves }).species[0].species, 25);
  assert.ok(searchAll('fuego', { records, saves }).pokemon.some(x => x.p.species === 6), 'by type');
  const fr = new Map([...records].map(([k, p]) => [k, { ...p, game: 'firered' }]));
  assert.equal(searchAll('fuego', { records: fr, saves }).pokemon[0].p.species, 6, 'a Fire type outranks the game «Rojo Fuego»');
  assert.equal(searchAll('esmeralda', { records, saves }).saves[0].s.id, 's');
  assert.equal(searchAll('pokemon esmeralda', { records, saves }).saves.length, 1, 'multiple terms, no accents');
  assert.ok(searchAll('eevee', { records, saves }).species.some(x => x.species === 133));
  assert.equal(searchAll('convertir wii', { records, saves }).actions[0].action, 'convert-emulator');
  assert.equal(searchAll('cuenta', { records, saves }).actions.length, 0, 'account only with the server');
  assert.equal(searchAll('cuenta', { records, saves, server: true }).actions[0].id, 'account');
  assert.equal(searchAll('nota secreta', { records, saves, notes: { [[...records.keys()][2]]: 'Mi nota secreta' } }).pokemon[0].p.species, 133, 'notes');
  assert.equal(searchAll('', { records, saves }).total, 0);
});
