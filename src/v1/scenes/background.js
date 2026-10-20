// Fond encre + grille architecturale (module de 96 px, aligné sur le fil vertical x = 96).
import { el, svg } from '../lib/dom.js';

export function build(ctx) {
  const s = svg('svg', { width: 1080, height: 1920, viewBox: '0 0 1080 1920' }, ctx.layers.bg);
  for (let x = 96; x < 1080; x += 96) {
    svg('line', { x1: x + 0.5, y1: 0, x2: x + 0.5, y2: 1920, stroke: 'rgba(255,255,255,0.032)', 'stroke-width': 1 }, s);
  }
  for (let y = 96; y < 1920; y += 96) {
    svg('line', { x1: 0, y1: y + 0.5, x2: 1080, y2: y + 0.5, stroke: 'rgba(255,255,255,0.032)', 'stroke-width': 1 }, s);
  }
  // Vignette douce : concentre le regard au centre sans assombrir les marges utiles
  el('div', {
    cls: 'layer',
    style: { background: 'radial-gradient(130% 85% at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)' },
  }, ctx.layers.bg);
}

export function update() {}
