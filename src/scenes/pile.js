// 1-2. Accroche et pile de critères.
// « Trouver des bureaux, c'est simple. » : un trait de feutre menthe barre « simple » sur « Enfin… ».
// Sur « très vite, tout s'emmêle », la phrase s'effondre (physique de corps rigides, planck.js, précalculée à
// pas fixe) et les critères tombent un à un, au moment où la voix les dit, jusqu'à former une pile.
// Dans le silence avant le drop, une aiguille et son fil menthe traversent chaque mot : le fil prêt à être tiré.
import { World, Vec2, Box, Edge } from 'planck';
import { el, svg, show, op } from '../lib/dom.js';
import { E, prog, lerp, rng } from '../lib/ease.js';
import { spline, lengths, slice } from '../lib/path.js';
import { T, L, W, H, pick } from '../timeline.js';

export const CORD_W = pick(11, 9);
const PX = 100;                       // pixels par mètre (le moteur travaille en mètres)
const HZ = 240;
const FLOOR = H - pick(40, 26);

// Critères qui tombent, dans l'ordre de la voix (spoken : mot dit par la voix)
const WORDS = [
  { text: 'Charges', x: 0.27 },
  { text: 'Nombre de postes', x: 0.66 },
  { text: 'Surface', x: 0.36, spoken: true },
  { text: 'Bureau opéré ?', x: 0.76, mint: true },
  { text: 'Budget', x: 0.62, spoken: true },
  { text: 'Coworking ?', x: 0.22, mint: true },
  { text: 'Quartier', x: 0.5, spoken: true },
  { text: 'Travaux', x: 0.84 },
  { text: 'Bail 3/6/9', x: 0.3, spoken: true },
  { text: 'Préavis', x: 0.74 },
  { text: 'Visites', x: 0.55, spoken: true },
  { text: 'Dossier', x: 0.4 },
  { text: 'Délais', x: 0.48, spoken: true },
];

let root, lines, hookWords, words, strike, heads, flies, path, Ls, sAt, tA, sim, landings;
const cv = document.createElement('canvas').getContext('2d');

