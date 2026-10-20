// Ouverture « enquête » (0 à 15,25 s).
// Gros plan sur une fiche punaisée : « Trouver des bureaux, c'est simple. » ; sur « Enfin… », la caméra recule :
// ce n'est qu'un papier sur un grand tableau noir. Sur « très vite, tout s'emmêle », les critères sont punaisés un à
// un, au moment où la voix les dit, reliés par des fils menthe : un vrai tableau d'enquête. Avant le drop, on tire le
// fil : les punaises sautent l'une après l'autre, les fiches tombent, le tableau se vide, il ne reste qu'un fil droit.
import { el, svg, show, op } from '../lib/dom.js';
import { E, prog, lerp, bezier, rng } from '../lib/ease.js';
import { paperTexture } from '../lib/texture.js';
import { T, L, W, H, pick } from '../timeline.js';

const THREAD_W = pick(7, 6);
const INK = '#1a1a18';
const pullEase = bezier(0.76, 0, 0.2, 1);

// Caméra : (cx, cy) centre visé dans le monde, z zoom
const CAM_END = { cx: 0, cy: 120, z: 0.48 };
function cam(t) {
  // Gros plan sur la fiche, recul franc sur « Enfin… », puis le tableau se remplit et la caméra s'éloigne encore
  let c = { cx: 0, cy: 10, z: lerp(1.08, 1.12, prog(t, 0, T.strike)) };
  const back = pullEase(prog(t, T.strike - 0.12, T.strike + 0.6));
  c = { cx: 0, cy: lerp(10, 110, back), z: lerp(c.z, 0.56, back) };
  const fill = E.inOutCubic(prog(t, T.fall, T.thread));
  c = { cx: lerp(c.cx, CAM_END.cx, fill), cy: lerp(c.cy, CAM_END.cy, fill), z: lerp(c.z, CAM_END.z, fill) };
  // Petit pas de caméra vers chaque fiche épinglée (le regard suit l'action)
  let dx = 0, dy = 0;
  for (const it of items) {
    const u = prog(t, it.t - 0.05, it.t + 0.5) * (1 - prog(t, it.t + 0.6, it.t + 1.4));
    dx += (it.x - c.cx) * 0.06 * E.inOutCubic(u);
    dy += (it.y - c.cy) * 0.06 * E.inOutCubic(u);
  }
  return { cx: c.cx + dx, cy: c.cy + dy, z: c.z };
}
const toScreen = (c, x, y) => [(x - c.cx) * c.z + W / 2, (y - c.cy) * c.z + H / 2];

// Fiches du tableau, dans l'ordre de la voix ; positions données à l'écran pour la caméra finale
const ITEMS = [
  { kind: 'note', text: 'Charges ?', s: [118, 575] },
  { kind: 'note', text: 'Nombre de postes', s: [968, 540] },
  { kind: 'card', title: 'Surface', note: 'combien de m² ?', s: [205, 330], spoken: true },
  { kind: 'note', text: 'Bureau opéré ?', s: [705, 150], mint: true },
  { kind: 'card', title: 'Budget', note: 'par mois ?', s: [880, 305], spoken: true },
  { kind: 'note', text: 'Coworking ?', s: [330, 655], mint: true },
  { kind: 'card', title: 'Quartier', note: 'lequel ?', s: [215, 785], spoken: true, doodle: 'map' },
  { kind: 'note', text: 'Travaux', s: [1000, 905] },
  { kind: 'card', title: 'Bail 3/6/9', note: 'commercial ?', s: [870, 720], spoken: true },
  { kind: 'note', text: 'Préavis', s: [96, 975] },
  { kind: 'card', title: 'Visites', note: 'quand ? avec qui ?', s: [560, 905], spoken: true, doodle: 'cal' },
  { kind: 'note', text: 'Dossier', s: [790, 1000] },
  { kind: 'card', title: 'Délais', note: 'avant quand ?', s: [560, 225], spoken: true, doodle: 'clock' },
];
// Fils secondaires entre deux fiches (indices dans ITEMS, -1 = la fiche de l'accroche)
const LINKS = [[2, 4], [-1, 6], [6, 10], [-1, 8], [1, 7], [12, 4]];

let world, front, hook, hookLines, paperLine, items, heads, flies, pins, pops, thread, links, R;

