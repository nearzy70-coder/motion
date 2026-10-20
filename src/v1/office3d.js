// Maquette architecturale 3D (Three.js) : le plan s'extrude, la caméra bascule en vue 3/4,
// le fil trace le parcours de visite. Entièrement piloté par le temps t (aucune horloge interne).
import * as THREE from 'three';
import { E, prog, lerp } from './lib/ease.js';
import { WALLS, FURNITURE, ZONE, VISIT } from './plan.js';

const WALL_H = 2.9, WALL_T = 0.22;

export function createOffice(canvas, W, H, T) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, W / H, 1, 400);

  // Lumières : clé douce en haut à gauche, ciel/sol neutres, contre-jour menthe très léger
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b201e, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-12, 24, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.07;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbaf5e6, 0.45);
  rim.position.set(14, 8, -12);
  scene.add(rim);

  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x1c2220, roughness: 0.96 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf1f3f2, roughness: 0.82 }),
    furn: new THREE.MeshStandardMaterial({ color: 0xe6eae8, roughness: 0.7 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x323936, roughness: 0.6 }),
    plant: new THREE.MeshStandardMaterial({ color: 0x449280, roughness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x34e0b8, roughness: 0.15, transparent: true, opacity: 0.22, depthWrite: false }),
    mint: new THREE.MeshBasicMaterial({ color: 0x2acaa5 }),
    plan: new THREE.MeshBasicMaterial({ color: 0x2acaa5, transparent: true }),
    zone: new THREE.MeshBasicMaterial({ color: 0x2acaa5, transparent: true, opacity: 0, depthWrite: false }),
  };

  const root = new THREE.Group();
  scene.add(root);

  // Dalle de plancher
  const slab = new THREE.Mesh(new THREE.BoxGeometry(12.9, 0.35, 20.9), M.floor);
  slab.position.y = -0.175;
  slab.receiveShadow = true;
  root.add(slab);

  // Traits du plan au sol (identiques au plan 2D, s'effacent quand les murs montent)
  const planLines = new THREE.Group();
  root.add(planLines);
  for (const w of WALLS) {
    const [x1, z1] = w.a, [x2, z2] = w.b;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.1, 0.1), M.plan);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(z2 - z1, x2 - x1);
    m.position.set((x1 + x2) / 2, 0.006, (z1 + z2) / 2);
    planLines.add(m);
  }

  // Murs (pivot à la base pour l'extrusion)
  const walls = WALLS.map((w, i) => {
    const [x1, z1] = w.a, [x2, z2] = w.b;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    if (w.glass) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H - 0.1, 0.05), M.glass);
      pane.position.y = (WALL_H - 0.1) / 2;
      g.add(pane);
      const top = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.07, 0.09), M.mint);
      top.position.y = WALL_H - 0.08;
      g.add(top);
      const base = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.06, 0.09), M.mint);
      base.position.y = 0.03;
      g.add(base);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + WALL_T, WALL_H, WALL_T), M.wall);
      m.position.y = WALL_H / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    g.scale.y = 0.001;
    root.add(g);
    return { g, i };
  });

  // Mobilier
  const furn = FURNITURE.map((f, j) => {
    const g = new THREE.Group();
    g.position.set(f.c[0], 0, f.c[1]);
    let mesh;
    if (f.kind === 'chair') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r * 0.92, f.h, 24), M.chair);
    } else if (f.kind === 'round') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r, f.h, 40), M.furn);
    } else if (f.kind === 'plant') {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r * 0.8, f.h, 24), M.furn);
      pot.position.y = f.h / 2; pot.castShadow = true;
      g.add(pot);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), M.plant);
      leaf.position.y = f.h + 0.5; leaf.scale.set(1, 1.15, 1); leaf.castShadow = true;
      g.add(leaf);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(f.s[0], f.h, f.s[1]), f.kind === 'sofa' ? M.chair : M.furn);
    }
    if (mesh) {
      mesh.position.y = f.h / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    g.scale.y = 0.001;
    root.add(g);
    return { g, j, d: Math.hypot(f.c[0], f.c[1] - 10) };
  });
  // Ordre d'apparition : de l'entrée vers le fond
  const furnOrder = [...furn].sort((a, b) => a.d - b.d);
  furnOrder.forEach((f, k) => (f.k = k));

  // Zone open space
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(ZONE.s[0], ZONE.s[1]), M.zone);
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(ZONE.c[0], 0.008, ZONE.c[1]);
  root.add(zone);

  // Parcours de visite : tube menthe non éclairé (même matière graphique que le fil 2D)
  const curve = new THREE.CatmullRomCurve3(VISIT.map(([x, z]) => new THREE.Vector3(x, 0.07, z)), false, 'centripetal');
  const TUBE_SEG = 240, RAD_SEG = 10;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, TUBE_SEG, 0.075, RAD_SEG, false), M.mint);
  root.add(tube);
  const endPt = curve.getPoint(1);
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 48), M.mint);
  ring.rotation.x = -Math.PI / 2;
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), M.mint);
  core.rotation.x = -Math.PI / 2;
  marker.add(ring, core);
  marker.position.set(endPt.x, 0.02, endPt.z);
  root.add(marker);

  // Caméra : plan vu du dessus → vue 3/4 avec lente orbite
  const D_TOP = 99;
  const TARGET_TOP = new THREE.Vector3(-0.76, 0, -1.43);
  // Réglages de la vue 3/4 (mesurés pour inscrire la maquette dans la zone de contenu)
  const CAM = { phi: 0.86, theta: -0.22, orbit: -0.1, R: 102, tx: 0.15, ty: 0.0, tz: -1.2 };
  const tmpT = new THREE.Vector3(), T34 = new THREE.Vector3();

  function cameraAt(t) {
    const a = E.inOutCubic(prog(t, T.extrude, T.extrude + 1.35));
    const phi = lerp(0.0008, CAM.phi, a);
    const theta = lerp(0, CAM.theta, a) + CAM.orbit * E.inOutCubic(prog(t, T.extrude + 0.4, T.step4 + 0.4));
    const R = lerp(D_TOP, CAM.R, E.inOutCubic(prog(t, T.extrude - 0.05, T.extrude + 1.6)));
    T34.set(CAM.tx, CAM.ty, CAM.tz);
    tmpT.copy(TARGET_TOP).lerp(T34, a);
    camera.position.set(
      tmpT.x + R * Math.sin(phi) * Math.sin(theta),
      tmpT.y + R * Math.cos(phi),
      tmpT.z + R * Math.sin(phi) * Math.cos(theta),
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(tmpT);
    camera.updateMatrixWorld();
  }

  const v = new THREE.Vector3();
  function project(x, y, z) {
    v.set(x, y, z).project(camera);
    return [(v.x + 1) * 0.5 * W, (1 - v.y) * 0.5 * H];
  }

  function update(t) {
    cameraAt(t);
    walls.forEach(({ g, i }) => {
      const t0 = T.extrude + 0.02 + i * 0.035;
      g.scale.y = Math.max(0.001, E.outCubic(prog(t, t0, t0 + 0.6)));
    });
    furn.forEach((f) => {
      const t0 = T.extrude + 0.45 + f.k * 0.012;
      f.g.scale.y = Math.max(0.001, E.outCubic(prog(t, t0, t0 + 0.45)));
    });
    M.plan.opacity = 1 - prog(t, T.extrude + 0.25, T.extrude + 0.8);
    planLines.visible = M.plan.opacity > 0.01;
    M.zone.opacity = 0.14 * E.inOutCubic(prog(t, T.extrude + 0.9, T.extrude + 1.2));
    const vis = E.inOutCubic(prog(t, T.extrude + 0.95, T.extrude + 1.75));
    const segs = Math.floor(vis * TUBE_SEG);
    tube.geometry.setDrawRange(0, segs * RAD_SEG * 6);
    tube.visible = segs > 0;
    const m = E.soft(prog(t, T.extrude + 1.7, T.extrude + 2.0));
    marker.scale.setScalar(Math.max(0.001, m));
    marker.visible = m > 0.002;
  }

  function render() {
    renderer.render(scene, camera);
  }

  // Plan 2D projeté avec la caméra du dessus (pour un raccord exact avec la maquette)
  function planScreen() {
    cameraAt(T.extrude - 0.2);
    const walls2d = WALLS.map((w) => ({ a: project(w.a[0], 0, w.a[1]), b: project(w.b[0], 0, w.b[1]), glass: !!w.glass }));
    const furn2d = FURNITURE.map((f) => {
      if (f.r) return { c: project(f.c[0], 0, f.c[1]), r: Math.abs(project(f.c[0] + f.r, 0, f.c[1])[0] - project(f.c[0], 0, f.c[1])[0]) };
      const p0 = project(f.c[0] - f.s[0] / 2, 0, f.c[1] - f.s[1] / 2), p1 = project(f.c[0] + f.s[0] / 2, 0, f.c[1] + f.s[1] / 2);
      return { x: p0[0], y: p0[1], w: p1[0] - p0[0], h: p1[1] - p0[1] };
    });
    const entrance = project(0, 0, 10);
    const xs = walls2d.flatMap((w) => [w.a[0], w.b[0]]), ys = walls2d.flatMap((w) => [w.a[1], w.b[1]]);
    const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    return { walls: walls2d, furn: furn2d, entrance, bbox };
  }

  return { update, render, project, cameraAt, planScreen, CAM };
}
