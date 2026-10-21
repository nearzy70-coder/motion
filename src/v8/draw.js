// Dessin du plan (Canvas 2D) : caméra, trame de points, murs, bureaux, cotes, feuilles d'annonces, pictogrammes.
// Unités du monde : 1 unité = 1 px à l'échelle 1. Tout est dessiné à neuf à chaque image, en fonction du temps.
import { C, W, H } from './timeline.js';
import { rng, clamp, lerp } from '../lib/ease.js';

export const FONT_D = 'Parkinsans';
export const FONT_T = '"Noto Sans"';

// ------------------------------------------------------------------ caméra
export const cam = { x: 0, y: 0, z: 1, r: 0 };
export function applyCam(g) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(W / 2, H / 2);
  g.rotate(cam.r);
  g.scale(cam.z, cam.z);
  g.translate(-cam.x, -cam.y);
}
export const px = (n) => n / cam.z;   // épaisseur constante à l'écran
export function toScreen(x, y) {
  const dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z;
  const c = Math.cos(cam.r), s = Math.sin(cam.r);
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}

// Trame de points du papier : deux niveaux de pas fondus l'un dans l'autre selon le zoom (effet « toile infinie »)
export function dotGrid(g, alpha = 1) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const f = Math.log2(52 / (40 * cam.z));
  const k = Math.floor(f), frac = f - k;
  const c = Math.cos(cam.r), s = Math.sin(cam.r);
  for (const [lev, a] of [[k, 1 - frac], [k + 1, frac]]) {
    if (a < 0.02) continue;
    const step = 40 * Math.pow(2, lev);
    const R = (Math.hypot(W, H) / 2) / cam.z + step;
    const x0 = Math.floor((cam.x - R) / step) * step, y0 = Math.floor((cam.y - R) / step) * step;
    g.fillStyle = C.grid;
    g.globalAlpha = a * alpha;
    const d = 2.6;
    for (let x = x0; x < cam.x + R; x += step) {
      for (let y = y0; y < cam.y + R; y += step) {
        const dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z;
        const sx = W / 2 + dx * c - dy * s, sy = H / 2 + dx * s + dy * c;
        if (sx > -4 && sx < W + 4 && sy > -4 && sy < H + 4) g.fillRect(sx - d / 2, sy - d / 2, d, d);
      }
    }
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ outils
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
export function withT(g, x, y, a = 0, s = 1, fn) {
  g.save();
  g.translate(x, y);
  if (a) g.rotate(a);
  if (s !== 1) g.scale(s, s);
  fn();
  g.restore();
}
export function text(g, s, x, y, size, o = {}) {
  g.font = `${o.weight ?? 600} ${size}px ${o.font ?? FONT_D}`;
  g.fillStyle = o.color ?? C.ink;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = o.base ?? 'alphabetic';
  if (o.spacing) g.letterSpacing = o.spacing + 'px';
  g.fillText(s, x, y);
  if (o.spacing) g.letterSpacing = '0px';
}
// Polyligne partielle (proportion u de sa longueur)
export function partial(pts, u) {
  if (u >= 1) return pts;
  if (u <= 0) return [pts[0]];
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const s = L[L.length - 1] * u;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= s) { out.push(pts[i]); continue; }
    const k = (s - L[i - 1]) / (L[i] - L[i - 1] || 1);
    out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]);
    break;
  }
  return out;
}
export function poly(g, pts, close = false) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (close) g.closePath();
}

