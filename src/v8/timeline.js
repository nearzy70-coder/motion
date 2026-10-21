// Film v8 « Le Plan » : calé sur la nouvelle voix off ElevenLabs (audio/vo/voix-off-v8-elevenlabs.mp3, 73,6 s).
// La voix est posée d'un seul bloc à 0,5 s ; chaque repère suit un mot (repérage : transcription locale par
// phrases, puis noyaux syllabiques). La musique (120 BPM) tombe sur « Desk to Desk » (T.drop = 43,35 s).

export const FPS = 30;
export const DURATION = 76.5;
export const BPM = 120;
export const BEAT = 60 / BPM;

export const VO = [{ from: 0, to: 73.64, off: 0.5 }];

export const T = {
  // 1. L'entreprise grandit (« Imaginez » 0,5 ; « grandir » 2,6 ; « équipes » 4,6 ; « projets » 6,1)
  imag: 0.5, grow: 1.75, grandir: 2.6, teams: 4.45, teamPops: [4.61, 4.94, 5.12, 5.28], projects: 5.93, projPops: [6.08, 6.35, 6.59, 6.77, 6.95],
  // 2. Le besoin (« Et puis un jour » 7,9 ; « jour » 8,84 ; « vous avez besoin » 9,7 ; « nouveaux bureaux » 10,5)
  oneDay: 7.9, jour: 8.84, need: 9.6, newOffices: 10.55,
  // 3. La recherche (« Et là, ça commence » 11,69 ; chercher 13,47 ; comparer 14,97 ; visites 16,03 ; conditions 17,52 ;
  // négocier 19,04 ; encore 20,01 ; et encore 20,8)
  starts: 11.6, search: 13.42, compare: 14.95, visits: 16.03, terms: 17.52, nego: 19.04, encore1: 20.01, encore2: 20.8,
  // « Et pendant ce temps… » 21,95 ; « vous pourriez… avancer votre entreprise » 23,92
  meanwhile: 21.95, could: 23.92, avancer: 25.06,
  // 4. Pas seulement quatre murs (« Parce que trouver » 26,8 ; « ce n'est pas simplement » 28,5 ; « quatre murs » 29,45 ;
  // « quelques bureaux » 30,05)
  because: 26.79, notJust: 28.5, walls: 29.45, desks: 30.05,
  // Le bon endroit 31,37 ; les bonnes conditions 32,96 ; la bonne configuration 34,3 ; au bon moment 35,9
  place: 31.37, cond: 32.96, config: 34.3, moment: 35.9,
  // « Et quand tout cela repose sur vous » 36,92 ; « vous » 38,45 ; « ça devient vite compliqué » 38,88 ; silence 40,32 → 41,71
  onYou: 36.92, vous: 38.45, complex: 38.88, hush: 40.32,
  // 5. Desk to Desk (« C'est précisément pour ça que » 41,71 ; « Desk to Desk » 43,35 ; « existe » 44,2)
  exists: 41.71, drop: 43.35, existe: 44.2,
  // 6. On s'occupe de tout (45,01) : recherche 46,4 ; visites 47,3 ; négociation 48,25 ; signature 49,6
  all: 45.01, stations: [46.4, 47.3, 48.25, 49.6],
  // 7. Avec vous (« besoins » 50,69 ; « nous trouvons » 52,24 ; « correspondent » 53,5 ; « réellement » 54,2 ;
  // sélectionnons 55,6 ; comparons 56,75 ; négocions 57,8 ; « et nous vous accompagnons jusqu'au bout » 58,72 ; « bout » 60,3)
  needs: 50.69, find: 52.24, match: 53.5, really: 54.2, select: 55.6, compare2: 56.75, nego2: 57.8, along: 58.72, bout: 60.3,
  // 8. Votre temps (« Simple » 60,79 ; « efficace » 61,5 ; « sans perdre votre temps » 62,4 ; « parce que votre temps » 63,76 ;
  // « consacrer à votre entreprise » 64,94 ; « pas à chercher des bureaux » 67,37)
  simple: 60.79, efficient: 61.5, noWaste: 62.38, yourTime: 63.76, devote: 64.94, notSearch: 67.37,
  // 9. Signature (« Vous développez votre entreprise » 69,8 ; « Desk to Desk » 71,8 ; « s'occupe du reste » 72,7)
  end: 69.3, vous1: 69.8, sig: 71.75, rest: 72.7, dot: 73.2, cta: 73.75, url: 74.35,
};

// Mise en page carrée 1:1 (livrable) ; le 9:16 n'est pas prévu pour ce film.
export const L = { id: '11', W: 1080, H: 1080, mx: 80, headY: 64, headSize: 64, bigSize: 128 };
export const W = L.W;
export const H = L.H;

export const C = {
  ink: '#111111',
  mint: '#2ACAA5',
  mintDark: '#1C9E80',
  paper: '#FAFAF7',
  grid: '#DADAD2',
  soft: '#9B9C96',
  line: '#C9CAC3',
};
