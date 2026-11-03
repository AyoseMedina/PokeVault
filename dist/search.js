// Global search (Ctrl+K): Pokémon in the bank, saves, Pokédex species and app
// sections. Pure functions; accent- and case-insensitive. Read only.
import { DATA } from './data.js';
import { GAMES, TYPE_NAMES } from './core.js';

export const normalize = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9#♂♀ ]+/g, ' ').replace(/\s+/g, ' ').trim();

const ACTIONS = [
  { id: 'bank', label: 'Mi banco', words: 'banco cajas pokemon inicio' },
  { id: 'saves', label: 'Mis partidas', words: 'partidas guardados archivos sav srm dsv' },
  { id: 'pokedex', label: 'Pokédex', words: 'pokedex especies vistos capturados' },
  { id: 'cards', label: 'Cartas y sobres', words: 'cartas tcg sobres coleccion holo' },
  { id: 'transfers', label: 'Transferencias', words: 'mover intercambio transferir evolucion traslado' },
  { id: 'backups', label: 'Copias de seguridad', words: 'respaldo copia pvault backup versiones restaurar servidor' },
  { id: 'guide', label: 'Guía R36S', words: 'guia ayuda instalar sd arkos retroarch' },
  { id: 'account', label: 'Cuenta', words: 'cuenta correo email contrasena password avisos', serverOnly: true },
  { action: 'import', label: 'Importar una partida', words: 'importar subir cargar partida guardado' },
  { action: 'convert-emulator', label: 'Convertir R36S ⇄ Wii', words: 'convertir wii vba r36s srm sav rtc reloj' },
];

// Terms must all match (AND); score favours exact and prefix matches on the main name.
// `rest` is text or [text, weight] pairs, so a type outranks a game called «Rojo Fuego».
function score(terms, main, rest) {
  const fields = Array.isArray(rest) ? rest : [[rest, 15]];
  let total = 0;
  for (const term of terms) {
    if (main === term) total += 100;
    else if (main.startsWith(term)) total += 60;
    else if (main.includes(term)) total += 35;
    else { const hit = fields.filter(([text]) => text.includes(term)).reduce((best, [, w]) => Math.max(best, w), 0); if (!hit) return 0; total += hit; }
  }
  return total;
}

export function searchAll(query, { records, saves = [], notes = {}, favorites = [], server = false, limit = 8 }) {
  const q = normalize(query);
  if (!q) return { pokemon: [], saves: [], species: [], actions: [], total: 0 };
  const number = /^#?(\d{1,3})$/.exec(q)?.[1], terms = q.split(' ');
  const pokemon = [];
  for (const p of records.values()) {
    if (!p.valid) continue;
    if (number) { if (p.species === Number(number)) pokemon.push({ p, score: 100 }); continue; }
    const species = DATA.names[p.species] || p.name;
    const main = normalize(`${p.nickname || ''} ${species}`);
    const rest = [[normalize((p.types || []).map(t => TYPE_NAMES[t]).join(' ')), 30], [normalize([p.shiny ? 'variocolor shiny' : '', p.egg ? 'huevo' : '', favorites.includes(p.key) ? 'favorito' : ''].join(' ')), 30],
      [normalize([p.ot, p.boxName, notes[p.key] || '', `nv ${p.level} nivel ${p.level}`].join(' ')), 15], [normalize(GAMES[p.game]?.name), 8]];
    const s = score(terms, main, rest);
    if (s) pokemon.push({ p, score: s + (p.shiny ? 1 : 0) });
  }
  pokemon.sort((a, b) => b.score - a.score || b.p.level - a.p.level);
  const savesFound = saves.map(s => ({ s, score: score(terms, normalize(s.name), normalize(`${GAMES[s.game]?.name} ${s.trainer || ''} ${s.game}`)) })).filter(x => x.score).sort((a, b) => b.score - a.score);
  const species = [];
  for (let n = 1; n < DATA.names.length && n <= 649; n++) {
    const s = number ? (n === Number(number) ? 100 : 0) : score(terms, normalize(DATA.names[n]), normalize((DATA.types[n] || []).map(t => TYPE_NAMES[t]).join(' ')));
    if (s) species.push({ species: n, name: DATA.names[n], score: s });
  }
  species.sort((a, b) => b.score - a.score || a.species - b.species);
  const actions = ACTIONS.filter(a => server || !a.serverOnly).map(a => ({ ...a, score: score(terms, normalize(a.label), normalize(a.words)) })).filter(a => a.score).sort((a, b) => b.score - a.score);
  return { pokemon: pokemon.slice(0, limit), saves: savesFound.slice(0, 4), species: species.slice(0, 6), actions: actions.slice(0, 4), total: pokemon.length + savesFound.length + species.length + actions.length, more: Math.max(0, pokemon.length - limit) };
}
