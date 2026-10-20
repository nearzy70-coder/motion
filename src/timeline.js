// Spécifications et repères temporels du film « Le Fil ».
// 120 BPM : 1 temps = 0,5 s, 1 mesure = 2 s. Les temps forts structurent les scènes.

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 33;
export const BPM = 120;

export const T = {
  // Séquence 1 : accroche
  strike: 1.0, strikeEnd: 1.35, hookOut: 2.2,
  // Séquence 2 : problème
  problem: 3.0, chipStep: 0.25, tension: 6.0,
  // Séquence 3 : transformation (temps fort)
  drop: 8.0, brand: 8.55, sub: 9.9, brandOut: 10.85, list: 11.3,
  // Séquence 4 : démonstration
  step1: 12.0, collapse: 13.75, step2: 14.0, pick: 16.4, zoom: 16.85, step3: 17.0, extrude: 18.0,
  step4: 20.0, step5: 22.0,
  // Séquence 5 : valeur
  value: 24.0, free: 26.0, valueOut: 27.8,
  // Séquence 6 : conclusion
  end: 28.0, dot: 29.0, cta: 30.0,
};

// Système de mise en page (zones sûres réseaux sociaux : texte entre y=260 et y=1500, marge droite ≥ 96 px)
export const SPINE_X = 96;     // le fil vertical (frise)
export const CONTENT_X = 160;  // début du contenu à droite du fil
export const CONTENT_W = 824;  // jusqu'à x = 984
export const NODE_Y = [640, 820, 1000, 1180, 1360];
export const CARD_Y = 568;

export const C = {
  ink: '#111111',
  ink2: '#181C1A',
  mint: '#2ACAA5',
  mintLight: '#34E0B8',
  map: '#449280',
  white: '#FFFFFF',
};
