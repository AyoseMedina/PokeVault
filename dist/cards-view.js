// Card markup (docs/CARDS.md). Original PokéVault design inspired by trading-card
// layout conventions (HP top right, attacks, weakness, collector number), without
// the official TCG frame, logos or energy symbols. h = { esc, img, gameName, dexText }.
import { geneticsOf, trainingOf } from './cards.js';
import { wikidexUrl } from './links.js';

export const TYPE_COLORS = {
  1: '#a8a77a', 2: '#c22e28', 3: '#a98ff3', 4: '#a33ea1', 5: '#e2bf65', 6: '#b6a136', 7: '#a6b91a', 8: '#735797', 9: '#b7b7ce',
  10: '#ee8130', 11: '#6390f0', 12: '#7ac74c', 13: '#f7d02c', 14: '#f95587', 15: '#96d9d6', 16: '#6f35fc', 17: '#705746',
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const orb = (type, name, h, extra = '') => `<span class="tcg-orb" style="--o:${TYPE_COLORS[type] || '#999'}" title="${h.esc(name)}" aria-label="${h.esc(name)}">${h.esc(String(name).slice(0, 2))}${extra}</span>`;
const fmt = n => Number.isFinite(n) ? n.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '—';

export function cardFront(m, h, { large = false } = {}) {
  const [t1, t2] = [m.types[0], m.types[1] || m.types[0]];
  const factor = f => f >= 4 ? '×4' : f >= 2 ? '×2' : f === 0 ? '×0' : f <= 0.25 ? '×¼' : '×½';
  return `<article class="tcg ${large ? 'tcg-large' : ''} ${m.shiny ? 'holo' : ''} rarity-${m.rarity.key}" style="--tc:${TYPE_COLORS[t1]};--tc2:${TYPE_COLORS[t2]}" data-card="${h.esc(m.key)}" tabindex="0" role="button" aria-label="Carta de ${h.esc(m.title)}, ${m.typeNames.join(' y ')}, nivel ${m.level}, ${m.hp ?? '—'} PS, ${m.rarity.label}">
    <div class="tcg-inner"><div class="tcg-face tcg-front">
      <header class="tcg-head"><strong class="tcg-name" title="${h.esc(m.title)}">${h.esc(m.title)}</strong><span class="tcg-hp"><small>PS</small>${m.hp ?? '—'}</span><span class="tcg-orbs">${m.types.map((t, i) => orb(t, m.typeNames[i], h)).join('')}</span></header>
      <p class="tcg-evolves"><span class="tcg-stage">${m.egg ? 'Huevo' : m.stage.label}</span>${m.stageFrom ? ` Evoluciona de ${h.esc(m.stageFrom)}` : ''}${m.nicknamed ? ` · ${h.esc(m.speciesName)}` : ''}</p>
      <div class="tcg-art">${h.img(m.species, 'tcg-sprite', '', { shiny: m.shiny, animated: true })}<span class="tcg-lv">Nv. ${m.level}</span></div>
      <p class="tcg-strip">${h.esc(m.genus)} · ${fmt(m.height)} m · ${fmt(m.weight)} kg</p>
      <ul class="tcg-moves">${m.moves.map(x => `<li>${orb(x.type, x.typeName, h)}<span class="tcg-move">${h.esc(x.name)}</span><span class="tcg-dmg">${x.power || ''}</span></li>`).join('') || '<li class="tcg-empty">Sin movimientos</li>'}</ul>
      <div class="tcg-match"><span><small>Debilidad</small>${m.matchups.weak.slice(0, 2).map(w => orb(w.type, w.name, h, `<b>${factor(w.factor)}</b>`)).join('') || '—'}</span><span><small>Resistencia</small>${m.matchups.resist.slice(0, 2).map(r => orb(r.type, r.name, h, `<b>${factor(r.factor)}</b>`)).join('') || '—'}</span></div>
      <footer class="tcg-foot"><span>${m.rarity.symbol} ${m.rarity.label}</span><span>${m.number}/649</span><span>Gen. ${ROMAN[m.generation]} · ${h.esc(h.gameName(m.game))}</span></footer>
    </div></div></article>`;
}

const bars = (data, h) => `<div class="tcg-bars"><small>${h.esc(data.kind)}</small>${data.values.map((v, i) => `<span><em>${data.labels[i]}</em><i style="--v:${Math.min(100, Math.round(v / data.max * 100))}%"></i><b>${v}</b></span>`).join('')}</div>`;
export function cardBack(m, p, h) {
  return `<article class="tcg tcg-large tcg-back-card" style="--tc:${TYPE_COLORS[m.types[0]]};--tc2:${TYPE_COLORS[m.types[1] || m.types[0]]}">
    <div class="tcg-inner"><div class="tcg-face tcg-back">
      <header class="tcg-head"><strong class="tcg-name">${h.esc(m.title)}</strong><span class="tcg-hp"><small>N.º</small>${m.number}</span></header>
      <dl class="tcg-facts"><dt>Entrenador</dt><dd>${h.esc(m.ot || '—')} · ID ${h.esc(m.tid)}</dd><dt>Partida</dt><dd>${h.esc(h.gameName(m.game))}</dd><dt>Ubicación</dt><dd>${h.esc(m.location)}</dd><dt>Tipo</dt><dd>${h.esc(m.typeNames.join(' / '))}</dd></dl>
      ${p.egg ? '' : bars(geneticsOf(p), h) + bars(trainingOf(p), h)}
      <p class="tcg-flavor">${h.esc(h.dexText(m.game, m.species) || '')}</p>
      <footer class="tcg-foot"><span>PokéVault · carta de tu banco</span><a href="${wikidexUrl(m.species)}" target="_blank" rel="noopener noreferrer">Más en WikiDex ↗</a></footer>
    </div></div></article>`;
}
