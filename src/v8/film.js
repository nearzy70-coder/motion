// Film v8 « Le Plan » : tout le film est un grand plan d'architecte, sur papier blanc, parcouru par une caméra.
// Le protagoniste est un point d'encre, « vous ». Desk to Desk, c'est l'anneau menthe qui l'entoure à partir du drop.
//
//  0 – 11,5 s   L'entreprise grandit : un bureau, une pièce, des équipes, des projets… puis les murs se resserrent.
// 11,6 – 21,9   La recherche : le marché autour, chercher, comparer, organiser les visites, comprendre, négocier encore.
// 21,9 – 26,4   Pendant ce temps : l'entreprise en pause, et en pointillés ce qu'elle pourrait devenir.
// 26,8 – 41,7   Quatre murs : chaque mur devient une cote (endroit, conditions, configuration, moment), puis tout
//               repose sur le point, et se dédouble jusqu'au chaos ; silence.
// 41,7 – 45     Desk to Desk : l'anneau menthe, le chaos se range, aplat menthe sur « Desk to Desk ».
// 45 – 50,4     De la recherche à la signature : le point avance sur une ligne menthe, quatre étapes.
// 50,7 – 60,6   Vos besoins → l'espace qui correspond exactement → sélection, comparaison, négociation → jusqu'au bout.
// 60,8 – 69,3   Simple, efficace ; votre temps revient à l'entreprise, qui grandit dans ses nouveaux bureaux.
// 69,3 – 76,5   Signature.
import { el, show, op, tf } from '../lib/dom.js';
import { E, prog, lerp, clamp, rng, bezier } from '../lib/ease.js';
import { T, L, W, H, C } from './timeline.js';
import * as D from './draw.js';

const { cam } = D;
const move = bezier(0.65, 0, 0.35, 1);
const whip = bezier(0.76, 0, 0.2, 1);
const pop = E.soft;
const win = (t, a, b) => t >= a && t < b;

let g, veil, shade, mintPane, brand, caps = [], endCard;

// ================================================================== scène A : l'entreprise
const CLUSTERS = [[-262, -96], [262, -96], [-262, 176], [262, 176]];
const EXTRA = [[-330, 40, Math.PI / 2], [330, 40, -Math.PI / 2], [-120, 268, Math.PI], [120, 268, Math.PI], [-150, -190, 0], [150, -190, 0]];
const STANDERS = [[-120, 70], [104, 96], [-40, 150], [40, -96], [-190, 40], [196, 30], [-60, 220], [70, 230]];
const roomA = (t) => {
  // première pièce → grande pièce (équipes) → les murs se resserrent (besoin de nouveaux bureaux)
  const grow = move(prog(t, T.teams, T.teams + 1.05));
  const squeeze = E.inOutCubic(prog(t, T.need + 0.1, T.newOffices + 0.05));
  const w = lerp(lerp(300, 820, grow), 700, squeeze), h = lerp(lerp(236, 600, grow), 500, squeeze);
  return { x: 0, y: lerp(18, 38, grow), w, h };
};
function drawOffice(t, o = {}) {
  const gray = o.gray ?? 0;
  const ink = gray > 0 ? mixHex(C.ink, '#B9BAB4', gray) : C.ink;
  const R = roomA(t);
  // projets : cartes menthe sur un tableau le long du mur du haut
  if (t > T.projects - 0.1) {
    const n = Math.floor(lerp(0, 22, clamp((t - T.projects) / 1.25)));
    for (let i = 0; i < 22; i++) {
      const tp = T.projPops[i] ?? T.projects + 0.15 + i * 0.055;
      const s = pop(prog(t, tp, tp + 0.22));
      if (s <= 0 || i >= Math.max(n, T.projPops.filter((x) => x <= t).length)) continue;
      const cx = -300 + (i % 11) * 60, cy = R.y - R.h / 2 + 34 + Math.floor(i / 11) * 34;
      g.fillStyle = gray > 0 ? mixHex(C.mint, '#C9CAC3', gray) : C.mint;
      D.withT(g, cx, cy, 0, s, () => { D.rrect(g, -22, -12, 44, 24, 4); g.fill(); });
    }
  }
  // bureau central : « vous »
  D.desk(g, 0, 0, 0, { s: pop(prog(t, 1.95, 2.3)), ink });
  // îlots des équipes
  CLUSTERS.forEach(([x, y], i) => {
    const tp = T.teamPops[i];
    D.cluster(g, x, y, 0, { s: pop(prog(t, tp, tp + 0.3)), ink, who: gray > 0 ? '#B9BAB4' : true });
  });
  // un jour : la pièce se remplit (bureaux le long des murs, gens debout)
  EXTRA.forEach(([x, y, a], i) => D.desk(g, x, y, a, { s: pop(prog(t, T.oneDay + 0.15 + i * 0.2, T.oneDay + 0.45 + i * 0.2)), ink, who: gray > 0 ? '#B9BAB4' : true }));
  g.fillStyle = gray > 0 ? '#B9BAB4' : C.ink;
  STANDERS.forEach(([x, y], i) => {
    const s = pop(prog(t, T.oneDay + 0.3 + i * 0.16, T.oneDay + 0.55 + i * 0.16));
    if (s > 0) { g.beginPath(); g.arc(x, y, 8.5 * s, 0, Math.PI * 2); g.fill(); }
  });
  // murs
  const wp = [0, 1, 2, 3].map((k) => move(prog(t, 2.35 + k * 0.26, 2.7 + k * 0.26)));
  const flash = t > T.newOffices && t < T.newOffices + 0.5 ? 1 - prog(t, T.newOffices + 0.1, T.newOffices + 0.5) : 0;
  const wallCol = flash > 0 ? mixHex(ink, C.mint, flash) : ink;
  D.room(g, R.x, R.y, R.w, R.h, 13, { wallP: wp, color: wallCol, door: { side: 'b', at: 0.72, w: 56, open: 1, inward: -1 } });
  // le point « vous », assis au bureau central
  D.you(g, 0, 34, { s: pop(prog(t, 1.55, 1.9)), color: gray > 0 ? '#9B9C96' : C.ink, ring: o.ring ?? 0 });
}

