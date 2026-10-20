// Étape 5 — Les clés : un trousseau tombe sur la corde et s'y balance (pendule amorti).
import { el, svg, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { L, pick } from '../timeline.js';

function key(parent, x, y, rot, id) {
  const g = svg('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, parent);
  // Anneau de la clé
  svg('circle', { cx: 0, cy: 0, r: 36, fill: `url(#${id})`, stroke: '#4c524f', 'stroke-width': 2 }, g);
  svg('circle', { cx: 0, cy: -16, r: 9, fill: '#111', stroke: '#4c524f', 'stroke-width': 2 }, g);
  // Tige et panneton
  svg('path', { d: 'M-9 30 L-9 190 L-2 198 L-2 182 L8 182 L8 168 L1 168 L1 154 L10 154 L10 140 L9 30 Z', fill: `url(#${id})`, stroke: '#4c524f', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  svg('line', { x1: 0, y1: 44, x2: 0, y2: 176, stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 2 }, g);
  return g;
}

export function build(it, ctx) {
  const k = L.sheetK;
  const root = el('div', { cls: 'abs', style: { transformOrigin: '0 0' } }, it.el);
  const s = svg('svg', { width: 400, height: 520, viewBox: '-200 -20 400 520', style: 'position:absolute;left:-200px;top:-20px;overflow:visible' }, root);
  const defs = svg('defs', {}, s);
  const gr = svg('linearGradient', { id: 'metal', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [['0', '#e9eeec'], ['0.45', '#b9c1be'], ['0.55', '#f4f7f6'], ['1', '#8f9894']].forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, gr));
  const gr2 = svg('linearGradient', { id: 'brass', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [['0', '#efe2bf'], ['0.5', '#cdb37c'], ['1', '#a88d58']].forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, gr2));
  // Ombre douce portée
  svg('ellipse', { cx: 14, cy: 330, rx: 90, ry: 14, fill: 'rgba(0,0,0,0.0)' }, s);
  // Anneau accroché à la corde
  svg('circle', { cx: 0, cy: 48, r: 44, fill: 'none', stroke: '#c7cfcc', 'stroke-width': 7 }, s);
  svg('circle', { cx: -2, cy: 46, r: 44, fill: 'none', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': 2, 'stroke-dasharray': '40 240' }, s);
  key(s, -16, 118, 14, 'metal');
  key(s, 24, 112, -12, 'brass');
  // Étiquette porte-clés en papier
  const tag = svg('g', { transform: 'translate(-110 100) rotate(18)' }, s);
  svg('path', { d: 'M0 0 L120 0 L120 64 L0 64 L-18 32 Z', fill: '#FAFAF6' }, tag);
  svg('circle', { cx: -4, cy: 32, r: 6, fill: '#111' }, tag);
  const tx = svg('text', { x: 14, y: 42, 'font-family': 'Noto Sans', 'font-weight': 700, 'font-size': 26, fill: '#1a1a18' }, tag);
  tx.textContent = 'Paris 2e';
  it.keysRoot = root;
  it.caption = el('div', { cls: 'abs', text: 'Démarches, signature, emménagement.', style: { left: '0px', top: '0px', fontSize: pick('38px', '30px'), fontWeight: '600', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' } }, ctx.layers.text);
  it.capW = it.caption.offsetWidth;
  it.caption.style.display = 'none';
}

export function off(it) {
  it.caption.style.display = 'none';
}

export function update(it, tl, t) {
  const x = it.screen.x;
  // Chute sur la corde puis balancement amorti
  const drop = E.outCubic(prog(tl, -0.15, 0.25));
  const y0 = L.lineY - 4 - (1 - drop) * pick(700, 440);
  const u = Math.max(0, tl - 0.25);
  const ang = tl < 0.25 ? -14 * (1 - drop) : 16 * Math.exp(-u / 1.3) * Math.sin(u * 2 * Math.PI * 0.85) + 0.6 * Math.sin(t * 1.3);
  it.keysRoot.style.transform = `translate3d(${x.toFixed(2)}px,${y0.toFixed(2)}px,0) rotate(${ang.toFixed(3)}deg) scale(${(L.sheetK * pick(1.35, 1.25)).toFixed(3)})`;
  op(it.keysRoot, prog(tl, -0.15, -0.05));
  const capOn = tl > 0.4 && tl < 5.0;
  it.caption.style.display = capOn ? '' : 'none';
  if (capOn) {
    const a = E.enter(prog(tl, 0.5, 1.1));
    const out = E.exit(prog(tl, 4.25, 4.6));
    it.caption.style.transform = `translate3d(${(x - it.capW / 2).toFixed(2)}px,${(pick(1330, 900) + (1 - a) * 20).toFixed(2)}px,0)`;
    op(it.caption, prog(tl, 0.5, 0.8) * (1 - out));
  }
}
