// Orchestrateur v3 : calques, seek(t) déterministe, lecteur web (?play), formats (?f=916 | ?f=11).
import { L, W, H, DURATION, FPS, T, BPM, VO } from './timeline.js';
import { makeCordLayer } from './lib/cord.js';
import { E, prog, lerp } from './lib/ease.js';
import * as hook from './scenes/hook.js';
import * as tangle from './scenes/tangle.js';
import * as pull from './scenes/pull.js';
import * as line from './scenes/line.js';
import * as coverage from './scenes/coverage.js';
import * as free from './scenes/free.js';
import * as end from './scenes/end.js';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
stage.style.width = W + 'px';
stage.style.height = H + 'px';
stage.dataset.format = L.id;
document.body.style.width = W + 'px';
document.body.style.height = H + 'px';

// Calques, du fond vers l'avant
const LAYERS = ['bg', 'mint', 'worldBack', 'gl', 'cord', 'worldFront', 'tags', 'text', 'grain'];
const layers = {};
for (const n of LAYERS) {
  const d = document.createElement(n === 'cord' || n === 'grain' ? 'canvas' : 'div');
  d.className = 'layer';
  d.dataset.layer = n;
  if (d.tagName === 'CANVAS') { d.width = W; d.height = H; }
  stage.appendChild(d);
  layers[n] = d;
}

const ctx = {
  stage, layers, L, W, H, shared: {},
  cord: makeCordLayer(layers.cord, W, H),
  measure(e) {
    const s = stage.getBoundingClientRect();
    const k = s.width / W;
    const r = e.getBoundingClientRect();
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  },
};
// Pas de grain : aplats d'encre nets (retour client)
const grain = { update() {} };

// end est construit avant hook : le fil de l'accroche et la fin partagent des mesures
const BUILD = [end, hook, tangle, pull, line, coverage, free];
const UPDATE = [hook, tangle, pull, line, coverage, free, end];

async function init() {
  await Promise.all([
    document.fonts.load('600 100px Parkinsans'), document.fonts.load('300 100px Parkinsans'),
    document.fonts.load('500 100px Parkinsans'), document.fonts.load('400 30px "Noto Sans"'),
    document.fonts.load('600 30px "Noto Sans"'), document.fonts.load('700 30px "Noto Sans"'),
  ]);
  await document.fonts.ready;
  for (const m of BUILD) await m.build(ctx);
  window.__cues = { T, BPM, DURATION, VO, ...(ctx.shared.cues || {}) };
  seek(Number(params.get('t') || 0));
}

// Respiration de caméra sur les plans fixes (lente avancée, recul franc quand on tire le fil),
// plus de courtes impulsions sur les temps forts : le drop, le coup de tampon, le point final.
const PUNCH = [[T.blind, 0.035], [T.stamp, 0.014], [T.dot, 0.016]];
function camZoom(t) {
  let z;
  if (t < T.pull) z = 1 + 0.05 * E.inOutCubic(prog(t, 0, T.pull));
  else if (t < T.line) z = lerp(1.05, 1, E.outCubic(prog(t, T.pull, T.pull + 0.5))) + 0.025 * E.inOutCubic(prog(t, T.brand[0], T.line));
  else if (t < T.map) z = 1;
  else if (t < T.end) z = 1 + 0.035 * E.inOutCubic(prog(t, T.map, T.free + 0.6)) + 0.02 * E.inOutCubic(prog(t, T.free + 0.6, T.end));
  else z = 1 + 0.025 * E.inOutCubic(prog(t, T.end, DURATION));
  for (const [t0, a] of PUNCH) if (t >= t0) z += a * (1 - E.outCubic(prog(t, t0, t0 + 0.5)));
  return z;
}
const zoomLayers = LAYERS.filter((n) => n !== 'grain').map((n) => layers[n]);

function seek(t) {
  ctx.cord.clear();
  for (const m of UPDATE) m.update(t, ctx);
  const z = camZoom(t);
  const tr = z === 1 ? '' : `scale(${z.toFixed(5)})`;
  for (const l of zoomLayers) if (l.style.transform !== tr) l.style.transform = tr;
  grain.update(t);
}

window.seek = seek;
window.__ctx = ctx;
window.__spec = { W, H, DURATION, FPS, format: L.id };
window.__ready = init().then(() => true).catch((e) => { console.error(e); window.__error = String((e && e.stack) || e); return false; });

// Lecteur web temps réel
if (params.has('play')) {
  document.body.className = 'player';
  document.body.style.width = document.body.style.height = '';
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
  const audio = new Audio('../renders/audio/le-fil-v3-mix.wav');
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
