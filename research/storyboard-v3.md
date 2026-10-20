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
