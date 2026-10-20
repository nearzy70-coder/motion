// 9. Conclusion, calée sur la signature de la voix :
// « Vous développez votre entreprise. » puis la corde se rétracte en un point qui écrit
// « Desk to Desk / s'occupe du reste » et devient son point final ; « Parlez à un conseiller » ; l'adresse du site.
import { el, show, op, tf } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { T, L, W, pick } from '../timeline.js';

let root, word, word2, base2, dotSlot, vous, cta, arrow, url, freeLine, foot, logoImg, box1, box2, dot, y1;
const CW = pick(11, 9);

export async function build(ctx) {
  // « Vous développez / votre entreprise. »
  const vs = Math.round(L.hookSize * 0.84);
  const vroot = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('760px', '372px') } }, ctx.layers.text);
  vous = ['Vous développez', 'votre entreprise.'].map((s) => {
    const w = el('div', { cls: 'mask display', style: { fontSize: vs + 'px', letterSpacing: '-0.05em', marginBottom: '4px' } }, vroot);
    return { wrap: w, inner: el('span', { text: s }, w) };
  });
  vous.root = vroot;

  // Signature : « Desk to Desk » (ou le logo officiel) puis « s'occupe du reste » et le point menthe
  root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('600px', '214px') } }, ctx.layers.text);
  logoImg = await tryLogo(root);
  const ws = pick(156, 128);
  word = el('div', { cls: 'display', style: { fontSize: ws + 'px', letterSpacing: '-0.055em', display: logoImg ? 'none' : 'inline-block' } }, root);
  el('span', { text: 'Desk to Desk' }, word);
  const w2s = pick(88, 70);
  const l2 = el('div', { style: { marginTop: pick('18px', '12px') } }, root);
  word2 = el('div', { cls: 'display', style: { fontSize: w2s + 'px', fontWeight: '500', letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.94)', display: 'inline-block' } }, l2);
  el('span', { text: 's’occupe du reste' }, word2);
  dotSlot = el('span', { text: '.', style: { visibility: 'hidden' } }, word2);
  base2 = el('span', { style: { display: 'inline-block', width: '0px', height: '0px', verticalAlign: 'baseline' } }, word2);
  const base1 = el('span', { style: { display: 'inline-block', width: '0px', height: '0px', verticalAlign: 'baseline' } }, word);

  cta = el('div', {
    style: {
      marginTop: pick('70px', '46px'), display: 'inline-flex', alignItems: 'center', gap: '20px',
      height: pick('112px', '92px'), padding: pick('0 48px 0 52px', '0 40px 0 44px'), borderRadius: '999px',
      background: 'var(--mint)', color: 'var(--ink)', fontSize: pick('40px', '34px'), fontWeight: '700', letterSpacing: '-0.01em',
      transformOrigin: '0 50%', whiteSpace: 'nowrap',
    },
  }, el('div', {}, root));
  el('span', { text: 'Parler à un conseiller' }, cta);
  arrow = el('span', { html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { display: 'flex' } }, cta);
  url = el('div', { text: 'desk-to-desk.com', style: { marginTop: pick('32px', '22px'), fontSize: pick('38px', '32px'), fontWeight: '600' } }, root);
  freeLine = el('div', { html: 'Accompagnement gratuit pour le locataire<span style="color:var(--mint)">*</span>', style: { marginTop: '14px', fontSize: pick('30px', '25px'), fontWeight: '500', color: 'rgba(255,255,255,0.72)' } }, root);

  foot = el('div', {
    html: '*Commission payée par le propriétaire. Certaines offres,<br>en général en bail commercial, peuvent faire exception.',
    style: { position: 'absolute', left: L.mx + 'px', top: pick('1446px', '972px'), fontSize: pick('22px', '19px'), lineHeight: '1.4', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' },
  }, ctx.layers.text);
  ctx.shared.foot = foot;

  // Le point écrit la ligne 1 sur sa ligne de base, saute à la ligne 2 et s'y pose comme point final
  const r = w2s * 0.085;
  box1 = ctx.measure(logoImg || word);
  box2 = ctx.measure(word2);
  const d = ctx.measure(dotSlot), b2 = ctx.measure(base2), b1 = ctx.measure(logoImg ? logoImg : base1);
  y1 = logoImg ? box1.y + box1.h / 2 : b1.y - CW / 2;
  dot = { x: d.x + d.w * 0.5, y: b2.y - r, r };
  box2.end = d.x;
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

// Trajet du point : ligne 1 → retour à la ligne → ligne 2 → point final
function dotAt(t) {
  const x1a = box1.x, x1b = box1.x + box1.w + 6;
  if (t < T.line2 - 0.1) return [lerp(x1a, x1b, E.inOutCubic(prog(t, T.write, T.line2 - 0.1))), y1];
  if (t < T.line2) {
    const u = E.inOutCubic(prog(t, T.line2 - 0.1, T.line2));
    return [lerp(x1b, box2.x, u), lerp(y1, dot.y, u) - Math.sin(Math.PI * u) * 18];
  }
  return [lerp(box2.x, dot.x, E.inOutCubic(prog(t, T.line2, T.dot))), dot.y];
}

export function update(t, ctx) {
  // Mention : dès la gratuité (sur menthe, en encre), puis sur la carte de fin
  show(foot, t >= T.free + 0.9);
  foot.style.color = t < T.end ? 'rgba(17,17,17,0.66)' : 'rgba(255,255,255,0.5)';
  op(foot, t < T.end ? prog(t, T.free + 0.9, T.free + 1.3) : 1);
  const on = t >= T.end;
  show(root, on);
  show(vous.root, on && t < T.write + 0.1);
  if (!on) return;

  // « Vous développez votre entreprise. », mot à mot avec la voix
  vous.forEach((ln, i) => {
    const t0 = i ? T.vous2 : T.vous1;
    const p = E.enter(prog(t, t0, t0 + 0.7)), q = E.exit(prog(t, T.vousOut + i * 0.05, T.vousOut + 0.28 + i * 0.05));
    ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
  });

  // La corde se tend au-dessus de la phrase, puis s'enroule vers la gauche et devient un point
  if (t < T.write) {
    const rIn = lerp(-60, W + 60, E.inOutCubic(prog(t, T.end + 0.05, T.end + 0.6)));
    const rEnd = Math.min(rIn, lerp(W + 60, box1.x, E.inOutCubic(prog(t, T.vousOut - 0.15, T.write - 0.06))));
    const lEnd = lerp(-60, box1.x, E.inOutCubic(prog(t, T.vousOut, T.write)));
    if (rEnd - lEnd > 2) ctx.cord.draw([[lEnd, y1], [rEnd, y1]], { width: CW });
  }
  // Le point écrit la signature, puis se pose en point final
  const g = ctx.cord.g;
  const [x, y] = dotAt(t);
  if (t >= T.write - 0.08) {
    const grow = E.soft(prog(t, T.dot - 0.05, T.dot + 0.25));
    const r = lerp(CW / 2, dot.r, grow);
    g.save();
    g.fillStyle = '#2ACAA5';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  const line1 = logoImg || word;
  const w1 = t < T.line2 - 0.1 ? Math.max(0, x - box1.x + 8) : box1.w + 40;
  line1.style.clipPath = `inset(-30% ${Math.max(0, box1.w - w1).toFixed(1)}px -30% -20px)`;
  tf(line1, 0, (1 - E.enter(prog(t, T.write, T.write + 0.6))) * 18);
  op(line1, Math.min(1, prog(t, T.write, T.write + 0.12)));
  const w2 = t < T.line2 ? 0 : Math.max(0, x - box2.x + 6);
  word2.style.clipPath = `inset(-30% ${Math.max(0, box2.end - box2.x - w2).toFixed(1)}px -30% -20px)`;
  tf(word2, 0, (1 - E.enter(prog(t, T.line2, T.line2 + 0.6))) * 14);
  op(word2, prog(t, T.line2, T.line2 + 0.1));

  const c = E.enter(prog(t, T.cta, T.cta + 0.6));
  tf(cta, 0, (1 - c) * 28, 0.94 + 0.06 * c);
  op(cta, prog(t, T.cta, T.cta + 0.25));
  const nudge = Math.sin(Math.PI * prog(t, T.url + 0.9, T.url + 1.4)) + Math.sin(Math.PI * prog(t, T.url + 2.1, T.url + 2.6));
  arrow.style.transform = `translateX(${(nudge * 9).toFixed(2)}px)`;
  op(url, prog(t, T.url, T.url + 0.3));
  tf(url, 0, (1 - E.enter(prog(t, T.url, T.url + 0.6))) * 18);
  op(freeLine, prog(t, T.url + 0.3, T.url + 0.6));
  tf(freeLine, 0, (1 - E.enter(prog(t, T.url + 0.3, T.url + 0.9))) * 18);
}
