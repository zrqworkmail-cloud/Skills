#!/usr/bin/env bash
# Environment readiness report for the film pipeline.  Read-only.
#
# Why this is a script and not notes: every capability here was observed to be
# present one day and absent the next (a pip package that never got installed,
# a ComfyUI server only up while the user keeps it open, a cloud skill with no
# credentials). WORKFLOW.md says "stage N runs if the probe says yes" — this is
# the probe. Run it at the start of a film and after installing anything, and
# never quote a stage as available from memory.
#
# It must not change the machine: the HyperFrames CLI is therefore checked as a
# cached package, NOT via a bare `npx hyperframes`, which silently downloads and
# installs the newest version as a side effect of asking for a version number.
#
# Usage:  bash scripts/env_report.sh
set -uo pipefail

# Everything machine-specific is overridable so this file can live in a repo:
#   PY=python3  SKILLS_DIR=...  bash scripts/env_report.sh
# Note for this machine: `~` resolves to the CLI's working dir, not the Windows
# profile, so the skill dir has to be given explicitly (see WORKFLOW.md §0).
# Global installs must probe PROJECT (if set), otherwise the caller's actual cwd.
PROJECT_ROOT="${PROJECT:-$(pwd -P)}"
PROJECT_ROOT=$(cygpath -au "$PROJECT_ROOT" 2>/dev/null || printf '%s' "$PROJECT_ROOT")
WPY="${PY:-python3}"
WROOT_WIN=$(cygpath -w "$PROJECT_ROOT" 2>/dev/null || printf '%s' "$PROJECT_ROOT")
# `~` is NOT the user profile in this shell (the CLI sets HOME to its own working
# dir), and skill packs live in both places: user-level skills under the Windows
# profile, the hyperframes family under the CLI dir. So resolve by marker file
# over a candidate list instead of trusting one root.
PROFILE=$(cygpath -u "${USERPROFILE:-$HOME}" 2>/dev/null || echo "$HOME")
pick_dir() { # marker, then candidates
  local marker="$1"; shift
  local c
  for c in "$@"; do [ -e "$c/$marker" ] && { printf '%s' "$c"; return; }; done
  printf '%s' "${1:-}"
}
SKILLS="${SKILLS_DIR:-$(pick_dir knowledge-video-script "$HOME/.qoder/skills" "$HOME/.qoder/skills")}"
AGENTS="${AGENTS_DIR:-$(pick_dir hyperframes "$HOME/.agents/skills" "$HOME/.agents/skills")}"
NPX_CACHE="$(npm config get cache 2>/dev/null || echo "$PROFILE/.npm")/_npx"

READY=0; ONDEMAND=0; BLOCKED=0

say() { # state id label note
  printf '[%-9s] %-22s %s\n' "$1" "$2" "$3"
  [ -n "${4:-}" ] && printf '             %-22s └ %s\n' "" "$4"
  case "$1" in
    READY) READY=$((READY+1));;
    ONDEMAND) ONDEMAND=$((ONDEMAND+1));;
    *) BLOCKED=$((BLOCKED+1));;
  esac
}

# probe id label check note         -> READY when the command succeeds, else BLOCKED
probe() {
  if eval "$3" >/dev/null 2>&1; then say READY "$1" "$2" "$4"; else say BLOCKED "$1" "$2" "$4"; fi
}

echo "==================================================================="
echo " 本地视频产线 · 能力就绪报告   $(date '+%F %T')"
 echo " 只有 READY 的 stage 可以写进今天的计划。"
echo "==================================================================="
echo "-- 工具链 --"

probe core.ffmpeg "ffmpeg / ffprobe" \
  "[ -n "$(command -v ffmpeg)" ] && [ -n "$(command -v ffprobe)" ]" \
  "ffmpeg 不在 PATH；python 子进程需使用可识别的解释器路径"
probe core.python "anaconda python + 图像库" \
  "\"\$WPY\" -c 'import PIL,numpy,cv2'" \
  "$WPY；一律 -X utf8，否则中文按 GBK 崩"
probe core.node "node" "node --version" "$(node --version 2>/dev/null)"
probe core.remotion "Remotion 本地包标记" \
  '[ -d "$PROJECT_ROOT/remotion/node_modules/remotion" ]' \
  "只检查目标项目包目录；渲染另需本地 @remotion/cli 与项目接线，不自动 npx 下载；不加载外部 env.sh"

