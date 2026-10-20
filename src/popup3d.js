// Maquette « pop-up » (Three.js) : le plan imprimé sur la feuille se déplie en volume.
// Style dessin d'architecte : murs blancs cernés d'encre, sol couleur papier, ombres douces.
import * as THREE from 'three';
import { E, prog, lerp } from './lib/ease.js';

export const WALLS = [
  { a: [1.3, 10], b: [6, 10] }, { a: [6, 10], b: [6, -10] }, { a: [6, -10], b: [-6, -10] },
  { a: [-6, -10], b: [-6, 10] }, { a: [-6, 10], b: [-1.3, 10] },
  { a: [-6, -5], b: [-1.9, -5], glass: true }, { a: [-0.7, -5], b: [0.6, -5], glass: true }, { a: [0.6, -5], b: [0.6, -10], glass: true },
  { a: [3.2, -10], b: [3.2, -6.4], glass: true }, { a: [3.2, -8.2], b: [6, -8.2] }, { a: [3.2, -6.4], b: [6, -6.4] },
  { a: [-6, 4], b: [-3.4, 4] },
];
export const FURN = [];
for (const cx of [-2.5, 2.5]) for (const z of [-3.0, -1.5, 0.0]) {
  FURN.push({ c: [cx - 0.41, z], s: [0.8, 1.4], h: 0.74 }, { c: [cx + 0.41, z], s: [0.8, 1.4], h: 0.74 });
  FURN.push({ c: [cx - 1.08, z], r: 0.27, h: 0.48 }, { c: [cx + 1.08, z], r: 0.27, h: 0.48 });
}
FURN.push({ c: [-2.7, -7.5], s: [1.4, 3.4], h: 0.74 });
for (const z of [-8.6, -7.5, -6.4]) FURN.push({ c: [-3.75, z], r: 0.27, h: 0.48 }, { c: [-1.65, z], r: 0.27, h: 0.48 });
FURN.push({ c: [-5.5, 7.0], s: [0.9, 5.0], h: 0.95 }, { c: [-3.8, 7.3], r: 0.65, h: 0.74 });
FURN.push({ c: [4.5, 8.55], s: [2.4, 0.9], h: 0.45 }, { c: [4.5, 9.1], s: [2.4, 0.3], h: 0.85 }, { c: [4.5, 7.1], s: [1.3, 0.7], h: 0.38 });
FURN.push({ c: [5.35, -9.1], s: [0.9, 1.2], h: 0.74 }, { c: [5.35, -7.3], s: [0.9, 1.2], h: 0.74 });
for (const c of [[5.35, 2.6], [-5.35, -4.3], [5.35, -5.6], [2.1, 9.3]]) FURN.push({ c, r: 0.32, h: 0.45, plant: true });
export const VISIT = [[0, 11.2], [0, 9.0], [0.15, 6.0], [0, 2.4], [0, -2.0], [-0.25, -3.9], [-1.3, -4.6], [-1.3, -5.6], [-1.6, -6.3]];

const WALL_H = 2.9, WALL_T = 0.16;
const INK = 0x1a1a18, PAPER = 0xfafaf6, MINT = 0x2acaa5;

