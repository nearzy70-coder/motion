// Corde simulée (intégration de Verlet + contraintes de longueur et de courbure).
// La simulation est entièrement précalculée au chargement, avec un pas fixe :
// rope.at(t) renvoie la même forme quel que soit l'ordre des appels (rendu déterministe).
import { resample } from './path.js';

export function simulateRope({ init, N = 220, t0, t1, hz = 240, sub = 6, iters = 24, damping = 0.992, bend = 0.12, endA, endB }) {
  const pts = resample(init, N);
  const x = new Float64Array(N), y = new Float64Array(N), px = new Float64Array(N), py = new Float64Array(N);
  for (let i = 0; i < N; i++) { x[i] = px[i] = pts[i][0]; y[i] = py[i] = pts[i][1]; }
  let len = 0;
  for (let i = 1; i < N; i++) len += Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]);
  const r = len / (N - 1);
  const r2 = r * 2;

  const frames = Math.ceil((t1 - t0) * hz) + 1;
  const snaps = new Float32Array(frames * N * 2);
  const dt = 1 / (hz * sub);
  const store = (f) => {
    const o = f * N * 2;
    for (let i = 0; i < N; i++) { snaps[o + i * 2] = x[i]; snaps[o + i * 2 + 1] = y[i]; }
  };
  store(0);
  for (let f = 1; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = t0 + (f - 1) / hz + (s + 1) * dt;
      for (let i = 1; i < N - 1; i++) {
        const vx = (x[i] - px[i]) * damping, vy = (y[i] - py[i]) * damping;
        px[i] = x[i]; py[i] = y[i];
        x[i] += vx; y[i] += vy;
      }
      const a = endA(t), b = endB(t);
      px[0] = x[0]; py[0] = y[0]; x[0] = a[0]; y[0] = a[1];
      px[N - 1] = x[N - 1]; py[N - 1] = y[N - 1]; x[N - 1] = b[0]; y[N - 1] = b[1];
      for (let k = 0; k < iters; k++) {
        for (let i = 0; i < N - 1; i++) {
          const j = i + 1;
          const dx = x[j] - x[i], dy = y[j] - y[i];
          const d = Math.hypot(dx, dy) || 1e-6;
          const diff = (d - r) / d;
          const wi = i === 0 ? 0 : 0.5, wj = j === N - 1 ? 0 : 0.5;
          const s2 = wi + wj || 1;
          x[i] += dx * diff * (wi / s2); y[i] += dy * diff * (wi / s2);
          x[j] -= dx * diff * (wj / s2); y[j] -= dy * diff * (wj / s2);
        }
        // Raideur en flexion : une corde n'est pas un fil de soie
        if (bend > 0) {
          for (let i = 1; i < N - 2; i++) {
            const j = i + 2;
            const dx = x[j] - x[i], dy = y[j] - y[i];
            const d = Math.hypot(dx, dy) || 1e-6;
            if (d < r2) {
              const diff = ((d - r2) / d) * bend * 0.5;
              x[i] += dx * diff; y[i] += dy * diff;
              x[j] -= dx * diff; y[j] -= dy * diff;
            }
          }
        }
      }
    }
    store(f);
  }

  return {
    N, r, length: len, t0, t1,
    at(t) {
      const ft = Math.max(0, Math.min(frames - 1, (t - t0) * hz));
      const f0 = Math.floor(ft), f1 = Math.min(frames - 1, f0 + 1), u = ft - f0;
      const o0 = f0 * N * 2, o1 = f1 * N * 2;
      const out = new Array(N);
      for (let i = 0; i < N; i++) {
        out[i] = [snaps[o0 + i * 2] * (1 - u) + snaps[o1 + i * 2] * u, snaps[o0 + i * 2 + 1] * (1 - u) + snaps[o1 + i * 2 + 1] * u];
      }
      return out;
    },
  };
}
