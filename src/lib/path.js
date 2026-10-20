// Géométrie des tracés : échantillonnage, longueurs, sous-tracés, morphing.

export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function lengths(pts) {
  const L = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) L[i] = L[i - 1] + dist(pts[i - 1], pts[i]);
  return L;
}

// Point à l'abscisse curviligne s (en px) d'une polyligne
export function pointAt(pts, L, s) {
  const total = L[L.length - 1];
  s = Math.max(0, Math.min(total, s));
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L[m] < s) lo = m; else hi = m;
  }
  const seg = L[hi] - L[lo] || 1;
  const u = (s - L[lo]) / seg;
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * u, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * u];
}

// Ré-échantillonne une polyligne en n points équidistants
export function resample(pts, n) {
  const L = lengths(pts);
  const total = L[L.length - 1];
  const out = [];
  for (let i = 0; i < n; i++) out.push(pointAt(pts, L, (total * i) / (n - 1)));
  return out;
}

// Portion [s0, s1] (en px) d'une polyligne, avec ses extrémités exactes
export function slice(pts, L, s0, s1) {
  if (s1 <= s0) return [];
  const out = [pointAt(pts, L, s0)];
  for (let i = 0; i < pts.length; i++) if (L[i] > s0 && L[i] < s1) out.push(pts[i]);
  out.push(pointAt(pts, L, s1));
  return out;
}

// Catmull-Rom centripète → polyligne dense
export function spline(ctrl, step = 6, closed = false) {
  const P = closed ? [ctrl[ctrl.length - 1], ...ctrl, ctrl[0], ctrl[1]] : [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const d = Math.max(1, dist(p1, p2));
    const n = Math.max(2, Math.ceil(d / step));
    const t01 = Math.pow(dist(p0, p1) || 1e-3, 0.5);
    const t12 = Math.pow(d, 0.5);
    const t23 = Math.pow(dist(p2, p3) || 1e-3, 0.5);
    const m1 = [0, 1].map((k) => (p2[k] - p1[k] + t12 * ((p1[k] - p0[k]) / t01 - (p2[k] - p0[k]) / (t01 + t12)))) ;
    const m2 = [0, 1].map((k) => (p2[k] - p1[k] + t12 * ((p3[k] - p2[k]) / t23 - (p3[k] - p1[k]) / (t12 + t23))));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([0, 1].map((k) => h00 * p1[k] + h10 * m1[k] + h01 * p2[k] + h11 * m2[k]));
    }
  }
  out.push(closed ? [...ctrl[0]] : [...ctrl[ctrl.length - 1]]);
  return out;
}

// Rectangle arrondi (périmètre) départ au point haut-gauche après le rayon, sens horaire
export function roundRect(x, y, w, h, r, step = 4) {
  const pts = [];
  const arc = (cx, cy, a0, a1) => {
    const n = Math.max(4, Math.ceil((Math.abs(a1 - a0) * r) / step));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  line(x, y + r + 40, x, y + r); // départ légèrement sous le coin, côté gauche
  arc(x + r, y + r, Math.PI, Math.PI * 1.5);
  line(x + r, y, x + w - r, y);
  arc(x + w - r, y + r, -Math.PI / 2, 0);
  line(x + w, y + r, x + w, y + h - r);
  arc(x + w - r, y + h - r, 0, Math.PI / 2);
  line(x + w - r, y + h, x + r, y + h);
  arc(x + r, y + h - r, Math.PI / 2, Math.PI);
  line(x, y + h - r, x, y + r + 40);
  return pts;
}

export function lineTo(a, b, step = 4) {
  const n = Math.max(1, Math.ceil(dist(a, b) / step));
  const out = [];
  for (let i = 0; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  return out;
}

export function concat(...parts) {
  const out = [];
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) {
      if (out.length && i === 0 && dist(out[out.length - 1], p[0]) < 0.01) continue;
      out.push(p[i]);
    }
  }
  return out;
}

export function toD(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  return d;
}

// Tracé partiel d'une polyligne préparée : {pts, L}
export function prepared(pts) {
  return { pts, L: lengths(pts), get total() { return this.L[this.L.length - 1]; } };
}
export function partial(p, f0, f1) {
  const T = p.total;
  return slice(p.pts, p.L, f0 * T, f1 * T);
}
