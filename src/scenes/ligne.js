// Film « en un seul trait », du drop jusqu'à la gratuité (15,25 → 54,75 s).
// Sur l'aplat menthe, le trait (à l'encre) souligne « tire le fil », dessine le conseiller, la bulle de
// l'interlocuteur unique, puis va du brief jusqu'aux clés. Retour au noir : le trait devient un chemin droit que
// la caméra longe ; chaque étape se dessine en s'élevant de cette ligne, et chaque dessin réagit :
// coches, entonnoir qui trie les offres, porte qui s'ouvre, balance qui penche à chaque mot, clé qui tourne.
// Enfin, le trait dessine l'Hexagone et relie les villes au moment où la voix les nomme.
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, rng } from '../lib/ease.js';
import { T, L, W, H, pick } from '../timeline.js';
import { sample, line, arc, curve, loopy, sine, Drawing, springCamera, strokePts } from '../lib/stroke.js';
import { blindY } from './free.js';

const MINT = '#2ACAA5', INK = '#111111';
const LW = 9;
const CAM_Y = pick(-640, -390);   // la ligne de base du monde tombe vers le bas de l'image

// ----------------------------------------------------------------------------------------------- dessins
const ICON = {
  advisor: 'M -200 200 C -195 120, -130 80, -60 70 L -40 40 C -95 20, -110 -40, -100 -80 C -90 -150, -30 -175, 15 -168 C 85 -160, 115 -100, 100 -40 C 92 -5, 70 20, 40 40 L 60 70 C 130 80, 195 120, 200 200',
  doc: 'M -30 40 L -30 -40 L 15 -40 L 30 -25 L 30 40 L -30 40',
  key: 'M -38 0 A 52 52 0 1 0 -142 0 A 52 52 0 1 0 -38 0 L 130 0 L 130 34 L 105 34 L 105 16 L 80 16 L 80 34 L 58 34 L 58 0',
  cowork: 'M -270 0 L -230 0 L -230 -190 L -175 -190 L -158 -260 L -95 -260 L -105 -190 L -35 -190 L -18 -260 L 45 -260 L 35 -190 L 105 -190 L 122 -260 L 185 -260 L 175 -190 L 230 -190 L 230 0 L 270 0',
  opere: 'M -260 0 L -200 0 L -200 -300 L -140 -300 L -140 -220 L -60 -220 L -60 -300 L -200 -300 L -200 -420 L 200 -420 L 200 0 L 110 0 L 110 -240 L 30 -240 L 30 0 L 260 0',
  bail: 'M -280 0 L -240 0 L -240 -300 L 0 -400 L 240 -300 L 240 0 L 70 0 L 70 -150 L -70 -150 L -70 0 L 280 0',
  clip: 'M -190 0 L -150 0 L -150 -470 L -50 -470 L -50 -500 L 50 -500 L 50 -470 L 150 -470 L 150 0 L -150 0 L -150 -120 L -35 -120 L -35 -155 L 35 -155 L 35 -85 L -35 -85 L -35 -120 L -150 -120 L -150 -240 L -35 -240 L -35 -275 L 35 -275 L 35 -205 L -35 -205 L -35 -240 L -150 -240 L -150 -360 L -35 -360 L -35 -395 L 35 -395 L 35 -325 L -35 -325 L -35 -360',
  funnel: 'M -260 0 L -30 0 L -30 -90 L -220 -420 L 220 -420 L 30 -90 L 30 0 L 260 0',
  reneg: 'M -260 0 L -130 0 L -130 -400 L 60 -400 L 130 -330 L 130 0 L 260 0',
  cal: 'M -260 0 L -170 0 L -170 -380 L -100 -380 L -100 -425 L -100 -380 L 100 -380 L 100 -425 L 100 -380 L 170 -380 L 170 0 L -170 0 L -170 -300 L 170 -300 L 170 0 L 260 0',
};

// Positions sur le chemin (monde), dans l'ordre
const X = { cw: 0, op: 720, bl: 1440, s1: 2700, s2: 3800, s3: 4900, s4: 6000, s5: 7150, v1: 8350, v2: 9450, map: 10800 };

