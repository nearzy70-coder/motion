# Desk to Desk — « Le Fil »

Film publicitaire en motion design pour [Desk to Desk](https://www.desk-to-desk.com/), courtier en bureaux.
Format principal vertical **9:16** (Reels, Shorts, TikTok, publicités mobiles), 33 s, en français, compréhensible sans le son.

> **Concept :** chercher des bureaux, c'est un fil emmêlé ; Desk to Desk le démêle et en fait une ligne droite, du brief à la remise des clés.

## Livrables

| Fichier | Format |
|---------|--------|
| `renders/final/desk-to-desk_le-fil_9x16_1080x1920.mp4` | **Version principale.** 1080 × 1920, 30 i/s, H.264 High, BT.709, AAC 192 kb/s 48 kHz, −14 LUFS |
| `renders/final/desk-to-desk_le-fil_4x5_1080x1350.mp4` | Déclinaison 4:5 (fil Instagram / Facebook) recadrée dans la zone sûre |
| `renders/audio/le-fil-mix.wav` | Bande-son originale non normalisée (48 kHz, 16 bits) |
| `renders/stills/planche-contact.jpg` | Planche contact du film (une image toutes les 0,5 s) |
| `research/` | Faits vérifiés et sources, notes d'inspiration, concept, direction artistique, storyboard, voix off proposée |

## Relancer le projet

Prérequis : Node 18+, Python 3 avec numpy, FFmpeg (libx264, AAC), Chromium compatible Playwright 1.56.

```bash
npm install                  # three, polices Parkinsans et Noto Sans, playwright-core
npm run audio                # synthétise renders/audio/le-fil-mix.wav (~40 s)
npm run render               # capture image par image + encodage des MP4 (~7 min, 3 workers)
npm run preview              # lecteur web temps réel : /src/index.html?play
npm run stills -- 8 18.5 29  # captures de contrôle à des instants donnés + planche contact
```

Options de rendu : `node scripts/render.mjs --samples 3 --workers 3 --from 0 --to 33`.
`--samples` fixe le nombre de sous-images par image : 3 donne un flou de mouvement à obturateur 180°, 1 désactive le flou.

Si Chromium n'est pas trouvé automatiquement, définir `PLAYWRIGHT_BROWSERS_PATH` (navigateurs Playwright 1.56, build chromium-1194).

## Architecture

Le rendu est **déterministe** : chaque image est calculée uniquement à partir de son instant `t`, via `window.seek(t)`. Il n'y a ni animation CSS ni horloge interne, ce qui rend le rendu image par image exact et reproductible.

```
src/
  index.html, styles.css    scène 1080×1920, système typographique et couleurs de marque
  main.js                   calques, seek(t), lecteur web (?play, ?t=)
  timeline.js               spécifications (30 i/s, 33 s, 120 BPM), repères temporels, grille de mise en page
  plan.js                   plan illustratif partagé entre la vignette 2D, le plan tracé et la maquette 3D
  office3d.js               maquette Three.js (extrusion, caméra, parcours de visite, ombres douces)
  lib/                      courbes d'accélération, géométrie des tracés, utilitaires DOM
  scenes/                   une scène par module : build(ctx) + update(t)
    hook, problem, thread (le fil), transform, hud (frise), header, brief, selection, visit, nego, value, end
audio/compose.py            musique et sound design synthétisés (numpy), synchronisés sur timeline.js
scripts/                    serveur statique, captures de contrôle, rendu et encodage FFmpeg
public/assets/fonts/        Parkinsans et Noto Sans (licence SIL OFL, fichiers joints)
```

Pour modifier un timing, éditer `src/timeline.js`. Si un repère sonore est concerné, reporter la valeur dans le dictionnaire `T` de `audio/compose.py`.

## Logo officiel

Le fichier logo officiel n'a pas pu être récupéré : le site était inaccessible depuis l'environnement de production. La fin du film utilise donc une signature typographique (« Desk to Desk. » en Parkinsans, point final menthe), cohérente avec le référentiel visuel fourni.
**Pour utiliser le logo officiel :** déposer `public/assets/logo.svg`, puis relancer `npm run render`. Il remplace automatiquement la signature typographique ; le fil vient se poser à sa droite.

## Points à valider avant diffusion

- Relire les mentions sur les pages actuelles du site (voir `research/faits-verifies.md`), en particulier la mention sur la commission.
- Les interfaces, la carte de Paris, les fiches d'offres et la maquette sont **illustratives** ; la mention « Visuels illustratifs » reste à l'écran pendant toute la démonstration.
- Remplacer la signature typographique par le logo officiel si nécessaire.
- La bande-son a été vérifiée par mesures (niveaux, spectre, synchronisation), mais pas à l'écoute : une écoute sur téléphone et au casque est recommandée.
