// Petits utilitaires DOM pour une mise à jour image par image sans effets de bord.

const NS = 'http://www.w3.org/2000/svg';

export function el(tag, opts = {}, parent) {
  const e = document.createElement(tag);
  if (opts.cls) e.className = opts.cls;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.html != null) e.innerHTML = opts.html;
  if (opts.style) Object.assign(e.style, opts.style);
  if (parent) parent.appendChild(e);
  return e;
}

export function svg(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export function show(e, on) {
  const v = on ? '' : 'none';
  if (e.style.display !== v) e.style.display = v;
}

export function op(e, v) {
  e.style.opacity = Math.max(0, Math.min(1, v)).toFixed(4);
}

export function tf(e, x = 0, y = 0, s = 1, r = 0) {
  e.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(4)})${r ? ` rotate(${r.toFixed(3)}deg)` : ''}`;
}

// Ligne de texte révélée par masque (montée dans son cadre)
export function maskLine(parent, text, cls = '', style = {}) {
  const wrap = el('div', { cls: 'mask ' + cls, style }, parent);
  const inner = el('span', { html: text }, wrap);
  return { wrap, inner };
}

// p : 0 → caché sous le masque, 1 → en place ; q : sortie vers le haut (0 → 1)
export function reveal(line, p, q = 0) {
  const y = (1 - p) * 135 - q * 135;
  line.inner.style.transform = `translate3d(0,${y.toFixed(2)}%,0)`;
}

// Pastille « point cerclé » (motif de nœud / repère)
export function ringDot(parent, size, color = 'var(--mint)') {
  const r = el('div', { cls: 'ringdot', style: { width: size + 'px', height: size + 'px', borderColor: color } }, parent);
  el('div', { cls: 'ringdot-core', style: { background: color } }, r);
  return r;
}

export function checkIcon(size = 28, stroke = '#111111', width = 3) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
