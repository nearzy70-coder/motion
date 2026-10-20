// Étape 1 — Cahier des charges : les critères de la pelote deviennent des lignes claires.
// Chaque valeur s'écrit, puis un coup de surligneur menthe la valide.
import { el, svg, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';

const ROWS = [
  ['Effectif', '12 postes'],
  ['Quartiers', 'Paris 2e, 9e, 10e'],
  ['Format', 'Bureau opéré'],
  ['Budget', 'défini ensemble'],
  ['Entrée', 'début 2027'],
  ['Enjeux', 'recruter, recevoir'],
];

export function build(it) {
  const s = it.sheet;
  el('div', { cls: 'abs doc-meta', text: 'Projet bureaux · exemple', style: { left: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Desk to Desk', style: { left: 'auto', right: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-title', text: 'Cahier des charges', style: { left: '56px', top: '96px', fontSize: '62px' } }, s);
  el('div', { cls: 'abs', style: { left: '56px', top: '196px', width: '688px', height: '3px', background: '#1a1a18' } }, s);
  it.rows = ROWS.map(([k, v], i) => {
    const y = 250 + i * 104;
    const row = el('div', { cls: 'abs', style: { left: '56px', top: y + 'px', width: '688px', height: '60px' } }, s);
    el('div', { cls: 'abs k', text: k, style: { top: '12px' } }, row);
    el('div', { cls: 'abs', style: { left: '150px', top: '40px', width: '200px', borderBottom: '3px dotted #c4c4bc' } }, row);
    const hl = el('div', { cls: 'abs', style: { left: 'auto', right: '-10px', top: '10px', height: '44px', background: 'rgba(42,202,165,0.42)', transformOrigin: '0 50%', borderRadius: '3px' } }, row);
    const val = el('div', { cls: 'abs v', text: v, style: { left: 'auto', right: '0px', top: '8px', fontSize: '33px' } }, row);
    el('div', { cls: 'abs', style: { top: '74px', width: '688px', height: '1.5px', background: '#e3e3dc' } }, row);
    const vw = val.offsetWidth + 20;
    Object.assign(hl.style, { width: vw + 'px', left: `${688 - vw + 10}px`, right: 'auto' });
    return { val, hl };
  });
  // Validation : coche tracée au feutre + mention
  const foot = el('div', { cls: 'abs', style: { left: '56px', top: '880px', display: 'flex', alignItems: 'center', gap: '16px' } }, s);
  const ck = svg('svg', { width: 54, height: 54, viewBox: '0 0 54 54' }, foot);
  svg('circle', { cx: 27, cy: 27, r: 24, fill: 'none', stroke: '#2ACAA5', 'stroke-width': 4 }, ck);
  it.check = svg('path', { d: 'M15 28 L24 37 L40 18', fill: 'none', stroke: '#1a1a18', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, ck);
  it.ckTxt = el('div', { text: 'Validé avec votre conseiller', style: { fontSize: '27px', fontWeight: '600', color: '#1a1a18' } }, foot);
  it.ckWrap = foot;
}

export function update(it, tl) {
  it.rows.forEach((r, i) => {
    const t0 = 0.25 + i * 0.3;
    // Écriture de gauche à droite
    const w = E.outCubic(prog(tl, t0, t0 + 0.32));
    r.val.style.clipPath = `inset(-10px ${((1 - w) * 100).toFixed(2)}% -10px -6px)`;
    // Surligneur, juste après l'écriture
    const h = E.inOutCubic(prog(tl, t0 + 0.22, t0 + 0.5));
    r.hl.style.transform = `scaleX(${h.toFixed(4)})`;
  });
  const c = prog(tl, 2.3, 2.75);
  it.check.setAttribute('stroke-dashoffset', (1 - E.inOutCubic(c)).toFixed(4));
  op(it.ckWrap, prog(tl, 2.2, 2.4));
}
