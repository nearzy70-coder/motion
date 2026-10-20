// 7. Couverture : la corde relie les villes où Desk to Desk a une page de recherche dédiée.
// Positions réelles (latitude / longitude), projection équirectangulaire, graticule de cartographe.
import { el, svg, show, op } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { spline, lengths, slice } from '../lib/path.js';
import { T, L, W, H, pick } from '../timeline.js';
import { blindY } from './free.js';

const CITIES = [
  ['Bordeaux', 44.838, -0.579, 'r'],
  ['Paris', 48.857, 2.352, 'l'],
  ['Lille', 50.629, 3.057, 'l'],
  ['Bruxelles', 50.85, 4.352, 'r'],
  ['Luxembourg', 49.611, 6.13, 'r'],
  ['Lyon', 45.764, 4.836, 'r'],
  ['Barcelone', 41.385, 2.173, 'r'],
];
const BOX = pick({ x0: 150, x1: 930, y0: 530, y1: 1500 }, { x0: 380, x1: 820, y0: 90, y1: 1010 });
const CW = pick(10, 8);
const T0 = T.map + 0.25, T1 = T.free - 0.75;

let root, gsvg, cityEls, route, Lr, arrive, head, heads, headH;

export function build(ctx) {
  const lat0 = 46.2, lon0 = 2.8, kx = Math.cos((46 * Math.PI) / 180);
  const latMin = 40.9, latMax = 51.3;
  const unit = Math.min((BOX.y1 - BOX.y0) / (latMax - latMin), (BOX.x1 - BOX.x0) / (9.5 * kx));
  const cx = (BOX.x0 + BOX.x1) / 2, cy = (BOX.y0 + BOX.y1) / 2;
  const P = (lat, lon) => [cx + (lon - lon0) * kx * unit, cy - (lat - (latMin + latMax) / 2) * unit];

  root = el('div', { cls: 'layer' }, ctx.layers.worldBack);
  gsvg = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0' }, root);
  // Graticule tous les 2°
  // En carré, la grille commence sous le titre et les longitudes sont graduées en bas
  const topY = pick(-1e9, 250);
  for (let lon = -4; lon <= 10; lon += 2) {
    const a = P(latMin - 1, lon), b = P(latMax + 1, lon);
    svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: Math.max(b[1], topY), stroke: 'rgba(255,255,255,0.09)', 'stroke-width': 1 }, gsvg);
    const ly = pick(P(latMax, lon)[1] - 8, P(latMin, lon)[1] + 26);
    const t = svg('text', { x: b[0] + 6, y: ly, 'font-family': 'Noto Sans', 'font-size': pick(16, 14), fill: 'rgba(255,255,255,0.32)' }, gsvg);
    t.textContent = `${Math.abs(lon)}°${lon < 0 ? 'O' : 'E'}`;
  }
  for (let lat = 40; lat <= 52; lat += 2) {
    const a = P(lat, -6), b = P(lat, 12);
    if (a[1] < topY) continue;
    svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(255,255,255,0.09)', 'stroke-width': 1 }, gsvg);
    const t = svg('text', { x: Math.max(BOX.x0 - 40, 20), y: a[1] - 6, 'font-family': 'Noto Sans', 'font-size': pick(16, 14), fill: 'rgba(255,255,255,0.32)' }, gsvg);
    t.textContent = `${lat}°N`;
  }

  // Itinéraire : arcs doux d'une ville à l'autre
  const pts = CITIES.map(([, la, lo]) => P(la, lo));
  const ctrl = [];
  pts.forEach((p, i) => {
    if (i > 0) {
      const q = pts[i - 1];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy);
      const bow = (i % 2 ? 1 : -1) * Math.min(60, l * 0.18);
      ctrl.push([mx - (dy / l) * bow, my + (dx / l) * bow]);
    }
    ctrl.push(p);
  });
  route = spline(ctrl, 5);
  Lr = lengths(route);
  // Instant d'arrivée sur chaque ville (proportionnel à la distance parcourue)
  const cityS = pts.map((p) => {
    let best = 0, bd = 1e9;
    route.forEach((q, k) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = k; } });
    return Lr[best];
  });
  arrive = cityS.map((s) => lerp(T0, T1, s / Lr[Lr.length - 1]));
  ctx.shared.cues = { ...(ctx.shared.cues || {}), cities: arrive.map((t, i) => ({ name: CITIES[i][0], t })) };

  cityEls = CITIES.map(([name, la, lo, side], i) => {
    const [x, y] = P(la, lo);
    const g = el('div', { cls: 'abs' }, root);
    const dot = el('div', { cls: 'abs', style: { left: '-11px', top: '-11px', width: '22px', height: '22px', borderRadius: '50%', background: '#FAFAF6', boxShadow: '0 0 0 4px #111, 0 0 0 7px #2ACAA5' } }, g);
    const lab = el('div', { cls: 'abs', text: name, style: { fontSize: pick('34px', '27px'), fontWeight: '700', whiteSpace: 'nowrap', top: '-22px', [side === 'l' ? 'right' : 'left']: '22px', left: side === 'l' ? 'auto' : '22px' } }, g);
    g.style.transform = `translate(${x}px, ${y}px)`;
    return { g, dot, lab, t: arrive[i] };
  });

  head = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  heads = ['En France', 'et en Europe.'].map((s) => {
    const w = el('div', { cls: 'mask display', style: { fontSize: Math.round(L.headSize * 1.12) + 'px', marginBottom: '4px' } }, head);
    return { wrap: w, inner: el('span', { text: s }, w) };
  });
  headH = head.offsetHeight;
}

export function update(t, ctx) {
  const on = t >= T.map && t < T.free + 0.8;
  show(root, on); show(head, on);
  if (!on) return;
  op(gsvg, prog(t, T.map, T.map + 0.4));
  const h = lerp(0, Lr[Lr.length - 1], E.inOutCubic(prog(t, T0 - 0.05, T1)));
  // Le store menthe recouvre la carte : on ne dessine la corde qu'au-dessus de lui
  const by = t >= T.free ? blindY(t) : H + 100;
  if (h > 2) {
    const g = ctx.cord.g;
    g.save();
    g.beginPath(); g.rect(0, 0, W, by); g.clip();
    ctx.cord.draw(slice(route, Lr, 0, h), { width: CW });
    g.restore();
  }
  head.style.clipPath = `inset(0 0 ${Math.max(0, L.headY + headH - by).toFixed(1)}px 0)`;
  cityEls.forEach((c) => {
    const a = E.soft(prog(t, c.t - 0.05, c.t + 0.3));
    c.dot.style.transform = `scale(${Math.max(0.001, a).toFixed(4)})`;
    op(c.lab, prog(t, c.t, c.t + 0.25));
    c.lab.style.transform = `translateY(${((1 - E.enter(prog(t, c.t, c.t + 0.5))) * 12).toFixed(2)}px)`;
  });
  heads.forEach((ln, i) => {
    const t0 = T.map + 0.05 + i * 0.1;
    const p = E.enter(prog(t, t0, t0 + 0.7));
    ln.inner.style.transform = `translate3d(0,${((1 - p) * 135).toFixed(2)}%,0)`;
  });
}
