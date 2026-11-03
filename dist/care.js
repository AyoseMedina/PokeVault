// Care, berries and daily rewards (docs/CARE_GAMES.md). Everything stays in the
// PokéVault bank: nothing here ever changes a save (no in-game friendship or EXP).
// state.care = { berries: {id: n}, daily: {last, streak}, buddy: identity|null,
//                pokemon: {identity: {affection, fedAt, playedAt, pettedAt}}, best: {game: score} }
import { entityIdentity } from './transfer.js';

export const BERRIES = {
  cheri: { name: 'Baya Zreza', flavor: 'spicy', sprite: 'cheri-berry' },
  chesto: { name: 'Baya Atania', flavor: 'dry', sprite: 'chesto-berry' },
  pecha: { name: 'Baya Meloc', flavor: 'sweet', sprite: 'pecha-berry' },
  rawst: { name: 'Baya Safre', flavor: 'bitter', sprite: 'rawst-berry' },
  aspear: { name: 'Baya Perasi', flavor: 'sour', sprite: 'aspear-berry' },
  oran: { name: 'Baya Aranja', flavor: null, sprite: 'oran-berry', bonus: 8 },
  sitrus: { name: 'Baya Zidra', flavor: null, sprite: 'sitrus-berry', bonus: 25, rare: true },
};
export const FLAVOR_NAMES = { spicy: 'picante', dry: 'seco', sweet: 'dulce', bitter: 'amargo', sour: 'ácido' };
const FLAVOR_BERRIES = ['cheri', 'chesto', 'pecha', 'rawst', 'aspear'];
export const MAX_AFFECTION = 255, HOUR = 3_600_000, DAY = 24 * HOUR;

// Natures (PID % 25) raise one stat; the liked flavour follows it, as in Gen III+:
// Attack→spicy, Defense→sour, Speed→sweet, Sp. Atk→dry, Sp. Def→bitter. Neutral natures like none.
const RAISED = ['atk', 'def', 'spe', 'spa', 'spd'], LIKED = { atk: 'spicy', def: 'sour', spe: 'sweet', spa: 'dry', spd: 'bitter' };
const LOWERED_FLAVOR = { atk: 'spicy', def: 'sour', spe: 'sweet', spa: 'dry', spd: 'bitter' };
export function tastes(p) {
  if (p.generation >= 3 && Number.isInteger(p.pid)) {
    const nature = p.pid % 25, up = Math.floor(nature / 5), down = nature % 5;
    if (up === down) return { liked: null, disliked: null, nature };
    return { liked: LIKED[RAISED[up]], disliked: LOWERED_FLAVOR[RAISED[down]], nature };
  }
  // Gen I–II have no natures: a stable taste from species and trainer ID, labelled as PokéVault's own.
  const seed = (p.species * 31 + (p.tid || 0)) % 5;
  return { liked: Object.values(LIKED)[seed], disliked: Object.values(LIKED)[(seed + 2) % 5], nature: null };
}

export const careKey = p => { try { return entityIdentity(p); } catch { return null; } };
export function ensureCare(next) {
  next.care ||= { berries: { oran: 3, pecha: 2 }, daily: { last: null, streak: 0 }, buddy: null, pokemon: {}, best: {} };
  return next.care;
}
export const petOf = (state, p) => state.care?.pokemon?.[careKey(p)] || { affection: 0 };
export const hearts = affection => Math.min(5, Math.floor((affection || 0) / 51));

// Mood from time since care (hungry after 12 h without food, bored after 24 h without play).
export function moodOf(pet, now = Date.now(), hourOfDay = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Atlantic/Canary', hour: 'numeric', hourCycle: 'h23' }).format(now))) {
  if (hourOfDay >= 23 || hourOfDay < 7) return { key: 'sleepy', label: 'Tiene sueño', emoji: '💤' };
  if (!pet.fedAt || now - Date.parse(pet.fedAt) > 12 * HOUR) return { key: 'hungry', label: 'Tiene hambre', emoji: '🍒' };
  if (!pet.playedAt || now - Date.parse(pet.playedAt) > DAY) return { key: 'bored', label: 'Quiere jugar', emoji: '🎾' };
  return hearts(pet.affection) >= 4 ? { key: 'happy', label: 'Muy feliz', emoji: '💖' } : { key: 'content', label: 'Contento', emoji: '😊' };
}

