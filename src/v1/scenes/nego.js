// Étapes 04 et 05 — Négociation puis emménagement.
// La fiche « Conditions » monte et couvre la maquette ; le fil relie les points négociés,
// puis la fiche se réduit en panneau de signature : le fil signe, puis dessine la clé.
import { el, svg, show, op, tf, checkIcon } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { lineTo, concat, spline, prepared, partial, toD } from '../lib/path.js';
import { T, W, H, SPINE_X, NODE_Y, CONTENT_X, CONTENT_W, CARD_Y } from '../timeline.js';

const CH = 720, SIG_H = 330, SIG_SHIFT = 120;
const ROW_Y = (r) => 178 + r * 112;
const CHECK_X = CONTENT_X + 66;
let card, inner, rows, footer, sigWrap, sv, conn4, list4, sig, conn5, key, keyPill;
let pConn4, pList4, pSig, pConn5, pKey;

export function build(ctx) {
  card = el('div', { cls: 'card', style: { left: CONTENT_X + 'px', top: CARD_Y + 'px', width: CONTENT_W + 'px', height: CH + 'px' } }, ctx.layers.scene);
  inner = el('div', { cls: 'abs', style: { width: CONTENT_W + 'px', height: CH + 'px' } }, card);
  const top = el('div', { cls: 'abs', style: { left: '44px', top: '44px', width: CONTENT_W - 88 + 'px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, inner);
  el('div', { cls: 'title', text: 'Vos conditions' }, top);
  el('div', { cls: 'pill dark', text: 'Face au bailleur' }, top);
  el('div', { cls: 'abs', style: { left: '44px', top: '130px', width: CONTENT_W - 88 + 'px', height: '2px', background: 'var(--paper-line)' } }, inner);

  rows = ['Loyer', 'Charges', 'Travaux', 'Durée'].map((label, r) => {
    const y = ROW_Y(r);
    const dot = el('div', { cls: 'abs', style: { left: '44px', top: y + 'px', width: '44px', height: '44px', borderRadius: '50%', border: '2.5px solid #d6ddda', background: '#fff' } }, inner);
    const ok = el('div', { cls: 'abs', html: checkIcon(24, '#111', 3.4), style: { left: '44px', top: y + 'px', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, inner);
    const k = el('div', { cls: 'abs v', text: label, style: { left: '112px', top: y - 2 + 'px', fontSize: '38px' } }, inner);
    const pend = el('div', { cls: 'abs pill soft', text: 'À négocier', style: { left: 'auto', right: '44px', top: y - 4 + 'px' } }, inner);
    const done = el('div', { cls: 'abs pill mint', text: 'Négocié', style: { left: 'auto', right: '44px', top: y - 4 + 'px' } }, inner);
    return { dot, ok, k, pend, done, y };
  });
  footer = el('div', { cls: 'abs', style: { left: '44px', top: '626px', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '27px', fontWeight: '600', color: '#3d4643' } }, inner);
  el('div', { html: checkIcon(28, '#2ACAA5', 3.4), style: { display: 'flex' } }, footer);
  el('span', { text: 'Démarches suivies jusqu’à la signature' }, footer);

  // Panneau de signature (état réduit de la fiche)
  sigWrap = el('div', { cls: 'abs', style: { width: CONTENT_W + 'px', height: SIG_H + 'px' } }, card);
  el('div', { cls: 'abs k', text: 'Signature', style: { left: '44px', top: '40px' } }, sigWrap);
  el('div', { cls: 'abs pill mint', html: checkIcon(22, '#111', 3.4) + 'Conditions validées', style: { left: 'auto', right: '40px', top: '30px', gap: '6px', paddingLeft: '14px' } }, sigWrap);
  el('div', { cls: 'abs', style: { left: '44px', top: '252px', width: CONTENT_W - 88 + 'px', height: '2px', background: '#d6ddda' } }, sigWrap);
  el('div', { cls: 'abs', text: '×', style: { left: '44px', top: '204px', fontSize: '34px', color: '#9aa4a0' } }, sigWrap);

  sv = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, ctx.layers.strokes);
  const mk = () => svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
  conn4 = mk(); list4 = mk(); sig = mk(); conn5 = mk(); key = mk();
  sig.setAttribute('stroke-width', '5');

  pConn4 = prepared(lineTo([SPINE_X, NODE_Y[3]], [CONTENT_X, NODE_Y[3]]));
  const cy = (r) => CARD_Y + ROW_Y(r) + 22;
  pList4 = prepared(lineTo([CHECK_X, cy(0)], [CHECK_X, cy(3)]));

  // Paraphe (tracé libre, non lisible)
  const by = CARD_Y + SIG_SHIFT + 236, bx = CONTENT_X + 110;
  pSig = prepared(spline([
    [bx, by - 20], [bx + 30, by - 92], [bx + 52, by - 104], [bx + 44, by - 40], [bx + 30, by + 4], [bx + 70, by - 50],
    [bx + 118, by - 86], [bx + 120, by - 30], [bx + 150, by - 70], [bx + 190, by - 40], [bx + 214, by - 64],
    [bx + 250, by - 30], [bx + 300, by - 76], [bx + 330, by - 40], [bx + 380, by - 58], [bx + 470, by - 46],
  ], 3));

  // Clé : anneau (motif point cerclé) + tige + panneton, accrochée au nœud 05
  const ky = NODE_Y[4], kx = 300, kr = 80;
  const ring = [];
  for (let a = Math.PI; a <= Math.PI * 3 + 0.001; a += 0.04) ring.push([kx + Math.cos(a) * kr, ky + Math.sin(a) * kr]);
  pConn5 = prepared(lineTo([SPINE_X, ky], [kx - kr, ky]));
  const kE = kx + 560;
  pKey = prepared(concat(ring, lineTo([kx + kr, ky], [kE, ky]), lineTo([kE, ky], [kE, ky + 78]), lineTo([kE, ky + 78], [kE - 56, ky + 78]),
    lineTo([kE - 56, ky + 78], [kE - 56, ky + 38]), lineTo([kE - 56, ky + 38], [kE - 112, ky + 38]), lineTo([kE - 112, ky + 38], [kE - 112, ky])));
  key.dataset.cx = kx; key.dataset.cy = ky;
  ctx.shared.keyCore = svg('circle', { cx: kx, cy: ky, r: 0, fill: '#2ACAA5' }, sv);
  ctx.shared.keyCoreR = 22;

  keyPill = el('div', { cls: 'abs pill', html: checkIcon(24, '#111', 3.4) + 'Remise des clés', style: { left: kx + kr + 40 + 'px', top: ky - 136 + 'px', background: '#fff', color: 'var(--ink)', height: '60px', fontSize: '26px', gap: '8px', paddingLeft: '16px' } }, ctx.layers.scene);
}

export function update(t, ctx) {
  const on = t >= T.step4 - 0.3 && t < T.value + 0.4;
  show(card, on);
  [conn4, list4, sig, conn5, key].forEach((e) => show(e, false));
  show(ctx.shared.keyCore, false);
  show(keyPill, false);
  if (!on) return;

  // Entrée : la fiche monte depuis le bas et couvre la maquette
  const up = E.move(prog(t, T.step4 - 0.28, T.step4 + 0.22));
  const out = E.exit(prog(t, T.value - 0.32, T.value + 0.02));
  const shrinkMove = E.move(prog(t, T.step5 - 0.15, T.step5 + 0.3));
  tf(card, 0, (1 - up) * (H - CARD_Y + 40) - 24 * out + SIG_SHIFT * shrinkMove);
  card.style.clipPath = `inset(0 0 ${(out * 100).toFixed(3)}% 0 round 32px)`;
  const shrink = E.move(prog(t, T.step5 - 0.15, T.step5 + 0.3));
  card.style.height = lerp(CH, SIG_H, shrink).toFixed(2) + 'px';
  op(inner, 1 - prog(t, T.step5 - 0.08, T.step5 + 0.06));
  op(sigWrap, prog(t, T.step5 + 0.02, T.step5 + 0.2));

  // Négociation
  if (t < T.step5 + 0.1) {
    show(conn4, true); show(list4, true);
    conn4.setAttribute('d', toD(partial(pConn4, 0, E.inOutCubic(prog(t, T.step4 + 0.25, T.step4 + 0.4)))));
    list4.setAttribute('d', toD(partial(pList4, 0, E.inOutCubic(prog(t, T.step4 + 0.42, T.step4 + 1.3)))));
    const fade = 1 - prog(t, T.step5 - 0.25, T.step5 - 0.05);
    op(conn4, fade); op(list4, fade);
  }
  rows.forEach((r, i) => {
    const t0 = T.step4 + 0.45 + i * 0.27;
    const a = E.soft(prog(t, t0, t0 + 0.3));
    r.ok.style.transform = `scale(${Math.max(0.001, a).toFixed(4)})`;
    op(r.pend, 1 - prog(t, t0, t0 + 0.15));
    op(r.done, prog(t, t0 + 0.05, t0 + 0.2));
    r.done.style.transform = `scale(${(0.9 + 0.1 * E.enter(prog(t, t0 + 0.05, t0 + 0.35))).toFixed(4)})`;
    op(r.k, 0.45 + 0.55 * prog(t, t0 - 0.1, t0 + 0.1));
  });
  op(footer, prog(t, T.step4 + 1.55, T.step4 + 1.75));

  // Emménagement : signature puis clé
  if (t >= T.step5 + 0.2) {
    show(sig, true);
    sig.setAttribute('d', toD(partial(pSig, 0, E.inOutCubic(prog(t, T.step5 + 0.3, T.step5 + 0.95)))));
    op(sig, 1 - out);
  }
  if (t >= T.step5 + 0.9) {
    show(conn5, true); show(key, true); show(ctx.shared.keyCore, true);
    conn5.setAttribute('d', toD(partial(pConn5, 0, E.inOutCubic(prog(t, T.step5 + 0.9, T.step5 + 1.05)))));
    key.setAttribute('d', toD(partial(pKey, 0, E.inOutCubic(prog(t, T.step5 + 1.02, T.step5 + 1.62)))));
    ctx.shared.keyCore.setAttribute('r', (ctx.shared.keyCoreR * E.soft(prog(t, T.step5 + 1.15, T.step5 + 1.4))).toFixed(2));
    const kf = 1 - prog(t, T.value - 0.3, T.value);
    op(conn5, kf); op(key, kf); op(ctx.shared.keyCore, kf);
    show(keyPill, true);
    const a = E.enter(prog(t, T.step5 + 1.45, T.step5 + 1.9));
    tf(keyPill, 0, (1 - a) * 20);
    op(keyPill, prog(t, T.step5 + 1.45, T.step5 + 1.65) * kf);
  }
}
