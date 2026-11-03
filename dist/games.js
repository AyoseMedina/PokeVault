// Minigames with your own Pokémon (docs/CARE_GAMES.md). Bank-only: they only award
// PokéVault berries. ctx from app.js: { getState, records, esc, img, icon, GAMES, titleBlock,
// commit, toast, render, showModal, closeModal, $, $$ }.
import { DATA } from './data.js';
import { TYPE_NAMES } from './core.js';
import { CARD_DATA as C } from './card-data.js';
import { BERRIES, rewardGame, ensureCare } from './care.js';
import { berryImg, giftText } from './care-view.js';

const shuffle = (list, random = Math.random) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const MAX_SPECIES = [0, 151, 251, 386, 493, 649];
const label = p => p.nickname && p.nickname.toLocaleLowerCase('es') !== (DATA.names[p.species] || '').toLocaleLowerCase('es') ? p.nickname : DATA.names[p.species];

// Pure helpers (tests/games.test.js).
export function speciesPool(records, minimum = 8, random = Math.random) {
  const own = [...new Set([...records.values()].filter(p => p.valid && !p.egg && !p.consumedBy).map(p => p.species))];
  const maxGen = Math.max(1, ...[...records.values()].map(p => p.generation || 1));
  const extra = shuffle(Array.from({ length: MAX_SPECIES[maxGen] }, (_, i) => i + 1).filter(n => !own.includes(n)), random);
  return [...shuffle(own, random), ...extra].slice(0, Math.max(minimum, own.length));
}
export function quizRound(pool, answer, random = Math.random) {
  const wrong = shuffle(pool.filter(n => n !== answer), random).slice(0, 3);
  return { answer, options: shuffle([answer, ...wrong], random) };
}
export function memoryDeck(pool, pairs = 8, random = Math.random) { return shuffle([...pool.slice(0, pairs), ...pool.slice(0, pairs)], random); }
export const memoryScore = moves => Math.max(0, Math.min(10, 10 - Math.floor(Math.max(0, moves - 8) / 2)));
export function factorAgainst(attack, types, generation) {
  const chart = C.charts[generation] || C.charts[5];
  return [...new Set(types)].reduce((f, t) => f * (chart[attack]?.[t] ?? 100) / 100, 1);
}
export function duelRound(p, random = Math.random) {
  const generation = p.generation || 5, types = p.types || DATA.types[p.species] || [1];
  const allowed = Array.from({ length: 17 }, (_, i) => i + 1).filter(t => !(generation === 1 && (t === 9 || t === 17)));
  const scored = allowed.map(t => ({ type: t, factor: factorAgainst(t, types, generation) }));
  const best = Math.max(...scored.map(s => s.factor));
  const strong = shuffle(scored.filter(s => s.factor === best), random)[0];
  const others = shuffle(scored.filter(s => s.factor < best), random).slice(0, 3);
  return { generation, types, best, options: shuffle([strong, ...others], random) };
}

const GAMES_LIST = [
  { id: 'quiz', name: '¿Quién es?', text: 'Adivina el Pokémon por su silueta. 10 rondas.', max: 10, icon: '❓' },
  { id: 'memory', name: 'Parejas', text: 'Encuentra las parejas de tus Pokémon con los menos intentos.', max: 10, icon: '🃏' },
  { id: 'rain', name: 'Lluvia de bayas', text: 'Atrapa todas las bayas que puedas en 30 segundos.', max: 30, icon: '🍒' },
  { id: 'duel', name: 'Duelo de tipos', text: 'Elige el ataque más eficaz con la tabla de tipos de su generación.', max: 10, icon: '⚡' },
];

export function renderGamesPage(ctx) {
  const state = ctx.getState(), best = state.care?.best || {}, berries = state.care?.berries || { oran: 3, pecha: 2 };
  const heading = ctx.titleBlock('Juegos', 'Juega con tus Pokémon y gana bayas para cuidarlos. Todo se queda en PokéVault.');
  if (!ctx.records.size) return heading + `<div class="empty-state"><h3>Importa una partida para jugar con tus Pokémon</h3></div>`;
  return heading + `<section class="panel"><div class="panel-header"><h3>Tus bayas</h3></div><div class="berry-row">${Object.keys(BERRIES).map(id => `<span class="berry-chip" title="${BERRIES[id].name}">${berryImg(id)}<b>${berries[id] || 0}</b></span>`).join('')}</div><p class="inline-note">Dáselas a tus Pokémon desde su ficha o a tu compañero en Mi banco.</p></section>
    <section class="game-grid">${GAMES_LIST.map(g => `<button class="game-tile" data-game="${g.id}"><span class="game-icon" aria-hidden="true">${g.icon}</span><strong>${g.name}</strong><small>${g.text}</small><em>Récord: ${best[g.id] ?? '—'}${best[g.id] !== undefined ? ` / ${g.max}` : ''}</em></button>`).join('')}</section>`;
}