// Carte : projection simple (degrés → monde), contour stylisé de la France
const MAP_C = [X.map, -820];
const KM = 112;
const proj = (lon, lat) => [MAP_C[0] + (lon - 2.6) * KM * Math.cos((46.5 * Math.PI) / 180), MAP_C[1] - (lat - 46.6) * KM];
const FRANCE = [
  [2.37, 51.03], [3.2, 50.75], [4.2, 50.2], [4.85, 49.8], [5.9, 49.5], [7.0, 49.1], [8.2, 48.95], [7.75, 48.3], [7.55, 47.6],
  [6.9, 47.4], [6.1, 46.2], [6.8, 45.9], [7.0, 45.2], [6.9, 44.3], [7.5, 43.8], [6.6, 43.15], [5.4, 43.25], [4.6, 43.4],
  [3.95, 43.5], [3.1, 42.45], [1.7, 42.5], [0.6, 42.7], [-0.6, 42.85], [-1.8, 43.38], [-1.45, 44.6], [-1.2, 45.6],
  [-1.2, 46.2], [-2.2, 46.9], [-2.6, 47.4], [-4.5, 47.95], [-4.75, 48.4], [-3.5, 48.8], [-1.6, 48.65], [-1.95, 49.7],
  [-1.25, 49.65], [0.1, 49.45], [1.5, 50.1], [1.6, 50.75], [2.37, 51.03],
];
const CITIES = [
  ['Paris', 2.35, 48.86, 'l'], ['Lyon', 4.84, 45.76, 'r'], ['Lille', 3.06, 50.63, 'l'], ['Bordeaux', -0.58, 44.84, 'l'],
  ['Bruxelles', 4.35, 50.85, 'r'], ['Barcelone', 2.17, 41.39, 'r'], ['Luxembourg', 6.13, 49.61, 'r'],
];

let mint, black, cam, world, wlabels, mlabels, heads, headRoot, parts, dots, cityEls, scaleWords, tilt;

const at = (name, [x, y], s = 1, rot = 0) => sample(ICON[name], [x, y], s, rot);

// ----------------------------------------------------------------------------------------------- construction
export function build(ctx) {
  ctx.cord.flat = true; // dans ce film, le fil reste un trait plat, jusqu'au store et à la signature
  ctx.shared.noSubs = true;
  buildMint(ctx);
  buildBlack(ctx);
  buildHeads(ctx);
  ctx.shared.cues = {
    ...(ctx.shared.cues || {}),
    pen2: [...mint.pen(), ...black.pen()],
    ticks: [28.5, 28.9, 29.3],
    particles: [30.85, 31.95],
    chosen: 32.15,
    door: 34.5,
    weights: T.clauses,
    stampCircle: 40.12,
    keyTurn: 44.15,
    cityDots: CITIES.map(([n]) => T.cities[n]),
  };
}

