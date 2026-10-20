# « Le Fil » : concept, direction artistique et storyboard

## Concept

**En une phrase :** chercher des bureaux, c'est un fil emmêlé ; Desk to Desk le démêle et en fait une ligne droite, du brief à la remise des clés.

Un seul élément graphique, **le fil menthe**, porte tout le film et représente le conseiller dédié. Il raye l'accroche, s'emmêle entre les critères, est tiré droit, devient la frise des 5 étapes réelles du parcours Desk to Desk, trace l'itinéraire sur la carte, relie les conditions négociées, signe, dessine la clé, puis se replie pour devenir le point final de « Desk to Desk. ».

- **Cible :** dirigeants, fondateurs, responsables des opérations / office managers, décideurs immobiliers de PME et scale-ups.
- **Promesse :** un conseiller dédié rend la recherche de bureaux claire et maîtrisée, de la définition du besoin à la remise des clés.
- **Ton :** direct, concret, rassurant ; phrases courtes, verbes d'action (« On définit », « On sélectionne », « On organise », « On négocie »).
- **Format :** 9:16, 1080 × 1920, 30 i/s, 33 s. Déclinaison 4:5 (1080 × 1350) par recadrage dans la zone sûre.
- **Lecture sans le son :** tous les messages sont à l'écran ; la musique ne porte aucune information indispensable.

## Pistes explorées (en interne)

| Piste | Idée | Verdict |
|-------|------|---------|
| A. Le Fil | Un trait unique emmêlé puis tiré droit | **Retenue** : compréhension immédiate (chaos → clarté), raccords naturels entre toutes les scènes, coût de production maîtrisé |
| B. Le plan qui se construit | Un plan d'architecte qui se remplit au fil des étapes | Belle 3D, mais message « aménagement » plus que « accompagnement » |
| C. Le bureau vide → plein | Un plateau vide qui s'équipe | Trop proche d'une publicité d'aménageur ; ne montre ni la sélection ni la négociation |
| D. Le comparateur | Interface qui filtre des centaines d'offres | Risque de laisser croire à un logiciel ; ne valorise pas le conseiller |

## Direction artistique

| Élément | Choix |
|---------|-------|
| Fond | Encre `#111111` + grille architecturale à 3 % (module 96 px, alignée sur le fil) + vignette douce |
| Accent / le fil | Accent principal `#2ACAA5` ; menthe claire `#34E0B8` pour la tête du fil |
| Cartographie | Vert cartographique `#449280` (rues, Seine, végétation de la maquette) |
| Surfaces d'interface | Blanc `#FFFFFF`, rayons 24 à 32 px, ombres longues et douces |
| Titres | Parkinsans 600, interlettrage −0,045 em (référentiel de marque) |
| Interface et textes courants | Noto Sans 500 à 700 (référentiel de marque) |
| Sur-titres | Noto Sans 650, capitales, interlettrage 0,18 em, menthe |
| Motif | Point cerclé (nœuds de la frise, repères de carte, anneau de la clé) |
| 3D | Maquette « blanc d'architecte » sur dalle sombre, verre teinté menthe, ombres douces PCF, parcours de visite en tube menthe non éclairé (même matière que le fil 2D) |
| Zones sûres | Textes essentiels entre y = 260 et y = 1 520 px ; marge gauche 96 px ; contenu de x = 160 à 984 px |
| Mouvement | Entrées `cubic-bezier(.16,1,.3,1)`, sorties `(.7,0,.84,0)`, déplacements `(.65,0,.35,1)`, tension du fil `(.86,0,.07,1)` ; dépassement limité à < 4 % |

## Storyboard (timing exact, 120 BPM, 1 mesure = 2 s)

