// Moteur axonométrique du film v9 : caméra orthographique, volumes à faces planes (trois tons par la lumière),
// arêtes à l'encre en traits épais (LineSegments2), ombres de contact douces, panneaux de texte.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { W, H } from './timeline.js';

export { LineSegments2, LineSegmentsGeometry, LineMaterial };

export const PAL = {
  paper: 0xfafaf7, white: 0xffffff, ink: 0x161616, night: 0x111111, mint: 0x2acaa5, mintDark: 0x1c9e80,
  gray: 0xb9bab4, line: 0x111111, lineNight: 0xf4f4ef,
};

export let renderer, scene, camera;
const LINE_MATS = new Map();

export function initIso(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -5000, 5000);
  // Lumière d'illustration : un fort ambiant et une directionnelle → dessus clair, deux flancs bien distincts
  scene.add(new THREE.AmbientLight(0xffffff, 1.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-0.45, 1, 0.75);
  scene.add(sun);
  return { renderer, scene, camera };
}

// Caméra axonométrique : cible, azimut, élévation, zoom (px par unité), roulis
export function setCam({ x = 0, y = 0, z = 0, az = Math.PI / 4, el = 0.6155, zoom = 4 }) {
  const d = 2000;
  camera.position.set(x + d * Math.cos(el) * Math.sin(az), y + d * Math.sin(el), z + d * Math.cos(el) * Math.cos(az));
  // Vue de dessus (plan) : le haut de l'image devient l'arrière de la scène ; on fond les deux repères près du zénith
  const k = Math.min(1, Math.max(0, (el - 1.15) / 0.42));
  const s = k * k * (3 - 2 * k);
  camera.up.set(-Math.sin(az) * s, 1 - s, -Math.cos(az) * s).normalize();
  camera.lookAt(x, y, z);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}
const _v = new THREE.Vector3();
export function project(x, y, z) {
  _v.set(x, y, z).project(camera);
  return [(_v.x + 1) * 0.5 * W, (1 - _v.y) * 0.5 * H];
}

// ------------------------------------------------------------------ matériaux
export function lineMat(color = PAL.line, width = 2.6, opacity = 1) {
  const k = `${color}|${width}|${opacity}`;
  if (LINE_MATS.has(k)) return LINE_MATS.get(k);
  const m = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  m.resolution.set(W, H);
  LINE_MATS.set(k, m);
  return m;
}
export function faceMat(color, o = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1.5, ...o });
}
export const THEMES = {
  white: { face: PAL.white, line: PAL.line },
  ink: { face: 0x1d1d1d, line: PAL.lineNight },
  mint: { face: PAL.mint, line: PAL.line },
  glass: { face: PAL.mint, line: PAL.line, glass: true },
  ghost: { face: null, line: PAL.mint },
};

// Volume (base posée en y = 0) : maillage + arêtes
export function block(w, h, d, theme = 'white', o = {}) {
  const th = THEMES[theme];
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  if (th.face !== null) {
    let mat = th.glass
      ? new THREE.MeshBasicMaterial({ color: o.face ?? th.face, transparent: true, opacity: o.opacity ?? 0.1, depthWrite: false })
      : faceMat(o.face ?? th.face);
    // Dessus séparé (pour l'allumer en menthe) : ordre des faces de BoxGeometry : +x, -x, +y, -y, +z, -z
    if (o.top !== undefined) {
      const top = faceMat(o.top);
      mat = [mat, mat, top, mat, mat, mat];
      g.userData.top = top;
    }
    const mesh = new THREE.Mesh(geo, mat);
    g.add(mesh);
    g.userData.mesh = mesh;
  }
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo));
  const lines = new LineSegments2(lg, lineMat(o.line ?? th.line, o.lw ?? 2.6, o.lineOpacity ?? 1));
  lines.computeLineDistances();
  g.add(lines);
  g.userData.lines = lines;
  g.userData.nseg = lg.instanceCount;
  return g;
}
// Arêtes d'une géométrie quelconque (angle de pli > seuil)
export function edges(geo, color = PAL.line, width = 2.4, threshold = 20) {
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, threshold));
  return new LineSegments2(lg, lineMat(color, width));
}
// Tracé progressif des arêtes (0..1)
export function drawEdges(g, u) {
  const L = g.userData.lines;
  L.geometry.instanceCount = Math.max(0, Math.round(g.userData.nseg * Math.min(1, Math.max(0, u))));
  L.visible = u > 0.001;
}
// Couleur des faces (pour un volume qui devient menthe)
export function setFace(g, color) {
  const m = g.userData.mesh && g.userData.mesh.material;
  if (!m) return;
  if (Array.isArray(m)) m[0].color.set(color); else m.color.set(color);
}

export function sphere(r, color = PAL.ink) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshLambertMaterial({ color }));
  m.geometry.translate(0, r, 0);
  return m;
}
export function cylinder(r, h, color, seg = 40) {
  const geo = new THREE.CylinderGeometry(r, r, h, seg);
  geo.translate(0, h / 2, 0);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, faceMat(color)));
  // contour du dessus (cercle) à l'encre
  const pts = [];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(Math.cos(a) * r, h, Math.sin(a) * r); }
  const segs = [];
  for (let i = 0; i < seg; i++) segs.push(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], pts[i * 3 + 3], pts[i * 3 + 4], pts[i * 3 + 5]);
  const lg = new LineSegmentsGeometry().setPositions(segs);
  g.add(new LineSegments2(lg, lineMat(PAL.line, 2.4)));
  return g;
}

// Ombre de contact : tache radiale très douce
let SHADOW_TEX;
export function shadow(w, d, opacity = 0.16) {
  if (!SHADOW_TEX) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    SHADOW_TEX = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  m.renderOrder = -1;
  return m;
}

// Panneau dessiné en 2D (texte, feuille, cadran) posé dans la scène
export function canvasPlane(w, h, px, draw) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * px); c.height = Math.round(h * px);
  const x = c.getContext('2d');
  draw(x, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData = { canvas: c, ctx: x, tex, draw };
  return m;
}
export function redraw(plane, ...args) {
  const { ctx, canvas, tex, draw } = plane.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx, canvas.width, canvas.height, ...args);
  tex.needsUpdate = true;
}

// Trait 3D (polyligne) en trait épais : renvoie l'objet et un setter de progression
export function polyline(points, color = PAL.mint, width = 6, o = {}) {
  const segs = [];
  for (let i = 1; i < points.length; i++) segs.push(...points[i - 1], ...points[i]);
  const lg = new LineSegmentsGeometry().setPositions(segs);
  const mat = o.dashed ? new LineMaterial({ color, linewidth: width, dashed: true, dashSize: o.dash ?? 6, gapSize: o.gap ?? 5 }) : lineMat(color, width, o.opacity ?? 1);
  if (o.dashed) mat.resolution.set(W, H);
  const l = new LineSegments2(lg, mat);
  l.computeLineDistances();
  l.userData.nseg = points.length - 1;
  return l;
}
export function drawLine(l, u) {
  l.geometry.instanceCount = Math.max(0, Math.round(l.userData.nseg * Math.min(1, Math.max(0, u))));
  l.visible = u > 0.001;
}