// ================================================================== scène B : le marché
const SHEETS = (() => {
  const R = rng(21);
  const out = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = (c - 2.5) * 560 + (R() - 0.5) * 120, y = (r - 1.5) * 650 + 60 + (R() - 0.5) * 120;
    if (Math.abs(x) < 640 && Math.abs(y - 60) < 520) continue;
    out.push({ x, y, a: (R() - 0.5) * 0.16, seed: 40 + out.length, t: 11.75 + R() * 0.7 });
  }
  return out;
})();
const HOPS = [3, 8, 12, 4, 10];
const ROUTE = [1, 6, 13, 9];
function drawMarket(t, fade = 1) {
  const busy = (k) => (win(t, T.compare - 0.05, T.visits + 0.2) && (k === 2 || k === 11));
  SHEETS.forEach((s, k) => {
    if (busy(k)) return;
    const a = pop(prog(t, s.t, s.t + 0.35));
    const scanned = HOPS.indexOf(k) >= 0 && t > T.search + 0.25 + HOPS.indexOf(k) * 0.29;
    D.sheet(g, s.x, s.y, 380, 470, s.seed, { s: lerp(1.15, 1, a), alpha: Math.min(1, a * 1.5) * fade, a: s.a, outline: scanned ? '#C9CAC3' : null, outlineW: 8 });
  });
}
function drawSearch(t) {
  if (!win(t, T.search - 0.1, T.compare + 0.2)) return;
  const k = Math.min(HOPS.length - 1, Math.floor((t - T.search) / 0.29));
  const u = whip(clamp(((t - T.search) % 0.29) / 0.22));
  const a = SHEETS[HOPS[Math.max(0, k)]], b = SHEETS[HOPS[Math.min(HOPS.length - 1, k + 1)]];
  const done = t > T.search + 0.29 * (HOPS.length - 1);
  const p = t < T.search ? [SHEETS[HOPS[0]].x, SHEETS[HOPS[0]].y] : done ? [b.x, b.y] : [lerp(a.x, b.x, u), lerp(a.y, b.y, u)];
  g.globalAlpha = Math.min(prog(t, T.search - 0.1, T.search + 0.1), 1 - prog(t, T.compare - 0.05, T.compare + 0.2));
  D.magnifier(g, p[0] - 40, p[1] - 40, 150, { lw: 26 });
  g.globalAlpha = 1;
}
function drawCompare(t) {
  if (!win(t, T.compare - 0.1, T.visits + 0.35)) return;
  const inn = whip(prog(t, T.compare - 0.05, T.compare + 0.4)), out = whip(prog(t, T.visits - 0.15, T.visits + 0.25));
  const c = [cam.x, cam.y + 30];
  [[2, -1], [11, 1]].forEach(([k, side]) => {
    const s = SHEETS[k];
    const x = lerp(lerp(s.x, c[0] + side * 330, inn), s.x, out), y = lerp(lerp(s.y, c[1], inn), s.y, out);
    D.sheet(g, x, y, 380, 470, s.seed, { s: lerp(1, 1.55, inn * (1 - out)), a: lerp(s.a, 0, inn * (1 - out)) });
  });
  // double flèche entre les deux offres
  const a = inn * (1 - out);
  if (a > 0.05) {
    const sw = Math.sin((t - T.compare) * 9) * 18;
    g.globalAlpha = a;
    g.strokeStyle = C.mint; g.lineWidth = 12;
    g.beginPath(); g.moveTo(c[0] - 46 + sw, c[1]); g.lineTo(c[0] + 46 + sw, c[1]); g.stroke();
    D.arrowHead(g, c[0] + 60 + sw, c[1], 0, 26, C.mint);
    D.arrowHead(g, c[0] - 60 + sw, c[1], Math.PI, 26, C.mint);
    g.globalAlpha = 1;
  }
}
function drawVisits(t) {
  if (!win(t, T.visits - 0.1, T.terms + 0.3)) return;
  const f = 1 - prog(t, T.terms - 0.1, T.terms + 0.2);
  // parcours de visite en pointillés entre quatre annonces
  const pts = ROUTE.map((k) => [SHEETS[k].x, SHEETS[k].y]);
  const u = move(prog(t, T.visits + 0.05, T.visits + 1.05));
  g.globalAlpha = f;
  g.strokeStyle = C.mint; g.lineWidth = 14; g.setLineDash([34, 26]);
  D.poly(g, D.partial(pts, u)); g.stroke(); g.setLineDash([]);
  ROUTE.forEach((k, i) => {
    const s = pop(prog(t, T.visits + 0.05 + i * 0.32, T.visits + 0.3 + i * 0.32));
    if (s > 0) { g.fillStyle = C.mint; g.beginPath(); g.arc(SHEETS[k].x, SHEETS[k].y, 30 * s, 0, Math.PI * 2); g.fill(); }
  });
  // agenda : les créneaux se remplissent
  const ca = pop(prog(t, T.visits + 0.1, T.visits + 0.45));
  if (ca > 0) {
    D.withT(g, cam.x + 360, cam.y + 420, 0, ca, () => {
      g.save(); g.shadowColor = 'rgba(17,17,17,0.16)'; g.shadowBlur = 30 * cam.z; g.shadowOffsetY = 12 * cam.z;
      g.fillStyle = '#FFFFFF'; g.fillRect(-380, -240, 760, 480); g.restore();
      g.fillStyle = C.ink; g.fillRect(-380, -240, 760, 70);
      g.strokeStyle = '#DADAD2'; g.lineWidth = 3;
      for (let c = 1; c < 5; c++) { g.beginPath(); g.moveTo(-380 + c * 152, -170); g.lineTo(-380 + c * 152, 240); g.stroke(); }
      for (let r = 1; r < 4; r++) { g.beginPath(); g.moveTo(-380, -170 + r * 102); g.lineTo(380, -170 + r * 102); g.stroke(); }
      [[0, 1], [2, 0], [3, 2], [1, 3], [4, 1]].forEach(([c, r], i) => {
        const s = pop(prog(t, T.visits + 0.35 + i * 0.2, T.visits + 0.55 + i * 0.2));
        if (s <= 0) return;
        g.fillStyle = C.mint;
        D.withT(g, -380 + c * 152 + 76, -170 + r * 102 + 51, 0, s, () => { D.rrect(g, -62, -38, 124, 76, 8); g.fill(); });
      });
    });
  }
  g.globalAlpha = 1;
}
function drawTerms(t) {
  if (!win(t, T.terms - 0.1, T.nego + 0.3)) return;
  const inn = whip(prog(t, T.terms - 0.05, T.terms + 0.35)), out = whip(prog(t, T.nego - 0.2, T.nego + 0.2));
  const x = cam.x - out * 1400, y = cam.y + 40 + (1 - inn) * 1400;
  const scroll = Math.max(0, t - T.terms - 0.3) * 5.5;
  const hiAt = [[5, T.terms + 0.45], [8, T.terms + 0.8], [12, T.terms + 1.1]];
  D.contract(g, x, y, 640, 820, {
    lines: 15, scroll, seed: 9,
    hi: (k) => { for (const [kk, th] of hiAt) if (k === kk) return clamp((t - th) / 0.25); return 0; },
  });
  D.magnifier(g, x + 200, y + 150, 110 * inn, { lw: 22, color: C.ink });
}
// Négocier, encore, et encore : la flèche fait l'aller-retour, de plus en plus vite, et laisse une pelote de traces
const THROWS = [[19.08, 0.42], [19.56, 0.38], [20.03, 0.32], [20.38, 0.3], [20.8, 0.2], [21.02, 0.18], [21.22, 0.16], [21.4, 0.15], [21.56, 0.14], [21.71, 0.13]];
function drawNego(t) {
  if (!win(t, T.nego - 0.15, T.meanwhile + 1.2)) return;
  const f = (1 - prog(t, T.meanwhile + 0.1, T.meanwhile + 0.7)) * prog(t, T.nego - 0.15, T.nego + 0.1);
  const A = [cam.x - 360, cam.y + 80], B = [cam.x + 360, cam.y + 80];
  g.globalAlpha = f;
  D.you(g, A[0], A[1], { r: 30 });
  g.strokeStyle = C.ink; g.lineWidth = 7;
  g.beginPath(); g.arc(B[0], B[1], 30, 0, Math.PI * 2); g.stroke();
  D.text(g, 'Vous', A[0], A[1] + 100, 54, { align: 'center' });
  D.text(g, 'Bailleur', B[0], B[1] + 100, 54, { align: 'center' });
  THROWS.forEach(([t0, d], i) => {
    if (t < t0) return;
    const u = clamp((t - t0) / d);
    const dir = i % 2 ? -1 : 1;
    const bend = (i % 4 < 2 ? -1 : 1) * (150 + i * 14);
    const P = (s) => {
      const x = dir > 0 ? lerp(A[0] + 50, B[0] - 50, s) : lerp(B[0] - 50, A[0] + 50, s);
      return [x, A[1] + bend * Math.sin(Math.PI * s)];
    };
    const pts = Array.from({ length: 33 }, (_, j) => P((j / 32) * E.inOutCubic(u)));
    g.strokeStyle = u < 1 ? C.mint : 'rgba(42,202,165,0.35)';
    g.lineWidth = u < 1 ? 9 : 5;
    D.poly(g, pts); g.stroke();
    if (u < 1) {
      const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 3];
      D.arrowHead(g, x1, y1, Math.atan2(y1 - y0, x1 - x0), 24, C.mint);
    }
  });
  g.globalAlpha = 1;
}

