// Film v9 « Axo » : le récit de la voix d'origine, en axonométrie (volumes nets, arêtes à l'encre, accents menthe),
// avec des fonds qui changent de couleur (papier, nuit, menthe), des transitions graphiques (iris, volets, plongée
// dans le cube) et une typographie animée lettre à lettre.
//
//   0 – 4,8 s    La ville en plan : un trait droit relie « vous » à la tour (« c'est simple »). Sur « Enfin… », le plan
//                bascule en 3D : le trait passe à travers les immeubles (« sur le papier »).
//   4,8 – 15,25  Iris noir : un fil menthe s'élève et s'emmêle au-dessus de la ville, chaque critère s'accroche à un
//                immeuble ; le temps file (cadran au sol, la caméra tourne) ; silence : le fil se tend.
//  15,25 – 22,25 Volet menthe : « Desk to Desk tire le fil. » Un conseiller (le cube) ; un seul interlocuteur ; du
//                brief jusqu'aux clés.
//  22,25 – 26,75 Volet papier : l'immeuble en tiroirs, un étage par format, puis côte à côte pour choisir.
//  27,1 – 49,3  Cinq socles pour les cinq étapes, puis deux pour les services ; la caméra glisse de l'un à l'autre.
//  49,75 – 54,75 Volet nuit : la France en relief, une colonne menthe par ville.
//  54,75 – 68    Store menthe « gratuit.* », puis signature sur la nuit.
import * as THREE from 'three';
import * as I from './iso.js';
import { T, L, W, H, C, DURATION } from './timeline.js';
import { E, prog, lerp, clamp, rng, bezier } from '../lib/ease.js';
import { el, show, op, tf } from '../lib/dom.js';

const move = bezier(0.65, 0, 0.35, 1);
const whip = bezier(0.76, 0, 0.2, 1);
const pop = E.soft;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const win = (t, a, b) => t >= a && t < b;
const ISO_EL = 0.6155, ISO_AZ = Math.PI / 4;

let scene, fx, panels = {}, caps = [], tags = [], labels = [];
const G = {};   // groupes de scènes

// Chute avec rebond (hauteur de départ h0) ; renvoie [y, écrasement]
function drop(t, t0, h0, d = 0.32) {
  if (t < t0) return [h0, 1];
  const u = prog(t, t0, t0 + d);
  if (u < 1) return [h0 * (1 - u * u), 1];
  const b = prog(t, t0 + d, t0 + d + 0.24);
  const sq = 1 - 0.22 * Math.sin(Math.PI * prog(t, t0 + d, t0 + d + 0.12));
  return [h0 * 0.08 * Math.sin(Math.PI * b), sq];
}
// Pousse depuis le sol (échelle verticale avec léger dépassement)
const rise = (t, t0, d = 0.38) => Math.max(0.0001, pop(prog(t, t0, t0 + d)));

