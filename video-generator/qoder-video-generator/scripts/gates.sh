#!/usr/bin/env bash
# One command: measure a delivered film against every numeric gate.
#
# Everything that must be true about an output file lives here, in the order the
# eye should read it, and every number is measured on the file that will actually
# be uploaded - never on a still.
#
# Usage (from the project root; PROJECT defaults to the current directory):
#   bash <path-to-tools>/gates.sh <film.mp4> [--prev build/yavg_vNN.txt] [--tag v29]
#       [--cpu build/cpu_v29.csv] [--video-md5 <silent-master video md5>]
#       [--allow-silent]
#   PROJECT=examples/rain-70 bash Qoder/scripts/gates.sh examples/rain-70/outputs/x.mp4
#
# Exit code is non-zero when a FAILING gate fails; WARNs are printed but do not
# fail the run (a 1.5x upscale of a generated plate is a choice, not an error).
#
# A missing audio track is a FAIL when the project declares sound
# (audio.mode=remotion|post_mux). Use --allow-silent only while iterating on
# picture; never for the delivery run.
set -uo pipefail

TOOLS=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)      # location-independent
PROJECT=$(cd "${PROJECT:-$PWD}" && pwd)
cd "$PROJECT"

# anaconda python is a Windows process: hand it Windows paths where it calls .exe
PROJECTW=$(cygpath -w "$PROJECT" 2>/dev/null || echo "$PROJECT")
FF="${FFMPEG:-ffmpeg}"
FP="${FFPROBE:-ffprobe}"
PY="${PY:-python3}"
IN=""
PREV=""
TAG="gate"
CPU=""
EXPECT_MD5=""
ALLOW_SILENT=0

while [ $# -gt 0 ]; do
  case "$1" in
    --prev) PREV="$2"; shift 2;;
    --tag) TAG="$2"; shift 2;;
    --cpu) CPU="$2"; shift 2;;
    --video-md5) EXPECT_MD5=$(printf '%s' "$2" | tr 'A-Z' 'a-z'); shift 2;;
    --allow-silent) ALLOW_SILENT=1; shift;;
    *) IN="$1"; shift;;
  esac
done
if [ -z "$IN" ] || [ ! -f "$IN" ]; then
  echo "usage: bash scripts/gates.sh <film.mp4> [--prev build/yavg_vNN.txt] [--tag v29]"
  echo "         [--cpu build/cpu_v29.csv] [--video-md5 <hash>] [--allow-silent]"
  exit 2
