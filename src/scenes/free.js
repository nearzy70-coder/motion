// 8. Gratuité : une corde remonte depuis le bas et tire un store menthe sur la carte.
// « Pour le locataire, c'est gratuit.* » avec sa mention, en encre sur menthe.
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, bezier } from '../lib/ease.js';
import { T, L, W, H, pick } from '../timeline.js';

const blindEase = bezier(0.72, 0, 0.18, 1);
const CW = pick(11, 9);
const TOP_Y = pick(44, 34);
let mint, root, lead, big;

export function build(ctx) {
  mint = el('div', { cls: 'layer', style: { background: 'var(--mint)' } }, ctx.layers.mint);
  root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('600px', '190px'), color: 'var(--ink)' } }, ctx.layers.text);
  const ls = pick(84, 64);
  lead = ['Pour le locataire,', 'c’est'].map((s) => {
    const w = el('div', { cls: 'mask display', style: { fontSize: ls + 'px', fontWeight: '500', letterSpacing: '-0.035em', marginBottom: '6px' } }, root);
    return { wrap: w, inner: el('span', { text: s }, w) };
  });
  const bw = el('div', { cls: 'mask display', style: { fontSize: pick(196, 170) + 'px', letterSpacing: '-0.06em', marginTop: pick('-6px', '-4px') } }, root);
  big = { wrap: bw, inner: el('span', { html: 'gratuit.<span style="font-size:0.42em;vertical-align:0.95em;margin-left:0.04em">*</span>' }, bw) };
}

export const blindY = (t) => lerp(H + 30, TOP_Y, blindEase(prog(t, T.free, T.free + 0.55)));

export function update(t, ctx) {
  const on = t >= T.free && t < T.end;
  show(mint, on); show(root, on);
  if (!on) return;
  const y = blindY(t);
  mint.style.clipPath = `inset(${Math.max(0, y).toFixed(2)}px 0 0 0)`;
  ctx.cord.draw([[-40, y], [W + 40, y]], { width: CW, shadow: 1.4 });
  // « Pour le locataire, » / « c'est » / « gratuit.* » avec la voix (« Et pour vous, c'est gratuit »)
  [...lead, big].forEach((ln, i) => {
    const t0 = [T.free1, T.free2, T.free3][i];
    const p = E.enter(prog(t, t0, t0 + 0.75));
    ln.inner.style.transform = `translate3d(0,${((1 - p) * 135).toFixed(2)}%,0)`;
  });
}