// ================================================================== scène C : ce que l'entreprise pourrait devenir
function drawGhost(t) {
  if (t < T.could - 0.1 || t > T.because + 0.6) return;
  const a = prog(t, T.could, T.could + 0.3);
  const gr = move(prog(t, T.could, T.could + 1.1));
  const push = move(prog(t, T.avancer, T.avancer + 0.8));
  const w = lerp(700, 1500, gr), h = lerp(500, 980, gr);
  g.globalAlpha = a;
  g.strokeStyle = C.mint; g.lineWidth = 9; g.setLineDash([30, 20]);
  g.strokeRect(-w / 2 + push * 120, 40 - h / 2, w, h);
  g.setLineDash([16, 12]); g.lineWidth = 4;
  [[-560, -250], [560, -250], [-560, 330], [560, 330], [0, -330], [0, 410]].forEach(([x, y], i) => {
    const s = pop(prog(t, T.could + 0.5 + i * 0.12, T.could + 0.75 + i * 0.12));
    if (s <= 0) return;
    D.withT(g, x * gr + push * 120, y * gr, 0, s, () => {
      for (const [dx, dy] of [[-37, -20], [37, -20], [-37, 20], [37, 20]]) { D.rrect(g, dx - 36, dy - 20, 72, 40, 5); g.stroke(); }
    });
  });
  g.setLineDash([]);
  // avancer : une flèche menthe sort de l'entreprise
  if (push > 0) {
    const x0 = 380, x1 = lerp(380, 900, push);
    g.lineWidth = 16; g.beginPath(); g.moveTo(x0, 40); g.lineTo(x1, 40); g.stroke();
    D.arrowHead(g, x1 + 20, 40, 0, 40, C.mint);
  }
  g.globalAlpha = 1;
}

// ================================================================== scène D : quatre murs
const DX = 4200, DY = 60, RW = 440;
const DESKS_D = [[-100, -80, 0.5, 30.1], [95, -30, -0.35, 30.3], [-30, 105, 0.9, 30.5]];
const DESKS_D2 = [[-110, -30, 0], [0, -30, 0], [110, -30, 0]];
function roomD(t) {
  // l'ensemble se pose sur le point « vous », puis vacille
  const lift = move(prog(t, T.onYou, T.onYou + 0.9));
  const s = lerp(1, 0.46, lift);
  const base = [DX, DY + 306];   // point « vous »
  const cy = lerp(DY, base[1] - 21 - (RW / 2 + 9) * s, lift);
  const wob = lift * (0.05 + 0.12 * prog(t, T.complex, T.hush)) * (1 - E.inOutCubic(prog(t, T.exists + 0.3, T.exists + 1.4)));
  const ang = wob * Math.sin((t - T.onYou) * 5.2) + wob * 0.4 * Math.sin((t - T.onYou) * 11.3);
  return { s, cy, base, ang, lift };
}
function drawFourWalls(t) {
  if (t < T.because - 0.4 || t > T.drop + 0.4) return;
  const R = roomD(t);
  const wallT = [T.walls, T.walls + 0.13, T.walls + 0.26, T.walls + 0.39];
  const labelsT = [T.place + 0.6, T.cond + 0.55, T.config + 0.55, T.moment + 0.1];
  const wp = wallT.map((a) => whip(prog(t, a, a + 0.2)));
  const fill = labelsT.map((a) => (t > a + 0.15 ? mixHex(C.ink, C.mint, prog(t, a + 0.15, a + 0.4)) : C.ink));
  const hush = prog(t, T.hush, T.exists);
  // le chaos : copies décalées de la pièce
  const chaos = prog(t, T.complex, T.complex + 1.2) * (1 - E.inOutCubic(prog(t, T.exists + 0.25, T.exists + 1.3)));
  const pivot = [R.base[0], R.base[1] - 21];
  const draw = (dx, dy, da, alpha, thin) => {
    g.save();
    g.translate(pivot[0], pivot[1]); g.rotate(R.ang + da); g.translate(-pivot[0], -pivot[1]);
    g.translate(DX + dx, R.cy + dy); g.scale(R.s, R.s);
    g.globalAlpha = alpha;
    if (thin) {
      g.strokeStyle = C.ink; g.lineWidth = 3 / R.s;
      g.strokeRect(-RW / 2, -RW / 2, RW, RW);
    } else {
      // brouillon : contour en pointillés avant les murs
      const dr = move(prog(t, T.because + 0.2, T.because + 1.6)) * (1 - prog(t, T.walls, T.walls + 0.3));
      if (dr > 0) {
        g.strokeStyle = C.soft; g.lineWidth = 2.5; g.setLineDash([14, 12]);
        const c = RW / 2;
        D.poly(g, D.partial([[-c, -c], [c, -c], [c, c], [-c, c], [-c, -c]], dr)); g.stroke(); g.setLineDash([]);
      }
      // bureaux : en vrac, puis rangés (la bonne configuration)
      const tidy = move(prog(t, T.config + 0.3, T.config + 0.95));
      DESKS_D.forEach(([x, y, a, td], i) => {
        const s = 1 + 0.6 * (1 - E.outCubic(prog(t, td, td + 0.28)));
        const al = prog(t, td, td + 0.12);
        if (al <= 0) return;
        const [x2, y2, a2] = DESKS_D2[i];
        D.desk(g, lerp(x, x2, tidy), lerp(y, y2, tidy), lerp(a, a2, tidy), { s, alpha: al });
      });
      // la porte du mur gauche tourne comme une aiguille (au bon moment)
      const open = 0.25 + 0.75 * move(prog(t, T.moment + 0.1, T.moment + 0.7));
      D.room(g, 0, 0, RW, RW, 18, { wallP: wp, wallFill: fill, door: { side: 'l', at: 0.5, w: 110, open: t > T.moment ? open : 0.25, inward: 1 } });
      // cotes : un mot au lieu d'une mesure
      const c = RW / 2;
      const gone = 1 - prog(t, T.onYou + 0.1, T.onYou + 0.5);
      const dp = labelsT.map((a) => move(prog(t, a - 0.45, a)) * gone);
      const lp = labelsT.map((a) => E.outCubic(prog(t, a - 0.05, a + 0.3)) * gone);
      const col = (i) => (t > labelsT[i] + 0.15 ? C.mintDark : C.ink);
      D.dim(g, [-c, -c], [c, -c], -58, 'Le bon endroit', { p: dp[0], labelP: lp[0], color: col(0), labelColor: C.ink, size: 44, labelOff: 38, lw: 2.5 });
      D.dim(g, [c, -c], [c, c], -58, '', { p: dp[1], color: col(1), lw: 2.5 });
      if (lp[1] > 0) { g.globalAlpha = lp[1]; D.text(g, 'Les bonnes', c + 86, -12 + (1 - lp[1]) * 8, 44); D.text(g, 'conditions', c + 86, 40 + (1 - lp[1]) * 8, 44); g.globalAlpha = 1; }
      D.dim(g, [c, c], [-c, c], -58, 'La bonne configuration', { p: dp[2], labelP: lp[2], color: col(2), labelColor: C.ink, size: 44, labelOff: 40, lw: 2.5 });
      D.dim(g, [-c, c], [-c, -c], -58, '', { p: dp[3], color: col(3), lw: 2.5 });
      if (lp[3] > 0) { g.globalAlpha = lp[3]; D.text(g, 'Au bon', -c - 86, -12 + (1 - lp[3]) * 8, 44, { align: 'right' }); D.text(g, 'moment', -c - 86, 40 + (1 - lp[3]) * 8, 44, { align: 'right' }); g.globalAlpha = 1; }
      // le bon endroit : une épingle se plante au-dessus de la pièce
      D.pin(g, 0, lerp(-c - 140, -c - 30, 1 - gone), pop(prog(t, labelsT[0] + 0.1, labelsT[0] + 0.4)) * 1.25);
    }
    g.restore();
  };
  // copies du chaos, derrière
  if (chaos > 0) {
    const Rr = rng(77);
    for (let i = 0; i < 9; i++) {
      const k = clamp(chaos * 9 - i);
      if (k <= 0) continue;
      const drift = 1 + 0.15 * hush;
      draw((Rr() - 0.5) * 300 * k * drift, (Rr() - 0.5) * 240 * k * drift, (Rr() - 0.5) * 0.7 * k, 0.55 * k * (0.4 + 0.6 * chaos), true);
    }
    // gribouillis
    const Rs = rng(91);
    g.strokeStyle = C.ink; g.lineWidth = 3;
    g.globalAlpha = 0.8 * chaos;
    const pts = Array.from({ length: 60 }, () => [DX + (Rs() - 0.5) * 520, R.cy + (Rs() - 0.5) * 420]);
    D.poly(g, D.partial(pts, chaos)); g.stroke();
    g.globalAlpha = 1;
  }
  draw(0, 0, 0, 1, false);
  // le point « vous » qui porte tout ; l'anneau menthe arrive avec Desk to Desk
  const squash = 1 - 0.22 * pop(prog(t, T.vous, T.vous + 0.3)) * (1 - prog(t, T.exists + 0.4, T.exists + 1.0));
  D.you(g, R.base[0], R.base[1], { r: 21, s: pop(prog(t, T.onYou + 0.35, T.onYou + 0.7)), sy: squash, sx: 2 - squash, ring: move(prog(t, T.exists + 0.05, T.exists + 0.6)) });
}

