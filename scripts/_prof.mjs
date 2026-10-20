import { chromium } from 'playwright-core';
import { startServer, openStage, CHROME_ARGS } from './server.mjs';
const { server, port } = await startServer();
const b = await chromium.launch({ args: CHROME_ARGS });
const t0 = Date.now();
const { page } = await openStage(b, port, process.argv[2] || '916');
console.log('init ms', Date.now() - t0);
for (const t of [0, 1.9, 3.2, 6.5, 10.5, 12.3, 13.3, 16]) {
  const ms = await page.evaluate((t) => { const a = performance.now(); window.seek(t); return performance.now() - a; }, t);
  const a = Date.now(); await page.screenshot({ type: 'png' }); console.log('t', t, 'seek ms', ms.toFixed(1), 'shot ms', Date.now() - a);
}
await b.close(); server.close();
