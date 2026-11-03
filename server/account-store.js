// Account data on the persistent volume (docs/ACCOUNT_EMAIL.md): /data/account.enc,
// AES-256-GCM with the same key as the bank, written atomically. Environment
// variables only bootstrap the account the first time.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { atomicWrite, decrypt, encrypt } from './vault-store.js';
import { parseHash } from './password.js';

export const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
export const NOTIFY_DEFAULTS = Object.freeze({ login: false, backupDays: 30, digest: false, anniversaries: false, moves: false });
const tokenHash = token => createHash('sha256').update(String(token)).digest();
export const newToken = () => randomBytes(32).toString('base64url');

export function validNotify(value) {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(NOTIFY_DEFAULTS);
  if (Object.keys(value).some(k => !keys.includes(k))) return false;
  return ['login', 'digest', 'anniversaries', 'moves'].every(k => value[k] === undefined || typeof value[k] === 'boolean')
    && (value.backupDays === undefined || [0, 7, 14, 30, 60, 90].includes(value.backupDays));
}

export class AccountStore {
  #lock = Promise.resolve();
  #data = null;
  constructor(dir, key, { now = Date.now } = {}) { this.dir = dir; this.key = key; this.now = now; }

  async open({ username, passwordHash }) {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    let raw;
    try { raw = await readFile(`${this.dir}/account.enc`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!raw) {
      parseHash(passwordHash);
      this.#data = { version: 1, username, passwordHash, email: null, emailVerified: false, pendingEmail: null, sessionEpoch: 1,
        passwordChangedAt: null, notify: { ...NOTIFY_DEFAULTS }, reset: null, resetRequests: [], notices: {} };
      await this.#write();
      return this;
    }
    const data = JSON.parse(decrypt(this.key, raw, 'account').toString('utf8'));
    if (data.version !== 1 || typeof data.username !== 'string' || !Number.isSafeInteger(data.sessionEpoch)) throw new Error('account.enc tiene una versión desconocida. No se sobrescribirá; restaura la copia del volumen.');
    parseHash(data.passwordHash);
    this.#data = data;
    if (username !== data.username || passwordHash !== data.passwordHash) console.info('account: POKEVAULT_USERNAME/PASSWORD_HASH ignoradas; manda /data/account.enc');
    return this;
  }
  get() { return structuredClone(this.#data); }
  async #write() { await atomicWrite(this.dir, 'account.enc', encrypt(this.key, Buffer.from(JSON.stringify(this.#data)), 'account')); }
  // Serialized read-modify-write; the mutator may throw to abort without writing.
  update(mutate) {
    const run = this.#lock.then(async () => {
      const next = structuredClone(this.#data), result = await mutate(next);
      this.#data = next; await this.#write(); return result;
    });
    this.#lock = run.catch(() => {});
    return run;
  }
  static tokenRecord(token, ttlMs, now) { return { hash: tokenHash(token).toString('hex'), expiresAt: now + ttlMs }; }
  static matches(record, token, now) {
    if (!record || typeof token !== 'string' || token.length > 100 || now > record.expiresAt) return false;
    const expected = Buffer.from(record.hash, 'hex'), actual = tokenHash(token);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
export async function openAccountStore(dir, key, bootstrap, options) { return new AccountStore(dir, key, options).open(bootstrap); }
