// Orchestrateur du film v8 « Le Plan » : calques, seek(t) déterministe, lecteur web (?play).
import { L, W, H, DURATION, FPS, T, BPM, VO } from './timeline.js';
import * as film from './film.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
stage.style.width = W + 'px';
stage.style.height = H + 'px';
stage.dataset.format = L.id;
document.body.style.width = W + 'px';
document.body.style.height = H + 'px';

// Calques, du fond vers l'avant : le plan (canvas), un voile blanc, l'aplat menthe, le texte
const LAYERS = ['world', 'veil', 'brand', 'text'];
const layers = {};
for (const n of LAYERS) {
  const d = document.createElement(n === 'world' ? 'canvas' : 'div');
  d.className = 'layer';
  d.dataset.layer = n;
  if (d.tagName === 'CANVAS') { d.width = W; d.height = H; }
  stage.appendChild(d);
  layers[n] = d;
}
const ctx = { stage, layers, world: layers.world, W, H };

// Échantillonnage du flou de mouvement au rendu : plus de sous-images sur les mouvements de caméra vifs
const FAST = [[T.starts - 0.1, T.starts + 1.0], [T.compare - 0.15, T.compare + 0.45], [T.visits - 0.2, T.visits + 0.35], [T.terms - 0.15, T.terms + 0.4],
  [T.because - 0.35, T.because + 0.2], [T.drop - 0.05, T.drop + 0.45], [44.55, 45.2], [T.needs - 0.35, T.needs + 0.15], [T.select - 0.2, T.select + 0.4],
  [T.compare2 - 0.25, T.compare2 + 0.35], [T.nego2 - 0.25, T.nego2 + 0.35], [20.75, 21.95]];
const MEDIUM = [[1.5, 4.3], [T.teams - 0.1, T.teams + 1.2], [T.need, T.newOffices + 0.6], [T.search - 0.1, T.compare], [T.nego - 0.1, 20.75],
  [T.meanwhile, T.could + 1.1], [T.walls - 0.1, T.walls + 0.7], [T.onYou, T.onYou + 1.0], [T.complex, T.hush], [T.exists, T.drop],
  [45.0, T.needs], [T.find, T.find + 1.6], [T.along, T.bout + 0.3], [T.yourTime - 0.3, T.devote + 1.5], [T.notSearch - 0.1, T.notSearch + 1.1]];

async function init() {
  await Promise.all([
    document.fonts.load('600 100px Parkinsans'), document.fonts.load('300 100px Parkinsans'),
    document.fonts.load('500 100px Parkinsans'), document.fonts.load('700 100px Parkinsans'), document.fonts.load('400 30px "Noto Sans"'),
    document.fonts.load('600 30px "Noto Sans"'), document.fonts.load('700 30px "Noto Sans"'),
  ]);
  await document.fonts.ready;
  const cues = film.build(ctx);
  window.__cues = { T, BPM, DURATION, VO, FILM: 'plan', sampling: { fast: FAST, medium: MEDIUM }, audio: 'renders/audio/le-plan-v8-mix.wav', ...cues };
  seek(Number(params.get('t') || 0));
}

function seek(t) {
  film.update(t);
}

window.seek = seek;
window.__spec = { W, H, DURATION, FPS, format: L.id };
window.__ready = init().then(() => true).catch((e) => { console.error(e); window.__error = String((e && e.stack) || e); return false; });

// Lecteur web temps réel
if (params.has('play')) {
  const audio = new Audio('../../renders/audio/le-plan-v8-mix.wav');
  window.__ready.then(() => {
    const t0 = performance.now();
    audio.play().catch(() => {});
    const loop = () => {
      const t = audio.currentTime || (performance.now() - t0) / 1000;
      seek(t % DURATION);
      requestAnimationFrame(loop);
    };
    loop();
  });
}
