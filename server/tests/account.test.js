import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { readConfig } from '../config.js';
import { hashPassword } from '../password.js';
import { openVaultStore } from '../vault-store.js';
import { openAccountStore, AccountStore } from '../account-store.js';
import { createMailer, readSmtpConfig, message } from '../mailer.js';
import { runNotifications } from '../notifications.js';
import { makeFixtureG3, makeDemoPK3 } from '../../dist/core.js';

const key = randomBytes(32), password = randomBytes(18).toString('hex'), sha = b => createHash('sha256').update(b).digest('hex');
const passwordHash = await hashPassword(password);
const tempDir = async t => { const dir = await mkdtemp(join(tmpdir(), 'pokevault-account-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; };
const linkToken = mail => /#([A-Za-z0-9_-]{43})/.exec(mail.text)?.[1];

test('account bootstraps from env once, is encrypted and then ignores env', async t => {
  const dir = await tempDir(t);
  const account = await openAccountStore(dir, key, { username: 'owner', passwordHash });
  assert.equal(account.get().sessionEpoch, 1); assert.equal(account.get().email, null);
  const raw = await readFile(join(dir, 'account.enc'));
  assert.ok(!raw.includes(Buffer.from('owner')) && !raw.includes(Buffer.from(passwordHash.slice(20, 40))));
  await account.update(a => { a.email = 'me@example.org'; });
  const other = await hashPassword(randomBytes(18).toString('hex'));
  const reopened = await openAccountStore(dir, key, { username: 'changed', passwordHash: other });
  assert.equal(reopened.get().username, 'owner'); assert.equal(reopened.get().passwordHash, passwordHash); assert.equal(reopened.get().email, 'me@example.org');
  await assert.rejects(openAccountStore(dir, randomBytes(32), { username: 'owner', passwordHash }), /otra clave/);
  await assert.rejects(account.update(() => { throw new Error('abort'); }), /abort/);
  assert.equal(account.get().email, 'me@example.org');
});

test('tokens are single-purpose, compared in constant time and expire', () => {
  const record = AccountStore.tokenRecord('secret-token', 1000, 0);
  assert.ok(!JSON.stringify(record).includes('secret-token'));
  assert.equal(AccountStore.matches(record, 'secret-token', 999), true);
  assert.equal(AccountStore.matches(record, 'secret-token', 1001), false);
  assert.equal(AccountStore.matches(record, 'other', 10), false);
  assert.equal(AccountStore.matches(null, 'secret-token', 10), false);
});

test('SMTP requires TLS ports; messages escape HTML and keep subjects on one line', () => {
  assert.equal(readSmtpConfig({}), null);
  assert.throws(() => readSmtpConfig({ POKEVAULT_SMTP_HOST: 'smtp.example.org', POKEVAULT_SMTP_PORT: '25', POKEVAULT_SMTP_FROM: 'a@b.c' }), /465|587/);
  assert.throws(() => readSmtpConfig({ POKEVAULT_SMTP_HOST: 'smtp.example.org', POKEVAULT_SMTP_FROM: 'a@b.c\r\nBcc: x@y.z' }), /FROM/);
  assert.equal(readSmtpConfig({ POKEVAULT_SMTP_HOST: 'smtp.gmail.com', POKEVAULT_SMTP_PORT: '465', POKEVAULT_SMTP_USER: 'me@gmail.com' }).from, 'me@gmail.com');
  const m = message('Hola\r\nBcc: evil@x', ['<img src=x onerror=alert(1)> & "q"'], { link: 'https://x/reset#a"b', linkLabel: '<b>' });
  assert.ok(!m.html.includes('<img') && m.html.includes('&lt;img') && m.html.includes('&quot;q&quot;') && !m.html.includes('<b>'));
});

test('mailer limits volume and never throws on transport errors', async () => {
  const mails = [], mailer = createMailer(null, { transport: { sendMail: async m => { mails.push(m); } }, limits: { total: 3, security: 1 } });
  assert.equal(await mailer.send({ to: 'a@b.c', subject: 'x\ny', text: 't', kind: 'k', security: true }), true);
  assert.equal(mails[0].subject, 'x y');
  assert.equal(await mailer.send({ to: 'a@b.c', subject: 's', text: 't', kind: 'k', security: true }), false);
  assert.equal(await mailer.send({ to: 'a@b.c', subject: 's', text: 't', kind: 'k' }), true);
  const broken = createMailer(null, { transport: { sendMail: async () => { throw Object.assign(new Error('boom'), { code: 'ECONN' }); } } });
  assert.equal(await broken.send({ to: 'a@b.c', subject: 's', text: 't', kind: 'k' }), false);
});

async function server(t, { smtp = true } = {}) {
  let time = Date.now();
  const config = readConfig({ POKEVAULT_USERNAME: 'owner', POKEVAULT_PASSWORD_HASH: passwordHash, POKEVAULT_SESSION_SECRET: randomBytes(32).toString('hex') });
  const dir = await tempDir(t), vault = await openVaultStore(dir, key), account = await openAccountStore(dir, key, { username: 'owner', passwordHash }, { now: () => time });
  const mails = [], mailer = smtp ? createMailer(null, { transport: { sendMail: async m => { mails.push(m); } } }) : null;
  const access = createApp(config, { now: () => time, vault, account, mailer, loginLimit: 50 });
  const listener = access.app.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const base = `http://127.0.0.1:${listener.address().port}`; config.origin = base; config.host = new URL(base).host;
  t.after(() => { access.close(); listener.closeAllConnections(); listener.close(); });
  function client() {
    const cookies = new Map();
    const request = (path, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const http = httpRequest(base + path, { method, headers: { Host: config.host, Origin: config.origin, Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(payload ? { 'Content-Type': 'application/json' } : {}), ...headers } }, response => {
        const chunks = []; response.on('data', c => chunks.push(c)); response.on('end', () => {
          for (const v of response.headers['set-cookie'] || []) { const pair = v.split(';')[0], i = pair.indexOf('='); cookies.set(pair.slice(0, i), pair.slice(i + 1)); }
          const text = Buffer.concat(chunks).toString('utf8'); resolve({ status: response.statusCode, text, json: () => JSON.parse(text) });
        });
      });
      http.on('error', reject); if (payload) http.write(payload); http.end();
    });
    const csrf = async () => (await request('/auth/csrf')).json().csrf;
    return {
      request, csrf,
      async login(pass = password) { const r = await request('/auth/login', { method: 'POST', body: { username: 'owner', password: pass }, headers: { 'X-CSRF-Token': await csrf() } }); return r.status === 200 ? (await request('/auth/session')).json().csrf : null; },
      post: (path, body, token) => request(path, { method: 'POST', body, headers: { 'X-CSRF-Token': token } }),
    };
  }
  return { client, mails, account, vault, advance: ms => { time += ms; }, now: () => time };
}
async function verifyEmail(s, c, token, email = 'owner@example.org') {
  assert.equal((await c.post('/api/account/email', { email, password }, token)).status, 200);
  const anonymous = s.client(), mail = s.mails.at(-1);
  assert.equal(mail.to, email); assert.match(mail.text, /\/confirm-email#/);
  assert.equal((await anonymous.post('/auth/confirm-email', { token: linkToken(mail) }, await anonymous.csrf())).status, 200);
}

test('email change needs the password and a confirmation link; without SMTP it is refused', async t => {
  const plain = await server(t, { smtp: false }), pc = plain.client(), pt = await pc.login();
  assert.equal((await pc.post('/api/account/email', { email: 'a@b.org', password }, pt)).status, 503);
  const s = await server(t), c = s.client(), token = await c.login();
  assert.equal((await c.request('/api/account')).json().email, null);
  assert.equal((await c.post('/api/account/email', { email: 'owner@example.org', password: 'wrong-password-123' }, token)).status, 401);
  assert.equal((await c.post('/api/account/email', { email: 'not an email', password }, token)).status, 422);
  assert.equal((await c.post('/api/account/email', { email: 'owner@example.org', password }, 'bad-csrf')).status, 403);
  await verifyEmail(s, c, token);
  assert.deepEqual((await c.request('/api/account')).json().email, 'owner@example.org');
  // Second change: the old verified address is warned; an expired link fails.
  assert.equal((await c.post('/api/account/email', { email: 'new@example.org', password }, token)).status, 200);
  assert.ok(s.mails.some(m => m.to === 'owner@example.org' && /cambiar el correo/.test(m.subject)));
  const pending = linkToken(s.mails.find(m => m.to === 'new@example.org')); s.advance(25 * 3_600_000);
  const anonymous = s.client(); assert.equal((await anonymous.post('/auth/confirm-email', { token: pending }, await anonymous.csrf())).status, 400);
  assert.equal((await c.request('/api/account')).status, 401, 'idle session ends after 25 h');
});

test('password change verifies the current one, closes other sessions and warns by email', async t => {
  const s = await server(t), a = s.client(), b = s.client(), token = await a.login(); await b.login();
  await verifyEmail(s, a, token);
  assert.equal((await a.post('/api/account/password', { current: 'wrong-password-123', next: 'x'.repeat(20) }, token)).status, 401);
  assert.equal((await a.post('/api/account/password', { current: password, next: 'short' }, token)).status, 422);
  assert.equal((await a.post('/api/account/password', { current: password, next: password }, token)).status, 422);
  const next = 'una contraseña nueva y larga';
  const changed = await a.post('/api/account/password', { current: password, next }, token);
  assert.equal(changed.status, 200);
  assert.equal((await b.request('/api/account')).status, 401, 'other session closed');
  assert.equal((await a.request('/api/account')).status, 200, 'current session kept');
  assert.equal((await a.post('/api/account/notify', { digest: true }, changed.json().csrf)).status, 200);
  assert.ok(s.mails.some(m => /contraseña .* ha cambiado/.test(m.subject)));
  assert.equal(await s.client().login(password), null); assert.ok(await s.client().login(next));
});

test('forgot/reset: same answer always, rate limited, single use, expires, closes sessions', async t => {
  const s = await server(t), anonymous = s.client(), forgot = async () => (await anonymous.post('/auth/forgot', {}, await anonymous.csrf()));
  const before = await forgot(); assert.equal(before.status, 200); assert.equal(s.mails.length, 0, 'no verified email, no mail, same answer');
  const owner = s.client(), token = await owner.login(); await verifyEmail(s, owner, token);
  const count = s.mails.length, first = await forgot();
  assert.deepEqual(first.json(), before.json()); assert.equal(s.mails.length, count + 1);
  const resetMail = s.mails.at(-1); assert.match(resetMail.text, /\/reset#/); assert.ok(!resetMail.text.includes('?token'));
  await forgot(); assert.equal(s.mails.length, count + 1, 'one request per 5 minutes');
  // Expired link.
  s.advance(16 * 60_000);
  const expired = await anonymous.post('/auth/reset', { token: linkToken(resetMail), password: 'otra contraseña muy larga' }, await anonymous.csrf());
  assert.equal(expired.status, 400);
  await forgot(); const fresh = linkToken(s.mails.at(-1));
  assert.equal((await anonymous.post('/auth/reset', { token: fresh, password: 'corta' }, await anonymous.csrf())).status, 422);
  assert.equal((await anonymous.post('/auth/reset', { token: 'x'.repeat(43), password: 'otra contraseña muy larga' }, await anonymous.csrf())).status, 400);
  assert.equal((await anonymous.post('/auth/reset', { token: fresh, password: 'otra contraseña muy larga' }, await anonymous.csrf())).status, 200);
  assert.equal((await anonymous.post('/auth/reset', { token: fresh, password: 'y otra contraseña larga' }, await anonymous.csrf())).status, 400, 'single use');
  assert.equal((await owner.request('/api/account')).status, 401, 'sessions closed');
  assert.ok(s.mails.some(m => /restablecido/.test(m.subject)));
  assert.ok(await s.client().login('otra contraseña muy larga'));
  for (let i = 0; i < 3; i++) { s.advance(6 * 60_000); await forgot(); }
  assert.equal(s.mails.filter(m => /Restablecer/.test(m.subject)).length, 3, 'max 3 per hour');
});

test('notification preferences are validated', async t => {
  const s = await server(t), c = s.client(), token = await c.login();
  assert.equal((await c.post('/api/account/notify', { backupDays: 3 }, token)).status, 422);
  assert.equal((await c.post('/api/account/notify', { evil: true }, token)).status, 422);
  const ok = await c.post('/api/account/notify', { backupDays: 7, moves: true }, token);
  assert.equal(ok.status, 200); assert.equal(ok.json().notify.backupDays, 7); assert.equal(ok.json().notify.digest, false);
});

test('scheduled messages: backup reminder, new moves, weekly digest and anniversaries', async t => {
  const s = await server(t), mails = s.mails;
  await s.account.update(a => { Object.assign(a, { email: 'owner@example.org', emailVerified: true, notify: { login: false, backupDays: 7, digest: true, anniversaries: true, moves: true } }); });
  const bytes = makeFixtureG3('emerald', [makeDemoPK3(25, 20, 1)]); await s.vault.putBlob(sha(bytes), bytes);
  const year = 365 * 86_400_000, at = new Date(s.now() - year - 366 * 86_400_000 * 0).toISOString();
  const state = plans => ({ schema: 2, saves: [{ id: 's1', name: 'Esmeralda.sav', game: 'emerald', language: 'es', hash: sha(bytes), at }], backups: [], boxes: [{ id: 'b', name: 'C', slots: Array(30).fill(null) }], favorites: ['s1/pc/0/0'], notes: {}, snapshots: [], plans });
  await s.vault.commit(0, state([{ id: 'old', type: 'export', count: 1, destination: 'A.sav', at }]));
  const options = { account: s.account, vault: s.vault, mailer: createMailer(null, { transport: { sendMail: async m => mails.push(m) } }), now: s.now };
  const first = await runNotifications(options);
  assert.ok(first.includes('backup') && first.includes('digest') && first.includes('anniversary'), first.join());
  assert.match(mails.find(m => /Hace 1 año/.test(m.subject)).text, /Pikachu, nivel 20/); assert.ok(!first.includes('moves'), 'existing exports are not re-announced');
  const digest = mails.find(m => /semana/.test(m.subject)); assert.match(digest.text, /Pikachu, nivel 20 · Pokémon Esmeralda/);
  assert.deepEqual(await runNotifications(options), [], 'nothing repeats');
  await s.vault.commit(1, state([{ id: 'old', type: 'export', count: 1, destination: 'A.sav', at }, { id: 'new', type: 'export', count: 2, destination: 'Rojo Fuego.sav', route: 'III → III', at }]));
  assert.deepEqual(await runNotifications(options), ['moves']); assert.match(mails.at(-1).text, /2 Pokémon hacia Rojo Fuego\.sav/);
  await s.account.update(a => { a.emailVerified = false; });
  assert.deepEqual(await runNotifications({ ...options, now: () => s.now() + 30 * 86_400_000 }), [], 'no verified email, no messages');
});

test('emergency reset-account replaces the password from env and closes sessions', async t => {
  const { resetAccount } = await import('../vault-admin.mjs');
  const dir = await tempDir(t), account = await openAccountStore(dir, key, { username: 'owner', passwordHash });
  const fresh = await hashPassword('una contraseña de emergencia');
  const result = await resetAccount(dir, key, { username: 'owner', passwordHash: fresh });
  assert.equal(result.sessionEpoch, account.get().sessionEpoch + 1);
  const reopened = await openAccountStore(dir, key, { username: 'owner', passwordHash });
  assert.equal(reopened.get().passwordHash, fresh);
});