// ================================================================== 1-2. La ville
const PITCH = 24;
const S = (k) => (k + 0.5) * PITCH;           // axes des rues
const START = V(S(-5), 0, S(4));
const TGT = { i: 4, j: -4 };
const TGT_P = V(TGT.i * PITCH, 0, TGT.j * PITCH);
const CITY_H = 34;
let cityMats;
function buildCity() {
  const g = new THREE.Group(); scene.add(g);
  cityMats = {
    face: I.faceMat(0xffffff), top: I.faceMat(0xffffff), line: new I.LineMaterial({ color: 0x111111, linewidth: 2.2 }),
  };
  cityMats.line.resolution.set(W, H);
  const R = rng(11);
  const blds = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const tgt = i === TGT.i && j === TGT.j;
    const h = tgt ? CITY_H : 8 + R() * (10 + 26 * Math.max(0, 1 - Math.hypot(i, j) / 6));
    const w = 15 + R() * 3, d = 15 + R() * 3;
    const b = I.block(w, h, d, 'white', {});
    if (!tgt) {
      b.userData.mesh.material = [cityMats.face, cityMats.face, cityMats.top, cityMats.face, cityMats.face, cityMats.face];
      b.userData.lines.material = cityMats.line;
    } else {
      b.userData.mesh.material = [cityMats.face, cityMats.face, I.faceMat(0x2acaa5), cityMats.face, cityMats.face, cityMats.face];
      b.userData.lines.material = cityMats.line;
    }
    b.position.set(i * PITCH, 0, j * PITCH);
    g.add(b);
    blds.push({ g: b, i, j, h, x: i * PITCH, z: j * PITCH, t0: 0.05 + R() * 0.35 });
  }
  // « vous » : une sphère au carrefour de départ
  const you = I.sphere(4.2, 0x161616); you.position.copy(START); g.add(you);
  const youSh = I.shadow(16, 16, 0.22); youSh.position.set(START.x, 0.05, START.z); g.add(youSh);
  // Le plan : un trait droit, dessiné par-dessus tout tant qu'on est « sur le papier »
  const plan = I.polyline([[START.x, 0.4, START.z], [TGT_P.x, 0.4, TGT_P.z]], 0x2acaa5, 7, { dashed: true, dash: 9, gap: 6 });
  plan.material.depthTest = false; plan.renderOrder = 10;
  g.add(plan);
  // Le fil : il s'élève du point et s'emmêle au-dessus des rues
  const WAY = [[-5, 4], [-5, 1], [-2, 1], [-2, 3], [0, 3], [0, -1], [-3, -1], [-3, -3], [1, -3], [1, 1], [3, 1], [3, -2], [-1, -2], [-1, 2], [2, 2], [2, -4], [-2, -4], [-2, 0], [1, 0]];
  const pts = [V(START.x, 4, START.z)];
  WAY.forEach(([a, b], k) => pts.push(V(S(a), 46 + 9 * Math.sin(k * 1.7), S(b))));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
  const N = 420;
  const tangle = curve.getSpacedPoints(N - 1);
  const thread = I.polyline(tangle.map((p) => [p.x, p.y, p.z]), 0x2acaa5, 7);
  thread.material = thread.material.clone(); thread.material.resolution.set(W, H);
  g.add(thread);
  // Le cadran du temps qui file, posé au sol
  const clock = new THREE.Group(); g.add(clock);
  const ring = new THREE.Mesh(new THREE.RingGeometry(150, 156, 128), new THREE.MeshBasicMaterial({ color: 0x2acaa5, transparent: true, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.6; clock.add(ring);
  for (let k = 0; k < 12; k++) {
    const tk = new THREE.Mesh(new THREE.PlaneGeometry(k % 3 ? 3 : 5, k % 3 ? 10 : 16), ring.material);
    const a = (k / 12) * Math.PI * 2;
    tk.rotation.x = -Math.PI / 2; tk.rotation.z = -a;
    tk.position.set(Math.sin(a) * 140, 0.6, -Math.cos(a) * 140);
    clock.add(tk);
  }
  const hand = new THREE.Mesh(new THREE.PlaneGeometry(5, 130), ring.material);
  hand.geometry.translate(0, 65, 0);
  const handPivot = new THREE.Group(); handPivot.position.y = 0.7; handPivot.add(hand); hand.rotation.x = -Math.PI / 2;
  clock.add(handPivot);
  return { g, blds, you, youSh, plan, thread, tangle, N, clock, ring, handPivot };
}
let city;
function updateCity(t) {
  const on = t < T.blind + 0.45;
  city.g.visible = on;
  if (!on) return;
  // la ville pousse au début, puis passe en nuit (iris), faces sombres, arêtes claires
  const night = E.inOutCubic(prog(t, T.fall - 0.05, T.fall + 0.45));
  cityMats.face.color.set(0xffffff).lerp(new THREE.Color(0x1b1b1b), night);
  cityMats.top.color.set(0xffffff).lerp(new THREE.Color(0x262626), night);
  cityMats.line.color.set(0x111111).lerp(new THREE.Color(0xeeeeea), night);
  city.blds.forEach((b) => { b.g.scale.y = rise(t, b.t0, 0.5); });
  // le point « vous » : noir sur papier, blanc la nuit ; il glisse le long du fil pendant qu'il s'emmêle
  city.you.material.color.set(0x161616).lerp(new THREE.Color(0xffffff), night);
  city.you.scale.setScalar(pop(prog(t, 0.6, 0.95)));
  city.youSh.visible = night < 0.5;
  // le trait du plan : dessiné par-dessus tout, puis caché par les immeubles quand on bascule en 3D
  I.drawLine(city.plan, move(prog(t, T.l2 - 0.1, T.l2 + 0.6)) * (1 - prog(t, T.fall, T.fall + 0.3)));
  city.plan.material.depthTest = t > T.strike + 0.25;
  // le fil : il s'emmêle à mesure que la voix énumère, puis se tend en ligne droite (tirage)
  const grow = E.inOutCubic(prog(t, T.fall + 0.05, 11.6));
  const pull = whip(prog(t, T.pull - 0.4, T.blind - 0.05));
  const A = V(START.x, 4, START.z), B = V(TGT_P.x, CITY_H + 2, TGT_P.z);
  if (pull > 0 || !city.thread.userData.base) {
    const segs = [];
    let prev = null;
    city.tangle.forEach((p, k) => {
      const u = k / (city.N - 1);
      const s = A.clone().lerp(B, u);
      const q = p.clone().lerp(s, pull);
      if (prev) segs.push(prev.x, prev.y, prev.z, q.x, q.y, q.z);
      prev = q;
    });
    city.thread.geometry.setPositions(segs);
    city.thread.userData.base = pull <= 0;
  }
  I.drawLine(city.thread, t < T.fall ? 0 : Math.max(grow, pull > 0 ? 1 : 0));
  city.thread.material.linewidth = lerp(7, 9, pull);
  // le cadran du temps qui file
  const ck = prog(t, T.timeFlies, T.timeFlies + 0.4) * (1 - prog(t, T.thread, T.pull));
  city.clock.visible = ck > 0.01;
  city.ring.material.opacity = ck;
  city.clock.scale.setScalar(lerp(0.85, 1, E.outCubic(prog(t, T.timeFlies, T.timeFlies + 0.6))));
  city.handPivot.rotation.y = -Math.PI * 2 * E.inOutCubic(prog(t, T.timeFlies + 0.2, T.thread)) * 1.5;
}

// ================================================================== 3. Desk to Desk tire le fil (sur menthe)
const P3 = V(1200, 0, 0);
function buildDrop() {
  const g = new THREE.Group(); g.position.copy(P3); scene.add(g);
  const track = I.block(250, 2, 16, 'white', { lw: 2.4 }); track.position.set(10, 0, 0);
  g.add(track);
  const trackSh = I.shadow(270, 40, 0.1); trackSh.position.set(10, 0.02, 0); g.add(trackSh);
  const you = I.sphere(4.2, 0x161616); you.position.set(-80, 2, 4); g.add(you);
  const cube = I.block(10, 10, 10, 'white', { lw: 2.6 }); cube.position.set(-80, 2, -5); g.add(cube);
  const others = [];
  const R = rng(5);
  for (let k = 0; k < 9; k++) {
    const s = I.sphere(2.6, 0x111111);
    const a = (k / 9) * Math.PI * 2 + 0.3;
    s.userData = { a, r: 34 + R() * 18 };
    g.add(s); others.push(s);
  }
  // le brief (une feuille debout) et les clés (anneau + tige)
  const brief = I.canvasPlane(14, 18, 24, (x, w, h) => {
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#111111'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = '#111111'; x.fillRect(w * 0.15, h * 0.14, w * 0.5, h * 0.06);
    x.fillStyle = '#CFCFC8'; for (let i = 0; i < 5; i++) x.fillRect(w * 0.15, h * (0.32 + i * 0.11), w * (0.7 - (i % 2) * 0.2), h * 0.035);
  });
  brief.position.set(-58, 11, -4); brief.scale.setScalar(1.3); g.add(brief);
  const key = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(4, 1.3, 14, 40), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  key.add(bow);
  const shaft = I.block(12, 2.2, 2.2, 'white', { lw: 2 }); shaft.position.set(9, -1.1, -1.1); shaft.rotation.z = 0; key.add(shaft);
  const bit = I.block(2.2, 4, 2.2, 'white', { lw: 2 }); bit.position.set(17, -4, -1.1); key.add(bit);
  key.position.set(102, 14, 0); key.scale.setScalar(1.5); g.add(key);
  return { g, track, you, cube, others, brief, key };
}
let dropS;
function updateDrop(t) {
  const on = win(t, T.blind + 0.3, T.line + 0.4);
  dropS.g.visible = on;
  if (!on) return;
  const tk = E.outCubic(prog(t, T.blind + 0.3, T.blind + 1.1));
  dropS.track.scale.set(Math.max(0.001, tk), 1, 1); dropS.track.position.x = 10 - 125 * (1 - tk);
  dropS.you.scale.setScalar(pop(prog(t, T.blind + 0.5, T.blind + 0.8)));
  // un conseiller dédié : le cube tombe à côté du point
  const [cy, sq] = drop(t, T.sub1 - 0.05, 70);
  dropS.cube.visible = t > T.sub1 - 0.06;
  dropS.cube.position.y = 2 + cy; dropS.cube.scale.set(2 - sq, sq, 2 - sq);
  // un seul interlocuteur : les autres arrivent puis sont absorbés par le cube
  dropS.others.forEach((s, k) => {
    const inn = whip(prog(t, T.sub2 - 0.3 + k * 0.03, T.sub2 + 0.05 + k * 0.03));
    const out = E.inCubic(prog(t, T.sub2 + 0.55 + k * 0.04, T.sub2 + 0.95 + k * 0.04));
    const r = s.userData.r * (1 - out) + 0;
    s.visible = inn > 0.01 && out < 0.99;
    s.position.set(-80 + Math.cos(s.userData.a) * r * inn, 2, -5 + Math.sin(s.userData.a) * r * inn);
    s.scale.setScalar(1 - out * 0.8);
  });
  // du brief… jusqu'à la remise des clés : le duo glisse de la feuille aux clés
  dropS.brief.visible = t > T.sub3 - 0.1;
  dropS.brief.scale.setScalar(1.3 * pop(prog(t, T.sub3 - 0.1, T.sub3 + 0.25)));
  dropS.key.visible = t > T.sub3 + 0.6;
  dropS.key.scale.setScalar(1.5 * pop(prog(t, T.sub3 + 0.6, T.sub3 + 0.95)));
  dropS.key.rotation.x = Math.PI / 2 * E.inOutCubic(prog(t, 21.55, 21.85));
  const go = move(prog(t, T.sub3 + 0.2, 21.45));
  dropS.you.position.x = lerp(-80, 78, go);
  dropS.cube.position.x = lerp(-80, 78, go);
}

// ================================================================== 4. L'immeuble en tiroirs (les formats)
const P4 = V(2400, 0, 0);
const FL = 14, FW = 70, FD = 46;
function floorGroup(kind) {
  const f = new THREE.Group();
  f.add(I.block(FW, 2, FD, 'white'));
  const back = I.block(FW, FL - 2, 1.6, 'white'); back.position.set(0, 2, -FD / 2 + 0.8); f.add(back);
  const side = I.block(1.6, FL - 2, FD, 'white'); side.position.set(-FW / 2 + 0.8, 2, 0); f.add(side);
  if (kind === 0) {
    for (const z of [-8, 8]) {
      const tbl = I.block(46, 1.4, 7, 'white', { lw: 2 }); tbl.position.set(2, 6, z); f.add(tbl);
      for (const x of [-18, -6, 6, 18]) {
        const lap = I.block(4, 2.6, 0.5, 'mint', { lw: 1.6 }); lap.position.set(x, 7.4, z - 1.5); f.add(lap);
        const p = I.sphere(1.6, 0x161616); p.position.set(x, 2, z + (z < 0 ? -6 : 6)); f.add(p);
      }
      for (const x of [-20, 22]) { const leg = I.block(1.2, 4, 6, 'white', { lw: 1.6 }); leg.position.set(x, 2, z); f.add(leg); }
    }
  } else if (kind === 1) {
    for (const x of [-12, 12]) { const gl = I.block(0.6, FL - 4, 28, 'glass', { opacity: 0.16, lw: 2 }); gl.position.set(x, 2, -6); f.add(gl); }
    const front = I.block(FW - 4, FL - 4, 0.6, 'glass', { opacity: 0.12, lw: 2 }); front.position.set(1, 2, 8); f.add(front);
    for (const x of [-24, 0, 24]) {
      const dk = I.block(12, 1.2, 6, 'white', { lw: 2 }); dk.position.set(x, 6, -13); f.add(dk);
      const sc = I.block(4, 3, 0.5, 'mint', { lw: 1.6 }); sc.position.set(x, 7.2, -15); f.add(sc);
      const p = I.sphere(1.6, 0x161616); p.position.set(x, 2, -7); f.add(p);
    }
  } else {
    for (const x of [-18, 0, 18]) for (const z of [-10, 10]) { const c = I.cylinder(1.2, FL - 2, 0xffffff, 20); c.position.set(x, 2, z); f.add(c); }
    const mark = I.canvasPlane(40, 16, 20, (x, w, h) => {
      x.strokeStyle = '#2ACAA5'; x.lineWidth = 8; x.setLineDash([26, 16]); x.strokeRect(6, 6, w - 12, h - 12);
      x.fillStyle = '#1C9E80'; x.font = '600 150px Parkinsans'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('3 / 6 / 9', w / 2, h / 2 + 6);
    });
    mark.rotation.x = -Math.PI / 2; mark.position.set(4, 2.1, 4); f.add(mark);
  }
  return f;
}
function buildFormats() {
  const g = new THREE.Group(); g.position.copy(P4); scene.add(g);
  const floors = [0, 1, 2].map((k) => { const f = floorGroup(k); g.add(f); return f; });
  const roof = I.block(FW, 2, FD, 'white'); g.add(roof);
  const sel = I.block(FW + 8, FL + 6, FD + 8, 'ghost', { lw: 4 }); g.add(sel);
  return { g, floors, roof, sel };
}
let fmt;
const FMT_T = () => [T.line + 0.15, T.fmt2, T.fmt3];
function floorPos(k, t) {
  // empilés ; chaque étage sort comme un tiroir sur son mot ; puis les trois côte à côte (choisir)
  const ft = FMT_T();
  const lift = (i) => (i > 0 ? 0 : 0);
  void lift;
  const spread = move(prog(t, T.choose - 0.15, T.choose + 0.6));
  let y = k * (FL + 1);
  y += 22 * k * E.inOutCubic(prog(t, ft[0] - 0.2, ft[0] + 0.4));   // l'immeuble s'ouvre
  const out = (i) => whip(prog(t, ft[i] - 0.3, ft[i] + 0.15)) * (1 - whip(prog(t, (ft[i + 1] ?? T.choose) - 0.3, (ft[i + 1] ?? T.choose) + 0.1)));
  const o = out(k);
  let x = 30 * o, z = 30 * o;
  x = lerp(x, (k - 1) * 88, spread); z = lerp(z, 0, spread); y = lerp(y, 0, spread);
  return [x, y, z];
}
function updateFormats(t) {
  const on = win(t, T.line + 0.3, T.s1 - 0.42);
  fmt.g.visible = on;
  if (!on) return;
  const appear = rise(t, T.line + 0.35, 0.45);
  fmt.floors.forEach((f, k) => { const [x, y, z] = floorPos(k, t); f.position.set(x, y, z); f.scale.set(1, appear, 1); });
  const ro = E.inOutCubic(prog(t, T.line + 0.55, T.line + 1.0));
  fmt.roof.position.set(0, 3 * (FL + 1) + ro * 140, 0);
  fmt.roof.visible = ro < 0.98;
  fmt.roof.scale.set(1, appear, 1);
  // choisir : un cadre menthe passe d'une option à l'autre
  const s = prog(t, T.choose + 0.5, T.choose + 0.65);
  fmt.sel.visible = s > 0;
  const hop = (T.choose + 0.65 < t) ? Math.min(2, Math.floor((t - T.choose - 0.65) / 0.3)) : 0;
  const hu = whip(clamp(((t - T.choose - 0.65) % 0.3) / 0.22));
  const hx = (hop - 1) * 88 + (hop < 2 ? hu * 88 : 0);
  fmt.sel.position.set(t < T.choose + 0.95 ? -88 : hx, -2, 0);
}

// ================================================================== 5-6. Les socles : étapes et services
const P5 = V(3600, 0, 0), SP = 280;
const px = (k) => P5.x + k * SP;
function plinth(k) {
  const g = new THREE.Group(); g.position.set(px(k), 0, 0); scene.add(g);
  g.add(I.block(64, 5, 64, 'white', { lw: 2.8 }));
  const top = new THREE.Group(); top.position.y = 5; g.add(top);
  const sh = I.shadow(110, 110, 0.12); sh.position.y = 0.02; g.add(sh);
  return { g, top };
}
function sheet(w, h, drawFn) { return I.canvasPlane(w, h, 22, drawFn); }
function buildSteps() {
  const d = {};
  // 1. Le besoin : une table ronde, vous et votre conseiller (le cube), le cahier des charges qui se coche
  {
    const p = plinth(0);
    const tb = I.cylinder(11, 1.4, 0xffffff); tb.position.set(0, 7, 0); p.top.add(tb);
    const ft = I.cylinder(1.6, 7, 0xffffff, 16); p.top.add(ft);
    const you = I.sphere(3.4, 0x161616); you.position.set(-17, 0, 6); p.top.add(you);
    const cube = I.block(7, 7, 7, 'mint'); cube.position.set(16, 0, -6); p.top.add(cube);
    for (const [x, z, r] of [[-17, 6, 14], [16, -6, 18], [0, 0, 34]]) { const sh = I.shadow(r, r, 0.16); sh.position.set(x, 0.06, z); p.top.add(sh); }
    const list = sheet(22, 28, () => {});
    list.userData.draw = (x, w, h, n = 0) => {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111111'; x.lineWidth = 5; x.strokeRect(2, 2, w - 4, h - 4);
      x.fillStyle = '#111'; x.font = '600 40px Parkinsans'; x.fillText('Votre besoin', 40, 80);
      ['Effectif', 'Quartiers', 'Budget'].forEach((s, i) => {
        const y = 170 + i * 140;
        x.lineWidth = 5; x.strokeStyle = '#111'; x.strokeRect(40, y - 40, 56, 56);
        x.fillStyle = '#3a3b37'; x.font = '500 40px "Noto Sans"'; x.fillText(s, 124, y + 2);
        if (i < n) { x.strokeStyle = '#2ACAA5'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(48, y - 10); x.lineTo(64, y + 8); x.lineTo(104, y - 40); x.stroke(); }
      });
    };
    I.redraw(list, 0);
    list.position.set(0, 21, -20); p.top.add(list);
    d.s1 = { list, n: -1 };
  }
  // 2. Le crible : seize offres sur une grille ; la plupart passent à travers, trois restent et passent en menthe
  {
    const p = plinth(1);
    const grate = I.canvasPlane(52, 52, 12, (x, w, h) => { x.strokeStyle = '#111'; x.lineWidth = 4; for (let i = 0; i <= 8; i++) { const v = (i / 8) * w; x.beginPath(); x.moveTo(v, 0); x.lineTo(v, h); x.stroke(); x.beginPath(); x.moveTo(0, v); x.lineTo(w, v); x.stroke(); } });
    grate.rotation.x = -Math.PI / 2; grate.position.y = 10.05; p.top.add(grate);
    for (const [x, z] of [[-26, -26], [26, -26], [-26, 26], [26, 26]]) { const leg = I.block(2, 10, 2, 'white', { lw: 2 }); leg.position.set(x, 0, z); p.top.add(leg); }
    const R = rng(3);
    const blocks = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const h = 5 + R() * 9;
      const b = I.block(7.5, h, 7.5, 'white', { lw: 2, top: 0xffffff });
      b.position.set((i - 1.5) * 12, 10, (j - 1.5) * 12);
      p.top.add(b);
      blocks.push({ b, h, keep: [5, 10, 3].includes(i * 4 + j), t: 30.55 + R() * 1.25 });
    }
    d.s2 = { blocks };
  }
  // 3. Les visites : un plateau, le parcours de visite ; vous et le cube le suivent ensemble
  {
    const p = plinth(2);
    const wall = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0); const w = I.block(l, 6, 1.4, 'white', { lw: 2 }); w.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); w.rotation.y = -Math.atan2(z1 - z0, x1 - x0); p.top.add(w); };
    wall(-28, -28, 28, -28); wall(-28, -28, -28, 28); wall(28, -28, 28, 4); wall(-28, 28, 6, 28); wall(-28, -2, -8, -2); wall(2, -2, 28, -2); wall(4, -28, 4, -14);
    const pts = [[22, 0.4, 34], [16, 0.4, 12], [-6, 0.4, 8], [-4, 0.4, -10], [-18, 0.4, -14], [16, 0.4, -16]];
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => V(...q)), false, 'centripetal');
    const route = I.polyline(curve.getSpacedPoints(80).map((q) => [q.x, q.y, q.z]), 0x2acaa5, 6, { dashed: true, dash: 4, gap: 3 });
    p.top.add(route);
    const you = I.sphere(3, 0x161616); p.top.add(you);
    const cube = I.block(6, 6, 6, 'mint', { lw: 2 }); p.top.add(cube);
    const shY = I.shadow(12, 12, 0.16), shC = I.shadow(15, 15, 0.16); p.top.add(shY, shC);
    d.s3 = { route, curve, you, cube, shY, shC };
  }
  // 4. La négociation : le bail sur la table, les clauses surlignées au mot près, puis le tampon
  {
    const p = plinth(3);
    const tbl = I.block(40, 1.6, 26, 'white'); tbl.position.y = 9; p.top.add(tbl);
    for (const [x, z] of [[-18, -11], [18, -11], [-18, 11], [18, 11]]) { const leg = I.block(1.6, 9, 1.6, 'white', { lw: 2 }); leg.position.set(x, 0, z); p.top.add(leg); }
    const you = I.sphere(3, 0x161616); you.position.set(-25, 0, 6); p.top.add(you);
    const cube = I.block(6, 6, 6, 'mint', { lw: 2 }); cube.position.set(25, 0, 6); p.top.add(cube);
    for (const [x, z, r] of [[-25, 6, 12], [25, 6, 15], [0, 0, 56]]) { const sh = I.shadow(r, r * (r > 40 ? 0.7 : 1), 0.14); sh.position.set(x, 0.06, z); p.top.add(sh); }
    const doc = sheet(24, 30, () => {});
    doc.userData.draw = (x, w, h, n = 0, stamped = 0) => {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 5; x.strokeRect(2, 2, w - 4, h - 4);
      x.fillStyle = '#111'; x.font = '600 38px Parkinsans'; x.fillText('Bail', 36, 70);
      ['Loyer', 'Charges', 'Travaux', 'Durée'].forEach((s, i) => {
        const y = 150 + i * 120;
        if (i < n) { x.fillStyle = 'rgba(42,202,165,0.5)'; x.fillRect(28, y - 44, 300, 62); }
        x.fillStyle = '#111'; x.font = '600 44px Parkinsans'; x.fillText(s, 36, y);
        x.fillStyle = '#D9D9D2'; x.fillRect(36, y + 22, 380, 12);
      });
      if (stamped) {
        x.save(); x.translate(w * 0.62, h * 0.86); x.rotate(-0.16); x.globalAlpha = stamped;
        x.strokeStyle = '#1C9E80'; x.lineWidth = 10; x.strokeRect(-170, -48, 340, 96);
        x.fillStyle = '#1C9E80'; x.font = '700 64px Parkinsans'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NÉGOCIÉ', 0, 4); x.restore();
      }
    };
    I.redraw(doc, 0, 0);
    doc.rotation.x = -Math.PI / 2; doc.position.set(0, 10.7, 0); p.top.add(doc);
    const stamp = new THREE.Group();
    const hd = I.block(9, 3, 6, 'mint', { lw: 2 }); stamp.add(hd);
    const hdl = I.cylinder(1.4, 6, 0xffffff, 16); hdl.position.y = 3; stamp.add(hdl);
    p.top.add(stamp);
    d.s4 = { doc, stamp, n: -1, st: -1 };
  }
  // 5. Jusqu'aux clés : la signature, la clé qui tourne, la porte qui s'ouvre sur la lumière
  {
    const p = plinth(4);
    const postL = I.block(3, 22, 3, 'white'); postL.position.set(-8, 0, -12); p.top.add(postL);
    const postR = I.block(3, 22, 3, 'white'); postR.position.set(8, 0, -12); p.top.add(postR);
    const lintel = I.block(19, 3, 3, 'white'); lintel.position.set(0, 22, -12); p.top.add(lintel);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(13, 22), new THREE.MeshBasicMaterial({ color: 0x2acaa5, transparent: true, opacity: 0 }));
    light.position.set(0, 11, -12.6); p.top.add(light);
    const hinge = new THREE.Group(); hinge.position.set(-6.5, 0, -12); p.top.add(hinge);
    const leaf = I.block(13, 21.5, 1.2, 'white', { lw: 2.2 }); leaf.position.set(6.5, 0, 0); hinge.add(leaf);
    const desk = I.block(22, 1.4, 12, 'white'); desk.position.set(4, 8, 16); p.top.add(desk);
    for (const x of [-6, 14]) { const leg = I.block(1.4, 8, 10, 'white', { lw: 2 }); leg.position.set(x, 0, 16); p.top.add(leg); }
    const sig = sheet(18, 10, () => {});
    sig.userData.draw = (x, w, h, u = 0) => {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
      x.fillStyle = '#D9D9D2'; x.fillRect(30, h * 0.72, w - 60, 6);
      x.strokeStyle = '#111'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath();
      const n = Math.floor(60 * u);
      for (let k = 0; k <= n; k++) { const xx = 40 + k * ((w - 90) / 60), yy = h * 0.6 - Math.sin(k * 0.55) * 26 - Math.sin(k * 0.2) * 10; k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    };
    I.redraw(sig, 0);
    sig.rotation.x = -Math.PI / 2; sig.position.set(4, 9.5, 16); p.top.add(sig);
    const key = new THREE.Group();
    const bow = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.7, 12, 32), new THREE.MeshLambertMaterial({ color: 0x2acaa5 })); key.add(bow);
    const shaft = I.block(6, 1.1, 1.1, 'mint', { lw: 1.6 }); shaft.position.set(4.6, -0.55, -0.55); key.add(shaft);
    p.top.add(key);
    d.s5 = { sig, key, hinge, light, u: -1 };
  }
  // Services : le bail renégocié (une flèche en fait le tour), la salle louée pour une journée
  {
    const p = plinth(5);
    const doc = sheet(20, 26, (x, w, h) => {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 5; x.strokeRect(2, 2, w - 4, h - 4);
      x.fillStyle = '#111'; x.font = '600 38px Parkinsans'; x.fillText('Votre bail', 36, 70);
      for (let i = 0; i < 6; i++) { x.fillStyle = '#D9D9D2'; x.fillRect(36, 130 + i * 70, w - 72 - (i % 3) * 60, 14); }
    });
    doc.position.set(0, 18, 0); p.top.add(doc);
    const ped = I.block(6, 4, 3, 'white', { lw: 2 }); ped.position.set(0, 0, 0); p.top.add(ped);
    const arrow = new THREE.Group(); arrow.position.set(0, 18, 0); p.top.add(arrow);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(19, 1.1, 12, 90, Math.PI * 1.65), new THREE.MeshLambertMaterial({ color: 0x2acaa5 })); arrow.add(tor);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(2.8, 6, 20), tor.material);
    tip.position.set(19 * Math.cos(Math.PI * 1.65), 19 * Math.sin(Math.PI * 1.65), 0); tip.rotation.z = Math.PI * 1.65; arrow.add(tip);
    d.v1 = { arrow };
  }
  {
    const p = plinth(6);
    const tbl = I.block(34, 1.4, 14, 'white'); tbl.position.set(0, 8, 4); p.top.add(tbl);
    for (const x of [-12, 0, 12]) for (const z of [-7, 15]) { const c = I.block(5, 5, 5, 'white', { lw: 2 }); c.position.set(x, 0, z); p.top.add(c); }
    const wall = I.block(56, 26, 2, 'white'); wall.position.set(0, 0, -24); p.top.add(wall);
    const cal = sheet(16, 18, (x, w, h) => {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.fillStyle = '#2ACAA5'; x.fillRect(0, 0, w, h * 0.2);
      x.strokeStyle = '#111'; x.lineWidth = 5; x.strokeRect(2, 2, w - 4, h - 4);
      x.fillStyle = '#111'; x.textAlign = 'center'; x.font = '300 210px Parkinsans'; x.fillText('1', w / 2, h * 0.72);
      x.font = '600 40px "Noto Sans"'; x.fillText('journée', w / 2, h * 0.9);
    });
    cal.position.set(0, 15, -22.9); p.top.add(cal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.6, 10, 60), new THREE.MeshBasicMaterial({ color: 0x2acaa5 }));
    ring.position.set(0, 14.6, -22.4); p.top.add(ring);
    d.v2 = { ring };
  }
  return d;
}
let steps;
const STEP_T = () => [T.s1, T.s2, T.s3, T.s4, T.s5, T.reneg, T.day];
function updateSteps(t) {
  const on = win(t, T.s1 - 0.45, T.map + 0.1);
  scene.children.forEach((o) => { if (o.userData.plinth) o.visible = on; });
  if (!on) return;
  const d = steps;
  const n1 = t < 28.25 ? 0 : Math.min(3, Math.floor((t - 28.25) / 0.45) + 1);
  if (n1 !== d.s1.n) { d.s1.n = n1; I.redraw(d.s1.list, n1); }
  d.s2.blocks.forEach((b) => {
    if (b.keep) {
      const r = pop(prog(t, 32.15, 32.6));
      b.b.scale.y = 1 + 0.5 * r;
      b.b.userData.top.color.set(0xffffff).lerp(new THREE.Color(0x2acaa5), r);
      I.setFace(b.b, new THREE.Color(0xffffff).lerp(new THREE.Color(0x2acaa5), r * 0.85));
    } else {
      const u = prog(t, b.t, b.t + 0.5);
      b.b.position.y = 10 - 60 * u * u;
      b.b.visible = u < 0.98;
    }
  });
  I.drawLine(d.s3.route, E.inOutCubic(prog(t, 33.8, 34.9)));
  const w = E.inOutCubic(prog(t, 34.9, 35.95));
  const q1 = d.s3.curve.getPointAt(Math.max(0, w - 0.06)), q2 = d.s3.curve.getPointAt(w);
  d.s3.you.position.set(q1.x, 0, q1.z); d.s3.cube.position.set(q2.x, 0, q2.z);
  d.s3.shY.position.set(q1.x, 0.06, q1.z); d.s3.shC.position.set(q2.x, 0.06, q2.z);
  const ci = T.clauses.filter((c) => t >= c).length;
  const st = prog(t, T.stamp, T.stamp + 0.08);
  if (ci !== d.s4.n || st !== d.s4.st) { d.s4.n = ci; d.s4.st = st; I.redraw(d.s4.doc, ci, st); }
  const sh = t < T.stamp - 0.14 ? 1 : t < T.stamp ? 1 - E.inCubic(prog(t, T.stamp - 0.14, T.stamp)) : E.inOutCubic(prog(t, T.stamp + 0.2, T.stamp + 0.65));
  d.s4.stamp.position.set(6, 10.8 + 30 * sh, 4);
  d.s4.stamp.visible = t > T.s4 + 0.4;
  const su = Math.round(prog(t, 41.5, 42.75) * 60) / 60;
  if (su !== d.s5.u) { d.s5.u = su; I.redraw(d.s5.sig, su); }
  const kin = E.outCubic(prog(t, 42.85, 43.3));
  d.s5.key.position.set(lerp(30, 9.5, kin), lerp(28, 11, kin), lerp(10, -10.4, kin));
  d.s5.key.rotation.set(Math.PI / 2 * E.inOutCubic(prog(t, 43.3, 43.55)), Math.PI, 0);
  d.s5.key.visible = t > 42.8 && t < 44.3;
  d.s5.hinge.rotation.y = 1.3 * E.inOutCubic(prog(t, 43.6, 44.1));
  d.s5.light.material.opacity = 0.75 * prog(t, 43.65, 44.1);
  d.v1.arrow.rotation.z = -Math.PI * 2 * E.inOutCubic(prog(t, 45.6, 46.6));
  d.v2.ring.scale.setScalar(Math.max(0.001, pop(prog(t, 48.4, 48.75))));
}