// ================================================================== scène F : de la recherche à la signature
const FX0 = 8000;
const SX = [8560, 9160, 9760, 10360];
const STOPS = [[44.95, FX0], [T.stations[0], SX[0]], [T.stations[1], SX[1]], [T.stations[2], SX[2]], [T.stations[3], SX[3]], [50.6, SX[3] + 160]];
function dotF(t) {
  for (let i = 1; i < STOPS.length; i++) {
    const [t0, x0] = STOPS[i - 1], [t1, x1] = STOPS[i];
    if (t < t1) return lerp(x0, x1, E.inOutCubic(prog(t, Math.max(t0, t1 - 0.75), t1)));
  }
  return STOPS[STOPS.length - 1][1];
}
function drawRoute(t) {
  if (t < T.drop || t > T.needs + 0.6) return;
  const x = dotF(t);
  // la ligne menthe, toujours un peu en avance sur le point
  const head = Math.min(SX[3] + 260, x + 220 + 120 * prog(t, 45.0, 45.6));
  // couloir du plan, de part et d'autre du chemin
  g.strokeStyle = '#D5D6CF'; g.lineWidth = 3;
  for (const y of [-330, 300]) { g.beginPath(); g.moveTo(FX0 - 600, y); g.lineTo(SX[3] + 900, y); g.stroke(); }
  // le chemin prévu, en pointillés, puis le chemin parcouru en menthe
  g.strokeStyle = '#C9CAC3'; g.lineWidth = 5; g.setLineDash([18, 16]);
  g.beginPath(); g.moveTo(FX0, 0); g.lineTo(SX[3] + 260, 0); g.stroke(); g.setLineDash([]);
  SX.forEach((sx) => { if (head < sx - 10) { g.fillStyle = C.paper; g.strokeStyle = '#C9CAC3'; g.lineWidth = 5; g.beginPath(); g.arc(sx, 0, 20, 0, Math.PI * 2); g.fill(); g.stroke(); } });
  g.strokeStyle = C.mint; g.lineWidth = 14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(FX0, 0); g.lineTo(head, 0); g.stroke();
  g.lineCap = 'butt';
  const names = ['Recherche', 'Visites', 'Négociation', 'Signature'];
  SX.forEach((sx, i) => {
    const ts = T.stations[i];
    const a = pop(prog(t, ts - 0.35, ts));
    if (head < sx - 10) return;
    // nœud
    g.fillStyle = t > ts - 0.05 ? C.mint : '#FFFFFF';
    g.strokeStyle = C.mint; g.lineWidth = 8;
    g.beginPath(); g.arc(sx, 0, 24, 0, Math.PI * 2); g.fill(); g.stroke();
    if (a <= 0) return;
    g.globalAlpha = Math.min(1, a);
    D.text(g, names[i], sx, 128 + (1 - a) * 14, 56, { align: 'center' });
    D.withT(g, sx, -185, 0, a * 1.45, () => icon(i, t - ts));
    g.globalAlpha = 1;
  });
  D.you(g, x, 0, { r: 19, ring: 1, ringW: 7 });
}
function icon(i, dt) {
  if (i === 0) {
    // recherche : trois annonces en éventail, la loupe passe dessus
    [[-70, 10, -0.25], [0, -6, 0], [70, 10, 0.25]].forEach(([x, y, a], k) => D.sheet(g, x, y, 92, 116, 300 + k, { a }));
    D.magnifier(g, 10 + 30 * Math.sin(dt * 4), -20, 46, { lw: 10 });
  } else if (i === 1) {
    // visites : un seuil de porte qui s'ouvre
    D.room(g, 0, 10, 220, 150, 12, { wallP: [1, 0, 0, 0], door: { side: 't', at: 0.5, w: 90, open: move(clamp(dt / 0.6 + 0.3)), inward: 1 } });
    g.fillStyle = C.ink; g.fillRect(-110, 4, 12, 50); g.fillRect(98, 4, 12, 50);
  } else if (i === 2) {
    // négociation : deux flèches qui se rejoignent
    const u = move(clamp(dt / 0.6 + 0.4));
    g.strokeStyle = C.ink; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-120, -30); g.lineTo(lerp(-120, -14, u), -30); g.stroke();
    g.beginPath(); g.moveTo(120, 30); g.lineTo(lerp(120, 14, u), 30); g.stroke();
    D.arrowHead(g, lerp(-120, -14, u) + 14, -30, 0, 22, C.ink);
    D.arrowHead(g, lerp(120, 14, u) - 14, 30, Math.PI, 22, C.ink);
    g.lineCap = 'butt';
    if (u > 0.95) D.check(g, 0, 0, 1.3, clamp((dt - 0.25) / 0.25), C.mint, 12);
  } else {
    // signature : un trait signe la feuille
    D.contract(g, 0, 0, 170, 210, { lines: 5, seed: 3 });
    const pts = Array.from({ length: 40 }, (_, k) => [-55 + k * 2.8, 60 + Math.sin(k * 0.7) * 12 - k * 0.3]);
    g.strokeStyle = C.ink; g.lineWidth = 5; g.lineCap = 'round';
    D.poly(g, D.partial(pts, clamp(dt / 0.55 + 0.2))); g.stroke(); g.lineCap = 'butt';
  }
}

