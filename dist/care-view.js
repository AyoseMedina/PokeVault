// Care panel, buddy and daily reward UI (docs/CARE_GAMES.md). Bank-only.
// ctx from app.js: { getState, records, esc, img, icon, GAMES, commit, toast, render, showPokemon, $, $$ }.
import { BERRIES, FLAVOR_NAMES, tastes, petOf, hearts, moodOf, feed, pet, play, setBuddy, careKey, dailyAvailable, claimDaily } from './care.js';

const heartRow = n => `<span class="hearts" aria-label="${n} de 5 corazones">${'❤'.repeat(n)}<span class="hearts-off">${'❤'.repeat(5 - n)}</span></span>`;
export const berryImg = (id, cls = 'berry') => `<img class="${cls}" src="./sprites/items/${BERRIES[id].sprite}.png" alt="${BERRIES[id].name}" width="30" height="30" draggable="false">`;
const giftText = gift => Object.entries(gift).map(([id, n]) => `${n} ${BERRIES[id].name}`).join(', ');

export function carePanel(ctx, p) {
  if (!p.valid || p.egg) return '';
  const state = ctx.getState(), record = petOf(state, p), taste = tastes(p), mood = moodOf(record), berries = state.care?.berries || { oran: 3, pecha: 2 };
  const buddy = state.care?.buddy === careKey(p);
  const tasteText = taste.liked ? `Le gusta lo ${FLAVOR_NAMES[taste.liked]} y no tanto lo ${FLAVOR_NAMES[taste.disliked]}${taste.nature === null ? ' (gusto de PokéVault: en Gen I–II no hay naturalezas)' : ''}.` : 'Su naturaleza es neutra: le gustan todas las bayas por igual.';
  return `<section class="care-panel" aria-label="Cuidados">
    <div class="care-head"><strong>Cuidados</strong>${heartRow(hearts(record.affection))}<span class="mood mood-${mood.key}">${mood.emoji} ${mood.label}</span></div>
    <p class="inline-note">${ctx.esc(tasteText)} El cariño es solo de PokéVault: no cambia tu partida.</p>
    <div class="care-actions"><button class="btn btn-light btn-small" data-care="pet">🤚 Acariciar</button><button class="btn btn-light btn-small" data-care="play">🎾 Jugar</button><button class="btn btn-light btn-small" data-care="buddy" ${buddy ? 'disabled' : ''}>${buddy ? '⭐ Tu compañero' : '⭐ Hacer compañero'}</button></div>
    <div class="berry-row">${Object.keys(BERRIES).map(id => `<button class="berry-chip" data-berry="${id}" ${berries[id] > 0 ? '' : 'disabled'} title="${BERRIES[id].name}${BERRIES[id].flavor ? ` · ${FLAVOR_NAMES[BERRIES[id].flavor]}` : ''}">${berryImg(id)}<b>${berries[id] || 0}</b></button>`).join('')}</div>
    <p class="care-feedback" role="status" aria-live="polite"></p></section>`;
}

// Runs a care action, saves it and replays the reaction on the sprite.
async function act(ctx, key, mutate, reopen = true) {
  const p = ctx.records.get(key); if (!p) return;
  let result;
  try { await ctx.commit('Cuidar Pokémon', next => { result = mutate(next, p); }, { snapshot: false }); }
  catch (e) { ctx.toast(e.message); return; }
  if (reopen) ctx.showPokemon(key);
  const sprite = ctx.$('.pk-detail-hero img'), feedback = ctx.$('.care-feedback');
  if (feedback) feedback.textContent = `${result.text}${result.gained ? ` +${result.gained} de cariño.` : ''}`;
  if (sprite && result.reaction) { sprite.classList.add(`react-${result.reaction}`); if (['loves', 'pet', 'play', 'likes'].includes(result.reaction)) floatHearts(sprite.parentElement); }
  ctx.render();
}
function floatHearts(host) {
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 5; i++) { const h = document.createElement('span'); h.className = 'float-heart'; h.textContent = '❤'; h.style.setProperty('--x', `${(i - 2) * 18}px`); h.style.animationDelay = `${i * 90}ms`; host.append(h); setTimeout(() => h.remove(), 1600); }
}
export function bindCare(ctx, key) {
  ctx.$$('[data-care]').forEach(b => b.onclick = () => {
    const kind = b.dataset.care;
    if (kind === 'buddy') return act(ctx, key, (next, p) => { setBuddy(next, p); return { text: '¡Ahora es tu compañero! Te recibirá en Mi banco.', reaction: 'loves', gained: 0 }; });
    act(ctx, key, kind === 'pet' ? (next, p) => pet(next, p) : (next, p) => play(next, p));
  });
  ctx.$$('[data-berry]').forEach(b => b.onclick = () => act(ctx, key, (next, p) => feed(next, p, b.dataset.berry)));
}

