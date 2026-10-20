// Ouverture « trait » (0 à 15,25 s) : un seul trait menthe, continu, dessine tout le problème.
// L'immeuble (« Trouver des bureaux »), un trait droit et une coche (« c'est simple »), un point d'interrogation
// (« Enfin… »), la feuille qui encadre le tout (« sur le papier »). Puis la plume s'emballe : boucles, et chaque
// critère dessiné quand la voix le dit (plan, pièces, épingle, bail, porte), la caméra collée à la pointe.
// Recul : vu de loin, tout le dessin n'est qu'un écheveau. Le trait encercle le tout d'une horloge dont l'aiguille
// file. Dans le silence avant le drop, on tire le bout : tout le dessin se tend, en vague, en une seule ligne droite.
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp } from '../lib/ease.js';
import { spline, lengths } from '../lib/path.js';
import { sample, line, loopy, arc, springCamera } from '../lib/stroke.js';
import { T, L, W, H, pick } from '../timeline.js';

const LINE = 9;            // épaisseur du trait (monde)
const MINT = '#2ACAA5';

// Icônes d'un seul trait, coordonnées locales (le trait repasse sur lui-même plutôt que de lever la plume)
const ICON = {
  building: 'M -320 210 L -170 210 L -170 -130 L 0 -240 L 170 -130 L 170 210 L 45 210 L 45 80 L -45 80 L -45 210 L -170 210 L -170 -30 L -110 -30 L -110 30 L -50 30 L -50 -30 L 50 -30 L 50 30 L 110 30 L 110 -30 L 170 -30 L 170 210 L 300 210',
  check: 'M -150 0 L -50 100 L 170 -150',
  question: 'M -75 -70 C -75 -160, 85 -165, 85 -78 C 85 -15, 0 -10, 0 52 L 0 78 C 0 98, 16 112, 0 122 C -16 130, -16 106, 0 112',
  surface: 'M -210 170 L -210 -170 L 210 -170 L 210 170 L 70 170 L 70 50 A 120 120 0 0 0 -50 170 L -210 170 L -210 245 L -186 229 L -210 245 L -186 261 L -210 245 L 210 245 L 186 229 L 210 245 L 186 261 L 210 245 L 300 245',
  coins: 'M -160 150 A 160 44 0 1 0 160 150 A 160 44 0 1 0 -160 150 L -160 92 A 160 44 0 1 0 160 92 A 160 44 0 1 0 -160 92 L -160 34 A 160 44 0 1 0 160 34 A 160 44 0 1 0 -160 34 L -160 -24 A 160 44 0 1 0 160 -24 A 160 44 0 1 0 -160 -24 C -160 -110, -40 -160, 40 -150 C 120 -140, 150 -100, 120 -60',
  pin: 'M -280 215 L 0 170 C -40 100, -135 25, -135 -60 A 135 135 0 1 1 135 -60 C 135 25, 40 100, 0 170 L 0 -8 A 52 52 0 1 1 -0.1 -8 L 0 170 L 290 120',
  lease: 'M -140 -195 L 70 -195 L 140 -125 L 140 195 L -140 195 L -140 -195 L 70 -195 L 70 -125 L 140 -125 L 95 -125 L 95 -65 L -95 -65 L -95 -10 L 95 -10 L 95 45 L -95 45 L -95 125 C -65 65, -35 170, 0 120 C 30 70, 60 170, 100 110 L 280 110',
  door: 'M -280 225 L -125 225 L -125 -215 L 125 -215 L 125 225 L 40 185 L 40 25 C 72 25, 72 2, 40 2 L 40 -175 L 125 -215 L 125 225 L 290 225',
};

// Disposition dans le monde : les icônes se chevauchent, pour que le recul révèle un écheveau
const P = {
  building: [-640, -300], check: [-40, -250], question: [330, -330],
  surface: [430, 260], coins: [-430, 430], pin: [170, -170], lease: [-780, 90], door: [660, -420],
};
const PAPER = { x0: -1010, x1: 560, y0: -620, y1: 40 };
const CLOCK_R = 1150;
const SPAN = pick(3200, 2600);   // longueur à l'écran du fil tendu

let path, Ls, segs, total, camAt, labels, hookRoot, hookLines, heads, flies, hand, tPull0;

