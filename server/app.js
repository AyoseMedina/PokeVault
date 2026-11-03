import express from 'express';
import session from 'express-session';
import makeMemoryStore from 'memorystore';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sameString, verifyPassword } from './password.js';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const MemoryStore = makeMemoryStore(session);
const token = () => randomBytes(32).toString('hex');
const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
const save = req => new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));

export function createApp(config, { now = Date.now, loginLimit = 8, globalLimit = 30 } = {}) {
  const app = express();
  app.disable('x-powered-by'); app.disable('etag');
  app.set('trust proxy', config.trustProxy.length ? config.trustProxy : false);
  const store = new MemoryStore({ checkPeriod: 60_000, max: 512, ttl: config.idleMs });
  const cookieName = config.secure ? '__Host-pokevault.sid' : 'pokevault.local.sid';
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: config.secure, path: '/' };
  const clearCookie = res => res.clearCookie(cookieName, cookieOptions);
  const index = readFileSync(`${distDir}/index.html`, 'utf8')
    .replace('src="./app.js"', 'src="/auth-assets/entry.js"')
    .replace('</head>', '<link rel="stylesheet" href="/auth-assets/session.css"></head>');

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
  const accountLimiter = rateLimit({ ...limitOptions, limit: globalLimit, keyGenerator: () => 'single-account' });
  let checking = false;
  app.post('/auth/login', ipLimiter, accountLimiter, csrf, onlyJSON, express.json({ limit: '2kb', strict: true }), async (req, res) => {
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
      console.info('auth login_failed'); return res.status(401).json({ error: 'invalid_credentials' });
    }
    await regenerate(req);
    req.session.authenticated = true; req.session.issuedAt = now(); req.session.lastActive = now(); req.session.csrf = token();
    await save(req); console.info('auth login_success'); res.json({ ok: true });
  });
  const authenticated = (req, res, next) => req.session.authenticated ? next() : res.status(401).json({ error: 'authentication_required' });
  app.get('/auth/session', authenticated, (req, res) => res.json({ username: config.username, csrf: req.session.csrf, idleMs: config.idleMs }));
  app.post('/auth/activity', authenticated, csrf, async (req, res) => {
    req.session.lastActive = now(); await save(req); res.json({ ok: true });
  });
  app.post('/auth/logout', authenticated, csrf, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      clearCookie(res); console.info('auth logout'); res.json({ ok: true });
    });
  });
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
