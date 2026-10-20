// Film « maquette » : tout le récit, du premier plan à la gratuité, dans une maquette d'architecte en 3D.
// Volumes blancs mats sur un sol sombre, lumière de studio (environnement + soleil, ombres douces, occlusion
// ambiante), flou de bascule façon miniature, accents menthe.
// La ville vue en plan (« c'est simple »), puis en perspective (« sur le papier ») ; un repère menthe s'y perd et
// les critères s'affichent sur les immeubles ; le soleil fait le tour (le temps file). Au drop, le bon chemin
// s'allume, la caméra le suit jusqu'à la tour, dont les étages s'allument. Puis l'immeuble en éclaté (un étage par
// format), une vitrine par étape, et la carte en relief.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, rng, bezier } from '../lib/ease.js';
import { T, L, W, H, pick } from '../timeline.js';
import { blindY } from './free.js';

// Le noir de fond est choisi pour ressortir en #111 après le tone mapping
const COL = { bg: 0x262626, ground: 0x131413, white: 0xf4f4ee, plinth: 0xe6e6df, core: 0xc9cec9, tree: 0xdedfd6, mint: 0x2acaa5, mintDark: 0x1c9e80, dark: 0x4a4d4b, glass: 0xbff0e2, wood: 0xc9a476, ink: 0x1a1a18 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const move = bezier(0.65, 0, 0.35, 1);
const whip = bezier(0.76, 0, 0.2, 1);

let renderer, composer, gtao, tiltH, tiltV, scene, camera, sun, canvas, M;
let city, cut, dio, map, shade, overlays, heads, headRoot, tagsRoot, callouts, labels3d;

// Flou de bascule (miniature) : net sur une bande horizontale, de plus en plus flou vers le haut et le bas
const TiltShift = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, res: { value: new THREE.Vector2(W, H) }, focus: { value: 0.5 }, band: { value: 0.16 }, amount: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 dir, res; uniform float focus, band, amount; varying vec2 vUv;
    void main() {
      float r = amount * smoothstep(0.0, 0.32, abs(vUv.y - focus) - band);
      if (r < 0.05) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 c = vec4(0.0); float tot = 0.0;
      for (int i = -4; i <= 4; i++) { float f = float(i) / 4.0; float w = exp(-f * f * 2.5); c += texture2D(tDiffuse, vUv + dir * f * r / res) * w; tot += w; }
      gl_FragColor = c / tot;
    }`,
};

// ============================================================================================ matériaux, objets
function mats() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...o });
  return {
    white: std(COL.white), plinth: std(COL.plinth), base: std(0xcfcfc8), ground: std(COL.ground, { roughness: 1 }), dark: std(COL.dark), core: std(COL.core, { roughness: 0.5 }),
    tree: std(COL.tree), mint: std(COL.mint, { roughness: 0.5, emissive: COL.mint, emissiveIntensity: 0.18 }),
    glow: std(COL.mint, { roughness: 0.5, emissive: COL.mint, emissiveIntensity: 0.55 }),
    mintDark: std(COL.mintDark, { roughness: 0.6 }), wood: std(COL.wood, { roughness: 0.7 }),
    glass: std(COL.glass, { transparent: true, opacity: 0.14, roughness: 0.1, depthWrite: false }),
    light: new THREE.MeshBasicMaterial({ color: COL.mint, transparent: true, opacity: 0 }),
  };
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(r, h, mat, x = 0, y = 0, z = 0, parent = scene, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Personnage de maquette : corps en gélule, tête ronde
function person(mat, parent) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 6, 16), mat);
  b.position.y = 0.92; b.castShadow = true; b.receiveShadow = true; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), mat);
  h.position.y = 2.05; h.castShadow = true; g.add(h);
  parent.add(g);
  return g;
}

function chair(parent, x, z, rot = 0, y = 0) {
  const g = new THREE.Group();
  box(0.9, 0.12, 0.9, M.white, 0, 0.95, 0, g);
  box(0.9, 0.9, 0.12, M.white, 0, 1.4, -0.4, g);
  for (const [a, b] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) box(0.08, 0.9, 0.08, M.white, a, 0.45, b, g);
  g.position.set(x, y, z); g.rotation.y = rot;
  parent.add(g);
  return g;
}

function tube(points, r, mat, parent, seg = 200, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 8, closed), mat);
  m.castShadow = true;
  parent.add(m);
  m.userData = { curve, seg };
  return m;
}
const drawTube = (m, u) => { m.geometry.setDrawRange(0, Math.floor(Math.max(0, Math.min(1, u)) * m.userData.seg) * 8 * 6); m.visible = u > 0.001; };

// Feuille imprimée : texture dessinée en 2D (polices du film)
function paperTex(draw, w = 512, h = 700) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#FAFAF6'; g.fillRect(0, 0, w, h);
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function sheet(w, h, tex, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const txt = (g, s, x, y, size, weight = 600, color = '#1a1a18', font = 'Parkinsans') => {
  g.fillStyle = color; g.font = `${weight} ${size}px ${font}`; g.fillText(s, x, y);
};
const checkPath = (g, x, y, s = 1) => {
  g.strokeStyle = '#2ACAA5'; g.lineWidth = 9 * s; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - 14 * s, y); g.lineTo(x - 2 * s, y + 13 * s); g.lineTo(x + 22 * s, y - 18 * s); g.stroke();
};

// ============================================================================================ la ville
const PITCH = 14, NB = 13;
const sx = (k) => (k - 6.5) * PITCH;      // axes des rues : k = 0..13
const bc = (i) => (i - 6) * PITCH;        // centres d'îlots : i = 0..12
const TGT = { i: 10, j: 2 };
const PLAZA = ['9,3', '10,3', '11,3', '9,4', '10,4', '11,4'];
const PARKS = ['3,9', '4,9', '7,1', '2,4'];
const START = V(sx(2), 0, sx(11));
const FLOORS = 7, FH = 3.1;

function trees(g, spots, R) {
  const n = spots.length;
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.tree, n);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 1, 8), M.tree, n);
  crown.castShadow = trunk.castShadow = true; crown.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, z], k) => {
    const s = 0.9 + R() * 0.6;
    m4.compose(V(x, 1.4 * s + 0.9 * s, z), q, V(s, s, s)); crown.setMatrixAt(k, m4);
    m4.compose(V(x, 0.8 * s, z), q, V(1, 1.6 * s, 1)); trunk.setMatrixAt(k, m4);
  });
  g.add(crown, trunk);
}

function buildCity() {
  const g = new THREE.Group(); scene.add(g);
  const lots = [];
  const R = rng(7);
  const treeSpots = [];
  for (let i = 0; i < NB; i++) for (let j = 0; j < NB; j++) {
    const key = i + ',' + j;
    const cx = bc(i), cz = bc(j);
    if (i === TGT.i && j === TGT.j) continue;
    if (PLAZA.includes(key) || PARKS.includes(key)) {
      // Parc ou parvis : une dalle claire et des arbres en boule
      box(9.6, 0.25, 9.6, M.plinth, cx, 0.125, cz, g);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (R() < (PLAZA.includes(key) ? 0.45 : 0.8)) treeSpots.push([cx + a * 3.1 + (R() - 0.5), cz + b * 3.1 + (R() - 0.5)]);
      continue;
    }
    const split = R();
    const parts = split < 0.3 ? [[0, 0, 9.2, 9.2]] : split < 0.65 ? [[-2.4, 0, 4.4, 9.2], [2.4, 0, 4.4, 9.2]] : [[-2.4, -2.4, 4.4, 4.4], [2.4, -2.4, 4.4, 4.4], [-2.4, 2.4, 4.4, 4.4], [2.4, 2.4, 4.4, 4.4]];
    const centrality = Math.max(0, 1 - Math.hypot(i - 6, j - 6) / 8.5);
    for (const [dx_, dz, w, d] of parts) {
      const tall = R() < 0.06 ? 1.35 : 1;
      lots.push({ x: cx + dx_, z: cz + dz, w, d, h: Math.min(21, (2.4 + R() * (4 + 11 * centrality)) * tall) });
    }
  }
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.white, lots.length);
  inst.castShadow = true; inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  lots.forEach((l, k) => {
    m4.makeScale(l.w, l.h, l.d); m4.setPosition(l.x, l.h / 2, l.z);
    inst.setMatrixAt(k, m4);
    inst.setColorAt(k, col.setScalar(0.9 + R() * 0.1));
  });
  g.add(inst);
  trees(g, treeSpots, R);
  // La tour visée : des étages vitrés entre des dalles, qui s'allumeront en menthe de bas en haut
  const tx = bc(TGT.i), tz = bc(TGT.j);
  const tower = new THREE.Group(); tower.position.set(tx, 0, tz); g.add(tower);
  const cores = [];
  for (let k = 0; k < FLOORS; k++) {
    box(9.2, 0.42, 9.2, M.white, 0, k * FH + 0.21, 0, tower);
    cores.push(box(8.5, FH - 0.42, 8.5, M.core.clone(), 0, k * FH + 0.42 + (FH - 0.42) / 2, 0, tower));
  }
  box(9.2, 0.42, 9.2, M.white, 0, FLOORS * FH + 0.21, 0, tower);
  box(5, 1.6, 5, M.white, 0, FLOORS * FH + 1.2, 0, tower);
  const topY = FLOORS * FH + 2;
  // Le repère « vous »
  const marker = new THREE.Group();
  const mb = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.7, 6, 16), M.mint); mb.position.y = 1.75; mb.castShadow = true; marker.add(mb);
  const mh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), M.mint); mh.position.y = 3.55; mh.castShadow = true; marker.add(mh);
  marker.position.copy(START);
  g.add(marker);
  // Le plan : un pointillé droit tracé au-dessus des toits, de « vous » à la tour, et un cercle au pied de la tour
  const dash = new THREE.Group(); g.add(dash);
  const a = START.clone(), b = V(tx, 0, tz);
  const dir = b.clone().sub(a), len = dir.length();
  const n = Math.floor(len / 8);
  for (let k = 0; k < n; k++) {
    const p = a.clone().lerp(b, (k + 0.5) / n);
    const d = box(3, 0.4, 4.6, M.glow, p.x, 24.5, p.z, dash);
    d.rotation.y = Math.atan2(dir.x, dir.z);
    d.castShadow = false;
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.9, 10, 80), M.glow);
  ring.rotation.x = -Math.PI / 2; ring.position.set(tx, 0.4, tz); g.add(ring);
  // L'errance : un parcours qui tourne en rond dans les rues, sa trace s'emmêle
  const way = [[2, 11], [2, 8], [5, 8], [5, 10], [7, 10], [7, 6], [4, 6], [4, 4], [6, 4], [6, 7], [9, 7], [9, 5], [12, 5], [12, 8], [8, 8], [8, 9]]
    .map(([kx, kz]) => V(sx(kx), 0.6, sx(kz)));
  const wander = new THREE.CatmullRomCurve3(way, false, 'catmullrom', 0.12);
  const trail = new THREE.Mesh(new THREE.TubeGeometry(wander, 900, 0.5, 6, false), M.mint);
  trail.userData = { seg: 900 };
  g.add(trail);
  // Le bon chemin (au drop) : un ruban menthe le long des rues, jusqu'au pied de la tour
  const pathPts = [START.clone(), V(sx(2), 0, sx(5)), V(sx(2), 0, sx(3) + 3), V(sx(2) + 3, 0, sx(3)), V(sx(6), 0, sx(3)), V(tx, 0, sx(3))];
  const clean = new THREE.CatmullRomCurve3(pathPts.map((p) => V(p.x, 0.3, p.z)), false, 'catmullrom', 0.1);
  const ribbon = new THREE.Mesh(new THREE.TubeGeometry(clean, 500, 1.5, 8, false), M.glow);
  ribbon.scale.y = 0.2;
  ribbon.userData = { seg: 500 };
  g.add(ribbon);
  return { g, lots, tower, cores, topY, marker, dash, ring, wander, trail, clean, ribbon, tx, tz };
}

// ============================================================================================ l'immeuble en éclaté
const CUT = V(700, 0, 0), FLH = 5;
function buildCut() {
  const g = new THREE.Group(); g.position.copy(CUT); scene.add(g);
  // Trois plateaux (maison de poupée : mur du fond et mur de gauche, ouverts devant et à droite)
  const floors = [0, 1, 2].map(() => {
    const f = new THREE.Group(); g.add(f);
    box(25, 0.5, 14, M.white, 0, 0.25, 0, f);
    box(25, 4.5, 0.35, M.white, 0, 2.75, -6.83, f);
    box(0.35, 4.5, 14, M.white, -12.33, 2.75, 0, f);
    for (const x of [-8, -1, 6]) box(4.2, 2.2, 0.4, M.core, x, 2.9, -6.7, f);   // fenêtres du fond
    return f;
  });
  const roof = new THREE.Group(); g.add(roof);
  box(25, 0.6, 14, M.white, 0, 0.3, 0, roof); box(8, 1.4, 5, M.white, 4, 1.3, -2, roof);
  // Coworking : deux grandes tables partagées, ordinateurs à écran menthe, des gens
  const f0 = floors[0];
  for (const z of [-2.4, 2.6]) {
    box(17, 0.22, 2.2, M.white, 0, 1.95, z, f0);
    for (const x of [-7.5, 7.5]) box(0.22, 1.2, 1.8, M.white, x, 1.35, z, f0);
    for (let x = -7; x <= 7.01; x += 2.33) {
      chair(f0, x, z - 1.7, 0, 0.5); chair(f0, x, z + 1.7, Math.PI, 0.5);
      box(0.75, 0.05, 0.5, M.white, x, 2.1, z - 0.4, f0);
      const s = box(0.75, 0.5, 0.04, M.mint, x, 2.36, z - 0.62, f0); s.rotation.x = -0.25;
    }
  }
  [[-4.67, 0.8], [2.33, 0.8], [-2.33, 4.3], [4.67, 4.3]].forEach(([x, z], k) => { const p = person(k % 2 ? M.white : M.mint, f0); p.position.set(x, 0.5, z); p.rotation.y = Math.PI; });
  // Bureaux opérés : des pièces fermées en verre, un bureau par pièce, un coin café
  const f1 = floors[1];
  for (const x of [-4.2, 3.8]) box(0.1, 4.2, 9.6, M.glass, x, 2.6, -2, f1).castShadow = false;
  box(24.5, 4.2, 0.1, M.glass, 0, 2.6, 2.8, f1).castShadow = false;
  // Montants des cloisons vitrées
  for (const x of [-12, -8.2, -4.2, -0.2, 3.8, 7.8, 12]) box(0.14, 4.2, 0.14, M.white, x, 2.6, 2.8, f1);
  for (const x of [-4.2, 3.8]) for (const z of [-6.6, -3.2, 0.2]) box(0.14, 4.2, 0.14, M.white, x, 2.6, z, f1);
  box(24.5, 0.16, 0.16, M.white, 0, 4.62, 2.8, f1);
  for (const x of [-8.2, -0.2, 7.8]) {
    box(3.4, 0.18, 1.5, M.white, x, 1.95, -4, f1); for (const dx_ of [-1.5, 1.5]) box(0.12, 1.4, 1.3, M.white, x + dx_, 1.2, -4, f1);
    chair(f1, x, -2.3, Math.PI, 0.5);
    box(0.8, 0.5, 0.05, M.mint, x, 2.4, -4.5, f1);
  }
  cyl(0.8, 2, M.white, 9, 1.5, 5.2, f1, 32); cyl(0.5, 0.9, M.white, -9, 0.95, 5, f1);
  const plant = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), M.mintDark); plant.position.set(-9, 2.2, 5); plant.castShadow = true; f1.add(plant);
  // Bail commercial : un plateau nu à aménager, des poteaux, la cote « 3/6/9 » au sol
  const f2 = floors[2];
  for (const x of [-7, 0, 7]) for (const z of [-2.8, 3]) cyl(0.35, 4.5, M.white, x, 2.75, z, f2, 20);
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({
    map: paperTex((g2, w, h) => {
      g2.fillStyle = '#F4F4EE'; g2.fillRect(0, 0, w, h);
      g2.strokeStyle = '#2ACAA5'; g2.lineWidth = 6; g2.setLineDash([22, 14]); g2.strokeRect(20, 20, w - 40, h - 40);
      g2.setLineDash([]); txt(g2, '3 / 6 / 9', w / 2 - 150, h / 2 + 34, 96, 600, '#1C9E80');
    }, 700, 300),
    roughness: 0.95,
  }));
  plan.rotation.x = -Math.PI / 2; plan.position.set(0, 0.52, 0); plan.receiveShadow = true; f2.add(plan);
  return { g, floors, roof };
}

// ============================================================================================ les vitrines
const DX = 1400, DSP = 30;
const dx = (k) => DX + k * DSP;
function plinth(k) {
  const g = new THREE.Group(); g.position.set(dx(k), 0, 0); g.userData.dio = true; scene.add(g);
  box(12.4, 1.2, 12.4, M.base, 0, 0.6, 0, g);
  const top = new THREE.Group(); top.position.y = 1.2; g.add(top);
  return top;
}

function buildDio() {
  const d = {};
  // 1. Le besoin : une table ronde, le client et son conseiller, le cahier des charges qui se coche
  {
    const p = plinth(0);
    cyl(2.3, 0.22, M.white, 0, 1.55, 0, p, 40); cyl(0.3, 1.45, M.white, 0, 0.72, 0, p);
    chair(p, -3.1, 0, Math.PI / 2); chair(p, 3.1, 0, -Math.PI / 2);
    const a = person(M.white, p); a.position.set(-3.1, 0.6, 0); a.rotation.y = Math.PI / 2;
    const b = person(M.mint, p); b.position.set(3.1, 0.6, 0); b.rotation.y = -Math.PI / 2;
    const tex = [0, 1, 2, 3].map((n) => paperTex((g2) => {
      txt(g2, 'Cahier des charges', 36, 76, 44);
      ['Effectif', 'Quartiers', 'Budget'].forEach((s, i) => {
        const y = 190 + i * 150;
        g2.strokeStyle = '#1a1a18'; g2.lineWidth = 5; g2.strokeRect(40, y - 40, 60, 60);
        txt(g2, s, 130, y + 4, 40, 500, '#3a3b37', 'Noto Sans');
        if (i < n) checkPath(g2, 70, y - 6, 1.6);
      });
    }));
    const s = sheet(2.1, 2.85, tex[0], p); s.position.set(-0.2, 1.68, 0.3); s.rotation.z = 0.35;
    // Un ordinateur ouvert côté conseiller, deux tasses
    const lap = new THREE.Group(); lap.position.set(1.35, 1.67, -0.3); lap.rotation.y = -Math.PI / 2 - 0.3; p.add(lap);
    box(1.3, 0.06, 0.9, M.white, 0, 0.03, 0, lap);
    const scr = box(1.3, 0.85, 0.05, M.mint, 0, 0.45, -0.45, lap); scr.rotation.x = -0.3;
    for (const [x, z] of [[-1.2, -0.9], [0.9, 1.0]]) { cyl(0.17, 0.3, M.white, x, 1.82, z, p, 20); }
    d.s1 = { tex, sheet: s };
  }
  // 2. Le crible : 25 offres en miniature ; la plupart s'enfoncent, trois montent en menthe
  {
    const p = plinth(1);
    const R = rng(3);
    const blocks = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const h = 1 + R() * 2.4;
      const m = box(1.45, 1, 1.45, M.white.clone(), (i - 2) * 2.15, 0, (j - 2) * 2.15, p);
      m.geometry.translate(0, 0.5, 0);
      m.scale.y = h;
      blocks.push({ m, h, chosen: [6, 12, 18].includes(i * 5 + j), t: 30.55 + R() * 1.25 });
    }
    d.s2 = { blocks };
  }
  // 3. Les visites : un plateau en plan, le parcours de visite, deux personnages qui le suivent
  {
    const p = plinth(2);
    const wall = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0); const m = box(l, 1.3, 0.16, M.white, (x0 + x1) / 2, 0.65, (z0 + z1) / 2, p); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); };
    wall(-5, -5, 5, -5); wall(-5, -5, -5, 5); wall(5, -5, 5, 1); wall(-5, 5, 1.4, 5);
    wall(-5, -0.5, -1.4, -0.5); wall(0.5, -0.5, 5, -0.5); wall(1, -5, 1, -2.4);
    const route = tube([V(4.2, 0.06, 5.9), V(3.0, 0.06, 2.8), V(-0.9, 0.06, 1.5), V(-0.5, 0.06, -2.0), V(-3.2, 0.06, -2.9), V(2.8, 0.06, -3.3)], 0.16, M.glow, p, 240);
    const a = person(M.white, p), b = person(M.mint, p);
    a.scale.setScalar(0.8); b.scale.setScalar(0.8);
    d.s3 = { route, a, b };
  }
  // 4. La négociation : le contrat sur la table, ses clauses surlignées au mot près, puis le tampon
  {
    const p = plinth(3);
    box(7, 0.25, 3.6, M.white, 0, 2.2, 0, p); for (const x of [-3.2, 3.2]) box(0.25, 2.1, 3.2, M.white, x, 1.05, 0, p);
    chair(p, 4.6, 0, -Math.PI / 2); const per = person(M.mint, p); per.position.set(4.6, 0.6, 0); per.rotation.y = -Math.PI / 2;
    chair(p, -4.6, 0, Math.PI / 2); const per2 = person(M.white, p); per2.position.set(-4.6, 0.6, 0); per2.rotation.y = Math.PI / 2;
    const clauses = ['Loyer', 'Charges', 'Travaux', 'Durée'];
    const tex = [0, 1, 2, 3, 4, 5].map((n) => paperTex((g2) => {
      txt(g2, 'Contrat de location', 36, 76, 40);
      clauses.forEach((s, i) => {
        const y = 170 + i * 120;
        if (i < n) { g2.fillStyle = 'rgba(42,202,165,0.45)'; g2.fillRect(30, y - 44, 260, 60); }
        txt(g2, s, 40, y, 44, 600, '#1a1a18');
        g2.fillStyle = '#dcdcd5'; g2.fillRect(40, y + 22, 420, 12);
      });
      if (n === 5) {
        g2.save(); g2.translate(300, 600); g2.rotate(-0.16);
        g2.strokeStyle = '#1C9E80'; g2.lineWidth = 10; g2.strokeRect(-180, -52, 360, 104);
        txt(g2, 'NÉGOCIÉ', -150, 24, 72, 700, '#1C9E80'); g2.restore();
      }
    }));
    const s = sheet(2.5, 3.4, tex[0], p); s.position.set(0, 2.34, 0); s.rotation.z = 0.12;
    const stamp = new THREE.Group();
    cyl(0.25, 1.1, M.wood, 0, 0.9, 0, stamp); box(1.4, 0.3, 0.8, M.dark, 0, 0.18, 0, stamp);
    p.add(stamp);
    d.s4 = { tex, sheet: s, stamp };
  }
  // 5. Jusqu'aux clés : la signature, puis la clé qui tourne dans la serrure et la porte qui s'ouvre
  {
    const p = plinth(4);
    box(2.6, 4.4, 0.4, M.white, -2.7, 2.2, -2.5, p); box(2.6, 4.4, 0.4, M.white, 2.7, 2.2, -2.5, p); box(2.8, 0.6, 0.4, M.white, 0, 4.1, -2.5, p);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.8), M.light); light.position.set(0, 1.9, -2.75); p.add(light);
    const hinge = new THREE.Group(); hinge.position.set(-1.4, 0, -2.5); p.add(hinge);
    box(2.8, 3.8, 0.16, M.white, 1.4, 1.9, 0, hinge);
    const key = new THREE.Group();
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 12, 32), M.mint); bow.castShadow = true; key.add(bow);
    box(1.0, 0.12, 0.12, M.mint, 0.82, 0, 0, key); box(0.12, 0.26, 0.12, M.mint, 1.15, -0.12, 0, key); box(0.12, 0.18, 0.12, M.mint, 0.95, -0.1, 0, key);
    p.add(key);
    box(3, 0.2, 1.8, M.white, 3.4, 1.8, 3, p); for (const x of [2.1, 4.7]) box(0.18, 1.7, 1.4, M.white, x, 0.85, 3, p);
    const pen = tube([V(2.4, 1.93, 3.2), V(2.8, 1.93, 2.8), V(3.1, 1.93, 3.3), V(3.4, 1.93, 2.7), V(3.7, 1.93, 3.2), V(4.0, 1.93, 2.85), V(4.4, 1.93, 3.1)], 0.05, new THREE.MeshStandardMaterial({ color: COL.ink, roughness: 0.6 }), p, 160);
    const paper = sheet(2.4, 1.4, paperTex(() => {}, 300, 180), p); paper.position.set(3.4, 1.91, 3);
    d.s5 = { hinge, key, light, pen };
  }
  // Services : le contrat qu'on renégocie (une flèche en fait le tour), la salle louée pour une journée
  {
    const p = plinth(5);
    const tex = paperTex((g2) => {
      txt(g2, 'Contrat actuel', 36, 76, 44);
      for (let i = 0; i < 6; i++) { g2.fillStyle = '#dcdcd5'; g2.fillRect(40, 140 + i * 80, 420 - (i % 3) * 60, 16); }
    });
    const doc = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.95), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
    doc.position.set(0, 2.75, 0); doc.castShadow = true; p.add(doc);
    box(1.4, 0.2, 0.6, M.white, 0, 1.2, 0, p); box(0.2, 1.1, 0.2, M.white, 0, 0.55, 0, p);
    const arrow = new THREE.Group(); arrow.position.set(0, 2.75, 0); p.add(arrow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 12, 80, Math.PI * 1.6), M.mint); ring.castShadow = true; arrow.add(ring);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.72, 20), M.mint); tip.position.set(2.2 * Math.cos(Math.PI * 1.6), 2.2 * Math.sin(Math.PI * 1.6), 0); tip.rotation.z = Math.PI * 1.6; tip.castShadow = true; arrow.add(tip);
    d.v1 = { arrow };
  }
  {
    const p = plinth(6);
    box(5.5, 0.22, 2.6, M.white, 0, 1.55, 0.5, p); for (const x of [-2.4, 2.4]) box(0.2, 1.45, 2.2, M.white, x, 0.72, 0.5, p);
    for (const x of [-1.8, 0, 1.8]) { chair(p, x, -1.3, 0); chair(p, x, 2.3, Math.PI); }
    box(9, 3.9, 0.3, M.white, 0, 1.95, -4, p);
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.0), new THREE.MeshStandardMaterial({
      map: paperTex((g2, w, h) => {
        g2.fillStyle = '#2ACAA5'; g2.fillRect(0, 0, w, 110);
        g2.fillStyle = '#1a1a18'; g2.textAlign = 'center'; g2.font = '300 330px Parkinsans'; g2.fillText('1', w / 2, 470);
        g2.font = '600 56px "Noto Sans"'; g2.fillText('journée', w / 2, 580);
      }, 400, 640),
      roughness: 0.95,
    }));
    cal.position.set(0, 2.5, -3.83); p.add(cal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 10, 60), M.mint); ring.position.set(0, 2.38, -3.75); p.add(ring);
    d.v2 = { ring };
  }
  return d;
}

// ============================================================================================ la carte
const MAPC = V(2200, 0, 0), KM = 4.2;
const mp = (lon, lat) => V(MAPC.x + (lon - 2.6) * KM * Math.cos((46.5 * Math.PI) / 180), 0, MAPC.z - (lat - 46.6) * KM);
const FRANCE = [
  [2.37, 51.03], [3.2, 50.75], [4.2, 50.2], [4.85, 49.8], [5.9, 49.5], [7.0, 49.1], [8.2, 48.95], [7.75, 48.3], [7.55, 47.6],
  [6.9, 47.4], [6.1, 46.2], [6.8, 45.9], [7.0, 45.2], [6.9, 44.3], [7.5, 43.8], [6.6, 43.15], [5.4, 43.25], [4.6, 43.4],
  [3.95, 43.5], [3.1, 42.45], [1.7, 42.5], [0.6, 42.7], [-0.6, 42.85], [-1.8, 43.38], [-1.45, 44.6], [-1.2, 45.6],
  [-1.2, 46.2], [-2.2, 46.9], [-2.6, 47.4], [-4.5, 47.95], [-4.75, 48.4], [-3.5, 48.8], [-1.6, 48.65], [-1.95, 49.7],
  [-1.25, 49.65], [0.1, 49.45], [1.5, 50.1], [1.6, 50.75],
];
// Pays voisins, en relief plus bas (contours simplifiés)
const NEIGHBOURS = [
  [[2.5, 51.1], [3.4, 51.4], [4.0, 51.9], [4.7, 52.9], [5.6, 53.4], [7.0, 53.4], [8.6, 53.9], [9.0, 54.8], [10.0, 54.8], [11.0, 54.0], [12.5, 54.4], [14.2, 53.9],
    [14.6, 52.6], [15.0, 51.1], [12.3, 50.3], [13.8, 48.8], [13.0, 47.5], [10.5, 47.3], [8.6, 47.6], [7.5, 47.5], [6.8, 48.5], [5.5, 49.3], [4.5, 49.9], [3.0, 50.6]],
  [[6.0, 46.2], [6.8, 45.9], [7.0, 45.2], [6.9, 44.3], [7.5, 43.8], [8.4, 44.2], [9.5, 44.3], [10.2, 43.9], [10.5, 43.0], [11.2, 42.4], [12.5, 41.8], [13.8, 41.2],
    [13.8, 42.5], [12.3, 44.3], [12.4, 45.5], [13.7, 45.6], [13.6, 46.5], [12.4, 47.1], [10.5, 46.9], [9.6, 47.6], [8.6, 47.8], [7.6, 47.6], [6.9, 47.4]],
  [[-1.8, 43.38], [-0.6, 42.85], [0.6, 42.7], [1.7, 42.5], [3.1, 42.45], [3.3, 41.9], [2.1, 41.25], [0.9, 41.0], [0.2, 40.0], [-0.3, 39.4], [0.2, 38.8], [-0.7, 37.6],
    [-2.1, 36.7], [-4.4, 36.7], [-5.6, 36.0], [-6.3, 36.8], [-7.4, 37.2], [-8.9, 37.0], [-8.8, 38.7], [-9.5, 38.8], [-8.9, 40.2], [-8.7, 42.1], [-9.3, 43.0],
    [-8.0, 43.7], [-5.8, 43.6], [-3.6, 43.5]],
  [[-5.7, 50.0], [-3.0, 50.6], [1.4, 51.2], [1.7, 52.6], [0.3, 53.5], [-0.5, 54.5], [-3.0, 54.0], [-3.0, 53.3], [-4.6, 53.3], [-4.2, 52.3], [-5.2, 51.7], [-3.0, 51.4], [-4.2, 51.2]],
];
const CITIES = [['Paris', 2.35, 48.86, 7, -1], ['Lyon', 4.84, 45.76, 4.5, 1], ['Lille', 3.06, 50.63, 4.5, 1], ['Bordeaux', -0.58, 44.84, 4.5, -1], ['Bruxelles', 4.35, 50.85, 4.5, 1], ['Barcelone', 2.17, 41.39, 4.5, 1], ['Luxembourg', 6.13, 49.61, 4.5, 1]];
function buildMap() {
  const g = new THREE.Group(); scene.add(g);
  const shape = new THREE.Shape(FRANCE.map(([lo, la]) => { const p = mp(lo, la); return new THREE.Vector2(p.x - MAPC.x, -(p.z - MAPC.z)); }));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  const fr = new THREE.Mesh(geo, M.plinth); fr.position.set(MAPC.x, 0, MAPC.z); fr.castShadow = true; fr.receiveShadow = true; g.add(fr);
  const low = new THREE.MeshStandardMaterial({ color: 0x8e908b, roughness: 0.95 });
  for (const poly of NEIGHBOURS) {
    const sh = new THREE.Shape(poly.map(([lo, la]) => { const p = mp(lo, la); return new THREE.Vector2(p.x - MAPC.x, -(p.z - MAPC.z)); }));
    const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 });
    ge.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(ge, low); m.position.set(MAPC.x, 0, MAPC.z); m.receiveShadow = true; m.castShadow = true; g.add(m);
  }
  const pillars = CITIES.map(([n, lo, la, h, side]) => {
    const p = mp(lo, la);
    const inside = !['Bruxelles', 'Barcelone', 'Luxembourg'].includes(n);
    const m = cyl(0.45, 1, M.mint, p.x, 0, p.z, g, 24);
    m.geometry.translate(0, 0.5, 0);
    const base = inside ? 1.05 : 0.5;
    m.position.y = base;
    return { n, m, h, base, side, top: V(p.x, base + h, p.z), t: T.cities[n] };
  });
  const paris = pillars[0].top;
  const arcs = pillars.slice(1).map((c) => {
    const mid = paris.clone().lerp(c.top, 0.5); mid.y += 2 + paris.distanceTo(c.top) * 0.35;
    const curve = new THREE.QuadraticBezierCurve3(paris.clone(), mid, c.top.clone());
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.13, 8, false), M.glow); m.castShadow = true; g.add(m);
    m.userData = { seg: 80 };
    return { m, t: c.t };
  });
  return { g, pillars, arcs };
}

// ============================================================================================ construction
export function build(ctx) {
  ctx.cord.flat = true;
  canvas = el('canvas', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' } }, ctx.layers.gl);
  canvas.width = W; canvas.height = H;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 200, 600);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  camera = new THREE.PerspectiveCamera(36, W / H, 0.5, 2500);
  sun = new THREE.DirectionalLight(0xfff6ea, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 2.5; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  M = mats();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 1200), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.set(1200, 0, 0); ground.receiveShadow = true; scene.add(ground);
  city = buildCity(); cut = buildCut(); dio = buildDio(); map = buildMap();
  // Rendu : scène (MSAA) → occlusion ambiante → flou de bascule (2 passes) → tone mapping
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  // Occlusion calculée à mi-résolution (rendu logiciel : c'est la passe la plus coûteuse), puis débruitée
  gtao = new GTAOPass(scene, camera, W / 2, H / 2);
  gtao.setSize = (w, h) => GTAOPass.prototype.setSize.call(gtao, Math.round(w / 2), Math.round(h / 2));
  gtao.blendIntensity = 1.0;
  composer.addPass(gtao);
  tiltH = new ShaderPass(TiltShift); tiltV = new ShaderPass(TiltShift);
  tiltV.uniforms.dir.value.set(0, 1);
  composer.addPass(tiltH); composer.addPass(tiltV);
  composer.addPass(new OutputPass());
  buildOverlays(ctx);
  ctx.shared.cues = {
    ...(ctx.shared.cues || {}),
    drops: callouts.map((c) => ({ t: c.t, text: c.text, spoken: c.spoken })),
    dashes: [0.3, 1.15],
    floors: [T.line + 0.15, T.fmt2 - 0.4, T.fmt3 - 0.4],
    explode: T.choose - 0.2,
    lights: [T.blind + 0.55, T.blind + 1.25],
    ticks: [28.25, 28.7, 29.15],
    sinks: dio.s2.blocks.filter((b) => !b.chosen).map((b) => b.t),
    chosen: 32.15,
    walk: [34.9, 35.95],
    sign: [41.5, 42.75],
    keyTurn: 43.3,
    door: 43.6,
    renegSpin: 45.6,
    dayRing: 48.4,
    pillars: map.pillars.map((c) => c.t),
  };
}

function buildOverlays(ctx) {
  // Voile sombre en haut de l'image : les titres restent lisibles sur la maquette
  shade = el('div', { cls: 'layer' }, ctx.layers.worldFront);
  overlays = {};
  const s0 = Math.round(L.hookSize * 0.86);
  const hook = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: pick('140px', '62px') } }, ctx.layers.text);
  const mk = (parent, html, size, style = {}) => {
    const wrap = el('div', { cls: 'mask display', style: { fontSize: size + 'px', ...style } }, parent);
    return { wrap, inner: el('span', { html }, wrap) };
  };
  overlays.hook = { root: hook, lines: [mk(hook, 'Trouver', s0), mk(hook, 'des bureaux,', s0), mk(hook, 'c’est simple.', s0)] };
  overlays.paper = mk(hook, 'Sur le papier.', Math.round(L.hookSize * 0.6), { color: 'var(--mint)', fontWeight: '300', letterSpacing: '-0.03em', marginTop: pick('24px', '16px') });
  const hs = Math.round(L.headSize * 1.12);
  const head = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  overlays.tangle = { root: head, lines: [mk(head, 'Très vite,', hs, { marginBottom: '6px' }), mk(head, 'tout s’emmêle.', hs)] };
  overlays.flies = mk(head, 'Et le temps <span class="fl" style="display:inline-block;color:var(--mint)">file.</span>', hs);
  overlays.flies.wrap.style.position = 'absolute'; overlays.flies.wrap.style.top = '0px';
  overlays.flies.fl = overlays.flies.inner.querySelector('.fl');
  // Au drop : « Desk to Desk / tire le fil. » puis les trois promesses
  const brand = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.headY + 'px' } }, ctx.layers.text);
  overlays.brand = { root: brand, lines: [mk(brand, 'Desk to Desk', Math.round(L.bigSize * 0.78)), mk(brand, 'tire le <span style="color:var(--mint)">fil.</span>', Math.round(L.bigSize * 0.78))] };
  const subs = el('div', { style: { marginTop: pick('34px', '22px') } }, brand);
  overlays.subs = ['Un conseiller dédié.', 'Un seul interlocuteur.', 'Du brief à la remise des clés.'].map((s) => mk(subs, s, Math.round(L.subSize * 1.12), { fontFamily: "'Noto Sans', sans-serif", fontWeight: '600', letterSpacing: '-0.012em', marginBottom: pick('8px', '6px') }));
  // Étiquettes des critères (accrochées aux immeubles par un trait fin)
  tagsRoot = el('div', { cls: 'abs' }, ctx.layers.tags);
  const words = ['Charges', 'Nombre de postes', 'Surface', 'Bureau opéré ?', 'Budget', 'Coworking ?', 'Quartier', 'Travaux', 'Bail 3/6/9', 'Préavis', 'Visites', 'Dossier', 'Délais'];
  callouts = words.map((w, k) => {
    const spoken = [2, 4, 6, 8, 10, 12].includes(k);
    const e = el('div', { cls: 'abs display', text: w, style: { left: '0', top: '0', padding: spoken ? '12px 22px 14px' : '8px 15px 10px', background: spoken ? '#FAFAF6' : 'rgba(250,250,246,0.86)', color: '#1a1a18', fontSize: (spoken ? pick(50, 44) : pick(32, 28)) + 'px', borderRadius: '8px', whiteSpace: 'nowrap', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' } }, tagsRoot);
    return { e, text: w, spoken, t: T.drops[k], w: e.offsetWidth, h: e.offsetHeight, side: k % 2 ? 1 : -1 };
  });
  // Étiquettes 3D (étages, villes)
  const tag3 = (s, size) => el('div', { cls: 'abs display', text: s, style: { left: '0', top: '0', fontSize: size, whiteSpace: 'nowrap', color: '#FFFFFF', textShadow: '0 2px 18px rgba(0,0,0,0.65)' } }, ctx.layers.text);
  labels3d = [
    ...[['Coworking', T.line + 0.5, 0, T.fmt2 - 0.3], ['Bureau opéré', T.fmt2 + 0.05, 1, T.fmt3 - 0.3], ['Bail commercial', T.fmt3 + 0.05, 2, T.choose - 0.3]]
      .map(([s, t, k, solo]) => ({ e: tag3(s, pick('48px', '42px')), t, floor: k, solo, set: 'cut', until: T.s1 - 0.375 })),
    ...map.pillars.map((c) => ({ e: tag3(c.n, pick('36px', '32px')), t: c.t, p: c.top.clone(), side: c.side, set: 'map', until: T.free + 0.6 })),
  ];
  // Titres des sections (comme dans le reste du film)
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
    { tin: T.map, lines: ['En France', 'et en Europe.'] },
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
    const lines = h.lines.map((s) => mk(col, s, h.num ? L.headSize : Math.round(L.headSize * 0.98), { marginBottom: '4px', whiteSpace: 'nowrap' }));
    return { root, num, lines, tin: h.tin };
  });
  heads.forEach((h, i) => (h.tout = i + 1 < heads.length ? heads[i + 1].tin : T.free + 0.3));
  heads[heads.length - 1].late = 1; // « et en Europe. » arrive avec « et jusqu'à »
}

// ============================================================================================ caméra
const mixV = (a, b, u) => a.clone().lerp(b, u);
const blend = (a, b, w) => (w <= 0 ? a : w >= 1 ? b : { pos: mixV(a.pos, b.pos, w), tgt: mixV(a.tgt, b.tgt, w), fov: lerp(a.fov, b.fov, w), tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, w), focus: lerp(a.focus ?? 0.5, b.focus ?? 0.5, w) });
const orbit = (c, r, az, el_) => V(c.x + r * Math.cos(el_) * Math.sin(az), c.y + r * Math.sin(el_), c.z + r * Math.cos(el_) * Math.cos(az));
const wanderU = (tt) => E.inOutCubic(prog(tt, 4.85, 11.5)) * 0.98 + 0.01;

function cityShot(t) {
  const mid = V((START.x + city.tx) / 2, 0, (START.z + city.tz) / 2 + 4);
  // Le plan : vue presque zénithale, qui tourne et descend doucement
  const top = { pos: orbit(mid, 300 - 30 * E.inOutCubic(prog(t, 0, 2.7)), -0.35 + 0.12 * prog(t, 0, 2.7), 1.33), tgt: mid, fov: 30, tilt: 6, focus: 0.5 };
  // « Sur le papier » : la maquette bascule en perspective, la ligne droite traverse les immeubles
  const obl = { pos: orbit(V(0, 0, 0), 215, 0.7 + 0.1 * prog(t, 3.2, 4.9), 0.5), tgt: V(0, 34, -6), fov: 32, tilt: 10, focus: 0.68 };
  // L'errance : caméra drone derrière le repère
  const P = (u) => city.wander.getPointAt(Math.max(0, Math.min(1, u)));
  const pm = P(wanderU(t - 0.5)), pa = P(wanderU(t + 0.35)), pb = P(wanderU(t - 0.2));
  const back = pm.clone().sub(pb).setY(0);
  if (back.lengthSq() < 1e-6) back.set(0, 0, 1);
  back.normalize();
  const chase = { pos: pm.clone().add(back.multiplyScalar(30)).add(V(0, 52, 0)), tgt: pa.clone().add(V(0, 1, 0)), fov: 38, tilt: 10, focus: 0.5 };
  // Le temps file : vue aérienne qui tourne, le soleil fait le tour
  const aer = { pos: orbit(V(0, 0, 0), 230, -0.9 + 0.45 * E.inOutCubic(prog(t, 11.6, 14.4)), 1.0), tgt: V(0, 0, 0), fov: 34, tilt: 9, focus: 0.5 };
  // Drop : vue haute sur le bon chemin
  const high = { pos: orbit(V(-6, 0, 2), 250, -0.45, 1.12), tgt: V(-6, 0, 2), fov: 33, tilt: 8, focus: 0.5 };
  if (t < T.strike - 0.12) return top;
  if (t < 4.8) return blend(top, obl, move(prog(t, T.strike - 0.12, T.strike + 0.7)));
  if (t < 11.6) return blend(obl, chase, move(prog(t, 4.8, 5.5)));
  if (t < 14.4) return blend(chase, aer, move(prog(t, 11.6, 12.5)));
  if (t < 16.3) return blend(aer, high, move(prog(t, 14.4, 15.25)));
  // La caméra plonge et suit le bon chemin jusqu'au parvis de la tour, puis entre dans la façade
  const v = move(prog(t, 16.3, 21.2));
  const C = (x) => city.clean.getPointAt(Math.max(0, Math.min(1, x)));
  const follow = { pos: C(v - 0.06).add(V(0, 15 - 7 * v, 0)), tgt: C(v + 0.08).add(V(0, 2 + 5 * v, 0)), fov: 44, tilt: 7, focus: 0.55 };
  const hero = { pos: V(city.tx - 6, 5, city.tz + 31), tgt: V(city.tx - 9.5, 12.5, city.tz), fov: 40, tilt: 5, focus: 0.5 };
  const into = { pos: V(city.tx - 0.5, 13, city.tz + 7.2), tgt: V(city.tx - 0.5, 13, city.tz), fov: 40, tilt: 0, focus: 0.5 };
  return blend(blend(blend(high, follow, move(prog(t, 16.3, 17.2))), hero, move(prog(t, 20.4, 21.5))), into, E.inOutCubic(prog(t, 21.55, T.line)));
}

const floorY = (k, t) => k * FLH + k * 3.6 * whip(prog(t, T.choose - 0.25, T.choose + 0.55));
function cutShot(t) {
  const at = (k) => ({ pos: V(CUT.x + 17, k * FLH + 16, 22), tgt: V(CUT.x + 0.5, k * FLH + 0.8, -0.8), fov: 38, tilt: 9, focus: 0.55 });
  const wide = { pos: V(CUT.x + 30, 34, 56), tgt: V(CUT.x - 9, 9, 0), fov: 36, tilt: 9, focus: 0.5 };
  const arrive = { pos: V(CUT.x + 26, 22, 34), tgt: V(CUT.x + 0.5, 4, -0.8), fov: 38, tilt: 9, focus: 0.55 };
  let s = blend(arrive, at(0), E.outCubic(prog(t, T.line, T.line + 0.9)));
  s = blend(s, at(1), whip(prog(t, T.fmt2 - 0.45, T.fmt2 + 0.05)));
  s = blend(s, at(2), whip(prog(t, T.fmt3 - 0.45, T.fmt3 + 0.05)));
  return blend(s, wide, move(prog(t, T.choose - 0.25, T.choose + 0.75)));
}

// Passage de l'éclaté aux vitrines sur un temps (26,75 s)
const CUT_END = T.s1 - 0.375;
const DIO_T = () => [T.s1, T.s2, T.s3, T.s4, T.s5, T.reneg, T.day];
function dioShot(t) {
  const ts = DIO_T();
  const at = (k) => ({ pos: V(dx(k) + 8, 11.2, 17.5), tgt: V(dx(k) - 0.4, 1.4, 0.6) });
  const far = { pos: V(dx(0) + 15, 19, 30), tgt: V(dx(0) - 0.4, 1.4, 0.6) };
  let s = blend(far, at(0), E.outCubic(prog(t, CUT_END, CUT_END + 0.85)));
  for (let k = 1; k < ts.length; k++) {
    const w = whip(prog(t, ts[k] - 0.45, ts[k]));
    if (w > 0) { const n = at(k); s = { pos: mixV(s.pos, n.pos, w), tgt: mixV(s.tgt, n.tgt, w) }; }
  }
  // Lente rotation pendant chaque plan fixe
  const drift = 0.07 * Math.sin((t - T.s1) * 0.9);
  const off = s.pos.clone().sub(s.tgt).applyAxisAngle(V(0, 1, 0), drift);
  return { pos: s.tgt.clone().add(off), tgt: s.tgt, fov: 36, tilt: 10, focus: 0.5 };
}

function mapShot(t) {
  const a = 0.35 * E.inOutCubic(prog(t, T.map, T.free + 0.5)) - 0.1;
  const r = 58;
  return { pos: V(MAPC.x + r * Math.sin(a), 42 - 6 * prog(t, T.map, T.free), MAPC.z + 6 + r * Math.cos(a)), tgt: V(MAPC.x, 0, MAPC.z + 1), fov: 34, tilt: 7, focus: 0.5 };
}

function shot(t) {
  if (t < T.line) return { set: 'city', ...cityShot(t) };
  if (t < CUT_END) return { set: 'cut', ...cutShot(t) };
  if (t < T.map) return { set: 'dio', ...dioShot(t) };
  return { set: 'map', ...mapShot(t) };
}

const SET = {
  city: { c: () => V(0, 0, 0), ext: 112, dist: 260, ao: 3.2 },
  cut: { c: () => CUT.clone().add(V(0, 6, 0)), ext: 26, dist: 90, ao: 1.4 },
  dio: { c: (t) => V(dx(Math.max(0, DIO_T().filter((x) => x - 0.3 <= t).length - 1)), 0, 0), ext: 11, dist: 70, ao: 0.9, el: 0.6, env: 0.36 },
  map: { c: () => MAPC.clone(), ext: 34, dist: 120, ao: 1.6 },
};
function light(set, t) {
  const S = SET[set], c = S.c(t);
  let az = 0.6, el_ = S.el ?? 0.78;
  scene.environmentIntensity = S.env ?? 0.5;
  if (set === 'city') az += 2 * Math.PI * E.inOutCubic(prog(t, 12.3, 14.4)); // le temps file : le soleil fait le tour de la ville
  sun.position.copy(orbit(c, S.dist, az, el_));
  sun.target.position.copy(c);
  Object.assign(sun.shadow.camera, { left: -S.ext, right: S.ext, top: S.ext, bottom: -S.ext, near: 1, far: S.dist * 2 });
  sun.shadow.camera.updateProjectionMatrix();
  gtao.updateGtaoMaterial({ radius: S.ao, distanceExponent: 1.4, thickness: 1, scale: 1.1, samples: 12 });
}

// ============================================================================================ animation
const project = (p) => { const v = p.clone().project(camera); return [(v.x + 1) * 0.5 * W, (1 - v.y) * 0.5 * H, v.z]; };

export function update(t, ctx) {
  const on = t < T.free + 0.6;
  show(canvas, on); show(shade, on && t < T.free);
  if (!on) { hideAll(); return; }
  canvas.style.clipPath = t >= T.free ? `inset(0 0 ${Math.max(0, H - blindY(t)).toFixed(1)}px 0)` : 'none';
  const s = shot(t);
  camera.position.copy(s.pos); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.lookAt(s.tgt);
  // Brève secousse de caméra au coup de tampon
  if (t > T.stamp && t < T.stamp + 0.4) camera.position.y -= 0.25 * Math.exp(-(t - T.stamp) / 0.07) * Math.sin((t - T.stamp) * 70);
  // Brume : elle n'atteint que le lointain du plan en cours
  const d = s.pos.distanceTo(s.tgt);
  scene.fog.near = d * 1.05; scene.fog.far = d * 2.4 + 60;
  light(s.set, t);
  tiltH.uniforms.amount.value = tiltV.uniforms.amount.value = s.tilt;
  tiltH.uniforms.focus.value = tiltV.uniforms.focus.value = 1 - s.focus;
  city.g.visible = s.set === 'city'; cut.g.visible = s.set === 'cut'; map.g.visible = s.set === 'map';
  scene.children.forEach((o) => { if (o.userData.dio) o.visible = s.set === 'dio'; });

  // --- La ville
  if (s.set === 'city') {
    const dim = 1 - 0.4 * E.inOutCubic(prog(t, 14.4, 15.1)) * (1 - E.outCubic(prog(t, T.blind, T.blind + 0.35)));
    sun.intensity = 2.6 * dim; scene.environmentIntensity *= dim;
    city.dash.visible = t < 5.3;
    const nd = city.dash.children.length;
    city.dash.children.forEach((dd, k) => (dd.visible = t > 0.3 + (k / nd) * 0.85));
    city.ring.scale.setScalar(Math.max(0.001, E.soft(prog(t, 1.0, 1.5))));
    city.ring.visible = t < 5.3 || t > T.blind + 0.9;
    const u = wanderU(t);
    city.marker.position.copy(city.wander.getPointAt(t < 4.85 ? 0 : u)).setY(0);
    if (t >= 15.0) city.marker.position.copy(city.clean.getPointAt(Math.min(0.97, move(prog(t, 16.3, 21.2))))).setY(0);
    city.marker.scale.setScalar(Math.max(0.001, 1 - E.inCubic(prog(t, 20.3, 20.7))));
    drawTube(city.trail, t < 4.85 ? 0 : u * (1 - prog(t, T.blind - 0.1, T.blind + 0.45)));
    drawTube(city.ribbon, E.inOutCubic(prog(t, T.blind, T.blind + 1.0)));
    // La tour s'allume étage par étage
    const mint = new THREE.Color(COL.mint), base = new THREE.Color(COL.core);
    city.cores.forEach((m, k) => {
      const a = E.outCubic(prog(t, T.blind + 0.55 + k * 0.1, T.blind + 0.8 + k * 0.1));
      m.material.color.copy(base).lerp(mint, a);
      m.material.emissive.copy(mint); m.material.emissiveIntensity = 0.35 * a;
    });
  } else sun.intensity = 2.6;

  // --- L'immeuble en éclaté : le toit et les étages du dessus s'envolent pour montrer chaque format
  if (s.set === 'cut') {
    const off = whip(prog(t, T.line + 0.15, T.line + 0.8));
    const back = [0, T.fmt2, T.fmt3];
    cut.floors.forEach((f, k) => {
      const up = k === 0 ? 0 : 46 * off * (1 - whip(prog(t, back[k] - 0.45, back[k] + 0.05)));
      f.position.y = floorY(k, t) + up;
    });
    cut.roof.position.y = 3 * FLH + 60 * off;
  }

  // --- Vitrines
  if (s.set === 'dio') {
    const n = Math.min(3, Math.floor((t - 28.25) / 0.45) + 1);
    dio.s1.sheet.material.map = dio.s1.tex[Math.max(0, t < 28.25 ? 0 : n)];
    dio.s2.blocks.forEach((b) => {
      if (b.chosen) {
        const r = E.soft(prog(t, 32.15, 32.6));
        b.m.scale.y = b.h + 1.6 * r;
        b.m.material.color.set(COL.white).lerp(new THREE.Color(COL.mint), r);
      } else {
        b.m.scale.y = Math.max(0.04, b.h * (1 - E.inOutCubic(prog(t, b.t, b.t + 0.35))));
      }
    });
    drawTube(dio.s3.route, E.inOutCubic(prog(t, 33.8, 34.9)));
    for (const [pp, lag] of [[dio.s3.a, 0.06], [dio.s3.b, 0]]) {
      const w = E.inOutCubic(prog(t, 34.9, 35.95));
      const q = dio.s3.route.userData.curve.getPointAt(Math.max(0, w - lag));
      const q2 = dio.s3.route.userData.curve.getPointAt(Math.min(1, Math.max(0, w - lag) + 0.02));
      pp.position.set(q.x, 0, q.z); pp.rotation.y = Math.atan2(q2.x - q.x, q2.z - q.z);
    }
    const ci = T.clauses.filter((c) => t >= c).length;
    dio.s4.sheet.material.map = dio.s4.tex[t >= T.stamp ? 5 : ci];
    const st = t < T.stamp - 0.12 ? 1 : t < T.stamp ? 1 - E.inCubic(prog(t, T.stamp - 0.12, T.stamp)) : E.inOutCubic(prog(t, T.stamp + 0.15, T.stamp + 0.6));
    dio.s4.stamp.position.set(0.3, 2.37 + 3.2 * st, 0.2);
    dio.s4.stamp.visible = t > T.s4 + 0.6;
    drawTube(dio.s5.pen, prog(t, 41.5, 42.75));
    const kin = E.outCubic(prog(t, 42.85, 43.3));
    dio.s5.key.position.set(lerp(4.5, 1.15, kin), lerp(4.2, 1.9, kin), lerp(1.5, -2.1, kin));
    dio.s5.key.rotation.set(Math.PI / 2 * E.inOutCubic(prog(t, 43.3, 43.55)), Math.PI, 0);
    dio.s5.key.visible = t > 42.8 && t < 44.2;
    dio.s5.hinge.rotation.y = -1.25 * E.inOutCubic(prog(t, 43.6, 44.1));
    dio.s5.light.material.opacity = 0.55 * prog(t, 43.65, 44.1);
    dio.v1.arrow.rotation.z = -2 * Math.PI * E.inOutCubic(prog(t, 45.6, 46.6));
    dio.v2.ring.scale.setScalar(Math.max(0.001, E.soft(prog(t, 48.4, 48.75))));
  }
  // --- Carte
  if (s.set === 'map') {
    map.pillars.forEach((c) => (c.m.scale.y = Math.max(0.001, c.h * E.soft(prog(t, c.t - 0.1, c.t + 0.35)))));
    map.arcs.forEach((a) => drawTube(a.m, E.inOutCubic(prog(t, a.t - 0.45, a.t))));
  }
  composer.render();
  overlaysUpdate(t, ctx, s);
}

function hideAll() {
  callouts.forEach((c) => show(c.e, false));
  labels3d.forEach((l) => show(l.e, false));
  for (const r of [overlays.hook.root, overlays.tangle.root, overlays.brand.root, headRoot]) show(r, false);
}

function reveal(ln, p, q = 0) { ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`; }

