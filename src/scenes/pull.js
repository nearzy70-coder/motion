// 3. On tire le fil : le fil qui traverse la pile est tiré par ses deux bouts (simulation physique) ;
// les mots glissent le long du fil jusqu'à s'y aligner, puis le fil remonte comme un store et révèle l'aplat menthe.
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, bezier } from '../lib/ease.js';
import { slice } from '../lib/path.js';
import { simulateRope } from '../lib/rope.js';
import { T, L, W, H, pick } from '../timeline.js';
import { CORD_W } from './pile.js';

const blindEase = bezier(0.72, 0, 0.18, 1);
const TOP_Y = pick(44, 34);
let rope, mint, brand, subs, beads, slots, total, tA, kBead, drawNeedle, s0;

export function build(ctx) {
  mint = el('div', { cls: 'layer', style: { background: 'var(--mint)' } }, ctx.layers.mint);
  buildBrand(ctx);
  const tg = ctx.shared.tangle;
  if (!tg) return; // ouverture qui amène elle-même un fil droit à la hauteur du store (pelote, enquête)
  tA = tg.tAnchor;
  s0 = tg.tailAt(tA);
  const init = slice(tg.path, tg.Ls, s0, tg.headAt(tA));
  total = tg.Ls[tg.Ls.length - 1] - s0;
  // Places des mots sur le fil tendu : côte à côte, réduits, la rangée centrée dans l'image
  beads = ctx.shared.beads;
  drawNeedle = ctx.shared.drawNeedle;
  const gap = pick(34, 26);
  const order = beads.map((_, i) => i).sort((a, b) => beads[a].s - beads[b].s);
  const span = (k) => order.reduce((a, i) => a + beads[i].w * k, 0) + gap * (beads.length - 1);
  kBead = 0.5;
  if (span(kBead) > total * 0.94) kBead *= (total * 0.94 - gap * (beads.length - 1)) / (span(kBead) - gap * (beads.length - 1));
  slots = new Array(beads.length);
  let acc = (total - span(kBead)) / 2;
  order.forEach((i) => { slots[i] = acc + (beads[i].w * kBead) / 2; acc += beads[i].w * kBead + gap; });
  const x0 = W / 2 - total / 2;
  const a0 = init[0], b0 = init[init.length - 1];
  const e = (t) => E.inOutCubic(prog(t, tA, T.pull + 0.48));
  rope = simulateRope({
    init, N: 280, t0: tA, t1: T.blind + 1.0, hz: 240, sub: 6, iters: 22, damping: 0.994, bend: 0.1,
    endA: (t) => [lerp(a0[0], x0, e(t)), lerp(a0[1], L.pullY, e(t))],
    endB: (t) => [lerp(b0[0], x0 + total * 0.992, e(t)), lerp(b0[1], L.pullY, e(t))],
  });
}

function buildBrand(ctx) {
  // Texte sur l'aplat menthe
  brand = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('660px', '236px'), color: 'var(--ink)' } }, ctx.layers.text);
  const big = (html) => wordsLine(brand, html, L.bigSize, { marginBottom: pick('8px', '4px') });
  big('Desk to Desk');
  big('tire le fil.');
  subs = el('div', { style: { marginTop: pick('86px', '52px') } }, brand);
  ['Un conseiller dédié.', 'Un seul interlocuteur.', 'Du brief à la remise des clés.'].forEach((s) => {
    wordsLine(subs, s, Math.round(L.subSize * 1.12), { fontFamily: "'Noto Sans', sans-serif", fontWeight: '600', letterSpacing: '-0.012em', marginBottom: pick('14px', '10px'), lineHeight: '1.15' });
  });
}

// Ligne composée mot à mot (chaque mot monte légèrement, décalé)
function wordsLine(parent, text, size, style = {}) {
  const ln = el('div', { cls: 'display', style: { fontSize: size + 'px', ...style } }, parent);
  text.split(' ').forEach((w, i, a) => {
    el('span', { cls: 'word', text: w }, ln);
    if (i < a.length - 1) ln.appendChild(document.createTextNode(' '));
  });
  return ln;
}

