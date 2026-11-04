#!/usr/bin/env bash
# Render one Remotion composition with this machine's rules baked in.
#
# Each line here exists because of a measured failure:
#   * never `source an external env.sh` - it exports OMP_NUM_THREADS=1, GNU nproc then
#     reports 1 core, and Remotion refuses any --concurrency > 1 ("Available CPU
#     cores: 1"). The env file is for the python/ffmpeg tools, not for the render.
#   * --port is mandatory and must be free; a killed TaskStop leaves the render
#     child alive holding the port. Report it; never kill another task's process.
#   * the CPU sample must go to a UNIQUE csv - a leftover typeperf from a failed
#     run keeps its own file locked and the next pass silently writes nothing,
#     which once produced a "valid-looking" 4-sample table from an old run.
#   * measured here: concurrency=1 -> mean 32.6 %, max 73.5 %, over80 = 0.
#     concurrency>1 has crossed the 80 % ceiling before (HyperFrames spike: 4
#     workers -> p95 81.7 %). So the default is 1 and raising it is a decision
#     you re-measure, not a speed dial.
#
# Usage (run from the project root; PROJECT defaults to the current directory):
#   bash <tools>/render.sh <out.mp4> [--comp Film] [--concurrency 1] [--port 3134]
#   bash <tools>/render.sh --still <out.png> --frame 90 [--comp LD-s05-plot]
#   bash <tools>/render.sh <out.mp4> --frames 161-416      # one shot, for look-dev
#
# Extra Remotion flags (simple flags, no spaces inside values) can be passed via
# REMOTION_EXTRA_ARGS, e.g. on this machine's overfit film:
#   REMOTION_EXTRA_ARGS="--disable-shared-memory-capture --jpeg-quality=95" ...
# Why: chrome-headless-shell here crashed its GPU process at ~frame 39 of a
# 3371-frame render (viz CopyOutputResultSender / write EOF). Disabling shared-
# memory capture rendered 804 frames in a 90 s test without a crash.
set -uo pipefail

PROJECT=$(cd "${PROJECT:-$PWD}" && pwd)
REMOTION="$PROJECT/remotion"
[ -d "$REMOTION" ] || { echo "no remotion/ under $PROJECT" >&2; exit 2; }
# npm 11 / node 25 here can refuse to resolve the local bin ("could not determine
# executable to run") even though node_modules/.bin/remotion exists. Call the CLI
# entry directly; never fall back to npx, which may download missing packages.
if [ -f "$REMOTION/node_modules/@remotion/cli/remotion-cli.js" ]; then
  REMOTION_CMD=(node "$REMOTION/node_modules/@remotion/cli/remotion-cli.js")
else
  echo "MISSING_DEPENDENCY: local @remotion/cli under $REMOTION; install project dependencies explicitly before rendering." >&2
  exit 2
fi
COMP="Film"
CONC=1
PORT=3134
FRAMES=""
MODE="render"
OUT=""
FRAME=0

while [ $# -gt 0 ]; do
  case "$1" in
    --still) MODE="still"; shift;;
    --comp) COMP="$2"; shift 2;;
    --concurrency) CONC="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --frames) FRAMES="$2"; shift 2;;
    --frame) FRAME="$2"; shift 2;;
    *) OUT="$1"; shift;;
  esac
done
[ -z "$OUT" ] && { echo "usage: bash scripts/render.sh [--still] <out> [--comp C] [--frames A-B] [--concurrency N] [--port P]"; exit 2; }
# Remotion runs from remotion/, so ANY relative path would land there instead of
# where the caller said. Name the sample/log files from the path while it is
# still bash-readable, make the directory, then hand Remotion an absolute
# Windows path (cygpath -aw is idempotent on Windows-style inputs).
TAG=$(basename "$OUT"); TAG=${TAG%.*}
mkdir -p "$(dirname "$OUT")" "$PROJECT/build" || exit 2
OUT=$(cygpath -aw "$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")" 2>/dev/null || echo "$OUT")

# Port preflight: a killed agent leaves the render child alive holding 3134,
# and the next render silently attaches to the old Studio (stale code) or dies
# at startup. Report the PID and stop; never auto-kill a process we did not start.
PORT_LINES=$(netstat -ano 2>/dev/null | grep -E "[:.]${PORT}[[:space:]]" \
  | grep -i "LISTENING" || true)