// ------------------------------------------------------------------ mobilier et personnes (vue de dessus)
// Bureau : plateau arrondi, écran, chaise ; « who » : personne assise (point plein)
export function desk(g, x, y, a = 0, o = {}) {
  const s = o.s ?? 1;
  if (s <= 0.001) return;
  const a0 = g.globalAlpha;
  withT(g, x, y, a, s, () => {
    g.globalAlpha = a0 * (o.alpha ?? 1);
    const ink = o.ink ?? C.ink;
    g.lineWidth = 2.4;
    g.strokeStyle = ink;
    g.fillStyle = o.fill ?? '#FFFFFF';
    rrect(g, -36, -20, 72, 40, 5); g.fill(); g.stroke();
    g.fillStyle = o.screen ?? ink;
    rrect(g, -15, -15, 30, 5, 2); g.fill();
    if (o.chair !== false) {
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.arc(0, 34, 12, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    if (o.who) {
      g.fillStyle = o.who === true ? ink : o.who;
      g.beginPath(); g.arc(0, 34, 8.5, 0, Math.PI * 2); g.fill();
    }
  });
  g.globalAlpha = a0;
}
// Îlot de quatre bureaux face à face
export function cluster(g, x, y, a, o = {}) {
  withT(g, x, y, a, o.s ?? 1, () => {
    for (const [dx, dy, r] of [[-37, -20, 0], [37, -20, 0], [-37, 20, Math.PI], [37, 20, Math.PI]]) desk(g, dx, dy, r, { ...o, s: 1 });
  });
}
// « Vous » : un point d'encre ; Desk to Desk l'entoure d'un anneau menthe
export function you(g, x, y, o = {}) {
  const r = (o.r ?? 15) * (o.s ?? 1);
  if (r <= 0.05) return;
  g.fillStyle = o.color ?? C.ink;
  g.beginPath(); g.ellipse(x, y, r * (o.sx ?? 1), r * (o.sy ?? 1), 0, 0, Math.PI * 2); g.fill();
  if (o.ring > 0) {
    g.strokeStyle = C.mint;
    g.lineWidth = o.ringW ?? 6;
    g.beginPath(); g.arc(x, y, r + 11 + (o.ringGap ?? 0), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, o.ring)); g.stroke();
  }
}

// ------------------------------------------------------------------ murs
// Pièce rectangulaire : murs pleins (poché) ; porte optionnelle { side: 'b'|'t'|'l'|'r', at: 0..1, w, open: 0..1 }
// wallP : progression de tracé de chaque mur [haut, droite, bas, gauche] (0..1) ; wallFill : couleur par mur
export function room(g, x, y, w, h, th, o = {}) {
  const P = o.wallP ?? [1, 1, 1, 1];
  const F = o.wallFill ?? [];
  const d = o.door;
  const segs = [
    ['t', [x - w / 2, y - h / 2], [x + w / 2, y - h / 2]],
    ['r', [x + w / 2, y - h / 2], [x + w / 2, y + h / 2]],
    ['b', [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]],
    ['l', [x - w / 2, y + h / 2], [x - w / 2, y - h / 2]],
  ];
  segs.forEach(([side, a, b], i) => {
    const p = clamp(P[i]);
    if (p <= 0) return;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    let spans = [[0, len]];
    if (d && d.side === side) {
      const c = d.at * len, hw = d.w / 2;
      spans = [[0, c - hw], [c + hw, len]];
    }
    g.fillStyle = F[i] ?? o.color ?? C.ink;
    for (const [s0, s1] of spans) {
      const e = Math.min(s1, len * p);
      if (e <= s0) continue;
      // Mur prolongé de th/2 aux angles pour des jonctions nettes
      const a0 = s0 === 0 ? -th / 2 : s0, a1 = e === len ? len + th / 2 : e;
      const nx = -uy, ny = ux;
      g.beginPath();
      g.moveTo(a[0] + ux * a0 + nx * th / 2, a[1] + uy * a0 + ny * th / 2);
      g.lineTo(a[0] + ux * a1 + nx * th / 2, a[1] + uy * a1 + ny * th / 2);
      g.lineTo(a[0] + ux * a1 - nx * th / 2, a[1] + uy * a1 - ny * th / 2);
      g.lineTo(a[0] + ux * a0 - nx * th / 2, a[1] + uy * a0 - ny * th / 2);
      g.closePath();
      g.fill();
    }
    if (d && d.side === side && p >= d.at) {
      // Battant et arc d'ouverture
      const c = d.at * len, hw = d.w / 2;
      const hx = a[0] + ux * (c - hw), hy = a[1] + uy * (c - hw);
      const inward = d.inward ?? 1;
      const nx = -uy * inward, ny = ux * inward;
      const base = Math.atan2(uy, ux), open = (d.open ?? 1) * (Math.PI / 2) * inward;
      g.strokeStyle = o.color ?? C.ink;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + Math.cos(base + open) * d.w, hy + Math.sin(base + open) * d.w);
      g.stroke();
      g.lineWidth = 1.2;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.arc(hx, hy, d.w, Math.min(base, base + open), Math.max(base, base + open));
      g.stroke();
      g.setLineDash([]);
      void nx; void ny;
    }
  });
}