async function finish(ctx, game, score, max, summary) {
  let result;
  try { await ctx.commit('Premio de minijuego', next => { ensureCare(next); result = rewardGame(next, game, score, max); }, { snapshot: false }); }
  catch (e) { ctx.toast(e.message); return; }
  const root = ctx.$('#game-root'); if (!root) return;
  root.innerHTML = `<div class="eyebrow">RESULTADO</div><h2>${score} / ${max}${result.record ? ' · ¡nuevo récord!' : ''}</h2><p>${ctx.esc(summary)}</p>
    <p class="game-prize">${Object.keys(result.gift).length ? `Has ganado: ${Object.keys(result.gift).map(id => `${berryImg(id)} ×${result.gift[id]}`).join(' ')}` : 'Esta vez no hay bayas. ¡Inténtalo otra vez!'}</p>
    <div class="modal-actions"><button class="btn btn-light" data-again>Jugar otra vez</button><button class="btn btn-primary" data-done>Terminar</button></div>`;
  ctx.$('[data-again]').onclick = () => startGame(ctx, game);
  ctx.$('[data-done]').onclick = () => { ctx.closeModal(); ctx.render(); };
  if (Object.keys(result.gift).length) ctx.toast(`Premio: ${giftText(result.gift)}.`);
}

function quiz(ctx) {
  const pool = speciesPool(ctx.records), rounds = shuffle(pool).slice(0, 10).map(n => quizRound(pool, n));
  let i = 0, score = 0;
  const show = () => {
    const r = rounds[i], root = ctx.$('#game-root');
    root.innerHTML = `<div class="eyebrow">¿QUIÉN ES? · ${i + 1} DE ${rounds.length} · ${score} ACIERTOS</div><div class="quiz-art">${ctx.img(r.answer, 'quiz-sprite silhouette')}</div>
      <div class="quiz-options">${r.options.map(n => `<button class="btn btn-light" data-answer="${n}">${ctx.esc(DATA.names[n])}</button>`).join('')}</div><p class="anim-text" role="status" aria-live="polite"></p>`;
    ctx.$$('[data-answer]').forEach(b => b.onclick = () => {
      const ok = Number(b.dataset.answer) === r.answer; if (ok) score++;
      ctx.$$('[data-answer]').forEach(x => { x.disabled = true; if (Number(x.dataset.answer) === r.answer) x.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      ctx.$('.quiz-sprite').classList.remove('silhouette');
      ctx.$('.anim-text').textContent = ok ? `¡Sí! Es ${DATA.names[r.answer]}.` : `¡Era ${DATA.names[r.answer]}!`;
      setTimeout(() => { i++; i < rounds.length ? show() : finish(ctx, 'quiz', score, rounds.length, `Has acertado ${score} de ${rounds.length} siluetas.`); }, 1200);
    });
  };
  show();
}

function memory(ctx) {
  const deck = memoryDeck(speciesPool(ctx.records)); let open = [], moves = 0, found = 0, busy = false;
  const root = ctx.$('#game-root');
  root.innerHTML = `<div class="eyebrow">PAREJAS · <span id="mem-moves">0</span> INTENTOS</div><div class="memory-grid">${deck.map((n, i) => `<button class="mem-card" data-i="${i}" aria-label="Carta ${i + 1}"><span class="mem-back"></span><span class="mem-front">${ctx.img(n)}</span></button>`).join('')}</div>`;
  ctx.$$('.mem-card').forEach(b => b.onclick = () => {
    if (busy || b.classList.contains('up')) return;
    b.classList.add('up'); open.push(b);
    if (open.length < 2) return;
    moves++; ctx.$('#mem-moves').textContent = moves;
    const [a, c] = open; open = [];
    if (deck[a.dataset.i] === deck[c.dataset.i]) { a.classList.add('done'); c.classList.add('done'); found++; if (found === deck.length / 2) setTimeout(() => finish(ctx, 'memory', memoryScore(moves), 10, `Has encontrado las ${found} parejas en ${moves} intentos.`), 600); }
    else { busy = true; setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); busy = false; }, 800); }
  });
}