// ================================================================== 7. La carte (sur la nuit)
const P7 = V(5200, 0, 0), KM = 9;
const mp = (lon, lat) => V(P7.x + (lon - 2.6) * KM * Math.cos((46.5 * Math.PI) / 180), 0, P7.z - (lat - 46.6) * KM);
const FRANCE = [[2.37, 51.03], [3.2, 50.75], [4.2, 50.2], [4.85, 49.8], [5.9, 49.5], [7.0, 49.1], [8.2, 48.95], [7.75, 48.3], [7.55, 47.6], [6.9, 47.4], [6.1, 46.2], [6.8, 45.9], [7.0, 45.2], [6.9, 44.3], [7.5, 43.8], [6.6, 43.15], [5.4, 43.25], [4.6, 43.4], [3.95, 43.5], [3.1, 42.45], [1.7, 42.5], [0.6, 42.7], [-0.6, 42.85], [-1.8, 43.38], [-1.45, 44.6], [-1.2, 45.6], [-1.2, 46.2], [-2.2, 46.9], [-2.6, 47.4], [-4.5, 47.95], [-4.75, 48.4], [-3.5, 48.8], [-1.6, 48.65], [-1.95, 49.7], [-1.25, 49.65], [0.1, 49.45], [1.5, 50.1], [1.6, 50.75]];
const NEIGH = [
  [[2.5, 51.1], [3.4, 51.4], [4.0, 51.9], [4.7, 52.9], [5.6, 53.4], [7.0, 53.4], [8.6, 53.9], [9.0, 54.8], [10.0, 54.8], [11.0, 54.0], [12.5, 54.4], [14.2, 53.9], [14.6, 52.6], [15.0, 51.1], [12.3, 50.3], [13.8, 48.8], [13.0, 47.5], [10.5, 47.3], [8.6, 47.6], [7.5, 47.5], [6.8, 48.5], [5.5, 49.3], [4.5, 49.9], [3.0, 50.6]],
  [[6.0, 46.2], [6.8, 45.9], [7.0, 45.2], [6.9, 44.3], [7.5, 43.8], [8.4, 44.2], [9.5, 44.3], [10.2, 43.9], [10.5, 43.0], [11.2, 42.4], [12.5, 41.8], [13.8, 41.2], [13.8, 42.5], [12.3, 44.3], [12.4, 45.5], [13.7, 45.6], [13.6, 46.5], [12.4, 47.1], [10.5, 46.9], [9.6, 47.6], [8.6, 47.8], [7.6, 47.6], [6.9, 47.4]],
  [[-1.8, 43.38], [-0.6, 42.85], [0.6, 42.7], [1.7, 42.5], [3.1, 42.45], [3.3, 41.9], [2.1, 41.25], [0.9, 41.0], [0.2, 40.0], [-0.3, 39.4], [0.2, 38.8], [-0.7, 37.6], [-2.1, 36.7], [-4.4, 36.7], [-5.6, 36.0], [-6.3, 36.8], [-7.4, 37.2], [-8.9, 37.0], [-8.8, 38.7], [-9.5, 38.8], [-8.9, 40.2], [-8.7, 42.1], [-9.3, 43.0], [-8.0, 43.7], [-5.8, 43.6], [-3.6, 43.5]],
  [[-5.7, 50.0], [-3.0, 50.6], [1.4, 51.2], [1.7, 52.6], [0.3, 53.5], [-0.5, 54.5], [-3.0, 54.0], [-3.0, 53.3], [-4.6, 53.3], [-4.2, 52.3], [-5.2, 51.7], [-3.0, 51.4], [-4.2, 51.2]],
];
const CITIES = [['Paris', 2.35, 48.86, 34, -1], ['Lyon', 4.84, 45.76, 22, 1], ['Lille', 3.06, 50.63, 22, 1], ['Bordeaux', -0.58, 44.84, 22, -1], ['Bruxelles', 4.35, 50.85, 22, 1], ['Barcelone', 2.17, 41.39, 22, 1], ['Luxembourg', 6.13, 49.61, 22, 1]];
function extrude(poly, depth, faceColor, lineColor, lw) {
  const shape = new THREE.Shape(poly.map(([lo, la]) => { const p = mp(lo, la); return new THREE.Vector2(p.x - P7.x, -(p.z - P7.z)); }));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, I.faceMat(faceColor)));
  g.add(I.edges(geo, lineColor, lw, 30));
  g.position.set(P7.x, 0, P7.z);
  return g;
}
function buildMap() {
  const g = new THREE.Group(); scene.add(g);
  const fr = extrude(FRANCE, 5, 0xffffff, 0x111111, 2.4); g.add(fr);
  NEIGH.forEach((n) => g.add(extrude(n, 2, 0x2a2a2a, 0x8d8e89, 1.6)));
  const pillars = CITIES.map(([n, lo, la, h, side]) => {
    const p = mp(lo, la);
    const inside = !['Bruxelles', 'Barcelone', 'Luxembourg'].includes(n);
    const c = I.cylinder(2.6, h, 0x2acaa5, 28);
    c.position.set(p.x, inside ? 5 : 2, p.z);
    g.add(c);
    return { n, c, h, side, top: V(p.x, (inside ? 5 : 2) + h, p.z), t: T.cities[n] };
  });
  const paris = pillars[0].top;
  const arcs = pillars.slice(1).map((c) => {
    const mid = paris.clone().lerp(c.top, 0.5); mid.y += 18 + paris.distanceTo(c.top) * 0.3;
    const curve = new THREE.QuadraticBezierCurve3(paris.clone(), mid, c.top.clone());
    const l = I.polyline(curve.getPoints(60).map((q) => [q.x, q.y, q.z]), 0x2acaa5, 4.5);
    g.add(l);
    return { l, t: c.t };
  });
  return { g, pillars, arcs };
}
let map;
function updateMap(t) {
  const on = win(t, T.map - 0.15, T.free + 0.6);
  map.g.visible = on;
  if (!on) return;
  map.g.children[0].scale.y = rise(t, T.map - 0.15, 0.4);
  map.pillars.forEach((c) => { c.c.scale.y = Math.max(0.001, pop(prog(t, c.t - 0.1, c.t + 0.35))); c.c.visible = t > c.t - 0.1; });
  map.arcs.forEach((a) => I.drawLine(a.l, E.inOutCubic(prog(t, a.t - 0.45, a.t))));
}