// Buddy and daily reward on the bank page.
export function buddyPanel(ctx) {
  const state = ctx.getState(), id = state.care?.buddy, daily = dailyAvailable(state);
  const p = id ? [...ctx.records.values()].find(r => r.valid && !r.consumedBy && careKey(r) === id) : null;
  const dailyButton = daily ? `<button class="btn btn-primary btn-small" data-daily>🎁 Recompensa diaria</button>` : `<span class="inline-note">Racha: ${state.care?.daily?.streak || 0} día${state.care?.daily?.streak === 1 ? '' : 's'} · vuelve mañana</span>`;
  if (!p) return `<section class="panel buddy-panel buddy-empty"><div><h3>Tu compañero</h3><p>Abre la ficha de un Pokémon y pulsa «Hacer compañero» para que te reciba aquí.</p></div>${dailyButton}</section>`;
  const record = petOf(state, p), mood = moodOf(record), name = p.nickname && p.nickname.toLocaleLowerCase('es') !== p.name.toLocaleLowerCase('es') ? p.nickname : p.name;
  const lines = { hungry: `${name} te mira con hambre. ¿Le das una baya?`, bored: `${name} quiere jugar contigo.`, sleepy: `${name} está medio dormido. Zzz…`, happy: `¡${name} está feliz de verte!`, content: `${name} está tranquilo a tu lado.` };
  return `<section class="panel buddy-panel"><button class="buddy-sprite" data-buddy="${ctx.esc(p.key)}" aria-label="Ver la ficha de ${ctx.esc(name)}">${ctx.img(p.species, 'buddy-img', '', { shiny: p.shiny, animated: true })}</button>
    <div class="buddy-info"><div class="eyebrow">TU COMPAÑERO</div><h3>${ctx.esc(name)}${p.shiny ? ' ✦' : ''}</h3>${heartRow(hearts(record.affection))}<p class="buddy-bubble">${ctx.esc(lines[mood.key])}</p>
    <div class="care-actions"><button class="btn btn-light btn-small" data-buddy-act="pet">🤚 Acariciar</button><button class="btn btn-light btn-small" data-buddy-act="play">🎾 Jugar</button><button class="btn btn-light btn-small" data-buddy="${ctx.esc(p.key)}">🍒 Dar baya</button>${dailyButton}</div></div></section>`;
}
export function bindBuddy(ctx) {
  ctx.$$('[data-buddy]').forEach(b => b.onclick = () => ctx.showPokemon(b.dataset.buddy));
  ctx.$$('[data-buddy-act]').forEach(b => b.onclick = async () => {
    const key = ctx.$('.buddy-sprite')?.dataset.buddy; if (!key) return;
    let result;
    try { await ctx.commit('Cuidar compañero', next => { result = (b.dataset.buddyAct === 'pet' ? pet : play)(next, ctx.records.get(key)); }, { snapshot: false }); }
    catch (e) { ctx.toast(e.message); return; }
    ctx.render(); ctx.toast(`${result.text}${result.gained ? ` +${result.gained} de cariño.` : ''}`);
    const img = ctx.$('.buddy-img'); if (img) { img.classList.add(`react-${result.reaction}`); floatHearts(img.closest('.buddy-sprite')); }
  });
  ctx.$('[data-daily]')?.addEventListener('click', async () => {
    let result;
    try { await ctx.commit('Recompensa diaria', next => { result = claimDaily(next); }, { snapshot: false }); }
    catch (e) { ctx.toast(e.message); return; }
    ctx.render(); ctx.toast(`🎁 Día ${result.streak} seguido: ${giftText(result.gift)}.`);
  });
}
export { giftText };