// ================================================================== scène G : avec vous
const GX = 12600, GY = 0;
const MATCH = 63;               // l'annonce qui correspond exactement
const CANDS = [71, 84, 92];     // celles qui ne correspondent pas
const FPW = 420, FPH = 300;
const GRID_G = (() => {
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) out.push({ x: GX + (c - 1.5) * 470, y: GY + (r - 1) * 560 - 10, seed: r * 4 + c === 5 ? MATCH : 120 + r * 4 + c });
  return out;
})();
const KEEP = [5, 2, 11];
function drawNeeds(t) {
  if (!win(t, T.needs - 0.3, T.select + 0.4)) return;
  const youP = [GX - 520, GY + 260];
  // bulle : vos besoins (le contour de votre entreprise, en pointillés)
  const b = pop(prog(t, T.needs + 0.1, T.needs + 0.45)) * (1 - prog(t, T.find + 0.2, T.find + 0.5));
  if (b > 0) {
    D.withT(g, youP[0] + 90, youP[1] - 300, 0, b, () => {
      g.save(); g.shadowColor = 'rgba(17,17,17,0.14)'; g.shadowBlur = 26 * cam.z; g.shadowOffsetY = 10 * cam.z;
      g.fillStyle = '#FFFFFF'; D.rrect(g, -250, -170, 500, 340, 26); g.fill();
      g.beginPath(); g.moveTo(-150, 160); g.lineTo(-200, 230); g.lineTo(-90, 165); g.fill(); g.restore();
      const fp = D.footprint(MATCH, 300, 210).map(([x, y]) => [x - 150, y - 125]);
      g.strokeStyle = C.mint; g.lineWidth = 8; g.setLineDash([20, 14]);
      D.poly(g, D.partial([...fp, fp[0]], move(prog(t, T.needs + 0.4, T.needs + 1.1)))); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#E3E3DC';
      for (let i = 0; i < 2; i++) g.fillRect(-150, 108 + i * 30, 180 + i * 60, 14);
    });
  }
  D.you(g, youP[0], youP[1], { r: 17, ring: 1, s: 1 - prog(t, T.find + 0.3, T.find + 0.6) });
}
function drawMatch(t) {
  if (!win(t, T.find, T.select + 0.6)) return;
  const tx = GX, ty = GY - 30;
  const tm = move(prog(t, T.find + 0.05, T.find + 0.55));
  // les candidats glissent sous le gabarit, le quatrième correspond
  const seq = [[CANDS[0], T.find + 0.5], [CANDS[1], T.find + 0.82], [CANDS[2], T.find + 1.1], [MATCH, T.match - 0.2]];
  seq.forEach(([seed, t0], i) => {
    const last = i === seq.length - 1;
    const tin = whip(prog(t, t0, t0 + 0.22)), tout = last ? 0 : whip(prog(t, t0 + 0.26, t0 + 0.42));
    if (tin <= 0 || tout >= 1) return;
    const x = tx + (1 - tin) * 900 - tout * 900;
    g.globalAlpha = last ? 1 : 0.9;
    const fill = last ? mixHex('#FFFFFF', C.mint, 0.85 * pop(prog(t, T.match, T.match + 0.3))) : '#FFFFFF';
    D.miniPlan(g, seed, x - FPW / 2, ty - FPH / 2, FPW, FPH, { wall: 9, fill });
    g.globalAlpha = 1;
  });
  // gabarit : vos besoins
  const fp = D.footprint(MATCH, FPW, FPH).map(([x, y]) => [lerp(GX - 430 + x * 0.714 - 0 * 1, tx - FPW / 2 + x, tm), lerp(GY - 30 - 125 + y * 0.7 - 300 + 260, ty - FPH / 2 + y, tm)]);
  g.strokeStyle = C.mint; g.lineWidth = 9; g.setLineDash([22, 14]);
  g.lineDashOffset = -t * 60;
  D.poly(g, fp, true); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
  // réellement : la coche
  const ck = prog(t, T.really, T.really + 0.3);
  if (ck > 0) {
    g.fillStyle = C.mint;
    g.beginPath(); g.arc(tx + FPW / 2 + 10, ty - FPH / 2 - 10, 50 * pop(prog(t, T.really - 0.05, T.really + 0.25)), 0, Math.PI * 2); g.fill();
    D.check(g, tx + FPW / 2 + 10, ty - FPH / 2 - 8, 1.25, ck, '#FFFFFF', 11);
  }
}
function drawSelect(t) {
  if (!win(t, T.select - 0.2, T.along + 0.8)) return;
  const inn = pop(prog(t, T.select - 0.15, T.select + 0.25));
  const cut = move(prog(t, T.select + 0.3, T.select + 0.75));
  const row = move(prog(t, T.compare2 - 0.2, T.compare2 + 0.3));
  const solo = move(prog(t, T.nego2 - 0.2, T.nego2 + 0.3));
  const leave = move(prog(t, T.along - 0.1, T.along + 0.5));
  GRID_G.forEach((s, k) => {
    const keep = KEEP.indexOf(k);
    if (keep < 0) {
      const a = inn * (1 - cut);
      if (a <= 0.01) return;
      D.sheet(g, s.x, s.y + cut * 60, 330, 410, s.seed, { alpha: a, s: 1 - 0.1 * cut });
      return;
    }
    // les trois retenues : en rang (comparer), puis la bonne seule au centre (négocier)
    let x = lerp(s.x, GX + (keep === 0 ? 0 : keep === 1 ? -480 : 480), row), y = lerp(s.y, GY - 40, row);
    let sc = lerp(1, 1.12, row);
    let alpha = inn;
    if (keep > 0) alpha *= 1 - solo;
    if (keep === 0) { x = lerp(x, GX - 230, solo); sc = lerp(sc, 1.3, solo); }
    alpha *= 1 - (keep === 0 ? 0 : 1) * leave;
    if (keep === 0) { x = lerp(x, GX + 900, leave); sc = lerp(sc, 0.7, leave); alpha *= 1 - leave; }
    if (alpha <= 0.01) return;
    D.sheet(g, x, y, 330, 410, s.seed, { alpha, s: sc, outline: keep === 0 && row > 0.5 ? C.mint : null, outlineW: 10 });
    // comparer : une barre sous chaque annonce, sans chiffres
    const bar = move(prog(t, T.compare2 + 0.15, T.compare2 + 0.6)) * (1 - solo);
    if (bar > 0) {
      g.globalAlpha = alpha;
      g.fillStyle = keep === 0 ? C.mint : '#C9CAC3';
      const bw = [300, 190, 230][keep] * bar;
      D.rrect(g, x - 165 * sc, y + 270 * sc, bw * sc, 26, 13); g.fill();
      g.globalAlpha = 1;
    }
  });
  // négocier : une ligne du bail barrée et réécrite en menthe
  if (solo > 0) {
    const cx = GX + 300, cy = GY - 40;
    const a = solo * (1 - leave);
    g.globalAlpha = a;
    D.contract(g, cx, cy, 380, 500, { lines: 8, seed: 14, s: lerp(0.8, 1, solo) });
    const st = move(prog(t, T.nego2 + 0.2, T.nego2 + 0.45));
    g.strokeStyle = C.ink; g.lineWidth = 6;
    g.beginPath(); g.moveTo(cx - 150, cy - 30); g.lineTo(cx - 150 + 270 * st, cy - 30); g.stroke();
    const rw = move(prog(t, T.nego2 + 0.45, T.nego2 + 0.75));
    g.fillStyle = C.mint; g.fillRect(cx - 150, cy + 4, 250 * rw, 18);
    g.globalAlpha = 1;
  }
}
// Jusqu'au bout : le point entre dans ses nouveaux bureaux
const NX = 13900, NY = 0, NW = 1000, NH = 700;
function drawNewOffice(t) {
  if (t < T.along - 0.4) return;
  const a = prog(t, T.along - 0.2, T.along + 0.3);
  const grow = t > T.devote ? 1 : 0;
  g.globalAlpha = a;
  D.room(g, NX, NY, NW, NH, 14, { door: { side: 'l', at: 0.62, w: 96, open: move(prog(t, T.bout - 0.45, T.bout - 0.05)), inward: 1 } });
  // l'entreprise s'installe et grandit (son temps lui revient)
  const CL = [[-300, -150], [0, -150], [300, -150], [-300, 140], [0, 140], [300, 140]];
  CL.forEach(([x, y], i) => D.cluster(g, NX + x, NY + y, 0, { s: pop(prog(t, T.devote + 0.1 + i * 0.16, T.devote + 0.4 + i * 0.16)), who: true }));
  for (let i = 0; i < 16; i++) {
    const s = pop(prog(t, T.devote + 1.1 + i * 0.05, T.devote + 1.3 + i * 0.05));
    if (s <= 0) continue;
    g.fillStyle = C.mint;
    D.withT(g, NX - 450 + (i % 16) * 60, NY - NH / 2 + 34, 0, s, () => { D.rrect(g, -22, -12, 44, 24, 4); g.fill(); });
  }
  void grow;
  g.globalAlpha = 1;
  // le point : du bord gauche jusqu'à la porte, puis à son bureau
  const door = [NX - NW / 2, NY - NH / 2 + NH * 0.62];
  const path = [[GX + 520, door[1]], [door[0] - 60, door[1]], [door[0] + 120, door[1]], [NX, NY - 150 + 34]];
  const u = move(prog(t, T.along + 0.2, T.bout + 0.1));
  const u2 = move(prog(t, T.devote - 0.2, T.devote + 0.6));
  const p = u2 > 0 ? [lerp(path[2][0], path[3][0], u2), lerp(path[2][1], path[3][1], u2)] : D.partial(path.slice(0, 3), u).pop();
  g.strokeStyle = C.mint; g.lineWidth = 8; g.setLineDash([18, 14]);
  g.globalAlpha = 1 - prog(t, T.simple, T.simple + 0.4);
  D.poly(g, D.partial(path.slice(0, 3), u)); g.stroke(); g.setLineDash([]);
  g.globalAlpha = 1;
  if (t < T.yourTime || t > T.devote + 0.2) D.you(g, p[0], p[1], { r: 17, ring: 1 });
}
// Votre temps : l'anneau devient un cadran dont l'aiguille fait le tour
function drawClock(t) {
  if (!win(t, T.yourTime - 0.3, T.devote + 0.6)) return;
  const door = [NX - NW / 2 + 120, NY - NH / 2 + NH * 0.62];
  const gr = move(prog(t, T.yourTime - 0.2, T.yourTime + 0.4)) * (1 - move(prog(t, T.devote - 0.1, T.devote + 0.5)));
  const r = lerp(28, 300, gr);
  const c = [lerp(door[0], NX, gr), lerp(door[1], NY, gr)];
  D.you(g, c[0], c[1], { r: 17 });
  g.strokeStyle = C.mint; g.lineWidth = lerp(6, 16, gr);
  g.beginPath(); g.arc(c[0], c[1], r, 0, Math.PI * 2); g.stroke();
  if (gr > 0.3) {
    g.globalAlpha = clamp((gr - 0.3) / 0.3);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.strokeStyle = C.ink; g.lineWidth = k % 3 ? 4 : 8;
      g.beginPath(); g.moveTo(c[0] + Math.cos(a) * (r - 34), c[1] + Math.sin(a) * (r - 34)); g.lineTo(c[0] + Math.cos(a) * (r - 58), c[1] + Math.sin(a) * (r - 58)); g.stroke();
    }
    const ha = -Math.PI / 2 + Math.PI * 2 * E.inOutCubic(prog(t, T.yourTime + 0.2, T.devote));
    g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + Math.cos(ha) * (r - 80), c[1] + Math.sin(ha) * (r - 80)); g.stroke();
    g.lineCap = 'butt';
    g.globalAlpha = 1;
  }
}
// Pas à chercher des bureaux : les annonces reviennent… et repartent
function drawNoSearch(t) {
  if (!win(t, T.notSearch - 0.2, T.end + 0.2)) return;
  const R = rng(5);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.3;
    const inn = whip(prog(t, T.notSearch + i * 0.03, T.notSearch + 0.35 + i * 0.03));
    const out = E.inCubic(prog(t, T.notSearch + 0.55 + i * 0.03, T.notSearch + 0.95 + i * 0.03));
    const d = lerp(2200, 980, inn) + out * 1600;
    D.sheet(g, NX + Math.cos(ang) * d, NY + Math.sin(ang) * d * 0.8, 330, 410, 200 + i, { a: (R() - 0.5) * 0.4 + out * 0.8 * (i % 2 ? 1 : -1), alpha: 1 - out * 0.6 });
  }
}

