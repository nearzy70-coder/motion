# Master du film « Le Fil » v2 (1:1, 1080 × 1080)

Version **pleine qualité**, sans réencodage pour la diffusion : H.264 High à environ 43 Mb/s (CRF 17), visuellement
sans perte, grain argentique d'origine intact. Audio AAC 192 kb/s 48 kHz, −14 LUFS.

GitHub refuse les fichiers de plus de 100 Mo : le master est découpé en 5 morceaux, à recoller **sans aucune perte**
(copie octet pour octet).

## Recoller le fichier

macOS / Linux (Terminal, dans ce dossier) :

```bash
cat desk-to-desk_le-fil-v2_1x1_master.mp4.part* > desk-to-desk_le-fil-v2_1x1_master.mp4
shasum -a 256 desk-to-desk_le-fil-v2_1x1_master.mp4   # doit afficher la somme du fichier .sha256
```

Windows (Invite de commandes, dans ce dossier) :

```bat
copy /b desk-to-desk_le-fil-v2_1x1_master.mp4.part00 + desk-to-desk_le-fil-v2_1x1_master.mp4.part01 + desk-to-desk_le-fil-v2_1x1_master.mp4.part02 + desk-to-desk_le-fil-v2_1x1_master.mp4.part03 + desk-to-desk_le-fil-v2_1x1_master.mp4.part04 desk-to-desk_le-fil-v2_1x1_master.mp4
certutil -hashfile desk-to-desk_le-fil-v2_1x1_master.mp4 SHA256
```

Somme de contrôle SHA-256 attendue : voir `desk-to-desk_le-fil-v2_1x1_master.mp4.sha256`.

## Quelle version utiliser ?

| Fichier | Usage |
|---------|-------|
| Master (ce dossier, 408 Mo) | Archive, montage, export vers d'autres formats, envoi à une régie publicitaire |
| `renders/final/desk-to-desk_le-fil-v2_1x1_1080x1080.mp4` (72 Mo, 7,8 Mb/s, mode grain de x264) | Mise en ligne directe sur les réseaux sociaux |

Les plateformes (Instagram, LinkedIn, Facebook…) réencodent toujours la vidéo envoyée : partir du master leur donne la meilleure matière.
