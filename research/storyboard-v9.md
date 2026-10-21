# v9 « Axo » : storyboard

Demande du client, après la v8 (« j'aime bcp ») : un autre motion, de niveau agence, avec un soin particulier sur les
transitions, les effets, la 3D et les dessins. Sa voix off de référence est celle d'origine
(`audio/vo/voix-off-elevenlabs.mp3`) : le fichier qu'il a renvoyé lui est identique (même empreinte md5). Le film
reprend donc le placement et les repères de cette voix (`src/timeline.js`), soit 68 s en 1:1.

## Parti pris

- **Axonométrie :** des volumes nets, éclairés en trois tons, avec des arêtes à l'encre en traits épais. C'est un dessin
  d'architecte qui prend vie en 3D (Three.js, caméra orthographique).
- **Personnages :**
  - « vous » est une sphère noire, blanche la nuit ;
  - Desk to Desk est un cube : menthe sur le papier et la nuit, blanc sur le menthe.
- **Fonds qui changent de couleur :**
  - papier pour l'accroche, les formats et les étapes ;
  - nuit pour le problème et la carte ;
  - menthe pour le drop et la gratuité.
- **Transitions graphiques :**
  - iris noir depuis la sphère ;
  - volets menthe, papier et nuit ;
  - store menthe ;
  - le plan qui bascule en 3D ;
  - la caméra qui glisse d'un socle à l'autre.
- **Typographie animée lettre à lettre :** chaque lettre monte et se redresse. Les mots clés reçoivent un surlignage
  menthe qui se trace.
- **Ombres de contact douces** sous les socles et les personnages. Flou de mouvement au rendu.

## Déroulé

| Temps | Voix | Image |
|-------|------|-------|
| 0 – 2,7 s | « Trouver des bureaux… c'est simple. » | La ville vue en plan. Un pointillé menthe relie la sphère à la tour visée (toit menthe), tracé par-dessus tout |
| 2,7 – 4,8 s | « Enfin… sur le papier. » | Le plan bascule en axonométrie : les immeubles se dressent et le trait droit passe à travers eux. Il n'existait que « sur le papier » |
| 4,8 – 12,3 s | « Parce que très vite, tout s'emmêle… les visites. » | Iris noir depuis la sphère : la ville passe en nuit (faces sombres, arêtes claires). Un fil menthe s'élève de la sphère et s'emmêle au-dessus des rues. Chaque critère s'accroche à un immeuble, ceux dits par la voix en grand |
| 12,3 – 14,3 s | « Et pendant ce temps… le temps file. » | La caméra recule et tourne autour de la ville ; un cadran menthe au sol, son aiguille fait un tour et demi |
| 14,3 – 15,25 s | (silence) | Le fil se tend d'un coup en ligne droite, de la sphère au toit de la tour |
| 15,25 – 22,25 s | « Desk to Desk tire le fil… jusqu'à la remise des clés. » | Volet menthe. Une piste blanche, la sphère :<br>- un cube tombe à côté d'elle (un conseiller dédié) ;<br>- des sphères arrivent puis s'effacent (un seul interlocuteur) ;<br>- le duo glisse de la feuille du brief jusqu'aux clés, qui tournent |
| 22,25 – 26,75 s | « Coworking ? Bureau opéré ? Bail commercial ? On vous aide à choisir. » | Volet papier. Un immeuble de trois étages s'ouvre, le toit s'envole. Chaque étage sort comme un tiroir sur son mot :<br>- tables partagées ;<br>- bureaux vitrés ;<br>- plateau nu avec « 3 / 6 / 9 » au sol.<br>Puis les trois se rangent côte à côte, un cadre menthe passe de l'un à l'autre |
| 27,1 – 44,4 s | Les cinq étapes | Un socle par étape, la caméra glisse de l'un à l'autre :<br>1. la table, vous et le cube, le cahier des charges qui se coche ;<br>2. seize offres sur une grille, la plupart passent à travers, trois restent et passent en menthe ;<br>3. un plateau, le parcours de visite, la sphère et le cube le suivent ensemble ;<br>4. le bail surligné au mot près (loyer, charges, travaux, durée), le tampon menthe « Négocié » ;<br>5. la signature, la clé qui tourne, la porte qui s'ouvre sur la lumière menthe |
| 44,6 – 49,3 s | Services | Le bail entouré d'une flèche menthe qui en fait le tour ; la salle de réunion et « 1 journée » entouré |
| 49,75 – 54,75 s | Villes | Volet nuit. La France en relief, blanche, au milieu de ses voisins ; une colonne menthe par ville nommée, des arcs depuis Paris |
| 54,75 – 58,75 s | Gratuité | Store menthe : « Pour le locataire, c'est gratuit.* » et la mention complète |
| 58,75 – 68 s | Signature | Volet nuit : « Vous développez votre entreprise. » ; « Desk to Desk s'occupe du reste ». Un petit carré menthe (le cube) tombe et rebondit en point final ; « Parler à un conseiller », desk-to-desk.com, la mention |

Aucun chiffre, aucune adresse, aucune marque tierce. Les villes sont celles du site.

## Son

Même musique que la v3 (écrite pour cette voix, `audio/compose_v3.py`), avec une variante de bruitages propres à
l'axonométrie (`compose_v3.py axo`) :
- souffles des volets, de l'iris et de la bascule du plan ;
- la pose du cube et les interlocuteurs qui s'effacent ;
- les tiroirs des étages et le cadre de choix ;
- les glissements de socle à socle ;
- les offres qui passent à travers la grille, les pas de la visite ;
- la signature, la porte, la flèche.
