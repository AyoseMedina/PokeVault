import express from 'express';
import session from 'express-session';
import { PartitionedStore } from './session-store.js';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sameString, verifyPassword, hashPassword, validPassword } from './password.js';
import { AccountStore, EMAIL, newToken, validNotify } from './account-store.js';
import { message } from './mailer.js';
import { VaultError } from './vault-store.js';
import { makeValidator, SAVE_SIZES } from './vault-validate.js';
import { mergeConsumed } from '../dist/consumed.js';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const token = () => randomBytes(32).toString('hex');
const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
const save = req => new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));

export function createApp(config, { now = Date.now, loginLimit = 8, indexHTML = readFileSync(`${distDir}/index.html`, 'utf8'), vault = null, vaultQuotaBytes = 2 * 1024 ** 3, account = null, mailer = null } = {}) {
  // The account on the volume (docs/ACCOUNT_EMAIL.md) replaces the environment credentials once created.
  const credentials = () => account ? account.get() : { username: config.username, passwordHash: config.passwordHash, sessionEpoch: 1, notify: {}, email: null, emailVerified: false };
  const notices = new Map();
  // Security notices go only to a verified address; repeated kinds are spaced out.
  const notify = (kind, title, paragraphs, { every = 0 } = {}) => {
    const user = credentials();
    if (!mailer || !user.emailVerified || !user.email) return;
    if (every && now() - (notices.get(kind) || 0) < every) return;
    notices.set(kind, now());
    mailer.send({ to: user.email, kind, security: true, ...message(title, paragraphs) }).catch(() => {});
  };
  const app = express();
  app.disable('x-powered-by'); app.disable('etag');
  app.set('trust proxy', config.trustProxy.length ? config.trustProxy : false);
  const store = new PartitionedStore(config.idleMs);
  const cookieName = config.secure ? '__Host-pokevault.sid' : 'pokevault.local.sid';
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: config.secure, path: '/' };
  const clearCookie = res => res.clearCookie(cookieName, cookieOptions);
  const index = indexHTML
    .replace('src="./app.js"', 'src="/auth-assets/entry.js"')
    .replace('</head>', '<link rel="stylesheet" href="/auth-assets/session.css"></head>');
  if (!index.includes('src="/auth-assets/entry.js"') || !index.includes('/auth-assets/session.css')) { store.stopInterval(); throw new Error('Authenticated entry point missing from index.html'); }

  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
      baseUri: ["'none'"], formAction: ["'self'"], upgradeInsecureRequests: config.secure ? [] : null
    } },
    strictTransportSecurity: config.secure ? { maxAge: 31536000, includeSubDomains: false } : false,
    referrerPolicy: { policy: 'no-referrer' }
  }));
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/healthz', (_req, res) => res.type('text').send('ok\n'));
  app.use((req, res, next) => {
    if (req.headers.host !== config.host) return res.status(421).type('text').send('Use the configured PokéVault address.');
    if (config.secure && !req.secure) return res.status(400).type('text').send('HTTPS required. Check the trusted reverse proxy.');
    next();
  });
  app.use('/auth-assets', express.static(publicDir, { dotfiles: 'deny', index: false, etag: false, lastModified: false, cacheControl: false, fallthrough: false }));
  app.get('/favicon.svg', (_req, res) => res.sendFile(`${distDir}/favicon.svg`));
  app.use(session({
    name: cookieName, secret: config.sessionSecret, store, resave: false, saveUninitialized: false,
    rolling: true, cookie: { ...cookieOptions, maxAge: config.idleMs }
  }));
  app.use((req, res, next) => {
    const s = req.session;
    const expired = s.authenticated
      ? now() - s.issuedAt >= config.absoluteMs || now() - s.lastActive >= config.idleMs || s.epoch !== credentials().sessionEpoch
      : s.createdAt && now() - s.createdAt >= config.preauthMs;
    if (expired) return req.session.regenerate(error => { clearCookie(res); if (error) return next(error); next(); });
    next();
  });
  app.get('/login', async (req, res) => {
    if (req.session.authenticated) return res.redirect(303, '/');
    res.sendFile(`${publicDir}/login.html`);
  });
  const csrfLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
  app.get('/auth/csrf', csrfLimiter, async (req, res) => {
    req.session.csrf ||= token(); req.session.createdAt ||= now();
    await save(req); res.json({ csrf: req.session.csrf });
  });
  const csrf = (req, res, next) => {
    if (req.get('origin') !== config.origin || !sameString(req.get('x-csrf-token'), req.session.csrf)) {
      return res.status(403).json({ error: 'invalid_request' });
    }
    next();
  };
  const onlyJSON = (req, res, next) => req.is('application/json') ? next() : res.status(415).json({ error: 'json_required' });
  const throttled = (_req, res) => {
    notify('lockout', 'Demasiados intentos de acceso a PokéVault', ['Se han bloqueado temporalmente varios intentos fallidos de inicio de sesión o de contraseña.', 'Si no has sido tú, cambia tu contraseña desde «Cuenta».'], { every: 3_600_000 });
    res.status(429).json({ error: 'too_many_attempts' });
  };
  const limitOptions = { windowMs: 15 * 60_000, standardHeaders: 'draft-8', legacyHeaders: false, handler: throttled, skipSuccessfulRequests: true };
  const ipLimiter = rateLimit({ ...limitOptions, limit: loginLimit });
  let checking = false;
  app.post('/auth/login', csrf, onlyJSON, express.json({ limit: '2kb', strict: true }), ipLimiter, async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || username.length > 64 || typeof password !== 'string' || [...password].length > 128 || password.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (checking) { res.set('Retry-After', '2'); return res.status(429).json({ error: 'too_many_attempts' }); }
    checking = true;
    let valid;
    const user = credentials();
    try { valid = await verifyPassword(password, user.passwordHash); }
    finally { checking = false; }
    // Always perform the same password derivation, including unknown usernames.
    if (!valid || !sameString(username, user.username)) {
      console.info('auth login_failed', req.ip); return res.status(401).json({ error: 'invalid_credentials' });
    }
    await regenerate(req);
    req.session.authenticated = true; req.session.issuedAt = now(); req.session.lastActive = now(); req.session.csrf = token(); req.session.epoch = user.sessionEpoch;
    await save(req); console.info('auth login_success'); res.json({ ok: true });
    if (user.notify?.login) notify('login', 'Nuevo inicio de sesión en PokéVault', [`Se ha iniciado sesión el ${new Date(now()).toLocaleString('es-ES', { timeZone: 'Atlantic/Canary' })} (hora de Canarias).`, 'Si no has sido tú, cambia tu contraseña desde «Cuenta».']);
  });
  const authenticated = (req, res, next) => req.session.authenticated ? next() : res.status(401).json({ error: 'authentication_required' });
  app.get('/auth/session', authenticated, (req, res) => res.json({ username: credentials().username, csrf: req.session.csrf, idleMs: config.idleMs, vault: !!vault, account: !!account }));
  app.post('/auth/activity', authenticated, csrf, async (req, res) => {
    req.session.lastActive = now(); await save(req); res.json({ ok: true });
  });
  app.post('/auth/logout', authenticated, csrf, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      clearCookie(res); console.info('auth logout'); res.json({ ok: true });
    });
  });
  if (vault) app.use('/api/vault', vaultRouter({ vault, quotaBytes: vaultQuotaBytes, authenticated, csrf, onlyJSON }));
  if (account) accountRoutes(app, { account, mailer, config, now, authenticated, csrf, onlyJSON, ipLimiter, notify, regenerate, save, token, publicDir, lock: { get: () => checking, set: v => { checking = v; } } });
  app.use((req, res, next) => {
    if (req.path.startsWith('/auth/')) return res.status(404).json({ error: 'not_found' });
    if (!req.session.authenticated) {
      if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) return res.redirect(303, '/login');
      return res.status(401).json({ error: 'authentication_required' });
    }
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
    next();
  });
  app.get(['/', '/index.html'], (_req, res) => res.type('html').send(index));
  app.use(express.static(distDir, { dotfiles: 'deny', index: false, etag: false, lastModified: false, cacheControl: false }));
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use((error, _req, res, _next) => {
    const status = [400, 403, 404, 413].includes(error.status) ? error.status : 500;
    if (status === 500) console.error('auth internal_error');
    res.status(status).json({ error: status === 413 ? 'request_too_large' : 'request_failed' });
  });
  return { app, close: () => store.stopInterval(), store };
}