function buildMint(ctx) {
  // Coordonnées écran (aplat menthe, pas de caméra)
  const U = pick(800, 505);
  const d = new Drawing();
  // Le trait arrive par la droite et souligne « tire le fil. », puis descend le long de la marge jusqu'au portrait
  d.push(line([W + 40, U], [pick(110, 96), U]), 16.3, 16.85, E.inOutCubic, 'rush');
  d.push(curve([d.cur, [pick(66, 56), U + 30], [pick(70, 58), U + 120], [pick(84, 70), pick(1290, 890)]]), 16.85, 17.2, E.inOutCubic);
  const adv = at('advisor', [pick(210, 190), pick(1180, 785)], 0.55);
  d.to(adv, 17.25, 18.15, sine, 'icon', 0.05);
  // Bulle : l'interlocuteur unique (le texte apparaît dedans)
  const bx0 = pick(360, 330), bx1 = pick(1010, 905), by0 = pick(1090, 728), by1 = pick(1190, 812), r = 26;
  const bubble = [
    ...line([bx0 + 40, by1], [bx0 + r, by1]),
    ...arc([bx0 + r, by1 - r], r, Math.PI / 2, Math.PI).slice(1),
    ...line([bx0, by1 - r], [bx0, by0 + r]).slice(1),
    ...arc([bx0 + r, by0 + r], r, Math.PI, 1.5 * Math.PI).slice(1),
    ...line([bx0 + r, by0], [bx1 - r, by0]).slice(1),
    ...arc([bx1 - r, by0 + r], r, -Math.PI / 2, 0).slice(1),
    ...line([bx1, by0 + r], [bx1, by1 - r]).slice(1),
    ...arc([bx1 - r, by1 - r], r, 0, Math.PI / 2).slice(1),
    ...line([bx1 - r, by1], [bx0 + 70, by1]).slice(1),
    ...line([bx0 + 70, by1], [bx0 - 30, by1 + 46]).slice(1),
    ...line([bx0 - 30, by1 + 46], [bx0 + 40, by1]).slice(1),
  ];
  d.to(bubble, 18.5, 19.35, E.inOutCubic, 'icon', 0.2);
  // Du brief… jusqu'à la remise des clés : un trait droit d'un document jusqu'à une clé
  const yk = pick(1360, 968);
  const doc = at('doc', [pick(350, 322), yk], 1);
  d.to(doc, 20.1, 20.45, sine, 'icon', 0.25);
  const key = at('key', [pick(880, 880), yk], 0.9);
  d.push(line(d.cur, [d.cur[0] + 40, yk + 40]), 20.45, 20.55);
  d.push(line(d.cur, [key[0][0] - 60, yk + 40]), 20.55, 21.25, E.inOutCubic, 'rush');
  d.push(line(d.cur, key[0]), 21.25, 21.35);
  d.push(key, 21.35, 21.95, sine, 'icon');
  mint = d.build();

  const sz = Math.round(L.subSize * 1.12);
  const lab = (text, x, y, t) => {
    const wrap = el('div', { cls: 'mask display', style: { position: 'absolute', left: x + 'px', top: y + 'px', fontSize: sz + 'px', fontFamily: "'Noto Sans', sans-serif", fontWeight: '600', color: INK, letterSpacing: '-0.012em' } }, ctx.layers.text);
    return { wrap, inner: el('span', { text }, wrap), t };
  };
  mlabels = [
    lab('Un conseiller dédié.', pick(380, 345), pick(1000, 648), T.sub1),
    lab('Un seul interlocuteur.', bx0 + 34, by0 + (by1 - by0 - sz * 1.25) / 2, T.sub2),
    lab('Du brief à la remise des clés.', pick(420, 392), yk - pick(110, 92), T.sub3),
  ];
}

