// Encrypted, atomic, content-addressed bank storage (docs/SERVER_VAULT.md).
// Layout under <dir>/vault: HEAD.enc, state-<rev>.enc, blobs/<sha256>.enc.
// Every file is AES-256-GCM with AAD binding its kind and name, so files
// cannot be swapped, renamed or rolled back without detection.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MAGIC = Buffer.from('PVE1');
export const HASH = /^[a-f0-9]{64}$/;
export const KEEP_REVISIONS = 50;
const ORPHAN_GRACE_MS = 60 * 60_000;

export class VaultError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export const keyId = key => createHash('sha256').update(key).digest().subarray(0, 8);
export function parseKey(value) {
  if (!/^[a-f0-9]{64}$/.test(value || '')) throw new Error('POKEVAULT_DATA_KEY debe tener 64 caracteres hex (32 bytes). Genérala con create-credentials.mjs.');
  return Buffer.from(value, 'hex');
}
export function encrypt(key, plain, aad) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, keyId(key), nonce, cipher.getAuthTag(), body]);
}
export function decrypt(key, data, aad) {
  if (data.length < 40 || !data.subarray(0, 4).equals(MAGIC)) throw new VaultError('corrupt', `Archivo cifrado no reconocido (${aad}).`, 500);
  if (!data.subarray(4, 12).equals(keyId(key))) throw new VaultError('wrong_key', `El archivo ${aad} está cifrado con otra clave. Revisa POKEVAULT_DATA_KEY.`, 500);
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(12, 24));
  decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(data.subarray(24, 40));
  try { return Buffer.concat([decipher.update(data.subarray(40)), decipher.final()]); }
  catch { throw new VaultError('corrupt', `El archivo ${aad} está dañado o fue modificado. No se sobrescribirá.`, 500); }
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const revName = rev => `state-${String(rev).padStart(10, '0')}.enc`;

async function syncDir(dir) {
  let handle;
  try { handle = await open(dir, 'r'); await handle.sync(); }
  catch (error) { if (process.platform !== 'win32') throw error; } // Windows cannot fsync directories.
  finally { await handle?.close(); }
}
export async function atomicWrite(dir, name, data) {
  const temp = join(dir, `.${name}.${randomBytes(6).toString('hex')}.tmp`);
  const handle = await open(temp, 'wx', 0o600);
  try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, join(dir, name)); await syncDir(dir);
}

export class VaultStore {
  #lock = Promise.resolve();
  #refs = new Map();
  constructor(dir, key, { now = Date.now } = {}) { this.root = join(dir, 'vault'); this.blobs = join(this.root, 'blobs'); this.key = key; this.now = now; }

