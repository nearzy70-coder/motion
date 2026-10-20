// 2. La pelote : la cordelette continue sa course, s'emmêle, et des étiquettes en papier
// (les critères d'une recherche de bureaux) y sont nouées une à une, en rythme.
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, rng } from '../lib/ease.js';
import { spline, lineTo, concat, lengths, slice } from '../lib/path.js';
import { T, L, W, pick } from '../timeline.js';

export const TAGS = [
  { label: 'Budget', u: 0.1, v: 0.08 },
  { label: 'Charges', u: 0.6, v: 0.42 },
  { label: 'Quartier', u: 0.3, v: 0.28 },
  { label: 'Bureau opéré ?', u: 0.04, v: 0.72 },
  { label: 'Bail 3/6/9', u: 0.56, v: 0.05 },
  { label: 'Nombre de postes', u: 0.06, v: 0.46 },
  { label: 'Délais', u: 0.7, v: 0.68 },
  { label: 'Surface', u: 0.36, v: 0.6 },
  { label: 'Préavis', u: 0.72, v: 0.24 },
  { label: 'Coworking ?', u: 0.1, v: 0.94 },
  { label: 'Travaux', u: 0.64, v: 0.9 },
  { label: 'Visites', u: 0.4, v: 0.8 },
];

const REGION = pick({ x0: 110, x1: 980, y0: 640, y1: 1430 }, { x0: 92, x1: 980, y0: 250, y1: 960 });
export const CORD_W = pick(11, 9);

let path, Ls, keys, tagEls, head, heads, flies, sStrike;

function loop(cx, cy, r, a0, dir = 1) {
  const pts = [];
  for (let k = 0; k <= 6; k++) {
    const a = a0 + (dir * k * Math.PI * 2) / 6;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]);
  }
  return pts;
}

function splineKnots(ctrl, step, knots) {
  // Catmull-Rom à travers ctrl, en mémorisant l'indice de sortie de chaque point de contrôle
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    knots[i] = out.length;
    const seg = spline([ctrl[Math.max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[Math.min(ctrl.length - 1, i + 2)]], step);
    const a = find(seg, ctrl[i]), b = find(seg, ctrl[i + 1], a + 1);
    for (let j = a; j < b; j++) out.push(seg[j]);
  }
  knots[ctrl.length - 1] = out.length;
  out.push(ctrl[ctrl.length - 1]);
  return out;
}
function find(seg, p, from = 0) {
  for (let j = from; j < seg.length; j++) if (Math.abs(seg[j][0] - p[0]) < 1e-6 && Math.abs(seg[j][1] - p[1]) < 1e-6) return j;
  return from;
}