function buildBlack(ctx) {
  const R = rng(9);
  const d = new Drawing();
  parts = {};
  d.push(line([X.cw - 1500, 0], [X.cw - 270, 0]), T.line - 0.05, 22.32, E.outCubic, 'rush');
  // Formats
  const icon = (name, x, t0, t1, lead = 0.25) => {
    const pts = at(name, [x, 0]);
    d.push(line(d.cur, pts[0]), t0 - lead, t0, E.inOutCubic, 'rush');
    return d.push(pts, t0, t1, sine, 'icon');
  };
  icon('cowork', X.cw, 22.32, 22.95, 0.02);
  icon('opere', X.op, 23.42, 24.1);
  icon('bail', X.bl, 24.45, 25.15);
  // Étape 1 : la liste se coche, une case après l'autre
  icon('clip', X.s1, 27.15, 28.15, 0.5);
  const tick = (y) => [[X.s1 - 18, y - 2], [X.s1, y + 20], [X.s1 + 45, y - 38]];
  [-360, -240, -120].forEach((y, k) => {
    const tk = tick(y);
    d.push(line(d.cur, tk[0]), 28.2 + k * 0.4, 28.3 + k * 0.4);
    d.push([...line(tk[0], tk[1]), ...line(tk[1], tk[2]).slice(1)], 28.3 + k * 0.4, 28.5 + k * 0.4, E.outCubic, 'icon');
  });
  d.push(line(d.cur, [X.s1 + 190, 0]), 29.35, 29.5);
  // Étape 2 : l'entonnoir (le marché passé au crible)
  icon('funnel', X.s2, 30.0, 30.75, 0.45);
  // Étape 3 : la porte s'ouvre
  const fr = sample('M -260 0 L -140 0 L -140 -480 L 140 -480 L 140 0', [X.s3, 0]);
  d.push(line(d.cur, fr[0]), 33.2, 33.65, E.inOutCubic, 'rush');
  d.push(fr, 33.65, 34.15, sine, 'icon');
  const leafUV = [];
  const leafPts = [];
  const addUV = (u0, v0, u1, v1) => {
    const n = 40;
    for (let i = leafUV.length ? 1 : 0; i <= n; i++) leafUV.push([lerp(u0, u1, i / n), lerp(v0, v1, i / n)]);
  };
  addUV(0, 0, 1, 0); addUV(1, 0, 1, 1); addUV(1, 1, 0, 1);
  const leafAt = (o, [u, v]) => {
    const fx = lerp(-140, 60, o), sk = lerp(0, 34, o);
    return [X.s3 + 140 - u * (140 - fx), lerp(-sk * u, -480 + sk * u, v)];
  };
  leafUV.forEach((uv) => leafPts.push(leafAt(1, uv)));
  const leaf = d.push(leafPts, 34.15, 34.45, sine, 'icon');
  leaf.anim = (i, t) => leafAt(E.inOutCubic(prog(t, 34.5, 35.0)), leafUV[i - leaf.i0]);
  d.push(line(d.cur, [X.s3 + 140, 0]), 34.45, 34.55);
  d.push(line(d.cur, [X.s3 + 260, 0]), 34.55, 34.65);
  // Étape 4 : la balance (fléau et plateaux animés par le poids des mots)
  const piv = [X.s4, -420];
  d.push(line(d.cur, [X.s4 - 260, 0]), 36.2, 36.65, E.inOutCubic, 'rush');
  d.push([...line([X.s4 - 260, 0], [X.s4 - 90, 0]), ...line([X.s4 - 90, 0], [X.s4 - 60, -30]).slice(1), ...line([X.s4 - 60, -30], [X.s4, -30]).slice(1), ...line([X.s4, -30], piv).slice(1)], 36.65, 36.95, sine, 'icon');
  const beamL = d.push(line(piv, [X.s4 - 210, -420]), 36.95, 37.05, sine, 'icon');
  const plate = (cx) => [...line([cx, -420], [cx - 70, -250]), ...curve([[cx - 70, -250], [cx, -228], [cx + 70, -250]]).slice(1), ...line([cx + 70, -250], [cx, -420]).slice(1)];
  const plL = d.push(plate(X.s4 - 210), 37.05, 37.25, sine, 'icon');
  const beamM = d.push(line([X.s4 - 210, -420], [X.s4 + 210, -420]), 37.25, 37.35, sine, 'icon');
  const plR = d.push(plate(X.s4 + 210), 37.35, 37.55, sine, 'icon');
  const beamR = d.push(line([X.s4 + 210, -420], piv), 37.55, 37.62, sine, 'icon');
  d.push([...line(piv, [X.s4, -30]), ...line([X.s4, -30], [X.s4 + 60, -30]).slice(1), ...line([X.s4 + 60, -30], [X.s4 + 90, 0]).slice(1), ...line([X.s4 + 90, 0], [X.s4 + 260, 0]).slice(1)], 37.62, 37.85, sine, 'icon');
  // Coup de tampon : un cercle vif autour de la balance, quand tout est équilibré
  const cr = Math.hypot(260, 230), a0 = Math.atan2(230, 260);
  d.push(arc([X.s4, -230], cr, a0, a0 - Math.PI * 2), 40.1, 40.42, E.inOutCubic, 'rush');
  const rot = (p, th) => {
    const dx = p[0] - piv[0], dy = p[1] - piv[1];
    return [piv[0] + dx * Math.cos(th) - dy * Math.sin(th), piv[1] + dx * Math.sin(th) + dy * Math.cos(th)];
  };
  const endL = [X.s4 - 210, -420], endR = [X.s4 + 210, -420];
  for (const sg of [beamL, beamM, beamR]) sg.anim = (i, t) => rot(d.path[i], tilt(t));
  plL.anim = (i, t) => { const e = rot(endL, tilt(t)); return [d.path[i][0] + e[0] - endL[0], d.path[i][1] + e[1] - endL[1]]; };
  plR.anim = (i, t) => { const e = rot(endR, tilt(t)); return [d.path[i][0] + e[0] - endR[0], d.path[i][1] + e[1] - endR[1]]; };
  // Le fléau penche à chaque mot posé (loyer à gauche, charges à droite, travaux à gauche, durée à droite)
  tilt = (t) => {
    let a = 0;
    T.clauses.forEach((tc, k) => {
      const u = t - (tc + 0.3);
      if (u > 0) a += (k % 2 ? 1 : -1) * 0.13 * (1 - Math.exp(-u / 0.09) * Math.cos(u * 22));
    });
    return a;
  };
  parts.scale = { endL, endR, rot };
  // Étape 5 : la signature, puis la clé qui tourne
  d.push(line(d.cur, [X.s5 - 420, 0]), 40.7, 41.25, E.inOutCubic, 'rush');
  // La signature s'écrit pendant « Et on vous accompagne jusqu'à la signature… »
  d.push(loopy([[X.s5 - 420, 0], [X.s5 - 330, -60], [X.s5 - 240, -10], [X.s5 - 150, -70], [X.s5 - 60, -20], [X.s5 + 10, -40]], 1 / 65, 26), 41.35, 43.2, (x) => x, 'icon');
  d.push(curve([d.cur, [X.s5 + 60, 10], [X.s5 + 120, 0]]), 43.2, 43.45);
  const key = at('key', [X.s5 + 300, -150], 1.25);
  d.push(line(d.cur, key[0]), 43.45, 43.6);
  const keySeg = d.push(key, 43.6, 44.1, sine, 'icon');
  keySeg.anim = (i, t) => {
    const th = Math.PI * E.inOutCubic(prog(t, 44.15, 44.55));
    const p = d.path[i];
    return [p[0], -150 + (p[1] + 150) * Math.cos(th)];
  };
  d.push(line(d.cur, [X.s5 + 480, 0]), 44.1, 44.25);
  // Services : renégociation (le contrat et sa boucle), location à la journée (un jour entouré)
  icon('reneg', X.v1, 44.65, 45.35, 0.4);
  const ra0 = Math.atan2(200, 260);
  const loop = arc([X.v1, -200], Math.hypot(260, 200), ra0, ra0 - 1.72 * Math.PI);
  const tip = loop[loop.length - 1], tip2 = loop[loop.length - 8];
  const dir = Math.atan2(tip[1] - tip2[1], tip[0] - tip2[0]);
  const head = (a) => [tip[0] + Math.cos(dir + Math.PI + a) * 46, tip[1] + Math.sin(dir + Math.PI + a) * 46];
  d.push([...loop, ...line(tip, head(0.5)).slice(1), ...line(head(0.5), tip).slice(1), ...line(tip, head(-0.5)).slice(1)], 45.6, 46.4, E.inOutCubic, 'icon');
  d.push(line(d.cur, [X.v1 + 300, 0]), 46.4, 46.6);
  icon('cal', X.v2, 47.15, 47.9, 0.5);
  d.push(line(d.cur, [X.v2 + 110, -150]), 48.3, 48.42);
  d.push(arc([X.v2, -150], 110, 0, Math.PI * 2.08), 48.42, 48.85, E.inOutCubic, 'icon');
  // La carte : l'Hexagone, puis les villes reliées au moment où elles sont nommées
  const fr0 = proj(...FRANCE[0]);
  d.push(curve([d.cur, [X.v2 + 600, -40], [X.map - 900, -300], fr0]), 48.85, 49.4, E.inOutCubic, 'rush');
  d.push(curve(FRANCE.map(([lo, la]) => proj(lo, la))), 49.4, 49.95, (x) => x, 'icon');
  const order = CITIES.map(([n, lo, la]) => ({ n, p: proj(lo, la), t: T.cities[n] }));
  order.forEach((c) => {
    const prev = d.cur;
    const mid = [(prev[0] + c.p[0]) / 2 + (c.p[1] - prev[1]) * 0.12, (prev[1] + c.p[1]) / 2 - (c.p[0] - prev[0]) * 0.12];
    d.push(curve([prev, mid, c.p]), c.t - (c.n === 'Paris' ? 0.05 : 0.35), c.t, E.inOutCubic, 'icon');
  });
  black = d.build();

  // Particules de l'entonnoir : les offres tombent, trois seulement passent
  dots = Array.from({ length: 28 }, (_, k) => {
    const chosen = k === 6 || k === 13 || k === 21;
    const tIn = 30.8 + R() * 1.05;
    const x0 = X.s2 + (R() - 0.5) * 360;
    const yRest = -150 - R() * 230;
    const half = 30 + ((-yRest - 90) / 330) * 190;
    const xRest = X.s2 + (R() - 0.5) * 2 * (half - 18);
    return { chosen, tIn, x0, xRest, yRest, r: chosen ? 17 : 11, slot: [6, 13, 21].indexOf(k) };
  });

  // Textes du monde (sous les dessins)
  world = el('div', { cls: 'abs', style: { transformOrigin: '0 0' } }, ctx.layers.worldFront);
  const wl = (text, x, y, size, t, style = {}) => {
    const wrap = el('div', { cls: 'mask display', style: { position: 'absolute', left: '0', top: '0', fontSize: size + 'px', ...style } }, world);
    const inner = el('span', { html: text }, wrap);
    wrap.style.transform = `translate(${(x - wrap.offsetWidth / 2).toFixed(1)}px,${y}px)`;
    return { wrap, inner, t };
  };
  wlabels = [
    wl('Coworking', X.cw, 40, 58, 22.4), wl('Bureau opéré', X.op, 40, 58, 23.5), wl('Bail commercial', X.bl, 40, 58, 24.55),
    wl('3/6/9', X.bl, -265, 64, 24.9, { color: 'var(--mint)' }),
    wl('Signature', X.s5 - 200, 40, 50, 41.45, { fontWeight: '500', color: 'rgba(255,255,255,0.75)' }),
    wl('1', X.v2, -250, 150, 47.7, { fontWeight: '300' }), wl('journée', X.v2, -82, 40, 47.8, { fontWeight: '500', color: 'rgba(255,255,255,0.7)' }),
  ];
  // Les quatre mots tombent sur les plateaux de la balance
  scaleWords = ['Loyer', 'Charges', 'Travaux', 'Durée'].map((w, k) => {
    const wrap = el('div', { cls: 'display', text: w, style: { position: 'absolute', left: '0', top: '0', fontSize: '50px', whiteSpace: 'nowrap', color: '#FFFFFF' } }, world);
    return { wrap, w: wrap.offsetWidth, h: wrap.offsetHeight, t: T.clauses[k], side: k % 2 ? 1 : -1, level: Math.floor(k / 2) };
  });
  cityEls = order.map((c, k) => {
    const g = el('div', { cls: 'abs' }, world);
    const dot = el('div', { cls: 'abs', style: { left: '-15px', top: '-15px', width: '30px', height: '30px', borderRadius: '50%', background: '#FAFAF6', boxShadow: '0 0 0 6px #111, 0 0 0 11px #2ACAA5' } }, g);
    const side = CITIES[k][3];
    const lab = el('div', { cls: 'abs display', text: c.n, style: { fontSize: '50px', whiteSpace: 'nowrap', top: '-30px', [side === 'l' ? 'right' : 'left']: '32px' } }, g);
    if (side === 'l') lab.style.left = 'auto';
    g.style.transform = `translate(${c.p[0]}px,${c.p[1]}px)`;
    return { g, dot, lab, t: c.t };
  });

  // Caméra : elle longe le chemin, s'arrête sur chaque dessin, recule pour comparer les formats, puis pour la carte
  const stops = [
    [T.line - 0.3, X.cw, CAM_Y, 1], [23.25, X.op, CAM_Y, 1], [24.3, X.bl, CAM_Y, 1],
    [25.45, X.op, CAM_Y + 90, 0.62], [26.75, X.s1, CAM_Y, 1], [29.6, X.s2, CAM_Y, 1], [33.25, X.s3, CAM_Y, 1],
    [36.2, X.s4, CAM_Y - 10, 0.96], [40.7, X.s5, CAM_Y, 1], [44.4, X.v1, CAM_Y, 1], [46.75, X.v2, CAM_Y, 1],
    [49.0, MAP_C[0] + 60, MAP_C[1] - 70, 0.66],
  ];
  const focus = (t) => {
    let f = stops[0];
    for (const s of stops) if (t >= s[0]) f = s;
    return [f[1], f[2], f[3]];
  };
  cam = springCamera(focus, T.line - 0.4, T.free + 0.3, { w: 7.5, wz: 6 });
}

