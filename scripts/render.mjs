// Rendu image par image (déterministe) puis encodage MP4 H.264 + AAC.
// Usage : node scripts/render.mjs [--samples 2] [--workers 3] [--from 0] [--to 33] [--name desk-to-desk_le-fil]
//   --samples : sous-images par image (flou de mouvement, obturateur 180°). 1 = pas de flou.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { startServer, openStage, CHROME_ARGS, ROOT } from './server.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const FPS = 30, DURATION = 33;
const S = Number(args.samples ?? 2);
const WORKERS = Number(args.workers ?? 3);
const FROM = Number(args.from ?? 0), TO = Number(args.to ?? DURATION);
const NAME = args.name ?? 'desk-to-desk_le-fil';
const SHUTTER = 0.5;

const framesDir = path.join(ROOT, 'renders', 'frames');
const outDir = path.join(ROOT, 'renders', 'final');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS);
const total = f1 - f0;
const jobs = [];
for (let f = f0; f < f1; f++) for (let s = 0; s < S; s++) jobs.push({ f, s, idx: (f - f0) * S + s });
const chunk = Math.ceil(jobs.length / WORKERS);

const { server, port } = await startServer();
const t0 = Date.now();
let done = 0;
const errors = [];

async function worker(list) {
  const browser = await chromium.launch({ args: CHROME_ARGS });
  try {
    const { page, errors: pe } = await openStage(browser, port);
    for (const j of list) {
      const t = Math.max(0, j.f / FPS + (S > 1 ? ((j.s + 0.5) / S - 0.5) * (SHUTTER / FPS) : 0));
      await page.evaluate((t) => window.seek(t), t);
      await page.screenshot({ path: path.join(framesDir, `sub_${String(j.idx).padStart(6, '0')}.png`), type: 'png' });
      done++;
      if (done % 60 === 0) {
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
const wav = path.join(ROOT, 'renders', 'audio', 'le-fil-mix.wav');
const hasAudio = fs.existsSync(wav);
let afilter = null;
if (hasAudio) {
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{')));
  afilter = `atrim=${FROM}:${TO},asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
}

// --- Vidéo : mélange des sous-images (flou de mouvement) + conversion BT.709
const blur = S > 1 ? `tmix=frames=${S},select='eq(mod(n\\,${S})\\,${S - 1})',setpts=N/(${FPS}*TB),` : '';
const color = 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p';
const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const x264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level:v', '4.2', '-tune', 'animation', '-g', String(FPS * 2), '-movflags', '+faststart'];

function encode(out, crop) {
  const vf = blur + (crop ? `crop=${crop},` : '') + color;
  const a = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS * S), '-i', path.join(framesDir, 'sub_%06d.png')];
  if (hasAudio) a.push('-i', wav);
  a.push('-vf', vf, '-r', String(FPS), ...x264, ...tags);
  if (hasAudio) a.push('-af', afilter, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-shortest');
  a.push(out);
  const r = spawnSync('ffmpeg', a, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Échec FFmpeg : ' + out);
  console.log('Export :', out);
}

const suffix = FROM === 0 && TO === DURATION ? '' : `_${FROM}-${TO}s`;
encode(path.join(outDir, `${NAME}_9x16_1080x1920${suffix}.mp4`));
// Déclinaison 4:5 (fil Instagram / Facebook) : recadrage dans la zone sûre, aucun texte essentiel coupé
encode(path.join(outDir, `${NAME}_4x5_1080x1350${suffix}.mp4`), '1080:1350:0:190');
console.log(`Terminé en ${((Date.now() - t0) / 1000).toFixed(0)} s (${total} images).`);
