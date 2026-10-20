# Voix off « Le Fil » : texte pour ElevenLabs

Inspiré du texte de référence du client (ton calme, chaleureux, puis assuré ; signature « Vous développez votre
entreprise. Desk to Desk s'occupe du reste. »), resserré pour tenir dans le film et calé scène par scène.
Environ 165 mots, soit environ 70 s à débit posé, pauses comprises. Le montage sera recalé sur la voix enregistrée.

## Texte à coller dans ElevenLabs (modèle Eleven v3, une seule génération)

```text
[calme, chaleureux, intrigant]
Trouver des bureaux… c’est simple.
[petite pause]
[léger sourire]
Enfin… sur le papier.

[conversationnel, de plus en plus préoccupé]
Parce que très vite, tout s’emmêle.
La surface. Le budget. Le quartier. Le bail. Les visites.
[soupir discret]
Et pendant ce temps… le temps file.

[pause]

[assuré, clair, énergique mais maîtrisé]
Desk to Desk tire le fil.
Un conseiller dédié. Un seul interlocuteur.
Du brief… jusqu’à la remise des clés.

[fluide, dynamique]
Coworking ? Bureau opéré ? Bail commercial ?
On vous aide à choisir.

[rythmé, sûr de lui]
D’abord, on définit votre besoin, avec vous.
Puis on passe le marché au crible, pour ne garder que les bons espaces.
On organise les visites… et on vient avec vous.
On négocie avec le bailleur : loyer, charges, travaux, durée.
Et on vous accompagne jusqu’à la signature… et la remise des clés.

[plus léger]
Déjà installés ? On renégocie votre contrat.
Une salle pour une journée ? On s’en occupe aussi.

[lumineux]
À Paris, Lyon, Lille, Bordeaux… et jusqu’à Bruxelles, Barcelone ou Luxembourg.

[rassurant, sincère]
Et pour vous, c’est gratuit : c’est le propriétaire qui nous rémunère.

[long silence]

[calme, premium, sincère]
Vous développez votre entreprise.
[courte pause]
Desk to Desk s’occupe du reste.
[léger sourire]
Parlez à un conseiller, sur desk to desk point com.
```

## Voix enregistrée et placement dans le film (v3)

Fichier reçu du client : `audio/vo/voix-off-elevenlabs.mp3` (ElevenLabs v4, voix « Victoria », mono 44,1 kHz, 62,7 s).
Le texte enregistré est exactement celui ci-dessus. Les phrases ont été repérées dans l'enregistrement par détection
des silences et des syllabes (sans service de transcription externe), puis le film a été recalé sur la voix.

La voix n'est **ni accélérée ni retouchée**. Elle est seulement coupée au milieu de certaines pauses, et ces pauses
sont rallongées ou raccourcies (de -0,1 à +0,55 s) pour laisser respirer l'image : avant le drop, entre les trois
formats, avant et après le tampon, avant la fin. Le placement exact est dans `src/timeline.js` (`VO`).

| Film | Voix | À l'écran |
|------|------|-----------|
| 0,25 – 4,4 s | « Trouver des bureaux… c'est simple. Enfin… sur le papier. » | Le titre ; un trait de feutre menthe barre « simple » sur « Enfin… » ; « Sur le papier. » |
| 4,8 – 14,3 s | « Parce que très vite, tout s'emmêle. La surface. Le budget. Le quartier. Le bail. Les visites. Et pendant ce temps… le temps file. » | Sur « très vite », la phrase s'effondre. Les critères tombent un à un et s'empilent, chaque critère cité avec son mot. « Et le temps file. », « file. » sur le mot ; « Délais » tombe en dernier |
| 14,3 – 15,25 s | (silence) | Une aiguille coud la pile rang par rang, puis le fil est tiré : les mots s'alignent dessus ; la musique se tait |
| 15,4 – 22 s | « Desk to Desk tire le fil. Un conseiller dédié. Un seul interlocuteur. Du brief… jusqu'à la remise des clés. » | Drop : store menthe, texte mot à mot avec la voix |
| 22,3 – 26,7 s | « Coworking ? Bureau opéré ? Bail commercial ? On vous aide à choisir. » | Les trois fiches, un panoramique par question |
| 27,1 – 44,4 s | Les 5 étapes, une phrase chacune | Une fiche par étape, la caméra arrive sur la phrase ; « loyer, charges, travaux, durée » soulignés au mot près, tampon « Négocié » juste après « durée » |
| 44,6 – 49,3 s | « Déjà installés ? On renégocie votre contrat. Une salle pour une journée ? On s'en occupe aussi. » | Les deux fiches services |
| 49,8 – 54,5 s | « À Paris, Lyon, Lille, Bordeaux… et jusqu'à Bruxelles, Barcelone ou Luxembourg. » | Un fil part de Paris vers chaque ville au moment où elle est nommée ; « et en Europe. » sur « et jusqu'à » |
| 54,75 – 58,3 s | « Et pour vous, c'est gratuit : c'est le propriétaire qui nous rémunère. » | Store menthe, « gratuit.* » sur le mot, mention complète |
| 58,75 – 65,7 s | « Vous développez votre entreprise. Desk to Desk s'occupe du reste. Parlez à un conseiller, sur desk to desk point com. » | La phrase ; le point écrit « Desk to Desk / s'occupe du reste » et devient son point final ; bouton ; adresse |
| 65,7 – 68 s | | Carte de fin tenue, la musique se pose |

## Vérification des affirmations

- « Un conseiller dédié… jusqu'à la remise des clés » : F3 ; « Un seul interlocuteur » : F4.
- Les 5 étapes : F5 ; négociation avec le bailleur (loyer, charges, travaux, durée) : F6, F9.
- Renégociation : F9 ; location ponctuelle (salles, bureaux à la journée) : F10 ; villes : F13.
- « C'est gratuit : c'est le propriétaire qui nous rémunère » : F11. L'exception (certaines offres en bail commercial)
  reste affichée à l'écran dans la mention, pendant toute la séquence et jusqu'à la fin.
- « Desk to Desk s'occupe du reste » : formule reprise du texte de référence du client.
