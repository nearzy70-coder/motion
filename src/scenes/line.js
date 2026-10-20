// 4 à 6. La corde à linge : le fil tendu devient la ligne où chaque étape est accrochée.
// La caméra la longe ; les feuilles réagissent à ses accélérations (ressort amorti précalculé).
import { el, svg, show, op } from '../lib/dom.js';
import { E, prog, lerp, bezier } from '../lib/ease.js';
import { spline } from '../lib/path.js';
import { paperTexture } from '../lib/texture.js';
import { T, L, W, H, pick } from '../timeline.js';
import * as formats from '../sheets/formats.js';
import * as brief from '../sheets/brief.js';
import * as mapSheet from '../sheets/map.js';
import * as plan from '../sheets/plan.js';
import * as contract from '../sheets/contract.js';
import * as keys from '../sheets/keys.js';
import * as services from '../sheets/services.js';

const K = L.sheetK;
const CW = pick(10, 8);

// Objets accrochés, dans l'ordre de la corde. t : instant où la caméra arrive devant l'objet.
export const ITEMS = [
  { id: 'coworking', mod: formats, t: T.line, h: 640, head: { lines: ['Coworking, bureau opéré', 'ou bail commercial ?'] } },
  { id: 'opere', mod: formats, t: T.fmt2, h: 640 },
  { id: 'bail', mod: formats, t: T.fmt3, h: 640, head2: { at: T.choose, lines: ['On vous aide', 'à choisir.'] } },
  { id: 'brief', mod: brief, t: T.s1, h: 980, head: { num: '1', lines: ['On définit', 'votre besoin.'] } },
  { id: 'map', mod: mapSheet, t: T.s2, h: 980, head: { num: '2', lines: ['On passe le marché', 'au crible.'] } },
  { id: 'plan', mod: plan, t: T.s3, h: 980, head: { num: '3', lines: ['On visite', 'avec vous.'] } },
  { id: 'contract', mod: contract, t: T.s4, h: 980, head: { num: '4', lines: ['On négocie', 'avec le bailleur.'] } },
  { id: 'keys', mod: keys, t: T.s5, h: 0, head: { num: '5', lines: ['Jusqu’à la', 'remise des clés.'] } },
  { id: 'reneg', mod: services, t: T.reneg, h: 640, head: { lines: ['Déjà installés ?'] } },
  { id: 'day', mod: services, t: T.day, h: 640, head: { lines: ['Une salle', 'pour une journée ?'] } },
];
const SW = 800; // largeur de référence des feuilles

let back, front, headRoot, heads, paper, sway, worldX;
const PIN_DY = pick(14, 11);

const PAN = 0.55;
const panEase = bezier(0.76, 0, 0.2, 1);

export function camX(t) {
  // Plans fixes devant chaque objet ; panoramiques vifs (0,55 s) qui arrivent avec la phrase de la voix
  let x = worldX[0];
  for (let i = 1; i < ITEMS.length; i++) {
    const a = ITEMS[i].t - PAN, b = ITEMS[i].t;
    if (t >= a) x = lerp(worldX[i - 1], worldX[i], panEase(prog(t, a, b)));
  }
  // Légère dérive pendant les plans fixes : l'image respire
  return x + 14 * Math.sin((t - T.line) * 0.6);
}

export function toScreen(wx, wy) {
  return [wx - camX(currentT) + W / 2, wy];
}
let currentT = 0;

