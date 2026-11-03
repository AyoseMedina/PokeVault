import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixtureG3, makeDemoPK3, makeFixtureG2, parseSave } from '../dist/core.js';
import { tastes, feed, pet, play, moodOf, claimDaily, dailyAvailable, rewardGame, ensureCare, petOf, hearts, setBuddy, careKey, MAX_AFFECTION } from '../dist/care.js';

const [pk] = parseSave(makeFixtureG3('emerald', [makeDemoPK3(25, 20, 1)]), 'emerald').records;
const t0 = Date.parse('2026-11-03T12:00:00Z'), H = 3_600_000;
test('liked flavour follows the real nature (Gen III+), neutral natures like none', () => {
  const nature = n => tastes({ generation: 3, pid: n });
  assert.deepEqual([nature(1).liked, nature(1).disliked], ['spicy', 'sour'], 'Lonely: +Atk −Def');
  assert.deepEqual([nature(10).liked, nature(10).disliked], ['sweet', 'spicy'], 'Timid: +Spe −Atk');
  assert.equal(nature(0).liked, null, 'Hardy'); assert.equal(nature(24).liked, null, 'Quirky');
  const [crystal] = parseSave(makeFixtureG2([25]), 'crystal').records; assert.ok(tastes(crystal).liked && tastes(crystal).nature === null);
});
test('feeding uses berries, rewards favourites and cannot overfeed', () => {
  const state = {}; ensureCare(state); state.care.berries = { cheri: 2, pecha: 1, sour: 0, aspear: 1, oran: 1 };
  const fav = Object.entries({ spicy: 'cheri', sweet: 'pecha', sour: 'aspear' }).find(([f]) => f === tastes(pk).liked)?.[1];
  const first = feed(state, pk, 'oran', t0); assert.equal(first.gained, 8); assert.equal(state.care.berries.oran, 0);
  assert.equal(feed(state, pk, 'cheri', t0 + 60_000).reaction, 'full'); assert.equal(state.care.berries.cheri, 2, 'no berry spent when full');
  if (fav) assert.equal(feed(state, pk, fav, t0 + H).reaction, 'loves');
  assert.throws(() => feed(state, pk, 'oran', t0 + 2 * H), /No te quedan/);
  assert.throws(() => feed(state, pk, 'mystery', t0 + 2 * H), /desconocida/);
});
test('petting and playing raise affection with cooldowns; affection is capped and keyed by identity', () => {
  const state = {};
  assert.equal(pet(state, pk, t0).gained, 3); assert.equal(pet(state, pk, t0 + 60_000).gained, 1);
  assert.equal(play(state, pk, t0).gained, 6); assert.equal(play(state, pk, t0 + H).reaction, 'tired');
  assert.equal(petOf(state, pk).affection, 10);
  state.care.pokemon[careKey(pk)].affection = 254; play(state, pk, t0 + 3 * H); assert.equal(petOf(state, pk).affection, MAX_AFFECTION); assert.equal(hearts(MAX_AFFECTION), 5);
  setBuddy(state, pk); assert.equal(state.care.buddy, careKey(pk));
});
test('mood depends on time since care and the Canary Islands night', () => {
  assert.equal(moodOf({}, t0, 2).key, 'sleepy'); assert.equal(moodOf({}, t0, 12).key, 'hungry');
  assert.equal(moodOf({ fedAt: new Date(t0 - H).toISOString() }, t0, 12).key, 'bored');
  assert.equal(moodOf({ fedAt: new Date(t0 - H).toISOString(), playedAt: new Date(t0 - H).toISOString(), affection: 220 }, t0, 12).key, 'happy');
});
test('daily reward once per day with streak and Sitrus every 7 days; game rewards by score', () => {
  const state = {}; let rng = 0; const random = () => (rng = (rng + 0.37) % 1);
  for (let d = 0; d < 7; d++) { const now = t0 + d * 24 * H; assert.equal(dailyAvailable(state, now), true); const r = claimDaily(state, now, random); assert.equal(r.streak, d + 1); if (d === 6) assert.equal(r.gift.sitrus, 1); assert.throws(() => claimDaily(state, now + H, random), /Ya has recogido/); }
  assert.equal(claimDaily(state, t0 + 9 * 24 * H, random).streak, 1, 'streak resets after a missed day');
  const g = rewardGame(state, 'quiz', 10, 10, random); assert.equal(Object.values(g.gift).reduce((a, b) => a + b, 0), 6); assert.equal(g.record, true);
  assert.equal(rewardGame(state, 'quiz', 3, 10, random).record, false); assert.equal(state.care.best.quiz, 10);
});
