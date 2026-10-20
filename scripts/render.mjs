// Rendu image par image (déterministe) puis encodage MP4 H.264 + AAC.
// Usage : node scripts/render.mjs --f 916|11 [--samples 3] [--workers 4] [--from 0] [--to 68] [--crf 12]
//   --samples : sous-images par image (flou de mouvement, obturateur 180°). 1 = pas de flou.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { startServer, openStage, CHROME_ARGS, ROOT } from './server.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const FORMAT = args.f ?? '916';
const S_BASE = Number(args.samples ?? 3);
const WORKERS = Number(args.workers ?? 4);
const NAME = args.name ?? 'desk-to-desk_le-fil-v3';
const CRF = String(args.crf ?? 12);
const OPENING = args.o ?? '';
const FILM = args.v ?? '';
const SHUTTER = 0.5;
const SIZE = { '916': '1080x1920', '11': '1080x1080' }[FORMAT];
const LABEL = { '916': '9x16', '11': '1x1' }[FORMAT];

const framesDir = path.join(ROOT, 'renders', 'frames', FORMAT);
const outDir = path.join(ROOT, 'renders', 'final');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const { server, port } = await startServer();
// Spécifications lues dans le film lui-même
const probe = await chromium.launch({ args: CHROME_ARGS });
const { spec, T } = await (await openStage(probe, port, FORMAT, OPENING, FILM)).page.evaluate(() => ({ spec: window.__spec, T: window.__cues.T }));
await probe.close();

// Échantillonnage temporel adaptatif : plus de sous-images là où le mouvement est très rapide
// (panoramiques de la corde à linge : 0,55 s, très vifs → 12 sous-images)
const FAST = [[T.thread, T.blind + 0.75], [T.line - 0.05, T.line + 0.55], [T.free - 0.05, T.free + 0.7],
  ...[T.fmt2, T.fmt3, T.s1, T.s2, T.s3, T.s4, T.s5, T.reneg, T.day].map((tb) => [tb - 0.58, tb + 0.05])];
const MEDIUM = [[T.strike - 0.15, T.strike + 0.7], [T.fall, T.thread], [T.stamp - 0.15, T.stamp + 0.3], [T.s5 - 0.2, T.s5 + 0.5],
  [T.map, T.free], [T.vousOut - 0.25, T.dot + 0.35]];
// Film « ligne » : la caméra longe le trait en continu, toute la partie noire passe en échantillonnage moyen
if (FILM === 'ligne') MEDIUM.push([T.line, T.free]);
// Film « maquette » : rendu 3D logiciel (lourd) ; la plongée le long du bon chemin passe en échantillonnage moyen,
// et les fenêtres « rapide » et « moyen » prennent un peu moins de sous-images
const HEAVY = FILM === 'maquette';
if (HEAVY) MEDIUM.push([T.blind + 0.75, T.line], [T.choose - 0.3, T.s1 + 0.3]);
const inAny = (t, W) => W.some(([a, b]) => t >= a && t <= b);
const samplesFor = (t) => (S_BASE <= 1 ? 1 : inAny(t, FAST) ? (HEAVY ? 8 : 12) : inAny(t, MEDIUM) ? (HEAVY ? 4 : 6) : S_BASE);
const FPS = spec.FPS;
const FROM = Number(args.from ?? 0), TO = Number(args.to ?? spec.DURATION);
const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS);
const jobs = [];
const manifest = [];
for (let f = f0; f < f1; f++) {
  const S = samplesFor(f / FPS);
  manifest.push(S);
  for (let s = 0; s < S; s++) jobs.push({ f, s, S });
}
const chunk = Math.ceil(jobs.length / WORKERS);

const t0 = Date.now();
let done = 0;
const errors = [];

async function worker(list) {
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const { page, errors: pe } = await openStage(browser, port, FORMAT, OPENING, FILM);
    const cdp = await page.context().newCDPSession(page);
    for (const j of list) {
      const t = Math.max(0, j.f / FPS + (j.S > 1 ? ((j.s + 0.5) / j.S - 0.5) * (SHUTTER / FPS) : 0));
      await page.evaluate((t) => new Promise((res) => { window.seek(t); requestAnimationFrame(() => res()); }), t);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
      fs.writeFileSync(path.join(framesDir, `f${String(j.f - f0).padStart(5, '0')}_${String(j.s).padStart(2, '0')}.png`), Buffer.from(data, 'base64'));
      done++;
      if (done % 120 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${jobs.length} sous-images · ${el.toFixed(0)} s · reste ~${((el / done) * (jobs.length - done)).toFixed(0)} s`);
      }
    }
    errors.push(...pe.filter((e) => !e.includes('404')));
  } finally {
    await browser.close();
  }
}

await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(jobs.slice(w * chunk, (w + 1) * chunk))));
server.close();
console.log(`Capture terminée : ${jobs.length} sous-images en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (errors.length) console.warn('Erreurs page :\n' + errors.join('\n'));

// --- Audio : normalisation -14 LUFS (2 passes), crête vraie -1 dBTP
const wav = path.join(ROOT, 'renders', 'audio', FILM || OPENING ? `le-fil-${FILM || OPENING}-mix.wav` : 'le-fil-v3-mix.wav');
const hasAudio = fs.existsSync(wav);
let afilter = null;
if (hasAudio) {
  const pr = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(pr.stderr.slice(pr.stderr.lastIndexOf('{')));
  afilter = `atrim=${FROM}:${TO},asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
}

// --- Vidéo : moyenne des sous-images (flou de mouvement) par scripts/blend.py, puis encodage
fs.writeFileSync(path.join(framesDir, 'manifest.json'), JSON.stringify(manifest));
// Pas de grain ajouté : sur les aplats d'encre, un bruit temporel ressemble à de la neige télé une fois compressé
const vf = 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p';
const suffix = FROM === 0 && TO === spec.DURATION ? '' : `_${FROM}-${TO}s`;
const out = path.join(outDir, `${NAME}_${LABEL}_${SIZE}${suffix}.mp4`);
const enc = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', SIZE, '-framerate', String(FPS), '-i', '-'];
if (hasAudio) enc.push('-i', wav);
// aq-mode 3 : plus de bits dans les zones sombres (aplats d'encre sans bandes ni blocs)
enc.push('-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'animation', '-x264-params', 'aq-mode=3', '-profile:v', 'high', '-level:v', '4.2',
  '-g', String(FPS * 2), '-movflags', '+faststart', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv');
if (hasAudio) enc.push('-af', afilter, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-shortest');
enc.push(out);
const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'blend.py'), framesDir, JSON.stringify(enc)], { stdio: 'inherit' });
if (r.status !== 0) throw new Error('Échec du mélange / encodage : ' + out);
fs.rmSync(framesDir, { recursive: true, force: true });
console.log('Export :', out);
console.log(`Terminé en ${((Date.now() - t0) / 1000).toFixed(0)} s (${f1 - f0} images, ${jobs.length} sous-images).`);
