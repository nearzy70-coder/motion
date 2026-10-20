# Desk to Desk — « Le Fil » v4

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
  lib/cord.js        rendu de la cordelette : ombres, torsion, reflet, croisements
  lib/texture.js     papier, encre de tampon (grain disponible mais désactivé)
  popup3d.js         maquette « pop-up » Three.js (trait d'architecte)
  scenes/            pile (accroche, pile de mots, aiguille), pull, line (corde à linge + caméra), coverage, free, end
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
