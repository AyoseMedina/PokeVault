import test from 'node:test';
import assert from 'node:assert/strict';
import { sequenceFromPlacements, bridgeLabel, demoSequence, evolutionText, arrivalText } from '../dist/animations.js';

const pk = (species, game, extra = {}) => ({ species, game, name: extra.name || 'X', nickname: extra.nickname || '', shiny: !!extra.shiny, generation: extra.generation || 3 });
test('sequence reflects verified placements: evolution, items, blocks and bridges', () => {
  const steps = sequenceFromPlacements([
    { pokemon: pk(93, 'firered', { name: 'Haunter' }), resultSpecies: 94, evolution: { from: 93, to: 94, renamed: true, consumedItem: 0 }, conversion: [] },
    { pokemon: pk(64, 'firered', { name: 'Kadabra', nickname: 'Uri', shiny: true }), resultSpecies: 64, conversion: ['Piedra Eterna: impide la evolución por intercambio (política PokéVault, también Kadabra).'] },
    { pokemon: pk(25, 'platinum', { name: 'Pikachu' }), conversion: [], itemChanges: { notes: ['Luz Bola vuelve a la mochila del origen IV; llega sin objeto.'] } },
  ], 'emerald');
  assert.equal(steps[0].evolution.to, 94); assert.equal(steps[0].bridge, 'Intercambio');
  assert.equal(evolutionText(steps[0]), '¡Haunter ha evolucionado en Gengar!');
  assert.equal(steps[1].evolution, null); assert.equal(steps[1].name, 'Uri'); assert.equal(steps[1].shiny, true);
  assert.equal(evolutionText(steps[1]), 'Piedra Eterna: impide la evolución por intercambio.');
  assert.match(steps[2].item, /mochila/); assert.equal(steps[2].resultSpecies, 25);
  assert.match(arrivalText(steps[0]), /Pokémon Esmeralda/);
  assert.ok(steps.every(s => !('raw' in s)) && JSON.parse(JSON.stringify(steps)).length === 3, 'serializable, no entity bytes');
});
test('bridges follow the real transfer tools; no evolution text for III→IV or IV→V', () => {
  assert.equal(bridgeLabel(1, 2), 'Cápsula del Tiempo'); assert.equal(bridgeLabel(3, 4), 'Parque Compi');
  assert.equal(bridgeLabel(4, 5), 'Pokétransfer'); assert.equal(bridgeLabel(2, 3), 'Conversión personalizada');
  const [step] = sequenceFromPlacements([{ pokemon: pk(64, 'emerald'), conversion: [] }], 'platinum');
  assert.equal(step.bridge, 'Parque Compi'); assert.equal(step.evolution, null); assert.equal(evolutionText(step), null);
  assert.ok(demoSequence().some(s => s.evolution) && demoSequence().some(s => s.blocked));
});
