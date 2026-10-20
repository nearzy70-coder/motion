// « Le Fil » v3 : film calé sur la voix off ElevenLabs (audio/vo/voix-off-elevenlabs.mp3, 62,7 s).
// Chaque repère visuel suit un mot ou une phrase de la voix ; la musique (120 BPM) est calée
// sur le « drop » de « Desk to Desk tire le fil » (T.blind = 15,25 s). Les arrivées de caméra, étiquettes
// et villes sont posées sur la grille des doubles croches (0,125 s), à moins de 0,06 s du mot.

export const FPS = 30;
export const DURATION = 68;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

// Placement de la voix : chaque tranche [de, à] de l'enregistrement (coupée au milieu d'une pause)
// est posée à l'instant `de + décalage` du film. Les décalages croissants ouvrent de courtes respirations
// là où l'image a besoin de temps (le drop, les panoramiques, le tampon, la fin).
export const VO = [
  { from: 0.0, to: 4.43, off: 0.2 },     // Trouver des bureaux… c'est simple. Enfin… sur le papier.
  { from: 4.43, to: 14.41, off: 0.15 },  // Parce que très vite… le temps file.
  { from: 14.41, to: 21.54, off: 0.7 },  // Desk to Desk tire le fil… jusqu'à la remise des clés.
  { from: 21.54, to: 22.42, off: 0.58 }, // Coworking ?
  { from: 22.42, to: 23.31, off: 1.0 },  // Bureau opéré ?
  { from: 23.31, to: 25.72, off: 1.14 }, // Bail commercial ? On vous aide à choisir.
  { from: 25.72, to: 34.7, off: 1.3 },   // Étapes 1 à 3
  { from: 34.7, to: 38.78, off: 1.8 },   // Étape 4 : on négocie… loyer, charges, travaux, durée.
  { from: 38.78, to: 47.11, off: 2.35 }, // Étape 5, renégociation, location ponctuelle
  { from: 47.11, to: 52.08, off: 2.6 },  // Les villes
  { from: 52.08, to: 55.72, off: 2.85 }, // Et pour vous, c'est gratuit…
  { from: 55.72, to: 62.67, off: 3.2 },  // Vous développez votre entreprise… desk to desk point com.
];

export const T = {
  // 1. Accroche (voix : « Trouver » 0,25 s ; « c'est simple » 1,52 s ; « Enfin… » 2,64 s ; « sur le papier » 3,6 s)
  l1: -0.25, l2: 1.3, strike: 2.75, paper: 3.5,
  // 2. La pile (« Parce que très vite » 4,83 s : la phrase s'effondre ; « La surface » 6,91 ; « Le budget » 7,85 ;
  // « Le quartier » 8,8 ; « Le bail » 9,77 ; « Les visites » 10,61 ; « Et pendant ce temps » 12,31 ; « file » 14,1)
  fall: 4.8, tangle: 4.8, tangle2: 5.55,
  drops: [5.875, 6.375, 7.0, 7.375, 7.75, 8.25, 8.75, 9.25, 9.75, 10.125, 10.5, 11.0, 13.625],
  timeFlies: 12.25, file: 13.95,
  thread: 14.25, // l'aiguille traverse la pile, dans le silence qui suit « le temps file »
  // 3. On tire le fil (« Desk to Desk » 15,4 s ; « tire le fil » 16,4 ; « Un conseiller dédié » 17,37 ;
  // « Un seul interlocuteur » 18,65 ; « Du brief… » 20,17)
  pull: 14.75, blind: 15.25, brand: [15.42, 15.72, 15.86], brand2: [16.36, 16.52, 16.72],
  sub1: 17.3, sub2: 18.58, sub3: 20.1,
  // 4. Formats (« Coworking ? » 22,33 ; « Bureau opéré ? » 23,5 ; « Bail commercial ? » 24,55 ; « On vous aide à choisir » 25,63)
  line: 22.25, fmt2: 23.5, fmt3: 24.5, choose: 25.625,
  // 5. Parcours (« D'abord » 27,18 ; « Puis » 30,01 ; « On organise les visites » 33,69 ; « On négocie » 36,67 ;
  // « Et on vous accompagne » 41,29)
  s1: 27.125, s2: 30.0, s3: 33.625, s4: 36.625, s5: 41.25,
  // Clauses dites dans l'étape 4 : loyer 38,26 ; charges 38,85 ; travaux 39,51 ; durée 40,05
  clauses: [38.25, 38.75, 39.5, 40.0], stamp: 40.25,
  // 6. Autres services (« Déjà installés ? » 44,71 ; « Une salle pour une journée ? » 47,22)
  reneg: 44.625, day: 47.125,
  // 7. Couverture (« À Paris » 49,86, « Lyon » 50,5, « Lille » 50,98, « Bordeaux » 51,3,
  // « et jusqu'à » 52,07, « Bruxelles » 52,55, « Barcelone » 53,15, « Luxembourg » 53,95)
  map: 49.75, europe: 52.0,
  cities: { Paris: 50.0, Lyon: 50.5, Lille: 51.0, Bordeaux: 51.25, Bruxelles: 52.5, Barcelone: 53.125, Luxembourg: 53.875 },
  // 8. Gratuité (« Et pour vous » 55,09 ; « gratuit » 55,94)
  free: 54.75, free1: 55.0, free2: 55.6, free3: 55.85,
  // 9. Conclusion (« Vous développez » 59,22 ; « votre entreprise » 59,9 ; « Desk to Desk » 61,08 ;
  // « s'occupe du reste » 61,6 ; « Parlez à un conseiller » 63,16 ; « desk to desk point com » 64,27)
  end: 58.75, vous1: 59.12, vous2: 59.82, vousOut: 60.7,
  write: 61.05, line2: 61.62, dot: 62.55, cta: 63.05, url: 64.3,
};

// Mises en page : 9:16 (principal) et 1:1. Les valeurs « k » sont des facteurs d'échelle
// appliqués aux objets dessinés à taille de référence (feuilles 800 × 980).
export const FORMATS = {
  '916': {
    id: '916', W: 1080, H: 1920, mx: 96,
    safeTop: 250, safeBot: 1530,
    hookSize: 150, hookY: 640,
    headY: 262, headSize: 76, numSize: 196,
    lineY: 548, sheetK: 1.0, spacing: 900,
    bigSize: 150, subSize: 44,
    pullY: 1700,
  },
  '11': {
    id: '11', W: 1080, H: 1080, mx: 80,
    safeTop: 60, safeBot: 1030,
    hookSize: 118, hookY: 250,
    headY: 58, headSize: 54, numSize: 140,
    lineY: 262, sheetK: 0.76, spacing: 700,
    bigSize: 118, subSize: 36,
    pullY: 930,
  },
};

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const L = FORMATS[params.get('f') || '916'] || FORMATS['916'];
// Ouverture (0 à 15,25 s) : pile de mots (v4), pelote de fil en 3D, ou tableau d'enquête
export const OPENING = ['pile', 'pelote', 'enquete'].includes(params.get('o')) ? params.get('o') : 'pile';
export const W = L.W;
export const H = L.H;
export const is916 = L.id === '916';
export const pick = (a, b) => (is916 ? a : b);

export const C = {
  ink: '#111111',
  mint: '#2ACAA5',
  mintLight: '#34E0B8',
  mintDark: '#1C9E80',
  map: '#449280',
  paper: '#FAFAF6',
  wood: '#D8B98E',
};