export function createPopup(canvas, W, H, { pxm, center }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, W / H, 1, 600);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdedad0, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-10, 22, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.06;
  key.shadow.radius = 6;
  scene.add(key);

  const M = {
    paper: new THREE.MeshBasicMaterial({ color: PAPER }),
    shadow: new THREE.ShadowMaterial({ opacity: 0.22 }),
    wall: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    furn: new THREE.MeshLambertMaterial({ color: 0xf3f3ee }),
    plant: new THREE.MeshLambertMaterial({ color: 0x449280 }),
    glass: new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.2, depthWrite: false }),
    ink: new THREE.MeshBasicMaterial({ color: INK }),
    line: new THREE.LineBasicMaterial({ color: INK }),
    lineMint: new THREE.LineBasicMaterial({ color: 0x1c9e80 }),
    mint: new THREE.MeshBasicMaterial({ color: MINT }),
  };

  const root = new THREE.Group();
  scene.add(root);
  // Sol papier (couleur exacte de la feuille) + plan qui ne reçoit que les ombres
  // Pas de sol opaque : la feuille elle-même sert de sol, la maquette y projette ses ombres
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 20.6), M.shadow);
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.002;
  catcher.receiveShadow = true;
  root.add(catcher);

  // Traits du plan au sol (identiques au dessin de la feuille)
  for (const w of WALLS) {
    const [x1, z1] = w.a, [x2, z2] = w.b;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len + WALL_T, WALL_T), w.glass ? M.mint : M.ink);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(z2 - z1, x2 - x1);
    m.position.set((x1 + x2) / 2, 0.004, (z1 + z2) / 2);
    root.add(m);
  }

  const withEdges = (mesh, mat = M.line) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), mat);
    mesh.add(e);
    return mesh;
  };
  const walls = WALLS.map((w) => {
    const [x1, z1] = w.a, [x2, z2] = w.b;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    const mesh = w.glass
      ? withEdges(new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H - 0.1, 0.05), M.glass), M.lineMint)
      : withEdges(new THREE.Mesh(new THREE.BoxGeometry(len + WALL_T, WALL_H, WALL_T), M.wall));
    mesh.position.y = (WALL_H - (w.glass ? 0.1 : 0)) / 2;
    mesh.castShadow = !w.glass;
    g.add(mesh);
    g.scale.y = 0.001;
    root.add(g);
    return g;
  });
  const furn = FURN.map((f) => {
    const g = new THREE.Group();
    g.position.set(f.c[0], 0, f.c[1]);
    let mesh;
    if (f.plant) {
      mesh = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r * 0.8, f.h, 20), M.furn));
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), M.plant);
      leaf.position.y = f.h / 2 + 0.5;
      leaf.castShadow = true;
      mesh.add(leaf);
    } else if (f.r) {
      mesh = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r, f.h, 20), M.furn));
    } else {
      mesh = withEdges(new THREE.Mesh(new THREE.BoxGeometry(f.s[0], f.h, f.s[1]), M.furn));
    }
    mesh.position.y = f.h / 2;
    mesh.castShadow = true;
    g.add(mesh);
    g.scale.y = 0.001;
    root.add(g);
    return { g, d: Math.hypot(f.c[0], f.c[1] - 10) };
  });
  [...furn].sort((a, b) => a.d - b.d).forEach((f, k) => (f.k = k));

  const curve = new THREE.CatmullRomCurve3(VISIT.map(([x, z]) => new THREE.Vector3(x, 0.08, z)), false, 'centripetal');
  const TS = 220, RS = 10;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, TS, 0.09, RS, false), M.mint);
  root.add(tube);
  const end = curve.getPoint(1);
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 12, 48), M.mint);
  ring.rotation.x = -Math.PI / 2;
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), M.mint);
  dot.rotation.x = -Math.PI / 2;
  marker.add(ring, dot);
  marker.position.set(end.x, 0.03, end.z);
  root.add(marker);

  // Caméra : vue du dessus calée sur le dessin de la feuille, puis bascule
  const D = H / (2 * Math.tan(THREE.MathUtils.degToRad(11)) * pxm);
  const T0 = new THREE.Vector3((W / 2 - center[0]) / pxm, 0, (H / 2 - center[1]) / pxm);
  const T1 = T0.clone().add(new THREE.Vector3(0, 0, -1.6));
  const tmp = new THREE.Vector3();
  function cameraAt(tl) {
    const a = E.inOutCubic(prog(tl, 1.15, 2.4));
    const phi = lerp(0.0008, 0.58, a);
    const theta = lerp(0, -0.3, a) - 0.07 * E.inOutCubic(prog(tl, 1.5, 5));
    const R = lerp(D, D * 0.97, a);
    tmp.copy(T0).lerp(T1, a);
    camera.position.set(tmp.x + R * Math.sin(phi) * Math.sin(theta), R * Math.cos(phi), tmp.z + R * Math.sin(phi) * Math.cos(theta));
    camera.up.set(0, 1, 0);
    camera.lookAt(tmp);
    camera.updateMatrixWorld();
  }
  const v = new THREE.Vector3();
  function project(x, y, z) {
    v.set(x, y, z).project(camera);
    return [(v.x + 1) * 0.5 * W, (1 - v.y) * 0.5 * H];
  }

  return {
    cameraAt, project,
    update(tl) {
      cameraAt(tl);
      walls.forEach((g, i) => (g.scale.y = Math.max(0.001, E.outCubic(prog(tl, 1.2 + i * 0.03, 1.8 + i * 0.03)))));
      furn.forEach((f) => (f.g.scale.y = Math.max(0.001, E.outCubic(prog(tl, 1.6 + f.k * 0.01, 2.05 + f.k * 0.01)))));
      const seg = Math.floor(E.inOutCubic(prog(tl, 2.3, 3.3)) * TS);
      tube.geometry.setDrawRange(0, seg * RS * 6);
      tube.visible = seg > 0;
      const m = E.soft(prog(tl, 3.2, 3.5));
      marker.scale.setScalar(Math.max(0.001, m));
      marker.visible = m > 0.002;
      renderer.render(scene, camera);
    },
  };
}
