// Étape 2 — La sélection : une carte de travail imprimée. Les offres non pertinentes sont barrées,
// trois espaces reçoivent une punaise, un fil menthe les relie. Carte illustrative.
import { el, svg, op, show } from '../lib/dom.js';
import { E, prog, rng } from '../lib/ease.js';
import { spline, prepared, partial, toD } from '../lib/path.js';

const MW = 688, MH = 560, MX = 56, MY = 176;
const PINS = [[226, 214], [362, 336], [508, 196]];
const PICKS = [
  ['1', 'Bureau opéré · Paris 2e'],
  ['2', 'Coworking · Paris 9e'],
  ['3', 'Bail commercial · Paris 10e'],
];
const INK = '#1a1a18';

// Contour d'un polygone convexe gonflé d'un rayon r (le fil fait le tour des punaises)
function aroundPins(P, r) {
  const n = P.length, out = [];
  const cx = P.reduce((a, p) => a + p[0], 0) / n, cy = P.reduce((a, p) => a + p[1], 0) / n;
  const order = [...P].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  for (let i = 0; i < n; i++) {
    const a = order[i], b = order[(i + 1) % n], c = order[(i + 2) % n];
    const n1 = norm(a, b), n2 = norm(b, c);
    out.push([a[0] + n1[0] * r, a[1] + n1[1] * r], [b[0] + n1[0] * r, b[1] + n1[1] * r]);
    let a0 = Math.atan2(n1[1], n1[0]), a1 = Math.atan2(n2[1], n2[0]);
    while (a1 < a0) a1 += Math.PI * 2;
    for (let u = a0; u <= a1; u += 0.12) out.push([b[0] + Math.cos(u) * r, b[1] + Math.sin(u) * r]);
  }
  out.push(out[0]);
  return out;
}
function norm(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [dy / l, -dx / l];
}