const bump = (pet, n) => { pet.affection = Math.max(0, Math.min(MAX_AFFECTION, (pet.affection || 0) + n)); };
function petRecord(care, p) { const key = careKey(p); if (!key) throw new Error('No se puede identificar a este Pokémon.'); return (care.pokemon[key] ||= { affection: 0 }); }

export function feed(next, p, berryId, now = Date.now()) {
  const care = ensureCare(next), berry = BERRIES[berryId];
  if (!berry) throw new Error('Baya desconocida.');
  if (!(care.berries[berryId] > 0)) throw new Error(`No te quedan ${berry.name}.`);
  const pet = petRecord(care, p), taste = tastes(p);
  if (pet.fedAt && now - Date.parse(pet.fedAt) < 20 * 60_000) return { gained: 0, reaction: 'full', text: 'Está lleno. Prueba otra vez dentro de un rato.' };
  care.berries[berryId]--;
  const reaction = berry.flavor && berry.flavor === taste.liked ? 'loves' : berry.flavor && berry.flavor === taste.disliked ? 'dislikes' : 'likes';
  const gained = berry.bonus || (reaction === 'loves' ? 20 : reaction === 'dislikes' ? 2 : 10);
  bump(pet, gained); pet.fedAt = new Date(now).toISOString();
  return { gained, reaction, text: reaction === 'loves' ? '¡Le encanta! Es su sabor favorito.' : reaction === 'dislikes' ? 'Se la come, pero no le gusta mucho.' : '¡Qué rica!' };
}
export function pet(next, p, now = Date.now()) {
  const record = petRecord(ensureCare(next), p), recent = record.pettedAt && now - Date.parse(record.pettedAt) < 10 * 60_000;
  bump(record, recent ? 1 : 3); record.pettedAt = new Date(now).toISOString();
  return { gained: recent ? 1 : 3, reaction: 'pet', text: recent ? 'Se deja acariciar.' : '¡Le encanta que lo acaricies!' };
}
export function play(next, p, now = Date.now()) {
  const record = petRecord(ensureCare(next), p);
  if (record.playedAt && now - Date.parse(record.playedAt) < 2 * HOUR) return { gained: 0, reaction: 'tired', text: 'Está cansado de jugar. Dale un rato.' };
  bump(record, 6); record.playedAt = new Date(now).toISOString();
  return { gained: 6, reaction: 'play', text: '¡Lo pasáis genial jugando juntos!' };
}
export function setBuddy(next, p) { ensureCare(next).buddy = p ? careKey(p) : null; }

// Daily reward with streak: 3 flavour berries, an Oran Berry and a Sitrus Berry every 7th day.
const localDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Atlantic/Canary' }).format(now);
export function dailyAvailable(state, now = Date.now()) { return state.care?.daily?.last !== localDay(now); }
export function claimDaily(next, now = Date.now(), random = Math.random) {
  const care = ensureCare(next), today = localDay(now);
  if (care.daily.last === today) throw new Error('Ya has recogido la recompensa de hoy.');
  const yesterday = localDay(now - DAY);
  care.daily.streak = care.daily.last === yesterday ? care.daily.streak + 1 : 1; care.daily.last = today;
  const gift = { oran: 1 };
  for (let i = 0; i < 3; i++) { const id = FLAVOR_BERRIES[Math.floor(random() * FLAVOR_BERRIES.length)]; gift[id] = (gift[id] || 0) + 1; }
  if (care.daily.streak % 7 === 0) gift.sitrus = 1;
  for (const [id, n] of Object.entries(gift)) care.berries[id] = (care.berries[id] || 0) + n;
  return { gift, streak: care.daily.streak };
}
// Minigame rewards: berries by score, best score kept per game.
export function rewardGame(next, game, score, maxScore, random = Math.random) {
  const care = ensureCare(next), count = Math.max(0, Math.min(5, Math.round(score / Math.max(1, maxScore) * 5))), gift = {};
  for (let i = 0; i < count; i++) { const id = i === 4 ? 'oran' : FLAVOR_BERRIES[Math.floor(random() * FLAVOR_BERRIES.length)]; gift[id] = (gift[id] || 0) + 1; }
  if (score >= maxScore && maxScore > 0) gift.sitrus = (gift.sitrus || 0) + 1;
  for (const [id, n] of Object.entries(gift)) care.berries[id] = (care.berries[id] || 0) + n;
  const record = score > (care.best[game] || 0); if (record) care.best[game] = score;
  return { gift, record };
}
