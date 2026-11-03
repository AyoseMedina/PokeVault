// Bank maintenance (docs/SERVER_VAULT.md). Run inside the container:
//   node server/vault-admin.mjs verify
//   POKEVAULT_NEW_DATA_KEY=<64 hex> node server/vault-admin.mjs rotate-key
// Stop the app container first for rotate-key (or run it with the same volume while stopped).
import { mkdir, readdir, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { readVaultConfig } from './config.js';
import { VaultStore, openVaultStore, decrypt, encrypt, atomicWrite, parseKey, HASH } from './vault-store.js';

export async function verify(store) {
  const revisions = await store.revisions(), hashes = new Set();
  for (const revision of revisions) { const { state } = await store.readRevision(revision); for (const item of [...state.saves, ...state.backups]) hashes.add(item.hash); }
  for (const hash of hashes) await store.readBlob(hash); // decrypts and checks SHA-256
  return { head: await store.head(), revisions: revisions.length, originals: hashes.size };
}

// Re-encrypts everything into vault.new, verifies it, then swaps directories.
// The previous directory is kept as vault.old-<timestamp> until you delete it.
export async function rotateKey(dir, oldKey, newKey) {
  const store = await openVaultStore(dir, oldKey), target = join(dir, 'vault.new');
  await rm(target, { recursive: true, force: true }); await mkdir(join(target, 'blobs'), { recursive: true, mode: 0o700 });
  for (const name of await readdir(store.root)) {
    const revision = /^state-(\d{10})\.enc$/.exec(name);
    const aad = name === 'HEAD.enc' ? 'head' : revision ? `state:${Number(revision[1])}` : null;
    if (aad) await atomicWrite(target, name, encrypt(newKey, decrypt(oldKey, await readFile(join(store.root, name)), aad), aad));
  }
  for (const name of await readdir(store.blobs)) {
    const hash = name.replace(/\.enc$/, ''); if (!HASH.test(hash)) continue;
    await atomicWrite(join(target, 'blobs'), name, encrypt(newKey, decrypt(oldKey, await readFile(join(store.blobs, name)), `blob:${hash}`), `blob:${hash}`));
  }
  const staged = new VaultStore(dir, newKey); staged.root = target; staged.blobs = join(target, 'blobs');
  const before = await verify(store), after = await verify(await staged.open());
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('La verificación tras recifrar no coincide. No se ha cambiado nada.');
  const backup = join(dir, `vault.old-${Date.now()}`);
  await rename(store.root, backup); await rename(target, store.root);
  return { ...after, previous: backup };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^(?!\/)/, '/')}`) {
  try {
    const config = readVaultConfig(), command = process.argv[2];
    if (command === 'verify') console.log(await verify(await openVaultStore(config.dir, config.key)));
    else if (command === 'rotate-key') {
      const result = await rotateKey(config.dir, config.key, parseKey(process.env.POKEVAULT_NEW_DATA_KEY));
      console.log({ ...result, next: 'Pon POKEVAULT_NEW_DATA_KEY como POKEVAULT_DATA_KEY en Portainer, arranca y borra la carpeta previous cuando lo compruebes.' });
    } else console.log('Uso: node server/vault-admin.mjs verify | rotate-key');
  } catch (error) { console.error(`PokéVault: ${error.message}`); process.exitCode = 1; }
}
