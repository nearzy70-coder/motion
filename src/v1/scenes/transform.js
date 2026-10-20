// Séquence 3 — Transformation : « Desk to Desk démêle votre recherche. »
// Puis la frise des 5 étapes réelles du parcours apparaît le long du fil.
import { el, maskLine, reveal, show, op, tf } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { T, CONTENT_X, NODE_Y } from '../timeline.js';

export const STEPS = ['Brief', 'Sélection', 'Visites', 'Négociation', 'Emménagement'];

let brand, brandLines, sub, subLines, list, items;

export function build(ctx) {
  brand = el('div', { cls: 'abs', style: { left: CONTENT_X + 'px', top: '598px' } }, ctx.layers.top);
  brandLines = [
    maskLine(brand, 'Desk to Desk', 'display', { fontSize: '128px', color: 'var(--mint)', letterSpacing: '-0.055em', marginBottom: '18px' }),
    maskLine(brand, 'démêle votre', 'display', { fontSize: '104px', marginBottom: '6px' }),
    maskLine(brand, 'recherche.', 'display', { fontSize: '104px' }),
  ];
  sub = el('div', { cls: 'abs', style: { left: CONTENT_X + 'px', top: '1068px' } }, ctx.layers.top);
  const st = { fontSize: '42px', fontWeight: '500', color: 'rgba(255,255,255,0.8)', lineHeight: '1.25', letterSpacing: '-0.005em' };
  subLines = [
    maskLine(sub, 'Un conseiller dédié, du brief', '', st),
    maskLine(sub, 'à la remise des clés.', '', st),
  ];

  list = el('div', { cls: 'abs', style: { left: '0px', top: '0px' } }, ctx.layers.top);
  items = STEPS.map((label, i) => {
    const row = el('div', { cls: 'abs', style: { left: CONTENT_X + 'px', top: NODE_Y[i] - 40 + 'px', display: 'flex', alignItems: 'center', gap: '26px' } }, list);
    const num = el('div', { text: '0' + (i + 1), style: { fontSize: '26px', fontWeight: '700', color: 'var(--mint)', letterSpacing: '0.04em', width: '40px' } }, row);
    const m = maskLine(row, label, 'display', { fontSize: '72px' });
    return { row, num, m };
  });
}

export function update(t) {
  const bOn = t >= T.brand - 0.05 && t < T.brandOut + 0.7;
  show(brand, bOn); show(sub, bOn);
  if (bOn) {
    brandLines.forEach((ln, i) => {
      const t0 = T.brand + i * 0.14;
      reveal(ln, E.enter(prog(t, t0, t0 + 0.75)), E.exit(prog(t, T.brandOut + i * 0.05, T.brandOut + 0.42 + i * 0.05)));
    });
    subLines.forEach((ln, i) => {
      const t0 = T.sub + i * 0.12;
      reveal(ln, E.enter(prog(t, t0, t0 + 0.7)), E.exit(prog(t, T.brandOut + 0.15 + i * 0.05, T.brandOut + 0.55 + i * 0.05)));
    });
  }

  const lOn = t >= T.list && t < T.step1 + 0.6;
  show(list, lOn);
  if (lOn) {
    items.forEach((it, i) => {
      const t0 = T.list + 0.05 + i * 0.08;
      const p = E.enter(prog(t, t0, t0 + 0.6));
      const out = E.exit(prog(t, T.step1 - 0.08 + i * 0.025, T.step1 + 0.2 + i * 0.025));
      reveal(it.m, p);
      op(it.num, prog(t, t0, t0 + 0.3) * (1 - out));
      op(it.m.wrap, 1 - out);
      tf(it.row, -60 * out, 0);
    });
  }
}