// ================================================================== caméra
const mix = (a, b, w) => (w <= 0 ? a : w >= 1 ? b : { x: lerp(a.x, b.x, w), y: lerp(a.y, b.y, w), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), w)), r: lerp(a.r, b.r, w) });
const SHOTS = [
  // [début de transition, fin, plan, courbe]
  [0, 0, (t) => ({ x: 0, y: 26 - 10 * prog(t, 1.5, 4), z: lerp(1.75, 1.32, move(prog(t, 1.6, 4.2))), r: -0.05 + 0.05 * move(prog(t, 0, 4.4)) }), move],
  [T.teams - 0.05, T.teams + 1.1, (t) => ({ x: 0, y: 60, z: lerp(0.98, 0.9, prog(t, T.teams, T.oneDay + 1)), r: 0 }), move],
  [T.need, T.newOffices + 0.2, (t) => ({ x: 0, y: -60, z: 0.9 + 0.02 * prog(t, T.need, T.starts), r: 0 }), move],
  // le marché
  [T.starts - 0.05, T.starts + 0.95, (t) => ({ x: 40 * Math.sin(t * 0.3), y: 120, z: 0.31 + 0.02 * prog(t, T.starts, T.compare), r: 0.02 * Math.sin(t * 0.25) }), whip],
  [T.compare - 0.1, T.compare + 0.35, () => ({ x: 0, y: 100, z: 0.5, r: 0 }), whip],
  [T.visits - 0.15, T.visits + 0.3, (t) => ({ x: -100, y: 200, z: 0.36 + 0.01 * prog(t, T.visits, T.terms), r: 0 }), whip],
  [T.terms - 0.1, T.terms + 0.35, () => ({ x: -80, y: 140, z: 0.62, r: 0 }), whip],
  [T.nego - 0.2, T.nego + 0.25, (t) => ({ x: -80, y: 120, z: 0.6 + 0.04 * prog(t, T.nego, T.meanwhile), r: 0 }), whip],
  // pendant ce temps : retour sur l'entreprise, puis ce qu'elle pourrait devenir
  [T.meanwhile + 0.1, T.meanwhile + 1.3, () => ({ x: 0, y: 80, z: 0.86, r: 0 }), move],
  [T.could - 0.1, T.could + 1.0, (t) => ({ x: 60 * prog(t, T.avancer, T.because), y: 60, z: 0.56, r: 0 }), move],
  // quatre murs
  [T.because - 0.3, T.because + 0.15, (t) => ({ x: DX, y: DY - 20, z: lerp(1.2, 1.12, prog(t, T.because, T.walls)), r: 0 }), whip],
  [T.place - 0.1, T.place + 0.6, (t) => ({ x: DX, y: DY - 10, z: 0.9 + 0.02 * prog(t, T.place, T.onYou), r: 0 }), move],
  [T.onYou, T.onYou + 0.9, (t) => ({ x: DX, y: DY + 175, z: 1.3 + 0.1 * prog(t, T.complex, T.drop), r: 0 }), move],
  // de la recherche à la signature (après l'aplat menthe)
  [44.6, 44.62, (t) => ({ x: dotF(t) + 230, y: -60, z: 0.9, r: 0 }), (u) => u],
  // avec vous
  [T.needs - 0.3, T.needs + 0.1, () => ({ x: GX - 260, y: GY + 60, z: 0.92, r: 0 }), whip],
  [T.find, T.find + 0.5, () => ({ x: GX + 20, y: GY + 20, z: 1.0, r: 0 }), move],
  [T.select - 0.15, T.select + 0.35, () => ({ x: GX, y: GY + 60, z: 0.48, r: 0 }), whip],
  [T.compare2 - 0.2, T.compare2 + 0.3, () => ({ x: GX, y: GY + 60, z: 0.62, r: 0 }), whip],
  [T.nego2 - 0.2, T.nego2 + 0.3, () => ({ x: GX + 40, y: GY + 40, z: 0.82, r: 0 }), whip],
  [T.along - 0.1, T.along + 0.8, (t) => ({ x: lerp(GX + 900, NX - 250, move(prog(t, T.along, T.bout))), y: NY + 120, z: 0.62, r: 0 }), move],
  // votre temps : le cadran, puis l'entreprise grandit
  [T.yourTime - 0.3, T.yourTime + 0.4, () => ({ x: NX, y: NY + 20, z: 0.95, r: 0 }), move],
  [T.devote - 0.1, T.devote + 1.4, (t) => ({ x: NX, y: NY + 70, z: lerp(0.86, 0.62, move(prog(t, T.devote, T.end))), r: 0 }), move],
  [T.notSearch - 0.1, T.notSearch + 0.4, (t) => ({ x: NX, y: NY + 60, z: lerp(0.5, 0.56, prog(t, T.notSearch, T.end + 1)), r: 0.03 * prog(t, T.notSearch, T.end + 2) }), move],
];
function camera(t) {
  let s = SHOTS[0][2](t);
  for (let i = 1; i < SHOTS.length; i++) {
    const [a, b, f, e] = SHOTS[i];
    if (t < a) break;
    s = mix(s, f(t), e(prog(t, a, b)));
  }
  // secousse : les murs cèdent (nouveaux bureaux)
  if (t > T.newOffices && t < T.newOffices + 0.5) s = { ...s, y: s.y + 10 * Math.exp(-(t - T.newOffices) / 0.08) * Math.sin((t - T.newOffices) * 70) };
  Object.assign(cam, s);
}