function buildHeads(ctx) {
  headRoot = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  const H_ = [
    { tin: T.line, lines: ['Coworking, bureau opéré', 'ou bail commercial ?'] },
    { tin: T.choose, lines: ['On vous aide', 'à choisir.'] },
    { tin: T.s1, num: '1', lines: ['On définit', 'votre besoin.'] },
    { tin: T.s2, num: '2', lines: ['On passe le marché', 'au crible.'] },
    { tin: T.s3, num: '3', lines: ['On visite', 'avec vous.'] },
    { tin: T.s4, num: '4', lines: ['On négocie', 'avec le bailleur.'] },
    { tin: T.s5, num: '5', lines: ['Jusqu’à la', 'remise des clés.'] },
    { tin: T.reneg, lines: ['Déjà installés ?', 'On renégocie.'] },
    { tin: T.day, lines: ['Une salle', 'pour une journée ?'] },
    { tin: T.map, lines: ['En France'] },
  ];
  heads = H_.map((h) => {
    const root = el('div', { cls: 'abs' }, headRoot);
    const row = el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: pick('28px', '20px') } }, root);
    let num = null;
    if (h.num) {
      const nw = el('div', { cls: 'mask display light', style: { fontSize: L.numSize + 'px', color: 'var(--mint)', lineHeight: '0.8', marginTop: pick('-2px', '-1px') } }, row);
      num = { wrap: nw, inner: el('span', { text: h.num }, nw) };
    }
    const col = el('div', {}, row);
    const lines = h.lines.map((s) => {
      const w = el('div', { cls: 'mask display', style: { fontSize: (h.num ? L.headSize : Math.round(L.headSize * 0.98)) + 'px', marginBottom: '4px' } }, col);
      return { wrap: w, inner: el('span', { html: s }, w) };
    });
    return { root, num, lines, tin: h.tin };
  });
  heads.forEach((h, i) => (h.tout = i + 1 < heads.length ? heads[i + 1].tin : T.free + 0.3));
  // « et en Europe. » s'ajoute sous « En France » sur « et jusqu'à »
  const last = heads[heads.length - 1];
  const w = el('div', { cls: 'mask display', style: { fontSize: Math.round(L.headSize * 0.98) + 'px', marginBottom: '4px' } }, last.lines[0].wrap.parentNode);
  last.europe = { wrap: w, inner: el('span', { text: 'et en Europe.' }, w) };
}