// ================================================================== caméra
const SHOTS = [];
const shot = (a, b, f, e = move) => SHOTS.push([a, b, f, e]);
function cityHead(t) {
  const u = clamp(E.inOutCubic(prog(t, T.fall + 0.05, 11.6)));
  const k = Math.min(city.N - 1, Math.floor(u * (city.N - 1)));
  return city.tangle[k];
}
shot(0, 0, (t) => ({ x: 0, y: 0, z: -82 + 6 * prog(t, 0, T.strike), az: 0, el: Math.PI / 2 - 0.001, zoom: 2.22 + 0.08 * prog(t, 0, T.strike) }));
shot(T.strike - 0.1, T.strike + 0.85, (t) => ({ x: 10, y: 80, z: -10, az: ISO_AZ + 0.12 * prog(t, T.strike, T.fall), el: ISO_EL + 0.1, zoom: 2.42 }));
shot(T.fall, T.fall + 0.9, (t) => { const h = cityHead(t); return { x: h.x * 0.6, y: 20, z: h.z * 0.6, az: ISO_AZ + 0.25 + 0.3 * prog(t, T.fall, 12), el: 0.72, zoom: 4.2 }; });
shot(T.timeFlies - 0.1, T.timeFlies + 0.8, (t) => ({ x: 0, y: 0, z: 0, az: ISO_AZ + 0.55 + Math.PI * 1.2 * E.inOutCubic(prog(t, T.timeFlies, T.thread + 0.2)), el: 0.85, zoom: 2.35 }));
shot(T.pull - 0.35, T.blind - 0.05, (t) => ({ x: -6, y: 18, z: 6, az: ISO_AZ + 0.55 + Math.PI * 1.2 + 0.0 * t, el: 0.62, zoom: 2.9 }), whip);
shot(T.blind + 0.32, T.blind + 0.34, (t) => ({ x: P3.x - 50 + 140 * move(prog(t, T.sub3 + 0.2, 21.45)), y: 62, z: P3.z, az: ISO_AZ, el: ISO_EL, zoom: 5.6 }), (u) => u);
shot(T.line + 0.32, T.line + 0.34, (t) => ({ x: P4.x + 8, y: 24, z: P4.z, az: ISO_AZ, el: ISO_EL, zoom: 6.2 - 0.6 * prog(t, T.line, T.fmt3 + 0.5) }), (u) => u);
shot(T.choose - 0.15, T.choose + 0.6, () => ({ x: P4.x, y: 10, z: P4.z, az: ISO_AZ, el: ISO_EL, zoom: 3.6 }));
STEP_T().forEach((ts, k) => {
  if (k === 0) shot(T.s1 - 0.45, T.s1 - 0.43, (t) => ({ x: px(0), y: 30, z: 0, az: ISO_AZ + 0.06 * Math.sin((t - T.s1) * 0.8), el: ISO_EL, zoom: 8.6 }), (u) => u);
  else shot(ts - 0.45, ts, (t) => ({ x: px(k), y: 30, z: 0, az: ISO_AZ + 0.06 * Math.sin((t - ts) * 0.8), el: ISO_EL, zoom: 8.6 }), whip);
});
shot(T.map - 0.2, T.map - 0.18, (t) => ({ x: P7.x + 4, y: 26, z: P7.z + 8, az: ISO_AZ - 0.3 + 0.4 * prog(t, T.map, T.free), el: 0.82, zoom: 6.6 + 0.6 * prog(t, T.map, T.free) }), (u) => u);
function camera(t) {
  const mix = (a, b, w) => (w <= 0 ? a : w >= 1 ? b : {
    x: lerp(a.x, b.x, w), y: lerp(a.y, b.y, w), z: lerp(a.z, b.z, w), az: lerp(a.az, b.az, w), el: lerp(a.el, b.el, w),
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), w)),
  });
  let s = SHOTS[0][2](t);
  for (let i = 1; i < SHOTS.length; i++) {
    const [a, b, f, e] = SHOTS[i];
    if (t < a) break;
    s = mix(s, f(t), e(prog(t, a, b)));
  }
  if (t > T.stamp && t < T.stamp + 0.4) s.y -= 1.2 * Math.exp(-(t - T.stamp) / 0.08) * Math.sin((t - T.stamp) * 70);
  I.setCam(s);
}