export function build(ctx) {
  // --- Le dessin, segment par segment, chacun avec sa fenêtre de temps (calée sur la voix)
  segs = [];
  let cur = null;
  const push = (pts, t0, t1, ease = E.inOutCubic, kind = 'link') => {
    if (cur) pts = [cur, ...pts.slice(1)];
    segs.push({ pts, t0, t1, ease, kind });
    cur = pts[pts.length - 1];
  };
  const icon = (name, t0, t1, s = 1) => {
    const pts = sample(ICON[name], P[name], s);
    if (cur) push(line(cur, pts[0]), t0 - 0.12, t0, E.inOutCubic);
    push(pts, t0, t1, E.inOutSine || ((x) => 0.5 - 0.5 * Math.cos(Math.PI * x)), 'icon');
  };
  const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  const bStart = sample(ICON.building, P.building)[0];
  push(line([bStart[0] - 900, bStart[1]], bStart), -0.2, 0.25, E.outCubic);
  icon('building', 0.25, 1.45);
  // « c'est simple » : un trait parfaitement droit jusqu'à la coche
  const ck = sample(ICON.check, P.check);
  push(line(cur, [ck[0][0] - 10, cur[1]]), 1.45, 1.62, E.inOutCubic);
  push(line(cur, ck[0]), 1.62, 1.72, E.inOutCubic);
  push(ck, 1.72, 2.12, sine, 'icon');
  // « Enfin… » : la plume hésite, puis un point d'interrogation
  const qq = sample(ICON.question, P.question, 0.95);
  push(spline([cur, [cur[0] + 60, cur[1] - 40], [qq[0][0] - 40, qq[0][1] + 30], qq[0]], 6), 2.5, 2.68, E.inOutCubic);
  push(qq, 2.68, 3.15, sine, 'icon');
  // « sur le papier » : la feuille, coin plié, encadre tout le début
  const { x0, x1, y0, y1 } = PAPER;
  push(spline([cur, [cur[0] + 40, y1 - 120], [x0 + 200, y1 + 40], [x0, y1]], 6), 3.15, 3.42, E.inOutCubic);
  push([...line([x0, y1], [x0, y0]), ...line([x0, y0], [x1 - 110, y0]).slice(1), ...line([x1 - 110, y0], [x1, y0 + 110]).slice(1), ...line([x1, y0 + 110], [x1, y1]).slice(1)], 3.42, 4.35, E.inOutCubic, 'icon');
  // « Parce que très vite, tout s'emmêle » : la plume s'emballe et file en boucles à travers le monde
  const sf = sample(ICON.surface, P.surface);
  push(loopy([cur, [920, 420], [380, 820], [-420, 760], [-980, 300], [-560, -60], [80, 40], [sf[0][0] - 140, sf[0][1] + 40], sf[0]], 1 / 300, 120), 4.75, 6.78, (x) => x, 'rush');
  icon('surface', 6.82, 7.55);
  icon('coins', 7.75, 8.55);
  icon('pin', 8.72, 9.5);
  icon('lease', 9.7, 10.42);
  icon('door', 10.55, 11.3);
  // Frénésie : la plume repasse partout, la caméra recule et révèle l'écheveau
  push(loopy([cur, [980, 120], [400, 700], [-520, 860], [-1000, -60], [-260, -760], [560, -900], [880, -320], [0, -CLOCK_R - 80], [0, -CLOCK_R]], 1 / 210, 95), 11.3, 12.3, (x) => x, 'rush');
  // « Et pendant ce temps… » : une horloge autour de tout le dessin
  push(arc([0, 0], CLOCK_R, -Math.PI / 2, (3 * Math.PI) / 2), 12.3, 13.3, E.inOutCubic, 'icon');
  push(line(cur, [0, 0]), 13.3, 13.5, E.inOutCubic);
  push(line([0, 0], [0, -CLOCK_R * 0.78]), 13.5, 13.62, E.outCubic, 'hand');

  // Assemblage
  path = [];
  segs.forEach((sg) => {
    sg.i0 = path.length ? path.length - 1 : 0;
    path.push(...(path.length ? sg.pts.slice(1) : sg.pts));
    sg.i1 = path.length - 1;
  });
  Ls = lengths(path);
  total = Ls[Ls.length - 1];
  hand = segs[segs.length - 1];
  tPull0 = T.pull - 0.15;

  // --- Caméra : cadrages successifs, lissés par un ressort amorti (précalculé)
  const focus = (t) => {
    const hd = headPoint(t);
    const zoomIn = 1.15;
    if (t < 1.45) return [P.building[0] + 30, P.building[1] - 10, 1.0];
    if (t < 2.4) return [lerp(P.building[0] + 30, (P.building[0] + P.check[0]) / 2 + 60, E.inOutCubic(prog(t, 1.45, 1.95))), -280, lerp(1.0, 0.82, E.inOutCubic(prog(t, 1.45, 1.95)))];
    if (t < 3.2) return [lerp((P.building[0] + P.check[0]) / 2 + 60, P.check[0] + 120, E.inOutCubic(prog(t, 2.45, 2.85))), -300, 0.82];
    if (t < 4.7) return [(PAPER.x0 + PAPER.x1) / 2, (PAPER.y0 + PAPER.y1) / 2 + 40, 0.62];
    if (t < 6.7) return [hd[0], hd[1], 0.78];
    const ic = [['surface', 6.55, 7.6], ['coins', 7.6, 8.62], ['pin', 8.62, 9.6], ['lease', 9.6, 10.48], ['door', 10.48, 11.3]];
    for (const [n, a, b] of ic) if (t < b && t >= a) return [P[n][0], P[n][1] + 70, zoomIn];
    if (t < 6.75) return [hd[0], hd[1], 0.9];
    // Recul sur l'écheveau, puis lente avancée pendant que l'horloge tourne
    return [0, 0, lerp(zoomIn, 0.43, E.inOutCubic(prog(t, 11.3, 12.2))) * (1 + 0.07 * E.inOutCubic(prog(t, 12.2, 14.5)))];
  };
  camAt = springCamera(focus, -0.5, T.blind + 0.2);

  // --- Textes posés dans le monde, à côté de chaque dessin
  const world = el('div', { cls: 'abs', style: { transformOrigin: '0 0' } }, ctx.layers.worldFront);
  const mkLabel = (text, x, y, size, t, style = {}) => {
    const wrap = el('div', { cls: 'mask display', style: { position: 'absolute', left: '0', top: '0', fontSize: size + 'px', ...style } }, world);
    const inner = el('span', { html: text }, wrap);
    const w = wrap.offsetWidth;
    wrap.style.transform = `translate(${(x - w / 2).toFixed(1)}px,${y}px)`;
    return { wrap, inner, t };
  };
  labels = [
    mkLabel('Sur le papier.', (PAPER.x0 + PAPER.x1) / 2, PAPER.y1 + 40, 110, T.paper, { color: 'var(--mint)', fontWeight: '300', letterSpacing: '-0.03em' }),
    mkLabel('Surface', P.surface[0], P.surface[1] + 290, 104, T.drops[2]),
    mkLabel('Budget', P.coins[0], P.coins[1] + 220, 104, T.drops[4]),
    mkLabel('Quartier', P.pin[0], P.pin[1] + 250, 104, T.drops[6]),
    mkLabel('Bail 3/6/9', P.lease[0], P.lease[1] + 250, 104, T.drops[8]),
    mkLabel('Visites', P.door[0], P.door[1] + 275, 104, T.drops[10]),
  ];
  labels.world = world;

  // --- Accroche, en haut à gauche de l'écran (le dessin se fait dessous)
  const s0 = Math.round(L.hookSize * 0.86);
  hookRoot = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('140px', '62px') } }, ctx.layers.text);
  const mk = (html) => {
    const wrap = el('div', { cls: 'mask display', style: { fontSize: s0 + 'px' } }, hookRoot);
    return { wrap, inner: el('span', { html }, wrap) };
  };
  hookLines = [mk('Trouver'), mk('des bureaux,'), mk('c’est simple.')];

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

  // Repères pour le son : la plume (dessin, emballement), les mots, le recul, l'aiguille, le dévidage
  ctx.shared.cues = {
    ...(ctx.shared.cues || {}),
    drops: [2, 4, 6, 8, 10].map((k) => ({ t: T.drops[k], text: labels[[2, 4, 6, 8, 10].indexOf(k) + 1].inner.textContent, spoken: true })),
    pen: segs.filter((sg) => sg.t1 > sg.t0 + 0.05).map((sg) => ({ t0: +sg.t0.toFixed(3), t1: +sg.t1.toFixed(3), rush: sg.kind === 'rush' })),
    reveal: 11.45,
    spin: [13.65, 14.25],
    unravel: [tPull0, T.blind - 0.04],
  };
}