export function build(ctx) {
  const r = ctx.shared.simple;
  const R = rng(11);
  const yu = r.y + r.h * 0.9, ys = r.y + r.h * 0.6;
  const xe = r.x + r.w;

  // Accroche : entrée par la gauche, soulignement, boucle autour du mot, rature (segments droits)
  const A0 = [-90, yu + 8], A1 = [r.x - 40, yu + 6], A2 = [xe + 16, yu];
  const loopUp = spline([A2, [xe + 52, yu - r.h * 0.22], [xe + 44, r.y + r.h * 0.18], [xe + 6, ys]], 4);
  const S0 = [xe + 6, ys], S1 = [r.x - 34, ys];
  const hookPts = concat(lineTo(A0, A1, 4), lineTo(A1, A2, 4), loopUp, lineTo(S0, S1, 4));
  const hookL = lengths(hookPts);
  const sA1 = hookL[Math.round(lengths(lineTo(A0, A1, 4)).length - 1)];

  // Errance puis passage par chaque étiquette
  const map = (u, v) => [lerp(REGION.x0, REGION.x1, u), lerp(REGION.y0, REGION.y1, v)];
  const ctrl = [S1, [S1[0] - 60, ys + 70], ...loop(S1[0] + 40, ys + 190, 54, 3.4, -1), map(0.42, 0.18)];
  const iWander = ctrl.length - 1;
  const tagIdx = [];
  let prev = ctrl[ctrl.length - 1];
  TAGS.forEach((g, k) => {
    const p = map(g.u, g.v);
    const mid = [(prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2];
    const dx = p[0] - prev[0], dy = p[1] - prev[1], len = Math.hypot(dx, dy) || 1;
    const off = (R() - 0.5) * pick(260, 200);
    ctrl.push([mid[0] - (dy / len) * off, mid[1] + (dx / len) * off]);
    if (k % 3 === 1) ctrl.push(...loop(p[0] + 34, p[1] + 26, 36 + R() * 14, R() * 6, k % 2 ? 1 : -1));
    tagIdx.push(ctrl.length);
    ctrl.push(p);
    prev = p;
  });
  // Derniers nœuds pendant que « le temps file »
  const c = map(0.42, 0.5);
  ctrl.push([c[0] + 120, c[1] + 160], ...loop(c[0] - 40, c[1] + 40, 70, 0.5, 1), [c[0] + 200, c[1] - 120], ...loop(c[0] + 120, c[1] - 40, 50, 2.2, -1), [c[0] - 10, c[1] + 10]);

  const knots = [];
  const wander = splineKnots(ctrl, 5, knots);
  path = concat(hookPts, wander);
  Ls = lengths(path);
  const off = hookPts.length - 1;
  const at = (i) => Ls[off + knots[i]];

  keys = [
    { t: T.cordIn, s: 0, e: E.linear },
    { t: T.cordIn + 0.2, s: sA1, e: E.outCubic },
    { t: T.under, s: Ls[lengths(concat(lineTo(A0, A1, 4), lineTo(A1, A2, 4))).length - 1], e: E.inOutCubic },
    { t: T.around, s: Ls[hookPts.length - 1 - lineTo(S0, S1, 4).length + 1], e: E.inOutCubic },
    { t: T.strike, s: Ls[off], e: E.outCubic },
    { t: T.tangle, s: at(iWander), e: E.inOutCubic },
    ...tagIdx.map((ci, k) => ({ t: T.tag0 + k * T.tagStep, s: at(ci), e: E.inOutCubic })),
    { t: T.pull - 0.62, s: Ls[Ls.length - 1], e: E.inOutCubic },
  ];

  sStrike = Ls[off];
  ctx.shared.tangle = {
    path, Ls,
    tagS: tagIdx.map((ci) => at(ci)),
    headAt, tailAt, tAnchor: T.pull - 0.62,
  };

  // Étiquettes
  tagEls = TAGS.map((g, k) => {
    const e = el('div', { cls: 'tag', text: g.label }, ctx.layers.tags);
    e.style.transformOrigin = '28px 31px';
    e.style.fontSize = pick('27px', '23px');
    if (L.id === '11') { e.style.height = '54px'; e.style.paddingLeft = '42px'; }
    return { e, base: (R() - 0.5) * 26, t: T.tag0 + k * T.tagStep };
  });
  ctx.shared.tagEls = tagEls;

  // Titres
  head = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  const hs = Math.round(L.headSize * 1.12);
  heads = [mk(head, 'Très vite,', hs), mk(head, 'tout s’emmêle.', hs)];
  flies = mk(head, 'Et le temps <span style="color:var(--mint)">file.</span>', hs);
  flies.wrap.style.position = 'absolute';
  flies.wrap.style.top = '0px';
}

function mk(parent, html, size) {
  const wrap = el('div', { cls: 'mask display', style: { fontSize: size + 'px', marginBottom: '6px' } }, parent);
  return { wrap, inner: el('span', { html }, wrap) };
}

// La queue suit le tracé (comme un serpent) pour libérer l'accroche quand le texte sort
export function tailAt(t) {
  return sStrike * 1.04 * E.inOutCubic(prog(t, T.hookOut - 0.05, T.tangle + 0.15));
}

export function headAt(t) {
  if (t <= keys[0].t) return 0;
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = keys[i - 1], b = keys[i];
      return lerp(a.s, b.s, b.e(prog(t, a.t, b.t)));
    }
  }
  return keys[keys.length - 1].s;
}

// Position et angle d'une étiquette posée sur le tracé
export function tagPose(pts, Lp, s) {
  let i = 1;
  while (i < Lp.length - 1 && Lp[i] < s) i++;
  const p = pts[i - 1], q = pts[i];
  const u = (s - Lp[i - 1]) / ((Lp[i] - Lp[i - 1]) || 1);
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
}

export function placeTag(tg, x, y, angle, scale = 1, alpha = 1) {
  tg.e.style.transform = `translate3d(${(x - 28).toFixed(2)}px,${(y - 31).toFixed(2)}px,0) rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
  op(tg.e, alpha);
}

export function update(t, ctx) {
  // Le tracé posé (avant que la physique ne prenne le relais)
  if (t >= T.cordIn && t < ctx.shared.tangle.tAnchor + 1e-6) {
    const h = headAt(t);
    const pts = slice(path, Ls, tailAt(t), Math.max(1, h));
    ctx.cord.draw(pts, { width: CORD_W });
  }

  // Étiquettes posées
  const tagOn = t < ctx.shared.tangle.tAnchor;
  tagEls.forEach((tg, k) => {
    const vis = tagOn && t >= tg.t - 0.02;
    show(tg.e, vis || (t >= ctx.shared.tangle.tAnchor && t < T.blind + 1));
    if (!vis) return;
    const [x, y] = tagPose(path, Ls, ctx.shared.tangle.tagS[k]);
    const a = E.soft(prog(t, tg.t - 0.02, tg.t + 0.32));
    placeTag(tg, x, y, tg.base + (1 - a) * -24, 0.7 + 0.3 * a, Math.min(1, prog(t, tg.t - 0.02, tg.t + 0.08)));
  });

  // Titres
  const hOn = t >= T.tangle - 0.1 && t < T.pull + 0.3;
  show(head, hOn);
  if (hOn) {
    heads.forEach((ln, i) => {
      const t0 = T.tangle + i * 0.3;
      const p = E.enter(prog(t, t0, t0 + 0.7)), q = E.exit(prog(t, T.timeFlies - 0.35 + i * 0.05, T.timeFlies - 0.02 + i * 0.05));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    });
    const p = E.enter(prog(t, T.timeFlies + 0.05, T.timeFlies + 0.75)), q = E.exit(prog(t, T.pull - 0.05, T.pull + 0.25));
    flies.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
  }
}
