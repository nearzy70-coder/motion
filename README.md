# Desk to Desk — « Le Fil » v7

Film publicitaire en motion design pour [Desk to Desk](https://www.desk-to-desk.com/), courtier en bureaux.
**68 s, en français, avec la voix off ElevenLabs fournie par le client.** Livrable : **format carré 1:1** (1080 × 1080). Le code garde aussi une mise en page 9:16 (`--f 916`), non rendue.

> **Concept :** chercher des bureaux, c'est une pelote emmêlée. Desk to Desk tire le fil : la recherche devient une ligne droite, la corde à linge sur laquelle chaque étape est accrochée, du cahier des charges aux clés.

## Livrables

| Fichier | Contenu |
|---------|---------|
| `renders/final/desk-to-desk_le-fil-v4_1x1_1080x1080.mp4` | **Film final, pleine qualité** (nouvelle ouverture) : 1080 × 1080, 30 i/s, H.264 High (CRF 12, aplats nets), BT.709, AAC 192 kb/s 48 kHz, -14 LUFS |
| `renders/final/desk-to-desk_le-fil-v3_1x1_1080x1080.mp4` | Version 3, ouverture « corde » : conservée pour comparaison |
| `renders/final/planche-contact-v4_1x1.jpg` | Planche contact extraite du MP4 (une image par seconde) |
| `renders/audio/le-fil-v3-mix.wav` | Bande-son finale : voix et musique mixées (48 kHz, 16 bits, -14 LUFS) |
| `renders/audio/le-fil-v3-musique.wav` | Musique seule, sans atténuation sous la voix (pour un remontage) |
| `renders/audio/le-fil-v3-voix.wav` | Voix seule, placée et traitée comme dans le film |
| `renders/final/v1/` | Version 1 (33 s), conservée pour comparaison |
| `research/` | Faits vérifiés et sources, storyboards v2 et v3, texte et placement de la voix off |

## v7 : « La maquette » (version complète tout en 3D)

**`renders/final/desk-to-desk_le-fil-v7-maquette_1x1_1080x1080.mp4`** (1:1, 68 s, même voix off, nouvelle bande-son de bruitages).
Tout le film se joue dans une maquette d'architecte en 3D (Three.js) :
- volumes blancs mats sur fond noir ;
- lumière de studio : environnement, soleil et ombres douces ;
- occlusion ambiante ;
- flou de bascule façon miniature ;
- accents menthe.

| Temps | À l'image |
|-------|-----------|
| 0 – 4,8 s | La ville vue en plan : un pointillé droit relie « vous » à la tour visée (« c'est simple »). Sur « sur le papier », la maquette bascule en perspective |
| 4,8 – 12,3 s | Un repère menthe erre dans les rues, sa trace s'emmêle ; chaque critère s'affiche sur un immeuble, ceux dits par la voix en grand |
| 12,3 – 15,25 s | Vue aérienne, le soleil fait le tour de la ville (« le temps file ») ; « Délais » apparaît en dernier |
| 15,25 – 22,25 s | Drop : le bon chemin s'allume en ruban menthe. La caméra le suit jusqu'au parvis de la tour, dont les étages s'allument de bas en haut, puis entre dans la façade |
| 22,25 – 26,75 s | L'immeuble en éclaté : le toit et les étages s'envolent pour montrer chaque format (coworking, bureaux opérés, plateau en bail 3/6/9), puis les trois étages séparés |
| 26,75 – 49,75 s | Une vitrine sur socle par étape, la caméra passe de l'une à l'autre : cahier des charges coché ; 25 offres dont 3 seulement remontent ; parcours de visite ; contrat surligné au mot près puis tamponné ; signature, clé qui tourne, porte qui s'ouvre ; contrat renégocié ; salle réservée pour une journée |
| 49,75 – 54,75 s | La France en relief au milieu de ses voisins : une colonne menthe par ville nommée, des arcs depuis Paris |
| 54,75 s – fin | Store menthe « gratuit.* » avec la mention complète, puis la signature (identiques à la v6) |

Rendu : `node scripts/export-cues.mjs 11 '' maquette`, `cd audio && python3 compose_v3.py maquette`, puis `node scripts/render.mjs --f 11 --v maquette --name desk-to-desk_le-fil-v7-maquette`.

## v6 : « Le Fil, en un seul trait » (autre version complète)

**`renders/final/desk-to-desk_le-fil-v6-un-seul-trait_1x1_1080x1080.mp4`** (1:1, 68 s, même voix off).
Tout le film tient en un seul trait continu :
- l'intro « trait » ;
- puis, sur l'aplat menthe, le conseiller, sa bulle et le chemin du brief aux clés ;
- puis un chemin droit sur lequel chaque étape se dessine et réagit : coches, entonnoir, porte, balance, clé, calendrier ;
- enfin l'Hexagone et ses villes, et une courbe de croissance qui devient la signature.

Détails dans `research/storyboard-v3.md`.

## v5 finale : l'intro « trait »

**Livrable final : `renders/final/desk-to-desk_le-fil-v5-final_1x1_1080x1080.mp4`** (1:1, 68 s).
Un seul trait continu dessine tout le problème, sans lever la plume :
- l'immeuble, la coche « c'est simple », le point d'interrogation et la feuille ;
- puis, en boucles, un dessin par critère dit par la voix ;
- le recul révèle l'écheveau, et une horloge l'encercle.

Au tirage, tout le dessin se tend en une ligne droite, puis le drop. Détails dans `research/storyboard-v3.md`.

## v5 : deux autres ouvertures, au choix

| Fichier | Ouverture (0 à 15 s) |
|---------|----------------------|
| `renders/final/desk-to-desk_le-fil-v5-pelote_1x1_1080x1080.mp4` | **La pelote** : le fil droit s'enroule en une vraie pelote 3D avec ses étiquettes, puis se dévide d'un coup avant le drop |
| `renders/final/desk-to-desk_le-fil-v5-enquete_1x1_1080x1080.mp4` | **Le tableau d'enquête** : la fiche « c'est simple » n'est qu'un papier sur un tableau ; les critères sont punaisés et reliés par des fils ; au tirage, les punaises sautent et le tableau se vide |

Le reste du film est identique. Rendu d'une variante : `node scripts/export-cues.mjs 11 pelote`, `cd audio && python3 compose_v3.py pelote`, puis `node scripts/render.mjs --f 11 --o pelote --name desk-to-desk_le-fil-v5-pelote`. Même chose avec `enquete`. Détails dans `research/storyboard-v3.md`.

## v4 : nouvelle ouverture

La phrase d'accroche s'effondre et les critères tombent un à un, avec la voix, en une pile de mots (physique de corps rigides). Une aiguille coud la pile, et le fil tiré aligne les mots avant le drop. Détails dans `research/storyboard-v3.md`.

## Ce qui a changé en v3 (retours client)

- **Fond noir net** : plus aucun grain, encre unie. L'encodage donne plus de bits aux zones sombres : aucun bloc, aucune bande.
- **Voix off intégrée** : le film est recalé phrase par phrase sur l'enregistrement ElevenLabs (tableau détaillé dans `research/voix-off.md`). Le texte et les objets arrivent avec les mots :
  - les critères de la pelote ;
  - « file. » ;
  - « Desk to Desk tire le fil. » ;
  - chaque format ;
  - « loyer, charges, travaux, durée » puis le tampon ;
  - chaque ville ;
  - « gratuit » ;
  - la signature.
- **Plus dynamique** :
  - panoramiques de 0,55 s, plus francs, avec flou de mouvement ;
  - impulsions de caméra sur les temps forts ;
  - coupes et arrivées posées sur la grille rythmique ;
  - silence avant le drop ;
  - fils lancés de Paris vers chaque ville.
- **Nouvelle musique**, moderne et rythmée (120 BPM) : grosse caisse, claps, charleston, basse, piano électrique et pluck, synthétisés note par note dans `audio/compose_v3.py`, sans boucle ni préréglage.
  - Elle est complétée par un piano droit, un glockenspiel, une cymbale et des bruitages réels (pinces à linge, tampon, clés).
  - Le motif mélodique ne joue que dans les silences de la voix.
  - La musique s'efface de 6,5 dB sous la parole.
  - L'harmonie ne se résout qu'à la signature.
- **Fin réécrite** sur la signature de la voix : « Vous développez votre entreprise. » puis le point écrit « Desk to Desk s'occupe du reste » et en devient le point final.

## Relancer le projet

Prérequis :
- Node 18+ ;
- Python 3 avec numpy, scipy et Pillow ;
- FFmpeg (libx264, AAC) ;
- Chromium compatible Playwright 1.56 ;
- les échantillons VSCO 2 CE (voir Crédits).

```bash
npm install
# Échantillons CC0 (extraction partielle, environ 650 Mo) dans /home/user/sgossner/vsco-2-ce
# ou dans le dossier indiqué par la variable VSCO_DIR
node scripts/export-cues.mjs 11     # repères du film et placement de la voix (format 1:1) -> audio/cues.json
cd audio && python3 compose_v3.py   # musique + voix -> renders/audio/le-fil-v3-*.wav (environ 30 s)
cd .. && node scripts/render.mjs --f 11 --name desk-to-desk_le-fil-v4   # rendu 1:1 (environ 30 min, 4 workers)
npm run preview                     # lecteur web : /src/index.html?play&f=11
node scripts/stills.mjs --f 11 8 18.5 40    # images de contrôle + planche contact
```

`scripts/verify.sh` vérifie les exports : flux, décodage complet, sonie, images noires ou figées.

## Architecture

Le rendu est **déterministe** : chaque image ne dépend que de son instant `t` (`window.seek(t)`). La physique de la corde et l'inertie des feuilles sont précalculées à pas fixe.

```
src/
  timeline.js        repères calés sur la voix, placement de la voix (VO), mises en page 9:16 et 1:1
  main.js            calques, seek(t), respiration de caméra, lecteur web
  lib/rope.js        corde simulée (Verlet, contraintes de longueur et de courbure)
  lib/cord.js        rendu de la cordelette : ombres, torsion, reflet, croisements (ou trait plat)
  lib/stroke.js      trait continu : tracés SVG d'un seul trait, segments datés, boucles, caméra à ressort
  lib/texture.js     papier, encre de tampon (grain disponible mais désactivé)
  popup3d.js         maquette « pop-up » Three.js (trait d'architecte)
  scenes/            ouvertures : trait (v5 finale), pile (v4), pelote (3D), enquete ; puis pull, line, coverage, free, end
                     ligne : tout l'après-drop du film « en un seul trait » (v6), à la place de line et coverage
  sheets/            formats, brief, map, plan, contract, keys, services
audio/compose_v3.py  musique (synthèse + échantillons CC0), placement de la voix, ducking, mixage
audio/dsp.py         filtres, réverbération, compression, banques d'échantillons
audio/vo/            voix off ElevenLabs fournie par le client
scripts/             serveur, export des repères, captures, rendu, mélange des sous-images (blend.py)
```

## Logo officiel

Le fichier logo officiel n'a pas pu être récupéré (site inaccessible depuis l'environnement de production). La fin utilise une signature typographique : « Desk to Desk » en Parkinsans, puis « s'occupe du reste » avec le point final en menthe.
**Pour utiliser le logo officiel :** déposer `public/assets/logo.svg` et relancer le rendu. Il remplace automatiquement « Desk to Desk » sur la première ligne ; le point écrit toujours la seconde.

## Crédits

- Typographies Parkinsans et Noto Sans, licence SIL OFL (`public/assets/fonts/`).
- Voix off : générée par le client avec ElevenLabs (v4, voix « Victoria »), à partir du texte de `research/voix-off.md`.
- Échantillons : **Versilian Studios Chamber Orchestra 2 Community Edition** (licence CC0), https://github.com/sgossner/VSCO-2-CE ; piano droit échantillonné par Simon Dalzell (Ivy Audio). Aucune attribution n'est exigée par la licence ; elle reste encouragée par les auteurs.
- Three.js (MIT) ; planck.js, moteur physique 2D (MIT).

## Points à valider avant diffusion

- Relire les mentions sur les pages actuelles du site (`research/faits-verifies.md`), en particulier la commission.
- Les documents, la carte de Paris, le plan, le contrat et les fiches d'offres sont **illustratifs** : ils sont présentés comme exemples (« exemple », « plan illustratif ») et ne montrent ni prix ni chiffres.
- La bande-son a été vérifiée par mesures (sonie, équilibre voix / musique, spectre, synchronisation), mais pas à l'écoute : une écoute au téléphone et au casque est recommandée.
- Vérifier les droits d'usage commercial de la voix ElevenLabs selon l'abonnement utilisé.
