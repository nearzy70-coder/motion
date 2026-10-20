// Ouverture « pelote » (0 à 15,25 s), en 3D (Three.js).
// « Trouver des bureaux, c'est simple. » : un fil menthe, parfaitement droit, traverse l'image ; sur « Enfin… » il
// vibre comme une corde pincée. Sur « très vite, tout s'emmêle », le fil s'enroule en une vraie pelote qui grossit ;
// les critères sont des étiquettes accrochées à la pelote, qui tournent avec elle. Dans le silence avant le drop, on
// tire le bout du fil : la pelote se dévide d'un coup en tournant sur elle-même et redevient une ligne droite.
import * as THREE from 'three';
import { el, show, op } from '../lib/dom.js';
import { E, prog, lerp, rng } from '../lib/ease.js';
import { T, L, W, H, pick } from '../timeline.js';

const RB = pick(270, 235);           // rayon final de la pelote (px)
const TR = pick(5.2, 4.6);           // rayon du fil (px)
const TURNS = 110;
const HZ = 240;
const RADIAL = 7;

// Étiquettes accrochées à la pelote, dans l'ordre de la voix
const TAGS = [
  { text: 'Charges' }, { text: 'Nombre de postes' }, { text: 'Surface', spoken: true }, { text: 'Bureau opéré ?' },
  { text: 'Budget', spoken: true }, { text: 'Coworking ?' }, { text: 'Quartier', spoken: true }, { text: 'Travaux' },
  { text: 'Bail 3/6/9', spoken: true }, { text: 'Préavis' }, { text: 'Visites', spoken: true }, { text: 'Dossier' },
  { text: 'Délais', spoken: true },
];

let renderer, scene, camera, ball, ballGeo, ringCount, rOf, canvas, free, yarnMat, root, lines, paperLine, simpleSpan;
let heads, flies, tags, spin, y0, tW1, tUnravel0, tUnravel1;
const C0 = () => [W / 2, pick(900, 545)];

// Px écran (y vers le bas) → coordonnées de la scène (origine au centre, y vers le haut)
const V = (x, y, z = 0) => new THREE.Vector3(x - W / 2, H / 2 - y, z);

// Tube à partir d'une suite de points : repères par transport parallèle (pas de torsion parasite), UV le long du fil
function buildTube(pts, radius, radial, geo) {
  const n = pts.length;
  const pos = new Float32Array(n * radial * 3), nor = new Float32Array(n * radial * 3), uv = new Float32Array(n * radial * 2);
  let N = null;
  let len = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const Tg = new THREE.Vector3().subVectors(b, a).normalize();
    if (!N) {
      N = new THREE.Vector3(0, 0, 1).cross(Tg);
      if (N.lengthSq() < 1e-6) N = new THREE.Vector3(0, 1, 0).cross(Tg);
      N.normalize();
    } else {
      N.sub(Tg.clone().multiplyScalar(N.dot(Tg))).normalize();
    }
    const B = new THREE.Vector3().crossVectors(Tg, N);
    if (i > 0) len += p.distanceTo(pts[i - 1]);
    for (let j = 0; j < radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const cx = Math.cos(ang), cy = Math.sin(ang);
      const nx = N.x * cx + B.x * cy, ny = N.y * cx + B.y * cy, nz = N.z * cx + B.z * cy;
      const k = (i * radial + j) * 3;
      pos[k] = p.x + nx * radius; pos[k + 1] = p.y + ny * radius; pos[k + 2] = p.z + nz * radius;
      nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz;
      uv[(i * radial + j) * 2] = len / 22; uv[(i * radial + j) * 2 + 1] = j / radial;
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
    idx.push(a, c, b, b, c, d);
  }
  geo = geo || new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx.length > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  return geo;
}

// Texture de fil : deux brins torsadés (rayures obliques), fibres claires
function yarnTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#2ACAA5'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(20,110,88,0.38)'; g.lineWidth = 9;
  for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 64, 64); g.stroke(); }
  g.strokeStyle = 'rgba(205,255,240,0.45)'; g.lineWidth = 3;
  for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 32 + 14, 0); g.lineTo(k * 32 + 78, 64); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// La pelote : un seul fil, enroulé par bandes de tours presque parallèles. Le plan d'enroulement bascule à un
