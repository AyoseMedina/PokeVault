// Optional browser integration suite for the account (docs/ACCOUNT_EMAIL.md).
// Synthetic data and a capturing mail transport. Install Playwright in .test-output/ui-check.
import { chromium } from '../.test-output/ui-check/node_modules/playwright/index.mjs';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { hashPassword } from '../server/password.js';
import { openVaultStore } from '../server/vault-store.js';
import { openAccountStore } from '../server/account-store.js';
import { createMailer } from '../server/mailer.js';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const password = randomBytes(18).toString('hex'), dir = await mkdtemp(join(tmpdir(), 'pokevault-browser-account-')), key = randomBytes(32);
const passwordHash = await hashPassword(password);
const config = readConfig({ POKEVAULT_USERNAME: 'owner', POKEVAULT_PASSWORD_HASH: passwordHash, POKEVAULT_SESSION_SECRET: randomBytes(32).toString('hex'), POKEVAULT_ORIGIN: 'http://localhost:18084' });
const vault = await openVaultStore(dir, key), account = await openAccountStore(dir, key, { username: 'owner', passwordHash });
const mails = [], mailer = createMailer(null, { transport: { sendMail: async m => { mails.push(m); } } });
const access = createApp(config, { vault, account, mailer }), server = access.app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
config.origin = `http://localhost:${server.address().port}`; config.host = new URL(config.origin).host;
const browser = await chromium.launch({ headless: true }), errors = [];
const fragment = mail => new URL(/https?:\/\/\S+#[A-Za-z0-9_-]+/.exec(mail.text)[0]);
try {
  const ctx = await browser.newContext(), page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const toast = text => page.waitForFunction(t => document.querySelector('#toast')?.textContent.includes(t), text);
  const login = async pass => { await page.goto(config.origin + '/login'); await page.fill('#username', 'owner'); await page.fill('#password', pass); await page.click('#submit'); await page.locator('#mobile-menu').waitFor({ state: 'attached' }); };
  await login(password);
  await page.locator('.sidebar [data-nav="account"]').click();
  await page.locator('#password-save').waitFor();
  assert.match(await page.locator('main').innerText(), /Todavía no hay un correo verificado/);
  console.log('PASS: account page reachable from the menu');

  // Email: confirmation link travels in the fragment and confirms in any browser.
  await page.fill('#account-email', 'owner@example.org'); await page.fill('#account-email-password', password); await page.click('#account-email-save'); await toast('enlace de confirmación');
  const confirm = fragment(mails.at(-1)); assert.equal(confirm.pathname, '/confirm-email');
  const other = await browser.newContext(), visitor = await other.newPage(); visitor.on('pageerror', e => errors.push(e.message));
  await visitor.goto(confirm.href); await visitor.waitForFunction(() => document.querySelector('#recover-title').textContent === 'Correo confirmado');
  assert.ok(!visitor.url().includes('#'), 'token removed from the address bar');
  await page.reload(); await page.locator('#notify-save').waitFor();
  assert.match(await page.locator('main').innerText(), /Correo verificado: owner@example\.org/);
  console.log('PASS: email confirmed through the fragment link');

  await page.check('[data-notify="digest"]'); await page.selectOption('#notify-backup', '14'); await page.click('#notify-save'); await toast('Avisos guardados');
  assert.equal(account.get().notify.digest, true); assert.equal(account.get().notify.backupDays, 14);
  console.log('PASS: notification preferences saved');

  // Password change keeps this session working (new CSRF) and warns by email.
  const next = 'una contraseña nueva bastante larga';
  await page.fill('#password-current', password); await page.fill('#password-next', next); await page.fill('#password-repeat', next); await page.click('#password-save'); await toast('Contraseña cambiada');
  await page.uncheck('[data-notify="digest"]'); await page.click('#notify-save'); await toast('Avisos guardados');
  assert.equal(account.get().notify.digest, false);
  assert.ok(mails.some(m => /ha cambiado/.test(m.subject)));
  console.log('PASS: password changed; same session keeps working; warning sent');

  // Forgot → reset from the login page.
  await visitor.goto(config.origin + '/login'); await visitor.locator('details summary').click(); await visitor.click('a[href="/reset"]');
  await visitor.locator('#forgot-submit:not([disabled])').waitFor(); await visitor.click('#forgot-submit');
  await visitor.waitForFunction(() => document.querySelector('#forgot-status').textContent.includes('Si la cuenta'));
  const reset = fragment(mails.at(-1)); assert.equal(reset.pathname, '/reset');
  const finalPassword = 'la contraseña final del test';
  await visitor.goto(reset.href); await visitor.waitForFunction(() => document.querySelector('#recover-title')?.textContent === 'Elige una contraseña nueva' && !document.querySelector('#reset-submit').disabled);
  await visitor.fill('#new-password', finalPassword); await visitor.fill('#repeat-password', finalPassword); await visitor.click('#reset-submit');
  await visitor.waitForFunction(() => document.querySelector('#recover-title').textContent === 'Contraseña cambiada');
  await page.reload(); await page.waitForURL(url => url.pathname === '/login');
  await login(finalPassword);
  console.log('PASS: reset by email closes sessions and the new password works');
  await other.close(); await ctx.close();
  assert.deepEqual(errors, []); console.log('Account browser checks passed.');
} finally { await browser.close(); access.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); await rm(dir, { recursive: true, force: true }); }