// ================================================================== fonds et volets (DOM)
// Couleur de fond de base selon le temps, et volets de transition (dessous / dessus du rendu 3D)
const BG = [[0, C.paper], [T.fall + 0.45, C.night], [T.blind + 0.3, C.mint], [T.line + 0.32, C.paper], [T.map - 0.18, C.night], [T.free + 0.55, C.mint], [T.end + 0.5, C.night]];
function buildPanels(ctx) {
  panels.base = el('div', { cls: 'layer' }, ctx.layers.under);
  panels.iris = el('div', { cls: 'layer', style: { background: C.night } }, ctx.layers.under);
  panels.over = el('div', { cls: 'layer' }, ctx.layers.over);
}
function panelsUpdate(t) {
  let base = C.paper;
  for (const [t0, c] of BG) if (t >= t0) base = c;
  panels.base.style.background = base;
  // iris noir depuis le point « vous » (Parce que très vite…)
  const ir = whip(prog(t, T.fall - 0.05, T.fall + 0.45));
  show(panels.iris, ir > 0 && ir < 1);
  if (ir > 0 && ir < 1) {
    const [sx, sy] = I.project(START.x, 4, START.z);
    panels.iris.style.clipPath = `circle(${(ir * 1600).toFixed(1)}px at ${sx.toFixed(1)}px ${sy.toFixed(1)}px)`;
  }
  // volets au-dessus du rendu : menthe (drop), papier (formats), nuit (carte), store menthe (gratuit), nuit (fin)
  const V_ = [
    [T.blind - 0.03, T.blind + 0.32, C.mint, 'left'],
    [T.line - 0.03, T.line + 0.32, C.paper, 'up'],
    [T.map - 0.5, T.map - 0.18, C.night, 'right'],
    [T.free, T.free + 0.55, C.mint, 'up'],
    [T.end, T.end + 0.5, C.night, 'up'],
  ];
  const cur = V_.find(([a, b]) => t >= a && t < b);
  show(panels.over, !!cur);
  if (!cur) return;
  const [a, b, c, dir] = cur;
  const u = whip(prog(t, a, b));
  panels.over.style.background = c;
  const r = ((1 - u) * 100).toFixed(2);
  panels.over.style.clipPath = dir === 'left' ? `inset(0 ${r}% 0 0)` : dir === 'right' ? `inset(0 0 0 ${r}%)` : `inset(${r}% 0 0 0)`;
}