// Abscisse curviligne de la pointe à l'instant t
function headS(t) {
  let s = 0;
  for (const sg of segs) {
    if (t < sg.t0) break;
    const a = Ls[sg.i0], b = Ls[sg.i1];
    s = t >= sg.t1 ? b : lerp(a, b, sg.ease(prog(t, sg.t0, sg.t1)));
  }
  return s;
}

function headPoint(t) {
  const s = headS(t);
  let lo = 0, hi = Ls.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Ls[m] < s) lo = m; else hi = m; }
  return path[hi];
}

// Menthe atténuée vers le fond (opaque : pas de surimpression aux raccords)
function mix(a) {
  const c = (x, y) => Math.round(x + (y - x) * a);
  return `rgb(${c(17, 42)},${c(17, 202)},${c(17, 165)})`;
}

// Aiguille de l'horloge : le dernier segment tourne autour du centre sur « le temps file »
function handAngle(t) {
  return 2 * Math.PI * 2 * E.inOutCubic(prog(t, 13.65, 14.25));
}

export function update(t, ctx) {
  const on = t < T.blind;
  const [cx, cy, z] = camAt(t);
  const offY = (1 - E.inOutCubic(prog(t, 4.6, 5.4))) * pick(260, 150);
  const toS = (p) => [(p[0] - cx) * z + W / 2, (p[1] - cy) * z + H / 2 + offY];
  show(labels.world, on);
  labels.world.style.transform = `translate(${(W / 2 - cx * z).toFixed(2)}px,${(H / 2 + offY - cy * z).toFixed(2)}px) scale(${z.toFixed(5)})`;

  if (on) {
    const sH = headS(t);
    const ang = handAngle(t);
    const pull = t >= tPull0;
    const tight = 1 - 0.03 * E.inOutCubic(prog(t, T.thread, tPull0)) * (1 - prog(t, tPull0, tPull0 + 0.1));
    const pts = [];
    for (let i = 0; i < path.length; i++) {
      if (Ls[i] > sH + 0.01) break;
      let p = path[i];
      if (i >= hand.i0 && ang) {
        const c = Math.cos(ang), s = Math.sin(ang);
        p = [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
      }
      p = [p[0] * tight, p[1] * tight];
      let q = toS(p);
      if (pull) {
        // On tire le bout : la vague part de l'aiguille et remonte tout le dessin jusqu'à l'immeuble
        // La ligne d'arrivée déborde de l'image de part et d'autre : le milieu du dessin se tend sous nos yeux
        const d = (1 - Ls[i] / total) * 0.32;
        const e = E.inOutCubic(prog(t, tPull0 + d, tPull0 + d + 0.28));
        if (e > 0) q = [lerp(q[0], W / 2 + (Ls[i] / total - 0.5) * SPAN, e), lerp(q[1], L.pullY, e)];
      }
      pts.push(q);
    }
    if (pts.length > 1) {
      // Pendant l'emballement, le dessin ancien s'assombrit et le trait en cours reste vif ; au recul, tout se rallume
      const dim = E.inOutCubic(prog(t, 4.9, 5.6)) * (1 - E.inOutCubic(prog(t, 11.35, 11.95)));
      const g = ctx.cord.g;
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = Math.max(3.6, LINE * z);
      const CH = 48;
      for (let i0 = 0; i0 < pts.length - 1; i0 += CH) {
        const i1 = Math.min(pts.length - 1, i0 + CH);
        const age = Math.max(0, Math.min(1, (sH - Ls[(i0 + i1) >> 1]) / 1500));
        g.strokeStyle = mix(1 - 0.62 * dim * age);
        g.beginPath();
        g.moveTo(pts[i0][0], pts[i0][1]);
        for (let i = i0 + 1; i <= i1; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.stroke();
      }
      g.restore();
    }
  }

  // --- Textes du monde
  labels.forEach((lb, k) => {
    // Le mot du moment est plein ; les précédents s'effacent à moitié, puis reviennent au recul
    const nextT = k + 1 < labels.length ? labels[k + 1].t : 11.3;
    const back = Math.max(k === 0 ? prog(t, 4.8, 5.3) : prog(t, nextT - 0.1, nextT + 0.3), 0) * (1 - prog(t, 11.35, 11.9));
    op(lb.wrap, 1 - 0.68 * back);
    const p = E.enter(prog(t, lb.t, lb.t + 0.6));
    const q = E.exit(prog(t, tPull0 - 0.1, tPull0 + 0.2));
    lb.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    lb.wrap.style.visibility = t < lb.t ? 'hidden' : '';
  });

  // --- Accroche
  const hookOn = t < T.fall + 0.6;
  show(hookRoot, hookOn);
  if (hookOn) {
    const ins = [T.l1, T.l1 + 0.45, T.l2];
    hookLines.forEach((ln, i) => {
      // Sort dès la fin de « sur le papier » (4,38 s), avant que « Très vite, » n'arrive au même endroit
      const p = E.enter(prog(t, ins[i], ins[i] + 0.8)), q = E.exit(prog(t, 4.42 + i * 0.04, 4.74 + i * 0.04));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
      ln.wrap.style.visibility = t < ins[i] ? 'hidden' : '';
    });
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
