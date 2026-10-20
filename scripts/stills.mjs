// Captures de contrôle à des instants donnés + planche contact.
// Usage : node scripts/stills.mjs 0 1.2 3.5 ...   (sans argument : une image toutes les secondes)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startServer, openStage, CHROME_ARGS, ROOT } from './server.mjs';

const out = path.join(ROOT, 'renders', 'stills');
fs.mkdirSync(out, { recursive: true });
let times = process.argv.slice(2).map(Number).filter((x) => !Number.isNaN(x));
if (!times.length) times = Array.from({ length: 34 }, (_, i) => i);

const { server, port } = await startServer();
const browser = await chromium.launch({ args: CHROME_ARGS });
try {
  const { page, errors } = await openStage(browser, port);
  const files = [];
  for (const t of times) {
    await page.evaluate((t) => window.seek(t), t);
    const f = path.join(out, `t${t.toFixed(2).padStart(6, '0')}.png`);
    await page.screenshot({ path: f, type: 'png' });
    files.push(f);
  }
  if (errors.length) console.error('Erreurs page :\n' + errors.join('\n'));
  // Planche contact (FFmpeg)
  if (files.length > 1) {
    const cols = Math.min(6, files.length), rows = Math.ceil(files.length / cols);
    const list = path.join(out, '_list.txt');
    fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
    const sheet = path.join(out, `planche_${Date.now()}.jpg`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `scale=270:480,drawtext=fontfile=/usr/share/fonts/opentype/inter/Inter-Bold.otf:text='%{eif\\:n\\:d}':x=8:y=8:fontsize=18:fontcolor=white@0.0,tile=${cols}x${rows}:padding=6:color=0x222222`,
      '-frames:v', '1', '-q:v', '3', sheet]);
    console.log('Planche :', sheet);
  }
  console.log(files.join('\n'));
} finally {
  await browser.close();
  server.close();
}
