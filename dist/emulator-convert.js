// Battery save conversion between the R36S (RetroArch + gambatte/mGBA, .srm) and
// the Wii (Visual Boy Advance GX, .sav). Original files are never modified.
//
// Verified sources:
// - dborth/vbagx ad6a07006c0aa49d75aef1df8398f21c92632b6b: source/vbasupport.cpp
//   (GBA flash written raw) and source/vba/gb/GB.cpp MemgbWriteSaveMBC3 (Crystal:
//   SRAM + 10 little-endian ints Seconds, Minutes, Hours, Days, Control and their
//   latched copies + time_t lastTime; 48 bytes, 44 with a 32-bit time_t).
//   gbMemory.cpp memoryUpdateMBC3Clock advances the clock from lastTime.
// - libretro/gambatte-libretro 77f2567d718b8973d02caa2daa8dce4953faf811:
//   mem/cartridge_libretro.cpp rtcdata_ptr/size and mem/rtc.cpp — the .rtc file is
//   the 64-bit baseTime; the game clock is (now - baseTime).
import { GAMES, parseSave, bytesEqual, VBA_RTC_TAILS } from './core.js';

export const EMULATOR_TARGETS = {
  r36s: { label: 'R36S · RetroArch (.srm)', ext: 'srm' },
  wii: { label: 'Wii · Visual Boy Advance GX (.sav)', ext: 'sav' },
};
const DAY = 86400;
const need = (ok, message) => { if (!ok) { const e = new Error(message); e.name = 'SaveError'; throw e; } };
const baseName = name => String(name || 'partida').replace(/\.(sav|srm|rtc)$/i, '');
export const needsClock = game => game === 'crystal';

// gambatte .rtc → seconds on the game clock at `now` (unix seconds).
export function readGambatteRtc(bytes, now) {
  need(bytes instanceof Uint8Array && bytes.length === 8, 'El .rtc de la R36S debe tener 8 bytes (núcleo gambatte de RetroArch).');
  const base = Number(new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(0, true));
  need(Number.isSafeInteger(base) && base > 0 && base <= now + DAY, 'El .rtc no contiene una hora válida. Comprueba que es el de esta partida.');
  return now - base;
}
export function gambatteRtc(baseTime) {
  const out = new Uint8Array(8); new DataView(out.buffer).setBigUint64(0, BigInt(Math.max(0, Math.floor(baseTime))), true); return out;
}
// Game clock seconds → VBA GX tail (48 bytes, little endian) stamped at `now`.
export function vbaClockTail(clockSeconds, now) {
  const total = Math.max(0, Math.floor(clockSeconds)), days = Math.floor(total / DAY);
  const s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600) % 24;
  const control = ((days >> 8) & 1) | (days > 511 ? 0x80 : 0);
  const out = new Uint8Array(48), v = new DataView(out.buffer);
  [s, m, h, days & 0xFF, control, s, m, h, days & 0xFF, control].forEach((n, i) => v.setInt32(i * 4, n, true));
  v.setBigInt64(40, BigInt(Math.floor(now)), true);
  return out;
}
// VBA GX tail → { clockSeconds at lastTime, lastTime }. Accepts the little-endian
// format and the big-endian one of VBA GX 2.3.0 and older, as VBA GX itself does.
export function readVbaClockTail(tail) {
  need(VBA_RTC_TAILS.includes(tail.length), 'Bloque de reloj de VBA GX no reconocido.');
  const v = new DataView(tail.buffer, tail.byteOffset, tail.length);
  const read = little => {
    const n = [0, 1, 2, 3, 4].map(i => v.getInt32(i * 4, little));
    const last = tail.length === 48 ? Number(v.getBigInt64(40, little)) : v.getInt32(40, little);
    return { s: n[0], m: n[1], h: n[2], d: n[3], c: n[4], last };
  };
  let r = read(true);
  if (!(r.s >= 0 && r.s < 60 && r.m >= 0 && r.m < 60 && r.h >= 0 && r.h < 24 && r.d >= 0 && r.d < 256)) r = read(false);
  need(r.s >= 0 && r.s < 60 && r.m >= 0 && r.m < 60 && r.h >= 0 && r.h < 24 && r.d >= 0 && r.d < 256 && Number.isSafeInteger(r.last) && r.last > 0, 'El reloj guardado por VBA GX no es válido.');
  const days = ((r.c & 1) << 8) | r.d;
  return { clockSeconds: days * DAY + r.h * 3600 + r.m * 60 + r.s, lastTime: r.last, halted: !!(r.c & 0x40) };
}

