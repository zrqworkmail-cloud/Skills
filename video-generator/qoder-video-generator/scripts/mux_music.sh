#!/usr/bin/env bash
# Mux a finished music bed onto a finished SILENT picture. Video is copied,
# never re-encoded: adding sound must not change one pixel of the picture.
#
# This is the `post_mux` branch of audio.mode. The other branch is `remotion`,
# where the bed lives in remotion/public/audio and is rendered with the picture.
#
# The music is the creator's own - never substitute it with generated audio and
# never commit a path to their file.
#
# Usage:
#   bash scripts/mux_music.sh <silent.mp4> <bed.wav> <out.mp4> [audio-bitrate]
#   AUDIO_BITRATE=256k bash scripts/mux_music.sh ...
#
# Verifies, on the OUTPUT file:
#   1. video stream md5 is byte-identical to the silent master
#   2. audio starts at 0 and is as long as the picture (±1 frame)
#   3. faststart (moov before mdat)
#   4. delivered AAC loudness -14 ±0.5 LUFS, true peak <= -1 dBFS
#
# A bed is not normalized here. Run scripts/mix_music.sh (or your own splice) first;
# this script only packages and proves.
set -uo pipefail

FF="${FFMPEG:-ffmpeg}"
FP="${FFPROBE:-ffprobe}"

VIDEO="${1:-${FILM:-}}"
BED="${2:-${BED:-}}"
OUT="${3:-${OUT:-}}"
BR="${4:-${AUDIO_BITRATE:-256k}}"

if [ -z "$VIDEO" ] || [ -z "$BED" ] || [ -z "$OUT" ] \
   || [ ! -f "$VIDEO" ] || [ ! -f "$BED" ]; then
  echo "usage: bash scripts/mux_music.sh <silent.mp4> <bed.wav> <out.mp4> [audio-bitrate]" >&2
  exit 2
fi
if [ "$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")" = \
     "$(cd "$(dirname "$VIDEO")" && pwd)/$(basename "$VIDEO")" ]; then
  echo "refuse: output would overwrite the silent master" >&2
  exit 2
fi

fails=""
note_fail() { fails="$fails
  - $1"; }

video_dur() {
  local d
  d=$("$FP" -v error -select_streams v:0 -show_entries stream=duration \
      -of default=nw=1:nk=1 "$1")
  [ "$d" = "N/A" ] && d=$("$FP" -v error -show_entries format=duration \
      -of default=nw=1:nk=1 "$1")
  printf '%s' "$d"
}
bed_dur() {
  "$FP" -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"
}
video_md5() {
  "$FF" -v error -i "$1" -map 0:v:0 -c copy -f md5 - \
    | sed -n 's/^MD5=//p' | tail -1
}

VDUR=$(video_dur "$VIDEO")
BDUR=$(bed_dur "$BED")
echo "== silent: $VIDEO  (${VDUR}s)"
echo "== bed:    $BED  (${BDUR}s)"
awk -v b="$BDUR" -v v="$VDUR" 'BEGIN{d=b-v; if(d<0)d=-d; exit !(d <= 0.05)}' \
  || { echo "REFUSE: bed ${BDUR}s != picture ${VDUR}s (±0.05 s). Cut/fade the bed, do not trim blindly." >&2; exit 2; }

IN_AUDIO=$("$FP" -v error -select_streams a -show_entries stream=index \
  -of csv=p=0 "$VIDEO" | wc -l | tr -d ' ')
[ "$IN_AUDIO" != "0" ] && echo "note: silent master already has $IN_AUDIO audio stream(s); they will be dropped"

MD5_IN=$(video_md5 "$VIDEO")
echo "== video md5 before: $MD5_IN"
mkdir -p "$(dirname "$OUT")"

"$FF" -y -hide_banner -loglevel error \
  -i "$VIDEO" -i "$BED" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy \
  -c:a aac -b:a "$BR" -ar 48000 -ac 2 \
  -map_metadata 0 -movflags +faststart \
  "$OUT" || { echo "MUX_FAILED $OUT" >&2; exit 1; }

echo
echo "== verify delivered file"
MD5_OUT=$(video_md5 "$OUT")
echo "   video md5 after:  $MD5_OUT"
[ "$MD5_OUT" = "$MD5_IN" ] || note_fail "视频流 md5 变了（画面被重编码或裁切）"

ASTART=$("$FP" -v error -select_streams a:0 -show_entries stream=start_time \
  -of default=nw=1:nk=1 "$OUT")
ASTART=${ASTART:-0}
[ "$ASTART" = "N/A" ] && ASTART=0
ADUR=$("$FP" -v error -select_streams a:0 -show_entries stream=duration \
  -of default=nw=1:nk=1 "$OUT")
VDUR_OUT=$(video_dur "$OUT")
FPS_R=$("$FP" -v error -select_streams v:0 -show_entries stream=r_frame_rate \
  -of default=nw=1:nk=1 "$OUT")
FPSV=$(awk -F/ '{printf "%.6f", ($2 ? $1/$2 : $1)}' <<< "$FPS_R")
echo "   video ${VDUR_OUT}s   audio start=${ASTART}s dur=${ADUR}s   fps=${FPSV}"
awk -v s="$ASTART" 'BEGIN{exit !(s >= -0.001 && s <= 0.001)}' \
  || note_fail "音轨起点 ${ASTART}s != 0"
awk -v a="$ADUR" -v v="$VDUR_OUT" -v f="$FPSV" \
  'BEGIN{d=a-v; if(d<0)d=-d; exit !(d <= 1.0/f + 0.005)}' \
  || note_fail "声画时长不一致（audio ${ADUR}s vs video ${VDUR_OUT}s）"

MOOV=$(LC_ALL=C grep -abo -m1 "moov" "$OUT" | head -1 | cut -d: -f1)
MDAT=$(LC_ALL=C grep -abo -m1 "mdat" "$OUT" | head -1 | cut -d: -f1)
if [ -n "$MOOV" ] && [ -n "$MDAT" ] && [ "$MOOV" -lt "$MDAT" ]; then
  echo "   faststart: moov@$MOOV < mdat@$MDAT"
else
  note_fail "moov 不在 mdat 前（非 faststart）"
fi

LOUD=$("$FF" -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 >/dev/null)
printf '%s\n' "$LOUD" | grep -E "^\s+(I|Peak|LRA):" | tail -3
I=$(printf '%s\n' "$LOUD" | awk -F: '/^[[:space:]]*I:/{v=$2; gsub(/[^0-9.+-]/,"",v); print v; exit}')
PK=$(printf '%s\n' "$LOUD" | awk -F: '/^[[:space:]]*Peak:/{v=$2; gsub(/[^0-9.+-]/,"",v); print v; exit}')
if [ -z "$I" ] || [ -z "$PK" ]; then
  note_fail "交付 AAC 响度无法解析"
else
  awk -v i="$I" 'BEGIN{exit !(i >= -14.5 && i <= -13.5)}' \
    || note_fail "交付响度 ${I} LUFS 超出 -14±0.5"
  awk -v p="$PK" 'BEGIN{exit !(p <= -1.0)}' \
    || note_fail "交付 True Peak ${PK} dBFS 高于 -1.0"
fi

echo
if [ -n "$fails" ]; then
  echo "MUX VERIFY FAILED:$fails" >&2
  echo "file kept for diagnosis: $OUT" >&2
  exit 1
fi
echo "MUX OK $OUT"
echo "   picture byte-identical · audio start 0 · durations match · faststart · ${I} LUFS / TP ${PK}"
