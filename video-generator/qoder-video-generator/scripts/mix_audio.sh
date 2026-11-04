#!/usr/bin/env bash
# Voice + music bed for a finished picture.
#
# Duration comes from the FILM. Narration shorter than the picture is padded
# with silence; music longer is trimmed, shorter is looped. The bed is ducked
# under the voice with a side-chain compressor, then both are limited.
#
# The music is the creator's own - never substitute it with generated audio.
#
# Usage:
#   bash scripts/mix_audio.sh <film.mp4> <track> <narration.wav> [out.wav]
#   FILM=... BGM=... VOICE=... OUT=... bash scripts/mix_audio.sh
set -euo pipefail

FF="${FFMPEG:-ffmpeg}"
FP="${FFPROBE:-ffprobe}"
FILM="${1:-${FILM:-}}"
BGM="${2:-${BGM:-}}"
VOICE="${3:-${VOICE:-assets/audio/narration.wav}}"
OUT="${4:-${OUT:-assets/audio/mix.wav}}"

if [ -z "$FILM" ] || [ -z "$BGM" ] || [ ! -f "$FILM" ] || [ ! -f "$BGM" ]; then
  echo "usage: bash scripts/mix_audio.sh <film.mp4> <track> <narration.wav> [out.wav]" >&2
  exit 2
fi
if [ ! -f "$VOICE" ]; then
  echo "narration not found: $VOICE (music-only? then use scripts/mix_music.sh)" >&2
  exit 2
fi

DUR=$("$FP" -v error -show_entries format=duration -of default=nw=1:nk=1 "$FILM")
FADE_OUT=$(awk -v d="$DUR" 'BEGIN{printf "%.3f", (d > 0.25 ? d - 0.25 : 0)}')
BED_DB="${BED_DB:--18}"
mkdir -p "$(dirname "$OUT")"

# 1) music bed, looped/trimmed to the picture, faded at the real ends
"$FF" -y -hide_banner -loglevel error -stream_loop -1 -i "$BGM" -t "$DUR" -vn \
  -af "afade=t=in:st=0:d=1.0,afade=t=out:st=${FADE_OUT}:d=1.0,volume=${BED_DB}dB" \
  -ar 48000 -ac 2 -c:a pcm_s16le assets/audio/bgm_bed.wav

# 2) voice padded to the picture, bed ducked under it
"$FF" -y -hide_banner -loglevel error -i "$VOICE" -i assets/audio/bgm_bed.wav -filter_complex \
"[0:a]apad,atrim=0:${DUR},asetpts=PTS-STARTPTS[voice];\
 [1:a][voice]sidechaincompress=threshold=0.08:ratio=2.2:attack=25:release=650:makeup=1[duck];\
 [voice][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.92,loudnorm=I=-14:TP=-1:LRA=11[mix]" \
-map "[mix]" -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"

# No implicit copy: point the composition at $OUT yourself.

echo "== $OUT  (${DUR}s from $FILM)"
"$FF" -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 \
  | grep -E "^\s+(I|Peak|LRA):" | tail -3