function simulateSway() {
  // Ressort amorti piloté par l'accélération de la caméra (inertie des feuilles)
  const hz = 240, t0 = T.line - 0.5, t1 = T.map + 0.2;
  const n = Math.ceil((t1 - t0) * hz);
  const out = ITEMS.map(() => new Float32Array(n + 1));
  const st = ITEMS.map((_, i) => ({ th: 0, v: 0, w: 2 * Math.PI * (0.82 + 0.07 * (i % 3)), z: 0.16 + 0.03 * (i % 2) }));
  const acc = (t) => {
    const h = 1 / hz;
    return (camX(t + h) - 2 * camX(t) + camX(t - h)) / (h * h);
  };
  for (let f = 0; f <= n; f++) {
    const t = t0 + f / hz;
    const a = acc(t);
    st.forEach((s, i) => {
      const k = 0.95e-4; // panoramiques plus courts : accélérations plus fortes, gain réduit d'autant
      const ddth = -s.w * s.w * s.th - 2 * s.z * s.w * s.v - k * a;
      s.v += ddth / hz;
      s.th += s.v / hz;
      out[i][f] = s.th;
    });
  }
  return (i, t) => {
    const f = Math.max(0, Math.min(n, Math.round((t - t0) * hz)));
    return (out[i][f] * 180) / Math.PI;
  };
}

function clothespin(parent) {
  const s = svg('svg', { width: 30, height: 96, viewBox: '0 0 30 96', style: 'position:absolute;left:0;top:0;overflow:visible' }, parent);
  const defs = svg('defs', {}, s);
  const gr = svg('linearGradient', { id: 'wood' + Math.random().toString(36).slice(2, 7), x1: 0, x2: 1 }, defs);
  svg('stop', { offset: 0, 'stop-color': '#c9a476' }, gr);
  svg('stop', { offset: 0.5, 'stop-color': '#e2c79f' }, gr);
  svg('stop', { offset: 1, 'stop-color': '#bf9a6c' }, gr);
  const id = gr.getAttribute('id');
  svg('ellipse', { cx: 17, cy: 92, rx: 12, ry: 4, fill: 'rgba(0,0,0,0.35)' }, s);
  svg('rect', { x: 3, y: 0, width: 11, height: 92, rx: 4, fill: `url(#${id})` }, s);
  svg('rect', { x: 16, y: 0, width: 11, height: 92, rx: 4, fill: `url(#${id})` }, s);
  svg('path', { d: 'M5 12 L5 80 M24 16 L24 76', stroke: 'rgba(120,85,45,0.25)', 'stroke-width': 1 }, s);
  svg('rect', { x: 1, y: 40, width: 28, height: 9, rx: 3, fill: '#9aa3a0' }, s);
  svg('rect', { x: 1, y: 40, width: 28, height: 3, rx: 1.5, fill: '#d7dedb' }, s);
  return s;
}

export function build(ctx) {
  paper = paperTexture();
  worldX = ITEMS.map((_, i) => i * L.spacing);
  back = el('div', { cls: 'abs' }, ctx.layers.worldBack);
  front = el('div', { cls: 'abs' }, ctx.layers.worldFront);

  ITEMS.forEach((it, i) => {
    it.x = worldX[i];
    it.w = SW;
    it.el = el('div', { cls: 'abs' }, back);
    if (it.h > 0) {
      it.sheet = el('div', { cls: 'sheet', style: { width: SW + 'px', height: it.h + 'px', backgroundImage: `url(${paper})` } }, it.el);
    }
    it.pins = it.h > 0 ? [-0.34, 0.34].map(() => clothespin(front)) : [];
    it.mod.build(it, ctx, { paper, sheetTop: L.lineY + PIN_DY - pick(8, 6) });
  });

  // Titres (fixes à l'écran, au-dessus de la corde)
  headRoot = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  heads = [];
  ITEMS.forEach((it) => {
    for (const [h, tin, tout] of [[it.head, it.t, null], [it.head2, it.head2?.at, null]]) {
      if (!h) continue;
      heads.push(mkHead(h, tin));
    }
  });
  // Instants de sortie : chaque titre sort quand le suivant entre
  heads.forEach((h, i) => (h.tout = i + 1 < heads.length ? heads[i + 1].tin : T.map));

  sway = simulateSway();
}