// ================================================================== typographie animée (lettre à lettre)
function splitChars(parent, html) {
  // texte simple ; les mots entre [[ ]] sont surlignés en menthe
  const parts = html.split(/(\[\[.*?\]\])/);
  const chars = [];
  const hls = [];
  for (const part of parts) {
    if (!part) continue;
    const hl = part.startsWith('[[');
    const txt = hl ? part.slice(2, -2) : part;
    const host = hl ? el('span', { cls: 'hl', style: { position: 'relative', display: 'inline-block' } }, parent) : parent;
    if (hl) {
      const bar = el('span', { style: { position: 'absolute', left: '-0.04em', right: '-0.04em', bottom: '0.06em', height: '0.32em', background: 'rgba(42,202,165,0.75)', transformOrigin: '0 50%', zIndex: '-1' } }, host);
      hls.push(bar);
    }
    for (const ch of txt) {
      const s = el('span', { text: ch === ' ' ? ' ' : ch, style: { display: 'inline-block', willChange: 'transform' } }, host);
      chars.push(s);
    }
  }
  return { chars, hls };
}
function capGroup(parent, lines, o = {}) {
  const root = el('div', { cls: 'abs', style: { left: (o.x ?? L.mx) + 'px', top: (o.y ?? L.headY) + 'px', color: o.color ?? C.ink } }, parent);
  const ls = lines.map(([html, size, extra]) => {
    const w = el('div', { cls: 'mask display', style: { fontSize: size + 'px', marginBottom: (o.gap ?? 4) + 'px', isolation: 'isolate', ...(extra || {}) } }, root);
    const inner = el('span', { style: { display: 'block' } }, w);
    return { wrap: w, ...splitChars(inner, html) };
  });
  return { root, ls };
}
function addCap(parent, lines, ins, out, o = {}) {
  const c = capGroup(parent, lines.map((s) => (Array.isArray(s) ? s : [s, o.size ?? L.headSize])), o);
  caps.push({ ...c, ins, out, o });
}
function animChars(ln, t, t0, out) {
  const n = ln.chars.length;
  ln.chars.forEach((s, i) => {
    const a = t0 + i * Math.min(0.022, 0.5 / n);
    const p = E.enter(prog(t, a, a + 0.55));
    const q = out != null ? E.exit(prog(t, out + i * 0.008, out + 0.26 + i * 0.008)) : 0;
    const y = (1 - p) * 115 - q * 115;
    s.style.transform = `translate3d(0,${y.toFixed(1)}%,0) rotate(${((1 - p) * 9).toFixed(2)}deg)`;
  });
  ln.hls.forEach((b) => { b.style.transform = `scaleX(${E.inOutCubic(prog(t, t0 + 0.35, t0 + 0.75)) * (1 - (out != null ? prog(t, out, out + 0.2) : 0))})`; });
}
function buildCaps(layer) {
  const S = L.headSize;
  const ink = C.ink, white = '#FFFFFF';
  addCap(layer, [['Trouver', 92], ['des bureaux,', 92], ['c’est simple.', 92]], [T.l1 + 0.1, T.l1 + 0.5, T.l2], T.fall - 0.4, { y: 64 });
  addCap(layer, [['Sur le [[papier.]]', 60, { fontWeight: '300' }]], [T.paper], T.fall - 0.35, { y: 366 });
  addCap(layer, [['Très vite,', S], ['tout s’emmêle.', S]], [T.tangle, T.tangle2], T.timeFlies - 0.35, { color: white });
  addCap(layer, [['Et le temps [[file.]]', S * 1.1]], [T.timeFlies + 0.05], T.pull - 0.05, { color: white });
  addCap(layer, [['Desk to Desk', 112], ['tire le fil.', 112, { fontWeight: '300' }]], [T.brand[0], T.brand2[0]], T.line - 0.45, { y: 70 });
  addCap(layer, [['Un conseiller dédié.', 40, { fontFamily: "'Noto Sans', sans-serif", fontWeight: '600', letterSpacing: '-0.01em' }]], [T.sub1], T.line - 0.42, { y: 330 });
  addCap(layer, [['Un seul interlocuteur.', 40, { fontFamily: "'Noto Sans', sans-serif", fontWeight: '600', letterSpacing: '-0.01em' }]], [T.sub2], T.line - 0.4, { y: 384 });
  addCap(layer, [['Du brief à la remise des clés.', 40, { fontFamily: "'Noto Sans', sans-serif", fontWeight: '600', letterSpacing: '-0.01em' }]], [T.sub3], T.line - 0.38, { y: 438 });
  addCap(layer, ['Coworking, bureau opéré', 'ou bail commercial ?'], [T.line + 0.05, T.line + 0.15], T.choose - 0.35);
  addCap(layer, ['On vous aide', '[[à choisir.]]'], [T.choose, T.choose + 0.1], T.s1 - 0.4);
  const STEPS = [['1', 'On définit', 'votre besoin.'], ['2', 'On passe le marché', 'au crible.'], ['3', 'On visite', 'avec vous.'], ['4', 'On négocie', 'avec le bailleur.'], ['5', 'Jusqu’à la', 'remise des clés.']];
  const ST = [T.s1, T.s2, T.s3, T.s4, T.s5, T.reneg];
  STEPS.forEach(([n, a, b], k) => addCap(layer, [[a, S], [b, S]], [ST[k] + 0.05, ST[k] + 0.12], ST[k + 1] - 0.4, { x: L.mx + 120, num: n }));
  addCap(layer, ['Déjà installés ?', '[[On renégocie.]]'], [T.reneg + 0.05, T.reneg + 0.6], T.day - 0.4);
  addCap(layer, ['Une salle', 'pour une journée ?'], [T.day + 0.05, T.day + 0.15], T.map - 0.55);
  addCap(layer, ['En France', '[[et en Europe.]]'], [T.map + 0.05, T.europe], T.free - 0.1, { color: white });
  // numéros des étapes
  STEPS.forEach(([n], k) => {
    const c = capGroup(layer, [[n, L.numSize, { fontWeight: '300', color: C.mint, lineHeight: '0.8' }]], { x: L.mx, y: L.headY - 4 });
    caps.push({ ...c, ins: [ST[k]], out: ST[k + 1] - 0.4, o: {} });
  });
}
function capsUpdate(t) {
  caps.forEach((c) => {
    const on = t >= c.ins[0] - 0.05 && t < c.out + 0.5;
    show(c.root, on);
    if (!on) return;
    c.ls.forEach((ln, i) => animChars(ln, t, c.ins[Math.min(i, c.ins.length - 1)], c.out + i * 0.04));
  });
}

