// Outils du « trait continu » : échantillonnage de tracés SVG, segments datés, boucles, caméra à ressort.
import { svg } from './dom.js';
import { E, prog, lerp } from './ease.js';
import { spline, lengths } from './path.js';

export const STEP = 4; // pas d'échantillonnage (monde)

let sampler = null;
// Tracé SVG (une seule commande M) → points, translatés, mis à l'échelle et tournés
export function sample(d, [ox, oy], s = 1, rot = 0) {
  if (!sampler) {
    const host = svg('svg', { width: 0, height: 0, style: 'position:absolute;left:-9999px' }, document.body);
    sampler = svg('path', {}, host);
  }
  sampler.setAttribute('d', d);
  const len = sampler.getTotalLength();
  const n = Math.max(2, Math.ceil((len * s) / STEP));
  const c = Math.cos(rot), si = Math.sin(rot);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const p = sampler.getPointAtLength((len * i) / n);
    pts.push([ox + (p.x * c - p.y * si) * s, oy + (p.x * si + p.y * c) * s]);
  }
  return pts;
}

export function line(A, B) {
  const n = Math.max(2, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => [lerp(A[0], B[0], i / n), lerp(A[1], B[1], i / n)]);
}

export function arc(c, r, a0, a1) {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = lerp(a0, a1, i / n);
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
}

export function resample(pts) {
  const Lo = lengths(pts);
  const tot = Lo[Lo.length - 1];
  const m = Math.max(2, Math.ceil(tot / STEP));
  const res = [];
  let k = 1;
  for (let i = 0; i <= m; i++) {
    const s = (tot * i) / m;
    while (k < Lo.length - 1 && Lo[k] < s) k++;
    const a = pts[k - 1], b = pts[k];
    const u = (s - Lo[k - 1]) / ((Lo[k] - Lo[k - 1]) || 1);
    res.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
  return res;
}

// Courbe lisse passant par des points de passage, rééchantillonnée
export function curve(way) {
  return resample(spline(way, 12));
}

// Trait qui file d'un point à l'autre en faisant des boucles (cycloïde allongée le long d'une courbe)
export function loopy(way, perPx, R) {
  const base = spline(way, 12);
  const Lb = lengths(base);
  const tot = Lb[Lb.length - 1];
  const n = Math.ceil(tot / 2.5);
  const out = [];
  let j = 1;
  for (let i = 0; i <= n; i++) {
    const s = (tot * i) / n;
    while (j < Lb.length - 1 && Lb[j] < s) j++;
    const a = base[j - 1], b = base[j];
    const u = (s - Lb[j - 1]) / ((Lb[j] - Lb[j - 1]) || 1);
    const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
    const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
    const tx = dx / dl, ty = dy / dl, nx = -ty, ny = tx;
    const env = Math.min(1, s / 260, (tot - s) / 260);
    const ang = 2 * Math.PI * perPx * s;
    const lx = -Math.sin(ang) * R * env, ly = (1 - Math.cos(ang)) * R * env;
    out.push([x + tx * lx + nx * ly, y + ty * lx + ny * ly]);
  }
  return resample(out);
}

export const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

// Un dessin d'un seul trait, segment par segment, chacun avec sa fenêtre de temps
export class Drawing {
  constructor() { this.segs = []; this.cur = null; }
  push(pts, t0, t1, ease = E.inOutCubic, kind = 'link') {
    if (this.cur) pts = [this.cur, ...pts.slice(1)];
    this.segs.push({ pts, t0, t1, ease, kind });
    this.cur = pts[pts.length - 1];
    return this.segs[this.segs.length - 1];
  }
  // Rejoint le début d'un tracé par un trait droit, puis le dessine
  to(pts, t0, t1, ease = sine, kind = 'icon', lead = 0.12) {
    if (this.cur) this.push(line(this.cur, pts[0]), t0 - lead, t0, E.inOutCubic);
    return this.push(pts, t0, t1, ease, kind);
  }
  build() {
    this.path = [];
    this.segs.forEach((sg) => {
      sg.i0 = this.path.length ? this.path.length - 1 : 0;
      this.path.push(...(this.path.length ? sg.pts.slice(1) : sg.pts));
      sg.i1 = this.path.length - 1;
    });
    this.Ls = lengths(this.path);
    this.total = this.Ls[this.Ls.length - 1];
    return this;
  }
  // Abscisse curviligne de la pointe à l'instant t
  headS(t) {
    let s = 0;
    for (const sg of this.segs) {
      if (t < sg.t0) break;
      const a = this.Ls[sg.i0], b = this.Ls[sg.i1];
      s = t >= sg.t1 ? b : lerp(a, b, sg.ease(prog(t, sg.t0, sg.t1)));
    }
    return s;
  }
  headPoint(t) {
    const s = this.headS(t);
    let lo = 0, hi = this.Ls.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.Ls[m] < s) lo = m; else hi = m; }
    return this.path[hi];
  }
  // Fenêtres où la plume avance (pour le son)
  pen() {
    return this.segs.filter((sg) => sg.t1 > sg.t0 + 0.05).map((sg) => ({ t0: +sg.t0.toFixed(3), t1: +sg.t1.toFixed(3), rush: sg.kind === 'rush' }));
  }
}

// Caméra : ressort critique précalculé (position ; zoom en logarithme), à pas fixe
export function springCamera(focus, tA, tB, { hz = 240, w = 9.5, wz = 7.5 } = {}) {
  const n = Math.ceil((tB - tA) * hz);
  const rec = new Float32Array((n + 1) * 3);
  const s = focus(tA).slice();
  const v = [0, 0, 0];
  for (let k = 0; k <= n; k++) {
    const f = focus(tA + k / hz);
    for (let c = 0; c < 3; c++) {
      const ww = c === 2 ? wz : w;
      const tgt = c === 2 ? Math.log(f[2]) : f[c];
      const x = c === 2 ? Math.log(s[2]) : s[c];
      v[c] += (ww * ww * (tgt - x) - 2 * ww * v[c]) / hz;
      const nx = x + v[c] / hz;
      s[c] = c === 2 ? Math.exp(nx) : nx;
    }
    rec[k * 3] = s[0]; rec[k * 3 + 1] = s[1]; rec[k * 3 + 2] = s[2];
  }
  return (t) => {
    const u = Math.max(0, Math.min(n, (t - tA) * hz));
    const k0 = Math.floor(u), k1 = Math.min(n, k0 + 1), a = u - k0;
    return [lerp(rec[k0 * 3], rec[k1 * 3], a), lerp(rec[k0 * 3 + 1], rec[k1 * 3 + 1], a), lerp(rec[k0 * 3 + 2], rec[k1 * 3 + 2], a)];
  };
}

// Trace une polyligne écran d'un trait plat (bouts et angles arrondis)
export function strokePts(g, pts, color, width) {
  if (pts.length < 2) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  g.restore();
}
