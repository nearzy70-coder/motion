// Étape 3 — Les visites : le plan imprimé se déplie en maquette « pop-up », puis le fil menthe
// trace le parcours de visite. Le calque 3D suit exactement la feuille (position et balancement).
import { el, svg, show, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { W, H, L, pick } from '../timeline.js';
import { createPopup, WALLS, FURN } from '../popup3d.js';

const PXM = 32;                 // échelle du dessin, en unités de feuille par mètre
const PC = [400, 548];          // centre du plan dans la feuille
const SW = 800;

let canvas, pop, topRef, labels;

export function build(it, ctx, opts) {
  const s = it.sheet;
  const K = L.sheetK;
  el('div', { cls: 'abs doc-meta', text: 'Plan de visite · exemple', style: { left: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Desk to Desk', style: { left: 'auto', right: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-title', text: 'Plateau · Paris 2e', style: { left: '56px', top: '84px', fontSize: '58px' } }, s);

  // Dessin du plan (mêmes coordonnées que la maquette)
  const g = svg('svg', { width: SW, height: 980, viewBox: `0 0 ${SW} 980`, style: 'position:absolute;left:0;top:0;overflow:visible' }, s);
  const P = ([x, z]) => [PC[0] + x * PXM, PC[1] + z * PXM];
  it.planDraw = svg('g', {}, g);
  for (const f of FURN) {
    if (f.r) { const [cx, cy] = P(f.c); svg('circle', { cx, cy, r: f.r * PXM, fill: 'none', stroke: '#9c9d96', 'stroke-width': 1.6 }, it.planDraw); }
    else { const [x, y] = P([f.c[0] - f.s[0] / 2, f.c[1] - f.s[1] / 2]); svg('rect', { x, y, width: f.s[0] * PXM, height: f.s[1] * PXM, fill: 'none', stroke: '#9c9d96', 'stroke-width': 1.6 }, it.planDraw); }
  }
  for (const w of WALLS) {
    const [x1, y1] = P(w.a), [x2, y2] = P(w.b);
    svg('line', { x1, y1, x2, y2, stroke: w.glass ? '#2ACAA5' : '#1a1a18', 'stroke-width': 0.16 * PXM, 'stroke-linecap': 'square' }, it.planDraw);
  }
  // Cote d'ensemble, comme sur un vrai plan
  const [ax] = P([-6, 0]), [bx] = P([6, 0]), [, by] = P([0, 10]);
  svg('path', { d: `M${ax} ${by + 34} H${bx} M${ax} ${by + 26} V${by + 42} M${bx} ${by + 26} V${by + 42}`, stroke: '#1a1a18', 'stroke-width': 1.6 }, g);
  const tx = svg('text', { x: (ax + bx) / 2, y: by + 64, 'text-anchor': 'middle', 'font-family': 'Noto Sans', 'font-size': 20, fill: '#6e6f69' }, g);
  tx.textContent = 'plan illustratif';

  // Calque 3D plein cadre, calé sur la position de référence de la feuille
  topRef = opts.sheetTop;
  canvas = el('canvas', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' } }, ctx.layers.gl);
  canvas.width = W; canvas.height = H;
  const center = [W / 2 - (SW * K) / 2 + PC[0] * K, topRef + PC[1] * K];
  pop = createPopup(canvas, W, H, { pxm: PXM * K, center });
  canvas.style.transformOrigin = `${W / 2 - (SW * K) / 2}px ${topRef}px`;

  labels = [
    { text: 'Open space · 12 postes', p: [2.5, 0.9, -1.4] },
    { text: 'Salle de réunion', p: [-2.7, 2.95, -7.6] },
  ].map((l) => {
    const e = el('div', { cls: 'abs', style: { display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' } }, ctx.layers.worldFront);
    el('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: '#2ACAA5', boxShadow: '0 0 0 3px #1a1a18', flex: 'none' } }, e);
    el('span', { text: l.text, style: { fontSize: pick('25px', '20px'), fontWeight: '700', color: '#1a1a18', background: '#FAFAF6', padding: '6px 12px', boxShadow: '0 1px 0 rgba(0,0,0,0.15)' } }, e);
    e.style.display = 'none';
    return { ...l, e };
  });
}

export function off() {
  show(canvas, false);
  labels.forEach((l) => show(l.e, false));
}

export function update(it, tl) {
  const on = tl > 0.8 && tl < 5.4;
  show(canvas, on);
  op(it.planDraw, 1 - prog(tl, 1.05, 1.25));
  labels.forEach((l) => show(l.e, false));
  if (!on) return;
  const dx = it.screen.x - W / 2, dy = it.screen.top - topRef;
  canvas.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) rotate(${it.screen.th.toFixed(3)}deg)`;
  op(canvas, prog(tl, 0.85, 1.1));
  pop.update(tl);
  labels.forEach((l, i) => {
    const t0 = 3.3 + i * 0.25;
    if (tl < t0) return;
    show(l.e, true);
    const [x, y] = pop.project(...l.p);
    const a = E.enter(prog(tl, t0, t0 + 0.45));
    l.e.style.transform = `translate3d(${(x + dx - 7).toFixed(2)}px,${(y + dy - 20 + (1 - a) * 10).toFixed(2)}px,0)`;
    op(l.e, prog(tl, t0, t0 + 0.2));
  });
}