export function build(it) {
  const s = it.sheet;
  const R = rng(5);
  el('div', { cls: 'abs doc-meta', text: 'Paris · carte de travail', style: { left: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Desk to Desk', style: { left: 'auto', right: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-title', text: 'Sélection', style: { left: '56px', top: '84px', fontSize: '62px' } }, s);

  const m = svg('svg', { width: MW, height: MH, viewBox: `0 0 ${MW} ${MH}`, style: `position:absolute;left:${MX}px;top:${MY}px;overflow:visible` }, s);
  svg('rect', { x: 0, y: 0, width: MW, height: MH, fill: '#f0f0ea', stroke: '#cfcfc6', 'stroke-width': 2 }, m);
  const clip = svg('clipPath', { id: 'mapclip' }, svg('defs', {}, m));
  svg('rect', { x: 0, y: 0, width: MW, height: MH }, clip);
  const g = svg('g', { 'clip-path': 'url(#mapclip)' }, m);
  // Îlots : deux trames de rues légèrement courbes
  for (const fam of [{ a: -0.22, step: 34 }, { a: 1.28, step: 42 }]) {
    const d = [Math.cos(fam.a), Math.sin(fam.a)], nn = [-d[1], d[0]];
    for (let o = -560; o <= 560; o += fam.step * (0.8 + R() * 0.45)) {
      const pts = [];
      for (let u = -700; u <= 700; u += 20) {
        const bend = 8 * Math.sin(u / 160 + o / 80);
        pts.push([MW / 2 + nn[0] * (o + bend) + d[0] * u, MH / 2 + nn[1] * (o + bend) + d[1] * u]);
      }
      svg('path', { d: toD(pts), fill: 'none', stroke: '#d3d5cf', 'stroke-width': R() < 0.15 ? 5 : 2 }, g);
    }
  }
  // La Seine
  const seine = spline([[-20, 498], [120, 470], [260, 450], [380, 446], [500, 462], [620, 490], [720, 520]], 6);
  svg('path', { d: toD(seine), fill: 'none', stroke: '#bfe8dc', 'stroke-width': 34, 'stroke-linecap': 'round' }, g);
  svg('path', { d: toD(seine), fill: 'none', stroke: '#9fd9c9', 'stroke-width': 2 }, g);
  // Repères d'arrondissement
  for (const [x, y, t] of [[192, 150, '9e'], [330, 280, '2e'], [470, 136, '10e']]) {
    const tx = svg('text', { x, y, 'font-family': 'Noto Sans', 'font-size': 18, 'font-weight': 600, fill: '#9a9b94' }, g);
    tx.textContent = t;
  }
  // Offres (points), dont la plupart seront barrées
  it.offers = [];
  for (let i = 0; i < 30; i++) {
    let x, y;
    do { x = 40 + R() * (MW - 80); y = 40 + R() * (MH - 120); } while (PINS.some((p) => Math.hypot(p[0] - x, p[1] - y) < 46));
    const dot = svg('circle', { cx: x, cy: y, r: 6, fill: INK }, g);
    const xx = svg('path', { d: `M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}`, stroke: '#c03c3c', 'stroke-opacity': 0, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g);
    xx.setAttribute('stroke', '#7c7d77');
    it.offers.push({ dot, xx, t: 0.15 + R() * 1.35 });
  }
  for (const p of PINS) svg('circle', { cx: p[0], cy: p[1], r: 6, fill: INK }, g);

  // Fil autour des punaises
  it.threadP = prepared(aroundPins(PINS, 15));
  it.thread = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, m);
  // Punaises
  it.pushpins = PINS.map((p) => {
    const pg = svg('g', {}, m);
    svg('ellipse', { cx: p[0] + 9, cy: p[1] + 10, rx: 16, ry: 9, fill: 'rgba(0,0,0,0.28)' }, pg);
    const head = svg('g', {}, pg);
    svg('circle', { cx: p[0], cy: p[1], r: 17, fill: '#1C9E80' }, head);
    svg('circle', { cx: p[0] - 1.5, cy: p[1] - 2, r: 14, fill: '#2ACAA5' }, head);
    svg('ellipse', { cx: p[0] - 6, cy: p[1] - 7, rx: 5, ry: 3.5, fill: 'rgba(255,255,255,0.75)', transform: `rotate(-30 ${p[0] - 6} ${p[1] - 7})` }, head);
    return { pg, head, p };
  });

  // Liste des espaces retenus
  it.picks = PICKS.map(([n, txt], i) => {
    const row = el('div', { cls: 'abs', style: { left: '56px', top: 772 + i * 58 + 'px', display: 'flex', gap: '18px', alignItems: 'baseline' } }, s);
    el('span', { text: n, style: { fontFamily: 'Parkinsans', fontWeight: '600', fontSize: '30px', color: '#1C9E80' } }, row);
    el('span', { text: txt, style: { fontSize: '30px', fontWeight: '600', color: INK } }, row);
    return row;
  });
}

export function update(it, tl) {
  it.offers.forEach((o) => {
    const c = prog(tl, o.t, o.t + 0.12);
    o.xx.setAttribute('stroke-opacity', c.toFixed(3));
    o.dot.setAttribute('fill-opacity', (1 - 0.65 * c).toFixed(3));
  });
  it.pushpins.forEach((p, i) => {
    const t0 = 1.75 + i * 0.2;
    const a = E.soft(prog(tl, t0, t0 + 0.3));
    show(p.pg, tl >= t0);
    const lift = (1 - a) * 40;
    const sc = 1 + (1 - a) * 0.35;
    p.head.setAttribute('transform', `translate(${p.p[0]} ${p.p[1] - lift}) scale(${sc.toFixed(3)}) translate(${-p.p[0]} ${-p.p[1]})`);
    op(p.pg, prog(tl, t0, t0 + 0.08));
  });
  const th = E.inOutCubic(prog(tl, 2.2, 2.9));
  it.thread.setAttribute('d', toD(partial(it.threadP, 0, Math.max(0.001, th))));
  show(it.thread, th > 0);
  it.picks.forEach((r, i) => {
    const t0 = 2.3 + i * 0.15;
    const a = E.enter(prog(tl, t0, t0 + 0.5));
    r.style.transform = `translateY(${((1 - a) * 16).toFixed(2)}px)`;
    op(r, prog(tl, t0, t0 + 0.2));
  });
}
