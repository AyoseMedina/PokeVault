// Pack strip and pack opening (docs/CARDS.md). Original design: PokéVault foil
// pack and card back. ctx from app.js plus { getState, commit, toast, render }.
import { cardModel } from './cards.js';
import { cardFront } from './cards-view.js';
import { unopened, revealOrder } from './packs.js';

const SPECIAL = new Set(['rare', 'legend', 'shiny']);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function packStrip(ctx) {
  const packs = unopened(ctx.getState());
  if (!packs.length) return '';
  return `<section class="panel pack-strip"><div class="panel-header"><div><h3>Sobres sin abrir</h3><p>${plural(packs.length, 'sobre', 'sobres')} con Pokémon nuevos de tu banco.</p></div></div>
    <div class="pack-row">${packs.map(p => `<button class="pack pack-small" data-pack="${ctx.esc(p.id)}" aria-label="Abrir sobre ${ctx.esc(p.source)} con ${p.keys.length} cartas"><span class="pack-crimp"></span><span class="pack-emblem" aria-hidden="true"></span><strong>PokéVault</strong><small>${ctx.esc(p.source)}</small><em>${plural(p.keys.length, 'carta', 'cartas')}</em><span class="pack-crimp bottom"></span></button>`).join('')}</div></section>`;
}

const backFace = '<div class="card-backface" aria-hidden="true"><span class="pack-emblem"></span><strong>PokéVault</strong></div>';

export function openPack(ctx, packId) {
  const pack = ctx.getState().packs?.items.find(p => p.id === packId);
  if (!pack) return;
  const models = revealOrder(pack.keys.map(k => ctx.records.get(k)).filter(Boolean).map(p => cardModel(p)));
  const mode = ctx.animationMode() === 'full' && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'full' : 'reduced';
  const h = { esc: ctx.esc, img: ctx.img, gameName: g => ctx.GAMES[g]?.name || g, dexText: () => '' };
  let index = -1, revealed = false, opened = false;

  const markOpened = () => {
    if (opened) return; opened = true;
    // Like a real pack: once torn it is opened, even if the reveal is skipped.
    ctx.commit('Abrir sobre de cartas', next => { const item = next.packs?.items.find(p => p.id === packId); if (item && !item.openedAt) item.openedAt = new Date().toISOString(); }, { snapshot: false }).then(() => ctx.render()).catch(e => ctx.toast(e.message));
  };
  const summary = () => {
    const root = ctx.$('#pack-root'); if (!root) return;
    root.className = `pack-stage mode-${mode} phase-summary`;
    root.innerHTML = `<div class="eyebrow">${ctx.esc(pack.source)} · ${plural(models.length, 'carta', 'cartas')}</div><h2>¡Nuevas cartas en tu colección!</h2>
      <div class="tcg-grid pack-summary">${models.map(m => cardFront(m, h)).join('')}</div>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Ver mis cartas</button></div>`;
    root.querySelectorAll('[data-close]').forEach(b => b.onclick = () => ctx.closeModal());
  };
  const showCard = () => {
    const root = ctx.$('#pack-root'), m = models[index]; if (!root) return;
    revealed = false;
    root.className = `pack-stage mode-${mode} phase-deck`;
    root.innerHTML = `<div class="eyebrow">${ctx.esc(pack.source)} · carta ${index + 1} de ${models.length}</div>
      <div class="pack-deck"><span class="deck-left" aria-hidden="true">${models.length - index - 1 > 0 ? backFace : ''}</span>
        <button class="flip-card ${SPECIAL.has(m.rarity.key) ? 'special' : ''} rarity-${m.rarity.key}" id="flip-card" aria-label="Girar carta ${index + 1}"><span class="flip-inner"><span class="flip-face flip-back">${backFace}</span><span class="flip-face flip-front">${cardFront(m, h)}</span></span>${SPECIAL.has(m.rarity.key) ? '<span class="burst" aria-hidden="true"></span>' : ''}</button></div>
      <p class="anim-text" role="status" aria-live="polite">Toca la carta para girarla</p>
      <div class="modal-actions"><button class="btn btn-light" id="pack-all">Ver todas</button><button class="btn btn-primary" id="pack-next">Girar carta</button></div>`;
    const flip = ctx.$('#flip-card'), next = ctx.$('#pack-next'), text = ctx.$('.anim-text');
    const advance = () => {
      if (!revealed) {
        revealed = true; flip.classList.add('revealed');
        text.textContent = `${m.rarity.symbol} ${m.title} · ${m.rarity.label}${m.shiny ? ' · ¡variocolor!' : ''}`;
        next.textContent = index + 1 < models.length ? 'Siguiente carta' : 'Ver resumen';
      } else if (index + 1 < models.length) { index++; showCard(); } else summary();
    };
    flip.onclick = advance; next.onclick = advance; ctx.$('#pack-all').onclick = summary; next.focus();
  };
  ctx.showModal(`<div id="pack-root" class="pack-stage mode-${mode} phase-closed">
      <div class="eyebrow">SOBRE · ${ctx.esc(pack.source)}</div>
      <button class="pack pack-large" id="pack-big" aria-label="Abrir el sobre"><span class="pack-tear" aria-hidden="true"></span><span class="pack-crimp"></span><span class="pack-emblem" aria-hidden="true"></span><strong>PokéVault</strong><small>${ctx.esc(pack.source)}</small><em>${plural(models.length, 'carta', 'cartas')}</em><span class="pack-crimp bottom"></span></button>
      <p class="anim-text" role="status" aria-live="polite">Toca el sobre para abrirlo</p>
      <div class="modal-actions"><button class="btn btn-primary" id="pack-open">Abrir sobre</button></div></div>`, () => {
    const open = () => {
      if (!models.length) { markOpened(); summary(); return; }
      markOpened(); ctx.$('#pack-root').classList.replace('phase-closed', 'phase-tearing');
      ctx.$('#pack-open').disabled = true; ctx.$('.anim-text').textContent = '¡Abriendo…!';
      setTimeout(() => { index = 0; showCard(); }, mode === 'full' ? 1100 : 200);
    };
    ctx.$('#pack-big').onclick = open; ctx.$('#pack-open').onclick = open; ctx.$('#pack-open').focus();
  }, true);
}
