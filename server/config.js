import { readFileSync } from 'node:fs';
import { parseHash } from './password.js';
import { parseKey } from './vault-store.js';

function secret(env, key) {
  if (env[`${key}_FILE`]) return readFileSync(env[`${key}_FILE`], 'utf8').trim();
  return env[key] || '';
}
export function readConfig(env = process.env) {
  const username = env.POKEVAULT_USERNAME || '';
  if (!/^[a-zA-Z0-9_.@-]{3,64}$/.test(username)) throw new Error('Configura POKEVAULT_USERNAME (3–64 caracteres).');
  const passwordHash = secret(env, 'POKEVAULT_PASSWORD_HASH');
  parseHash(passwordHash);
  const sessionSecret = secret(env, 'POKEVAULT_SESSION_SECRET');
  if (!/^[a-f0-9]{64,128}$/.test(sessionSecret)) throw new Error('Configura POKEVAULT_SESSION_SECRET con create-credentials.mjs.');
  const rawOrigin = env.POKEVAULT_ORIGIN || 'http://localhost:8080';
  const url = new URL(rawOrigin);
  if (url.origin !== rawOrigin || url.username || url.password) throw new Error('POKEVAULT_ORIGIN debe ser un origen sin ruta ni barra final.');
  const secure = url.protocol === 'https:';
  if (!secure && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('HTTP solo se permite en localhost. Usa HTTPS para LAN o nube.');
  }
  const trustProxy = env.POKEVAULT_TRUST_PROXY?.split(',').map(v => v.trim()).filter(Boolean) || [];
  if (trustProxy.some(v => ['true', '0.0.0.0/0', '::/0'].includes(v) || /^\d+$/.test(v))) {
    throw new Error('Indica direcciones o redes concretas del proxy.');
  }
  return { username, passwordHash, sessionSecret, origin: url.origin, host: url.host, secure, trustProxy,
    idleMs: 30 * 60_000, absoluteMs: 8 * 60 * 60_000, preauthMs: 10 * 60_000 };
}

// Server-side bank (docs/SERVER_VAULT.md). Required by the Docker/Node entry point.
export function readVaultConfig(env = process.env) {
  const key = parseKey(secret(env, 'POKEVAULT_DATA_KEY'));
  const dir = env.POKEVAULT_DATA_DIR || '/data';
  const quotaMB = Number(env.POKEVAULT_VAULT_QUOTA_MB || 2048);
  if (!Number.isInteger(quotaMB) || quotaMB < 64 || quotaMB > 65536) throw new Error('POKEVAULT_VAULT_QUOTA_MB debe estar entre 64 y 65536.');
  return { key, dir, quotaBytes: quotaMB * 1024 * 1024 };
}
