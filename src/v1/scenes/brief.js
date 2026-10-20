// Étape 01 — Brief : le fil dessine la fiche projet, les critères s'y rangent,
// puis la fiche se compacte en barre de filtres qui pilote la sélection.
import { el, svg, show, op, tf, checkIcon } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { roundRect, lineTo, prepared, partial, toD } from '../lib/path.js';
import { T, W, H, SPINE_X, NODE_Y, CONTENT_X, CONTENT_W, CARD_Y } from '../timeline.js';

const CH = 720, BAR_H = 104;
let card, inner, rows, fmtSel, fmtOthers, fill, knob, bar, outline, conn, outlineP, connP;

export function build(ctx) {
  card = el('div', { cls: 'card', style: { left: CONTENT_X + 'px', top: CARD_Y + 'px', width: CONTENT_W + 'px', height: CH + 'px', transformOrigin: '50% 0' } }, ctx.layers.scene);
  inner = el('div', { cls: 'abs', style: { width: CONTENT_W + 'px', height: CH + 'px' } }, card);

  const top = el('div', { cls: 'abs', style: { left: '44px', top: '40px', width: CONTENT_W - 88 + 'px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }, inner);
  const tl = el('div', {}, top);
  el('div', { cls: 'k', text: 'Projet', style: { marginBottom: '6px' } }, tl);
  el('div', { cls: 'title', text: 'Nouveaux bureaux' }, tl);
  el('div', { cls: 'pill mint', text: 'Brief', style: { marginTop: '10px' } }, top);
  el('div', { cls: 'abs', style: { left: '44px', top: '164px', width: CONTENT_W - 88 + 'px', height: '2px', background: 'var(--paper-line)' } }, inner);

  const ROW_Y = (r) => 196 + r * 122;
  const mkRow = (r, label) => {
    const k = el('div', { cls: 'abs k', text: label, style: { left: '44px', top: ROW_Y(r) + 'px' } }, inner);
    const v = el('div', { cls: 'abs', style: { left: '44px', top: ROW_Y(r) + 42 + 'px', display: 'flex', gap: '12px', alignItems: 'center' } }, inner);
    return { k, v };
  };
  rows = [mkRow(0, 'Équipe'), mkRow(1, 'Quartiers'), mkRow(2, 'Format'), mkRow(3, 'Budget')];
  el('div', { cls: 'v', text: '12 postes' }, rows[0].v);
  for (const q of ['Paris 2e', 'Paris 9e', 'Paris 10e']) el('div', { cls: 'pill line', text: q }, rows[1].v);
  const selWrap = el('div', { style: { position: 'relative' } }, rows[2].v);
  el('div', { cls: 'pill line', text: 'Bureau opéré' }, selWrap);
  fmtSel = el('div', { cls: 'pill mint', html: checkIcon(22, '#111', 3.2) + 'Bureau opéré', style: { position: 'absolute', left: '0', top: '0', gap: '6px', paddingLeft: '14px' } }, selWrap);
  fmtOthers = [el('div', { cls: 'pill line', text: 'Coworking' }, rows[2].v), el('div', { cls: 'pill line', text: 'Bail commercial' }, rows[2].v)];
  const track = el('div', { style: { position: 'relative', width: CONTENT_W - 88 + 'px', height: '12px', borderRadius: '6px', background: '#e9eeec', marginTop: '20px' } }, rows[3].v);
  fill = el('div', { style: { position: 'absolute', left: '0', top: '0', height: '12px', borderRadius: '6px', background: 'var(--mint)', width: '0px' } }, track);
  knob = el('div', { style: { position: 'absolute', top: '-12px', left: '0', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', border: '4px solid var(--mint)', boxShadow: '0 4px 12px rgba(0,0,0,.18)', marginLeft: '-18px' } }, track);
  rows[3].track = track;

  // Barre de filtres (état compact de la fiche)
  bar = el('div', { cls: 'abs', style: { left: '36px', top: '0px', height: BAR_H + 'px', display: 'flex', alignItems: 'center', gap: '18px', fontSize: '29px', fontWeight: '600', color: 'var(--ink)', whiteSpace: 'nowrap' } }, card);
  const ic = el('div', { html: checkIcon(26, '#111', 3.2), style: { width: '48px', height: '48px', borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } }, bar);
  el('span', { html: '12 postes <span style="color:#9aa4a0">·</span> Paris 2e, 9e, 10e <span style="color:#9aa4a0">·</span> Bureau opéré' }, bar);

  // Le fil trace la fiche
  const sv = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, ctx.layers.strokes);
  conn = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4, 'stroke-linecap': 'round' }, sv);
  outline = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
  connP = prepared(lineTo([SPINE_X, NODE_Y[0]], [CONTENT_X, NODE_Y[0]]));
  outlineP = prepared(roundRect(CONTENT_X, CARD_Y, CONTENT_W, CH, 32));
}

export function update(t) {
  const on = t >= T.step1 && t < T.zoom + 0.45;
  show(card, on);
  const cOn = t >= T.step1 && t < T.collapse + 0.3;
  show(conn, cOn);
  show(outline, t >= T.step1 + 0.1 && t < T.step1 + 0.9);
  if (!on) return;

  // Tracé
  if (cOn) {
    conn.setAttribute('d', toD(partial(connP, 0, E.inOutCubic(prog(t, T.step1 + 0.02, T.step1 + 0.14)))));
    op(conn, 1 - prog(t, T.collapse, T.collapse + 0.25));
  }
  const tr = E.inOutCubic(prog(t, T.step1 + 0.12, T.step1 + 0.6));
  outline.setAttribute('d', toD(partial(outlineP, 0, tr)));
  op(outline, 1 - prog(t, T.step1 + 0.6, T.step1 + 0.85));

  // Remplissage de la fiche
  // Remplissage en volet (la carte reste pleinement blanche, pas de gris intermédiaire)
  const f = E.inOutCubic(prog(t, T.step1 + 0.36, T.step1 + 0.72));
  const out = E.exit(prog(t, T.zoom, T.zoom + 0.34));
  card.style.clipPath = `inset(0 0 ${((1 - f + out) * 100).toFixed(3)}% 0 round 32px)`;
  card.style.opacity = '1';
  const c = E.move(prog(t, T.collapse, T.collapse + 0.45));
  card.style.height = lerp(CH, BAR_H, c).toFixed(2) + 'px';
  op(inner, prog(t, T.step1 + 0.5, T.step1 + 0.7) * (1 - prog(t, T.collapse + 0.12, T.collapse + 0.28)));

  rows.forEach((r, i) => {
    const t0 = T.step1 + 0.62 + i * 0.2;
    const a = E.enter(prog(t, t0, t0 + 0.5));
    op(r.k, prog(t, t0, t0 + 0.25));
    r.v.style.clipPath = `inset(-20px ${((1 - a) * 100).toFixed(2)}% -20px -4px)`;
    tf(r.v, (1 - a) * 18, 0);
  });
  const sel = E.enter(prog(t, T.step1 + 1.15, T.step1 + 1.45));
  op(fmtSel, sel);
  fmtSel.style.transform = `scale(${(0.94 + 0.06 * sel).toFixed(4)})`;
  fmtOthers.forEach((o) => op(o, 1 - 0.45 * sel));
  const b = E.move(prog(t, T.step1 + 1.3, T.step1 + 1.72));
  const bw = (CONTENT_W - 88) * 0.62 * b;
  fill.style.width = bw.toFixed(2) + 'px';
  knob.style.left = bw.toFixed(2) + 'px';
  op(knob, prog(t, T.step1 + 1.25, T.step1 + 1.35));

  // Barre de filtres puis sortie au moment du zoom
  op(bar, prog(t, T.collapse + 0.22, T.collapse + 0.4));
  tf(card, 0, -24 * out, 1);
}
