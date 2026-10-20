// Rendu d'une cordelette tressée : ombre portée, âme menthe, torsion, reflet.
// Le tracé est dessiné par tronçons successifs : aux croisements, le brin le plus récent
// passe au-dessus et projette son ombre sur l'autre, comme une vraie corde posée.
import { spline } from './path.js';

export function makeCordLayer(canvas, W, H) {
  const g = canvas.getContext('2d');
  // Ombre douce globale calculée en quart de résolution (le flou plein cadre est trop coûteux)
  const sc = document.createElement('canvas');
  sc.width = Math.ceil(W / 4); sc.height = Math.ceil(H / 4);
  const sg = sc.getContext('2d');
  return {
    g,
    clear() { g.clearRect(0, 0, W, H); },
    draw(pts, o = {}) {
      const w = o.width ?? 10;
      if ((o.shadow ?? 1) > 0 && pts.length > 1) {
        sg.clearRect(0, 0, sc.width, sc.height);
        sg.save();
        sg.scale(0.25, 0.25);
        sg.strokeStyle = `rgba(0,0,0,${(0.42 * (o.shadow ?? 1) * (o.alpha ?? 1)).toFixed(3)})`;
        sg.lineWidth = w * 1.5;
        sg.lineCap = 'round'; sg.lineJoin = 'round';
        sg.beginPath();
        pts.forEach((p, k) => (k ? sg.lineTo(p[0] + w * 0.35, p[1] + w * 1.1) : sg.moveTo(p[0] + w * 0.35, p[1] + w * 1.1)));
        sg.stroke();
        sg.restore();
        g.save();
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(sc, 0, 0, W, H);
        g.restore();
      }
      drawCord(g, pts, o);
    },
  };
}

const MINT = '#2ACAA5', MINT_DARK = 'rgba(14,110,88,0.55)', HI = 'rgba(205,255,240,0.6)';

function dense(pts, step) {
  if (pts.length < 2) return pts;
  // Les tracés reçus sont déjà denses (> 1 point / 12 px) : on lisse seulement les tracés grossiers
  let maxSeg = 0;
  for (let i = 1; i < pts.length; i++) maxSeg = Math.max(maxSeg, Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return maxSeg > step * 2 ? spline(pts, step) : pts;
}

export function drawCord(g, input, o = {}) {
  const w = o.width ?? 10;
  const pts = dense(input, Math.max(3, w * 0.5));
  if (pts.length < 2) return;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // Abscisses curvilignes
  const n = pts.length;
  const s = new Float64Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const total = s[n - 1];
  const chunk = o.chunk ?? Math.max(60, w * 14);
  const phase = o.phase ?? 0;
  const shadow = o.shadow ?? 1;

  let i0 = 0;
  while (i0 < n - 1) {
    let i1 = i0 + 1;
    while (i1 < n - 1 && s[i1] - s[i0] < chunk) i1++;
    const seg = pts.slice(i0, i1 + 1);

    // Ombre de contact (nette, courte) : aux croisements, le brin du dessus assombrit celui du dessous.
    // On n'ombre pas le raccord avec le tronçon précédent.
    if (shadow > 0) {
      let k0 = 0;
      if (i0 > 0) while (k0 < seg.length - 1 && s[i0 + k0] - s[i0] < w * 2.2) k0++;
      if (k0 < seg.length - 1) {
        g.strokeStyle = `rgba(0,0,0,${(0.32 * shadow).toFixed(3)})`;
        g.lineWidth = w * 1.25;
        g.beginPath();
        for (let k = k0; k < seg.length; k++) {
          const p = seg[k];
          if (k === k0) g.moveTo(p[0] + w * 0.12, p[1] + w * 0.38); else g.lineTo(p[0] + w * 0.12, p[1] + w * 0.38);
        }
        g.stroke();
      }
    }
    // Âme
    g.strokeStyle = o.color || MINT;
    g.lineWidth = w;
    g.beginPath();
    seg.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();

    // Torsion : hachures obliques régulières le long de la corde
    g.strokeStyle = o.twistColor || MINT_DARK;
    g.lineWidth = w * 0.2;
    g.lineCap = 'butt';
    const pitch = w * 0.78;
    const a = 1.05; // angle des brins par rapport à l'axe
    const h = (w / 2) / Math.sin(a) * 0.92;
    g.beginPath();
    let next = Math.ceil((s[i0] + phase) / pitch) * pitch - phase;
    for (let k = i0; k < i1; k++) {
      const p = pts[k], q = pts[k + 1];
      const ds = s[k + 1] - s[k] || 1e-6;
      const tx = (q[0] - p[0]) / ds, ty = (q[1] - p[1]) / ds;
      const nx = -ty, ny = tx;
      const dx = Math.cos(a) * tx + Math.sin(a) * nx, dy = Math.cos(a) * ty + Math.sin(a) * ny;
      while (next <= s[k + 1]) {
        const u = (next - s[k]) / ds;
        const cx = p[0] + (q[0] - p[0]) * u, cy = p[1] + (q[1] - p[1]) * u;
        g.moveTo(cx - dx * h, cy - dy * h);
        g.lineTo(cx + dx * h, cy + dy * h);
        next += pitch;
      }
    }
    g.stroke();
    g.lineCap = 'round';

    // Reflet (lumière en haut à gauche)
    g.strokeStyle = o.highlight || HI;
    g.lineWidth = w * 0.16;
    g.beginPath();
    for (let k = i0; k <= i1; k++) {
      const p = pts[k], q = pts[Math.min(n - 1, k + 1)], r = pts[Math.max(0, k - 1)];
      const tx = q[0] - r[0], ty = q[1] - r[1];
      const l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l, ny = tx / l;
      // Côté éclairé : continu quand la corde tourne (pas de saut d'un bord à l'autre)
      const side = Math.max(-1, Math.min(1, -(nx + ny) * 0.7071 * 3));
      const x = p[0] + nx * w * 0.24 * side, y = p[1] + ny * w * 0.24 * side;
      if (k === i0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    i0 = i1;
  }
  g.restore();
  return total;
}
