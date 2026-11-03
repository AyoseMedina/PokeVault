// Scheduled messages (docs/ACCOUNT_EMAIL.md §7). With the bank on the server
// (docs/SERVER_VAULT.md) they are built here, opt-in per kind, with minimal
// fields (species, nickname, level, game) and every value escaped by message().
import { GAMES, parseSave } from '../dist/core.js';
import { DATA } from '../dist/data.js';
import { message } from './mailer.js';

const DAY = 86_400_000;
const gameName = id => GAMES[id]?.name ? `Pokémon ${GAMES[id].name}` : id;

async function summary(vault, state) {
  const records = new Map();
  for (const save of state.saves) {
    if (save.consumedBy) continue;
    try {
      const parsed = parseSave(await vault.readBlob(save.hash), save.game, save.language || 'es');
      for (const p of parsed.records) records.set(`${save.id}/${p.location}/${p.box}/${p.slot}`, { ...p, game: save.game, save });
    } catch { /* Unreadable saves stay in quarantine in the app; they are skipped here. */ }
  }
  return records;
}
const species = p => DATA.names[p.species] || p.name;
// The nickname is shown only when it is a real nickname (not the default species name).
const line = p => `${p.nickname && p.nickname.toLocaleLowerCase('es') !== species(p).toLocaleLowerCase('es') ? `${p.nickname} (${species(p)})` : species(p)}, nivel ${p.level}${p.shiny ? ', variocolor' : ''} · ${gameName(p.game)}`;

export async function runNotifications({ account, vault, mailer, now = Date.now }) {
  const user = account.get(), at = now(), sent = [];
  if (!mailer || !user.emailVerified || !user.email) return sent;
  const { state } = await vault.current();
  if (!state) return sent;
  const notices = { backup: null, digest: null, anniversaries: [], movesSeen: null, ...(user.notices || {}) }, prefs = user.notify || {};
  const send = async (kind, title, paragraphs) => { if (await mailer.send({ to: user.email, kind, ...message(title, paragraphs) })) sent.push(kind); };

  if (prefs.backupDays > 0 && state.saves.length) {
    const last = Date.parse(state.lastVaultExportAt || 0) || 0, reminded = Date.parse(notices.backup || 0) || 0;
    if (at - last > prefs.backupDays * DAY && at - reminded > prefs.backupDays * DAY) {
      await send('backup', 'Recuerda exportar tu banco de PokéVault', [last ? `Tu último respaldo .pvault es del ${new Date(last).toLocaleDateString('es-ES', { timeZone: 'Atlantic/Canary' })}.` : 'Todavía no has descargado un respaldo .pvault.', 'Entra en «Copias de seguridad» y exporta tu banco para conservar una copia fuera del servidor.']);
      notices.backup = new Date(at).toISOString();
    }
  }
  // Moves: report export plans that appeared since the last run (first run only records them).
  const exports = state.plans.filter(p => p?.type === 'export' && !p.cancelledAt);
  if (notices.movesSeen === null) notices.movesSeen = exports.map(p => p.id);
  else {
    for (const plan of exports.filter(p => !notices.movesSeen.includes(p.id))) {
      if (prefs.moves) await send('moves', `Movimiento preparado: ${plan.count} Pokémon`, [`Has preparado un movimiento de ${plan.count} Pokémon hacia ${plan.destination}${plan.route ? ` (ruta ${plan.route})` : ''}.`, 'Recuerda copiar todos los archivos de «copiar-a-la-SD» o ninguno, y después importar los resultados.']);
      notices.movesSeen.push(plan.id);
    }
    notices.movesSeen = notices.movesSeen.slice(-500);
  }
  if (prefs.digest || prefs.anniversaries) {
    const records = await summary(vault, state);
    if (prefs.digest && at - (Date.parse(notices.digest || 0) || 0) >= 7 * DAY) {
      const recent = state.saves.filter(s => at - Date.parse(s.at) < 7 * DAY).length;
      const favorites = state.favorites.map(k => records.get(k)).filter(Boolean).slice(0, 10);
      await send('digest', 'Tu semana en PokéVault', [`Tu banco tiene ${records.size} Pokémon en ${state.saves.filter(s => !s.consumedBy).length} partidas.`, recent ? `Esta semana has importado ${recent} partida${recent === 1 ? '' : 's'}.` : 'Esta semana no has importado partidas.', ...(favorites.length ? ['Tus favoritos:', ...favorites.map(p => `• ${line(p)}`)] : [])]);
      notices.digest = new Date(at).toISOString();
    }
    if (prefs.anniversaries) {
      const today = new Date(at).toLocaleDateString('en-CA', { timeZone: 'Atlantic/Canary' });
      for (const save of state.saves.filter(s => !s.consumedBy)) {
        const imported = new Date(save.at).toLocaleDateString('en-CA', { timeZone: 'Atlantic/Canary' }), years = Number(today.slice(0, 4)) - Number(imported.slice(0, 4)), key = `${save.id}/${today.slice(0, 4)}`;
        if (years < 1 || imported.slice(5) !== today.slice(5) || notices.anniversaries.includes(key)) continue;
        const team = [...records.values()].filter(p => p.save === save).slice(0, 6);
        await send('anniversary', `Hace ${years} año${years === 1 ? '' : 's'} que llegó ${gameName(save.game)}`, [`El ${imported.split('-').reverse().join('/')} importaste la partida «${save.name}». Estos compañeros siguen contigo:`, ...team.map(p => `• ${line(p)}`)]);
        notices.anniversaries = [...notices.anniversaries, key].slice(-500);
      }
    }
  }
  await account.update(next => { next.notices = notices; });
  return sent;
}

export function scheduleNotifications(options, { everyMs = 3_600_000, firstMs = 60_000 } = {}) {
  const tick = () => runNotifications(options).catch(error => console.warn('notifications error', error.code || error.name));
  const first = setTimeout(tick, firstMs), timer = setInterval(tick, everyMs);
  first.unref(); timer.unref();
  return () => { clearTimeout(first); clearInterval(timer); };
}