function mkHead(h, tin) {
  const root = el('div', { cls: 'abs' }, headRoot);
  const row = el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: pick('28px', '20px') } }, root);
  let num = null;
  if (h.num) {
    const nw = el('div', { cls: 'mask display light', style: { fontSize: L.numSize + 'px', color: 'var(--mint)', lineHeight: '0.8', marginTop: pick('-2px', '-1px') } }, row);
    num = { wrap: nw, inner: el('span', { text: h.num }, nw) };
  }
  const col = el('div', {}, row);
  const lines = h.lines.map((s) => {
    const w = el('div', { cls: 'mask display', style: { fontSize: (h.num ? L.headSize : Math.round(L.headSize * 0.98)) + 'px', marginBottom: '4px' } }, col);
    return { wrap: w, inner: el('span', { html: s }, w) };
  });
  return { root, num, lines, tin };
}

export function update(t, ctx) {
  currentT = t;
  const on = t >= T.line && t < T.map;
  show(back, on); show(front, on); show(headRoot, on);
  if (!on) {
    ITEMS.forEach((it) => it.mod.off?.(it));
    return;
  }
  const cx = camX(t);
  const sx = (wx) => wx - cx + W / 2;

  // La corde à linge : creux sous chaque paire de pinces, plus tendue entre les objets
  const pts = [[-200, L.lineY - 4]];
  ITEMS.forEach((it, i) => {
    const hw = it.h > 0 ? SW * K * 0.34 : 0;
    const dy = it.h > 0 ? PIN_DY : PIN_DY * 0.6;
    if (hw > 0) { pts.push([sx(it.x - hw), L.lineY + dy]); pts.push([sx(it.x + hw), L.lineY + dy]); }
    else pts.push([sx(it.x), L.lineY + dy]);
    if (i < ITEMS.length - 1) pts.push([sx((it.x + ITEMS[i + 1].x) / 2), L.lineY]);
  });
  pts.push([W + 200, L.lineY - 4]);
  const vis = pts.filter((p, i) => p[0] > -L.spacing * 1.2 && p[0] < W + L.spacing * 1.2);
  ctx.cord.draw(spline(vis, 8), { width: CW, phase: cx * 0.0 });

  // Objets
  ITEMS.forEach((it, i) => {
    const x = sx(it.x);
    const near = x > -SW && x < W + SW;
    show(it.el, near);
    it.pins.forEach((p) => show(p, near));
    if (!near) {
      it.mod.off?.(it);
      return;
    }
    const drop = i === 0 ? E.soft(prog(t, T.line, T.line + 0.55)) : 1;
    const th = sway(i, t) + (i === 0 ? (1 - drop) * -6 : 0);
    const top = L.lineY + PIN_DY - pick(8, 6) - (1 - drop) * pick(760, 520);
    it.screen = { x, top, th, k: K };
    if (it.sheet) {
      it.el.style.transform = `translate3d(${(x - (SW * K) / 2).toFixed(2)}px,${top.toFixed(2)}px,0) rotate(${th.toFixed(3)}deg) scale(${K})`;
      it.el.style.transformOrigin = '0 0';
      it.pins.forEach((p, k) => {
        const px = x + (k ? 1 : -1) * SW * K * 0.34;
        p.style.transform = `translate3d(${(px - 15).toFixed(2)}px,${(L.lineY + PIN_DY - 40 - (1 - drop) * pick(760, 520)).toFixed(2)}px,0) rotate(${(th * 0.6 + (k ? 3 : -2)).toFixed(2)}deg)`;
      });
    }
    it.mod.update(it, t - it.t, t, ctx);
  });

  // Titres
  heads.forEach((h) => {
    const vis2 = t >= h.tin - 0.05 && t < h.tout + 0.05;
    show(h.root, vis2);
    if (!vis2) return;
    const parts = (h.num ? [h.num] : []).concat(h.lines);
    parts.forEach((ln, k) => {
      const t0 = h.tin + 0.02 + k * 0.08;
      const p = E.enter(prog(t, t0, t0 + 0.7));
      const q = E.exit(prog(t, h.tout - 0.34 + k * 0.035, h.tout - 0.04 + k * 0.035));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    });
  });
}
