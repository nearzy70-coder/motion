# « Le Fil » v3 : film calé sur la voix off, 68 s

Retours client sur la v2 :
- le fond noir paraissait pixelisé (grain) ;
- la musique de fond ne plaisait pas ;
- le film manquait de dynamisme ;
- une voix off ElevenLabs était à intégrer, générée par le client à partir de `voix-off.md`.

## Ce qui change

| Retour | Réponse en v3 |
|--------|---------------|
| Fond noir pixelisé | Plus aucun grain : encre unie `#111111`. Encodage H.264 CRF 12, `tune animation`, `aq-mode 3` (plus de bits dans les zones sombres) : aplats nets, sans blocs ni bandes |
| Musique | Nouvelle musique originale, moderne et rythmée (voir ci-dessous) |
| Pas assez dynamique | Panoramiques de 0,55 s au lieu de 0,72 s, avec une courbe plus franche et un flou de mouvement à 12 sous-images. Le texte et les objets arrivent avec les mots de la voix. Impulsions de caméra sur le drop, le tampon et le point final. Coupes et arrivées posées sur la grille rythmique |
| Voix off | Voix ElevenLabs intégrée et mixée au-dessus de la musique ; le film est recalé phrase par phrase (`voix-off.md`) |

## Spécifications

- 68,0 s, 30 i/s, 1080 × 1080 (1:1). Le code garde la mise en page 9:16, non rendue.
- Musique à 120 BPM, en fa majeur / ré mineur. La grille est calée sur le drop (15,25 s).
- Les arrivées de caméra, les étiquettes et les villes sont posées sur la grille des doubles croches (0,125 s), à moins de 0,06 s du mot dit.
- Le son est livré à -14 LUFS et -1 dBTP. La voix reste 11 à 12 dB au-dessus de la musique pendant la parole.

## Déroulé

| Temps | Séquence | Musique |
|-------|----------|---------|
| 0 – 4,4 s | Accroche : « Trouver des bureaux, c'est simple. » Un trait de feutre barre « simple », puis « Sur le papier. » (v4) | Accords de piano électrique sautillants. Sur « Enfin… », l'harmonie tourne au mineur et tout s'arrête |
| 4,8 – 14,3 s | La pile (v4) : la phrase s'effondre, 13 critères tombent et s'empilent, les 5 critères cités tombent avec leur mot. « Et le temps file. » | Le groove se construit (ré mineur). Une note de pluck par étiquette, de plus en plus aiguë. Le temps devient un tic-tac de claves, puis un roulement de caisse claire |
| 14,3 – 15,25 s | L'aiguille coud la pile, le fil est tiré, les mots s'y alignent (v4) | Silence, frottement de guiro (la corde se tend), accord inversé qui aspire vers le drop |
| 15,25 – 22 s | **Drop** : store menthe, « Desk to Desk tire le fil. », sous-titres | Groove complet (grosse caisse, claps, charleston, basse, piano électrique), cymbale et infra-grave |
| 22,25 – 49,3 s | Corde à linge : 3 formats, 5 étapes, 2 services | Le groove continue. Le motif de pluck ne joue que dans les silences de la voix. Bruitages réels : clac de pince à linge à chaque arrivée, punaises, maquette, tampon (la batterie se tait un temps avant le coup), clés |
| 49,75 – 54,5 s | Carte : un fil part de Paris vers chaque ville nommée | Une note de glockenspiel par ville |
| 54,75 – 58,3 s | Store menthe : « Pour le locataire, c'est gratuit.* » | La batterie s'efface, accords de piano droit, arpège qui monte avec le store |
| 58,75 – 68 s | « Vous développez votre entreprise. » La signature s'écrit, puis le bouton et l'adresse | Montée en do suspendu, résolution en fa majeur sur la signature (61,05 s), groove final, dernier accord qui résonne |

## Mentions

La mention de la commission est affichée de 55,65 s (store « gratuit ») jusqu'à la fin :
« \*Commission payée par le propriétaire. Certaines offres, en général en bail commercial, peuvent faire exception. »

## v4 : nouvelle ouverture (retour client)

Retour sur la v3 : le début (la corde qui passe sous « simple », le barre puis serpente entre les étiquettes) était
« bien, mais pas top top ». Proposition v4, de 0 à 15,25 s. Le reste du film est inchangé.

1. **Typographie physique.**
   - « Trouver des bureaux, c'est simple. » arrive mot à mot ; un trait de feutre menthe, tracé à la main, barre « simple ».
   - Sur « Parce que très vite », la phrase s'effondre : chaque mot devient un corps rigide (planck.js, moteur Box2D, simulation précalculée à 240 Hz, donc rendu déterministe).
