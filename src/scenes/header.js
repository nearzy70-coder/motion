// Titres d'étapes (démonstration) et de la séquence valeur + mention « Visuels illustratifs ».
import { el, maskLine, reveal, show, op, tf } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { T, CONTENT_X } from '../timeline.js';

const HEADS = [
  { eb: 'Étape 01 · Le brief', l: ['On définit', 'votre besoin.'], tin: T.step1, tout: T.step2 },
  { eb: 'Étape 02 · La sélection', l: ['On sélectionne', 'les bons espaces.'], tin: T.step2, tout: T.step3 },
  { eb: 'Étape 03 · Les visites', l: ['On organise', 'les visites.'], tin: T.step3, tout: T.step4 },
  { eb: 'Étape 04 · La négociation', l: ['On négocie', 'vos conditions.'], tin: T.step4, tout: T.step5 },
  { eb: 'Étape 05 · L’emménagement', l: ['Jusqu’à la', 'remise des clés.'], tin: T.step5, tout: T.value },
  { eb: 'Desk to Desk', l: ['Un interlocuteur', 'unique.'], tin: T.value + 0.05, tout: T.valueOut },
];

let heads, caption;

export function build(ctx) {
  heads = HEADS.map((h) => {
    const root = el('div', { cls: 'abs', style: { left: CONTENT_X + 'px', top: '278px' } }, ctx.layers.top);
    const eb = el('div', { cls: 'eyebrow', text: h.eb, style: { marginBottom: '26px' } }, root);
    const lines = h.l.map((s) => maskLine(root, s, 'display', { fontSize: '82px', marginBottom: '4px' }));
    return { ...h, root, eb, lines };
  });
  caption = el('div', { cls: 'abs caption', text: 'Visuels illustratifs', style: { left: CONTENT_X + 'px', top: '1500px' } }, ctx.layers.top);
}

export function update(t) {
  heads.forEach((h) => {
    const on = t >= h.tin - 0.02 && t < h.tout + 0.1;
    show(h.root, on);
    if (!on) return;
    const ein = E.enter(prog(t, h.tin + 0.02, h.tin + 0.5));
    const eout = E.exit(prog(t, h.tout - 0.34, h.tout - 0.06));
    op(h.eb, ein * (1 - eout));
    tf(h.eb, (1 - ein) * -24, 0);
    h.lines.forEach((ln, i) => {
      const t0 = h.tin + 0.04 + i * 0.08;
      reveal(ln, E.enter(prog(t, t0, t0 + 0.7)), E.exit(prog(t, h.tout - 0.34 + i * 0.04, h.tout - 0.04 + i * 0.04)));
    });
  });
  const cOn = t >= T.step1 + 0.2 && t < T.value + 0.3;
  show(caption, cOn);
  if (cOn) op(caption, prog(t, T.step1 + 0.2, T.step1 + 0.6) * (1 - prog(t, T.value - 0.2, T.value + 0.1)));
}