echo "-- 画面生成 --"
probe gen.comfy "ComfyUI 本地 Wan2.2 I2V" \
  "curl -s -m 2 http://127.0.0.1:8188/system_stats" \
  "只在用户手动开着时可用；NO 时关键帧改走 ImageGen，I2V 镜改走实拍/图形承载物"
say ONDEMAND gen.imagegen "Qoder ImageGen（内置）" \
  "静态/按需提示：未实际调用；shell 无法确认当前会话工具可用性或额度，使用时需实调确认"

echo "-- 剧本与叙事 --"
probe scr.knowledge "knowledge-video-script" \
  "[ -f '$SKILLS/knowledge-video-script/scripts/scan_script.py' ]" \
  "中文 AI 腔扫描 + shotlist 契约 + 抖音节奏；写稿阶段的正主"
probe scr.hyperframes "hyperframes 评审回路" \
  "[ -f '$AGENTS/hyperframes/references/review-loop.md' ]" \
  "plan→sketch→build→final→freeze；production-loop 管成本"
probe scr.recipe "media-use 配方记忆层" \
  'node "$AGENTS/media-use/scripts/recipe.mjs" list --hyperframes "$WROOT_WIN" 2>/dev/null | grep -q "v[0-9]"' \
  "freeze 落项目层 .media/recipes/，use 可幂等回灌 frame.md"
probe scr.humanizer "humanizer" "[ -f '$SKILLS/humanizer/SKILL.md' ]" \
  "只用于英文产物（README/对外文档）；中文口播仍用 scan_script.py"

echo "-- 剪辑 / 素材处理 --"
probe cut.local "video-editing 的 ffmpeg 脚本" \
  "[ -f '$SKILLS/video-editing/scripts/render_final.py' ]" \
  "单次编码原则/旋转检测/竖屏裁切可借；Phase1-2.5 依赖 ASR，见下"
probe cut.asr "faster-whisper（语音识别）" \
  "\"\$WPY\" -c 'import faster_whisper'" \
  "缺。只有做有人声的选题才需要 → 属 L4，装前单独批准。本片无人声，不阻塞"
probe cut.analyze "analyze-video（视觉转录）" \
  "[ -f '$SKILLS/analyze-video/prepare_visual_script.rb' ]" \
  "上游没发 .rb 且本机无 ruby：它的契约不可执行，只借它的采样纪律（先抽帧再看图）"

echo "-- 备选渲染引擎 --"
if eval "ls '$NPX_CACHE'/*/node_modules/hyperframes/package.json >/dev/null 2>&1"; then
  say ONDEMAND ren.hyperframes "HyperFrames CLI 已缓存于 npx" \
    "跑之前必须明示：npx 会联网取最新版并写入缓存（已发生 0.8.157 / 0.8.188 两次）"
else
  say BLOCKED ren.hyperframes "HyperFrames CLI" \
    "本机未缓存，第一次调用会下载 → L4 先确认"
fi
probe ren.manim "Manim（3b1b 式数学动画）" \
  "\"\$WPY\" -c 'import manim'" \
  "缺包。manim-composer 只做规划；若某镜真要解析式几何，按 L4 装"

echo "-- 云端连接器（需要账号/密钥）--"
probe cloud.ic "alibabacloud-video-editor" \
  "[ -f '$PROFILE/.alibabacloud/credentials.ini' ] && \"\$WPY\" -c 'import alibabacloud_tea_openapi,oss2'" \
  "无凭据、无 SDK、需 OSS 桶 → 本机不可执行；它的 ICE timeline 与我们的 beat_timeline 同构，可当参照"
probe cloud.pptx "wan-pptx-generator" \
  "[ -n \"\${DASHSCOPE_API_KEY:-}\" ] && \"\$WPY\" -c 'import dashscope'" \
  "无 key。不在成片主线上（做讲义/图文 companion 时才用）"
probe cloud.dl "视频下载归档助手" \
  "\"\$WPY\" -c 'import yt_dlp'" \
  "缺 yt_dlp；写飞书表还要 Feishu MCP（本会话未连接）。角色=参考件入库，可先用本地 yt-dlp 替代"

echo
echo "汇总：READY $READY · ONDEMAND $ONDEMAND · BLOCKED $BLOCKED"
echo "BLOCKED 项的处理只有两种：换一条 READY 的路线，或按 L4 闸门单独批准后安装。"
echo "不许在拍片过程中静默 pip install / npx 下载。"