// ================================================================== critères : étiquettes accrochées aux immeubles
function buildTags(layer) {
  const words = ['Charges', 'Nombre de postes', 'Surface', 'Bureau opéré ?', 'Budget', 'Coworking ?', 'Quartier', 'Travaux', 'Bail 3/6/9', 'Préavis', 'Visites', 'Dossier', 'Délais'];
  tags = words.map((w, k) => {
    const spoken = [2, 4, 6, 8, 10, 12].includes(k);
    const e = el('div', { cls: 'abs display', text: w, style: { padding: spoken ? '12px 22px 14px' : '8px 15px 10px', background: spoken ? '#FFFFFF' : 'rgba(255,255,255,0.9)', color: '#111', fontSize: (spoken ? 44 : 27) + 'px', borderRadius: '999px', whiteSpace: 'nowrap', boxShadow: '0 14px 34px rgba(0,0,0,0.35)' } }, layer);
    return { e, spoken, t: T.drops[k], w: e.offsetWidth, h: e.offsetHeight, side: k % 2 ? 1 : -1, k };
  });
}
function tagsUpdate(t) {
  tags.forEach((c) => {
    const life = c.spoken ? 2.4 : 1.6;
    const end = c.t > 12 ? T.thread : Math.min(T.timeFlies + 0.2, c.t + life);
    const vis = t >= c.t - 0.05 && t < end;
    show(c.e, vis);
    if (!vis) return;
    if (!c.anchor) {
      const u = clamp(E.inOutCubic(prog(c.t + 0.2, T.fall + 0.05, 11.6)));
      const p = city.tangle[Math.min(city.N - 1, Math.floor(u * (city.N - 1)))];
      let best = null, bd = 1e9;
      for (const b of city.blds) { const dd = Math.hypot(b.x - p.x, b.z - p.z) + (c.k % 3) * 6; if (dd < bd && dd > 10) { bd = dd; best = b; } }
      c.anchor = [best.x, best.h, best.z];
    }
    const [ax, ay] = I.project(...c.anchor);
    const a = pop(prog(t, c.t - 0.05, c.t + 0.3));
    const fade = 1 - prog(t, end - 0.3, end);
    const lx = Math.min(W - 30 - c.w, Math.max(30, ax + c.side * 54 - (c.side < 0 ? c.w : 0))), ly = Math.max(250, ay - 100 - c.h);
    c.e.style.transform = `translate3d(${lx.toFixed(1)}px,${ly.toFixed(1)}px,0) scale(${(0.6 + 0.4 * a).toFixed(3)})`;
    c.e.style.transformOrigin = c.side < 0 ? '100% 100%' : '0 100%';
    op(c.e, Math.min(1, a) * fade);
    fx.save();
    fx.globalAlpha = Math.min(1, a) * fade;
    fx.strokeStyle = '#FFFFFF'; fx.lineWidth = 2.5;
    fx.beginPath(); fx.moveTo(ax, ay); fx.lineTo(c.side < 0 ? lx + c.w : lx, ly + c.h * 0.5); fx.stroke();
    fx.fillStyle = '#2ACAA5'; fx.beginPath(); fx.arc(ax, ay, 7, 0, Math.PI * 2); fx.fill();
    fx.restore();
  });
}
// libellés accrochés à la 3D (étages, villes)
function buildLabels(layer) {
  const mk = (s, size, color) => el('div', { cls: 'abs display', text: s, style: { fontSize: size + 'px', whiteSpace: 'nowrap', color } }, layer);
  ['Coworking', 'Bureau opéré', 'Bail commercial'].forEach((s, k) => labels.push({ e: mk(s, 40, C.ink), kind: 'floor', k }));
  map.pillars.forEach((c) => labels.push({ e: mk(c.n, 32, '#FFFFFF'), kind: 'city', c }));
}
function labelsUpdate(t) {
  labels.forEach((l) => {
    if (l.kind === 'floor') {
      const ft = FMT_T();
      const solo = win(t, ft[l.k] - 0.05, (ft[l.k + 1] ?? T.choose) - 0.2);
      const row = win(t, T.choose + 0.4, T.s1 - 0.45);
      const vis = solo || row;
      show(l.e, vis);
      if (!vis) return;
      const [x, y, z] = floorPos(l.k, t);
      const [sx, sy] = row ? I.project(P4.x + x, P4.y + y + FL + 8, P4.z + z) : I.project(P4.x + x + FW / 2 + 4, P4.y + y + 6, P4.z + z + FD / 2 + 4);
      l.e.style.transform = `translate3d(${(row ? sx - l.e.offsetWidth / 2 : sx + 8).toFixed(1)}px,${(sy - l.e.offsetHeight).toFixed(1)}px,0)`;
      op(l.e, row ? prog(t, T.choose + 0.4, T.choose + 0.65) : prog(t, ft[l.k] - 0.05, ft[l.k] + 0.2));
    } else {
      const c = l.c;
      const vis = win(t, c.t, T.free + 0.2);
      show(l.e, vis);
      if (!vis) return;
      const [sx, sy] = I.project(c.top.x, c.top.y, c.top.z);
      l.e.style.transform = `translate3d(${(c.side < 0 ? sx - l.e.offsetWidth - 12 : sx + 12).toFixed(1)}px,${(sy - l.e.offsetHeight * 0.6).toFixed(1)}px,0)`;
      op(l.e, prog(t, c.t, c.t + 0.25));
    }
  });
}