// Boîte des glyphes d'un mot (au-dessus / au-dessous de la ligne de base), d'après la police réelle
function glyphs(e, text) {
  const cs = getComputedStyle(e);
  cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = cv.measureText(text);
  return { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}

function baselineMark(parent) {
  return el('span', { style: { display: 'inline-block', width: '0px', height: '0px', verticalAlign: 'baseline' } }, parent);
}

// Mot « physique » : un élément positionné par son centre de glyphes (cx, cy) et son angle
function makeWord(ctx, parent, text, style) {
  const e = el('div', { cls: 'display', style: { position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', lineHeight: '1', ...style } }, parent);
  const span = el('span', { text }, e);
  const mark = baselineMark(e);
  const r = ctx.measure(e), m = ctx.measure(mark), s = ctx.measure(span);
  const g = glyphs(e, text);
  const by = m.y - r.y;
  const w = s.w;
  const cx = w / 2, cy = by - (g.asc - g.desc) / 2;
  e.style.transformOrigin = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
  return { e, span, text, w, h: g.asc + g.desc, cx, cy, hw: w / 2 + 2, hh: (g.asc + g.desc) / 2 + 2 };
}

export function placeWord(wd, x, y, angle, scale = 1, alpha = 1) {
  wd.e.style.transform = `translate3d(${(x - wd.cx).toFixed(2)}px,${(y - wd.cy).toFixed(2)}px,0) rotate(${angle.toFixed(4)}rad) scale(${scale.toFixed(4)})`;
  op(wd.e, alpha);
}

// Simulation de la pile : chaque mot entre dans le monde à son instant, puis tout est enregistré à 240 Hz
function simulate(all, t0, t1) {
  const world = new World({ gravity: Vec2(0, 34) });
  const ground = world.createBody();
  const f = FLOOR / PX, w = W / PX;
  ground.createFixture(new Edge(Vec2(-2, f), Vec2(w + 2, f)), { friction: 0.75 });
  ground.createFixture(new Edge(Vec2(0, -30), Vec2(0, f)), { friction: 0.2 });
  ground.createFixture(new Edge(Vec2(w, -30), Vec2(w, f)), { friction: 0.2 });
  const n = Math.ceil((t1 - t0) * HZ);
  const rec = all.map(() => new Float32Array((n + 1) * 3));
  const bodies = all.map(() => null);
  const prevVy = all.map(() => 0);
  const lands = [];
  for (let k = 0; k <= n; k++) {
    const t = t0 + k / HZ;
    all.forEach((wd, i) => {
      if (bodies[i] || t < wd.spawn) return;
      const b = world.createBody({
        type: 'dynamic', position: Vec2(wd.x0 / PX, wd.y0 / PX), angle: wd.a0,
        linearVelocity: Vec2(0, wd.v0 / PX), angularVelocity: wd.w0, bullet: true,
      });
      b.createFixture(new Box(wd.hw / PX, wd.hh / PX), { density: 1, friction: 0.62, restitution: 0.04 });
      bodies[i] = b;
    });
    bodies.forEach((b, i) => {
      if (!b) { rec[i][k * 3] = NaN; return; }
      const p = b.getPosition();
      rec[i][k * 3] = p.x * PX; rec[i][k * 3 + 1] = p.y * PX; rec[i][k * 3 + 2] = b.getAngle();
      // Atterrissages : chute brutale de la vitesse verticale (pour le son et la secousse de caméra)
      const vy = b.getLinearVelocity().y * PX;
      if (prevVy[i] > 420 && vy < prevVy[i] * 0.35 && !all[i].landed) {
        all[i].landed = true;
        lands.push({ t, s: Math.min(1, (prevVy[i] / 2600) * Math.sqrt((all[i].hw * all[i].hh) / 9000)), i });
      }
      prevVy[i] = vy;
    });
    world.step(1 / HZ, 10, 8);
  }
  return {
    lands,
    pose(i, t) {
      const u = Math.max(0, Math.min(n, (t - t0) * HZ));
      const k0 = Math.floor(u), k1 = Math.min(n, k0 + 1), a = u - k0;
      const r = rec[i];
      if (Number.isNaN(r[k0 * 3])) return null;
      if (Number.isNaN(r[k1 * 3])) return [r[k0 * 3], r[k0 * 3 + 1], r[k0 * 3 + 2]];
      return [lerp(r[k0 * 3], r[k1 * 3], a), lerp(r[k0 * 3 + 1], r[k1 * 3 + 1], a), lerp(r[k0 * 3 + 2], r[k1 * 3 + 2], a)];
    },
  };
}

export function build(ctx) {
  const R = rng(7);
  const s = L.hookSize;
  // --- Accroche : lignes révélées par masque, chaque mot dans son propre span (mesuré pour la physique)
  root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.hookY + 'px' } }, ctx.layers.text);
  const mk = (html, size, extra = {}) => {
    const wrap = el('div', { cls: 'mask display', style: { fontSize: size + 'px', ...extra } }, root);
    const inner = el('span', { html }, wrap);
    baselineMark(inner).className = 'bl';
    return { wrap, inner };
  };
  lines = [
    mk('<span class="hw">Trouver</span>', s),
    mk('<span class="hw">des bureaux,</span>', s),
    mk('<span class="hw">c’est</span> <span class="hw">simple.</span>', s),
    mk('<span class="hw">Sur le papier.</span>', Math.round(s * 0.64), { color: 'var(--mint)', fontWeight: '300', letterSpacing: '-0.03em', marginTop: pick('70px', '46px') }),
  ];
  // Les mots de l'accroche, doublés par des mots « physiques » exactement superposés
  hookWords = [];
  const spans = [];
  lines.forEach((ln, li) => ln.inner.querySelectorAll('.hw').forEach((sp) => spans.push({ sp, li, bl: ln.inner.querySelector('.bl') })));
  spans.forEach(({ sp, li, bl }, k) => {
    const cs = getComputedStyle(sp);
    const style = { fontSize: cs.fontSize, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, color: cs.color };
    const wd = makeWord(ctx, ctx.layers.tags, sp.textContent, style);
    wd.hw -= 4; wd.hh -= 4; // les lignes de l'accroche sont serrées : boîtes un peu plus justes
    const r = ctx.measure(sp), b = ctx.measure(bl);
    const g = glyphs(sp, sp.textContent);
    wd.x0 = r.x + r.w / 2;
    wd.y0 = b.y - (g.asc - g.desc) / 2;
    wd.a0 = 0; wd.v0 = 0; wd.w0 = (R() - 0.5) * 1.4;
    wd.hookSpan = sp; wd.line = li;
    hookWords.push(wd);
  });
  // simple. : porte le trait de feutre, légèrement déséquilibré une fois barré
  const simple = hookWords[3];
  simple.span.style.position = 'relative';
  const sv = svg('svg', { width: simple.w + 40, height: 40, viewBox: `0 0 ${simple.w + 40} 40`, style: `position:absolute;left:-20px;top:${(simple.cy - 20).toFixed(1)}px;overflow:visible` }, simple.e);
  strike = svg('path', {
    d: `M6 24 C ${simple.w * 0.3} 14, ${simple.w * 0.62} 26, ${simple.w + 30} 13`,
    fill: 'none', stroke: '#2ACAA5', 'stroke-width': pick(13, 11), 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1,
  }, sv);
  simple.a0 = -0.06;
  // Chute du bas vers le haut : chaque ligne libère la place avant que celle du dessus ne tombe
  const spawnHook = [T.fall + 0.18, T.fall + 0.12, T.fall + 0.07, T.fall + 0.02, T.fall];
  hookWords.forEach((wd, k) => { wd.spawn = spawnHook[k]; });

  // --- Les critères
  words = WORDS.map((d, k) => {
    const style = d.spoken
      ? { fontSize: pick(124, 98) + 'px', fontWeight: '600', color: '#FFFFFF' }
      : { fontSize: pick(70, 56) + 'px', fontWeight: '500', color: d.mint ? 'var(--mint)' : 'rgba(255,255,255,0.56)' };
    const wd = makeWord(ctx, ctx.layers.tags, d.text, style);
    wd.spoken = !!d.spoken;
    wd.x0 = Math.max(wd.hw + 14, Math.min(W - wd.hw - 14, d.x * W));
    wd.y0 = -wd.hh - 12;
    // Les mots dits par la voix tombent presque à plat : ils restent lisibles une fois posés
    wd.a0 = (R() - 0.5) * (d.spoken ? 0.12 : 0.3);
    wd.v0 = 900;
    wd.w0 = (R() - 0.5) * (d.spoken ? 0.35 : 1.6);
    wd.spawn = T.drops[k] - 0.1;
    return wd;
  });

  const all = [...hookWords, ...words];
  tA = T.thread + 0.38;
  sim = simulate(all, T.fall, tA + 0.05);
  landings = sim.lands;
  ctx.shared.cues = {
    ...(ctx.shared.cues || {}),
    drops: words.map((w) => ({ t: w.spawn + 0.1, text: w.text, spoken: w.spoken })),
    landings: landings.map((l) => ({ t: +l.t.toFixed(4), s: +l.s.toFixed(3) })),
  };

  // --- Le fil : une aiguille coud la pile rang par rang, du bas vers le haut, en sortant de l'image à chaque
  // demi-tour (pose figée à T.thread) ; le dernier rang part vers la droite, du côté où le fil sera tiré
  const at = all.map((wd, i) => ({ wd, i, p: sim.pose(i, T.thread) }));
  const ys = at.map((o) => o.p[1]);
  const yTop = Math.min(...ys), yBot = Math.max(...ys);
  let nb = Math.max(3, Math.round((yBot - yTop) / pick(190, 150)));
  if (nb % 2 === 0) nb += 1;
  const band = (y) => Math.min(nb - 1, Math.floor(((yBot - y) / (yBot - yTop + 1e-6)) * nb));
  const rows = Array.from({ length: nb }, () => []);
  at.forEach((o) => rows[band(o.p[1])].push(o));
  const ctrl = [[-160, yBot + 10]];
  rows.forEach((row, r) => {
    if (!row.length) return;
    const ltr = r % 2 === 0;
    row.sort((a, b) => (ltr ? a.p[0] - b.p[0] : b.p[0] - a.p[0]));
    row.forEach((o) => ctrl.push([o.p[0], o.p[1]]));
    const yNext = r + 1 < nb ? yBot - ((r + 1.2) / nb) * (yBot - yTop) : yTop - 60;
    const last = row[row.length - 1].p;
    ctrl.push([ltr ? W + 70 : -70, (last[1] + yNext) / 2]);
  });
  ctrl[ctrl.length - 1] = [W + 160, ctrl[ctrl.length - 1][1]];
  path = spline(ctrl, 6);
  Ls = lengths(path);
  sAt = all.map(() => 0);
  at.forEach((o) => {
    let best = 0, bd = 1e9;
    path.forEach((q, j) => { const d = Math.hypot(q[0] - o.p[0], q[1] - o.p[1]); if (d < bd) { bd = d; best = j; } });
    sAt[o.i] = Ls[best];
  });
  // Instant où l'aiguille traverse chaque mot (inverse de la courbe d'avance)
  const total = Ls[Ls.length - 1];
  all.forEach((wd, i) => {
    let lo = 0, hi = 1;
    for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (E.inOutCubic(m) * total < sAt[i]) lo = m; else hi = m; }
    wd.pierce = T.thread + lo * (tA - 0.03 - T.thread);
  });

  ctx.shared.tangle = {
    path, Ls, tagS: sAt, headAt, tailAt: () => 0, tAnchor: tA,
  };
  ctx.shared.beads = all.map((wd, i) => ({
    wd, s: sAt[i], w: wd.w,
    pose: (t) => wordPose(i, t),
    place: (x, y, a, sc, al) => placeWord(wd, x, y, a, sc, al),
  }));
  ctx.shared.drawNeedle = drawNeedle;
  // Secousse de caméra : chaque atterrissage franc la fait vibrer un instant
  ctx.shared.shake = (t) => {
    let dy = 0;
    for (const l of landings) {
      const u = t - l.t;
      if (u < 0 || u > 0.4 || l.s < 0.12) continue;
      dy += pick(9, 7) * l.s * Math.exp(-u / 0.06) * Math.sin(2 * Math.PI * 13 * u);
    }
    return dy;
  };

  // --- Titres
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
  hookWords.concat(words).forEach((wd) => show(wd.e, false));
}

