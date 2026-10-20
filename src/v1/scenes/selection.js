// Étape 02 — Sélection : carte illustrative de Paris, le marché se filtre, trois offres ressortent,
// le fil les relie, puis les fiches d'offres apparaissent et l'une est retenue.
import { el, svg, show, op, tf, ringDot, checkIcon } from '../lib/dom.js';
import { E, prog, lerp, rng } from '../lib/ease.js';
import { spline, lineTo, prepared, partial, toD } from '../lib/path.js';
import { T, W, H, SPINE_X, NODE_Y, CONTENT_X, CONTENT_W } from '../timeline.js';
import { THUMB } from '../plan.js';

const PX = CONTENT_X, PY = 696, PW = CONTENT_W, PH = 394;
const ZC = [412, 197];
const PINS = [
  { p: [296, 156], label: 'Paris 9e' },
  { p: [440, 238], label: 'Paris 2e' },
  { p: [604, 148], label: 'Paris 10e' },
];
const OFFERS = [
  { t: 'Bureau opéré · Paris 2e', s: 'Espace privatif · 12 postes' },
  { t: 'Coworking · Paris 9e', s: 'Bureaux fermés · 10 à 14 postes' },
  { t: 'Bail commercial · Paris 10e', s: 'Plateau à aménager' },
];

let panel, mapG, streets, seine, dots, pins, routeEl, routeP, conn, connP, cards, check;

