# scnet-video-generator · 镜头驱动的视频制作

以**镜头**为原子单位的代码化视频制作流程包：四阶段、八环节、四道门禁，附设计令牌、运镜与构图抽象、两个零依赖校验脚本。

## 安装

整目录复制到 agent 的技能目录即可，包内自洽、无跨包依赖：

```bash
cp -r scnet-video-generator ~/.claude/skills/
```

或用安装器（若所在生态支持）：

```bash
npx skills add <owner>/Skills --path video-generator/scnet-video-generator
```

## 包内结构

```
scnet-video-generator/
├── SKILL.md                 技能本体（Agent 入口）
├── README.md                本文件：安装、差异、边界
├── references/              按需加载的流程手册
│   ├── pipeline.md          四阶段八环节详解
│   ├── shot-system.md       镜头表、配方卡、视觉规范
│   └── gates.md             四道门禁 + 签署模板 + 失败模式库
├── assets/templates/        可直接拷进 Remotion 工程的参考实现
│   ├── theme.ts             设计令牌
│   ├── anim.ts              动画公共函数
│   ├── Camera.tsx           运镜与视差
│   ├── Stage.tsx            构图栅格
│   ├── shotlist.example.json
│   ├── timeline.example.json
│   └── shot-card.schema.json
└── scripts/
    ├── check-timeline.mjs   G3 门禁：时间轴闭合校验
    └── check-tokens.mjs     视觉规范门禁：裸色值/裸字号扫描
```

## 与既有三套的差异

| 维度 | scnet（本包） | workbuddy | qoder | codex |
|---|---|---|---|---|
| 定位 | 通用镜头方法论 + 可用模板 | 与工具链无关的八阶段主干 | 绑定本地 Remotion/ComfyUI 产线 | 学术动效与视频 PPT |
| 核心资产 | 镜头卡机制、四道门禁、两个校验脚本 | 方法论与复盘 | 35 个工具脚本 | 数学排版与分镜归档 |
| 是否依赖具体引擎 | 不强绑定，Remotion 为参考实现 | 否 | 是 | 是 |
| 适合场景 | 需要**可审批、可复现**的通用视频 | 换题材换引擎的通用流程 | 本地产线执行 | 学术汇报 |

**同一任务只选一套，不叠加多套门禁。** 本包的门禁是"镜头级"的（分镜、时间轴、交付），与 qoder 的 S0–S11 阶段门禁口径不同，混用会产生互相矛盾的判据。

## 前置条件

- Node.js ≥ 18（两个脚本只用内置模块，无第三方依赖）
- Remotion 4.x（仅当使用 `assets/templates/` 下的组件时）
- FFmpeg / ffprobe（G4 校验；也可用 `npx remotion ffprobe`）

## 已知边界

- **不分发任何音频**：配乐与音效需自备并确认授权，流程只定义轨道与时序。
- **不含成片与构建产物**：仓库只存规范与参考实现。
- **配方卡是机制，不是卡片库**：本包给出 schema 与类目，具体镜头卡需按项目积累（参考实现中有一张示例卡）。
- **不绑定渲染管线**：模板假设 Remotion 的 `useCurrentFrame` 语义，换引擎需替换 `Camera`/`Stage`/`anim` 三层。
- 门禁 G2 依赖人眼评审，不提供自动化判定。

## 来源

由本地 Remotion 制作实践整理而成，流程结构参考了 OpenMontage（流水线与分镜审批）、video-shotcraft（镜头配方卡与逐帧质检）、rea-video（逐镜拆解与三轨音频）的公开实践；实现约定参考 remotion 与 remotion-dev/skills。文档、模板与脚本为独立实现，未复制上述项目代码。
