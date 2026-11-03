// Server-side checks before a bank revision is accepted (docs/SERVER_VAULT.md).
// The browser remains the writer of saves; the server re-checks what it stores.
import { GAMES, parseSave } from '../dist/core.js';
import { consumedLedger } from '../dist/consumed.js';
import { HASH, VaultError } from './vault-store.js';

export const SAVE_SIZES = new Set([32768, 131072, 524288, 524328, 524410]);
const MAX_SAVES = 100;
const bad = (message, code = 'invalid_state') => { throw new VaultError(code, message, 422); };
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

export function checkShape(state) {
  if (!isObject(state) || state.schema !== 2) bad('Esquema de banco no compatible.');
  for (const key of ['saves', 'boxes', 'favorites', 'snapshots', 'backups', 'plans']) if (!Array.isArray(state[key])) bad(`Banco incompleto: ${key}.`);
  if (!isObject(state.notes)) bad('Notas no válidas.');
  if (state.saves.length > MAX_SAVES) bad(`El banco admite hasta ${MAX_SAVES} partidas.`, 'quota');
  const ids = new Set();
  for (const save of state.saves) {
    if (!isObject(save) || typeof save.id !== 'string' || ids.has(save.id) || !GAMES[save.game] || !HASH.test(save.hash || '')) bad('Registro de partida no válido.');
    if ('bytes' in save || 'data' in save) bad('El estado no debe contener bytes; se suben como originales aparte.');
    ids.add(save.id);
  }
  for (const backup of state.backups) if (!isObject(backup) || !HASH.test(backup.hash || '') || 'bytes' in backup) bad('Respaldo original no válido.');
  for (const box of state.boxes) if (!isObject(box) || typeof box.id !== 'string' || typeof box.name !== 'string' || !Array.isArray(box.slots) || box.slots.length !== 30) bad('Caja no válida.');
  try { consumedLedger(state); } catch (error) { bad(error.message); }
}

// A consumed version can only be released by cancelling the export that consumed it.
export function checkConsumed(next, previous) {
  if (!previous) return;
  const before = consumedLedger(previous), after = consumedLedger(next);
  const cancelled = new Set(next.plans.filter(p => p?.type === 'export' && p.cancelledAt && !previous.plans.some(o => o?.id === p.id && o.cancelledAt)).map(p => p.id));
  for (const [hash, entry] of Object.entries(before)) {
    const now = after[hash];
    if (now && now.consumedBy === entry.consumedBy) continue;
    if (!now && cancelled.has(entry.consumedBy)) continue;
    bad('Una versión consumida no puede liberarse ni reasignarse salvo anulando su exportación.', 'consumed');
  }
}

export function makeValidator(store, { quotaBytes }) {
  return async (next, previous) => {
    checkShape(next);
    checkConsumed(next, previous);
    const known = new Set((previous?.saves || []).map(s => `${s.hash}/${s.game}/${s.language}`));
    let total = 0;
    const seen = new Set();
    for (const item of [...next.saves, ...next.backups]) {
      if (seen.has(item.hash)) continue; seen.add(item.hash);
      if (!await store.hasBlob(item.hash)) throw new VaultError('missing_blob', `Falta subir el original ${item.hash.slice(0, 12)}….`, 409);
      const size = await store.blobSize(item.hash);
      if (!SAVE_SIZES.has(size)) bad('Tamaño de original no compatible.');
      total += size;
    }
    if (total > quotaBytes) bad('Se ha superado la cuota del banco en el servidor. Retira versiones antiguas tras respaldarlas.', 'quota');
    // New or re-labelled saves must parse with the same reader the browser uses.
    for (const save of next.saves) {
      if (known.has(`${save.hash}/${save.game}/${save.language}`)) continue;
      try { parseSave(await store.readBlob(save.hash), save.game, save.language || 'es'); }
      catch (error) { bad(`La partida «${String(save.name || save.id).slice(0, 60)}» no es válida para ${save.game}: ${error.message}`, 'save_unreadable'); }
    }
  };
}
