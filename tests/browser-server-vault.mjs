// Optional browser integration suite for the server-side bank (docs/SERVER_VAULT.md).
// Synthetic data only. Install Playwright in .test-output/ui-check; see docs/VALIDATION.md.
import { chromium } from '../.test-output/ui-check/node_modules/playwright/index.mjs';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { hashPassword } from '../server/password.js';
import { openVaultStore } from '../server/vault-store.js';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeFixtureG3, makeDemoPK3, sha256 } from '../dist/core.js';
import assert from 'node:assert/strict';

const password = randomBytes(24).toString('hex'), dataDir = await mkdtemp(join(tmpdir(), 'pokevault-browser-vault-'));
const config = readConfig({ POKEVAULT_USERNAME: 'browser-test', POKEVAULT_PASSWORD_HASH: await hashPassword(password), POKEVAULT_SESSION_SECRET: randomBytes(32).toString('hex'), POKEVAULT_ORIGIN: 'http://localhost:18083' });
const vault = await openVaultStore(dataDir, randomBytes(32));
const access = createApp(config, { vault }), server = access.app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
config.origin = `http://localhost:${server.address().port}`; config.host = new URL(config.origin).host;
const browser = await chromium.launch({ headless: true }), errors = [];
const bytes = makeFixtureG3('firered', [makeDemoPK3(25, 20, 123)]), hash = await sha256(bytes), at = '2026-11-03T12:00:00.000Z';
const save = { id: 'local-save', name: 'Rojo Fuego.sav', game: 'firered', language: 'es', bytes: [...bytes], hash, at };
const localBank = { schema: 1, revision: 3, saves: [save], backups: [{ ...save, id: 'b1', saveId: save.id, reason: 'Original al importar' }], boxes: [{ id: 'box', name: 'Caja del navegador', slots: [`${save.id}/pc/0/0`, ...Array(29).fill(null)] }], favorites: [], notes: {}, snapshots: [], plans: [] };
const serverState = async () => (await vault.current());
try {
  async function login(context) { const page = await context.newPage(); await page.goto(config.origin); await page.fill('#username', 'browser-test'); await page.fill('#password', password); await page.click('#submit'); await page.locator('#mobile-menu').waitFor({ state: 'attached' }); return page; }
  async function device(seed) {
    const ctx = await browser.newContext({ acceptDownloads: true }), boot = await ctx.newPage();
    boot.on('pageerror', e => errors.push(e.message)); await boot.goto(config.origin + '/healthz');
    if (seed) await boot.evaluate(async seed => {
      for (const item of [...seed.saves, ...seed.backups]) item.bytes = new Uint8Array(item.bytes);
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open('pokevault-r36s-v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('vault'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      await new Promise((resolve, reject) => { const tx = db.transaction('vault', 'readwrite'); tx.objectStore('vault').put(seed, 'state'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
    }, seed);
    await boot.close(); const page = await login(ctx); page.on('pageerror', e => errors.push(e.message)); return { ctx, page };
  }
  const toast = (page, text) => page.waitForFunction(t => document.querySelector('#toast').textContent.includes(t), text);
  const nav = (page, id) => page.locator(`.sidebar [data-nav="${id}"]`).click();

  // 1. Device A has an old browser bank: banner, explicit verified upload, local copy kept.
  const a = await device(localBank);
  assert.match(await a.page.locator('main').innerText(), /banco anterior \(1 partida\)/);
  assert.match(await a.page.locator('.topbar').innerText(), /Explorando la demo/);
  await nav(a.page, 'backups'); await a.page.click('#upload-local'); await toast(a.page, 'subido y verificado');
  assert.match(await a.page.locator('.topbar').innerText(), /Guardado en el servidor/);
  let current = await serverState();
  assert.equal(current.revision, 1); assert.equal(current.state.saves[0].hash, hash); assert.equal(current.state.boxes[0].name, 'Caja del navegador');
  assert.ok(current.state.saves.every(s => !('bytes' in s)));
  assert.equal(await a.page.evaluate(async () => (await indexedDB.databases()).some(d => d.name === 'pokevault-r36s-v1')), true);
  console.log('PASS: explicit verified upload of the browser bank; local copy kept');

  // 2. Changes go to the server; a second device (no IndexedDB) sees the same bank.
  await nav(a.page, 'bank'); await a.page.locator('[data-action="new-box"]').first().click(); await a.page.fill('#box-name', 'Desde el móvil'); await a.page.click('#box-save'); await toast(a.page, 'Caja');
  assert.equal((await serverState()).revision, 2);
  const b = await device();
  assert.match(await b.page.locator('main').innerText(), /Desde el móvil/);
  assert.equal(await b.page.evaluate(async () => (await indexedDB.databases()).some(d => d.name === 'pokevault-r36s-v1')), false, 'server mode must not create a browser bank');
  console.log('PASS: server is the source of truth across devices; no browser bank created');

  // 3. Concurrent edit: the stale device gets a conflict and nothing is overwritten.
  await b.page.locator('[data-action="new-box"]').first().click(); await b.page.fill('#box-name', 'Dispositivo B'); await b.page.click('#box-save'); await toast(b.page, 'Caja');
  await a.page.locator('[data-action="new-box"]').first().click(); await a.page.fill('#box-name', 'Obsoleto'); await a.page.click('#box-save'); await toast(a.page, 'otro dispositivo');
  current = await serverState(); assert.equal(current.revision, 3); assert.ok(current.state.boxes.some(x => x.name === 'Dispositivo B')); assert.ok(!current.state.boxes.some(x => x.name === 'Obsoleto'));
  console.log('PASS: stale device receives a conflict; server state intact');

  // 4. History and restore create a new revision.
  await a.page.reload(); await a.page.locator('#mobile-menu').waitFor({ state: 'attached' });
  await nav(a.page, 'backups'); await a.page.click('#server-history'); await a.page.locator('[data-server-restore="1"]').waitFor();
  await a.page.click('[data-server-restore="1"]'); await a.page.click('[data-server-restore="1"]'); await toast(a.page, 'Versión restaurada');
  current = await serverState(); assert.equal(current.revision, 4); assert.ok(!current.state.boxes.some(x => x.name === 'Dispositivo B'));
  console.log('PASS: restoring revision 1 creates revision 4 without deleting later revisions');

  // 5. Deleting the old browser copy requires confirmation and leaves the server untouched.
  await a.page.click('#delete-local'); assert.equal(await a.page.locator('#confirm-delete-local').isDisabled(), true);
  await a.page.check('#local-ack'); await a.page.click('#confirm-delete-local'); await toast(a.page, 'Copia del navegador borrada');
  assert.equal(await a.page.evaluate(async () => (await indexedDB.databases()).some(d => d.name === 'pokevault-r36s-v1')), false);
  assert.equal((await serverState()).revision, 4);
  console.log('PASS: confirmed deletion of the browser copy; server unchanged');

  // 6. Import through the UI uploads the original once and survives a reload.
  await nav(a.page, 'bank'); await a.page.locator('[data-action="import"]').first().click();
  await a.page.selectOption('#import-game', 'emerald'); await a.page.selectOption('#import-language', 'es');
  const emerald = makeFixtureG3('emerald', [makeDemoPK3(6, 30, 7)]);
  await a.page.setInputFiles('#save-file', { name: 'Esmeralda.sav', mimeType: 'application/octet-stream', buffer: Buffer.from(emerald) });
  await a.page.waitForFunction(() => !document.querySelector('#import-confirm').disabled);
  if (await a.page.locator('#import-game-language').count()) await a.page.selectOption('#import-game-language', 'es');
  await a.page.click('#import-confirm'); await toast(a.page, 'importada');
  current = await serverState(); assert.equal(current.state.saves.length, 2); assert.equal(await vault.hasBlob(await sha256(emerald)), true);
  await a.page.reload(); await a.page.locator('#mobile-menu').waitFor({ state: 'attached' }); await nav(a.page, 'saves');
  assert.match(await a.page.locator('main').innerText(), /Esmeralda\.sav/);
  console.log('PASS: UI import stored on the server and present after reload');

  await a.ctx.close(); await b.ctx.close();
  assert.deepEqual(errors, []); console.log('Server vault browser checks passed.');
} finally { await browser.close(); access.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); await rm(dataDir, { recursive: true, force: true }); }