// point pris au hasard du tour (le fil reste continu) : petite bascule à chaque tour, grande tous les 3 à 5 tours,
// comme une pelote roulée à la main (pas de « pôles » où tous les brins se croisent)
function yarnCurve() {
  const R = rng(5);
  const pts = [];
  let u = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3(0, 1, 0);
  let phi = 0, next = Math.PI * 2 * (0.8 + R() * 0.5), turns = 0, band = 3 + Math.floor(R() * 3);
  const total = TURNS;
  while (turns < total) {
    const f = (turns + phi / (Math.PI * 2)) / total;
    const r = RB * (0.06 + 0.94 * Math.cbrt(Math.min(1, f))) + 2.2 * Math.sin(pts.length * 0.37);
    const dir = u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(v, Math.sin(phi));
    pts.push(dir.multiplyScalar(r));
    phi += Math.min(0.5, 8 / Math.max(6, r));
    if (phi >= next) {
      const nu = u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(v, Math.sin(phi)).normalize();
      const nv = u.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(v, Math.cos(phi)).normalize();
      u = nu; v = nv; phi = 0; turns++;
      band--;
      const tilt = band <= 0 ? 0.7 + R() * 0.8 : 0.07 + R() * 0.09;
      if (band <= 0) band = 3 + Math.floor(R() * 3);
      v.applyAxisAngle(u, tilt * (R() < 0.5 ? -1 : 1)).normalize();
      next = Math.PI * 2 * (0.8 + R() * 0.5);
    }
  }
  return pts;
}

// Rotation de la pelote : angle intégré à pas fixe (lente pendant l'enroulement, folle au dévidage)
function precomputeSpin() {
  const t0 = T.fall, t1 = T.blind + 0.1;
  const n = Math.ceil((t1 - t0) * HZ);
  const ang = new Float32Array(n + 1);
  let a = 0;
  for (let k = 0; k <= n; k++) {
    const t = t0 + k / HZ;
    ang[k] = a;
    const wind = 2.4 - 1.2 * prog(t, T.fall, tW1);
    const un = 34 * E.inOutCubic(prog(t, tUnravel0 - 0.05, tUnravel0 + 0.25)) * (1 - 0.6 * prog(t, tUnravel1 - 0.15, tUnravel1));
    a += (wind - un) / HZ;
  }
  return (t) => ang[Math.max(0, Math.min(n, Math.round((t - t0) * HZ)))];
}

export function build(ctx) {
  tW1 = 11.6;                       // la pelote a fini d'avaler le fil
  tUnravel0 = T.pull - 0.08;        // le bout est tiré : la pelote se dévide
  tUnravel1 = T.blind - 0.05;
  const R = rng(17);

  // --- Accroche (texte)
  const s = L.hookSize;
  root = el('div', { cls: 'abs', style: { left: L.mx + 'px', top: L.hookY + 'px' } }, ctx.layers.text);
  const mk = (html, size, extra = {}) => {
    const wrap = el('div', { cls: 'mask display', style: { fontSize: size + 'px', ...extra } }, root);
    return { wrap, inner: el('span', { html }, wrap) };
  };
  lines = [mk('Trouver', s), mk('des bureaux,', s), mk('c’est <span class="simple" style="display:inline-block">simple.</span>', s)];
  paperLine = mk('Sur le papier.', Math.round(s * 0.64), { color: 'var(--mint)', fontWeight: '300', letterSpacing: '-0.03em', marginTop: pick('84px', '58px') });
  simpleSpan = root.querySelector('.simple');
  const r3 = ctx.measure(lines[2].wrap);
  y0 = r3.y + r3.h + pick(10, 6);   // le fil passe juste sous « c'est simple. »

  // --- Scène 3D
  canvas = el('canvas', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' } }, ctx.layers.gl);
  canvas.width = W; canvas.height = H;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -4000, 4000);
  camera.position.set(0, 0, 2000);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4f8a7c, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-500, 700, 900);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 100, far: 4000 });
  key.shadow.bias = -0.0008;
  key.shadow.radius = 3;
  scene.add(key);
  scene.add(key.target);
  const rim = new THREE.DirectionalLight(0xbff6e6, 0.7);
  rim.position.set(600, -200, -400);
  scene.add(rim);

  yarnMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: yarnTexture(), roughness: 0.82, metalness: 0 });
  const curve = yarnCurve();
  ringCount = curve.length;
  ballGeo = buildTube(curve, TR, RADIAL);
  ball = new THREE.Mesh(ballGeo, yarnMat);
  ball.castShadow = true; ball.receiveShadow = true;
  scene.add(ball);
  // Rayon extérieur atteint après une fraction w du fil enroulé
  rOf = (w) => RB * (0.06 + 0.94 * Math.cbrt(Math.max(0, w)));
  // Fils libres (gauche et droit), reconstruits à chaque image
  free = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), yarnMat);
    m.castShadow = true;
    scene.add(m);
    return m;
  });
  spin = precomputeSpin();

  // --- Étiquettes
  tags = TAGS.map((d, k) => {
    const e = el('div', { cls: 'tag', text: d.text }, ctx.layers.tags);
    e.style.fontSize = (d.spoken ? pick(52, 44) : pick(34, 29)) + 'px';
    e.style.height = (d.spoken ? pick(92, 80) : pick(66, 58)) + 'px';
    e.style.transformOrigin = '28px 50%';
    const t = T.drops[k];
    // Direction monde où l'étiquette apparaît (face caméra, réparties autour du centre)
    const ang = -0.6 + k * 2.39996;
    const dir = new THREE.Vector3(Math.cos(ang) * 0.78, Math.sin(ang) * 0.62, 0.5).normalize();
    return { e, t, spoken: !!d.spoken, dir, vx: (R() - 0.5) * 900, rot: (R() - 0.5) * 16, h: e.offsetHeight };
  });

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

  ctx.shared.cues = {
    ...(ctx.shared.cues || {}),
    drops: tags.map((g, k) => ({ t: g.t, text: TAGS[k].text, spoken: g.spoken })),
    wind: [T.fall, tW1],
    unravel: [tUnravel0, tUnravel1],
  };
}

