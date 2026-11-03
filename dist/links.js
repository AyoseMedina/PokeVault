// External reference links. Opening one only tells that site which species you view;
// no bank data is sent. WikiDex content stays on WikiDex (CC BY-NC-SA): we link, never copy.
import { DATA } from './data.js';

export function wikidexUrl(species) {
  const name = Number.isInteger(species) && species >= 1 ? DATA.names[species] : null;
  if (!name) return null;
  const title = name.replace(/’/g, "'").replace(/ /g, '_');
  return `https://www.wikidex.net/wiki/${encodeURIComponent(title).replace(/%27/g, "'")}`;
}
export const wikidexLink = (species, cls = 'btn btn-light btn-small') => {
  const url = wikidexUrl(species);
  return url ? `<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer" title="Abre la ficha de WikiDex en otra pestaña">WikiDex ↗</a>` : '';
};
