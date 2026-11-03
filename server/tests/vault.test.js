import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { cp, mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { readConfig, readVaultConfig } from '../config.js';
import { hashPassword } from '../password.js';
import { VaultStore, openVaultStore, encrypt, decrypt, KEEP_REVISIONS } from '../vault-store.js';
import { makeValidator, checkConsumed } from '../vault-validate.js';
import { makeFixtureG3, makeFixtureG2 } from '../../dist/core.js';

const key = randomBytes(32), sha = b => createHash('sha256').update(b).digest('hex');
const emerald = makeFixtureG3('emerald'), crystal = makeFixtureG2();
const tempDir = async t => { const dir = await mkdtemp(join(tmpdir(), 'pokevault-vault-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; };
const stateWith = (saves, extra = {}) => ({ schema: 2, saves, backups: [], boxes: [{ id: 'b1', name: 'Caja 1', slots: Array(30).fill(null) }], favorites: [], notes: {}, snapshots: [], plans: [], ...extra });
const save = (bytes, game, id = 's1', extra = {}) => ({ id, name: `${id}.sav`, game, language: 'es', hash: sha(bytes), at: '2026-11-03T12:00:00.000Z', ...extra });

test('vault key is mandatory, 32 bytes hex, and quota bounded', () => {
  assert.throws(() => readVaultConfig({}), /POKEVAULT_DATA_KEY/);
  assert.throws(() => readVaultConfig({ POKEVAULT_DATA_KEY: 'abc' }), /64/);
  const config = readVaultConfig({ POKEVAULT_DATA_KEY: key.toString('hex'), POKEVAULT_DATA_DIR: '/x' });
  assert.equal(config.dir, '/x'); assert.equal(config.key.length, 32); assert.equal(config.quotaBytes, 2048 * 1024 * 1024);
  assert.throws(() => readVaultConfig({ POKEVAULT_DATA_KEY: key.toString('hex'), POKEVAULT_VAULT_QUOTA_MB: '1' }), /QUOTA/);
});

test('AES-GCM files are bound to their key and AAD; tampering is detected', () => {
  const data = encrypt(key, Buffer.from('secret bank'), 'state:1');
  assert.equal(decrypt(key, data, 'state:1').toString(), 'secret bank');
  assert.ok(!data.includes(Buffer.from('secret')));
  assert.throws(() => decrypt(key, data, 'state:2'), /dañado|modificado/);
  assert.throws(() => decrypt(randomBytes(32), data, 'state:1'), /otra clave/);
  const flipped = Buffer.from(data); flipped[flipped.length - 1] ^= 1;
  assert.throws(() => decrypt(key, flipped, 'state:1'), /dañado/);
});

test('blobs are content-addressed, verified and encrypted on disk', async t => {
  const store = await openVaultStore(await tempDir(t), key);
  await assert.rejects(store.putBlob(sha(crystal), emerald), /SHA-256/);
  assert.equal(await store.putBlob(sha(emerald), emerald), true);
  assert.equal(await store.putBlob(sha(emerald), emerald), false);
  assert.deepEqual(new Uint8Array(await store.readBlob(sha(emerald))), emerald);
  assert.equal(await store.blobSize(sha(emerald)), emerald.length);
  const disk = await readFile(join(store.blobs, `${sha(emerald)}.enc`));
  assert.ok(!disk.subarray(40).equals(Buffer.from(emerald)));
});

test('commit uses If-Match, survives restart and rejects swapped or rolled-back files', async t => {
  const dir = await tempDir(t), store = await openVaultStore(dir, key);
  await store.putBlob(sha(emerald), emerald);
  const one = await store.commit(0, stateWith([save(emerald, 'emerald')]), { reason: 'Importar' });
  assert.equal(one.revision, 1);
  await assert.rejects(store.commit(0, stateWith([])), e => e.status === 409 && e.code === 'conflict');
  await store.commit(1, stateWith([save(emerald, 'emerald')], { favorites: ['x'] }));
  const reopened = await openVaultStore(dir, key);
  assert.equal((await reopened.current()).revision, 2);
  assert.deepEqual((await reopened.current()).state.favorites, ['x']);
  // Copying revision 1 over revision 2 fails authentication (AAD binds the revision).
  await cp(join(store.root, 'state-0000000001.enc'), join(store.root, 'state-0000000002.enc'));
  await assert.rejects(openVaultStore(dir, key), /dañado|modificado/);
  await assert.rejects(openVaultStore(dir, randomBytes(32)), /otra clave/);
});

test('startup fails closed when a referenced original is missing; temp files are cleaned', async t => {
  const dir = await tempDir(t), store = await openVaultStore(dir, key);
  await store.putBlob(sha(emerald), emerald);
  await store.commit(0, stateWith([save(emerald, 'emerald')]));
  await writeFile(join(store.root, '.state-0000000002.enc.abc.tmp'), 'partial write');
  await rm(join(store.blobs, `${sha(emerald)}.enc`));
  await assert.rejects(openVaultStore(dir, key), /Falta el original/);
  await store.putBlob(sha(emerald), emerald);
  await openVaultStore(dir, key);
  assert.ok(!(await readdir(store.root)).some(n => n.endsWith('.tmp')));
});

test(`keeps ${KEEP_REVISIONS} revisions and collects only unreferenced, old originals`, async t => {
  let now = Date.now();
  const store = await new VaultStore(await tempDir(t), key, { now: () => now }).open();
  await store.putBlob(sha(emerald), emerald); await store.putBlob(sha(crystal), crystal);
  await store.commit(0, stateWith([save(crystal, 'crystal', 'old')]));
  for (let r = 1; r <= KEEP_REVISIONS + 1; r++) await store.commit(r, stateWith([save(emerald, 'emerald')]));
  assert.equal((await store.revisions()).length, KEEP_REVISIONS);
  // Orphan inside the grace period stays; after it, the next commit removes it.
  const orphan = join(store.blobs, `${sha(crystal)}.enc`);
  if (await store.hasBlob(sha(crystal))) {
    now += 2 * 60 * 60_000; await utimes(orphan, new Date(now - 3 * 60 * 60_000), new Date(now - 3 * 60 * 60_000));
    await store.commit(KEEP_REVISIONS + 2, stateWith([save(emerald, 'emerald')]));
    assert.equal(await store.hasBlob(sha(crystal)), false);
  }
  assert.equal(await store.hasBlob(sha(emerald)), true);
  assert.equal((await store.history())[0].current, true);
});

test('validator: shape, sizes, quota, parse of new saves and consumed versions', async t => {
  const store = await openVaultStore(await tempDir(t), key), validate = makeValidator(store, { quotaBytes: 200_000 });
  await store.putBlob(sha(emerald), emerald);
  await assert.rejects(validate(stateWith([{ ...save(emerald, 'emerald'), bytes: [1] }]), null), /no debe contener bytes/);
  await assert.rejects(validate(stateWith([save(crystal, 'crystal')]), null), /Falta subir/);
  await validate(stateWith([save(emerald, 'emerald')]), null);
  await store.putBlob(sha(crystal), crystal);
  await assert.rejects(validate(stateWith([save(crystal, 'yellow')]), null), /no es válida para yellow/);
  const big = makeFixtureG3('emerald', [], 99); await store.putBlob(sha(big), big);
  await assert.rejects(validate(stateWith([save(emerald, 'emerald'), save(big, 'emerald', 's2')]), null), /cuota/);
  const consumed = stateWith([save(emerald, 'emerald', 's1', { consumedBy: 'exp1', consumedAt: '2026-11-03T12:00:00.000Z' })], { plans: [{ id: 'exp1', type: 'export' }] });
  assert.throws(() => checkConsumed(stateWith([save(emerald, 'emerald')], { plans: [{ id: 'exp1', type: 'export' }] }), consumed), /consumida/);
  assert.throws(() => checkConsumed(stateWith([save(emerald, 'emerald')], { plans: [] }), consumed), /consumida/);
  checkConsumed(stateWith([save(emerald, 'emerald')], { plans: [{ id: 'exp1', type: 'export', cancelledAt: '2026-11-03T13:00:00.000Z' }] }), consumed);
});

// HTTP: same login flow as auth.test.js, with binary bodies.
async function server(t, quotaMB = 64) {
  const password = randomBytes(24).toString('hex');
  const config = readConfig({ POKEVAULT_USERNAME: 'vault-owner', POKEVAULT_PASSWORD_HASH: await hashPassword(password), POKEVAULT_SESSION_SECRET: randomBytes(32).toString('hex') });
  const vault = await openVaultStore(await tempDir(t), key);
  const access = createApp(config, { vault, vaultQuotaBytes: quotaMB * 1024 * 1024 });
  const listener = access.app.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const base = `http://127.0.0.1:${listener.address().port}`; config.origin = base; config.host = new URL(base).host;
  t.after(() => { access.close(); listener.closeAllConnections(); listener.close(); });
  const cookies = new Map();
  const request = (path, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const binary = body instanceof Uint8Array, payload = body === undefined ? undefined : binary ? Buffer.from(body) : JSON.stringify(body);
    const http = httpRequest(base + path, { method, headers: { Host: config.host, Origin: config.origin, Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
      ...(payload === undefined ? {} : { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' }), ...headers } }, response => {
      const chunks = []; response.on('data', c => chunks.push(c)); response.on('end', () => {
        for (const v of response.headers['set-cookie'] || []) { const pair = v.split(';')[0], i = pair.indexOf('='); cookies.set(pair.slice(0, i), pair.slice(i + 1)); }
        const raw = Buffer.concat(chunks); resolve({ status: response.statusCode, raw, json: () => JSON.parse(raw.toString('utf8')) });
      });
    });
    http.on('error', reject); if (payload !== undefined) http.write(payload); http.end();
  });
  const login = async () => {
    const csrf = (await request('/auth/csrf')).json().csrf;
    assert.equal((await request('/auth/login', { method: 'POST', body: { username: 'vault-owner', password }, headers: { 'X-CSRF-Token': csrf } })).status, 200);
    return (await request('/auth/session')).json().csrf;
  };
  return { request, login, vault };
}

test('API requires a session and CSRF, verifies uploads and enforces If-Match', async t => {
  const { request, login } = await server(t);
  assert.equal((await request('/api/vault')).status, 401);
  assert.equal((await request(`/api/vault/blob/${sha(emerald)}`, { method: 'PUT', body: emerald })).status, 401);
  const csrf = await login(), auth = { 'X-CSRF-Token': csrf };
  assert.equal((await request('/auth/session')).json().vault, true);
  assert.deepEqual((await request('/api/vault')).json(), { revision: 0, savedAt: null, state: null });
  assert.equal((await request(`/api/vault/blob/${sha(emerald)}`, { method: 'PUT', body: emerald })).status, 403);
  assert.equal((await request(`/api/vault/blob/${sha(crystal)}`, { method: 'PUT', body: emerald, headers: auth })).status, 400);
  assert.equal((await request(`/api/vault/blob/${sha(emerald)}`, { method: 'PUT', body: emerald.subarray(0, 1000), headers: auth })).status, 422);
  assert.equal((await request(`/api/vault/blob/${sha(emerald)}`, { method: 'PUT', body: emerald, headers: auth })).status, 201);
  assert.equal((await request(`/api/vault/blob/${sha(emerald)}`, { method: 'PUT', body: emerald, headers: auth })).status, 200);
  const state = stateWith([save(emerald, 'emerald')]);
  assert.equal((await request('/api/vault', { method: 'PUT', body: { state }, headers: auth })).status, 428);
  const put = await request('/api/vault', { method: 'PUT', body: { state, reason: 'Importar' }, headers: { ...auth, 'If-Match': '0' } });
  assert.equal(put.status, 200); assert.equal(put.json().revision, 1);
  const stale = await request('/api/vault', { method: 'PUT', body: { state }, headers: { ...auth, 'If-Match': '0' } });
  assert.equal(stale.status, 409); assert.equal(stale.json().error, 'conflict');
  const empty = await request('/api/vault', { method: 'PUT', body: { state, onlyEmpty: true }, headers: { ...auth, 'If-Match': '1' } });
  assert.equal(empty.status, 409); assert.equal(empty.json().error, 'not_empty');
  const got = (await request('/api/vault')).json(); assert.equal(got.revision, 1); assert.equal(got.state.saves[0].hash, sha(emerald));
  const blob = await request(`/api/vault/blob/${sha(emerald)}`); assert.equal(sha(blob.raw), sha(emerald));
  assert.equal((await request('/api/vault/blob/../../etc')).status, 404);
  assert.equal((await request(`/api/vault/blob/${'0'.repeat(64)}`)).status, 404);
});

test('restoring an old revision creates a new one and never releases consumed versions', async t => {
  const { request, login } = await server(t);
  const auth = { 'X-CSRF-Token': await login() };
  await request(`/api/vault/blob/${sha(emerald)}`, { method: 'PUT', body: emerald, headers: auth });
  const put = (state, rev) => request('/api/vault', { method: 'PUT', body: { state }, headers: { ...auth, 'If-Match': String(rev) } });
  assert.equal((await put(stateWith([save(emerald, 'emerald')]), 0)).status, 200);
  const consumed = stateWith([save(emerald, 'emerald', 's1', { consumedBy: 'exp1', consumedAt: '2026-11-03T12:00:00.000Z' })], { plans: [{ id: 'exp1', type: 'export', at: '2026-11-03T12:00:00.000Z' }] });
  assert.equal((await put(consumed, 1)).status, 200);
  assert.equal((await put(stateWith([save(emerald, 'emerald')]), 2)).status, 422);
  const restored = await request('/api/vault/restore/1', { method: 'POST', headers: { ...auth, 'If-Match': '2' } });
  assert.equal(restored.status, 200); assert.equal(restored.json().revision, 3);
  const now = (await request('/api/vault')).json();
  assert.equal(now.state.saves[0].consumedBy, 'exp1');
  const history = (await request('/api/vault/history')).json().revisions;
  assert.deepEqual(history.map(r => r.revision), [3, 2, 1]); assert.match(history[0].reason, /Restaurar revisión 1/);
});

test('rotate-key re-encrypts, verifies and keeps the previous directory', async t => {
  const { rotateKey, verify } = await import('../vault-admin.mjs');
  const dir = await tempDir(t), store = await openVaultStore(dir, key);
  await store.putBlob(sha(emerald), emerald);
  await store.commit(0, stateWith([save(emerald, 'emerald')]));
  const newKey = randomBytes(32), result = await rotateKey(dir, key, newKey);
  assert.equal(result.originals, 1); assert.equal(result.head, 1);
  await assert.rejects(openVaultStore(dir, key), /otra clave/);
  const rotated = await openVaultStore(dir, newKey);
  assert.deepEqual(await verify(rotated), { head: 1, revisions: 1, originals: 1 });
  assert.ok((await readdir(dir)).some(n => n.startsWith('vault.old-')));
});