function cordY(t) {
  return lerp(0, TOP_Y - L.pullY, blindEase(prog(t, T.blind, T.blind + 0.5)));
}

export function update(t, ctx) {
  const phys = rope && t >= tA && t < T.line;
  let blindTop = H;
  if (!rope && t >= T.blind && t < T.line) {
    const y = L.pullY + cordY(t);
    ctx.cord.draw([[-40, y], [W + 40, y]], { width: CORD_W, shadow: 1.4 });
    blindTop = y;
  }
  if (phys) {
    const dy = cordY(t);
    // Le fil, très long (il a cousu toute la pile), descend jusqu'à la ligne du store pendant la traction
    const down = E.inOutCubic(prog(t, tA + 0.08, T.blind));
    const pts = rope.at(Math.min(t, rope.t1)).map((p) => [p[0], lerp(p[1], L.pullY, down) + dy]);
    ctx.cord.draw(pts, { width: CORD_W, shadow: t > T.blind ? 1.4 : 1 });
    if (t >= T.blind) blindTop = L.pullY + dy;

    // L'aiguille, au bout du fil, sort de l'image pendant la traction
    const nA = pts[pts.length - 1], nB = pts[pts.length - 4];
    drawNeedle(ctx.cord.g, nA, Math.atan2(nA[1] - nB[1], nA[0] - nB[0]));

    // Les mots glissent le long du fil jusqu'à leur place, se redressent et se resserrent
    const lift = E.inOutCubic(prog(t, T.blind, T.blind + 0.5));
    const slide = E.inOutCubic(prog(t, tA, T.pull + 0.48));
    const settle = E.inOutCubic(prog(t, tA + 0.05, T.pull + 0.4));
    beads.forEach((b, k) => {
      const s = lerp(b.s - s0, slots[k], slide);
      const f = Math.max(0, Math.min(rope.N - 1.001, (s / total) * (rope.N - 1)));
      const i = Math.floor(f), u = f - i;
      const p = pts[i], q = pts[i + 1];
      const x = p[0] + (q[0] - p[0]) * u, y = p[1] + (q[1] - p[1]) * u;
      let ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      if (ang > Math.PI / 2) ang -= Math.PI;
      if (ang < -Math.PI / 2) ang += Math.PI;
      const a0 = b.pose(tA)[2];
      const a = lerp(a0, ang, settle) + lift * 1.1;
      b.place(x, y, a, lerp(1, kBead, settle), 1 - prog(t, T.blind + 0.3, T.blind + 0.55));
    });
  }

  show(mint, t >= T.blind && t < T.line);
  if (t >= T.blind && t < T.line) mint.style.clipPath = `inset(${Math.max(0, blindTop).toFixed(2)}px 0 0 0)`;

  const bOn = t >= T.brand[0] - 0.05 && t < T.line;
  show(brand, bOn);
  if (ctx.shared.noSubs) show(subs, false);
  if (bOn) {
    const words = brand.querySelectorAll('.word');
    const times = [];
    // « Desk to Desk » et « tire le fil. » mot à mot avec la voix, puis les trois sous-titres sur leurs phrases
    const starts = [T.brand, T.brand2, T.sub1, T.sub2, T.sub3];
    let wi = 0;
    brand.querySelectorAll('.display').forEach((ln, li) => {
      const st = starts[li];
      ln.querySelectorAll('.word').forEach((w, k) => times.push(Array.isArray(st) ? st[Math.min(k, st.length - 1)] : st + k * 0.07));
    });
    words.forEach((w, k) => {
      const p = E.enter(prog(t, times[k], times[k] + 0.6));
      w.style.transform = `translate3d(0,${((1 - p) * 0.5).toFixed(3)}em,0)`;
      w.style.opacity = Math.min(1, prog(t, times[k], times[k] + 0.25)).toFixed(3);
      wi++;
    });
  }
}
