// Le Fil : l'élément unique qui relie tout le film.
// 1,0 s rature « simple » → s'emmêle entre les critères → 8,0 s tiré droit → devient la frise
// → 28 s se replie en un point → devient le point final de « Desk to Desk. »
import { svg, show } from '../lib/dom.js';
import { E, prog, lerp, rng } from '../lib/ease.js';
import { spline, lineTo, concat, lengths, slice, resample, toD } from '../lib/path.js';
import { T, SPINE_X } from '../timeline.js';
import { CHIPS, chipTime, camScale, camApply } from './problem.js';

let path, headDot, tangle, L, keys, morphSrc, spineSrc, ctxRef;
const N = 900;
const SPINE_TOP = -80, SPINE_BOT = 2000;

function loop(cx, cy, r, a0, dir = 1) {
  const pts = [];
  for (let k = 0; k <= 6; k++) {
    const a = a0 + dir * (k * Math.PI * 2) / 6;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92]);
  }
  return pts;
}

function buildTangle(strike) {
  const R = rng(7);
  const knots = [];
  // Rature : segment parfaitement droit
  const s0 = [strike.x0, strike.y], s1 = [strike.x1, strike.y];
  const strikePts = lineTo(s0, s1, 4);

  // Gribouillis d'accroche (1,35 → 3,0 s)
  const c1 = [
    s1, [s1[0] + 70, s1[1] + 4], [972, s1[1] + 74],
    ...loop(948, 1222, 44, -Math.PI / 2, 1),
    [770, 1334], [560, 1296],
    ...loop(452, 1196, 56, 0.4, -1),
    [566, 1074], [640, 984],
  ];
  // Passage par chaque critère, avec boucles et détours
  const c2 = [];
  const chipIdx = [];
  let prev = [640, 984];
  CHIPS.forEach((c, k) => {
    const mid = [(prev[0] + c.x) / 2, (prev[1] + c.y) / 2];
    const dx = c.x - prev[0], dy = c.y - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const off = (R() - 0.5) * 220;
    c2.push([mid[0] - (dy / len) * off, mid[1] + (dx / len) * off]);
    if (k % 3 === 1) {
      const a = R() * Math.PI * 2;
      c2.push(...loop(c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 30, 40 + R() * 16, a + Math.PI, k % 2 ? 1 : -1));
    }
    chipIdx.push(c2.length);
    c2.push([c.x, c.y]);
    prev = [c.x, c.y];
  });
  // Derniers nœuds au centre (6,0 → 7,6 s)
  const c3 = [
    [520, 1360], ...loop(470, 1250, 62, 1.2, 1), [380, 1090],
    ...loop(640, 960, 52, 2.4, -1), [700, 1120], [560, 1186],
  ];

  const ctrl = [...c1, ...c2, ...c3];
  const knotIdx = [];
  const dense = splineWithKnots(ctrl, 5, knotIdx);
  const all = concat(strikePts, dense);
  const off = strikePts.length - 1;
  const Lall = lengths(all);
  const at = (ctrlIndex) => Lall[off + knotIdx[ctrlIndex]];

  const iC2 = c1.length, iC3 = c1.length + c2.length;
  keys = [
    { t: T.strike, s: 0, e: E.linear },
    { t: T.strikeEnd, s: Lall[off], e: E.outCubic },
    { t: T.problem, s: at(iC2 - 1), e: E.inOutCubic },
    ...chipIdx.map((ci, k) => ({ t: chipTime(k), s: at(iC2 + ci), e: E.inOutCubic })),
    { t: 7.6, s: Lall[Lall.length - 1], e: E.inOutCubic },
  ];
  return { pts: all, L: Lall, tailRest: lerp(Lall[off], at(iC2 - 1), 0.32), strikeLen: Lall[off] };
}

function splineWithKnots(ctrl, step, knotIdx) {
  // Même interpolation que spline(), avec mémorisation de l'indice de chaque point de contrôle
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    knotIdx[i] = out.length;
    const seg = spline([ctrl[Math.max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[Math.min(ctrl.length - 1, i + 2)]], step);
    // spline() sur 4 points produit 3 segments : on ne garde que le segment central
    const a = segIndex(seg, ctrl[i]), b = segIndex(seg, ctrl[i + 1], a + 1);
    for (let j = a; j < b; j++) out.push(seg[j]);
  }
  knotIdx[ctrl.length - 1] = out.length;
  out.push(ctrl[ctrl.length - 1]);
  return out;
}
function segIndex(seg, p, from = 0) {
  for (let j = from; j < seg.length; j++) if (Math.abs(seg[j][0] - p[0]) < 1e-6 && Math.abs(seg[j][1] - p[1]) < 1e-6) return j;
  return from;
}