// options.rtc: the R36S .rtc (Crystal → Wii). options.withoutClock: explicit
// consent to continue without it. options.now: unix seconds (tests).
export function convertForEmulator(bytes, game, target, fileName = 'partida.sav', language = 'es', options = {}) {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  need(bytes instanceof Uint8Array, 'Archivo no válido.');
  need(EMULATOR_TARGETS[target], 'Elige el emulador de destino.');
  need(GAMES[game] && GAMES[game].generation <= 3, 'El conversor es para Game Boy, Game Boy Color y GBA: en la Wii no hay emulador de Nintendo DS.');
  if (GAMES[game].generation === 3) need(bytes.length !== 65536, 'Este .sav de GBA tiene 64 KiB: el emulador lo guardó con el tipo de memoria equivocado. En VBA GX elige «Flash 128K» para Pokémon y vuelve a guardar dentro del juego.');
  const before = parseSave(bytes, game, language), notes = [], extra = [];
  const tail = needsClock(game) && VBA_RTC_TAILS.includes(bytes.length - 32768) ? bytes.subarray(32768) : null;
  const core = tail ? bytes.subarray(0, 32768) : bytes;
  let out = core.slice();
  if (needsClock(game) && target === 'wii') {
    if (options.rtc) {
      const clock = readGambatteRtc(options.rtc, now), stamped = vbaClockTail(clock, now);
      out = new Uint8Array(32768 + 48); out.set(core); out.set(stamped, 32768);
      notes.push(`Reloj de la R36S incluido: el juego marca ${Math.floor(clock / DAY)} días y ${new Date(clock * 1000).toISOString().slice(11, 16)} h desde que se puso en hora.`);
    } else if (tail) { out = bytes.slice(); notes.push('Ya es un .sav de VBA GX: conserva su bloque de reloj.'); }
    else {
      need(options.withoutClock === true, 'Cristal necesita el archivo .rtc de la R36S para conservar el reloj. Súbelo o confirma que quieres continuar sin él.');
      notes.push('Sin reloj: VBA GX pondrá el reloj del juego a la hora actual de la Wii y Cristal puede pedirte ajustarlo.');
    }
  } else if (needsClock(game) && target === 'r36s') {
    if (tail) {
      const clock = readVbaClockTail(tail);
      extra.push({ name: `${baseName(fileName)}.rtc`, bytes: gambatteRtc(clock.lastTime - clock.clockSeconds) });
      notes.push(`Reloj de la Wii convertido al archivo .rtc de la R36S${clock.halted ? ' (estaba detenido; seguirá corriendo)' : ''}. Copia el .srm y el .rtc juntos.`);
    } else notes.push('Este archivo no trae reloj: conserva el .rtc que ya tengas en la R36S.');
  } else notes.push('Los datos son idénticos; solo cambia la extensión.');
  // The converted file must read exactly the same Pokémon and battery bytes.
  const after = parseSave(out, game, language);
  need(after.records.length === before.records.length && after.records.every((r, i) => bytesEqual(r.raw, before.records[i].raw)), 'La conversión no conserva los mismos Pokémon. No se descargará.');
  need(bytesEqual(out.subarray(0, core.length), core), 'La conversión cambiaría datos del guardado.');
  return { files: [{ name: `${baseName(fileName)}.${EMULATOR_TARGETS[target].ext}`, bytes: out }, ...extra], notes, trainer: before.trainer, count: before.records.length };
}
