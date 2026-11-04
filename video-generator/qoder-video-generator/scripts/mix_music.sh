#!/usr/bin/env bash
# Music-only bed for a finished picture. No narration, no ducking.
#
# Duration comes from the FILM, never from a constant: the film was cut to the
# music (or the music is trimmed/looped to the film), so the bed is exactly as
# long as the picture. Loudness is normalised to the platform target instead of
# a hand-tuned dB offset, because every track arrives at a different level.
#
# The music is the creator's own - never substitute it with generated audio and
# never commit a path to their file.
#
# Usage:
#   bash scripts/mix_music.sh <film.mp4> <track> [out.wav]
#   FILM=... BGM=... OUT=... bash scripts/mix_music.sh
set -euo pipefail

FF="${FFMPEG:-ffmpeg}"
FP="${FFPROBE:-ffprobe}"
FILM="${1:-${FILM:-}}"
BGM="${2:-${BGM:-}}"
OUT="${3:-${OUT:-assets/audio/mix.wav}}"

if [ -z "$FILM" ] || [ -z "$BGM" ] || [ ! -f "$FILM" ] || [ ! -f "$BGM" ]; then
  echo "usage: bash scripts/mix_music.sh <film.mp4> <track> [out.wav]" >&2
  exit 2
fi

DUR=$("$FP" -v error -show_entries format=duration -of default=nw=1:nk=1 "$FILM")
FADE_OUT=$(awk -v d="$DUR" 'BEGIN{printf "%.3f", (d > 0.25 ? d - 0.25 : 0)}')
mkdir -p "$(dirname "$OUT")"

# -stream_loop -1 + -t DUR handles both cases: a track longer than the film is
# trimmed, a track shorter is looped. Fades sit at the real ends of the picture.
"$FF" -y -hide_banner -loglevel error -stream_loop -1 -i "$BGM" -t "$DUR" -vn \
  -af "afade=t=in:st=0:d=0.2,afade=t=out:st=${FADE_OUT}:d=0.25,loudnorm=I=-14:TP=-1:LRA=11" \
  -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"

# No implicit copy: point the composition at $OUT yourself (Remotion reads from
# remotion/public, so copy it there if that is where your audio lives).

echo "== $OUT  (${DUR}s from $FILM)"
"$FF" -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 \
  | grep -E "^\s+(I|Peak|LRA):" | tail -3
