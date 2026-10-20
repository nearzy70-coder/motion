// Étape 4 — La négociation : le contrat est annoté au feutre menthe (loyer, charges, travaux, durée),
// puis un coup de tampon « Négocié » tombe sur le temps fort. Document illustratif.
import { el, svg, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';
import { inkMask } from '../lib/texture.js';
import { T } from '../timeline.js';

const CLAUSES = [['Art. 3', 'Loyer'], ['Art. 4', 'Charges'], ['Art. 7', 'Travaux'], ['Art. 9', 'Durée']];
const STAMP_AT = T.stamp - T.s4; // juste après « durée », dans la voix

export function build(it) {
  const s = it.sheet;
  el('div', { cls: 'abs doc-meta', text: 'Bureaux · Paris 2e · exemple', style: { left: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Desk to Desk', style: { left: 'auto', right: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-title', text: 'Contrat de location', style: { left: '56px', top: '84px', fontSize: '58px' } }, s);
  const bars = (x, y, ws) => ws.forEach((w, k) => el('div', { cls: 'abs', style: { left: x + 'px', top: y + k * 26 + 'px', width: w + 'px', height: '10px', borderRadius: '5px', background: '#dcdcd5' } }, s));
  bars(56, 180, [520, 600, 360]);
  it.clauses = CLAUSES.map(([a, b], i) => {
    const y = 290 + i * 132;
    el('div', { cls: 'abs', text: a, style: { left: '56px', top: y + 'px', fontSize: '24px', fontWeight: '600', color: '#8b8c85' } }, s);
    const title = el('div', { cls: 'abs', text: b, style: { left: '150px', top: y - 6 + 'px', fontSize: '34px', fontWeight: '700', color: '#1a1a18' } }, s);
    bars(150, y + 48, [560, 470]);
    // Soulignement au feutre (léger tremblé, tracé à la main)
    const u = svg('svg', { width: 260, height: 24, viewBox: '0 0 260 24', style: `position:absolute;left:144px;top:${y + 34}px;overflow:visible` }, s);
    const path = svg('path', { d: 'M4 14 C 60 8, 120 16, 180 10 S 240 12, 254 9', fill: 'none', stroke: '#2ACAA5', 'stroke-width': 6, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, u);
    // Coche dans la marge
    const ck = svg('svg', { width: 40, height: 40, viewBox: '0 0 40 40', style: `position:absolute;left:700px;top:${y - 6}px;overflow:visible` }, s);
    const cp = svg('path', { d: 'M6 21 L15 30 L34 8', fill: 'none', stroke: '#2ACAA5', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, ck);
    return { title, path, cp };
  });
  el('div', { cls: 'abs', style: { left: '56px', top: '850px', width: '300px', height: '2px', background: '#1a1a18' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Signature du preneur', style: { left: '56px', top: '862px' } }, s);

  // Tampon encreur
  const stamp = el('div', {
    cls: 'abs',
    style: {
      left: '352px', top: '730px', padding: '14px 30px', border: '7px solid #1C9E80', borderRadius: '14px',
      color: '#1C9E80', fontFamily: 'Parkinsans', fontWeight: '700', fontSize: '64px', letterSpacing: '0.06em', textTransform: 'uppercase',
      transformOrigin: '50% 50%', mixBlendMode: 'multiply',
      WebkitMaskImage: `url(${inkMask()})`, WebkitMaskSize: '100% 100%', maskImage: `url(${inkMask()})`, maskSize: '100% 100%',
    },
    text: 'Négocié',
  }, s);
  it.stamp = stamp;
}

export function update(it, tl) {
  it.clauses.forEach((c, i) => {
    const t0 = T.clauses[i] - T.s4;
    c.path.setAttribute('stroke-dashoffset', (1 - E.inOutCubic(prog(tl, t0, t0 + 0.35))).toFixed(4));
    c.cp.setAttribute('stroke-dashoffset', (1 - E.inOutCubic(prog(tl, t0 + 0.25, t0 + 0.45))).toFixed(4));
  });
  // Coup de tampon : arrive de haut, écrase, se fige ; la feuille encaisse le choc
  const a = prog(tl, STAMP_AT - 0.1, STAMP_AT);
  const settle = prog(tl, STAMP_AT, STAMP_AT + 0.2);
  const sc = tl < STAMP_AT ? 1.6 - 0.6 * E.inCubic(a) : 1 + 0.035 * Math.sin(Math.PI * settle) * (1 - settle);
  it.stamp.style.transform = `rotate(-9deg) scale(${sc.toFixed(4)})`;
  op(it.stamp, tl < STAMP_AT - 0.1 ? 0 : tl < STAMP_AT ? 0.25 * a : 0.92);
  const jolt = tl >= STAMP_AT ? Math.exp(-(tl - STAMP_AT) * 14) * Math.sin((tl - STAMP_AT) * 60) : 0;
  it.sheet.style.transform = `translateY(${(jolt * 5).toFixed(2)}px)`;
}
