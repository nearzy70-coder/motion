// Matières : grain argentique (animé, déterministe) et texture papier.
import { rng } from './ease.js';

// Grain : 6 tuiles de bruit précalculées, choisies et décalées selon l'image (24 i/s, cadence « film »)
export function makeGrain(canvas, W, H, strength = 0.07) {
  const g = canvas.getContext('2d');
  const R = rng(99);
  const tiles = [];
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const cg = c.getContext('2d');
    const im = cg.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      // Somme de 3 tirages : distribution en cloche, grain plus naturel
      const v = (R() + R() + R()) / 3;
      const l = Math.round(v * 255);
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = l;
      im.data[i * 4 + 3] = 255;
    }
    cg.putImageData(im, 0, 0);
    tiles.push(c);
  }
  return {
    update(t) {
      const f = Math.floor(t * 24);
      const r = rng(1000 + f);
      const tile = tiles[f % tiles.length];
      const ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
      g.clearRect(0, 0, W, H);
      g.globalAlpha = strength;
      for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(tile, x, y);
      g.globalAlpha = 1;
    },
  };
}

// Papier : fond chaud très léger, fibres et micro-relief
export function paperTexture(base = [250, 250, 246]) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const R = rng(7);
  const im = g.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) {
    const n = (R() + R() - 1) * 5;
    im.data[i * 4] = base[0] + n; im.data[i * 4 + 1] = base[1] + n; im.data[i * 4 + 2] = base[2] + n - 1;
    im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  g.globalAlpha = 0.06;
  g.strokeStyle = '#8a8a80';
  g.lineWidth = 0.6;
  for (let k = 0; k < 220; k++) {
    const x = R() * 512, y = R() * 512, a = R() * Math.PI, l = 6 + R() * 22;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (R() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c.toDataURL('image/png');
}

// Encre de tampon : masque irrégulier (zones moins encrées)
export function inkMask(w = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const R = rng(31);
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const im = g.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const v = R();
    const a = v < 0.12 ? 0 : v < 0.2 ? 120 : 255;
    im.data[i * 4 + 3] = a;
  }
  g.putImageData(im, 0, 0);
  // Taches plus larges
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 40; k++) {
    g.beginPath();
    g.ellipse(R() * w, R() * h, 4 + R() * 14, 2 + R() * 6, R() * 3, 0, Math.PI * 2);
    g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.5})`;
    g.fill();
  }
  return c.toDataURL('image/png');
}