function wordPose(i, t) {
  const all = hookWords.concat(words);
  const wd = all[i];
  let p = sim.pose(i, Math.min(t, tA));
  if (!p) p = [wd.x0, wd.y0, wd.a0];
  // Petit sursaut quand l'aiguille traverse le mot
  const u = t - wd.pierce;
  const jolt = u > 0 && u < 0.5 ? 0.05 * Math.exp(-u / 0.09) * Math.sin(u * 55) : 0;
  return [p[0], p[1], p[2] + jolt];
}

export function headAt(t) {
  return Ls[Ls.length - 1] * E.inOutCubic(prog(t, T.thread, tA - 0.03));
}

// Aiguille d'acier : pointe effilée, chas ouvert, petit reflet
export function drawNeedle(g, p, ang, scale = 1) {
  const len = pick(78, 64) * scale, wd = pick(7, 6) * scale;
  g.save();
  g.translate(p[0], p[1]);
  g.rotate(ang);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(len * 0.45, 7, len * 0.5, 4, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(0, -wd, 0, wd);
  gr.addColorStop(0, '#f2f5f4'); gr.addColorStop(0.45, '#b9c1be'); gr.addColorStop(1, '#7f8885');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(-len * 0.08, -wd * 0.55);
  g.lineTo(len * 0.7, -wd * 0.5);
  g.lineTo(len, 0);
  g.lineTo(len * 0.7, wd * 0.5);
  g.lineTo(-len * 0.08, wd * 0.55);
  g.arc(-len * 0.08, 0, wd * 0.55, Math.PI / 2, -Math.PI / 2);
  g.closePath(); g.fill();
  g.fillStyle = '#111';
  g.beginPath(); g.ellipse(len * 0.06, 0, len * 0.07, wd * 0.18, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function update(t, ctx) {
  const all = hookWords.concat(words);
  // --- Accroche (avant l'effondrement)
  const hookOn = t < T.fall + 0.2;
  show(root, hookOn);
  if (hookOn) {
    const ins = [T.l1, T.l1 + 0.45, T.l2, T.paper];
    lines.forEach((ln, i) => {
      const p = E.enter(prog(t, ins[i], ins[i] + (i === 3 ? 0.7 : 0.8)));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135).toFixed(2)}%,0)`;
      // Avant son entrée, la ligne est cachée : sinon le haut des lettres dépasse du masque
      ln.wrap.style.visibility = t < ins[i] ? 'hidden' : '';
    });
  }
  // Le trait de feutre sur « simple. » (porté par le mot physique, qui remplace le span dès la rature)
  strike.setAttribute('stroke-dashoffset', (1 - E.outCubic(prog(t, T.strike, T.strike + 0.24))).toFixed(4));
  hookWords[3].span.style.opacity = (1 - 0.55 * E.outCubic(prog(t, T.strike + 0.05, T.strike + 0.35))).toFixed(3);

  all.forEach((wd, i) => {
    const isHook = i < hookWords.length;
    // Avant sa chute, un mot de l'accroche est le span de la phrase ; « simple. » passe en physique dès la rature
    const free = isHook ? t >= (i === 3 ? T.strike : wd.spawn) : t >= wd.spawn;
    if (isHook) wd.hookSpan.style.visibility = free ? 'hidden' : '';
    if (t >= tA) { show(wd.e, t < T.blind + 1); return; } // la suite appartient au fil (pull.js)
    show(wd.e, free);
    if (!free) return;
    const [x, y, a] = wordPose(i, t);
    let ang = a;
    if (i === 3 && t < wd.spawn) ang = -0.06 * E.soft(prog(t, T.strike + 0.1, T.strike + 0.5));
    placeWord(wd, x, y, ang, 1, 1);
  });

  // --- Le fil et son aiguille, de T.thread jusqu'à la traction
  if (t >= T.thread && t < tA) {
    const h = headAt(t);
    if (h > 2) {
      const pts = slice(path, Ls, 0, h);
      ctx.cord.draw(pts, { width: CORD_W });
      const a = pts[pts.length - 1], b = pts[Math.max(0, pts.length - 4)];
      drawNeedle(ctx.cord.g, a, Math.atan2(a[1] - b[1], a[0] - b[0]));
    }
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