function rain(ctx) {
  const root = ctx.$('#game-root'); let score = 0, left = 30, alive = true;
  root.innerHTML = `<div class="eyebrow">LLUVIA DE BAYAS · <span id="rain-time">30</span> s · <span id="rain-score">0</span> BAYAS</div><div class="rain-field" id="rain-field" aria-label="Toca las bayas que caen"></div>`;
  const field = ctx.$('#rain-field'), ids = ['cheri', 'chesto', 'pecha', 'rawst', 'aspear', 'oran'];
  const spawn = () => {
    if (!alive || !ctx.$('#rain-field')) return;
    const rare = Math.random() < 0.06, id = rare ? 'sitrus' : ids[Math.floor(Math.random() * ids.length)], b = document.createElement('button');
    b.className = 'rain-berry'; b.innerHTML = berryImg(id); b.setAttribute('aria-label', BERRIES[id].name);
    b.style.left = `${4 + Math.random() * 88}%`; b.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
    b.onpointerdown = () => { if (!alive) return; score = Math.min(30, score + (rare ? 3 : 1)); ctx.$('#rain-score').textContent = score; b.remove(); };
    b.addEventListener('animationend', () => b.remove());
    field.append(b); setTimeout(spawn, 420 + Math.random() * 380);
  };
  spawn();
  const tick = setInterval(() => {
    if (!ctx.$('#rain-field')) { clearInterval(tick); alive = false; return; }
    ctx.$('#rain-time').textContent = --left;
    if (left <= 0) { clearInterval(tick); alive = false; finish(ctx, 'rain', score, 30, `Has atrapado ${score} bayas.`); }
  }, 1000);
}

function duel(ctx) {
  const pokemon = shuffle([...ctx.records.values()].filter(p => p.valid && !p.egg && !p.consumedBy)).slice(0, 10);
  let i = 0, score = 0;
  const fx = f => f >= 4 ? '×4 ¡Supereficaz!' : f >= 2 ? '×2 ¡Supereficaz!' : f === 0 ? '×0 No afecta' : f < 1 ? `×${f === 0.25 ? '¼' : '½'} Poco eficaz` : '×1 Normal';
  const show = () => {
    const p = pokemon[i], r = duelRound(p), root = ctx.$('#game-root');
    root.innerHTML = `<div class="eyebrow">DUELO DE TIPOS · ${i + 1} DE ${pokemon.length} · ${score} ACIERTOS</div>
      <div class="quiz-art">${ctx.img(p.species, 'quiz-sprite', '', { shiny: p.shiny, animated: true })}</div>
      <p><strong>${ctx.esc(label(p))}</strong> · ${r.types.map(t => TYPE_NAMES[t]).filter((v, k, a) => a.indexOf(v) === k).join(' / ')} · tabla de Gen. ${['', 'I', 'II', 'III', 'IV', 'V'][r.generation]}</p>
      <div class="quiz-options">${r.options.map(o => `<button class="btn btn-light" data-type="${o.type}" data-factor="${o.factor}">Ataque ${TYPE_NAMES[o.type]}</button>`).join('')}</div><p class="anim-text" role="status" aria-live="polite"></p>`;
    ctx.$$('[data-type]').forEach(b => b.onclick = () => {
      const f = Number(b.dataset.factor), ok = f === r.best; if (ok) score++;
      ctx.$$('[data-type]').forEach(x => { x.disabled = true; if (Number(x.dataset.factor) === r.best) x.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      ctx.$('.anim-text').textContent = `${fx(f)}${ok ? '' : ` · El mejor era ${fx(r.best).split(' ')[0]}`}`;
      setTimeout(() => { i++; i < pokemon.length ? show() : finish(ctx, 'duel', score, pokemon.length, `Has elegido el mejor ataque ${score} de ${pokemon.length} veces.`); }, 1300);
    });
  };
  show();
}

export function startGame(ctx, id) {
  const game = GAMES_LIST.find(g => g.id === id);
  ctx.showModal(`<div id="game-root" class="game-root"></div>`, () => ({ quiz, memory, rain, duel })[id](ctx), true);
  ctx.$('.modal')?.setAttribute('aria-label', game.name);
}
export function bindGamesPage(ctx) { ctx.$$('[data-game]').forEach(b => b.onclick = () => startGame(ctx, b.dataset.game)); }