// ================================================================== gratuité et signature (DOM)
let free, endCard;
function buildFree(layer) {
  const root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: '190px', color: C.ink } }, layer);
  const lead = capGroup(root, [['Pour le locataire,', 64, { fontWeight: '500' }], ['c’est', 64, { fontWeight: '500' }]], { x: 0, y: 0 });
  const big = capGroup(root, [['gratuit.*', 170, { letterSpacing: '-0.06em' }]], { x: 0, y: 170 });
  const foot = el('div', { html: '*Commission payée par le propriétaire. Certaines offres,<br>en général en bail commercial, peuvent faire exception.', style: { position: 'absolute', left: L.mx + 'px', top: '972px', fontSize: '19px', lineHeight: '1.4', whiteSpace: 'nowrap' } }, layer);
  free = { root, lead, big, foot };
}
function freeUpdate(t) {
  const on = win(t, T.free, T.end + 0.5);
  show(free.root, on);
  show(free.foot, t >= T.free + 0.9);
  free.foot.style.color = t < T.end ? 'rgba(17,17,17,0.66)' : 'rgba(255,255,255,0.5)';
  op(free.foot, t < T.end ? prog(t, T.free + 0.9, T.free + 1.3) : 1);
  if (!on) return;
  // lente avancée : l'image respire jusqu'à la signature
  free.root.style.transform = `scale(${(1 + 0.04 * E.inOutCubic(prog(t, T.free1, T.end))).toFixed(4)})`;
  free.root.style.transformOrigin = '0 30%';
  free.lead.ls.forEach((ln, i) => animChars(ln, t, [T.free1, T.free2][i], T.end - 0.1));
  animChars(free.big.ls[0], t, T.free3, T.end - 0.05);
}
function buildEnd(layer) {
  const root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: '0px', color: '#FFFFFF' } }, layer);
  const vous = capGroup(root, [['Vous développez', 100], ['votre entreprise.', 100]], { x: 0, y: 380, color: '#FFFFFF' });
  const sig = capGroup(root, [['Desk to Desk', 150, { letterSpacing: '-0.055em' }]], { x: 0, y: 250, color: '#FFFFFF' });
  const rest = capGroup(root, [['s’occupe du reste', 84, { fontWeight: '500', letterSpacing: '-0.04em' }]], { x: 0, y: 420, color: '#FFFFFF' });
  const dot = el('div', { style: { position: 'absolute', left: '0', top: '0', width: '22px', height: '22px', background: C.mint, borderRadius: '3px' } }, root);
  const cta = el('div', { style: { position: 'absolute', left: '0', top: '600px', display: 'inline-flex', alignItems: 'center', gap: '18px', height: '92px', padding: '0 40px 0 44px', borderRadius: '999px', background: C.mint, color: C.ink, fontSize: '34px', fontWeight: '700', letterSpacing: '-0.01em', whiteSpace: 'nowrap', transformOrigin: '0 50%' } }, root);
  el('span', { text: 'Parler à un conseiller' }, cta);
  el('span', { html: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { display: 'flex' } }, cta);
  const url = el('div', { text: 'desk-to-desk.com', style: { position: 'absolute', left: '0', top: '724px', fontSize: '34px', fontWeight: '600', whiteSpace: 'nowrap' } }, root);
  const fl = el('div', { html: 'Accompagnement gratuit pour le locataire<span style="color:var(--mint)">*</span>', style: { position: 'absolute', left: '0', top: '774px', fontSize: '26px', fontWeight: '500', color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' } }, root);
  endCard = { root, vous, sig, rest, dot, cta, url, fl };
}
function endUpdate(t, ctx) {
  const e = endCard;
  const on = t >= T.end;
  show(e.root, on);
  if (!on) return;
  const zs = 1 + 0.03 * E.inOutCubic(prog(t, T.write, DURATION));
  e.root.style.transform = `scale(${zs.toFixed(4)})`;
  e.root.style.transformOrigin = '0 0';
  show(e.vous.root, t < T.write + 0.2);
  e.vous.ls.forEach((ln, i) => animChars(ln, t, [T.vous1, T.vous2][i], T.vousOut));
  show(e.sig.root, t > T.write - 0.1); show(e.rest.root, t > T.line2 - 0.1);
  animChars(e.sig.ls[0], t, T.write);
  animChars(e.rest.ls[0], t, T.line2);
  // le point final : un petit carré menthe qui tombe et rebondit après « reste »
  const last = e.rest.ls[0].chars[e.rest.ls[0].chars.length - 1];
  const r = ctx.measure(last);
  const [dy, sq] = drop(t, T.dot - 0.3, 260, 0.3);
  show(e.dot, t > T.dot - 0.3);
  // coordonnées locales du bloc (qui avance lentement) : on retire son échelle
  e.dot.style.transform = `translate3d(${((r.x + r.w - L.mx) / zs + 6).toFixed(1)}px,${(r.y / zs + (r.h / zs) * 0.78 - 22 - dy).toFixed(1)}px,0) scale(${(2 - sq).toFixed(3)},${sq.toFixed(3)})`;
  e.dot.style.transformOrigin = '50% 100%';
  const c = E.enter(prog(t, T.cta, T.cta + 0.6));
  tf(e.cta, 0, (1 - c) * 26, 0.94 + 0.06 * c); op(e.cta, prog(t, T.cta, T.cta + 0.25));
  op(e.url, prog(t, T.url, T.url + 0.3)); tf(e.url, 0, (1 - E.enter(prog(t, T.url, T.url + 0.6))) * 16);
  op(e.fl, prog(t, T.url + 0.25, T.url + 0.55)); tf(e.fl, 0, (1 - E.enter(prog(t, T.url + 0.25, T.url + 0.85))) * 16);
}

// ================================================================== construction et mise à jour
export function build(ctx) {
  ({ scene } = I.initIso(ctx.gl));
  fx = ctx.fx.getContext('2d');
  city = buildCity();
  dropS = buildDrop();
  fmt = buildFormats();
  const before = new Set(scene.children);
  steps = buildSteps();
  scene.children.forEach((o) => { if (!before.has(o)) o.userData.plinth = true; });
  map = buildMap();
  buildPanels(ctx);
  buildTags(ctx.layers.text);
  buildLabels(ctx.layers.text);
  buildCaps(ctx.layers.text);
  buildFree(ctx.layers.text);
  buildEnd(ctx.layers.text);
  return {
    drops: T.drops.map((t, k) => ({ t, spoken: [2, 4, 6, 8, 10, 12].includes(k) })),
    plan: T.l2 - 0.1, iris: T.fall - 0.05, sub1Land: T.sub1 + 0.27, absorb: T.sub2 + 0.55, keyTurn1: 21.55, keyTurn: 43.3,
    floors: [T.line + 0.15, T.fmt2 - 0.3, T.fmt3 - 0.3], spread: T.choose - 0.15, selHops: [T.choose + 0.65, T.choose + 0.95, T.choose + 1.25],
    ticks: [28.25, 28.7, 29.15], sinks: steps.s2.blocks.filter((b) => !b.keep).map((b) => b.t), chosen: 32.15,
    walk: [34.9, 35.95], sign: [41.5, 42.75], keyIn: 42.85, keyTurn2: 43.3, door: 43.6, renegSpin: 45.6, dayRing: 48.4,
    wipes: [T.blind - 0.03, T.line - 0.03, T.map - 0.5],
  };
}

export function update(t, ctx) {
  fx.setTransform(1, 0, 0, 1, 0, 0);
  fx.clearRect(0, 0, W, H);
  camera(t);
  updateCity(t);
  updateDrop(t);
  updateFormats(t);
  updateSteps(t);
  updateMap(t);
  const show3d = t < T.free + 0.6;
  ctx.gl.style.visibility = show3d ? '' : 'hidden';
  if (show3d) I.renderer.render(scene, I.camera);
  panelsUpdate(t);
  capsUpdate(t);
  tagsUpdate(t);
  labelsUpdate(t);
  freeUpdate(t);
  endUpdate(t, ctx);
}
