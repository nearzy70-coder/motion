// Exporte les repères temporels du film (timeline + événements calculés) pour la bande-son.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, openStage, CHROME_ARGS, ROOT } from './server.mjs';

const { server, port } = await startServer();
const b = await chromium.launch({ args: CHROME_ARGS });
try {
  const opening = process.argv[3] || '';
  const { page } = await openStage(b, port, process.argv[2] || '11', opening);
  const cues = await page.evaluate(() => window.__cues);
  const out = path.join(ROOT, 'audio', opening ? `cues-${opening}.json` : 'cues.json');
  fs.writeFileSync(out, JSON.stringify(cues, null, 2));
  console.log(out, Object.keys(cues.T).length, 'repères');
} finally {
  await b.close();
  server.close();
}