function pinSvg(parent) {
  const s = svg('svg', { width: 64, height: 64, viewBox: '-32 -32 64 64', style: 'position:absolute;left:-32px;top:-32px;overflow:visible' }, parent);
  svg('ellipse', { cx: 9, cy: 11, rx: 17, ry: 10, fill: 'rgba(0,0,0,0.38)' }, s);
  svg('circle', { cx: 0, cy: 0, r: 18, fill: '#1C9E80' }, s);
  svg('circle', { cx: -1.5, cy: -2, r: 15, fill: '#2ACAA5' }, s);
  svg('ellipse', { cx: -6, cy: -8, rx: 5.5, ry: 3.5, fill: 'rgba(255,255,255,0.75)', transform: 'rotate(-30 -6 -8)' }, s);
  return s;
}

function makeCard(paper, w, h, rot, style = {}) {
  const e = el('div', {
    cls: 'abs',
    style: {
      width: w + 'px', height: h + 'px', backgroundImage: `url(${paper})`, backgroundColor: '#FAFAF6',
      boxShadow: '0 22px 40px rgba(0,0,0,0.5), 0 2px 0 rgba(0,0,0,0.25)', transformOrigin: '50% 8%', ...style,
    },
  }, world);
  // Fiche bristol : une ligne menthe en tête, des lignes grises
  return { e, w, h, rot };
}

function ruled(card, top = 70) {
  el('div', { cls: 'abs', style: { left: '0', top: top + 'px', width: '100%', height: '3px', background: 'rgba(42,202,165,0.75)' } }, card.e);
  for (let y = top + 50; y < card.h - 20; y += 50) el('div', { cls: 'abs', style: { left: '0', top: y + 'px', width: '100%', height: '1.5px', background: 'rgba(120,130,140,0.22)' } }, card.e);
}

function doodle(parent, kind) {
  const s = svg('svg', { width: 170, height: 150, viewBox: '0 0 170 150', style: 'position:absolute;right:34px;bottom:34px;overflow:visible' }, parent);
  const st = { fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (kind === 'map') {
    for (const d of ['M10 40 C 60 30, 110 60, 160 44', 'M20 110 C 70 90, 120 120, 160 100', 'M60 10 C 64 60, 50 100, 64 140', 'M120 10 C 110 60, 126 100, 112 140']) svg('path', { d, ...st, 'stroke-width': 3 }, s);
    svg('circle', { cx: 88, cy: 74, r: 13, fill: '#2ACAA5', stroke: INK, 'stroke-width': 3 }, s);
  } else if (kind === 'cal') {
    svg('rect', { x: 8, y: 14, width: 154, height: 126, rx: 8, ...st }, s);
    svg('line', { x1: 8, y1: 46, x2: 162, y2: 46, ...st }, s);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 22 + c * 37, y = 60 + r * 26;
      if ((r * 4 + c) % 3 === 1) svg('path', { d: `M${x} ${y} l14 14 M${x + 14} ${y} l-14 14`, ...st, 'stroke-width': 3, stroke: '#1C9E80' }, s);
      else svg('rect', { x, y, width: 14, height: 14, rx: 2, fill: 'rgba(0,0,0,0.12)' }, s);
    }
  } else if (kind === 'clock') {
    svg('circle', { cx: 86, cy: 76, r: 62, ...st }, s);
    svg('path', { d: 'M86 76 L86 34 M86 76 L118 92', ...st, 'stroke-width': 5 }, s);
    svg('circle', { cx: 86, cy: 76, r: 6, fill: '#2ACAA5' }, s);
  }
}

