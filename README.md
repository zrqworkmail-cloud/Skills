# Skills

用于存放 AI agent 学习过程中想用的、用过的、好用的各种领域 skill，便于一键搭建机器工作流。

**目录分两级：先按功能划分，再按 agent 平台划分。** 每个 `<平台>-<功能>-generator/` 是一个自洽的技能包（自带流程文档、参考实现、踩坑记录），互不依赖。**跨平台共用的素材放功能层 `assets/`，不归属任何单个平台包。**

## 收录

| 子目录 | 功能 | 平台 | 说明 |
|---|---|---|---|
| [slide-generator/workbuddy-slide-generator/](./slide-generator/workbuddy-slide-generator/) | 科研演示 | WorkBuddy | 模板继承、样页审核、可编辑 PPTX 与图片式演示 |
| [video-generator/workbuddy-video-generator/](./video-generator/workbuddy-video-generator/) | 视频制作 | WorkBuddy | 从选题到成片提交的八阶段流程：选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘。含技能本体、方法论、参考实现代码、各支片复盘 |
| [video-generator/qoder-video-generator/](./video-generator/qoder-video-generator/) | 视频制作 | Qoder / Codex | 本地知识短片产线 v9.2：S0–S11、视觉实验／连续演示、brief/frame/shotlist 输入契约、样片闸门与交付 MP4 逐项复验。含流程手册、模板与工具脚本 |

各功能目录下的 `README.md` 是该领域的入口索引。

## 目录结构

一级目录只按功能划分，二级目录只按平台划分；**即使某功能目前只有一个平台，也保留两层**，便于后续扩展且不破坏安装路径。

```
Skills/
├── <功能>-generator/                    ← 一级：功能（video / slide / ...）
│   ├── README.md                        ← 领域索引
│   ├── assets/                          ← 功能层共享说明（如自备音轨指引；音频不入库）
│   └── <平台>-<功能>-generator/         ← 二级：agent 平台，技能本体在根
│       ├── SKILL.md                     ← 技能本体
│       ├── README.md                    ← 安装、来源、边界
│       ├── references/                  ← 按需加载的手册
│       ├── scripts/                     ← 可执行脚本
│       ├── assets/                      ← 模板、字体等输出用资源
│       └── docs/ films/ reference/      ← 可选：方法论、成片复盘、参考实现
└── README.md
```

规则：

- 功能目录根**不放** `SKILL.md`；技能本体一律在平台子目录根。
- 新增平台时，在同一功能目录下并列新增子目录，不改动已有平台包。
- 各平台包内部自洽，可独立拷贝安装；**跨包共用的说明与约定放功能层 `assets/`**，由各包通过环境变量或相对回退引用，不写死绝对路径。音频等授权不明的素材一律不入库，改为使用者自备。

## 命名约定

- 功能目录：`<功能>-generator/`（如 `video-generator`、`slide-generator`）
- 平台子目录：`<平台>-<功能>-generator/`（如 `workbuddy-video-generator`、`qoder-video-generator`）
- 不用 `production` / `-skill` 后缀——产出物叫 generator，技能本体是其中的 `SKILL.md`

## 用法

各平台子目录的 `README.md` 写了具体怎么用。通常只需把 `SKILL.md`、`references/`、`scripts/`、`assets/` 一起拷到对应 agent 的用户级技能目录，目录名保持与技能包同名；若该领域要求自备素材（如视频的 BGM 音轨），按功能层 `assets/` 下的说明自行准备并用环境变量指向：

```bash
cp -r video-generator/qoder-video-generator "$AGENT_USER_SKILLS_DIR/qoder-video-generator"
# 自备 BGM 音轨：export VIBE_BGM=/path/to/your-track.m4a  # 见 video-generator/assets/audio/README.md
```

## 约定

- **不写本地路径**：脚本用相对路径、环境变量或运行时探测（`sys.executable`、`os.tmpdir()`、`shutil.which()`）；外部二进制一律允许用环境变量覆盖。
- **产物不入库**：成片、素材、依赖包、排障日志、压缩包都由各子目录的 `.gitignore` 挡住。
- **踩坑写根因**：不写"注意 XX"，写"症状 → 根因 → 修法"。
- **公开前脱敏**：移除本机绝对路径、私有项目规格、凭据与后台数据；来源仓的历史证据要标注"本包不含"。
- **平台差异写进包内**：同一功能的不同平台版本各自维护流程真源，不互相覆盖门禁与判据。


## 许可与第三方组件

- [LICENSE](LICENSE) 是审计整改补入的**保守默认声明（待所有者确认最终许可证）**：原创内容保留所有权利，允许个人学习与非商业使用；**本仓整体不得用于商业目的**。
- `reference/tools/oss-skills/` 下的第三方组件**不受根 LICENSE 覆盖**，按各自许可执行；其中含明确禁止商用的 PolyForm Noncommercial 组件。完整清单与商用前须核实的项见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 若所有者要换成标准开源许可证，须先排除含非商用组件的目录，不能简单用 MIT / Apache-2.0 覆盖全仓。

## 从零复现（换一台机器）

**clone 本仓不能直接开始生产视频。** 运行时（Python / Node / ffmpeg / Chrome）、中文字体、ComfyUI 工作流与模型权重、外部平台技能与凭据均不随仓分发。完整前置条件、分路线可达性与验证命令见 [docs/从零复现.md](docs/从零复现.md)。

各包 `requirements.txt` 与 `.env.example` 列出了 Python 依赖与可覆盖的环境变量；`scripts/env_report.sh` 是只读能力探针。外部二进制一律走环境变量或 PATH 探测，不写死本机路径。

> `reference/scripts/sync_workflow.py` 是来源仓的自动同步参考实现，**不要照搬其定时任务配置**；本仓版本默认只暂存白名单目录，并拦截疑似凭据文件，任何自动推送前先跑 `--dry-run`。

## 目录名与技能名对照

`SKILL.md` 的 `name` 是 agent 运行时加载的技能标识，与本仓的发布目录名可以不同；**安装时以 `name` 作为技能目录名**，不要按下面的发布目录名重命名，否则 `SKILL.md` 内引用的运行时路径会失效。

| 发布目录（本仓） | `SKILL.md` 的 `name` | 运行时技能目录 |
|---|---|---|
| `video-generator/workbuddy-video-generator/` | `workbuddy-video-workflow` | `<用户级技能目录>/workbuddy-video-workflow/` |
| `video-generator/qoder-video-generator/` | `qoder-video-generator` | `<用户级技能目录>/qoder-video-generator/` |
| `slide-generator/workbuddy-slide-generator/` | `slide-generator` | `<用户级技能目录>/slide-generator/` |

前两行的差异是历史沿革：`workbuddy-video-workflow` 是本机实际加载的技能名，`HANDOFF.md`、`README.md` 与多份分镜文档都按它引用；为保持加载链一致，发布目录改名后 `name` 保持不变，这里以对照表消除歧义。
