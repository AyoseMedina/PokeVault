// Downloads shiny and animated sprites for species 1–649 from PokeAPI/sprites at
// a pinned commit into dist/sprites/. Run: node scripts/build-sprites.mjs
// The app only loads same-origin images (CSP), so sprites are bundled locally.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const COMMIT = '1dd55c0436d2a5b6e324c0b780e1b1b416fbfb64';
const BASE = `https://raw.githubusercontent.com/PokeAPI/sprites/${COMMIT}/sprites/pokemon`;
const MAX = 649;
const ROOT = new URL('../dist/sprites/', import.meta.url);
// Static PNGs 1–649 already exist in dist/sprites/<id>.png (front default).
const SETS = [
  { dir: 'shiny', remote: id => `shiny/${id}.png`, ext: 'png' },
  { dir: 'animated', remote: id => `versions/generation-v/black-white/animated/${id}.gif`, ext: 'gif' },
  { dir: 'animated/shiny', remote: id => `versions/generation-v/black-white/animated/shiny/${id}.gif`, ext: 'gif' },
];
const MAGIC = { png: [0x89, 0x50, 0x4E, 0x47], gif: [0x47, 0x49, 0x46, 0x38] };

async function fetchBytes(path) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE}/${path}`, { headers: { 'User-Agent': 'PokeVault-sprite-builder' } });
    if (response.ok) return new Uint8Array(await response.arrayBuffer());
    if (attempt === 3 || response.status === 404) throw new Error(`${response.status} ${path}`);
  }
}
const manifest = { source: `PokeAPI/sprites ${COMMIT}`, license: 'See https://github.com/PokeAPI/sprites; Pokémon images © Nintendo/Creatures/GAME FREAK.', files: {} };
const jobs = [];
for (const set of SETS) {
  await mkdir(new URL(`${set.dir}/`, ROOT), { recursive: true });
  for (let id = 1; id <= MAX; id++) jobs.push({ set, id });
}
let done = 0;
async function worker() {
  for (let job; (job = jobs.shift());) {
    const { set, id } = job, name = `${set.dir}/${id}.${set.ext}`, target = new URL(name, ROOT);
    let bytes;
    try { bytes = new Uint8Array(await readFile(target)); } catch { bytes = await fetchBytes(set.remote(id)); await writeFile(target, bytes); }
    if (!MAGIC[set.ext].every((b, i) => bytes[i] === b)) throw new Error(`${name}: not a ${set.ext}`);
    manifest.files[name] = createHash('sha256').update(bytes).digest('hex');
    if (++done % 200 === 0) console.log(`${done}/${SETS.length * MAX}`);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })));
await writeFile(new URL('SOURCES.json', ROOT), JSON.stringify(manifest, null, 1) + '\n');
console.log(`Sprites ready: ${Object.keys(manifest.files).length} files from ${COMMIT}.`);
