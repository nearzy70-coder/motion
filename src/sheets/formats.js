// Fiches « format » : coworking, bureau opéré, bail commercial (notions générales du marché).
// Pictogrammes au trait, comme sur un plan d'architecte ; l'accent menthe désigne l'espace loué.
import { el, svg, op } from '../lib/dom.js';
import { E, prog } from '../lib/ease.js';

const INK = '#1a1a18', MINT = '#2ACAA5';

const DATA = {
  coworking: {
    n: 'Format 1/3', title: 'Coworking',
    body: 'Des postes flexibles dans un espace partagé, à la carte.',
    pic(s) {
      // Grandes tables partagées, postes occupés en menthe
      for (const y of [30, 110]) {
        svg('rect', { x: 20, y, width: 300, height: 34, rx: 4, fill: 'none', stroke: INK, 'stroke-width': 3 }, s);
        for (let k = 0; k < 6; k++) {
          const cx = 45 + k * 50;
          svg('circle', { cx, cy: y - 12, r: 9, fill: k % 2 ? MINT : 'none', stroke: INK, 'stroke-width': 2.5 }, s);
          svg('circle', { cx, cy: y + 46, r: 9, fill: k === 2 || k === 5 ? MINT : 'none', stroke: INK, 'stroke-width': 2.5 }, s);
        }
      }
    },
  },
  opere: {
    n: 'Format 2/3', title: 'Bureau opéré',
    body: 'Des bureaux privatifs, clés en main : services inclus, un seul contrat.',
    pic(s) {
      // Un plateau découpé en bureaux ; le vôtre en menthe ; services communs hachurés
      svg('rect', { x: 20, y: 10, width: 300, height: 150, fill: 'none', stroke: INK, 'stroke-width': 3 }, s);
      svg('rect', { x: 20, y: 10, width: 120, height: 80, fill: MINT, 'fill-opacity': 0.85, stroke: INK, 'stroke-width': 3 }, s);
      for (const x of [140, 230]) svg('line', { x1: x, y1: 10, x2: x, y2: 90, stroke: INK, 'stroke-width': 3 }, s);
      svg('line', { x1: 20, y1: 90, x2: 320, y2: 90, stroke: INK, 'stroke-width': 3 }, s);
      for (let k = 0; k < 9; k++) svg('line', { x1: 200 + k * 14, y1: 160, x2: 230 + k * 14, y2: 112, stroke: INK, 'stroke-width': 1.5, 'stroke-opacity': 0.5 }, s);
      svg('path', { d: 'M52 118 h34 v26 a10 10 0 0 1 -10 10 h-14 a10 10 0 0 1 -10 -10 z M86 124 h8 a6 6 0 0 1 0 14 h-8', fill: 'none', stroke: INK, 'stroke-width': 2.5 }, s);
    },
  },
  bail: {
    n: 'Format 3/3', title: 'Bail commercial',
    body: 'Vos propres locaux, aménagés à votre image, avec un bail 3/6/9.',
    pic(s) {
      // Plateau nu, cotes d'architecte
      svg('rect', { x: 30, y: 20, width: 280, height: 120, fill: MINT, 'fill-opacity': 0.18, stroke: INK, 'stroke-width': 3 }, s);
      svg('path', { d: 'M30 160 H310 M30 154 V166 M310 154 V166', stroke: INK, 'stroke-width': 2 }, s);
      svg('path', { d: 'M8 20 V140 M2 20 H14 M2 140 H14', stroke: INK, 'stroke-width': 2 }, s);
      svg('path', { d: 'M150 20 v-0 M150 140 a40 40 0 0 1 40 -40', fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-dasharray': '5 4' }, s);
      svg('line', { x1: 150, y1: 140, x2: 190, y2: 140, stroke: 'none' }, s);
    },
  },
};

export function build(it) {
  const d = DATA[it.id];
  const s = it.sheet;
  el('div', { cls: 'abs doc-meta', text: d.n, style: { left: '56px', top: '50px' } }, s);
  el('div', { cls: 'abs doc-meta', text: 'Desk to Desk', style: { left: 'auto', right: '56px', top: '50px' } }, s);
  const pic = svg('svg', { width: 340, height: 175, viewBox: '0 0 340 175', style: 'position:absolute;left:52px;top:120px;overflow:visible' }, s);
  d.pic(pic);
  it.pic = pic;
  it.title = el('div', { cls: 'abs doc-title', text: d.title, style: { left: '56px', top: '342px', fontSize: '76px' } }, s);
  it.body = el('div', { cls: 'abs', text: d.body, style: { left: '56px', top: '460px', width: '660px', fontSize: '34px', lineHeight: '1.32', color: '#3a3b37', whiteSpace: 'normal' } }, s);
}

export function update(it, tl) {
  // Le contenu se « pose » un peu après l'arrivée de la caméra : pictogramme, titre, texte
  const a = E.enter(prog(tl, -0.25, 0.45));
  op(it.pic, prog(tl, -0.3, 0.1));
  it.pic.style.transform = `translateY(${((1 - a) * 18).toFixed(2)}px)`;
  const b = E.enter(prog(tl, -0.15, 0.55));
  it.title.style.transform = `translateY(${((1 - b) * 22).toFixed(2)}px)`;
  op(it.title, prog(tl, -0.15, 0.15));
  const c = E.enter(prog(tl, 0.05, 0.75));
  it.body.style.transform = `translateY(${((1 - c) * 18).toFixed(2)}px)`;
  op(it.body, prog(tl, 0.05, 0.35));
}
