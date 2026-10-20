#!/usr/bin/env bash
# Contrôle technique des exports : flux, durée, intégrité du décodage, loudness, images noires / figées,
# planche contact construite à partir du MP4 réellement encodé.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in renders/final/*.mp4; do
  echo "=== $f ($(du -h "$f" | cut -f1))"
  ffprobe -v error -show_entries format=duration,bit_rate:stream=index,codec_name,profile,width,height,r_frame_rate,nb_frames,pix_fmt,color_space,color_transfer,color_primaries,sample_rate,channels,bit_rate -of compact "$f"
  echo "-- décodage complet (erreurs éventuelles ci-dessous)"
  ffmpeg -v error -i "$f" -f null - && echo "décodage OK"
  echo "-- loudness"
  ffmpeg -hide_banner -nostats -i "$f" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A16 Summary | grep -E "I:|LRA:|Peak:" || true
  echo "-- images noires (> 0,1 s) et images figées (> 1,5 s)"
  ffmpeg -hide_banner -nostats -i "$f" -vf "blackdetect=d=0.1:pix_th=0.02,freezedetect=n=0.001:d=1.5" -an -f null - 2>&1 | grep -E "black_start|freeze_start|freeze_end|freeze_duration" || echo "aucune"
done
mkdir -p renders/stills
ffmpeg -y -v error -i renders/final/desk-to-desk_le-fil_9x16_1080x1920.mp4 -vf "fps=2,scale=216:384,tile=11x6:padding=4:color=0x222222" -frames:v 1 -q:v 3 renders/stills/planche-contact.jpg
echo "Planche : renders/stills/planche-contact.jpg"
