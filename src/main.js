// Orchestrateur : construit les calques, expose seek(t) (rendu déterministe) et un lecteur web (?play).
import { W, H, DURATION, FPS } from './timeline.js';
import * as background from './scenes/background.js';
import * as hook from './scenes/hook.js';
import * as problem from './scenes/problem.js';
import * as transform from './scenes/transform.js';
import * as hud from './scenes/hud.js';
import * as header from './scenes/header.js';
import * as brief from './scenes/brief.js';
import * as selection from './scenes/selection.js';
import * as visit from './scenes/visit.js';
import * as nego from './scenes/nego.js';
import * as value from './scenes/value.js';
import * as end from './scenes/end.js';
import * as thread from './scenes/thread.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');

// Calques, du fond vers l'avant
const LAYERS = ['bg', 'gl', 'scene', 'plan', 'strokes', 'thread', 'chips', 'hud', 'top'];
const layers = {};
for (const n of LAYERS) {
  const d = document.createElement('div');
  d.className = 'layer';
  d.dataset.layer = n;
  stage.appendChild(d);
  layers[n] = d;
}

const ctx = {
  stage, layers, shared: {},
  measure(e) {
    const s = stage.getBoundingClientRect();
    const k = s.width / W;
    const r = e.getBoundingClientRect();
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  },
};

// Ordre de construction : les scènes mesurées avant le fil qui s'y accroche
const BUILD = [background, hook, problem, transform, hud, header, brief, visit, selection, nego, value, end, thread];
const UPDATE = BUILD;

async function init() {
  await Promise.all([
    document.fonts.load('600 100px Parkinsans'),
    document.fonts.load('500 100px Parkinsans'),
    document.fonts.load('400 30px "Noto Sans"'),
    document.fonts.load('600 30px "Noto Sans"'),
    document.fonts.load('700 30px "Noto Sans"'),
  ]);
  await document.fonts.ready;
  for (const m of BUILD) await m.build(ctx);
  seek(Number(params.get('t') || 0));
}

function seek(t) {
  for (const m of UPDATE) m.update(t, ctx);
}

window.seek = seek;
window.__ctx = ctx;
window.__spec = { W, H, DURATION, FPS };
window.__ready = init().then(() => true).catch((e) => { console.error(e); window.__error = String(e && e.stack || e); return false; });

// Lecteur web temps réel : /src/index.html?play
if (params.has('play')) {
  document.body.className = 'player';
  const frame = document.createElement('div');
  frame.id = 'frame';
  stage.parentNode.insertBefore(frame, stage);
  frame.appendChild(stage);
  const fit = () => {
    const k = Math.min((innerHeight - 90) / H, (innerWidth - 32) / W);
    stage.style.transform = `scale(${k})`;
    frame.style.width = W * k + 'px';
    frame.style.height = H * k + 'px';
  };
  fit();
  addEventListener('resize', fit);

  const controls = document.createElement('div');
  controls.id = 'controls';
  controls.innerHTML = '<button id="pp">Lecture</button><input id="scrub" type="range" min="0" max="' + DURATION + '" step="0.001" value="0"><span id="tc">0.00 s</span>';
  document.body.appendChild(controls);
  const audio = new Audio('../renders/audio/le-fil-mix.wav');
  const pp = controls.querySelector('#pp'), scrub = controls.querySelector('#scrub'), tc = controls.querySelector('#tc');
  let playing = false, t0 = 0, base = 0;
  const now = () => (playing ? base + (performance.now() - t0) / 1000 : base);
  const tick = () => {
    let t = now();
    if (t >= DURATION) { t = DURATION; playing = false; pp.textContent = 'Lecture'; audio.pause(); base = DURATION; }
    seek(t);
    scrub.value = t;
    tc.textContent = t.toFixed(2) + ' s';
    requestAnimationFrame(tick);
  };
  window.__ready.then(() => requestAnimationFrame(tick));
  pp.onclick = () => {
    if (playing) { base = now(); playing = false; audio.pause(); pp.textContent = 'Lecture'; return; }
    if (base >= DURATION) base = 0;
    playing = true; t0 = performance.now();
    audio.currentTime = base; audio.play().catch(() => {});
    pp.textContent = 'Pause';
  };
  scrub.oninput = () => { base = Number(scrub.value); if (playing) { t0 = performance.now(); audio.currentTime = base; } };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); pp.onclick(); } });
}