fi
IN_WIN=$(cygpath -w "$IN" 2>/dev/null || echo "$IN")
WORK="build/gates_$TAG"
mkdir -p "$WORK"
fails=""
warns=""
note_fail() { fails="$fails
  - $1"; }
note_warn() { warns="$warns
  - $1"; }

echo "################ 0 · 输入 ################"
echo "project: $PROJECT"
echo "file: $IN"
$FP -v error -select_streams v:0 -show_entries \
  stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt -of default=nw=1 "$IN"
$FP -v error -select_streams a:0 -show_entries \
  stream=codec_name,sample_rate,channels,bit_rate -of default=nw=1 "$IN"
$FP -v error -show_entries format=duration,size,bit_rate -of default=nw=1 "$IN"

AUDIO_COUNT=$($FP -v error -select_streams a -show_entries stream=index \
  -of csv=p=0 "$IN" | wc -l | tr -d ' ')
AUDIO_MODE=""
if [ -f spec/shotlist.json ]; then
  AUDIO_MODE=$($PY -X utf8 - "$PROJECTW" <<'PY' | tr -d '\r\n'
import json, sys
try:
    d = json.load(open(sys.argv[1] + "/spec/shotlist.json", encoding="utf-8"))
    print((d.get("audio") or {}).get("mode", ""))
except Exception:
    print("")
PY
)
fi
echo "audio streams: $AUDIO_COUNT   audio.mode: ${AUDIO_MODE:-未声明}"

if [ "$AUDIO_COUNT" = "0" ]; then
  if [ "$ALLOW_SILENT" = "1" ]; then
    echo "note: 无音轨（--allow-silent）：只过画面闸门，交付前必须去掉这个开关重跑"
    note_warn "无音轨：--allow-silent 只过画面闸门，交付前必须去掉这个开关重跑"
  elif [ "$AUDIO_MODE" = "none" ]; then
    echo "note: 无音轨（audio.mode=none）"
  else
    note_fail "成片没有音轨（audio.mode=${AUDIO_MODE:-未声明}）；交付前必须封装，或 --allow-silent 只跑画面"
    echo
    echo "FAILING GATES:$fails"
    exit 1
  fi
fi

echo
echo "################ 1 · 结构闸门（渲染前就该跑，这里复核素材假设）################"
$PY -X utf8 "$TOOLS/plate_gate.py" || note_fail "plate_gate 报告 FAIL"

echo
echo "################ 2 · 响度（抖音口径 -14 ±0.5 LUFS / TP <= -1 dBFS）################"
if [ "$AUDIO_COUNT" != "0" ]; then
  $FF -hide_banner -nostats -i "$IN" -af ebur128=peak=true -f null - 2> "$WORK/loudness.txt"
  grep -E "^\s+(I|Peak|LRA):" "$WORK/loudness.txt" | tail -6
  I=$(awk -F: '/^[[:space:]]*I:/{v=$2; gsub(/[^0-9.+-]/,"",v); print v; exit}' "$WORK/loudness.txt")
  PK=$(awk -F: '/^[[:space:]]*Peak:/{v=$2; gsub(/[^0-9.+-]/,"",v); print v; exit}' "$WORK/loudness.txt")
  echo "   parsed: I=${I:-?} LUFS  TP=${PK:-?} dBFS"
  if [ -z "$I" ] || [ -z "$PK" ]; then
    note_fail "响度无法解析（$WORK/loudness.txt）"
  else
    awk -v i="$I" 'BEGIN{exit !(i >= -14.5 && i <= -13.5)}' \
      || note_fail "响度 ${I} LUFS 超出 -14±0.5"
    awk -v p="$PK" 'BEGIN{exit !(p <= -1.0)}' \
      || note_fail "True Peak ${PK} dBFS 高于 -1.0"
  fi
else
  echo "(无音轨：响度闸门跳过)"
fi

echo
echo "################ 2b · 音画与封装 ################"
GOT_MD5=$($FF -v error -i "$IN" -map 0:v:0 -c copy -f md5 - \
  | sed -n 's/^MD5=//p' | tail -1)
echo "   video stream md5: ${GOT_MD5:-?}"
if [ -n "$EXPECT_MD5" ]; then
  if [ "$GOT_MD5" = "$EXPECT_MD5" ]; then
    echo "   md5 matches the silent master"
  else
    note_fail "视频流 md5 与静音母版不同（画面被重编码或裁切）"
  fi
fi
if [ "$AUDIO_COUNT" != "0" ]; then
  VSTART=$($FP -v error -select_streams v:0 -show_entries stream=start_time \
    -of default=nw=1:nk=1 "$IN")
  VSTREAM_DUR=$($FP -v error -select_streams v:0 -show_entries stream=duration \
    -of default=nw=1:nk=1 "$IN")
  ASTART=$($FP -v error -select_streams a:0 -show_entries stream=start_time \
    -of default=nw=1:nk=1 "$IN")
  ASTREAM_DUR=$($FP -v error -select_streams a:0 -show_entries stream=duration \
    -of default=nw=1:nk=1 "$IN")
  FPS_R=$($FP -v error -select_streams v:0 -show_entries stream=r_frame_rate \
    -of default=nw=1:nk=1 "$IN")
  [ "$VSTREAM_DUR" = "N/A" ] && VSTREAM_DUR=$($FP -v error -show_entries \
    format=duration -of default=nw=1:nk=1 "$IN")
  [ "$ASTREAM_DUR" = "N/A" ] && ASTREAM_DUR=$($FP -v error -show_entries \
    format=duration -of default=nw=1:nk=1 "$IN")
  [ "$ASTART" = "N/A" ] && ASTART=0
  FPSV=$(awk -F/ '{printf "%.6f", ($2 ? $1/$2 : $1)}' <<< "$FPS_R")
  echo "   video start=$VSTART dur=$VSTREAM_DUR  audio start=$ASTART dur=$ASTREAM_DUR  fps=$FPSV"
  awk -v s="$ASTART" 'BEGIN{exit !(s >= -0.001 && s <= 0.001)}' \
    || note_fail "音轨起点 ${ASTART}s != 0"
  awk -v a="$ASTREAM_DUR" -v v="$VSTREAM_DUR" -v f="$FPSV" \
    'BEGIN{d=a-v; if(d<0)d=-d; exit !(d <= 1.0/f + 0.005)}' \
    || note_fail "声画时长不一致（audio ${ASTREAM_DUR}s vs video ${VSTREAM_DUR}s）"
else
  echo "   (无音轨：音画检查跳过)"
fi
MOOV=$(LC_ALL=C grep -abo -m1 "moov" "$IN" | head -1 | cut -d: -f1)
MDAT=$(LC_ALL=C grep -abo -m1 "mdat" "$IN" | head -1 | cut -d: -f1)
if [ -n "$MOOV" ] && [ -n "$MDAT" ] && [ "$MOOV" -lt "$MDAT" ]; then
  echo "   faststart: moov@$MOOV < mdat@$MDAT"
else
  note_fail "moov 不在 mdat 前（非 faststart）"
fi

echo
echo "################ 3 · 逐帧亮度（忽明忽暗的主证据）################"
# signalstats' metadata file must be a RELATIVE path - drive letters break the filter.
$FF -hide_banner -nostats -i "$IN" \
  -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=build/yavg_$TAG.txt" \
  -f null -
if [ -n "$PREV" ]; then
  $PY -X utf8 "$TOOLS/luma_report.py" "$PREV" "build/yavg_$TAG.txt" || note_fail "luma_report"
  echo
  echo "---- 逐镜均值 / 切点台阶（对比上一版）"
  $PY -X utf8 "$TOOLS/shot_means_diff.py" "$PREV" "build/yavg_$TAG.txt" || note_fail "shot_means_diff"
else
  $PY -X utf8 "$TOOLS/luma_report.py" "build/yavg_$TAG.txt" || note_fail "luma_report"
  echo "(no --prev given: 台阶对比表跳过；跨版本趋势必须靠它)"
fi
echo
echo "---- 素材稳（I2V 镜内摆幅，阈值 4.0）"
$PY -X utf8 "$TOOLS/plate_swing.py" "build/yavg_$TAG.txt" || note_fail "plate_swing 超阈值"

echo
echo "################ 4 · 动效（成片上量静止段与能量）################"
$PY -X utf8 "$TOOLS/motion_energy.py" "$IN" \
  --timeline spec/beat_timeline.json --shotlist spec/shotlist.json || note_fail "motion_energy 有超时静止段"

echo
echo "################ 5 · 平台安全区（底部 UI / 右侧操作栏）################"
$PY -X utf8 "$TOOLS/safezone_check.py" "$IN_WIN" || note_fail "safezone_check"
echo
echo "---- 静态字号/右端估算（源码层，不看成片）"
$PY -X utf8 "$TOOLS/text_right_edge.py" | tail -4

echo
echo "################ 6 · 字幕带压字检查（成片上抽帧）################"
# Default sample = the middle of every shot that carries a caption line, so the
# frames are chosen by the timeline, not by what I happened to type last time.
$PY -X utf8 - "$PROJECTW" "$WORK/frames.txt" <<'PY'
import json, sys
root, out = sys.argv[1], sys.argv[2]
d = json.load(open(f"{root}/spec/beat_timeline.json", encoding="utf-8"))
pick = []
for s in d["shots"]:
    if s.get("lines"):
        pick.append(s["start"] + s["dur"] // 2)
seen, sel = set(), []
for f in pick:
    if f not in seen:
        seen.add(f); sel.append(f)
open(out, "w").write("+".join(f"eq(n\\,{f})" for f in sel))
print(f"sampled {len(sel)} shot middles: {sel[:8]}{' ...' if len(sel) > 8 else ''}")
PY
if [ -s "$WORK/frames.txt" ]; then
  $FF -hide_banner -y -loglevel error -i "$IN" \
     -vf "select='$(cat "$WORK/frames.txt")'" -fps_mode passthrough -an "$WORK/z%03d.png"
  $PY -X utf8 "$TOOLS/text_zone_check.py" "$WORK"/z*.png || note_fail "text_zone_check"
else
  echo "(timeline has no caption lines: 这是纯画面片，跳过字幕带检查)"
fi

echo
echo "################ 7 · 文案与卡点审计 ################"
# The caption text the film actually prints, projected out of the shotlist, is
# what gets scanned - a stale narration.txt will drift.
if [ -f spec/shotlist.json ]; then
  $PY -X utf8 - "$PROJECTW" "$WORK/captions.txt" <<'PY'
import json, sys
root, out = sys.argv[1], sys.argv[2]
sl = json.load(open(f"{root}/spec/shotlist.json", encoding="utf-8"))
lines = [s.get("narration", "").strip() for s in sl["shots"]]
lines = [l for l in lines if l]
open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print(f"{len(lines)} caption lines -> {out}")
PY
  # The Chinese AI-tell scanner lives in the user-level skill dir, which is NOT
  # under ~ in this shell (see WORKFLOW.md §0) - resolve it the same way env_report does.
  PROFILE=$(cygpath -u "${USERPROFILE:-$HOME}" 2>/dev/null || echo "$HOME")
  SCAN="${SKILLS_DIR:-$HOME/.qoder/skills}/knowledge-video-script/scripts/scan_script.py"
  if [ -f "$SCAN" ]; then
    $PY -X utf8 "$SCAN" --file "$WORK/captions.txt" 2>&1 | tail -14
  else
    echo "(scan_script.py not found at $SCAN - 中文 AI 腔闸门跳过，改跑前先跑 scripts/env_report.sh)"
  fi
fi
# Keep the full audit log; the exit code is the gate, the tail is for reading.
$PY -X utf8 "$TOOLS/audit_music_cut.py" > "$WORK/audit.txt" 2>&1
AUDIT_RC=$?
tail -12 "$WORK/audit.txt"
if [ "$AUDIT_RC" != "0" ]; then
  note_fail "audit_music_cut 报告问题（全文 $WORK/audit.txt）"
elif grep -q "^warnings:" "$WORK/audit.txt"; then
  note_warn "audit_music_cut 有 WARN（全文 $WORK/audit.txt；交付说明里要列出来）"
fi

echo
echo "################ 8 · 机器代价 ################"
CPU_CSV="${CPU:-build/cpu_$TAG.csv}"
if [ -f "$CPU_CSV" ]; then
  node "$TOOLS/cpu_stats.mjs" "$CPU_CSV"
elif [ -f "$WORK/cpu.csv" ]; then
  node "$TOOLS/cpu_stats.mjs" "$WORK/cpu.csv"
else
  note_warn "没有 CPU 样本（找过 $CPU_CSV 与 $WORK/cpu.csv）；每次渲染都必须报 over80 样本数"
  echo "(no CPU sample; render with scripts/render.sh, or pass --cpu <csv>)"
fi

echo
echo "################ 汇总 ################"
if [ -n "$warns" ]; then
  echo "WARNINGS:$warns"
fi
if [ -n "$fails" ]; then
  echo "FAILING GATES:$fails"
  exit 1
fi
echo "所有闸门通过（WARN 不算失败，但要在交付说明里列出）。"
