import { DEX_TEXTS } from './pokedex-data.js';

export function dexEntry(game, species, language='es') {
  if (!Number.isInteger(species) || species < 1) return null;
  const entry=DEX_TEXTS[game]?.[species];
  if (!entry) return null;
  const actual=entry[language]?language:entry.en?'en':null;
  return actual?{text:entry[actual],language:actual,game,fallback:actual!==language}:null;
}
