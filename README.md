# Skills

用于存放 AI agent 学习过程中想用的、用过的、好用的各种领域 skill，便于一键搭建机器工作流。

**目录分两级：先按功能划分，再按 agent 平台划分。** 每个 `<平台>-<功能>-generator/` 是一个自洽的技能包（自带流程文档、参考实现、踩坑记录），互不依赖。

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
- 各平台包内部自洽，可独立拷贝安装；跨包不共享相对路径。

## 命名约定

- 功能目录：`<功能>-generator/`（如 `video-generator`、`slide-generator`）
- 平台子目录：`<平台>-<功能>-generator/`（如 `workbuddy-video-generator`、`qoder-video-generator`）
- 不用 `production` / `-skill` 后缀——产出物叫 generator，技能本体是其中的 `SKILL.md`

## 用法

各平台子目录的 `README.md` 写了具体怎么用。通常只需把 `SKILL.md`、`references/`、`scripts/`、`assets/` 一起拷到对应 agent 的用户级技能目录，目录名保持与技能包同名：

```bash
cp -r video-generator/qoder-video-generator "$AGENT_USER_SKILLS_DIR/qoder-video-generator"
```

## 约定

- **不写本地路径**：脚本用相对路径、环境变量或运行时探测（`sys.executable`、`os.tmpdir()`、`shutil.which()`）；外部二进制一律允许用环境变量覆盖。
- **产物不入库**：成片、素材、依赖包、排障日志、压缩包都由各子目录的 `.gitignore` 挡住。
- **踩坑写根因**：不写"注意 XX"，写"症状 → 根因 → 修法"。
- **公开前脱敏**：移除本机绝对路径、私有项目规格、凭据与后台数据；来源仓的历史证据要标注"本包不含"。
- **平台差异写进包内**：同一功能的不同平台版本各自维护流程真源，不互相覆盖门禁与判据。