// ----------------------------------------------------------------------------------------------- rendu
function visible(dr, t, toS, anim = true) {
  const sH = dr.headS(t);
  const out = [];
  for (const sg of dr.segs) {
    if (dr.Ls[sg.i0] > sH + 0.01) break;
    for (let i = sg.i0; i <= sg.i1; i++) {
      if (dr.Ls[i] > sH + 0.01) break;
      const p = anim && sg.anim ? sg.anim(i, t) : dr.path[i];
      out.push(toS(p));
    }
  }
  return out;
}

export function update(t, ctx) {
  const g = ctx.cord.g;
  // --- Aplat menthe (16,3 → 22,25 s) : trait à l'encre, en coordonnées écran
  const mOn = t >= 16.25 && t < T.line;
  if (mOn) strokePts(g, visible(mint, t, (p) => p), INK, LW);
  mlabels.forEach((lb) => {
    show(lb.wrap, mOn && t >= lb.t - 0.02);
    const p = E.enter(prog(t, lb.t, lb.t + 0.6));
    lb.inner.style.transform = `translate3d(0,${((1 - p) * 135).toFixed(2)}%,0)`;
  });

  // --- Noir : le chemin et ses dessins (22,25 → 54,75 s)
  const on = t >= T.line - 0.05 && t < T.free + 0.6;
  show(world, on); show(headRoot, on && t < T.free + 0.3);
  if (!on) return;
  const [cx, cy, z] = cam(t);
  const toS = (p) => [(p[0] - cx) * z + W / 2, (p[1] - cy) * z + H / 2];
  world.style.transform = `translate(${(W / 2 - cx * z).toFixed(2)}px,${(H / 2 - cy * z).toFixed(2)}px) scale(${z.toFixed(5)})`;
  // Le store menthe de la gratuité recouvre le dessin : on ne trace qu'au-dessus de lui
  const by = t >= T.free ? blindY(t) : H + 100;
  g.save();
  g.beginPath(); g.rect(0, 0, W, by); g.clip();
  strokePts(g, visible(black, t, toS), MINT, Math.max(4, LW * z));
  // Particules de l'entonnoir
  for (const dt of dots) {
    if (t < dt.tIn) continue;
    let x, y, a = 1;
    const u = t - dt.tIn;
    const yFall = -900 + 0.5 * 3200 * u * u + 600 * u;
    if (yFall < dt.yRest) { x = dt.x0 + (dt.xRest - dt.x0) * Math.min(1, u / 0.5); y = yFall; }
    else { x = dt.xRest; y = dt.yRest; }
    if (dt.chosen && t > 32.15 + dt.slot * 0.14) {
      // Choisi : il passe le goulot, tombe sur le chemin et roule à sa place
      const v = t - (32.15 + dt.slot * 0.14);
      const yy = Math.min(-dt.r, dt.yRest + 0.5 * 3200 * v * v);
      const xx = lerp(dt.xRest, X.s2, Math.min(1, v / 0.25));
      const roll = E.outCubic(prog(v, 0.35, 0.9));
      x = lerp(xx, X.s2 + 330 + dt.slot * 70, roll); y = yy;
    } else if (!dt.chosen) {
      // Les autres s'effacent : on ne garde que les bons espaces
      a = 1 - prog(t, 32.25, 32.6);
      // Petite secousse de l'entonnoir
      x += Math.sin(t * 60) * 5 * (prog(t, 31.75, 31.85) - prog(t, 32.2, 32.3));
    }
    if (a <= 0) continue;
    const [sx, sy] = toS([x, y]);
    g.globalAlpha = a;
    g.fillStyle = dt.chosen ? '#FAFAF6' : MINT;
    g.beginPath(); g.arc(sx, sy, dt.r * z, 0, Math.PI * 2); g.fill();
    if (dt.chosen) { g.strokeStyle = MINT; g.lineWidth = 5 * z; g.stroke(); }
    g.globalAlpha = 1;
  }
  // Lumière dans l'encadrement de la porte une fois ouverte
  const lo = E.inOutCubic(prog(t, 34.55, 35.1));
  if (lo > 0 && t < 38) {
    const q = [[X.s3 - 140, 0], [X.s3 + 60, -34 * lo], [X.s3 + 60, -480 + 34 * lo], [X.s3 - 140, -480]].map(toS);
    g.globalAlpha = 0.22 * lo;
    g.fillStyle = MINT;
    g.beginPath(); q.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
  world.style.clipPath = by < H ? `inset(0 0 ${Math.max(0, H - by).toFixed(1)}px 0)` : '';

  // --- Textes du monde
  wlabels.forEach((lb) => {
    show(lb.wrap, t >= lb.t - 0.02);
    const p = E.enter(prog(t, lb.t, lb.t + 0.6));
    lb.inner.style.transform = `translate3d(0,${((1 - p) * 135).toFixed(2)}%,0)`;
  });
  // Mots posés sur la balance : ils tombent, rebondissent et suivent leur plateau
  const sc = parts.scale;
  scaleWords.forEach((sw) => {
    show(sw.wrap, t >= sw.t - 0.05 && t < T.s5 + 0.5);
    if (t < sw.t - 0.05) return;
    const e = sc.rot(sw.side < 0 ? sc.endL : sc.endR, tilt(t));
    const base = sw.side < 0 ? sc.endL : sc.endR;
    const px = base[0] + e[0] - base[0], py = -232 + e[1] - base[1] - sw.level * 52;
    const u = t - sw.t;
    const drop = u < 0.3 ? -260 * (1 - (u / 0.3) ** 2) : -24 * Math.exp(-(u - 0.3) / 0.08) * Math.abs(Math.sin((u - 0.3) * 30));
    sw.wrap.style.transform = `translate(${(px - sw.w / 2).toFixed(1)}px,${(py - sw.h + drop).toFixed(1)}px)`;
    op(sw.wrap, prog(t, sw.t - 0.05, sw.t + 0.05));
  });
  // Villes
  cityEls.forEach((c) => {
    const a = E.soft(prog(t, c.t - 0.04, c.t + 0.3));
    c.dot.style.transform = `scale(${Math.max(0.001, a).toFixed(4)})`;
    op(c.lab, prog(t, c.t, c.t + 0.25));
    c.lab.style.transform = `translateY(${((1 - E.enter(prog(t, c.t, c.t + 0.5))) * 14).toFixed(2)}px)`;
  });

  // --- Titres (fixes à l'écran)
  heads.forEach((h) => {
    const vis = t >= h.tin - 0.05 && t < h.tout + 0.05;
    show(h.root, vis);
    if (!vis) return;
    const parts2 = (h.num ? [h.num] : []).concat(h.lines);
    parts2.forEach((ln, k) => {
      const t0 = h.tin + 0.02 + k * 0.08;
      const p = E.enter(prog(t, t0, t0 + 0.7));
      const q = E.exit(prog(t, h.tout - 0.34 + k * 0.035, h.tout - 0.04 + k * 0.035));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    });
    if (h.europe) {
      const p = E.enter(prog(t, T.europe, T.europe + 0.7)), q = E.exit(prog(t, h.tout - 0.3, h.tout));
      h.europe.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    }
  });
}
