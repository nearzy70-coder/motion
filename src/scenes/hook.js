// 1. Accroche : « Trouver des bureaux, c'est simple. » La cordelette glisse sous « simple »,
// l'entoure et le barre. Puis la chute : « Sur le papier. »
import { el, show, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { T, L, pick } from '../timeline.js';

let root, lines, simple, paper;

function line(parent, html, size, extra = {}) {
  const wrap = el('div', { cls: 'mask display', style: { fontSize: size + 'px', ...extra } }, parent);
  const inner = el('span', { html }, wrap);
  return { wrap, inner };
}

export function build(ctx) {
  const s = L.hookSize;
  root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.hookY + 'px' } }, ctx.layers.text);
  lines = [
    line(root, 'Trouver', s),
    line(root, 'des bureaux,', s),
    line(root, 'c’est <span class="simple">simple.</span>', s),
  ];
  simple = root.querySelector('.simple');
  paper = line(root, 'Sur le papier.', Math.round(s * 0.64), { color: 'var(--mint)', fontWeight: '300', letterSpacing: '-0.03em', marginTop: pick('70px', '46px') });
  ctx.shared.simple = ctx.measure(simple);
}

export function update(t) {
  const on = t < T.tangle + 0.2;
  show(root, on);
  if (!on) return;
  // Entrées : chaque ligne monte dans son cadre, légèrement décalée
  const ins = [T.l1, T.l1 + 0.14, T.l2];
  lines.forEach((ln, i) => {
    const p = E.enter(prog(t, ins[i], ins[i] + 0.8));
    const q = E.exit(prog(t, T.hookOut + i * 0.06, T.hookOut + 0.5 + i * 0.06));
    ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
  });
  op(simple, 1 - 0.62 * E.outCubic(prog(t, T.strike - 0.1, T.strike + 0.3)));
  const pp = E.enter(prog(t, T.paper, T.paper + 0.7));
  const pq = E.exit(prog(t, T.hookOut + 0.2, T.hookOut + 0.6));
  paper.inner.style.transform = `translate3d(0,${((1 - pp) * 135 - pq * 135).toFixed(2)}%,0)`;
}
