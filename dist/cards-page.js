// «Cartas» page (docs/CARDS.md): the bank as trading cards. Read only.
// ctx is provided by app.js: { state, records, currentBox, GAMES, esc, img, icon,
// titleBlock, importButton, render, showModal, showPokemon, dexEntry, animationMode, $, $$ }.
import { cardModel } from './cards.js';
import { cardFront, cardBack } from './cards-view.js';

const PER_PAGE = 18;
const view = { scope: 'all', game: 'all', shiny: false, sort: 'box', page: 0 };
const helpers = ctx => ({ esc: ctx.esc, img: ctx.img, gameName: g => ctx.GAMES[g]?.name || g, dexText: (g, s) => ctx.dexEntry(g, s, 'es')?.text });

function cardList(ctx) {
  const keys = view.scope === 'box' ? (ctx.currentBox()?.slots.filter(Boolean) || []) : ctx.state.boxes.flatMap(b => b.slots.filter(Boolean));
  let list = keys.map(k => ctx.records.get(k)).filter(p => p && p.valid && !p.consumedBy)
    .filter(p => (view.game === 'all' || p.game === view.game) && (!view.shiny || p.shiny))
    .map(p => ({ p, m: cardModel(p) }));
  if (view.sort === 'level') list.sort((a, b) => b.m.level - a.m.level);
  if (view.sort === 'hp') list.sort((a, b) => (b.m.hp ?? 0) - (a.m.hp ?? 0));
  if (view.sort === 'dex') list.sort((a, b) => a.m.species - b.m.species);
  if (view.sort === 'rarity') { const order = { shiny: 0, legend: 1, rare: 2, uncommon: 3, common: 4 }; list.sort((a, b) => order[a.m.rarity.key] - order[b.m.rarity.key]); }
  return list;
}

export function renderCardsPage(ctx) {
  const { esc, icon, GAMES } = ctx, heading = ctx.titleBlock('Tus cartas', 'Cada Pokémon de tu banco, como una carta coleccionable.');
  if (!ctx.records.size) return heading + `<div class="empty-state"><div class="empty-illustration">${icon('spark')}</div><h3>Tu colección empieza aquí</h3><p>Importa una partida para ver a tus Pokémon como cartas.</p>${ctx.importButton()}</div>`;
  const list = cardList(ctx), pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  view.page = Math.min(view.page, pages - 1);
  const games = [...new Set([...ctx.records.values()].map(p => p.game))];
  const counts = list.reduce((c, { m }) => (c[m.rarity.key] = (c[m.rarity.key] || 0) + 1, c), {});
  return heading + `<div class="panel dex-controls">
    <div class="field"><label for="cards-scope">Mostrar</label><select id="cards-scope"><option value="all">Todo el banco</option><option value="box" ${view.scope === 'box' ? 'selected' : ''}>Caja actual: ${esc(ctx.currentBox()?.name || '')}</option></select></div>
    <div class="field"><label for="cards-game">Juego</label><select id="cards-game"><option value="all">Todos</option>${games.map(g => `<option value="${g}" ${view.game === g ? 'selected' : ''}>${esc(GAMES[g].name)}</option>`).join('')}</select></div>
    <div class="field"><label for="cards-sort">Orden</label><select id="cards-sort">${[['box', 'Orden del banco'], ['rarity', 'Rareza'], ['level', 'Mayor nivel'], ['hp', 'Más PS'], ['dex', 'Pokédex']].map(([v, l]) => `<option value="${v}" ${view.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label class="inline-check"><input type="checkbox" id="cards-shiny" ${view.shiny ? 'checked' : ''}>Solo variocolor</label></div></div>
    <p class="inline-note">${list.length} carta${list.length === 1 ? '' : 's'} · ${['shiny', 'legend', 'rare', 'uncommon', 'common'].filter(k => counts[k]).map(k => `${{ shiny: '✦ Variocolor', legend: '★ Legendaria', rare: '◆ Rara', uncommon: '◇ Poco común', common: '● Común' }[k]}: ${counts[k]}`).join(' · ')}</p>
    <section class="tcg-grid">${list.slice(view.page * PER_PAGE, (view.page + 1) * PER_PAGE).map(({ m }) => cardFront(m, helpers(ctx))).join('') || '<p class="no-results">No hay cartas con estos filtros.</p>'}</section>
    <div class="dex-pagination"><button class="btn btn-light btn-small" id="cards-prev" ${view.page === 0 ? 'disabled' : ''}>Anterior</button><span>Página ${view.page + 1} de ${pages}</span><button class="btn btn-light btn-small" id="cards-next" ${view.page >= pages - 1 ? 'disabled' : ''}>Siguiente</button></div>
    <p class="inline-note">Diseño propio de PokéVault. PS reales (nivel, ${'IV/DV'} y entrenamiento del guardado), potencia de los movimientos y tabla de tipos de la generación de cada juego, con datos de PokéAPI. Las cartas no cambian tus partidas.</p>`;
}

// Pointer tilt and holographic shine; off with reduced motion or animations disabled.
function tilt(ctx, el) {
  if (ctx.animationMode() !== 'full' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`); el.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
    el.style.setProperty('--mx', `${x * 100}%`); el.style.setProperty('--my', `${y * 100}%`); el.classList.add('tilting');
  });
  el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); ['--rx', '--ry'].forEach(v => el.style.setProperty(v, '0deg')); });
}

function showCard(ctx, key) {
  const p = ctx.records.get(key); if (!p) return;
  const m = cardModel(p), h = helpers(ctx);
  let back = false;
  ctx.showModal(`<div class="tcg-modal"><div class="tcg-stage-area">${cardFront(m, h, { large: true })}</div>
    <div class="modal-actions"><button class="btn btn-light" id="card-flip">${ctx.icon('refresh')}Girar carta</button><button class="btn btn-light" id="card-detail">${ctx.icon('info')}Ver ficha</button><button class="btn btn-primary" data-close>Cerrar</button></div></div>`, () => {
    const area = ctx.$('.tcg-stage-area');
    tilt(ctx, area.querySelector('.tcg'));
    ctx.$('#card-flip').onclick = () => { back = !back; area.innerHTML = back ? cardBack(m, p, h) : cardFront(m, h, { large: true }); tilt(ctx, area.querySelector('.tcg')); };
    ctx.$('#card-detail').onclick = () => ctx.showPokemon(key);
  });
}

export function bindCardsPage(ctx) {
  const { $, $$ } = ctx;
  if (!$('#cards-scope')) return;
  $('#cards-scope').onchange = e => { view.scope = e.target.value; view.page = 0; ctx.render(); };
  $('#cards-game').onchange = e => { view.game = e.target.value; view.page = 0; ctx.render(); };
  $('#cards-sort').onchange = e => { view.sort = e.target.value; ctx.render(); };
  $('#cards-shiny').onchange = e => { view.shiny = e.target.checked; view.page = 0; ctx.render(); };
  $('#cards-prev').onclick = () => { view.page--; ctx.render(); };
  $('#cards-next').onclick = () => { view.page++; ctx.render(); };
  $$('.tcg-grid [data-card]').forEach(card => {
    tilt(ctx, card);
    card.onclick = () => showCard(ctx, card.dataset.card);
    card.onkeydown = e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); showCard(ctx, card.dataset.card); } };
  });
}
