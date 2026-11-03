import express from 'express';
import session from 'express-session';
import { PartitionedStore } from './session-store.js';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sameString, verifyPassword } from './password.js';
import { VaultError } from './vault-store.js';
import { makeValidator, SAVE_SIZES } from './vault-validate.js';
import { mergeConsumed } from '../dist/consumed.js';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const token = () => randomBytes(32).toString('hex');
const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
const save = req => new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));

export function createApp(config, { now = Date.now, loginLimit = 8, indexHTML = readFileSync(`${distDir}/index.html`, 'utf8'), vault = null, vaultQuotaBytes = 2 * 1024 ** 3 } = {}) {
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
      ? now() - s.issuedAt >= config.absoluteMs || now() - s.lastActive >= config.idleMs
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
  const throttled = (_req, res) => res.status(429).json({ error: 'too_many_attempts' });
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
    try { valid = await verifyPassword(password, config.passwordHash); }
    finally { checking = false; }
    // Always perform the same password derivation, including unknown usernames.
    if (!valid || !sameString(username, config.username)) {
      console.info('auth login_failed', req.ip); return res.status(401).json({ error: 'invalid_credentials' });
    }
    await regenerate(req);
    req.session.authenticated = true; req.session.issuedAt = now(); req.session.lastActive = now(); req.session.csrf = token();
    await save(req); console.info('auth login_success'); res.json({ ok: true });
  });
  const authenticated = (req, res, next) => req.session.authenticated ? next() : res.status(401).json({ error: 'authentication_required' });
  app.get('/auth/session', authenticated, (req, res) => res.json({ username: config.username, csrf: req.session.csrf, idleMs: config.idleMs, vault: !!vault }));
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