// ================================================================== légendes (texte DOM, masques)
function capGroup(parent, lines, o = {}) {
  const root = el('div', { cls: 'abs', style: { left: (o.x ?? L.mx) + 'px', top: (o.y ?? L.headY) + 'px', color: o.color ?? C.ink } }, parent);
  const ls = lines.map(([html, size, extra]) => {
    const w = el('div', { cls: 'mask display', style: { fontSize: size + 'px', marginBottom: (o.gap ?? 6) + 'px', ...(extra || {}) } }, root);
    return { wrap: w, inner: el('span', { html }, w) };
  });
  return { root, ls };
}
const HL = (s) => `<span style="background:linear-gradient(180deg,transparent 58%,rgba(42,202,165,0.55) 58%,rgba(42,202,165,0.55) 92%,transparent 92%);padding:0 0.06em">${s}</span>`;
function addCap(parent, lines, ins, out, o = {}) {
  const c = capGroup(parent, lines.map((s) => (Array.isArray(s) ? s : [s, o.size ?? L.headSize])), o);
  caps.push({ ...c, ins, out, o });
}
function buildCaps(layer) {
  const S = L.headSize, B = L.bigSize;
  addCap(layer, [['Imaginez.', 150]], [T.imag], 1.35, { x: L.mx, y: 430 });
  addCap(layer, ['Votre entreprise', 'grandit.'], [T.grow + 0.05, T.grandir - 0.1], T.teams - 0.15);
  addCap(layer, ['Les équipes s’agrandissent.', 'Les projets se multiplient.'], [T.teams + 0.05, T.projects + 0.02], T.oneDay - 0.12);
  addCap(layer, ['Et puis un jour…'], [T.oneDay + 0.05], T.need - 0.15);
  addCap(layer, [['Il vous faut', B * 0.62], [HL('de nouveaux bureaux.'), B * 0.62]], [T.need + 0.05, T.newOffices - 0.05], T.starts - 0.12);
  addCap(layer, ['Et là, ça commence.'], [T.starts + 0.08], T.search - 0.1);
  // les verbes de la recherche, l'un après l'autre
  [['Chercher.', T.search, T.compare], ['Comparer.', T.compare, T.visits], ['Organiser les visites.', T.visits, T.terms], ['Comprendre les conditions.', T.terms, T.nego]]
    .forEach(([s, a, b]) => addCap(layer, [[s, S * 1.12]], [a + 0.02], b - 0.08));
  addCap(layer, [['Négocier.', S * 1.12], ['Encore.', S * 1.12], [HL('Et encore.'), S * 1.12]], [T.nego + 0.02, T.encore1 + 0.02, T.encore2 + 0.02], T.meanwhile - 0.1);
  addCap(layer, ['Et pendant ce temps…'], [T.meanwhile + 0.15], T.could - 0.15);
  addCap(layer, ['Vous pourriez faire avancer', HL('votre entreprise.')], [T.could + 0.05, T.avancer + 0.1], T.because - 0.2);
  addCap(layer, ['Les bons bureaux,', 'ce n’est pas que quatre murs.'], [T.because + 0.15, T.notJust + 0.05], T.place - 0.15);
  addCap(layer, ['Et quand tout repose', 'sur vous,'], [T.onYou + 0.05, T.vous - 0.2], T.complex - 0.1);
  addCap(layer, ['ça devient vite', HL('compliqué.')], [T.complex + 0.05, T.complex + 0.55], T.exists - 0.1);
  addCap(layer, ['C’est précisément pour ça que…'], [T.exists + 0.05], T.drop - 0.05);
  addCap(layer, [['On s’occupe de tout.', S * 1.12]], [T.all + 0.05], T.needs - 0.2);
  addCap(layer, ['Vous nous expliquez', HL('vos besoins.')], [T.needs + 0.05, T.needs + 0.6], T.find - 0.12);
  addCap(layer, ['Nous trouvons les espaces', 'qui correspondent', HL('à votre entreprise.')], [T.find + 0.05, T.match - 0.25, T.really + 0.3], T.select - 0.12);
  [['Nous sélectionnons.', T.select, T.compare2], ['Nous comparons.', T.compare2, T.nego2], ['Nous négocions.', T.nego2, T.along]]
    .forEach(([s, a, b]) => addCap(layer, [[s, S * 1.12]], [a + 0.02], b - 0.08));
  addCap(layer, ['Et nous vous accompagnons', HL('jusqu’au bout.')], [T.along + 0.05, T.along + 0.9], T.simple - 0.12);
  // Simple. Efficace. Sans perdre votre temps. : grands mots au centre
  addCap(layer, [['Simple.', 150]], [T.simple + 0.1], T.efficient - 0.04, { y: 380, kind: 'punch' });
  addCap(layer, [['Efficace.', 150]], [T.efficient + 0.05], T.noWaste - 0.04, { y: 380, kind: 'punch' });
  addCap(layer, [['Sans perdre', 112], [HL('votre temps.'), 112]], [T.noWaste + 0.03, T.noWaste + 0.3], T.yourTime - 0.12, { y: 330 });
  addCap(layer, ['Votre temps,', 'pour votre entreprise.'], [T.yourTime + 0.05, T.devote + 0.4], T.notSearch - 0.12);
  addCap(layer, ['Pas pour chercher', HL('des bureaux.')], [T.notSearch + 0.05, T.notSearch + 0.4], T.end - 0.05);
  // une légende a fini de sortir avant que la suivante n'entre (pas de chevauchement dans les masques)
  const order = [...caps].sort((a, b) => a.ins[0] - b.ins[0]);
  order.forEach((c, i) => { if (order[i + 1]) c.out = Math.min(c.out, order[i + 1].ins[0] - 0.32); });
}
function capsUpdate(t) {
  caps.forEach((c) => {
    const on = t >= c.ins[0] - 0.05 && t < c.out + 0.45;
    show(c.root, on);
    if (!on) return;
    c.ls.forEach((ln, i) => {
      const t0 = c.ins[Math.min(i, c.ins.length - 1)];
      ln.wrap.style.visibility = t < t0 ? 'hidden' : '';
      const p = E.enter(prog(t, t0, t0 + 0.6)), q = E.exit(prog(t, c.out + i * 0.04, c.out + 0.3 + i * 0.04));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
    });
  });
}

// ================================================================== aplat menthe « Desk to Desk existe. »
function buildBrand(layer) {
  mintPane = el('div', { cls: 'layer', style: { background: C.mint } }, layer);
  brand = capGroup(layer, [['Desk to Desk', 168, { letterSpacing: '-0.055em' }], ['existe.', 168, { fontWeight: '300', letterSpacing: '-0.045em' }]], { x: L.mx, y: 330, gap: 10 });
}
function brandUpdate(t) {
  const on = t >= T.drop - 0.02 && t < 45.3;
  show(mintPane, on); show(brand.root, on);
  if (!on) return;
  const [sx, sy] = D.toScreen(DX, DY + 300);
  const r = whip(prog(t, T.drop - 0.02, T.drop + 0.36)) * 1650;
  const up = whip(prog(t, 44.62, 45.12)) * (H + 20);
  mintPane.style.clipPath = t < 44.62 ? `circle(${r.toFixed(1)}px at ${sx.toFixed(1)}px ${sy.toFixed(1)}px)` : `inset(0 0 ${up.toFixed(1)}px 0)`;
  brand.root.style.transform = `translate3d(0,${(-up).toFixed(1)}px,0)`;
  [T.drop + 0.04, T.existe].forEach((t0, i) => {
    const ln = brand.ls[i];
    ln.inner.style.transform = `translate3d(0,${((1 - E.enter(prog(t, t0, t0 + 0.55))) * 135).toFixed(2)}%,0)`;
  });
}

