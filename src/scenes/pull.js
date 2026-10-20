// 3. On tire le fil : la corde est tirée par ses deux bouts (simulation physique),
// les étiquettes s'alignent, puis la corde remonte comme un store et révèle l'aplat menthe.
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, bezier } from '../lib/ease.js';
import { slice } from '../lib/path.js';
import { simulateRope } from '../lib/rope.js';
import { T, L, W, H, pick } from '../timeline.js';
import { CORD_W, placeTag } from './tangle.js';

const blindEase = bezier(0.72, 0, 0.18, 1);
const TOP_Y = pick(44, 34);
let rope, tagIdx, mint, brand, subs, tags, tA;

export function build(ctx) {
  const tg = ctx.shared.tangle;
  tA = tg.tAnchor;
  const s0 = tg.tailAt(tA);
  const init = slice(tg.path, tg.Ls, s0, tg.headAt(tA));
  const total = tg.Ls[tg.Ls.length - 1] - s0;
  // Les étiquettes du milieu de la pelote se retrouvent au centre de l'image une fois la corde tendue
  const sMid = (tg.tagS[3] + tg.tagS[8]) / 2 - s0;
  const x0 = W / 2 - sMid;
  const a0 = init[0], b0 = init[init.length - 1];
  const e = (t) => E.inOutCubic(prog(t, tA, T.pull + 0.48));
  rope = simulateRope({
    init, N: 280, t0: tA, t1: T.blind + 1.0, hz: 240, sub: 6, iters: 22, damping: 0.994, bend: 0.1,
    endA: (t) => [lerp(a0[0], x0, e(t)), lerp(a0[1], L.pullY, e(t))],
    endB: (t) => [lerp(b0[0], x0 + total * 0.992, e(t)), lerp(b0[1], L.pullY, e(t))],
  });
  tagIdx = tg.tagS.map((s) => ((s - s0) / total) * (rope.N - 1));
  tags = ctx.shared.tagEls;

  mint = el('div', { cls: 'layer', style: { background: 'var(--mint)' } }, ctx.layers.mint);

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
  const phys = t >= tA && t < T.line;
  let blindTop = H;
  if (phys) {
    const dy = cordY(t);
    const pts = rope.at(Math.min(t, rope.t1)).map((p) => [p[0], p[1] + dy]);
    ctx.cord.draw(pts, { width: CORD_W, shadow: t > T.blind ? 1.4 : 1 });
    if (t >= T.blind) blindTop = L.pullY + dy;

    // Étiquettes entraînées par la corde
    const lift = E.inOutCubic(prog(t, T.blind, T.blind + 0.5));
    tags.forEach((tg, k) => {
      const f = tagIdx[k];
      const i = Math.min(rope.N - 2, Math.floor(f)), u = f - i;
      const p = pts[i], q = pts[i + 1];
      const x = p[0] + (q[0] - p[0]) * u, y = p[1] + (q[1] - p[1]) * u;
      let ang = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
      if (ang > 90) ang -= 180;
      if (ang < -90) ang += 180;
      const settle = E.inOutCubic(prog(t, tA, T.pull + 0.3));
      const a = lerp(tg.base, ang * 0.85, settle) + lift * 64;
      placeTag(tg, x, y, a, 1, 1 - prog(t, T.blind + 0.35, T.blind + 0.6));
    });
  }

  show(mint, t >= T.blind && t < T.line);
  if (t >= T.blind && t < T.line) mint.style.clipPath = `inset(${Math.max(0, blindTop).toFixed(2)}px 0 0 0)`;

  const bOn = t >= T.brand[0] - 0.05 && t < T.line;
  show(brand, bOn);
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
