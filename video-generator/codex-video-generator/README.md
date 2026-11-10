# Codex 学术动态视频与逐页可控 PPT

此包从一次 Llama 4 MoE 学术动态图形视频与视频 PPT 的实际制作中提炼，运行时技能名为 `academic-motion-video-ppt`。适合在已有 Remotion 项目上增量制作、复用用户参考动效、以 KaTeX 呈现计算机制，并将完整分镜嵌入可逐页控制的 PowerPoint。

## 安装与调用

将本目录完整复制到 Codex 用户级 skills 目录，安装后的目录名使用 `academic-motion-video-ppt`，然后在新会话中使用 `$academic-motion-video-ppt`。例如在 Linux/macOS：

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R video-generator/codex-video-generator "${CODEX_HOME:-$HOME/.codex}/skills/academic-motion-video-ppt"
```

已有同名技能时先比较差异，不直接覆盖。Windows 可将本目录复制到 Codex 实际使用的用户级 skills 目录。

## 内容与边界

- `SKILL.md`：技术叙事、参考复用、浅色投影、公式、共用路径、语义分镜、节奏和交付清理。
- `references/production-lessons.md`：案例制作链、动画及 PPT 触发器的根因与修复经验。
- `scripts/build-video-ppt.ps1`：Windows PowerPoint COM 视频 PPT 生成器，拒绝覆盖已有文件；依赖本机 PowerPoint，视频及封面由使用者提供。
- `scripts/audit_video_ppt.py`：仅用 Python 标准库的只读结构审核器；不代替实际播放和视觉验收。

输入 JSON 包含 `scenes` 数组，每项为 `title`、`video`、`poster`，文件路径相对于 JSON。例如：

```json
{"scenes":[{"title":"计算机制","video":"clips/mechanism.mp4","poster":"clips/mechanism.png"}]}
```

```powershell
./scripts/build-video-ppt.ps1 -Manifest ./scenes.json -Output ./presentation.pptx
```

```sh
python scripts/audit_video_ppt.py presentation.pptx --clips clips --output audit.json
```

本包不含原视频、PPT 成品、用户模板、字体、音频、参考项目源码或其资产归档，也不附 Remotion/浏览器/FFmpeg 运行时。案例中“归档已验证”的说明是历史证据，不代表从本仓即可恢复案例成片。视频对象无法在 PPT 中直接编辑成图形，计算模块需在 Remotion 源码中编辑。无配音是该案例的要求，其他项目遵从用户的音频需求。

遵守仓库根 LICENSE 与 THIRD_PARTY_NOTICES.md。未收录或重新授权任何外部参考素材。