function headAt(t) {
  if (t <= keys[0].t) return 0;
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = keys[i - 1], b = keys[i];
      return lerp(a.s, b.s, b.e(prog(t, a.t, b.t)));
    }
  }
  return keys[keys.length - 1].s;
}
function tailAt(t) {
  return lerp(0, tangle.tailRest, E.inOutCubic(prog(t, T.hookOut - 0.05, T.problem - 0.1)));
}

export function build(ctx) {
  ctxRef = ctx;
  const root = svg('svg', { width: 1080, height: 1920, viewBox: '0 0 1080 1920', style: 'position:absolute;left:0;top:0;overflow:visible' }, ctx.layers.thread);
  path = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, root);
  headDot = svg('circle', { r: 9, fill: '#34E0B8' }, root);
  tangle = buildTangle(ctx.shared.strike);

  // Source du dépliage : le fil visible à 8,0 s, ré-échantillonné
  const s = camScale(T.drop);
  const vis = slice(tangle.pts, tangle.L, tailAt(T.drop), headAt(T.drop)).map((p) => camApply(p, s));
  morphSrc = resample(vis, N);
  spineSrc = resample([[SPINE_X, SPINE_TOP], [SPINE_X, SPINE_BOT]], N);
}

export function spineVisible(t) {
  return t >= T.drop + 0.9 && t < T.end;
}

export function update(t) {
  const dot = ctxRef.shared.dot;
  let pts = null, width = 7, hd = null, hr = 9;

  if (t < T.strike) {
    pts = null;
  } else if (t < T.drop) {
    const h = headAt(t), tl = tailAt(t);
    const s = camScale(t);
    pts = slice(tangle.pts, tangle.L, tl, h).map((p) => camApply(p, s));
    if (pts.length > 1) hd = pts[pts.length - 1];
    hr = 9 * Math.min(1, prog(t, T.strike, T.strike + 0.08));
  } else if (t < T.drop + 0.95) {
    // Le fil est tiré : dépliage progressif de la queue vers la tête
    pts = new Array(N);
    for (let i = 0; i < N; i++) {
      const d = 0.34 * (i / (N - 1));
      const f = E.snap(prog(t, T.drop + d, T.drop + d + 0.52));
      pts[i] = [lerp(morphSrc[i][0], spineSrc[i][0], f), lerp(morphSrc[i][1], spineSrc[i][1], f)];
    }
    width = lerp(7, 4, E.inOutCubic(prog(t, T.drop + 0.3, T.drop + 0.9)));
  } else if (t < T.end) {
    pts = [[SPINE_X, SPINE_TOP], [SPINE_X, SPINE_BOT]];
    width = 4;
  } else if (t < T.end + 0.5) {
    // Le fil se replie sur lui-même jusqu'à la hauteur du point final
    pts = new Array(N);
    for (let i = 0; i < N; i++) {
      const d = 0.18 * (1 - Math.abs((2 * i) / (N - 1) - 1));
      const f = E.inOutCubic(prog(t, T.end + d, T.end + d + 0.32));
      pts[i] = [SPINE_X, lerp(spineSrc[i][1], dot.y, f)];
    }
    width = 4;
    hd = [SPINE_X, dot.y];
    hr = 7 * prog(t, T.end + 0.3, T.end + 0.45);
  } else {
    // Le point écrit la signature de gauche à droite, puis devient le point final
    hd = [dotX(t), dot.y];
    const grow = E.soft(prog(t, T.dot - 0.05, T.dot + 0.25));
    hr = lerp(7, dot.r, grow);
  }

  if (pts && pts.length > 1) {
    path.setAttribute('d', toD(pts));
    path.setAttribute('stroke-width', width.toFixed(2));
    show(path, true);
  } else show(path, false);

  if (hd) {
    headDot.setAttribute('cx', hd[0].toFixed(2));
    headDot.setAttribute('cy', hd[1].toFixed(2));
    headDot.setAttribute('r', Math.max(0, hr).toFixed(2));
    headDot.setAttribute('fill', t >= T.end ? '#2ACAA5' : '#34E0B8');
    show(headDot, true);
  } else show(headDot, false);
}

// Abscisse du point pendant l'écriture de la signature
export function dotX(t) {
  const dot = ctxRef.shared.dot;
  return lerp(SPINE_X, dot.x, E.inOutCubic(prog(t, T.end + 0.45, T.dot)));
}
