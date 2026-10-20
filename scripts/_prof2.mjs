import { chromium } from 'playwright-core';
import { startServer, openStage, CHROME_ARGS } from './server.mjs';
const { server, port } = await startServer();
const b = await chromium.launch({ args: CHROME_ARGS });
const { page } = await openStage(b, port, '916');
async function shot(label, t, hide = []) {
  await page.evaluate(([t, hide]) => { for (const n of ['grain','cord','text','tags','mint']) document.querySelector(`[data-layer=${n}]`).style.display = hide.includes(n) ? 'none' : ''; window.seek(t); }, [t, hide]);
  const a = Date.now(); await page.screenshot({ type: 'png' }); console.log(label, Date.now() - a, 'ms');
}
await shot('t0 all', 0); await shot('t0 no grain', 0, ['grain']); await shot('t0 no grain no text', 0, ['grain','text']);
await shot('t6.5 all', 6.5); await shot('t6.5 no grain', 6.5, ['grain']); await shot('t6.5 no cord', 6.5, ['cord']); await shot('t6.5 no tags', 6.5, ['tags']);
await shot('t6.5 jpeg-like nothing', 6.5, ['grain','cord','tags','text']);
await b.close(); server.close();
