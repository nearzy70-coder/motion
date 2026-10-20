// Étape 03 — Visites : on plonge dans la vignette de l'offre retenue, son plan se déploie en maquette 3D,
// puis le fil trace le parcours de visite jusqu'à la salle de réunion.
import { el, svg, show, op, tf, ringDot } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { lineTo, concat, prepared, partial, toD } from '../lib/path.js';
import { T, W, H, SPINE_X, NODE_Y } from '../timeline.js';
import { THUMB } from '../plan.js';
import { createOffice } from '../office3d.js';

let canvas, office, planSvg, planG, wallEls, furnEls, plan, conn, connP, labels;

export function build(ctx) {
  canvas = el('canvas', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' } }, ctx.layers.gl);
  canvas.width = W; canvas.height = H;
  office = createOffice(canvas, W, H, T);
  plan = office.planScreen();
  ctx.shared.plan = plan;
  ctx.shared.office = office;

  // Plan 2D (mêmes coordonnées que la maquette vue du dessus)
  planSvg = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, ctx.layers.plan);
  planG = svg('g', {}, planSvg);
  furnEls = plan.furn.map((f) => f.r
    ? svg('circle', { cx: f.c[0], cy: f.c[1], r: f.r, fill: 'none', stroke: '#2ACAA5', 'stroke-opacity': 0.5, 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, planG)
    : svg('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 2, fill: 'none', stroke: '#2ACAA5', 'stroke-opacity': 0.5, 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, planG));
  wallEls = plan.walls.map((w) => svg('line', {
    x1: w.a[0], y1: w.a[1], x2: w.b[0], y2: w.b[1], stroke: '#2ACAA5', 'stroke-width': 4,
    'stroke-linecap': 'round', 'stroke-dasharray': w.glass ? '0' : '0', 'vector-effect': 'non-scaling-stroke',
  }, planG));

  // Branche du fil : nœud 03 → mur gauche du plan
  const sv = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, ctx.layers.strokes);
  conn = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4, 'stroke-linecap': 'round' }, sv);
  connP = prepared(concat(lineTo([SPINE_X, NODE_Y[2]], [plan.bbox.x, NODE_Y[2]])));

  // Étiquettes projetées dans la maquette
  labels = [
    mkLabel(ctx, 'Open space · 12 postes', [0, 2.3, -1.5]),
    mkLabel(ctx, 'Salle de réunion', [-2.7, 3.4, -7.4]),
  ];
}

function mkLabel(ctx, text, pos) {
  const e = el('div', { cls: 'abs pill', style: { background: '#fff', color: 'var(--ink)', height: '56px', fontSize: '25px', boxShadow: '0 12px 30px rgba(0,0,0,.35)' } }, ctx.layers.scene);
  const rd = ringDot(e, 22); rd.style.position = 'relative';
  el('span', { text }, e);
  return { e, pos, w: e.offsetWidth, h: e.offsetHeight };
}

export function update(t) {
  // Zoom dans la vignette (FLIP) : la vignette 76 px devient le plan plein cadre
  const pOn = t >= T.zoom && t < T.extrude + 0.4;
  show(planSvg, pOn);
  if (pOn) {
    const b = plan.bbox;
    const k0 = Math.min(THUMB.w / b.w, THUMB.h / b.h) * 0.86;
    const f = E.move(prog(t, T.zoom, T.zoom + 0.62));
    const s = Math.pow(k0, 1 - f);
    const c0 = [THUMB.x + THUMB.w / 2, THUMB.y + THUMB.h / 2], c1 = [b.x + b.w / 2, b.y + b.h / 2];
    const cx = lerp(c0[0], c1[0], f), cy = lerp(c0[1], c1[1], f);
    planG.setAttribute('transform', `translate(${(cx - c1[0] * s).toFixed(2)} ${(cy - c1[1] * s).toFixed(2)}) scale(${s.toFixed(5)})`);
    const sw = lerp(1.6, 4, f);
    wallEls.forEach((w) => w.setAttribute('stroke-width', sw.toFixed(2)));
    furnEls.forEach((e) => e.setAttribute('stroke-opacity', (0.5 * (1 - prog(t, T.extrude - 0.25, T.extrude))).toFixed(3)));
    op(planSvg, 1 - prog(t, T.extrude + 0.05, T.extrude + 0.35));
  }

  // Branche du fil
  const cOn = t >= T.zoom + 0.55 && t < T.extrude + 0.5;
  show(conn, cOn);
  if (cOn) {
    conn.setAttribute('d', toD(partial(connP, 0, E.inOutCubic(prog(t, T.zoom + 0.55, T.zoom + 0.85)))));
    op(conn, 1 - prog(t, T.extrude + 0.1, T.extrude + 0.4));
  }

  // Maquette 3D
  const gOn = t >= T.extrude - 0.25 && t < T.step4 + 0.3;
  show(canvas, gOn);
  if (gOn) {
    op(canvas, prog(t, T.extrude - 0.22, T.extrude + 0.08) * (1 - prog(t, T.step4 - 0.05, T.step4 + 0.25)));
    office.update(t);
    office.render();
  }

  labels.forEach((l, i) => {
    const t0 = T.extrude + 1.15 + i * 0.22;
    const on = gOn && t >= t0;
    show(l.e, on);
    if (!on) return;
    const [x, y] = office.project(...l.pos);
    const a = E.enter(prog(t, t0, t0 + 0.5));
    tf(l.e, x - l.w / 2, y - l.h / 2 + (1 - a) * 18, 0.96 + 0.04 * a);
    op(l.e, prog(t, t0, t0 + 0.25) * (1 - prog(t, T.step4 - 0.25, T.step4 - 0.05)));
  });
}
