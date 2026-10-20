// Plan d'un plateau de bureaux ILLUSTRATIF (12 m × 20 m), partagé entre la vignette 2D,
// le plan dessiné par le fil et la maquette 3D. x ∈ [-6, 6], z ∈ [-10, 10] (z+ = entrée, en bas de l'écran).

export const WALLS = [
  // Périmètre (entrée au centre du mur bas)
  { a: [1.3, 10], b: [6, 10] },
  { a: [6, 10], b: [6, -10] },
  { a: [6, -10], b: [-6, -10] },
  { a: [-6, -10], b: [-6, 10] },
  { a: [-6, 10], b: [-1.3, 10] },
  // Salle de réunion vitrée (haut gauche)
  { a: [-6, -5], b: [-1.9, -5], glass: true },
  { a: [-0.7, -5], b: [0.6, -5], glass: true },
  { a: [0.6, -5], b: [0.6, -10], glass: true },
  // Cabines (haut droite)
  { a: [3.2, -10], b: [3.2, -6.4], glass: true },
  { a: [3.2, -8.2], b: [6, -8.2] },
  { a: [3.2, -6.4], b: [6, -6.4] },
  // Coin cuisine (bas gauche)
  { a: [-6, 4], b: [-3.4, 4] },
];

// Mobilier : boîtes [cx, cz, sx, sz, h] ou cylindres { r }
export const FURNITURE = [];
for (const cx of [-2.5, 2.5]) {
  for (const z of [-3.0, -1.5, 0.0]) {
    FURNITURE.push({ kind: 'desk', c: [cx - 0.41, z], s: [0.8, 1.4], h: 0.74 });
    FURNITURE.push({ kind: 'desk', c: [cx + 0.41, z], s: [0.8, 1.4], h: 0.74 });
    FURNITURE.push({ kind: 'chair', c: [cx - 1.08, z], r: 0.27, h: 0.5 });
    FURNITURE.push({ kind: 'chair', c: [cx + 1.08, z], r: 0.27, h: 0.5 });
  }
}
FURNITURE.push({ kind: 'table', c: [-2.7, -7.5], s: [1.4, 3.4], h: 0.74 });
for (const z of [-8.6, -7.5, -6.4]) {
  FURNITURE.push({ kind: 'chair', c: [-3.75, z], r: 0.27, h: 0.5 });
  FURNITURE.push({ kind: 'chair', c: [-1.65, z], r: 0.27, h: 0.5 });
}
FURNITURE.push({ kind: 'counter', c: [-5.5, 7.0], s: [0.9, 5.0], h: 0.95 });
FURNITURE.push({ kind: 'round', c: [-3.8, 7.3], r: 0.65, h: 0.74 });
FURNITURE.push({ kind: 'chair', c: [-3.8, 8.35], r: 0.24, h: 0.5 });
FURNITURE.push({ kind: 'chair', c: [-2.85, 7.0], r: 0.24, h: 0.5 });
FURNITURE.push({ kind: 'sofa', c: [4.5, 8.55], s: [2.4, 0.9], h: 0.45 });
FURNITURE.push({ kind: 'sofa', c: [4.5, 9.1], s: [2.4, 0.3], h: 0.85 });
FURNITURE.push({ kind: 'sofa', c: [2.6, 6.9], s: [0.85, 0.85], h: 0.45 });
FURNITURE.push({ kind: 'low', c: [4.5, 7.1], s: [1.3, 0.7], h: 0.38 });
FURNITURE.push({ kind: 'desk', c: [5.35, -9.1], s: [0.9, 1.2], h: 0.74 });
FURNITURE.push({ kind: 'desk', c: [5.35, -7.3], s: [0.9, 1.2], h: 0.74 });
for (const c of [[5.35, 2.6], [-5.35, -4.3], [5.35, -5.6], [2.1, 9.3], [-5.35, 2.6]]) {
  FURNITURE.push({ kind: 'plant', c, r: 0.3, h: 0.45 });
}

// Zone « open space » (12 postes) mise en valeur
export const ZONE = { c: [0, -1.5], s: [7.6, 5.0] };

// Parcours de visite (dessiné par le fil dans la maquette)
export const VISIT = [[0, 11.4], [0, 9.0], [0.15, 6.0], [0, 2.4], [0, -2.0], [-0.25, -3.9], [-1.3, -4.6], [-1.3, -5.6], [-1.6, -6.3]];

// Vignette de la fiche d'offre sélectionnée (coordonnées écran)
export const THUMB = { x: 180, y: 1130, w: 76, h: 76 };
