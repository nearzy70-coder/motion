// Interpolation et courbes d'accélération. Tout est fonction pure du temps.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);

// cubic-bezier(x1, y1, x2, y2), même définition que CSS
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      const d = dx(u);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1;
    if (Math.abs(sx(u) - x) > 1e-4) {
      u = x;
      for (let i = 0; i < 30; i++) {
        if (sx(u) < x) lo = u; else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return sy(u);
  };
}

export const E = {
  linear: (x) => x,
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  // Entrées éditoriales : départ vif, longue décélération
  enter: bezier(0.16, 1, 0.3, 1),
  // Sorties : accélération franche
  exit: bezier(0.7, 0, 0.84, 0),
  // Déplacements de caméra / d'objets
  move: bezier(0.65, 0, 0.35, 1),
  // Tension du fil : très serré au centre
  snap: bezier(0.86, 0, 0.07, 1),
  // Léger dépassement (maîtrisé, < 4 %)
  soft: bezier(0.34, 1.32, 0.64, 1),
};

// Tween : valeur entre a et b sur la fenêtre [t0, t1]
export const tw = (t, t0, t1, a, b, e = E.move) => lerp(a, b, e(prog(t, t0, t1)));

// Fenêtre d'entrée/sortie : 0 → 1 → 0
export function inOut(t, inA, inB, outA, outB, eIn = E.enter, eOut = E.exit) {
  if (t < outA) return eIn(prog(t, inA, inB));
  return 1 - eOut(prog(t, outA, outB));
}

// Générateur pseudo-aléatoire déterministe
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