function overlaysUpdate(t, ctx, s) {
  const deep = t < 4.9 ? 0.62 : 0.44;
  shade.style.background = `linear-gradient(180deg, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0.6) ${(deep * 50).toFixed(0)}%, rgba(17,17,17,0) ${(deep * 100).toFixed(0)}%)`;
  // Accroche
  const hk = overlays.hook;
  show(hk.root, t < 4.9);
  const ins = [T.l1, T.l1 + 0.45, T.l2];
  hk.lines.forEach((ln, i) => {
    ln.wrap.style.visibility = t < ins[i] ? 'hidden' : '';
    reveal(ln, E.enter(prog(t, ins[i], ins[i] + 0.8)), E.exit(prog(t, 4.42 + i * 0.04, 4.74 + i * 0.04)));
  });
  overlays.paper.wrap.style.visibility = t < T.paper ? 'hidden' : '';
  reveal(overlays.paper, E.enter(prog(t, T.paper, T.paper + 0.7)), E.exit(prog(t, 4.5, 4.85)));
  // Problème
  const tg = overlays.tangle;
  show(tg.root, t >= T.tangle - 0.1 && t < T.pull + 0.3);
  tg.lines.forEach((ln, i) => reveal(ln, E.enter(prog(t, i ? T.tangle2 : T.tangle, (i ? T.tangle2 : T.tangle) + 0.7)), E.exit(prog(t, T.timeFlies - 0.35 + i * 0.05, T.timeFlies - 0.02 + i * 0.05))));
  reveal(overlays.flies, E.enter(prog(t, T.timeFlies + 0.05, T.timeFlies + 0.75)), E.exit(prog(t, T.pull - 0.05, T.pull + 0.25)));
  overlays.flies.fl.style.transform = `translate3d(0,${((1 - E.enter(prog(t, T.file, T.file + 0.55))) * 135).toFixed(2)}%,0)`;
  // Marque
  const br = overlays.brand;
  show(br.root, t >= T.brand[0] - 0.05 && t < T.line);
  br.lines.forEach((ln, i) => reveal(ln, E.enter(prog(t, i ? T.brand2[0] : T.brand[0], (i ? T.brand2[0] : T.brand[0]) + 0.7)), E.exit(prog(t, 21.45 + i * 0.04, 21.8 + i * 0.04))));
  overlays.subs.forEach((ln, i) => reveal(ln, E.enter(prog(t, [T.sub1, T.sub2, T.sub3][i], [T.sub1, T.sub2, T.sub3][i] + 0.7)), E.exit(prog(t, 21.5 + i * 0.04, 21.82 + i * 0.04))));
  // Étiquettes des critères, accrochées aux immeubles proches du repère
  const g = ctx.cord.g;
  callouts.forEach((c, k) => {
    const life = c.spoken ? 2.6 : 1.7;
    const vis = s.set === 'city' && t >= c.t - 0.05 && t < Math.min(c.t > 12 ? 14.6 : 12.4, c.t + life);
    show(c.e, vis);
    if (!vis) return;
    if (!c.anchor) {
      const m = city.wander.getPointAt(wanderU(c.t + 0.3));
      let best = null, bd = 1e9;
      for (const l of city.lots) { const dd = Math.hypot(l.x - m.x, l.z - m.z) + (k % 3) * 2.5; if (dd < bd && dd > 7) { bd = dd; best = l; } }
      c.anchor = V(best.x, best.h, best.z);
    }
    const [ax, ay, az] = project(c.anchor);
    if (az > 1) { show(c.e, false); return; }
    const a = E.soft(prog(t, c.t - 0.05, c.t + 0.3));
    const fade = (c.t > 12 ? 1 - prog(t, 14.2, 14.6) : 1 - prog(t, 12.0, 12.4)) * (1 - prog(t, c.t + life - 0.3, c.t + life));
    const lx = Math.min(W - 30 - c.w, Math.max(30, ax + c.side * pick(60, 46) - (c.side < 0 ? c.w : 0))), ly = Math.max(L.headY + 170, ay - pick(110, 90) - c.h);
    c.e.style.transform = `translate3d(${lx.toFixed(1)}px,${ly.toFixed(1)}px,0) scale(${(0.6 + 0.4 * a).toFixed(3)})`;
    c.e.style.transformOrigin = c.side < 0 ? '100% 100%' : '0 100%';
    op(c.e, Math.min(1, a) * fade);
    g.save();
    g.globalAlpha = Math.min(1, a) * fade;
    g.strokeStyle = '#FAFAF6'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(c.side < 0 ? lx + c.w : lx, ly + c.h); g.stroke();
    g.fillStyle = '#2ACAA5'; g.beginPath(); g.arc(ax, ay, 7, 0, Math.PI * 2); g.fill();
    g.restore();
  });
  // Étiquettes 3D
  labels3d.forEach((l) => {
    const vis = s.set === l.set && t >= l.t - 0.02 && t < l.until;
    show(l.e, vis);
    if (!vis) return;
    if (l.p) {
      const [x, y] = project(l.p);
      if (t >= T.free && y > blindY(t) - 12) { show(l.e, false); return; }
      // Nom de la ville à côté du sommet de sa colonne, à gauche ou à droite selon la place
      l.e.style.transform = `translate3d(${(l.side < 0 ? x - l.e.offsetWidth - 14 : x + 14).toFixed(1)}px,${(y - l.e.offsetHeight * 0.62).toFixed(1)}px,0)`;
      op(l.e, prog(t, l.t, l.t + 0.25) * (1 - prog(t, l.until - 0.25, l.until)));
      return;
    }
    // Étages : en légende en bas à gauche pendant le plan sur l'étage, puis accrochés à l'éclaté
    if (t < l.solo + 0.4) {
      l.e.style.transform = `translate3d(${L.mx}px,${H - pick(150, 132)}px,0)`;
      op(l.e, E.enter(prog(t, l.t, l.t + 0.35)) * (1 - prog(t, l.solo, l.solo + 0.25)));
      return;
    }
    const [x, y] = project(CUT.clone().add(V(-12.6, cut.floors[l.floor].position.y + 0.4, 7)));
    l.e.style.transform = `translate3d(${(x - l.e.offsetWidth - 26).toFixed(1)}px,${(y - l.e.offsetHeight * 0.75).toFixed(1)}px,0)`;
    op(l.e, prog(t, T.choose + 0.1, T.choose + 0.3) * (1 - prog(t, l.until - 0.15, l.until)));
  });
  // Titres des sections
  show(headRoot, t >= T.line - 0.05 && t < T.free + 0.3);
  heads.forEach((h) => {
    const vis = t >= h.tin - 0.05 && t < h.tout + 0.05;
    show(h.root, vis);
    if (!vis) return;
    const parts = (h.num ? [h.num] : []).concat(h.lines);
    parts.forEach((ln, k) => {
      const t0 = h.late && k === 1 ? T.europe : h.tin + 0.02 + k * 0.08;
      reveal(ln, E.enter(prog(t, t0, t0 + 0.7)), E.exit(prog(t, h.tout - 0.34 + k * 0.035, h.tout - 0.04 + k * 0.035)));
    });
  });
}
