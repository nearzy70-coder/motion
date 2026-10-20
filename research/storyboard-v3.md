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
| 0 – 4,4 s | Accroche : « Trouver des bureaux, c'est simple. » La corde barre « simple », puis « Sur le papier. » | Accords de piano électrique sautillants. Sur « Enfin… », l'harmonie tourne au mineur et tout s'arrête |
| 4,8 – 14,3 s | La pelote : 12 étiquettes nouées au fil, les 5 critères cités tombent avec leur mot. « Et le temps file. » | Le groove se construit (ré mineur). Une note de pluck par étiquette, de plus en plus aiguë. Le temps devient un tic-tac de claves, puis un roulement de caisse claire |
| 14,3 – 15,25 s | La corde est tirée | Silence, frottement de guiro (la corde se tend), accord inversé qui aspire vers le drop |
| 15,25 – 22 s | **Drop** : store menthe, « Desk to Desk tire le fil. », sous-titres | Groove complet (grosse caisse, claps, charleston, basse, piano électrique), cymbale et infra-grave |
| 22,25 – 49,3 s | Corde à linge : 3 formats, 5 étapes, 2 services | Le groove continue. Le motif de pluck ne joue que dans les silences de la voix. Bruitages réels : clac de pince à linge à chaque arrivée, punaises, maquette, tampon (la batterie se tait un temps avant le coup), clés |
| 49,75 – 54,5 s | Carte : un fil part de Paris vers chaque ville nommée | Une note de glockenspiel par ville |
| 54,75 – 58,3 s | Store menthe : « Pour le locataire, c'est gratuit.* » | La batterie s'efface, accords de piano droit, arpège qui monte avec le store |
| 58,75 – 68 s | « Vous développez votre entreprise. » La signature s'écrit, puis le bouton et l'adresse | Montée en do suspendu, résolution en fa majeur sur la signature (61,05 s), groove final, dernier accord qui résonne |

## Mentions

La mention de la commission est affichée de 55,65 s (store « gratuit ») jusqu'à la fin :
« \*Commission payée par le propriétaire. Certaines offres, en général en bail commercial, peuvent faire exception. »