// Bank API (docs/SERVER_VAULT.md). Every route needs a session; writes need CSRF
// and If-Match with the current revision. Content is never logged.
function vaultRouter({ vault, quotaBytes, authenticated, csrf, onlyJSON }) {
  const api = express.Router(), validate = makeValidator(vault, { quotaBytes });
  const limiter = rateLimit({ windowMs: 60_000, limit: 900, standardHeaders: 'draft-8', legacyHeaders: false });
  const run = handler => (req, res, next) => handler(req, res).catch(next);
  const expected = req => {
    const value = req.get('if-match');
    if (!/^[0-9]{1,12}$/.test(value || '')) throw new VaultError('precondition_required', 'Falta la revisión del banco (If-Match).', 428);
    return Number(value);
  };
  api.use(limiter, authenticated);
  api.get('/', run(async (_req, res) => { const r = await vault.current(); res.json({ revision: r.revision, savedAt: r.savedAt, state: r.state }); }));
  api.get('/history', run(async (_req, res) => res.json({ revisions: await vault.history() })));
  api.get('/blob/:hash', run(async (req, res) => res.type('application/octet-stream').send(await vault.readBlob(req.params.hash))));
  api.put('/blob/:hash', csrf, express.raw({ type: 'application/octet-stream', limit: '600kb' }), run(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !SAVE_SIZES.has(req.body.length)) throw new VaultError('invalid_size', 'Tamaño de original no compatible.', 422);
    res.status(await vault.putBlob(req.params.hash, req.body) ? 201 : 200).json({ ok: true });
  }));
  api.put('/', csrf, onlyJSON, express.json({ limit: '16mb', strict: true }), run(async (req, res) => {
    const revision = expected(req), { state, onlyEmpty = false, reason = '' } = req.body || {};
    const record = await vault.commit(revision, state, { reason, validate: async (next, previous) => {
      if (onlyEmpty === true && previous?.saves?.length) throw new VaultError('not_empty', 'El banco del servidor ya tiene partidas. No se sustituirá.', 409);
      await validate(next, previous);
    } });
    console.info('vault commit', record.revision); res.json({ revision: record.revision, savedAt: record.savedAt });
  }));
  // Restoring an old revision creates a new one and never releases consumed versions.
  api.post('/restore/:revision', csrf, run(async (req, res) => {
    const revision = expected(req), target = Number(req.params.revision);
    if (!Number.isSafeInteger(target) || target < 1) throw new VaultError('bad_revision', 'Revisión no válida.', 400);
    const old = structuredClone((await vault.readRevision(target)).state);
    const record = await vault.commit(revision, old, { reason: `Restaurar revisión ${target}`, validate: async (next, previous) => {
      if (previous) { try { mergeConsumed(next, previous); } catch (error) { throw new VaultError('consumed', error.message, 409); } }
      await validate(next, previous);
    } });
    console.info('vault restore', target, '->', record.revision); res.json({ revision: record.revision, savedAt: record.savedAt });
  }));
  api.use((error, _req, res, next) => {
    if (!(error instanceof VaultError)) return next(error);
    if (error.status >= 500) console.error('vault error', error.code);
    res.status(error.status).json({ error: error.code, message: error.message });
  });
  return api;
}

