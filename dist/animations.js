// Trade and evolution animations (docs/ANIMATIONS.md). Original design, UI only:
// the sequence is built from an already verified move result and never changes
// data, bytes or the package. Evolution cannot be cancelled, only its animation skipped.
import { DATA } from './data.js';
import { GAMES } from './core.js';

const GEN = game => GAMES[game]?.generation || 0;
export function bridgeLabel(from, to) {
  if (from === to) return 'Intercambio';
  if (from === 1 && to === 2) return 'Cápsula del Tiempo';
  if (from === 2 && to === 3) return 'Conversión personalizada';
  if (from === 3 && to === 4) return 'Parque Compi';
  if (from === 4 && to === 5) return 'Pokétransfer';
  if (from === 3 && to === 5) return 'Parque Compi y Pokétransfer';
  return 'Traslado';
}
const name = species => DATA.names[species] || `#${species}`;

// Pure: verified placements → minimal, serializable steps (stored in the export history).
export function sequenceFromPlacements(placements, destinationGame) {
  return placements.map(p => {
    const from = p.pokemon.game, notes = [...(p.conversion || [])], evolution = p.evolution || null;
    const blocked = notes.find(n => /Piedra Eterna|Karrablast|Shelmet/.test(n)) || null;
    const item = p.itemChanges?.notes?.[0] || null;
    return {
      species: p.pokemon.species, resultSpecies: p.resultSpecies || p.pokemon.species,
      name: p.pokemon.nickname || p.pokemon.name || name(p.pokemon.species), shiny: !!p.pokemon.shiny,
      fromGame: from, toGame: destinationGame, bridge: bridgeLabel(GEN(from), GEN(destinationGame)),
      evolution: evolution ? { from: evolution.from, to: evolution.to, renamed: !!evolution.renamed, consumedItem: !!evolution.consumedItem } : null,
      blocked: evolution ? null : blocked, item,
    };
  });
}

// Fixed example for the demo: one trade evolution, one custom route, one Everstone.
export function demoSequence() {
  return [
    { species: 93, resultSpecies: 94, name: 'Haunter', shiny: false, fromGame: 'firered', toGame: 'emerald', bridge: 'Intercambio', evolution: { from: 93, to: 94, renamed: true, consumedItem: false }, blocked: null, item: null },
    { species: 95, resultSpecies: 208, name: 'Onix', shiny: true, fromGame: 'crystal', toGame: 'crystal', bridge: 'Intercambio', evolution: { from: 95, to: 208, renamed: true, consumedItem: true }, blocked: null, item: null },
    { species: 64, resultSpecies: 64, name: 'Kadabra', shiny: false, fromGame: 'crystal', toGame: 'firered', bridge: 'Conversión personalizada', evolution: null, blocked: 'Piedra Eterna: impide la evolución por intercambio.', item: null },
  ];
}

export const ANIMATION_MODES = ['full', 'reduced', 'off'];
export function animationMode() {
  let saved = null;
  try { saved = localStorage.getItem('pv-animations'); } catch { /* storage may be blocked */ }
  if (ANIMATION_MODES.includes(saved)) return saved;
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}
export function setAnimationMode(mode) { try { localStorage.setItem('pv-animations', mode); } catch { /* per-viewer convenience only */ } }

export function evolutionText(step) {
  if (!step.evolution) return step.blocked ? step.blocked.replace(/\s*\(.*\)\.?$/, '.') : null;
  return `¡${step.name} ha evolucionado en ${name(step.evolution.to)}!`;
}
export function arrivalText(step) { return `${step.name} ha llegado a Pokémon ${GAMES[step.toGame]?.name || step.toGame}.`; }
export const speciesName = name;
