# Desk to Desk — « Le Fil » v2

Film publicitaire en motion design pour [Desk to Desk](https://www.desk-to-desk.com/), courtier en bureaux.
Version longue : **75 s**, en français, compréhensible sans le son. Format principal **9:16** et format carré **1:1** avec une mise en page dédiée.

> **Concept :** chercher des bureaux, c'est une pelote emmêlée. Desk to Desk tire le fil : la recherche devient une ligne droite, la corde à linge sur laquelle chaque étape est accrochée, du cahier des charges aux clés.

## Livrables

| Fichier | Contenu |
|---------|---------|
| `renders/final/desk-to-desk_le-fil-v2_9x16_1080x1920.mp4` | **Version principale** : 1080 × 1920, 30 i/s, H.264 High, BT.709, AAC 192 kb/s 48 kHz, −14 LUFS |
| `renders/final/desk-to-desk_le-fil-v2_1x1_1080x1080.mp4` | Format carré (mise en page propre, pas un recadrage) |
| `renders/audio/le-fil-v2-mix.wav` | Bande-son originale avant normalisation (48 kHz, 16 bits) |
| `renders/final/planche-contact-v2_*.jpg` | Planches contact extraites des MP4 |
| `renders/final/v1/` | Version 1 (33 s), conservée pour comparaison |
| `research/` | Faits vérifiés et sources, storyboard v2, direction artistique, notes |

## Ce qui a changé en v2 (retours client)

- **Plus long et plus informatif** : formats de bureaux (coworking, bureau opéré, bail commercial), contenu du brief, sélection, visites, négociation (loyer, charges, travaux, durée), clés, renégociation, location ponctuelle, couverture France et Europe, gratuité.
- **Fini l'aspect « IA »** :
  - une vraie cordelette tressée, simulée physiquement ;
  - des étiquettes et des documents en papier suspendus par des pinces à linge ;
  - une carte punaisée, une maquette 3D « pop-up » au trait d'architecte, un tampon encreur, un trousseau de clés ;
  - des aplats menthe plein cadre et du grain argentique ;
  - plus de pastilles d'interface ni de sur-titres en capitales espacées.
- **Motion plus soigné** : physique de corde, inertie des feuilles au travelling, respiration de caméra, flou de mouvement adaptatif (3 à 12 sous-images par image, obturateur 180°).
- **Son entièrement acoustique** : instruments réels échantillonnés (piano droit, pizzicati, cordes, harpe, marimba, glockenspiel, timbales) et bruitages réels (bois, slapstick, shaker, tambourin, guiro, grelots, cymbale aux mailloches). Aucun bip ni souffle synthétique.

## Relancer le projet

Prérequis : Node 18+, Python 3 avec numpy et Pillow, FFmpeg (libx264, AAC), Chromium compatible Playwright 1.56, et les échantillons VSCO 2 CE (voir Crédits).

```bash
npm install
# Échantillons CC0 (extraction partielle, environ 650 Mo) dans /home/user/sgossner/vsco-2-ce
# ou dans le dossier indiqué par la variable VSCO_DIR
node scripts/export-cues.mjs        # repères temporels du film -> audio/cues.json
python3 audio/compose.py            # bande-son -> renders/audio/le-fil-v2-mix.wav
node scripts/render.mjs --f 916     # rendu 9:16 (environ 30 min, 4 workers)
node scripts/render.mjs --f 11      # rendu 1:1
npm run preview                     # lecteur web : /src/index.html?play (&f=11 pour le carré)
node scripts/stills.mjs --f 916 8 18.5 40   # images de contrôle + planche contact
```

`scripts/verify.sh` vérifie les exports : flux, décodage complet, sonie, images noires ou figées.

## Architecture

Le rendu est **déterministe** : chaque image ne dépend que de son instant `t` (`window.seek(t)`). La physique de la corde et l'inertie des feuilles sont précalculées à pas fixe.

```
src/
  timeline.js        96 BPM, 30 mesures, repères, mises en page 9:16 et 1:1
  main.js            calques, seek(t), respiration de caméra, lecteur web
  lib/rope.js        corde simulée (Verlet, contraintes de longueur et de courbure)
  lib/cord.js        rendu de la cordelette : ombres, torsion, reflet, croisements
  lib/texture.js     grain, papier, encre de tampon
  popup3d.js         maquette « pop-up » Three.js (trait d'architecte)
  scenes/            hook, tangle, pull, line (corde à linge + caméra), coverage, free, end
  sheets/            formats, brief, map, plan, contract, keys, services
audio/compose.py     partition et mixage (échantillons CC0), synchronisés sur audio/cues.json
scripts/             serveur, export des repères, captures, rendu, mélange des sous-images (blend.py)
```

## Logo officiel

Le fichier logo officiel n'a pas pu être récupéré (site inaccessible depuis l'environnement de production). La fin utilise une signature typographique : « Desk to Desk. » en Parkinsans, avec le point final en menthe.
**Pour utiliser le logo officiel :** déposer `public/assets/logo.svg` et relancer le rendu. Il remplace automatiquement la signature, et le fil vient se poser à sa droite.

## Crédits

- Typographies Parkinsans et Noto Sans, licence SIL OFL (`public/assets/fonts/`).
- Échantillons : **Versilian Studios Chamber Orchestra 2 Community Edition** (licence CC0), https://github.com/sgossner/VSCO-2-CE ; piano droit échantillonné par Simon Dalzell (Ivy Audio). Aucune attribution n'est exigée par la licence ; elle reste encouragée par les auteurs.
- Three.js (MIT).

## Points à valider avant diffusion

- Relire les mentions sur les pages actuelles du site (`research/faits-verifies.md`), en particulier la commission.
- Les documents, la carte de Paris, le plan, le contrat et les fiches d'offres sont **illustratifs** : ils sont présentés comme exemples (« exemple », « plan illustratif ») et ne montrent ni prix ni chiffres.
- La bande-son a été vérifiée par mesures (sonie, spectre, synchronisation), mais pas à l'écoute : une écoute au téléphone et au casque est recommandée.
