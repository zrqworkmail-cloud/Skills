# qoder-video-generator · Qoder 平台视频产线

面向 Qoder / Codex 类 agent 的本地知识短片产线技能包。流程真源是 `references/WORKFLOW.md`（v9.2，S0–S11），`SKILL.md` 是薄入口。

**一句话原则**：先让观众看懂一个变化，再决定用什么工具把它做出来。

## 与 workbuddy-video-generator 的区别

| 维度 | workbuddy-video-generator | qoder-video-generator |
|---|---|---|
| 定位 | 与项目、工具、素材来源无关的八阶段通用主干 | 绑定本地产线的一版可执行实现 |
| 阶段 | 选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘 | S0 能力枚举 → S1 简报 → S2/S3 剧本分镜 → S4/S5 设计素材 → S6/S7 样片装配 → S8/S9 评审交付 → S10 收尾 → S11 发布复盘 |
| 输入契约 | 分镜文档、发布文案、质检报告 | `brief` / `frame` / `shotlist.json`，分镜与时长分离 |
| 默认创作法 | 依技能 motion-vocabulary 与样稿确认制 | 视觉实验／连续演示，关键机制样片优先 |
| 工具 | 代码渲染 / AI 生成 / 实拍 / 混剪多路径 | Remotion + ComfyUI 产线，附探针、测量、混音、封装脚本 |
| 验收 | 技能自带 QC + 两轮人眼抽帧 | 内容与连续观看 / 技术可靠 / 发布效果三层，交付 MP4 逐项复验 |

**同一任务只选一套，不叠加两套门禁。**

## 目录

```
qoder-video-generator/
├── SKILL.md                    技能本体（薄入口 + 资源索引）
├── README.md                   本文件
├── references/
│   ├── WORKFLOW.md             S0–S11 流程真源
│   ├── MOTION.md               信息动作、连续性、静止声明与人工审片
│   ├── LESSONS.md              历史数字、工程故障与对旧推论的校正
│   ├── knowledge-film-craft.md 主角段、亮度带、自备 BGM、音效、闸门判读、交付复验
│   ├── vibe-knowledge-aesthetics.md 知识片视觉研究
│   ├── case-arch-baihetan.md   历史案例的实测数字与缺陷经过
│   └── checklists.md           开工 / 开渲前 / 交付三张清单
├── assets/templates/
│   ├── brief.template.md
│   ├── frame.template.md
│   └── shotlist.template.json
└── scripts/                    探针、时长规划、渲染、测量、混音、封装（参考实现）
```

## 安装

把本目录整体拷到目标 agent 的用户级技能目录，目录名保持 `qoder-video-generator`：

```bash
cp -r qoder-video-generator "$AGENT_USER_SKILLS_DIR/qoder-video-generator"
```

`SKILL.md`、`references/`、`assets/`、`scripts/` 需一起复制；只读入口不复制整套流程的做法不适用于本包。安装位置按宿主实际加载路径确认，不猜测 `~` 的展开结果。

## 运行前

1. 在目标环境实际探测外部二进制：`ffmpeg -version`、`ffprobe -version`、`python --version`、`node --version`。
2. 按需设置环境变量（未设置时脚本回退到 PATH 查找，缺失即报错，不自动安装）：
   - `FFMPEG` / `FFPROBE` / `FFMPEG_PATH`：ffmpeg 与 ffprobe
   - `PY`：Python 解释器
   - `COMFY_WORKFLOW_TEMPLATE` / `COMFY_OUTPUT_DIR`：仅 ComfyUI / Wan 路线
3. 制作命令在 `PROJECT_ROOT` 执行；技能包目录只读，不写入产出。

## 已知边界

- 已有端到端工程证据主要来自 **P3 / Remotion / 1080×1920 / 30 fps / 中文硬字幕**。其他画幅、实拍、长片、配音与混合路线列在 WORKFLOW §10，但**没有同等验证**，不得声称已跑通。
- 部分测量工具绑定固定画幅或历史镜头口径，亮度、压字等目前多为「仅报告、需人工复核」；「所有闸门通过」不是全自动质量证书。
- 旧 `build_timeline.mjs` 不兼容当前模板，时间线适配未完成不能跳到渲染（WORKFLOW §3）。
- `scripts/` 已从来源仓解耦本机路径，**未在公开仓对应环境做端到端实跑**；首次使用先跑 `scripts/env_report.sh` 只读探针。
- 文档中出现的 `projects/...`、`examples/...`、项目级 `STATUS.md` 与 `review_log.md` 指向**来源仓的历史项目**，本包不含这些文件，仅作为历史证据引用。
- `knowledge-video-script`、`hyperframes` 等是来源仓依赖的外部平台技能，本包不含；WORKFLOW 的能力表中标为 READY 的状态是来源仓当日快照，须在当前环境重新核实。
- 文档内的实测数字（亮度、响度、对位、CPU 采样等）属于历史片证据，换项目、换画幅、换版本都要重测，不搬旧报告。

## 来源与脱敏

- 来源：private 仓 `knowledge-video-workflow` 的 v9.2 流程文档（WORKFLOW / MOTION / LESSONS / README / skills / templates / research / tools）。
- 本公开快照**只收纯文本**：4 份流程文档、2 份经验手册与其 references、1 份视觉研究、3 个输入模板、35 个工具脚本。
- 已排除：成片与生成媒体、BGM 与派生音频、私有项目规格、构建产物、凭据、本机绝对路径、`.git` 目录。
- 文档中出现的历史实测数字、项目名与版本记录属于来源仓的历史证据，不代表本技能在当前项目的现状。
- 文档内路径均改为技能包内相对路径或环境变量；`SKILL_ROOT` / `PROJECT_ROOT` 是占位概念，不是某台机器的目录。