// Fraction de fil enroulée
function wound(t) {
  if (t < T.fall) return 0;
  if (t < tUnravel0) return E.outCubic(prog(t, T.fall, tW1)) ** 0.85;
  return 1 - E.inOutCubic(prog(t, tUnravel0, tUnravel1));
}

function ballCenter(t) {
  const [cx, cy] = C0();
  const up = E.inOutCubic(prog(t, T.fall, T.fall + 0.9));
  const down = E.inOutCubic(prog(t, tUnravel0, tUnravel1));
  return [cx, lerp(lerp(y0, cy, up), L.pullY, down)];
}

function ballRotation(t) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.22, 1, 0.12).normalize(), spin(t));
  return q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35));
}

// Fil libre entre deux points (en px), avec une vibration optionnelle (corde pincée)
function setFree(m, a, b, vib = 0, depth = 0) {
  const pts = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) + vib * Math.sin(Math.PI * u);
    pts.push(V(x, y, lerp(a[2] || 0, b[2] || 0, u) + depth));
  }
  m.geometry.dispose();
  m.geometry = buildTube(pts, TR, RADIAL);
  m.visible = true;
}

export function update(t, ctx) {
  const on = t < T.blind;
  show(canvas, on);
  // --- Texte de l'accroche
  const hookOn = t < T.fall + 0.6;
  show(root, hookOn);
  const twang = t > T.strike ? 26 * Math.exp(-(t - T.strike) / 0.32) * Math.sin(2 * Math.PI * 7.5 * (t - T.strike)) : 0;
  if (hookOn) {
    const ins = [T.l1, T.l1 + 0.45, T.l2];
    lines.forEach((ln, i) => {
      const p = E.enter(prog(t, ins[i], ins[i] + 0.8)), q = E.exit(prog(t, T.fall + i * 0.05, T.fall + 0.35 + i * 0.05));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q * 135).toFixed(2)}%,0)`;
      ln.wrap.style.visibility = t < ins[i] ? 'hidden' : '';
    });
    // « simple. » est posé sur le fil : il vibre avec lui
    simpleSpan.style.transform = `translateY(${(twang * 0.55).toFixed(2)}px)`;
    const pp = E.enter(prog(t, T.paper, T.paper + 0.7)), pq = E.exit(prog(t, T.fall + 0.1, T.fall + 0.45));
    paperLine.inner.style.transform = `translate3d(0,${((1 - pp) * 135 - pq * 135).toFixed(2)}%,0)`;
    paperLine.wrap.style.visibility = t < T.paper ? 'hidden' : '';
  }

  if (!on) { tags.forEach((g) => show(g.e, false)); return; }

  // --- Pelote
  const w = wound(t);
  const [cx, cy] = ballCenter(t);
  const q = ballRotation(t);
  const segs = Math.floor(w * (ringCount - 1));
  ball.visible = segs > 1;
  ball.geometry.setDrawRange(0, segs * RADIAL * 6);
  ball.position.copy(V(cx, cy));
  ball.quaternion.copy(q);
  const r = rOf(w);

  // --- Fils libres : le fil droit de l'accroche, puis les deux bouts qui entrent dans la pelote
  const left = [-80, t < T.fall ? y0 : lerp(lerp(y0, cy + r * 0.2, prog(t, T.fall, T.fall + 0.9)), L.pullY, E.inOutCubic(prog(t, tUnravel0, tUnravel1)))];
  if (t < T.fall) {
    // Le fil entre par la gauche avec « Trouver des bureaux », droit comme un i ; il vibre sur « Enfin… »
    const xr = lerp(-80, W + 80, E.inOutCubic(prog(t, 0.05, 1.5)));
    if (xr > -70) setFree(free[0], left, [xr, y0], twang); else free[0].visible = false;
    free[1].visible = false;
  } else {
    // Bout gauche : du bord jusqu'au flanc gauche de la pelote (avalé lui aussi, puis ressorti au dévidage)
    const eatL = E.inOutCubic(prog(t, T.fall + 0.3, tW1 - 0.8)) * (1 - E.outCubic(prog(t, tUnravel0, tUnravel0 + 0.2)));
    const lx = lerp(-80, cx - r * 0.9, eatL);
    if (cx - r * 0.85 - lx > 4) setFree(free[0], [lx, left[1]], [cx - r * 0.85, cy + r * 0.12, 0]); else free[0].visible = false;
    // Bout droit : la pelote l'avale ; au silence, on l'attrape et on le tire vers la droite
    const eatR = E.inOutCubic(prog(t, T.fall, tW1));
    const grab = E.inOutCubic(prog(t, T.thread, T.thread + 0.35));
    const yR = lerp(cy - r * 0.05, L.pullY, grab);
    const rx = lerp(lerp(W + 80, cx + r * 0.9, eatR), W + 80, grab);
    if (rx - (cx + r * 0.85) > 4) setFree(free[1], [cx + r * 0.85, cy - r * 0.1, 0], [rx, yR]); else free[1].visible = false;
  }
  renderer.render(scene, camera);

  // --- Étiquettes : accrochées à la surface, elles tournent avec la pelote et disparaissent derrière
  const rest = new THREE.Vector3();
  tags.forEach((g, k) => {
    const vis = t >= g.t - 0.03;
    show(g.e, vis);
    if (!vis) return;
    if (!g.local) {
      // Direction locale telle que l'étiquette soit face caméra au moment où la voix dit le mot
      g.local = g.dir.clone().applyQuaternion(ballRotation(g.t).invert());
    }
    rest.copy(g.local).applyQuaternion(q);
    const det = tUnravel0 + 0.03 * k;
    const R2 = r + TR * 1.5;
    let x = cx + rest.x * R2, y = cy - rest.y * R2;
    let alpha = Math.min(1, prog(t, g.t - 0.03, g.t + 0.08)) * prog(rest.z, -0.05, 0.25);
    let rot = g.rot + rest.x * 12;
    let sc = (g.spoken ? 1 : 0.92) * lerp(0.55, 1, E.soft(prog(t, g.t - 0.03, g.t + 0.3)));
    if (t > det) {
      // Au dévidage, les étiquettes sont projetées et tombent
      const u = t - det;
      const d0 = g.d0 || (g.d0 = [x - cx, y - cy]);
      const L0 = Math.hypot(d0[0], d0[1]) || 1;
      x = cx + d0[0] + (d0[0] / L0) * 900 * u + g.vx * 0.3 * u;
      y = cy + d0[1] + (d0[1] / L0) * 700 * u + 0.5 * 3400 * u * u;
      rot += g.vx * 0.4 * u;
      alpha = Math.max(0, 1 - u / 0.35);
    } else {
      g.d0 = null;
    }
    g.e.style.transform = `translate3d(${(x - 28).toFixed(2)}px,${(y - g.h / 2).toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    op(g.e, alpha);
  });

  // --- Titres
  const hOn = t >= T.tangle - 0.1 && t < T.pull + 0.3;
  show(heads.root, hOn);
  if (hOn) {
    heads.forEach((ln, i) => {
      const t0 = i ? T.tangle2 : T.tangle;
      const p = E.enter(prog(t, t0, t0 + 0.7)), q2 = E.exit(prog(t, T.timeFlies - 0.35 + i * 0.05, T.timeFlies - 0.02 + i * 0.05));
      ln.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q2 * 135).toFixed(2)}%,0)`;
    });
    const p = E.enter(prog(t, T.timeFlies + 0.05, T.timeFlies + 0.75)), q2 = E.exit(prog(t, T.pull - 0.05, T.pull + 0.25));
    flies.inner.style.transform = `translate3d(0,${((1 - p) * 135 - q2 * 135).toFixed(2)}%,0)`;
    const f = E.enter(prog(t, T.file, T.file + 0.55));
    flies.fl.style.transform = `translate3d(0,${((1 - f) * 135).toFixed(2)}%,0)`;
  }
}
