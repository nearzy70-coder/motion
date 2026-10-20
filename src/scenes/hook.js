// Séquence 1 — Accroche : « Trouver vos bureaux, c'est simple. » puis le fil raye « simple ».
import { el, maskLine, reveal, op, show } from '../lib/dom.js';
import { E, prog, inOut } from '../lib/ease.js';
import { T } from '../timeline.js';

let root, lines, simple, tag;

export function build(ctx) {
  root = el('div', { cls: 'abs', style: { left: '96px', top: '668px' } }, ctx.layers.scene);
  const st = { fontSize: '138px', marginBottom: '10px' };
  lines = [
    maskLine(root, 'Trouver', 'display', st),
    maskLine(root, 'vos bureaux,', 'display', st),
    maskLine(root, 'c’est <span class="simple">simple.</span>', 'display', st),
  ];
  simple = root.querySelector('.simple');

  tag = el('div', { cls: 'abs eyebrow', style: { left: '96px', top: '300px', display: 'flex', alignItems: 'center', gap: '14px', color: '#fff' } }, ctx.layers.top);
  el('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' } }, tag);
  el('span', { text: 'Desk to Desk' }, tag);

  // Position exacte de la rature (milieu de la hauteur d'x de « simple. »)
  const r = ctx.measure(simple);
  ctx.shared.strike = { x0: r.x - 18, x1: r.x + r.w + 6, y: r.y + r.h * 0.6 };
}

export function update(t) {
  const on = t < T.hookOut + 0.9;
  show(root, on);
  show(tag, t < 3);
  if (!on) return;
  const ins = [[-0.45, 0.35], [-0.3, 0.5], [0.22, 0.92]];
  lines.forEach((ln, i) => {
    const p = E.enter(prog(t, ins[i][0], ins[i][1]));
    const q = E.exit(prog(t, T.hookOut + i * 0.07, T.hookOut + 0.55 + i * 0.07));
    reveal(ln, p, q);
  });
  op(simple, 1 - 0.68 * E.outCubic(prog(t, T.strike + 0.25, T.strike + 0.6)));
  op(tag, inOut(t, 0.1, 0.6, T.hookOut, T.hookOut + 0.4));
}
