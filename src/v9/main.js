// Orchestrateur du film v9 « Axo » : calques, seek(t) déterministe, lecteur web (?play).
import { L, W, H, DURATION, FPS, T, BPM, VO } from './timeline.js';
import * as film from './film.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
stage.style.width = W + 'px';
stage.style.height = H + 'px';
stage.dataset.format = L.id;
document.body.style.width = W + 'px';
document.body.style.height = H + 'px';

// Calques, du fond vers l'avant : fonds et iris (sous la 3D), rendu 3D, tracés 2D, volets (sur la 3D), texte
const LAYERS = ['under', 'gl', 'fx', 'over', 'text'];
const layers = {};
for (const n of LAYERS) {
  const d = document.createElement(n === 'gl' || n === 'fx' ? 'canvas' : 'div');
  d.className = 'layer';
  d.dataset.layer = n;
  if (d.tagName === 'CANVAS') { d.width = W; d.height = H; }
  stage.appendChild(d);
  layers[n] = d;
}
const ctx = {
  stage, layers, gl: layers.gl, fx: layers.fx, W, H,
  measure(e) {
    const s = stage.getBoundingClientRect();
    const k = s.width / W;
    const r = e.getBoundingClientRect();
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  },
};

async function init() {
  await Promise.all([
    document.fonts.load('600 100px Parkinsans'), document.fonts.load('300 100px Parkinsans'),
    document.fonts.load('500 100px Parkinsans'), document.fonts.load('700 100px Parkinsans'), document.fonts.load('400 30px "Noto Sans"'),
    document.fonts.load('600 30px "Noto Sans"'), document.fonts.load('700 30px "Noto Sans"'),
  ]);
  await document.fonts.ready;
  const cues = film.build(ctx);
  // Fenêtres de flou de mouvement : mouvements de caméra vifs et volets
  const FAST = [[T.strike - 0.1, T.strike + 0.9], [T.pull - 0.4, T.blind + 0.4], [T.line - 0.05, T.line + 0.4], [T.fmt2 - 0.35, T.fmt2 + 0.2], [T.fmt3 - 0.35, T.fmt3 + 0.2],
    [T.choose - 0.2, T.choose + 0.7], ...[T.s1, T.s2, T.s3, T.s4, T.s5, T.reneg, T.day].map((x) => [x - 0.5, x + 0.05]), [T.map - 0.55, T.map - 0.1], [T.free - 0.05, T.free + 0.6], [T.end - 0.05, T.end + 0.55]];
  const MEDIUM = [[0, T.strike - 0.1], [T.fall - 0.1, T.pull - 0.4], [T.blind + 0.4, T.line - 0.05], [T.line + 0.4, T.choose - 0.2], [T.stamp - 0.2, T.stamp + 0.4],
    [42.8, 44.2], [T.map - 0.1, T.free - 0.05], [T.end + 0.55, T.dot + 0.5]];
  window.__cues = { T, BPM, DURATION, VO, FILM: 'axo', sampling: { fast: FAST, medium: MEDIUM }, audio: 'renders/audio/le-fil-axo-mix.wav', ...cues };
  seek(Number(params.get('t') || 0));
}

function seek(t) {
  film.update(t, ctx);
}

window.seek = seek;
window.__spec = { W, H, DURATION, FPS, format: L.id };
window.__ready = init().then(() => true).catch((e) => { console.error(e); window.__error = String((e && e.stack) || e); return false; });

if (params.has('play')) {
  const audio = new Audio('../../renders/audio/le-fil-axo-mix.wav');
  window.__ready.then(() => {
    const t0 = performance.now();
    audio.play().catch(() => {});
    const loop = () => {
      seek((audio.currentTime || (performance.now() - t0) / 1000) % DURATION);
      requestAnimationFrame(loop);
    };
    loop();
  });
}
