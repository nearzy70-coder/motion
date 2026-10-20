// Séquence 2 — Problème : les critères s'accumulent, le fil s'emmêle entre eux.
// Puis (temps fort 8,0 s) les pastilles deviennent des perles qui glissent sur le fil tendu.
import { el, maskLine, reveal, op, tf, show, ringDot } from '../lib/dom.js';
import { E, prog, lerp, tw } from '../lib/ease.js';
import { T, SPINE_X, NODE_Y } from '../timeline.js';

// Ordre = ordre de passage du fil (volontairement en zigzag)
export const CHIPS = [
  { label: 'Budget', x: 262, y: 724 },
  { label: 'Charges', x: 742, y: 1030 },
  { label: 'Quartier', x: 520, y: 862 },
  { label: 'Bureau opéré', q: true, x: 304, y: 1310 },
  { label: 'Bail 3/6/9', x: 742, y: 714 },
  { label: 'Nombre de postes', x: 290, y: 1006 },
  { label: 'Délais', x: 842, y: 1178 },
  { label: 'Surface', x: 506, y: 1160 },
  { label: 'Préavis', x: 836, y: 878 },
  { label: 'Coworking', q: true, x: 262, y: 1450 },
  { label: 'Travaux', x: 762, y: 1302 },
  { label: 'Visites', x: 600, y: 1446 },
];

export const chipTime = (k) => T.problem + T.chipStep * (k + 1);

// Caméra de la séquence : lente poussée, puis léger recul d'anticipation avant le temps fort
const CX = 540, CY = 1080;
export function camScale(t) {
  return 1 + 0.05 * E.inOutCubic(prog(t, T.problem, 7.4)) - 0.02 * E.inOutCubic(prog(t, 7.4, T.drop));
}
export function camApply(p, s) {
  return [CX + (p[0] - CX) * s, CY + (p[1] - CY) * s];
}

let head, heads, chips, beads;
const order = CHIPS.map((c, i) => i).sort((a, b) => CHIPS[a].y - CHIPS[b].y || CHIPS[a].x - CHIPS[b].x);
const rankOf = new Array(CHIPS.length);
order.forEach((ci, r) => (rankOf[ci] = r));
export const beadY = (r) => 430 + r * 96;
export const beadNode = (r) => Math.floor((r * 5) / 12);

export function build(ctx) {
  head = el('div', { cls: 'abs', style: { left: '96px', top: '292px' } }, ctx.layers.top);
  const st = { fontSize: '84px', marginBottom: '8px' };
  heads = [
    maskLine(head, '<span style="opacity:.42">Trop de</span> critères.', 'display', st),
    maskLine(head, '<span style="opacity:.42">Trop d’</span>offres.', 'display', st),
    maskLine(head, '<span style="opacity:.42">Trop peu de</span> temps.', 'display', st),
  ];

  chips = CHIPS.map((c) => {
    const e = el('div', { cls: 'chip' }, ctx.layers.chips);
    ringDot(e, 22);
    el('span', { text: c.label }, e);
    if (c.q) el('span', { cls: 'q', text: ' ?' }, e);
    const w = e.offsetWidth, h = e.offsetHeight;
    e.style.transformOrigin = '50% 50%';
    return { e, w, h };
  });
  beads = CHIPS.map(() => el('div', { cls: 'bead' }, ctx.layers.chips));
  ctx.shared.chips = CHIPS;
}

export function update(t) {
  show(head, t >= T.problem - 0.1 && t < T.drop + 0.6);
  if (t >= T.problem - 0.1 && t < T.drop + 0.6) {
    heads.forEach((ln, i) => {
      const t0 = T.problem + i * 1.0;
      reveal(ln, E.enter(prog(t, t0, t0 + 0.7)), E.exit(prog(t, T.drop + i * 0.05, T.drop + 0.4 + i * 0.05)));
    });
  }

  const s = camScale(Math.min(t, T.drop));
  chips.forEach((c, k) => {
    const tk = chipTime(k);
    const visible = t >= tk - 0.02 && t < T.drop + 1.0;
    show(c.e, visible);
    const r = rankOf[k];
    const b = beads[k];
    if (visible) {
      const pop = E.soft(prog(t, tk - 0.02, tk + 0.3));
      const [px, py] = camApply([CHIPS[k].x, CHIPS[k].y], s);
      // Vol vers le fil : chaque pastille devient une perle
      const d0 = T.drop + 0.02 * r;
      const f = E.snap(prog(t, d0, d0 + 0.62));
      const x = lerp(px, SPINE_X, f), y = lerp(py, beadY(r), f);
      const sc = (0.72 + 0.28 * pop) * lerp(1, 0.1, f);
      tf(c.e, x - c.w / 2, y - c.h / 2, sc);
      op(c.e, Math.min(1, prog(t, tk - 0.02, tk + 0.1)) * (1 - prog(t, d0 + 0.3, d0 + 0.5)));
    }
    // Perles posées sur le fil, puis regroupées en 5 étapes
    const bOn = t >= T.drop + 0.3 && t < T.list + 0.4;
    show(b, bOn);
    if (bOn) {
      const d0 = T.drop + 0.02 * r;
      const m = E.move(prog(t, T.brandOut + 0.1 + r * 0.01, T.brandOut + 0.45 + r * 0.01));
      const y = lerp(beadY(r), NODE_Y[beadNode(r)], m);
      tf(b, SPINE_X, y, 1);
      op(b, prog(t, d0 + 0.32, d0 + 0.5) * (1 - prog(t, T.list + 0.05, T.list + 0.2)));
    }
  });
}
