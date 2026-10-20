// Fiches « services » : renégociation de contrat et location ponctuelle.
import { el, svg, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { prepared, partial, toD, spline } from '../lib/path.js';

const INK = '#1a1a18', MINT = '#2ACAA5';

const DATA = {
  reneg: {
    n: 'Service', title: 'Renégociation',
    body: 'On reprend votre contrat actuel : loyer, charges, travaux, durée.',
    pic(s, it) {
      // Une boucle tracée au feutre menthe : on revient sur le contrat
      const pts = [];
      for (let a = 0.35; a <= Math.PI * 2 * 0.86; a += 0.05) pts.push([90 + Math.cos(a) * 62, 88 + Math.sin(a) * 62]);
      it.loopP = prepared(pts);
      it.loop = svg('path', { fill: 'none', stroke: MINT, 'stroke-width': 9, 'stroke-linecap': 'round' }, s);
      const e = pts[pts.length - 1];
      it.arrowHead = svg('path', { d: `M${e[0] - 4} ${e[1] - 26} L${e[0] + 6} ${e[1] + 2} L${e[0] - 22} ${e[1] + 8}`, fill: 'none', stroke: MINT, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s);
      svg('rect', { x: 60, y: 58, width: 60, height: 76, rx: 3, fill: '#fff', stroke: INK, 'stroke-width': 3 }, s);
      for (let k = 0; k < 4; k++) svg('line', { x1: 70, y1: 74 + k * 14, x2: k === 3 ? 96 : 110, y2: 74 + k * 14, stroke: INK, 'stroke-width': 2.5 }, s);
    },
  },
  day: {
    n: 'Service', title: 'Location ponctuelle',
    body: 'Salles de réunion, bureaux à la journée, espaces événementiels.',
    pic(s, it) {
      // Une page d'éphéméride : une seule journée
      svg('rect', { x: 30, y: 24, width: 130, height: 140, rx: 8, fill: '#fff', stroke: INK, 'stroke-width': 3 }, s);
      svg('rect', { x: 30, y: 24, width: 130, height: 38, rx: 8, fill: MINT, stroke: INK, 'stroke-width': 3 }, s);
      for (const x of [62, 128]) svg('line', { x1: x, y1: 12, x2: x, y2: 36, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, s);
      it.dayNum = svg('text', { x: 95, y: 138, 'text-anchor': 'middle', 'font-family': 'Parkinsans', 'font-weight': 600, 'font-size': 64, fill: INK }, s);
      it.dayNum.textContent = '1';
      svg('text', { x: 185, y: 120, 'font-family': 'Noto Sans', 'font-weight': 600, 'font-size': 30, fill: INK }, s).textContent = 'journée';
    },
  },
};

export function build(it) {
  const d = DATA[it.id];
  const s = it.sheet;
  el('div', { cls: 'abs doc-meta', text: d.n, style: { left: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Desk to Desk', style: { left: 'auto', right: '56px', top: '50px' } }, s);
  const pic = svg('svg', { width: 340, height: 175, viewBox: '0 0 340 175', style: 'position:absolute;left:52px;top:120px;overflow:visible' }, s);
  d.pic(pic, it);
  it.pic = pic;
  it.title = el('div', { cls: 'abs doc-title', text: d.title, style: { left: '56px', top: '342px', fontSize: '72px' } }, s);
  it.body = el('div', { cls: 'abs', text: d.body, style: { left: '56px', top: '458px', width: '670px', fontSize: '34px', lineHeight: '1.32', color: '#3a3b37', whiteSpace: 'normal' } }, s);
}

export function update(it, tl) {
  op(it.pic, prog(tl, -0.3, 0.05));
  if (it.loop) {
    it.loop.setAttribute('d', toD(partial(it.loopP, 0, E.inOutCubic(prog(tl, 0.0, 0.7)))));
    op(it.arrowHead, prog(tl, 0.62, 0.72));
  }
  const b = E.enter(prog(tl, -0.15, 0.55));
  it.title.style.transform = `translateY(${((1 - b) * 22).toFixed(2)}px)`;
  op(it.title, prog(tl, -0.15, 0.15));
  const c = E.enter(prog(tl, 0.1, 0.8));
  it.body.style.transform = `translateY(${((1 - c) * 18).toFixed(2)}px)`;
  op(it.body, prog(tl, 0.1, 0.4));
}