// Account, password and email (docs/ACCOUNT_EMAIL.md). Public routes answer the
// same way whatever the account state, so they reveal nothing about it.
function accountRoutes(app, { account, mailer, config, now, authenticated, csrf, onlyJSON, ipLimiter, notify, regenerate, save, token, publicDir, lock }) {
  const json = express.json({ limit: '4kb', strict: true });
  const fail = (res, status, error, message) => res.status(status).json({ error, message });
  const run = handler => (req, res, next) => handler(req, res).catch(next);
  const link = (path, secret) => `${config.origin}${path}#${secret}`;
  // Password checks share the login lock and limiter: one scrypt at a time.
  async function checkPassword(password) {
    if (typeof password !== 'string' || !password || [...password].length > 128) return false;
    if (lock.get()) return null;
    lock.set(true);
    try { return await verifyPassword(password, account.get().passwordHash); } finally { lock.set(false); }
  }
  const view = user => ({ username: user.username, email: user.emailVerified ? user.email : null, pendingEmail: user.pendingEmail?.address || null,
    notify: user.notify, smtp: !!mailer, passwordChangedAt: user.passwordChangedAt });

  app.get(['/reset', '/confirm-email'], (req, res) => res.sendFile(`${publicDir}/recover.html`));
  app.get('/api/account', authenticated, (_req, res) => res.json(view(account.get())));

  app.post('/api/account/password', authenticated, csrf, onlyJSON, json, ipLimiter, run(async (req, res) => {
    const { current, next } = req.body || {};
    const valid = await checkPassword(current);
    if (valid === null) return fail(res, 429, 'busy', 'Comprobación en curso. Inténtalo de nuevo.');
    if (!valid) return fail(res, 401, 'invalid_password', 'La contraseña actual no es correcta.');
    if (!validPassword(next)) return fail(res, 422, 'weak_password', 'La nueva contraseña debe tener entre 15 y 128 caracteres.');
    if (next === current) return fail(res, 422, 'same_password', 'La nueva contraseña debe ser distinta de la actual.');
    const passwordHash = await hashPassword(next);
    const epoch = await account.update(user => { Object.assign(user, { passwordHash, passwordChangedAt: new Date(now()).toISOString(), reset: null }); user.sessionEpoch++; return user.sessionEpoch; });
    // Every other session ends; this one is regenerated with the new epoch.
    const csrfToken = token(); await regenerate(req);
    Object.assign(req.session, { authenticated: true, issuedAt: now(), lastActive: now(), csrf: csrfToken, epoch }); await save(req);
    notify('password_changed', 'Tu contraseña de PokéVault ha cambiado', ['Se ha cambiado la contraseña y se han cerrado las demás sesiones.', 'Si no has sido tú, usa «¿Olvidaste tu contraseña?» de inmediato.']);
    console.info('account password_changed'); res.json({ ok: true, csrf: csrfToken });
  }));

  app.post('/api/account/email', authenticated, csrf, onlyJSON, json, ipLimiter, run(async (req, res) => {
    const { password, email } = req.body || {};
    if (!mailer) return fail(res, 503, 'smtp_disabled', 'Configura SMTP en el servidor para usar el correo.');
    const valid = await checkPassword(password);
    if (valid === null) return fail(res, 429, 'busy', 'Comprobación en curso. Inténtalo de nuevo.');
    if (!valid) return fail(res, 401, 'invalid_password', 'La contraseña actual no es correcta.');
    if (typeof email !== 'string' || email.length > 254 || !EMAIL.test(email)) return fail(res, 422, 'invalid_email', 'Escribe una dirección de correo válida.');
    const secret = newToken(), before = account.get();
    await account.update(user => { user.pendingEmail = { address: email, ...AccountStore.tokenRecord(secret, 24 * 3_600_000, now()) }; });
    const sent = await mailer.send({ to: email, kind: 'email_confirm', ...message('Confirma tu correo de PokéVault', ['Pulsa el enlace para usar esta dirección en los avisos y la recuperación de tu cuenta. Caduca en 24 horas.', 'Si no lo has pedido tú, ignora este correo.'], { link: link('/confirm-email', secret), linkLabel: 'Confirmar correo' }) });
    if (before.emailVerified && before.email !== email) notify('email_change', 'Se ha pedido cambiar el correo de PokéVault', [`Se ha solicitado usar ${email} como nuevo correo. Hasta que se confirme, sigue activo este.`, 'Si no has sido tú, cambia tu contraseña.']);
    if (!sent) return fail(res, 502, 'smtp_failed', 'No se pudo enviar el correo de confirmación. Revisa la configuración SMTP.');
    res.json({ ok: true });
  }));

  app.post('/auth/confirm-email', csrf, onlyJSON, json, ipLimiter, run(async (req, res) => {
    const pending = account.get().pendingEmail, secret = req.body?.token;
    if (!AccountStore.matches(pending, secret, now())) return fail(res, 400, 'invalid_token', 'El enlace no es válido o ha caducado.');
    await account.update(user => { Object.assign(user, { email: pending.address, emailVerified: true, pendingEmail: null }); });
    console.info('account email_verified'); res.json({ ok: true });
  }));

  app.post('/api/account/notify', authenticated, csrf, onlyJSON, json, run(async (req, res) => {
    if (!validNotify(req.body)) return fail(res, 422, 'invalid_notify', 'Preferencias de avisos no válidas.');
    const notifyPrefs = await account.update(user => { user.notify = { ...user.notify, ...req.body }; return user.notify; });
    res.json({ ok: true, notify: notifyPrefs });
  }));

  // Always the same answer: whether an email exists or a link was sent is never revealed.
  app.post('/auth/forgot', csrf, onlyJSON, json, run(async (_req, res) => {
    const user = account.get(), at = now(), recent = (user.resetRequests || []).filter(t => at - t < 3_600_000);
    const allowed = mailer && user.emailVerified && user.email && recent.length < 3 && !recent.some(t => at - t < 5 * 60_000);
    if (allowed) {
      const secret = newToken();
      await account.update(next => { next.reset = AccountStore.tokenRecord(secret, 15 * 60_000, at); next.resetRequests = [...recent, at]; });
      await mailer.send({ to: user.email, kind: 'reset', security: true, ...message('Restablecer tu contraseña de PokéVault', ['Alguien ha pedido restablecer la contraseña. El enlace caduca en 15 minutos y solo sirve una vez.', 'Si no has sido tú, ignora este correo: tu contraseña no cambia.'], { link: link('/reset', secret), linkLabel: 'Elegir una contraseña nueva' }) });
    }
    console.info('account reset_requested'); res.json({ ok: true });
  }));

  app.post('/auth/reset', csrf, onlyJSON, json, ipLimiter, run(async (req, res) => {
    const { token: secret, password } = req.body || {};
    if (!AccountStore.matches(account.get().reset, secret, now())) return fail(res, 400, 'invalid_token', 'El enlace no es válido, ya se usó o ha caducado. Pide otro.');
    if (!validPassword(password)) return fail(res, 422, 'weak_password', 'La nueva contraseña debe tener entre 15 y 128 caracteres.');
    const passwordHash = await hashPassword(password);
    const changed = await account.update(user => {
      if (!AccountStore.matches(user.reset, secret, now())) return false; // used concurrently
      Object.assign(user, { passwordHash, passwordChangedAt: new Date(now()).toISOString(), reset: null }); user.sessionEpoch++; return true;
    });
    if (!changed) return fail(res, 400, 'invalid_token', 'El enlace ya se usó. Pide otro.');
    notify('password_reset', 'Tu contraseña de PokéVault se ha restablecido', ['Se ha usado el enlace de recuperación y se han cerrado todas las sesiones.', 'Si no has sido tú, vuelve a pedir un enlace y revisa la seguridad de tu correo.']);
    console.info('account password_reset'); res.json({ ok: true });
  }));
}