// ------------------------------------------------------------------ cotes
// Ligne de cote entre a et b, décalée de off ; libellé au milieu (mot au lieu d'une mesure)
export function dim(g, a, b, off, label, o = {}) {
  const p = clamp(o.p ?? 1);
  if (p <= 0) return;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const nx = -uy, ny = ux;
  const A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off];
  const col = o.color ?? C.ink;
  g.strokeStyle = col;
  g.lineWidth = o.lw ?? 2;
  // lignes d'attache
  g.globalAlpha = (o.alpha ?? 1) * Math.min(1, p * 3);
  g.beginPath();
  g.moveTo(a[0] + nx * off * 0.25, a[1] + ny * off * 0.25); g.lineTo(A[0] + nx * 10 * Math.sign(off), A[1] + ny * 10 * Math.sign(off));
  g.moveTo(b[0] + nx * off * 0.25, b[1] + ny * off * 0.25); g.lineTo(B[0] + nx * 10 * Math.sign(off), B[1] + ny * 10 * Math.sign(off));
  g.stroke();
  // ligne de cote, tracée depuis le centre
  const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const h = (len / 2) * p;
  g.beginPath();
  g.moveTo(m[0] - ux * h, m[1] - uy * h); g.lineTo(m[0] + ux * h, m[1] + uy * h);
  g.stroke();
  if (p > 0.98) {
    g.lineWidth = (o.lw ?? 2) * 1.3;
    for (const P of [A, B]) {
      g.beginPath();
      g.moveTo(P[0] - (ux + nx) * 9, P[1] - (uy + ny) * 9); g.lineTo(P[0] + (ux + nx) * 9, P[1] + (uy + ny) * 9);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  if (label && o.labelP > 0) {
    const lp = clamp(o.labelP);
    g.globalAlpha = (o.alpha ?? 1) * lp;
    const lx = m[0] + nx * (o.labelOff ?? 26) * Math.sign(off), ly = m[1] + ny * (o.labelOff ?? 26) * Math.sign(off);
    let ang = Math.atan2(uy, ux);
    if (o.upright) ang = 0;
    else if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    withT(g, lx, ly + (1 - lp) * 8, ang, 1, () => {
      text(g, label, 0, 0, o.size ?? 30, { align: 'center', base: 'middle', color: o.labelColor ?? col, weight: 600 });
    });
    g.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ feuilles d'annonces (mini-plans)
const PLANS = new Map();
function planOf(seed) {
  if (PLANS.has(seed)) return PLANS.get(seed);
  const R = rng(seed * 7919 + 13);
  const p = { parts: [], desks: [], door: R() };
  // cloisons intérieures (fractions de la largeur/hauteur)
  const n = 1 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    if (R() < 0.5) p.parts.push(['v', 0.25 + R() * 0.5, R() < 0.5 ? [0, 0.55 + R() * 0.3] : [0.35 + R() * 0.2, 1]]);
    else p.parts.push(['h', 0.3 + R() * 0.4, R() < 0.5 ? [0, 0.5 + R() * 0.3] : [0.4 + R() * 0.2, 1]]);
  }
  const m = 2 + Math.floor(R() * 5);
  for (let i = 0; i < m; i++) p.desks.push([0.15 + R() * 0.7, 0.2 + R() * 0.6, R() < 0.5 ? 0 : Math.PI / 2]);
  p.shape = R() < 0.35 ? 'L' : 'R';
  p.cut = [0.45 + R() * 0.25, 0.4 + R() * 0.3];
  PLANS.set(seed, p);
  return p;
}
// Contour d'un plateau (rectangle ou en L) dans la boîte [0..w]×[0..h]
export function footprint(seed, w, h) {
  const p = planOf(seed);
  if (p.shape === 'R') return [[0, 0], [w, 0], [w, h], [0, h]];
  const cx = w * p.cut[0], cy = h * p.cut[1];
  return [[0, 0], [w, 0], [w, cy], [cx, cy], [cx, h], [0, h]];
}
// Mini-plan seul (contour épais, cloisons, bureaux)
export function miniPlan(g, seed, x, y, w, h, o = {}) {
  const p = planOf(seed);
  const ink = o.ink ?? C.ink;
  const fp = footprint(seed, w, h).map(([a, b]) => [x + a, y + b]);
  if (o.fill) { g.fillStyle = o.fill; poly(g, fp, true); g.fill(); }
  g.strokeStyle = ink;
  g.lineWidth = o.wall ?? 6;
  g.lineJoin = 'miter';
  poly(g, fp, true); g.stroke();
  g.lineWidth = (o.wall ?? 6) * 0.45;
  for (const [k, f, [a, b]] of p.parts) {
    g.beginPath();
    if (k === 'v') { g.moveTo(x + w * f, y + h * a); g.lineTo(x + w * f, y + h * b); }
    else { g.moveTo(x + w * a, y + h * f); g.lineTo(x + w * b, y + h * f); }
    g.stroke();
  }
  if (o.desks !== false) {
    const ds = Math.min(w, h) / 9;
    g.lineWidth = Math.max(1, ds * 0.12);
    for (const [fx, fy, a] of p.desks) {
      if (p.shape === 'L' && fx > p.cut[0] && fy > p.cut[1]) continue;
      withT(g, x + w * fx, y + h * fy, a, 1, () => { g.strokeStyle = ink; g.strokeRect(-ds, -ds * 0.55, ds * 2, ds * 1.1); });
    }
  }
}
// Feuille d'annonce : papier blanc ombré, mini-plan, lignes de texte grises
export function sheet(g, x, y, w, h, seed, o = {}) {
  const s = o.s ?? 1;
  if (s <= 0.001) return;
  const a0 = g.globalAlpha;
  withT(g, x, y, o.a ?? 0, s, () => {
    g.globalAlpha = a0 * (o.alpha ?? 1);
    g.save();
    g.shadowColor = 'rgba(17,17,17,0.16)';
    g.shadowBlur = 26 * cam.z;
    g.shadowOffsetY = 10 * cam.z;
    g.fillStyle = '#FFFFFF';
    g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
    if (o.outline) { g.strokeStyle = o.outline; g.lineWidth = o.outlineW ?? 6; g.strokeRect(-w / 2, -h / 2, w, h); }
    const pad = w * 0.1;
    const ph = h * 0.58;
    miniPlan(g, seed, -w / 2 + pad, -h / 2 + pad, w - 2 * pad, ph - pad, { ink: o.ink ?? C.ink, wall: Math.max(3, w * 0.022), fill: o.planFill });
    g.fillStyle = '#E3E3DC';
    const R = rng(seed + 101);
    for (let i = 0; i < 3; i++) g.fillRect(-w / 2 + pad, -h / 2 + ph + pad * 0.4 + i * h * 0.085, (w - 2 * pad) * (i === 0 ? 0.75 : 0.45 + R() * 0.4), h * 0.035);
    if (o.tick > 0) {
      g.strokeStyle = C.mint; g.lineWidth = w * 0.03; g.lineCap = 'round'; g.lineJoin = 'round';
      const k = clamp(o.tick);
      poly(g, partial([[w / 2 - pad * 2.4, h / 2 - pad * 1.2], [w / 2 - pad * 1.8, h / 2 - pad * 0.6], [w / 2 - pad * 0.7, h / 2 - pad * 1.9]], k));
      g.stroke(); g.lineCap = 'butt';
    }
  });
  g.globalAlpha = a0;
}

// ------------------------------------------------------------------ pictogrammes
export function pin(g, x, y, s = 1, color = C.mint) {
  if (s <= 0.001) return;
  withT(g, x, y, 0, s, () => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-10, -16, -26, -30, -26, -50);
    g.arc(0, -50, 26, Math.PI, 0);
    g.bezierCurveTo(26, -30, 10, -16, 0, 0);
    g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(0, -50, 10, 0, Math.PI * 2); g.fill();
  });
}
export function magnifier(g, x, y, r, o = {}) {
  g.strokeStyle = o.color ?? C.mint;
  g.lineWidth = o.lw ?? r * 0.16;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.lineCap = 'round';
  g.lineWidth = (o.lw ?? r * 0.16) * 1.5;
  g.beginPath(); g.moveTo(x + r * 0.72, y + r * 0.72); g.lineTo(x + r * 1.45, y + r * 1.45); g.stroke();
  g.lineCap = 'butt';
}
// Contrat : feuille, titre, lignes ; « hi » : lignes surlignées en menthe
export function contract(g, x, y, w, h, o = {}) {
  const s = o.s ?? 1;
  if (s <= 0.001) return;
  withT(g, x, y, o.a ?? 0, s, () => {
    g.save();
    g.shadowColor = 'rgba(17,17,17,0.16)'; g.shadowBlur = 30 * cam.z; g.shadowOffsetY = 12 * cam.z;
    g.fillStyle = '#FFFFFF'; g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
    const pad = w * 0.1;
    g.fillStyle = C.ink;
    g.fillRect(-w / 2 + pad, -h / 2 + pad, w * 0.45, h * 0.035);
    const n = o.lines ?? 14, lh = (h - pad * 3.2) / n;
    const R = rng(o.seed ?? 5);
    const scroll = o.scroll ?? 0;
    g.save();
    g.beginPath(); g.rect(-w / 2, -h / 2 + pad * 2.2, w, h - pad * 2.8); g.clip();
    for (let i = -2; i < n + 2; i++) {
      const k = i + Math.floor(scroll);
      const yy = -h / 2 + pad * 2.4 + (i - (scroll % 1)) * lh;
      const lw = (w - 2 * pad) * (0.55 + 0.45 * rng(k * 31 + 7)());
      const hi = o.hi && o.hi(k);
      if (hi) { g.fillStyle = 'rgba(42,202,165,' + (0.4 * hi).toFixed(3) + ')'; g.fillRect(-w / 2 + pad - 6, yy - lh * 0.22, lw * Math.min(1, hi * 1.2) + 12, lh * 0.62); }
      g.fillStyle = o.lineColor ?? '#CFCFC8';
      g.fillRect(-w / 2 + pad, yy, lw, lh * 0.2);
    }
    void R;
    g.restore();
  });
}
export function arrowHead(g, x, y, ang, size, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + Math.cos(ang) * size, y + Math.sin(ang) * size);
  g.lineTo(x + Math.cos(ang + 2.5) * size, y + Math.sin(ang + 2.5) * size);
  g.lineTo(x + Math.cos(ang - 2.5) * size, y + Math.sin(ang - 2.5) * size);
  g.closePath();
  g.fill();
}
export function check(g, x, y, s, u = 1, color = C.mint, lw = 8) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  poly(g, partial([[x - 18 * s, y], [x - 5 * s, y + 13 * s], [x + 22 * s, y - 16 * s]], u));
  g.stroke();
  g.lineCap = 'butt';
}
