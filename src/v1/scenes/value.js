// Séquence 5 — Valeur : les services réels, un par nœud du fil, puis la gratuité (avec sa mention).
import { el, maskLine, reveal, show, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { T, CONTENT_X, NODE_Y } from '../timeline.js';

const ITEMS = [
  { t: 'Bureaux opérés', s: 'Coworking et espaces avec services' },
  { t: 'Bail commercial', s: 'Recherche et négociation' },
  { t: 'Renégociation', s: 'Loyer, charges, travaux, durée' },
  { t: 'Location ponctuelle', s: 'Salles de réunion, bureaux à la journée' },
  { t: 'Gratuit pour le locataire<span style="color:var(--white)">*</span>', mint: true },
];

let root, items;

export function build(ctx) {
  root = el('div', { cls: 'abs' }, ctx.layers.top);
  items = ITEMS.map((it, i) => {
    const box = el('div', { cls: 'abs', style: { left: CONTENT_X + 'px', top: NODE_Y[i] - (it.s ? 53 : 38) + 'px' } }, root);
    const title = maskLine(box, it.t, 'display', { fontSize: it.mint ? '70px' : '62px', color: it.mint ? 'var(--mint)' : '#fff', letterSpacing: '-0.04em' });
    const sub = it.s ? el('div', { text: it.s, style: { fontSize: '28px', fontWeight: '500', color: 'var(--muted)', marginTop: '8px', whiteSpace: 'nowrap' } }, box) : null;
    return { box, title, sub, t0: i < 4 ? T.value + 0.5 + i * 0.35 : T.free - 0.05 };
  });
}

export function update(t) {
  const on = t >= T.value + 0.4 && t < T.valueOut + 0.6;
  show(root, on);
  if (!on) return;
  items.forEach((it, i) => {
    const q = E.exit(prog(t, T.valueOut + i * 0.04, T.valueOut + 0.35 + i * 0.04));
    reveal(it.title, E.enter(prog(t, it.t0, it.t0 + 0.65)), q);
    if (it.sub) {
      op(it.sub, prog(t, it.t0 + 0.15, it.t0 + 0.45) * (1 - prog(t, T.valueOut + i * 0.04, T.valueOut + 0.2 + i * 0.04)));
      it.sub.style.transform = `translateY(${((1 - E.enter(prog(t, it.t0 + 0.1, it.t0 + 0.6))) * 14).toFixed(2)}px)`;
    }
  });
}
