import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixtureG2, makeFixtureG3, makeDemoPK3, parseSave } from '../dist/core.js';
import { fixtureYellow } from './fixtures/builders.js';
import { convertForEmulator, vbaClockTail, readVbaClockTail, gambatteRtc, readGambatteRtc } from '../dist/emulator-convert.js';

const now = 1_793_000_000, DAY = 86400;
test('GBA and Yellow: identical bytes, only the extension changes', () => {
  const gba = makeFixtureG3('emerald', [makeDemoPK3(25, 20, 1)]);
  const r = convertForEmulator(gba, 'emerald', 'r36s', 'Esmeralda.sav', 'es', { now });
  assert.equal(r.files.length, 1); assert.equal(r.files[0].name, 'Esmeralda.srm'); assert.deepEqual(r.files[0].bytes, gba);
  assert.equal(convertForEmulator(gba, 'emerald', 'wii', 'Esmeralda.srm').files[0].name, 'Esmeralda.sav');
  const yellow = fixtureYellow(); assert.deepEqual(convertForEmulator(yellow, 'yellow', 'wii', 'Amarillo.srm').files[0].bytes, yellow);
  assert.throws(() => convertForEmulator(new Uint8Array(65536), 'firered', 'r36s'), /Flash 128K/);
  assert.throws(() => convertForEmulator(new Uint8Array(524288), 'platinum', 'wii'), /Nintendo DS/);
});
test('clock formats round-trip: gambatte .rtc ⇄ VBA GX tail', () => {
  const clock = 300 * DAY + 5 * 3600 + 7 * 60 + 9, tail = vbaClockTail(clock, now), back = readVbaClockTail(tail);
  assert.equal(tail.length, 48); assert.equal(back.clockSeconds, clock); assert.equal(back.lastTime, now);
  assert.equal(new DataView(tail.buffer).getInt32(16, true), 1, 'day 300 sets the high day bit');
  assert.equal(readGambatteRtc(gambatteRtc(now - clock), now), clock);
  const be = new Uint8Array(48), v = new DataView(be.buffer); [9, 7, 5, 44, 1].forEach((n, i) => v.setInt32(i * 4, n, false)); v.setBigInt64(40, BigInt(now), false);
  assert.equal(readVbaClockTail(be).clockSeconds, clock, 'old big-endian VBA GX tails are read too');
  assert.throws(() => readGambatteRtc(new Uint8Array(4), now), /8 bytes/);
});
test('Crystal R36S → Wii asks for the .rtc and embeds the clock; Wii → R36S produces .srm + .rtc', () => {
  const srm = makeFixtureG2(), clock = 12 * DAY + 3600;
  assert.throws(() => convertForEmulator(srm, 'crystal', 'wii', 'Cristal.srm', 'es', { now }), /\.rtc/);
  const plain = convertForEmulator(srm, 'crystal', 'wii', 'Cristal.srm', 'es', { now, withoutClock: true });
  assert.equal(plain.files[0].bytes.length, 32768); assert.match(plain.notes[0], /Sin reloj/);
  const wii = convertForEmulator(srm, 'crystal', 'wii', 'Cristal.srm', 'es', { now, rtc: gambatteRtc(now - clock) });
  const sav = wii.files[0].bytes; assert.equal(sav.length, 32816); assert.deepEqual(sav.subarray(0, 32768), srm);
  assert.equal(readVbaClockTail(sav.subarray(32768)).clockSeconds, clock);
  assert.equal(parseSave(sav, 'crystal').records.length, parseSave(srm, 'crystal').records.length, 'PokéVault reads the Wii .sav directly');
  const later = now + 3 * 3600, back = convertForEmulator(sav, 'crystal', 'r36s', 'Cristal.sav', 'es', { now: later });
  assert.deepEqual(back.files.map(f => f.name), ['Cristal.srm', 'Cristal.rtc']); assert.deepEqual(back.files[0].bytes, srm);
  assert.equal(readGambatteRtc(back.files[1].bytes, later), clock + 3 * 3600, 'the clock kept running while on the Wii');
});

test('moving with Wii Crystal saves keeps each VBA GX clock tail byte for byte', async () => {
  const { buildMove } = await import('../dist/move.js');
  const withTail = (bytes, fill) => { const out = new Uint8Array(32816); out.set(bytes); out.set(vbaClockTail(fill * 1000, now), 32768); return out; };
  const source = { id: 's', hash: 'a'.repeat(64), name: 'Cristal Wii.sav', game: 'crystal', language: 'es', bytes: withTail(makeFixtureG2([25, 133]), 7) };
  const destination = { id: 'd', hash: 'b'.repeat(64), name: 'Cristal R36S.sav', game: 'crystal', language: 'es', bytes: withTail(makeFixtureG2([6]), 9) };
  const pick = { ...parseSave(source.bytes, 'crystal').records.find(r => r.species === 25), saveId: 's', game: 'crystal' };
  const result = buildMove(destination, [pick], 1, [source], { date: '2026-11-03' });
  for (const output of result.outputs) {
    assert.equal(output.bytes.length, 32816);
    assert.deepEqual(output.bytes.subarray(32768), output.save.bytes.subarray(32768), `${output.role}: clock tail unchanged`);
  }
  assert.equal(parseSave(result.outputs.find(o => o.role === 'source').bytes, 'crystal').records.some(r => r.species === 25), false);
});