// ================================================================== signature
function buildEnd(layer) {
  const root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: '0px', color: C.ink } }, layer);
  const mk = (html, size, top, extra = {}) => {
    const w = el('div', { cls: 'mask display', style: { position: 'absolute', left: '0', top: top + 'px', fontSize: size + 'px', ...extra } }, root);
    return { wrap: w, inner: el('span', { html }, w) };
  };
  const vous = [mk('Vous développez', 104, 360), mk('votre entreprise.', 104, 470)];
  const sig = mk('Desk to Desk', 150, 300, { letterSpacing: '-0.055em' });
  const rest = mk('s’occupe du reste<span class="dot" style="color:var(--mint)">.</span>', 86, 468, { fontWeight: '500', letterSpacing: '-0.04em' });
  const dot = rest.inner.querySelector('.dot');
  dot.style.display = 'inline-block';
  const cta = el('div', {
    style: { position: 'absolute', left: '0', top: '640px', display: 'inline-flex', alignItems: 'center', gap: '18px', height: '92px', padding: '0 40px 0 44px', borderRadius: '999px', background: 'var(--mint)', color: 'var(--ink)', fontSize: '34px', fontWeight: '700', letterSpacing: '-0.01em', whiteSpace: 'nowrap', transformOrigin: '0 50%' },
  }, root);
  el('span', { text: 'Parler à un conseiller' }, cta);
  el('span', { html: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { display: 'flex' } }, cta);
  const url = el('div', { text: 'desk-to-desk.com', style: { position: 'absolute', left: '0', top: '762px', fontSize: '34px', fontWeight: '600', whiteSpace: 'nowrap' } }, root);
  const free = el('div', { html: 'Accompagnement gratuit pour le locataire<span style="color:var(--mintdark)">*</span>', style: { position: 'absolute', left: '0', top: '812px', fontSize: '26px', fontWeight: '500', color: 'rgba(17,17,17,0.7)', whiteSpace: 'nowrap' } }, root);
  const foot = el('div', {
    html: '*Commission payée par le propriétaire. Certaines offres,<br>en général en bail commercial, peuvent faire exception.',
    style: { position: 'absolute', left: '0', top: '972px', fontSize: '19px', lineHeight: '1.4', color: 'rgba(17,17,17,0.55)', whiteSpace: 'nowrap' },
  }, root);
  endCard = { root, vous, sig, rest, dot, cta, url, free, foot };
}
function endUpdate(t) {
  const e = endCard;
  const on = t >= T.vous1 - 0.05;
  show(e.root, on);
  if (!on) return;
  const rv = (ln, t0, out) => {
    ln.wrap.style.visibility = t < t0 ? 'hidden' : '';
    ln.inner.style.transform = `translate3d(0,${((1 - E.enter(prog(t, t0, t0 + 0.65))) * 135 - (out ? E.exit(prog(t, out, out + 0.3)) * 135 : 0)).toFixed(2)}%,0)`;
  };
  rv(e.vous[0], T.vous1, T.sig - 0.45); rv(e.vous[1], T.vous1 + 0.6, T.sig - 0.42);
  show(e.vous[0].wrap, t < T.sig); show(e.vous[1].wrap, t < T.sig);
  rv(e.sig, T.sig); rv(e.rest, T.rest);
  const d = pop(prog(t, T.dot, T.dot + 0.35));
  e.dot.style.transform = `scale(${(d * 1.0).toFixed(3)})`;
  e.dot.style.transformOrigin = '50% 80%';
  const c = E.enter(prog(t, T.cta, T.cta + 0.6));
  tf(e.cta, 0, (1 - c) * 26, 0.94 + 0.06 * c); op(e.cta, prog(t, T.cta, T.cta + 0.25));
  op(e.url, prog(t, T.url, T.url + 0.3)); tf(e.url, 0, (1 - E.enter(prog(t, T.url, T.url + 0.6))) * 16);
  op(e.free, prog(t, T.url + 0.25, T.url + 0.55)); tf(e.free, 0, (1 - E.enter(prog(t, T.url + 0.25, T.url + 0.85))) * 16);
  op(e.foot, prog(t, T.url + 0.25, T.url + 0.55));
}

// ================================================================== construction et mise à jour
export function build(ctx) {
  g = ctx.world.getContext('2d');
  veil = el('div', { cls: 'layer', style: { background: C.paper } }, ctx.layers.veil);
  // dégradé papier en haut de l'image : les légendes restent lisibles au-dessus du plan
  shade = el('div', { cls: 'layer', style: { background: 'linear-gradient(180deg, rgba(250,250,247,0.97) 0%, rgba(250,250,247,0.9) 14%, rgba(250,250,247,0) 30%)' } }, ctx.layers.veil);
  buildBrand(ctx.layers.brand);
  buildCaps(ctx.layers.text);
  buildEnd(ctx.layers.text);
  return {
    // repères pour la bande-son
    throws: THROWS.map(([t0]) => t0),
    hops: HOPS.map((_, i) => T.search + i * 0.29),
    sheetsIn: SHEETS.map((s) => s.t),
    walls: [T.walls, T.walls + 0.13, T.walls + 0.26, T.walls + 0.39],
    deskDrops: DESKS_D.map((d) => d[3]),
    labels: [T.place + 0.6, T.cond + 0.55, T.config + 0.55, T.moment + 0.1],
    calendar: [0, 1, 2, 3, 4].map((i) => T.visits + 0.35 + i * 0.2),
    cands: [T.find + 0.5, T.find + 0.82, T.find + 1.1, T.match - 0.2],
  };
}

export function update(t) {
  camera(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  D.dotGrid(g, 1);
  D.applyCam(g);
  // A : l'entreprise (grisée pendant la recherche, puis « en pause »)
  if (t < T.because + 0.2) {
    const gray = t > T.meanwhile + 0.2 ? prog(t, T.meanwhile + 0.2, T.meanwhile + 0.9) : 0;
    const dim = t > T.starts + 0.3 && t < T.meanwhile + 0.3 ? lerp(0.35, 0.12, prog(t, T.terms - 0.1, T.terms + 0.3)) * (1 - prog(t, T.meanwhile - 0.1, T.meanwhile + 0.3)) + prog(t, T.meanwhile - 0.1, T.meanwhile + 0.3) : 1;
    g.globalAlpha = dim;
    drawOffice(t, { gray });
    g.globalAlpha = 1;
  }
  // B : le marché
  if (t > 11.6 && t < T.could + 0.6) {
    const f = (t > T.meanwhile ? 1 - prog(t, T.meanwhile + 0.1, T.meanwhile + 0.8) : 1) * lerp(1, 0.3, prog(t, T.terms - 0.1, T.terms + 0.3));
    g.globalAlpha = f;
    drawMarket(t, 1);
    g.globalAlpha = 1;
    drawSearch(t); drawCompare(t); drawVisits(t); drawTerms(t); drawNego(t);
  }
  drawGhost(t);
  drawFourWalls(t);
  drawRoute(t);
  drawNeeds(t); drawMatch(t); drawSelect(t);
  drawNewOffice(t); drawClock(t); drawNoSearch(t);
  // voile blanc : sous les grands mots, et pour la signature
  const v = Math.max(
    0.86 * Math.min(prog(t, T.simple - 0.05, T.simple + 0.25), 1 - prog(t, T.yourTime - 0.2, T.yourTime + 0.2)),
    0.94 * prog(t, T.end + 0.2, T.vous1 + 0.3),
  );
  show(veil, v > 0.001);
  op(veil, v);
  show(shade, t > 1.6 && t < T.end + 0.3);
  capsUpdate(t);
  brandUpdate(t);
  endUpdate(t);
}

// Mélange de deux couleurs hexadécimales
function mixHex(a, b, u) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(u))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