export function build(ctx) {
  R = rng(23);
  const paper = paperTexture();
  // Fiches au-dessus des fils (calque cord), punaises au-dessus des fiches : le texte reste lisible
  world = el('div', { cls: 'abs', style: { transformOrigin: '0 0' } }, ctx.layers.worldFront);
  front = el('div', { cls: 'abs', style: { transformOrigin: '0 0' } }, ctx.layers.tags);

  // --- La fiche de l'accroche
  hook = makeCard(paper, 940, 600, -1.2);
  hook.x = 0; hook.y = 0;
  ruled(hook, 92);
  const tb = el('div', { cls: 'abs', style: { left: '70px', top: '128px' } }, hook.e);
  const mk = (html) => {
    const wrap = el('div', { cls: 'mask display', style: { fontSize: '112px', color: INK, letterSpacing: '-0.05em' } }, tb);
    return { wrap, inner: el('span', { html }, wrap) };
  };
  hookLines = [mk('Trouver'), mk('des bureaux,'), mk('c’est simple.')];
  hook.pinEl = el('div', { cls: 'abs' }, front);
  pinSvg(hook.pinEl);
  hook.pin = [hook.x, hook.y - hook.h / 2 + 46];

  // « Sur le papier. », sous la fiche, une fois la caméra reculée
  const pr = el('div', { cls: 'abs', style: { left: '0', top: pick('1260px', '712px'), width: W + 'px', textAlign: 'center' } }, ctx.layers.text);
  const pw = el('div', { cls: 'mask display', style: { fontSize: Math.round(L.hookSize * 0.64) + 'px', color: 'var(--mint)', fontWeight: '300', letterSpacing: '-0.03em', display: 'inline-block' } }, pr);
  paperLine = { root: pr, inner: el('span', { text: 'Sur le papier.' }, pw) };

  // --- Les fiches du tableau
  items = ITEMS.map((d, k) => {
    const x = (d.s[0] - W / 2) / CAM_END.z + CAM_END.cx, y = (d.s[1] - H / 2) / CAM_END.z + CAM_END.cy;
    const rot = (R() - 0.5) * (d.kind === 'note' ? 9 : 6);
    let c;
    if (d.kind === 'card') {
      c = makeCard(paper, 560, 360, rot);
      ruled(c, 62);
      el('div', { cls: 'abs display', text: d.title, style: { left: '40px', top: '80px', fontSize: '104px', color: INK, letterSpacing: '-0.045em' } }, c.e);
      el('div', { cls: 'abs display', text: d.note, style: { left: '42px', top: '218px', fontSize: '44px', fontWeight: '500', color: '#6e6f69', letterSpacing: '-0.02em' } }, c.e);
      if (d.doodle) doodle(c.e, d.doodle);
    } else {
      c = makeCard(paper, 300, 300, rot, { backgroundImage: 'none', backgroundColor: d.mint ? '#BFEFE0' : '#F2EFE4' });
      el('div', {
        cls: 'abs display', text: d.text,
        style: { left: '20px', top: '56px', width: '260px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'normal', fontSize: '58px', lineHeight: '1.04', color: INK, letterSpacing: '-0.035em' },
      }, c.e);
    }
    c.x = x; c.y = y; c.spoken = !!d.spoken; c.t = T.drops[k];
    c.pin = [x + (R() - 0.5) * 30, y - c.h / 2 + (d.kind === 'note' ? 34 : 44)];
    c.pinEl = el('div', { cls: 'abs' }, front);
    pinSvg(c.pinEl);
    c.w0 = (R() - 0.5) * 220; c.vx = (R() - 0.5) * 260;
    return c;
  });

  // --- Le fil principal : bord gauche → fiche de l'accroche → chaque fiche, dans l'ordre → bord droit (tiré)
  const all = [hook, ...items];
  // Les punaises sautent depuis le bout tiré : la dernière fiche épinglée d'abord, la fiche de l'accroche en dernier
  const tA = T.pull - 0.1, tB = T.blind - 0.06;
  all.forEach((c, k) => { c.pop = lerp(tA, tB, (all.length - 1 - k) / (all.length - 1)); });
  hook.t = T.fall;
  thread = all;
  links = LINKS.map(([a, b]) => ({ a: a < 0 ? hook : items[a], b: b < 0 ? hook : items[b] }));

  // Repères pour le son et secousses de caméra
  pins = items.map((c) => ({ t: c.t + 0.08, s: c.spoken ? 1 : 0.5 }));
  pops = all.map((c) => c.pop);
  ctx.shared.cues = {
    ...(ctx.shared.cues || {}),
    drops: items.map((c, k) => ({ t: c.t, text: ITEMS[k].title || ITEMS[k].text, spoken: c.spoken })),
    pins: pins.map((p) => ({ t: +p.t.toFixed(4), s: p.s })),
    pops: pops.map((t) => +t.toFixed(4)).sort((a, b) => a - b),
  };
  ctx.shared.shake = (t) => {
    let dy = 0;
    for (const p of pins) {
      const u = t - p.t;
      if (u > 0 && u < 0.35) dy += pick(6, 5) * p.s * Math.exp(-u / 0.05) * Math.sin(2 * Math.PI * 14 * u);
    }
    return dy;
  };

  // --- Titres (en haut à gauche, comme dans le reste du film)
  const head = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  const hs = Math.round(L.headSize * 1.12);
  const mkh = (html) => {
    const wrap = el('div', { cls: 'mask display', style: { fontSize: hs + 'px', marginBottom: '6px' } }, head);
    return { wrap, inner: el('span', { html }, wrap) };
  };
  heads = [mkh('Très vite,'), mkh('tout s’emmêle.')];
  flies = mkh('Et le temps <span class="fl" style="display:inline-block;color:var(--mint)">file.</span>');
  flies.wrap.style.position = 'absolute';
  flies.wrap.style.top = '0px';
  flies.fl = flies.inner.querySelector('.fl');
  heads.root = head;
}

// Pose d'une fiche (monde) : arrivée claquée, puis chute quand sa punaise saute
function cardPose(c, t) {
  let x = c.x, y = c.y, rot = c.rot, s = 1, a = 1;
  if (c !== hook) {
    const k = prog(t, c.t - 0.02, c.t + 0.16);
    s = lerp(1.14, 1, E.outCubic(k));
    rot = c.rot + (1 - E.soft(prog(t, c.t, c.t + 0.4))) * 5;
    a = prog(t, c.t - 0.02, c.t + 0.06);
  }
  const u = t - c.pop;
  if (u > 0) {
    const g = 4200 / CAM_END.z;
    y += 0.5 * g * u * u;
    x += c.vx * u / CAM_END.z;
    rot += c.w0 * u;
  }
  return { x, y, rot, s, a };
}

function pinPose(c, t) {
  let [x, y] = c.pin, s = 1, a = 1, r = 0;
  const land = c === hook ? -1 : c.t + 0.08;
  if (land > 0) { s = lerp(1.9, 1, E.outCubic(prog(t, land - 0.06, land + 0.05))); a = prog(t, land - 0.06, land - 0.02); }
  const u = t - c.pop;
  if (u > 0) {
    const g = 3600 / CAM_END.z;
    x += (c.vx * 1.6 + 140) * u / CAM_END.z;
    y += (-700 / CAM_END.z) * u + 0.5 * g * u * u;
    r = c.w0 * 3 * u;
    a = 1 - prog(u, 0.3, 0.5);
  }
  return { x, y, s, a, r };
}

export function update(t, ctx) {
  const on = t < T.blind + 0.4;
  show(world, on); show(front, on);
  const c = cam(t);
  const tr = `translate(${(W / 2 - c.cx * c.z).toFixed(2)}px,${(H / 2 - c.cy * c.z).toFixed(2)}px) scale(${c.z.toFixed(5)})`;
  world.style.transform = tr;
  front.style.transform = tr;

  // --- Fiche de l'accroche : lignes révélées avec la voix (« Trouver » 0,25 ; « des bureaux » 0,65 ; « c'est simple » 1,52)
  const ins = [T.l1, T.l1 + 0.45, T.l2];
  hookLines.forEach((ln, i) => {
    const p = E.enter(prog(t, ins[i], ins[i] + 0.75));
    ln.inner.style.transform = `translate3d(0,${((1 - p) * 135).toFixed(2)}%,0)`;
    ln.wrap.style.visibility = t < ins[i] ? 'hidden' : '';
  });
  // « Sur le papier. »
  show(paperLine.root, t > T.paper - 0.05 && t < T.fall + 0.6);
  const pp = E.enter(prog(t, T.paper, T.paper + 0.7)), pq = E.exit(prog(t, T.fall, T.fall + 0.4));
  paperLine.inner.style.transform = `translate3d(0,${((1 - pp) * 135 - pq * 135).toFixed(2)}%,0)`;

  // --- Fiches et punaises
  for (const it of [hook, ...items]) {
    const vis = it === hook || t >= it.t - 0.02;
    show(it.e, vis); show(it.pinEl, vis && pinPose(it, t).a > 0.01);
    if (!vis) continue;
    const p = cardPose(it, t);
    it.e.style.transform = `translate(${(p.x - it.w / 2).toFixed(2)}px,${(p.y - it.h / 2).toFixed(2)}px) rotate(${p.rot.toFixed(3)}deg) scale(${p.s.toFixed(4)})`;
    op(it.e, p.a);
    const q = pinPose(it, t);
    it.pinEl.style.transform = `translate(${q.x.toFixed(2)}px,${q.y.toFixed(2)}px) rotate(${q.r.toFixed(2)}deg) scale(${q.s.toFixed(4)})`;
    op(it.pinEl, q.a);
  }

  // --- Fils (écran) : le fil principal, puis les fils secondaires
  const S = (x, y) => toScreen(c, x, y);
  const lineY = L.pullY;
  if (t >= T.fall && t < T.blind) {
    const A = [-60, lerp(S(...hook.pin)[1] + 120, lineY, prog(t, T.thread, T.pull + 0.3))];
    const B = [W + 60, lineY];
    const pts = [A];
    // Le fil arrive du bord gauche jusqu'à la fiche de l'accroche, puis va de punaise en punaise à mesure qu'on épingle
    const reach = (it) => (it === hook ? E.outCubic(prog(t, T.fall, T.fall + 0.3)) : E.inOutCubic(prog(t, it.t + 0.02, it.t + 0.3)));
    let last = A;
    for (const it of thread) {
      if (it !== hook && t < it.t + 0.02) break;
      const pq = pinPose(it, Math.min(t, it.pop));
      const pin = S(pq.x, pq.y);
      let p = pin;
      const r = reach(it);
      if (r < 1) p = [lerp(last[0], pin[0], r), lerp(last[1], pin[1], r)];
      // Punaise sautée : son point glisse sur la ligne droite
      const zz = E.outCubic(prog(t, it.pop, it.pop + 0.13));
      if (zz > 0) p = [lerp(pin[0], Math.max(-60, Math.min(W + 60, pin[0])), zz), lerp(pin[1], lineY, zz)];
      pts.push(p);
      last = p;
      if (r < 1) break;
    }
    // Le bout libre est attrapé puis tiré vers la droite, dans le silence qui suit « le temps file »
    const grab = E.inOutCubic(prog(t, T.thread, T.thread + 0.3));
    if (grab > 0 && pts.length === thread.length + 1) pts.push([lerp(last[0], B[0], grab), lerp(last[1], B[1], grab)]);
    ctx.cord.draw(pts, { width: THREAD_W });
  }
  for (const l of links) {
    const t0 = Math.max(l.a.t, l.b.t) + 0.1;
    if (t < t0 || t >= T.blind) continue;
    const off = Math.min(l.a.pop, l.b.pop);
    const fade = 1 - prog(t, off, off + 0.12);
    if (fade <= 0) continue;
    const pa = pinPose(l.a, Math.min(t, l.a.pop)), pb = pinPose(l.b, Math.min(t, l.b.pop));
    const a = S(pa.x, pa.y), b = S(pb.x, pb.y);
    // Le fil se tend de punaise en punaise, avec un léger fléchissement au milieu
    const r = E.inOutCubic(prog(t, t0, t0 + 0.28));
    const e = [lerp(a[0], b[0], r), lerp(a[1], b[1], r)];
    const sag = 0.06 * Math.hypot(e[0] - a[0], e[1] - a[1]);
    const g = ctx.cord.g;
    g.save(); g.globalAlpha = fade;
    ctx.cord.draw([a, [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2 + sag], e], { width: THREAD_W * 0.7 });
    g.restore();
  }

  // --- Titres
  const hOn = t >= T.tangle - 0.1 && t < T.pull + 0.3;
  show(heads.root, hOn);
  if (hOn) {
    heads.forEach((ln, i) => {
      const t0 = i ? T.tangle2 : T.tangle;
      const p = E.enter(prog(t, t0, t0 + 0.7)), q = E.exit(prog(t, T.timeFlies - 0.35 + i * 0.05, T.timeFlies - 0.02 + i * 0.05));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    });
    const p = E.enter(prog(t, T.timeFlies + 0.05, T.timeFlies + 0.75)), q = E.exit(prog(t, T.pull - 0.05, T.pull + 0.25));
    flies.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    const f = E.enter(prog(t, T.file, T.file + 0.55));
    flies.fl.style.transform = `translate3d(0,${((1 - f) * 135).toFixed(2)}%,0)`;
  }
}