| # | Temps | Objectif | Texte affiché | Visuel et mouvement | Transitions | Son |
|---|-------|----------|---------------|---------------------|-------------|-----|
| 1 | 0,0 – 3,0 s | **Accroche** | « Trouver vos bureaux, c'est simple. » ; sur-titre « Desk to Desk » | Titres 138 px révélés par masques (la 1re image affiche déjà le titre). À 1,0 s le fil raye « simple. », qui s'assombrit ; le fil continue et commence à boucler | Sortie : les lignes montent hors cadre (2,2 s), la queue du fil est tirée et efface la rature | Motif fa-la-do ; frottement de feutre sur la rature ; tic-tac discret |
| 2 | 3,0 – 8,0 s | **Problème** | « Trop de critères. / Trop d'offres. / Trop peu de temps. » | 12 pastilles (Budget, Charges, Quartier, Bureau opéré ?, Bail 3/6/9, Nombre de postes, Délais, Surface, Préavis, Coworking ?, Travaux, Visites) apparaissent quand la tête du fil les atteint (toutes les croches). Lente poussée caméra, puis léger recul d'anticipation | Le fil reste lisible : boucles maîtrisées, pastilles au-dessus du tracé | Basse pulsée en croches, une note par pastille (spatialisée), montée de 6 à 8 s |
| 3 | 8,0 – 12,0 s | **Transformation** | « Desk to Desk démêle votre recherche. » / « Un conseiller dédié, du brief à la remise des clés. » | **Temps fort** : le fil est tiré et se tend en une verticale (x = 96) ; les pastilles se changent en perles qui glissent sur le fil, puis se regroupent en 5 nœuds : 01 Brief · 02 Sélection · 03 Visites · 04 Négociation · 05 Emménagement | Les perles deviennent les nœuds de la frise ; la frise sert ensuite d'indicateur de progression | Impact + contre-souffle inversé, entrée de la batterie, accord fa majeur (soulagement) ; carillon sur la marque |
| 4a | 12,0 – 14,0 s | **Brief** | « Étape 01 · Le brief — On définit votre besoin. » | Une branche part du nœud 01 et trace le contour de la fiche « Nouveaux bureaux », qui se remplit en volet : 12 postes, quartiers, format (Bureau opéré sélectionné), budget (curseur) | La fiche se compacte en barre de filtres « 12 postes · Paris 2e, 9e, 10e · Bureau opéré » | Clics d'interface discrets |
| 4b | 14,0 – 17,0 s | **Sélection** | « Étape 02 · La sélection — On sélectionne les bons espaces. » | Carte illustrative de Paris (îlots, grands axes, Seine) ; le marché apparaît puis se filtre ; 3 repères (9e, 2e, 10e) ; la branche du nœud 02 devient l'itinéraire qui les relie ; 3 fiches d'offres ; la première est retenue | **Plongée** dans la vignette-plan de l'offre retenue (16,85 s) | Trois notes pour les repères, validation à deux notes, souffle de plongée |
| 4c | 17,0 – 20,0 s | **Visites (moment fort 3D)** | « Étape 03 · Les visites — On organise les visites. » ; étiquettes « Open space · 12 postes », « Salle de réunion » | Le plan 2D est raccordé exactement à la maquette Three.js vue du dessus ; les murs s'extrudent, le mobilier pousse, la caméra bascule en 3/4 avec lente orbite ; le fil devient le parcours de visite jusqu'à la salle de réunion | La fiche « Conditions » monte et recouvre la maquette | Montée tonale + impact sourd sur l'extrusion |
| 4d | 20,0 – 22,0 s | **Négociation** | « Étape 04 · La négociation — On négocie vos conditions. » ; Loyer · Charges · Travaux · Durée → « Négocié » ; « Démarches suivies jusqu'à la signature » | La branche du nœud 04 relie les quatre validations | La fiche se réduit en panneau de signature | Quatre validations ascendantes |
| 4e | 22,0 – 24,0 s | **Emménagement** | « Étape 05 · L'emménagement — Jusqu'à la remise des clés. » ; « Conditions validées », « Remise des clés » | Le fil signe, puis la branche du nœud 05 dessine une clé dont l'anneau reprend le motif point cerclé | Volet de sortie vers le haut | Frottement de stylo, tintement de clé |
| 5 | 24,0 – 28,0 s | **Valeur** | « Un interlocuteur unique. » ; Bureaux opérés · Bail commercial · Renégociation · Location ponctuelle (avec sous-titres) ; **« Gratuit pour le locataire* »** + mention | Chaque service s'aligne sur un nœud de la frise, qui se rallume ; la gratuité occupe le 5e nœud, en menthe | Sorties ligne par ligne | Batterie en quatre temps (élan), accents par argument, accord sur la gratuité |
| 6 | 28,0 – 33,0 s | **Conclusion et conversion** | « Desk to Desk. » ; « Trouvons vos futurs bureaux aux meilleures conditions. » (accroche officielle) ; bouton **« Parler à un conseiller → »** ; « desk-to-desk.com » ; « Accompagnement gratuit pour le locataire* » ; mention | Le fil se replie en un point qui écrit la signature de gauche à droite et se pose comme **point final** à 29,0 s (sur le temps) ; puis accroche, CTA, URL. La flèche du CTA avance deux fois (31 s et 32 s). Dernière seconde fixe, exploitable en vignette | Fondu sonore 31,6 → 33 s, sans coupure | Signature sonore (cloches fa majeur) à l'atterrissage du point |

**Mention obligatoire** (visible de 26,0 s à la fin) : « \*Commission payée par le propriétaire. Certaines offres, en général en bail commercial, peuvent faire exception. »

## Voix off (facultative, non enregistrée)

Le film est conçu pour fonctionner **sans voix off**, puisque la majorité des diffusions sociales se lisent sans le son. Aucun enregistrement vocal n'a été produit : la génération vocale par un service tiers aurait impliqué un coût et l'envoi du texte à un prestataire, ce qui exige ton accord. Texte proposé si une voix est ajoutée (environ 28 s à débit posé) :

> « Trouver vos bureaux, c'est simple… en théorie. Surface, budget, quartier, bail, délais : tout s'emmêle. Desk to Desk démêle votre recherche. Un conseiller dédié définit votre besoin, sélectionne les bons espaces, organise les visites et négocie vos conditions, jusqu'à la remise des clés. Bureaux opérés, bail commercial, renégociation, location ponctuelle. Et c'est gratuit pour le locataire, sauf exceptions. Desk to Desk : trouvons vos futurs bureaux aux meilleures conditions. »

Intégration : déposer `renders/audio/voix.wav`, puis mixer avec la musique abaissée de 8 à 10 dB sous la voix (FFmpeg `sidechaincompress` ou montage dans un logiciel audio).

## Musique et sound design

Composition originale synthétisée par code (`audio/compose.py`), donc sans question de droits. Fa majeur, 120 BPM :
Ré m9 (attente) → Ré m add9 avec frottement mi/fa (complexité) → Si♭ maj9 (montée) → **Fa maj9 au temps fort** → La m7 → Ré m9 → Sol m9 → Si♭ maj9 → Do 6/9 → **Fa maj9 final** (cadence IV–V–I sur la signature).
Mix pensé pour le mobile : coupe-bas à 38 Hz, grave atténué, présence +3 dB à 2,6 kHz, export à −14 LUFS intégrés et −1 dBTP.