if [ -n "$PORT_LINES" ]; then
  echo "PORT_IN_USE $PORT" >&2
  echo "$PORT_LINES" | head -5 >&2
  RPID=$(echo "$PORT_LINES" | awk '{print $NF}' | head -1)
  echo "   pid=$RPID  $(tasklist //FI "PID eq $RPID" //FO CSV //NH 2>/dev/null | head -1)" >&2
  echo "   确认是上一次渲染的遗留进程后再结束它；不要结束别人的进程。" >&2
  exit 2
fi

# Stills do not start or clean up a CPU sampler.
if [ "$MODE" = "still" ]; then
  echo "== still: $COMP frame=$FRAME -> $OUT"
  ( cd "$REMOTION" && "${REMOTION_CMD[@]}" still "$COMP" "$OUT" --frame="$FRAME" --port="$PORT" )     || { echo "STILL_FAILED $OUT" >&2; exit 1; }
  echo "STILL_DONE $OUT"
  exit 0
fi

CSV="$PROJECT/build/cpu_${TAG}.csv"                         # bash side (rm / echo)
CSVW=$(cygpath -w "$CSV" 2>/dev/null || echo "$CSV")     # typeperf is a Windows exe
rm -f "$CSV"

echo "== render preflight"
echo "   comp=$COMP  concurrency=$CONC  port=$PORT  frames=${FRAMES:-whole film}"
echo "   cpu sample -> $CSV"
if [ "$CONC" != "1" ]; then
  echo "   NOTE: concurrency>1 是决定，不是默认。上一次越线记录：4 worker p95 81.7 %。"
fi

TP=""
cleanup_sample() {
  local pid
  [ -n "$TP" ] || return 0
  # Only our still-running Bash job is eligible, not an exited/reused PID.
  for pid in $(jobs -pr); do
    if [ "$pid" = "$TP" ]; then
      # Bash's builtin kill can leave a native Windows child alive. Git Bash's
      # external kill -f uses the native handle for this MSYS PID (not a WINPID).
      /usr/bin/kill.exe -f -s KILL "$TP" 2>/dev/null || true
      break
    fi
  done
  wait "$TP" 2>/dev/null || true
  TP=""
}
trap cleanup_sample EXIT
# Defer signals across launch/$! assignment so the child cannot escape cleanup.
SAMPLE_EXIT=0
trap 'SAMPLE_EXIT=130' INT
trap 'SAMPLE_EXIT=143' TERM
trap 'SAMPLE_EXIT=129' HUP
# Override only the executable path (no arguments); wrappers must exec it so
# $! remains the actual sampler child rather than an unrelated launcher.
"${TYPEPERF_EXE:-/c/Windows/System32/typeperf.exe}" "\\Processor(_Total)\\% Processor Time" \
  -sc 2400 -si 3 -f CSV -o "$CSVW" >/dev/null 2>&1 &
TP=$!
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
[ "$SAMPLE_EXIT" -eq 0 ] || exit "$SAMPLE_EXIT"

EXTRA=${REMOTION_EXTRA_ARGS:-}
( cd "$REMOTION" && "${REMOTION_CMD[@]}" render "$COMP" "$OUT" \
    --port="$PORT" \
    --concurrency="$CONC" \
    --codec=h264 \
    --crf=18 \
    --pixel-format=yuv420p \
    --audio-codec=aac \
    --audio-bitrate=320k \
    ${FRAMES:+--frames="$FRAMES"} \
    ${EXTRA:+$EXTRA} \
    2>&1 | tee "$PROJECT/build/render_${TAG}.log" )
RC=${PIPESTATUS[0]}

cleanup_sample

echo
if [ "$RC" != "0" ]; then echo "RENDER_FAILED $OUT (exit $RC)" >&2; exit "$RC"; fi
echo "RENDER_DONE $OUT"
echo "下一步（不许跳过）："
echo "  bash <tools>/gates.sh $OUT --prev build/yavg_<上一版>.txt --tag $TAG"
echo "  然后把 over80 样本数写进 STATUS.md：node <tools>/cpu_stats.mjs build/cpu_${TAG}.csv"
