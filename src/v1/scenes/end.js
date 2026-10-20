// Séquence 6 — Conclusion : le fil devient le point final de « Desk to Desk. »
// Accroche officielle du site, appel à l'action, mention sur la commission.
import { el, maskLine, reveal, op, tf, show } from '../lib/dom.js';
import { E, prog, inOut } from '../lib/ease.js';
import { T } from '../timeline.js';
import { dotX } from './thread.js';

let root, word, wordText, dotSlot, lines, cta, arrow, url, free, foot, logoImg;
let wordBox;

export async function build(ctx) {
  root = el('div', { cls: 'abs', style: { left: '96px', top: '612px' } }, ctx.layers.top);

  // Logo officiel : si public/assets/logo.svg est fourni, il remplace la signature typographique
  logoImg = await tryLogo(root);

  word = el('div', { cls: 'display', style: { fontSize: '156px', letterSpacing: '-0.055em', position: 'relative', display: logoImg ? 'none' : 'inline-block' } }, root);
  wordText = el('span', { text: 'Desk to Desk' }, word);
  dotSlot = el('span', { text: '.', style: { visibility: 'hidden' } }, word);
  const base = el('span', { style: { display: 'inline-block', width: '0px', height: '0px', verticalAlign: 'baseline' } }, word);

  const block = el('div', { style: { marginTop: '46px' } }, root);
  const st = { fontSize: '58px', fontWeight: '500', letterSpacing: '-0.035em', marginBottom: '6px', color: 'rgba(255,255,255,0.94)' };
  lines = [
    maskLine(block, 'Trouvons vos futurs bureaux', 'display', st),
    maskLine(block, 'aux meilleures conditions.', 'display', st),
  ];

  cta = el('div', {
    style: {
      marginTop: '64px', display: 'inline-flex', alignItems: 'center', gap: '22px',
      height: '112px', padding: '0 48px 0 52px', borderRadius: '56px',
      background: 'var(--mint)', color: 'var(--ink)', fontSize: '40px', fontWeight: '700', letterSpacing: '-0.01em',
      transformOrigin: '0 50%', whiteSpace: 'nowrap',
    },
  }, root);
  el('span', { text: 'Parler à un conseiller' }, cta);
  arrow = el('span', { html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { display: 'flex' } }, cta);

  url = el('div', { text: 'desk-to-desk.com', style: { marginTop: '34px', fontSize: '38px', fontWeight: '600', letterSpacing: '0.005em' } }, root);
  free = el('div', { html: 'Accompagnement gratuit pour le locataire<span style="color:var(--mint)">*</span>', style: { marginTop: '18px', fontSize: '30px', fontWeight: '500', color: 'rgba(255,255,255,0.72)' } }, root);

  foot = el('div', {
    html: '*Commission payée par le propriétaire. Certaines offres,<br>en général en bail commercial, peuvent faire exception.',
    style: { position: 'absolute', left: '96px', top: '1440px', fontSize: '22px', lineHeight: '1.4', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' },
  }, ctx.layers.top);

  // Mesures (avant toute transformation)
  if (logoImg) {
    // Avec le logo officiel, le point du fil vient se poser juste après lui puis s'efface
    const l = ctx.measure(logoImg);
    ctx.shared.dot = { x: l.x + l.w + 28, y: l.y + l.h / 2, r: 0 };
    wordBox = l;
  } else {
    const d = ctx.measure(dotSlot), b = ctx.measure(base);
    const r = 156 * 0.068;
    ctx.shared.dot = { x: d.x + d.w * 0.5, y: b.y - r, r };
    wordBox = ctx.measure(word);
  }
}

async function tryLogo(parent) {
  try {
    const r = await fetch('../public/assets/logo.svg', { method: 'HEAD' });
    if (!r.ok) return null;
    const img = el('img', { style: { height: '120px', display: 'block' } }, parent);
    img.src = '../public/assets/logo.svg';
    await img.decode();
    return img;
  } catch { return null; }
}

export function update(t, ctx) {
  const on = t >= T.end;
  show(root, on);
  show(foot, t >= T.free);
  op(foot, prog(t, T.free + 0.15, T.free + 0.5));
  if (!on) return;

  // Signature écrite par le point : révélation de gauche à droite synchronisée avec le fil
  const x = dotX(t);
  const visibleW = Math.max(0, x - wordBox.x + 8);
  const clipR = Math.max(0, wordBox.w - visibleW);
  word.style.clipPath = `inset(-30% ${clipR.toFixed(1)}px -30% -20px)`;
  const rise = E.enter(prog(t, T.end + 0.45, T.dot + 0.2));
  tf(word, 0, (1 - rise) * 26, 1);
  op(word, Math.min(1, prog(t, T.end + 0.45, T.end + 0.6)));
  if (logoImg) {
    logoImg.style.clipPath = word.style.clipPath;
    op(logoImg, Math.min(1, prog(t, T.end + 0.45, T.end + 0.6)));
  }

  lines.forEach((ln, i) => reveal(ln, E.enter(prog(t, T.dot + 0.15 + i * 0.1, T.dot + 0.85 + i * 0.1))));

  const c = E.enter(prog(t, T.cta, T.cta + 0.6));
  tf(cta, 0, (1 - c) * 30, 0.94 + 0.06 * c);
  op(cta, prog(t, T.cta, T.cta + 0.25));
  // Invitation discrète : la flèche avance deux fois, synchronisée sur la mesure
  const nudge = Math.sin(Math.PI * prog(t, 31.0, 31.5)) + Math.sin(Math.PI * prog(t, 32.0, 32.5));
  arrow.style.transform = `translateX(${(nudge * 8).toFixed(2)}px)`;

  op(url, prog(t, T.cta + 0.2, T.cta + 0.5));
  tf(url, 0, (1 - E.enter(prog(t, T.cta + 0.2, T.cta + 0.8))) * 20);
  op(free, prog(t, T.cta + 0.35, T.cta + 0.65));
  tf(free, 0, (1 - E.enter(prog(t, T.cta + 0.35, T.cta + 0.95))) * 20);
}
