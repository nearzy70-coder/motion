// « Le Fil » v2 : spécifications, repères temporels et mises en page par format.
// 96 BPM : 1 temps = 0,625 s, 1 mesure = 2,5 s, 30 mesures = 75 s.

export const FPS = 30;
export const DURATION = 75;
export const BPM = 96;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const bar = (n) => (n - 1) * BAR; // début de la mesure n (1-indexée)

export const T = {
  // 1. Accroche
  l1: -0.4, l2: 0.3, cordIn: 1.25, under: 1.6, around: 2.0, strike: 2.5, paper: 2.95, hookOut: 4.4,
  // 2. La pelote
  tangle: bar(3), tag0: bar(3) + BEAT / 2, tagStep: BEAT / 2, timeFlies: bar(5), tension: bar(5) + BAR / 2,
  // 3. On tire le fil
  pull: bar(6), blind: bar(6) + BEAT, brand: bar(6) + BEAT * 2, sub1: bar(7), sub2: bar(7) + BEAT * 2, sub3: bar(8),
  // 4. Formats (corde à linge)
  line: bar(9), fmt2: bar(10), fmt3: bar(11), choose: bar(11) + BEAT * 3,
  // 5. Parcours
  s1: bar(12), s2: bar(14), s3: bar(16), s4: bar(18), s5: bar(20),
  // 6. Autres services
  reneg: bar(22), day: bar(23),
  // 7. Couverture
  map: bar(24),
  // 8. Gratuité
  free: bar(26),
  // 9. Conclusion
  end: bar(28), write: bar(28) + BEAT * 2, dot: bar(28) + BEAT * 3, cta: bar(29),
};

// Mises en page : 9:16 (principal) et 1:1. Les valeurs « k » sont des facteurs d'échelle
// appliqués aux objets dessinés à taille de référence (feuilles 800 × 980).
export const FORMATS = {
  '916': {
    id: '916', W: 1080, H: 1920, mx: 96,
    safeTop: 250, safeBot: 1530,
    hookSize: 150, hookY: 640,
    headY: 262, headSize: 76, numSize: 196,
    lineY: 548, sheetK: 1.0, spacing: 900,
    bigSize: 150, subSize: 44,
    pullY: 1700,
  },
  '11': {
    id: '11', W: 1080, H: 1080, mx: 80,
    safeTop: 60, safeBot: 1030,
    hookSize: 118, hookY: 250,
    headY: 58, headSize: 54, numSize: 140,
    lineY: 262, sheetK: 0.76, spacing: 700,
    bigSize: 118, subSize: 36,
    pullY: 930,
  },
};

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const L = FORMATS[params.get('f') || '916'] || FORMATS['916'];
export const W = L.W;
export const H = L.H;
export const is916 = L.id === '916';
export const pick = (a, b) => (is916 ? a : b);

export const C = {
  ink: '#111111',
  mint: '#2ACAA5',
  mintLight: '#34E0B8',
  mintDark: '#1C9E80',
  map: '#449280',
  paper: '#FAFAF6',
  wood: '#D8B98E',
};
