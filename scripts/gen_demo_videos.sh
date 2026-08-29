#!/bin/bash
# Genera videos demo "Ken Burns" (zoom respirando) desde los avatares para simular
# el feed remoto de videollamada de los usuarios demo de RONDA.
set -u
SRC="/home/z/my-project/public/avatars"
OUT="/home/z/my-project/public/demo-videos"
mkdir -p "$OUT"
DUR=26
FPS=24
for f in "$SRC"/*.jpg; do
  name="$(basename "$f" .jpg)"
  out="$OUT/${name}.mp4"
  if [ -s "$out" ]; then echo "skip $name"; continue; fi
  # Escala grande, zoom in-out suave (respiración) + paneo horizontal mínimo
  ffmpeg -y -loop 1 -i "$f" -vf "scale=1600:2133,zoompan=z='1.06+0.10*sin(2*PI*on/($FPS*$DUR))':x='iw/2-(iw/zoom/2)+12*sin(2*PI*on/($FPS*$DUR*0.7))':y='ih/2-(ih/zoom/2)':d=$FPS*$DUR:s=720x960:fps=$FPS,format=yuv420p" \
    -t $DUR -c:v libx264 -preset veryfast -crf 27 -movflags +faststart -an "$out" 2>/dev/null
  echo "done $name ($(du -h "$out" | cut -f1))"
done
echo "ALL_VIDEOS_DONE"
