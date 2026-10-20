// 9. Conclusion : la corde se rétracte en un point qui écrit « Desk to Desk » et devient son point final.
import { el, show, op, tf } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { T, L, W, pick } from '../timeline.js';

let root, word, base, dotSlot, lines, cta, arrow, url, freeLine, foot, logoImg, wordBox, dot;
const CW = pick(11, 9);

export async function build(ctx) {
  root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('600px', '214px') } }, ctx.layers.text);
  logoImg = await tryLogo(root);
  const ws = pick(156, 128);
  word = el('div', { cls: 'display', style: { fontSize: ws + 'px', letterSpacing: '-0.055em', display: logoImg ? 'none' : 'inline-block' } }, root);
  el('span', { text: 'Desk to Desk' }, word);
  dotSlot = el('span', { text: '.', style: { visibility: 'hidden' } }, word);
  base = el('span', { style: { display: 'inline-block', width: '0px', height: '0px', verticalAlign: 'baseline' } }, word);

  const block = el('div', { style: { marginTop: pick('44px', '30px') } }, root);
  const hs = pick(58, 46);
  lines = ['Trouvons vos futurs bureaux', 'aux meilleures conditions.'].map((s) => {
    const ln = el('div', { cls: 'display', style: { fontSize: hs + 'px', fontWeight: '500', letterSpacing: '-0.035em', lineHeight: '1.12', color: 'rgba(255,255,255,0.94)' } }, block);
    return s.split(' ').map((w, i, a) => {
      const sp = el('span', { cls: 'word', text: w }, ln);
      if (i < a.length - 1) ln.appendChild(document.createTextNode(' '));
      return sp;
    });
  }).flat();

  cta = el('div', {
    style: {
      marginTop: pick('62px', '40px'), display: 'inline-flex', alignItems: 'center', gap: '20px',
      height: pick('112px', '92px'), padding: pick('0 48px 0 52px', '0 40px 0 44px'), borderRadius: '999px',
      background: 'var(--mint)', color: 'var(--ink)', fontSize: pick('40px', '34px'), fontWeight: '700', letterSpacing: '-0.01em',
      transformOrigin: '0 50%', whiteSpace: 'nowrap',
    },
  }, root);
  el('span', { text: 'Parler à un conseiller' }, cta);
  arrow = el('span', { html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { display: 'flex' } }, cta);
  url = el('div', { text: 'desk-to-desk.com', style: { marginTop: pick('32px', '22px'), fontSize: pick('38px', '32px'), fontWeight: '600' } }, root);
  freeLine = el('div', { html: 'Accompagnement gratuit pour le locataire<span style="color:var(--mint)">*</span>', style: { marginTop: '14px', fontSize: pick('30px', '25px'), fontWeight: '500', color: 'rgba(255,255,255,0.72)' } }, root);

  foot = el('div', {
    html: '*Commission payée par le propriétaire. Certaines offres,<br>en général en bail commercial, peuvent faire exception.',
    style: { position: 'absolute', left: L.mx + 'px', top: pick('1446px', '972px'), fontSize: pick('22px', '19px'), lineHeight: '1.4', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' },
  }, ctx.layers.text);
  ctx.shared.foot = foot;

  if (logoImg) {
    const l = ctx.measure(logoImg);
    dot = { x: l.x + l.w + 28, y: l.y + l.h / 2, r: 0 };
    wordBox = l;
  } else {
    const d = ctx.measure(dotSlot), b = ctx.measure(base);
    const r = ws * 0.068;
    dot = { x: d.x + d.w * 0.5, y: b.y - r, r };
    wordBox = ctx.measure(word);
  }
  ctx.shared.dot = dot;
}

async function tryLogo(parent) {
  try {
    const r = await fetch('../public/assets/logo.svg', { method: 'HEAD' });
    if (!r.ok) return null;
    const img = el('img', { style: { height: pick('120px', '100px'), display: 'block' } }, parent);
    img.src = '../public/assets/logo.svg';
    await img.decode();
    return img;
  } catch { return null; }
}

const dotX = (t) => lerp(L.mx, dot.x, E.inOutCubic(prog(t, T.write, T.dot)));

export function update(t, ctx) {
  // Mention : dès la gratuité (sur menthe, en encre), puis sur la carte de fin
  show(foot, t >= T.free + 0.9);
  foot.style.color = t < T.end ? 'rgba(17,17,17,0.66)' : 'rgba(255,255,255,0.5)';
  op(foot, t < T.end ? prog(t, T.free + 0.9, T.free + 1.3) : 1);
  const on = t >= T.end;
  show(root, on);
  if (!on) return;

  // La corde, tendue en travers de l'image, est enroulée vers la gauche puis devient un point
  if (t < T.write) {
    const rEnd = lerp(W + 60, L.mx, E.inOutCubic(prog(t, T.end + 0.1, T.write - 0.08)));
    const lEnd = lerp(-60, L.mx, E.inOutCubic(prog(t, T.end + 0.35, T.write)));
    if (rEnd - lEnd > 2) ctx.cord.draw([[lEnd, dot.y], [rEnd, dot.y]], { width: CW });
  }
  // Le point écrit la signature, puis se pose
  const g = ctx.cord.g;
  if (t >= T.write - 0.08) {
    const x = dotX(t);
    const grow = E.soft(prog(t, T.dot - 0.05, T.dot + 0.25));
    const r = lerp(CW / 2, dot.r || CW / 2, grow) * (logoImg ? 1 - prog(t, T.dot, T.dot + 0.3) : 1);
    if (r > 0.2) {
      g.save();
      g.fillStyle = '#2ACAA5';
      g.beginPath(); g.arc(x, dot.y, r, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  const visibleW = Math.max(0, dotX(t) - wordBox.x + 8);
  const clip = `inset(-30% ${Math.max(0, wordBox.w - visibleW).toFixed(1)}px -30% -20px)`;
  (logoImg || word).style.clipPath = clip;
  const rise = E.enter(prog(t, T.write, T.dot + 0.25));
  tf(logoImg || word, 0, (1 - rise) * 22);
  op(logoImg || word, Math.min(1, prog(t, T.write, T.write + 0.12)));

  lines.forEach((w, k) => {
    const t0 = T.dot + 0.2 + k * 0.06;
    const p = E.enter(prog(t, t0, t0 + 0.6));
    w.style.transform = `translate3d(0,${((1 - p) * 0.45).toFixed(3)}em,0)`;
    w.style.opacity = Math.min(1, prog(t, t0, t0 + 0.25)).toFixed(3);
  });
  const c = E.enter(prog(t, T.cta, T.cta + 0.6));
  tf(cta, 0, (1 - c) * 28, 0.94 + 0.06 * c);
  op(cta, prog(t, T.cta, T.cta + 0.25));
  const nudge = Math.sin(Math.PI * prog(t, T.cta + 2.5, T.cta + 3.0)) + Math.sin(Math.PI * prog(t, T.cta + 3.75, T.cta + 4.25));
  arrow.style.transform = `translateX(${(nudge * 9).toFixed(2)}px)`;
  op(url, prog(t, T.cta + 0.2, T.cta + 0.5));
  tf(url, 0, (1 - E.enter(prog(t, T.cta + 0.2, T.cta + 0.8))) * 18);
  op(freeLine, prog(t, T.cta + 0.35, T.cta + 0.65));
  tf(freeLine, 0, (1 - E.enter(prog(t, T.cta + 0.35, T.cta + 0.95))) * 18);
}
