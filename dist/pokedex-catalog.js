import { DEX_TEXTS, DEX_SPANISH } from './pokedex-data.js';

// PokeAPI identifiers of the later official games used for Spanish text.
export const SPANISH_SOURCE_NAMES = {
  letsgopikachu: "Let's Go, Pikachu!", letsgoeevee: "Let's Go, Eevee!",
  omegaruby: 'Rubí Omega', alphasapphire: 'Zafiro Alfa', x: 'X', y: 'Y',
};

// English is always the exact edition. Spanish comes from the later game named
// in `sourceGame` (none of the generation I–V editions has Spanish text in the
// source); `exact` is false and the interface must say so. See docs/POKEDEX.md.
export function dexEntry(game, species, language='es') {
  if (!Number.isInteger(species) || species < 1) return null;
  const entry=DEX_TEXTS[game]?.[species];
  if (!entry?.en) return null;
  if (language==='es') {
    const text=DEX_SPANISH[entry.esFrom]?.[species];
    if (text) return {text,language:'es',game,sourceGame:entry.esFrom,sourceName:SPANISH_SOURCE_NAMES[entry.esFrom],exact:false};
  }
  return {text:entry.en,language:'en',game,sourceGame:game,exact:true,fallback:language!=='en'};
}