2. **La pile.**
   - Les critères tombent un à un, au moment où la voix les dit : « Surface », « Budget », « Quartier », « Bail 3/6/9 », « Visites », puis « Délais » sur « le temps file ».
   - Les mots dits sont grands, blancs et tombent presque à plat ; les autres sont plus petits, gris ou menthe.
   - Chaque atterrissage franc donne un coup sourd au son et une brève secousse de caméra.
3. **Le fil devient la solution, plus le problème.**
   - Dans le silence avant le drop, une aiguille et son fil menthe cousent la pile rang par rang, en sortant de l'image à chaque demi-tour.
   - Le fil est tiré : les mots glissent dessus et s'alignent proprement, puis la ligne remonte comme un store et révèle l'aplat menthe (« Desk to Desk tire le fil »).

Pourquoi : dans la v3, le fil était à la fois le désordre et la solution. Ici, le désordre est fait des mots du
problème, que l'on lit en grand, et le fil n'apparaît que pour remettre de l'ordre.

## v5 : deux autres ouvertures, au choix (retour client : « fais les deux »)

Le film est identique à partir du drop (15,25 s). Chaque ouverture se choisit au rendu : `--o pelote` ou `--o enquete`.
La v4 (pile de mots) reste l'ouverture par défaut.

### A. La pelote (`src/scenes/pelote.js`, Three.js)

| Temps | Image | Son |
|-------|-------|-----|
| 0 – 2,6 s | « Trouver des bureaux, c'est simple. » ; un fil menthe en 3D (deux brins torsadés) traverse l'image, parfaitement droit | Piano électrique |
| 2,75 s | « Enfin… » : le fil vibre comme une corde pincée, « simple. » tremble avec lui | Corde grave pincée, arrêt de la musique |
| 4,8 – 11,6 s | Le fil s'enroule en une vraie pelote qui grossit. Elle est roulée à la main : bandes de tours qui changent de direction. Elle avale le fil par les deux bouts | Frottement continu (shaker), groove |
| 5,9 – 13,6 s | Les critères sont des étiquettes accrochées à la pelote. Chacune arrive face caméra quand la voix la dit, puis tourne avec la pelote et passe derrière | Une note de pluck par étiquette |
| 14,25 s | Le bout du fil ressort et part vers la droite | Silence |
| 14,65 – 15,2 s | La pelote se dévide d'un coup en tournant sur elle-même ; les étiquettes sont projetées ; il ne reste qu'un fil droit | Crécelle qui s'emballe, puis drop |

### B. Le tableau d'enquête (`src/scenes/enquete.js`)

| Temps | Image | Son |
|-------|-------|-----|
| 0 – 2,6 s | Gros plan sur une fiche bristol punaisée : « Trouver des bureaux, c'est simple. » | Piano électrique |
| 2,6 – 3,3 s | « Enfin… » : la caméra recule d'un coup ; ce n'est qu'un papier sur un grand tableau noir. « Sur le papier. » | Arrêt de la musique |
| 4,8 – 13,6 s | Les fiches sont punaisées une à une avec la voix : grandes fiches pour les critères dits, post-it pour les autres. Un fil menthe va de punaise en punaise, d'autres fils relient les fiches ; la caméra suit chaque nouvelle fiche | Coup sec de chaque punaise, note de pluck |
| 14,25 s | Le bout du fil est attrapé et tiré vers la droite | Silence |
| 14,65 – 15,2 s | Les punaises sautent l'une après l'autre depuis le bout tiré, les fiches tombent, le tableau se vide : il ne reste qu'un fil droit | Rafale de petits coups (punaises), puis drop |

## v5 finale : « le trait » (`src/scenes/trait.js`)

Demande du client : une intro « hyper originale », digne d'un grand studio. Parti pris : **un seul trait continu**,
le fil de Desk to Desk, dessine tout le problème en une ligne, sans lever la plume. Puis on tire ce fil, et tout le
dessin se tend en une ligne droite. Le fil n'est plus un objet : il devient l'outil du dessin.