export function build(ctx) {
  const R = rng(21);
  panel = el('div', { cls: 'abs', style: { left: PX + 'px', top: PY + 'px', width: PW + 'px', height: PH + 'px', borderRadius: '32px', overflow: 'hidden', background: '#131816', border: '1.5px solid rgba(255,255,255,0.09)' } }, ctx.layers.scene);
  const s = svg('svg', { width: PW, height: PH, viewBox: `0 0 ${PW} ${PH}`, style: 'position:absolute;left:0;top:0' }, panel);
  mapG = svg('g', {}, s);

  // Tissu urbain stylisé (illustratif)
  streets = [];
  const addLine = (pts, w, o) => {
    const e = svg('path', { d: toD(pts), fill: 'none', stroke: '#449280', 'stroke-width': w, 'stroke-opacity': o, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1, 'vector-effect': 'non-scaling-stroke' }, mapG);
    streets.push({ e, d: R() * 0.5 });
  };
  // Deux trames de rues légèrement courbes, découpées en îlots, révélées depuis le centre
  for (const fam of [{ a: -0.2, step: 40 }, { a: 1.3, step: 50 }]) {
    const d = [Math.cos(fam.a), Math.sin(fam.a)], n = [-d[1], d[0]];
    for (let o = -620; o <= 620; o += fam.step * (0.8 + R() * 0.4)) {
      let s = -720;
      while (s < 720) {
        const len = 50 + R() * 90, gap = R() < 0.3 ? 30 + R() * 50 : 0;
        const pts = [];
        for (let u = s; u <= s + len; u += 10) {
          const bend = 9 * Math.sin(u / 170 + o / 90);
          pts.push([ZC[0] + n[0] * (o + bend) + d[0] * u, ZC[1] + n[1] * (o + bend) + d[1] * u]);
        }
        const m = pts[pts.length >> 1];
        if (m[0] > -30 && m[0] < PW + 30 && m[1] > -30 && m[1] < PH + 30 && gap === 0) {
          const e = svg('path', { d: toD(pts), fill: 'none', stroke: '#449280', 'stroke-width': 1.6, 'stroke-opacity': 0.34, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1, 'vector-effect': 'non-scaling-stroke' }, mapG);
          streets.push({ e, d: Math.min(0.55, Math.hypot(m[0] - ZC[0], m[1] - ZC[1]) / 900 + R() * 0.06) });
        }
        s += len + (gap || 4);
      }
    }
  }
  // Grands axes
  for (const ctrl of [
    [[-20, 70], [200, 96], [420, 104], [640, 90], [860, 60]],
    [[150, -20], [210, 140], [250, 300], [300, 420]],
    [[700, -20], [640, 160], [600, 300], [560, 420]],
  ]) addLine(spline(ctrl, 8), 3, 0.5);
  // La Seine
  seine = svg('path', {
    d: toD(spline([[-30, 352], [110, 318], [236, 300], [340, 288], [436, 286], [536, 304], [650, 334], [760, 362], [860, 400]], 6)),
    fill: 'none', stroke: '#449280', 'stroke-width': 20, 'stroke-opacity': 0.55, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1,
  }, mapG);

  // Marché : de nombreuses offres
  dots = [];
  for (let i = 0; i < 46; i++) {
    let x, y;
    do { x = 30 + R() * (PW - 60); y = 30 + R() * (PH - 60); } while (PINS.some((p) => Math.hypot(p.p[0] - x, p.p[1] - y) < 40));
    dots.push({ e: svg('circle', { cx: x, cy: y, r: 5.5, fill: '#fff' }, mapG), t0: T.step2 + 0.45 + R() * 0.45 });
  }

  // Le fil relie les offres retenues
  const start = [0, NODE_Y[1] - PY];
  routeP = prepared(spline([start, [140, 150], PINS[0].p, [356, 196], PINS[1].p, [520, 190], PINS[2].p], 4));
  routeEl = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, mapG);

  pins = PINS.map((p) => {
    const g = el('div', { cls: 'abs' }, panel);
    const halo = el('div', { cls: 'abs', style: { left: '-26px', top: '-26px', width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(42,202,165,0.18)' } }, g);
    const rd = ringDot(g, 34);
    Object.assign(rd.style, { left: '-17px', top: '-17px', background: '#111' });
    const lab = el('div', { cls: 'abs pill', text: p.label, style: { height: '44px', fontSize: '22px', padding: '0 16px', background: '#fff', color: '#111', transformOrigin: '0 100%' } }, g);
    return { g, lab, halo, p: p.p };
  });

  const sv = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, ctx.layers.strokes);
  conn = svg('path', { fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4, 'stroke-linecap': 'round' }, sv);
  connP = prepared(lineTo([SPINE_X, NODE_Y[1]], [PX, NODE_Y[1]]));

  // Fiches d'offres
  const plan = ctx.shared.plan;
  cards = OFFERS.map((o, i) => {
    const c = el('div', { cls: 'card', style: { left: PX + 'px', top: 1114 + i * 120 + 'px', width: PW + 'px', height: '108px', borderRadius: '24px', boxShadow: '0 10px 24px rgba(0,0,0,.32)' } }, ctx.layers.scene);
    const th = el('div', { cls: 'abs', style: { left: THUMB.x - PX + 'px', top: '16px', width: THUMB.w + 'px', height: THUMB.h + 'px', borderRadius: '16px', background: '#151b19', overflow: 'hidden' } }, c);
    th.appendChild(miniPlan(i === 0 ? plan : null, i));
    const tx = el('div', { cls: 'abs', style: { left: '120px', top: '18px' } }, c);
    el('div', { text: o.t, style: { fontSize: '30px', fontWeight: '700', letterSpacing: '-0.01em', whiteSpace: 'nowrap' } }, tx);
    el('div', { text: o.s, style: { fontSize: '24px', fontWeight: '500', color: 'var(--paper-muted)', marginTop: '4px', whiteSpace: 'nowrap' } }, tx);
    return { c, th };
  });
  check = el('div', { cls: 'abs', html: checkIcon(30, '#111', 3.4), style: { right: '28px', top: '28px', width: '52px', height: '52px', borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', left: 'auto' } }, cards[0].c);
}

function miniPlan(plan, i) {
  const s = svg('svg', { width: THUMB.w, height: THUMB.h, viewBox: '0 0 76 76' });
  if (plan) {
    const b = plan.bbox;
    const k0 = Math.min(THUMB.w / b.w, THUMB.h / b.h) * 0.86;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    s.setAttribute('viewBox', `${cx - 38 / k0} ${cy - 38 / k0} ${76 / k0} ${76 / k0}`);
    for (const w of plan.walls) svg('line', { x1: w.a[0], y1: w.a[1], x2: w.b[0], y2: w.b[1], stroke: '#2ACAA5', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, s);
  } else {
    const r = i === 1 ? [16, 12, 44, 52] : [10, 20, 56, 36];
    svg('rect', { x: r[0], y: r[1], width: r[2], height: r[3], fill: 'none', stroke: '#2ACAA5', 'stroke-width': 1.6 }, s);
    svg('line', { x1: r[0], y1: r[1] + r[3] * 0.45, x2: r[0] + r[2] * 0.6, y2: r[1] + r[3] * 0.45, stroke: '#2ACAA5', 'stroke-width': 1.6 }, s);
    svg('line', { x1: r[0] + r[2] * 0.6, y1: r[1], x2: r[0] + r[2] * 0.6, y2: r[1] + r[3] * 0.7, stroke: '#2ACAA5', 'stroke-width': 1.6 }, s);
  }
  return s;
}

export function update(t) {
  const on = t >= T.step2 && t < T.zoom + 0.6;
  show(panel, on);
  cards.forEach((c) => show(c.c, on && t >= T.step2 + 1.4));
  const cOn = t >= T.step2 + 1.1 && t < T.zoom + 0.4;
  show(conn, cOn);
  if (cOn) {
    conn.setAttribute('d', toD(partial(connP, 0, E.inOutCubic(prog(t, T.step2 + 1.12, T.step2 + 1.28)))));
    op(conn, 1 - prog(t, T.zoom, T.zoom + 0.3));
  }
  if (!on) return;

  const out = E.exit(prog(t, T.zoom, T.zoom + 0.38));
  const pin = E.enter(prog(t, T.step2 + 0.05, T.step2 + 0.5));
  panel.style.clipPath = `inset(0 0 ${((1 - pin) * 100).toFixed(2)}% 0 round 32px)`;
  tf(panel, 0, -30 * out);
  op(panel, Math.min(1, prog(t, T.step2 + 0.05, T.step2 + 0.2)) * (1 - out));

  // Lente avancée dans la carte
  const z = 1 + 0.1 * E.inOutCubic(prog(t, T.step2 + 0.2, T.zoom));
  mapG.setAttribute('transform', `translate(${(ZC[0] * (1 - z)).toFixed(2)} ${(ZC[1] * (1 - z)).toFixed(2)}) scale(${z.toFixed(5)})`);
  const zp = (p) => [ZC[0] + (p[0] - ZC[0]) * z, ZC[1] + (p[1] - ZC[1]) * z];

  streets.forEach((s) => s.e.setAttribute('stroke-dashoffset', (1 - E.outCubic(prog(t, T.step2 + 0.12 + s.d, T.step2 + 0.62 + s.d))).toFixed(4)));
  seine.setAttribute('stroke-dashoffset', (1 - E.inOutCubic(prog(t, T.step2 + 0.15, T.step2 + 0.85))).toFixed(4));

  const filt = E.inOutCubic(prog(t, T.step2 + 1.0, T.step2 + 1.3));
  dots.forEach((d) => {
    const a = E.soft(prog(t, d.t0, d.t0 + 0.25));
    d.e.setAttribute('r', (5.5 * a).toFixed(2));
    d.e.setAttribute('fill-opacity', (0.62 - 0.5 * filt).toFixed(3));
  });

  pins.forEach((p, i) => {
    const t0 = T.step2 + 1.12 + i * 0.12;
    const a = E.soft(prog(t, t0, t0 + 0.38));
    const [x, y] = zp(p.p);
    tf(p.g, x, y, Math.max(0.001, a));
    op(p.g, prog(t, t0, t0 + 0.1));
    const l = E.enter(prog(t, t0 + 0.08, t0 + 0.5));
    tf(p.lab, 26, -62 + (1 - l) * 10, 0.9 + 0.1 * l);
    op(p.lab, l);
    p.halo.style.transform = `scale(${(0.6 + 0.4 * a).toFixed(3)})`;
  });
  routeEl.setAttribute('d', toD(partial(routeP, 0, E.inOutCubic(prog(t, T.step2 + 1.28, T.step2 + 1.9)))));

  cards.forEach((c, i) => {
    const t0 = T.step2 + 1.5 + i * 0.13;
    const a = E.enter(prog(t, t0, t0 + 0.55));
    const pick = E.inOutCubic(prog(t, T.pick, T.pick + 0.3));
    const leave = i === 0 ? E.exit(prog(t, T.zoom + 0.15, T.zoom + 0.45)) : out;
    tf(c.c, 0, (1 - a) * 70 + (i === 0 ? 0 : 30 * out));
    op(c.c, prog(t, t0, t0 + 0.2) * (i === 0 ? 1 : 1 - 0.62 * pick) * (1 - leave));
    if (i === 0) {
      c.c.style.boxShadow = `0 10px 24px rgba(0,0,0,.32), 0 0 0 ${(4 * pick).toFixed(2)}px #2ACAA5`;
      op(c.th, t < T.zoom ? 1 : 0);
    }
  });
  const ck = E.soft(prog(t, T.pick + 0.05, T.pick + 0.4));
  check.style.transform = `scale(${Math.max(0.001, ck).toFixed(4)})`;
}
