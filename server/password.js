import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export function validPassword(password) {
  return typeof password === 'string' && [...password].length >= 15 && [...password].length <= 128;
}
export function parseHash(value) {
  const match = /^scrypt:131072:8:1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(value || '');
  if (!match) throw new Error('POKEVAULT_PASSWORD_HASH inválido. Usa create-credentials.mjs.');
  return { salt: Buffer.from(match[1], 'hex'), key: Buffer.from(match[2], 'hex') };
}
export async function hashPassword(password) {
  if (!validPassword(password)) throw new Error('Usa entre 15 y 128 caracteres / Use 15–128 characters.');
  const salt = randomBytes(16);
  const key = await derive(password, salt, 64, options);
  return `scrypt:131072:8:1:${salt.toString('hex')}:${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const { salt, key } = parseHash(encoded);
  const actual = await derive(password, salt, 64, options);
  return timingSafeEqual(key, actual);
}
export function sameString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a), second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