| Temps | Voix | Image | Son |
|-------|------|-------|-----|
| 0 – 1,45 s | « Trouver des bureaux… » | Le trait entre par la gauche et dessine un immeuble d'un seul geste | Feutre sur papier, piano électrique |
| 1,45 – 2,2 s | « …c'est simple. » | Un trait parfaitement droit, puis une grande coche | |
| 2,5 – 3,15 s | « Enfin… » | La plume hésite et dessine un point d'interrogation | Arrêt de la musique |
| 3,15 – 4,35 s | « …sur le papier. » | Le trait encadre tout le début d'une feuille au coin plié ; « Sur le papier. » | |
| 4,75 – 6,8 s | « Parce que très vite, tout s'emmêle. » | La plume s'emballe en boucles, la caméra la suit à toute vitesse ; le dessin ancien s'assombrit | Feutre nerveux, le groove démarre |
| 6,8 – 11,3 s | « La surface. Le budget. Le quartier. Le bail. Les visites. » | Un dessin par critère, au mot près : plan coté, pile de pièces, épingle sur des rues, bail signé, porte entrouverte | Une note par critère |
| 11,3 – 12,3 s | (soupir) | La plume repasse partout ; la caméra recule : vu de loin, tout le dessin n'est qu'un écheveau, qui se rallume | Impact sourd, cymbale douce |
| 12,3 – 14,25 s | « Et pendant ce temps… le temps file. » | Le trait encercle le tout d'une horloge ; l'aiguille fait deux tours sur « file » | Tic-tac de claves, l'aiguille qui file |
| 14,6 – 15,2 s | (silence) | On tire le bout : l'horloge se déroule d'abord, puis les boucles, les critères, l'immeuble. Tout le dessin se tend en vague jusqu'à une seule ligne droite | Zip qui monte, puis drop |

Exécution :
- les icônes sont des tracés SVG d'un seul trait (le trait repasse sur lui-même plutôt que de lever la plume), échantillonnés tous les 4 px ;
- la caméra est un ressort critique précalculé à 240 Hz, sur la position et le zoom (en logarithme) ;
- le trait est plat, menthe, sans halo.

## v6 : « Le Fil, en un seul trait » (tout le film)

Demande du client : une autre version de tout le film, la voix off restant la même. Parti pris : prolonger l'intro
« trait » validée sur tout le film. **Un seul trait continu raconte tout** : il dessine le problème, se tend au
drop, puis devient un chemin droit, celui de Desk to Desk, sur lequel chaque étape se dessine. Les dessins
réagissent à ce qui est dit. Rendu : `node scripts/render.mjs --f 11 --o trait --v ligne`.

| Temps | Voix | Image |
|-------|------|-------|
| 0 – 15,25 s | Accroche, problème, le temps file | Intro « trait » (voir ci-dessus) |
| 15,25 – 17 s | « Desk to Desk tire le fil. » | Store menthe ; le trait, à l'encre, arrive par la droite et souligne « tire le fil. » |
| 17,3 – 19,4 s | « Un conseiller dédié. Un seul interlocuteur. » | Il descend la marge et dessine le portrait du conseiller, puis une bulle autour de « Un seul interlocuteur. » |
| 20,1 – 22 s | « Du brief… jusqu'à la remise des clés. » | Un trait droit d'un document jusqu'à une clé |
| 22,25 – 26,7 s | « Coworking ? Bureau opéré ? Bail commercial ? On vous aide à choisir. » | Retour au noir : le trait devient un chemin. Une table partagée, un bureau fermé, un local « 3/6/9 » ; recul pour comparer |
| 27,1 – 29,7 s | Étape 1 | Une liste de critères ; le trait coche les cases une à une |
| 30 – 33,3 s | Étape 2 | Un entonnoir : les offres y tombent, il se secoue, trois seulement passent et roulent sur le chemin |
| 33,6 – 35,9 s | Étape 3 | Une porte se dessine et s'ouvre ; la lumière entre |
| 36,6 – 40,4 s | Étape 4 | Une balance. Chaque mot (loyer, charges, travaux, durée) tombe sur un plateau et la fait pencher. À « durée », elle s'équilibre, et un cercle vif la valide |
| 41,3 – 44,5 s | Étape 5 | Le trait écrit une signature, puis dessine une clé qui tourne |
| 44,6 – 49 s | Services | Un contrat entouré d'une flèche de renégociation ; un calendrier, « 1 journée » entouré |
| 49,3 – 54,5 s | Villes | Le trait dessine l'Hexagone, puis relie chaque ville au moment où elle est nommée, jusqu'à Bruxelles, Barcelone et Luxembourg |
| 54,75 – 58,3 s | Gratuité | Store menthe, « gratuit.* » et mention |
| 58,75 – 68 s | Signature | Sous « Vous développez votre entreprise », une courbe de croissance ; elle se tend en ligne droite et devient le point qui écrit « Desk to Desk / s'occupe du reste » |

Les dessins du chemin sont factuels et génériques : pas de chiffres, pas d'adresses, pas de logos tiers. Le
contour de la France est stylisé. Les villes sont celles qui ont une page sur le site (F13).