  // Serializes every mutation; reads of committed files need no lock.
  exclusive(task) { const run = this.#lock.then(task, task); this.#lock = run.catch(() => {}); return run; }

  async open() {
    await mkdir(this.blobs, { recursive: true, mode: 0o700 });
    for (const dir of [this.root, this.blobs]) for (const name of await readdir(dir)) if (name.endsWith('.tmp')) await rm(join(dir, name), { force: true });
    const head = await this.head();
    if (head) {
      const current = await this.readRevision(head);
      for (const hash of references(current.state)) if (!await this.hasBlob(hash)) throw new VaultError('missing_blob', `Falta el original ${hash.slice(0, 12)}… de la revisión ${head}. Restaura la copia del volumen.`, 500);
    }
    return this;
  }
  async head() {
    let data;
    try { data = await readFile(join(this.root, 'HEAD.enc')); }
    catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
    const revision = Number(decrypt(this.key, data, 'head').toString('utf8'));
    if (!Number.isSafeInteger(revision) || revision < 1) throw new VaultError('corrupt', 'HEAD del banco no válido.', 500);
    return revision;
  }
  async readRevision(revision) {
    let data;
    try { data = await readFile(join(this.root, revName(revision))); }
    catch (error) { if (error.code === 'ENOENT') throw new VaultError('missing_revision', `No existe la revisión ${revision}.`, 404); throw error; }
    const record = JSON.parse(decrypt(this.key, data, `state:${revision}`).toString('utf8'));
    if (record.revision !== revision || !record.state) throw new VaultError('corrupt', `Revisión ${revision} incoherente.`, 500);
    return record;
  }
  async current() { const head = await this.head(); return head ? this.readRevision(head) : { revision: 0, state: null, savedAt: null }; }

  async hasBlob(hash) { try { await stat(join(this.blobs, `${hash}.enc`)); return true; } catch { return false; } }
  async readBlob(hash) {
    if (!HASH.test(hash)) throw new VaultError('bad_hash', 'Hash no válido.');
    let data;
    try { data = await readFile(join(this.blobs, `${hash}.enc`)); }
    catch (error) { if (error.code === 'ENOENT') throw new VaultError('missing_blob', 'Original no encontrado.', 404); throw error; }
    const bytes = decrypt(this.key, data, `blob:${hash}`);
    if (sha256(bytes) !== hash) throw new VaultError('corrupt', `El original ${hash.slice(0, 12)}… no coincide con su hash.`, 500);
    return bytes;
  }
  // Plaintext size without decrypting: header (40 bytes) + GCM ciphertext of equal length.
  async blobSize(hash) { return (await stat(join(this.blobs, `${hash}.enc`))).size - 40; }
  // Idempotent: identical content always has the same name.
  async putBlob(hash, bytes) {
    if (!HASH.test(hash) || sha256(bytes) !== hash) throw new VaultError('hash_mismatch', 'El SHA-256 no coincide con los bytes recibidos.');
    return this.exclusive(async () => {
      if (await this.hasBlob(hash)) return false;
      await atomicWrite(this.blobs, `${hash}.enc`, encrypt(this.key, bytes, `blob:${hash}`));
      return true;
    });
  }

  // Writes the new state only if HEAD still equals `expected` (If-Match).
  // `validate(next, previous)` runs inside the lock and may throw VaultError.
  async commit(expected, state, { reason = '', validate = async () => {} } = {}) {
    return this.exclusive(async () => {
      const head = await this.head();
      if (head !== expected) throw new VaultError('conflict', 'El banco ha cambiado en otro dispositivo o pestaña. Recarga antes de continuar.', 409);
      const previous = head ? (await this.readRevision(head)).state : null;
      await validate(state, previous);
      for (const hash of references(state)) if (!await this.hasBlob(hash)) throw new VaultError('missing_blob', `Falta subir el original ${hash.slice(0, 12)}….`, 409);
      const revision = head + 1, record = { revision, savedAt: new Date(this.now()).toISOString(), reason: String(reason).slice(0, 120), state };
      await atomicWrite(this.root, revName(revision), encrypt(this.key, Buffer.from(JSON.stringify(record)), `state:${revision}`));
      await atomicWrite(this.root, 'HEAD.enc', encrypt(this.key, Buffer.from(String(revision)), 'head'));
      this.#refs.set(revision, references(state));
      await this.#prune(revision);
      return record;
    });
  }
  async history() {
    const head = await this.head(), list = [];
    for (const revision of await this.revisions()) {
      const { savedAt, reason, state } = await this.readRevision(revision);
      list.push({ revision, savedAt, reason, saves: state.saves?.length ?? 0, current: revision === head });
    }
    return list.reverse();
  }
  async revisions() {
    return (await readdir(this.root)).map(n => /^state-(\d{10})\.enc$/.exec(n)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
  }
  async #references(revision) {
    if (!this.#refs.has(revision)) this.#refs.set(revision, references((await this.readRevision(revision)).state));
    return this.#refs.get(revision);
  }
  // Keeps the last KEEP_REVISIONS states; a blob is deleted only when no kept
  // revision references it and it is older than the upload grace period.
  async #prune(head) {
    const revisions = await this.revisions(), keep = revisions.filter(r => r > head - KEEP_REVISIONS);
    for (const revision of revisions.filter(r => !keep.includes(r))) { await rm(join(this.root, revName(revision)), { force: true }); this.#refs.delete(revision); }
    const used = new Set();
    for (const revision of keep) for (const hash of await this.#references(revision)) used.add(hash);
    for (const name of await readdir(this.blobs)) {
      const hash = name.replace(/\.enc$/, '');
      if (!HASH.test(hash) || used.has(hash)) continue;
      const info = await stat(join(this.blobs, name));
      if (this.now() - info.mtimeMs > ORPHAN_GRACE_MS) await rm(join(this.blobs, name), { force: true });
    }
  }
}
export function references(state) {
  const hashes = new Set();
  for (const item of [...(state?.saves || []), ...(state?.backups || [])]) if (HASH.test(item?.hash || '')) hashes.add(item.hash);
  return hashes;
}
export async function openVaultStore(dir, key, options) { return new VaultStore(dir, key, options).open(); }
