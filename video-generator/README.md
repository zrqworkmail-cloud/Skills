# video-generator · 视频制作

视频制作领域的技能包，按 agent 平台分子目录存放。每个子目录内部自洽（自带流程、参考实现、复盘），互不依赖。**跨平台共用的素材放在本目录的 `assets/` 下，不归属任何平台包。**

## 收录

| 子目录 | 平台 | 说明 |
|---|---|---|
| [workbuddy-video-generator/](./workbuddy-video-generator/) | WorkBuddy | 与项目、工具、素材来源无关的八阶段主干：选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘。含技能本体、方法论、Remotion 参考实现与各支片复盘 |
| [qoder-video-generator/](./qoder-video-generator/) | Qoder / Codex | 本地知识短片产线 v9.2：S0–S11、视觉实验／连续演示、brief/frame/shotlist 输入契约、关键机制样片确认、交付 MP4 逐项复验。含流程手册、模板与 35 个工具脚本 |
| [codex-video-generator/](./codex-video-generator/) | Codex | 学术动态技术视频与逐页可控视频 PPT；参考动效复用、数学排版、完整分镜与归档校验 |
| [scnet-video-generator/](./scnet-video-generator/) | SCNet | 镜头驱动的通用流程：四阶段八环节、四道门禁、镜头配方卡与两个零依赖校验脚本；含设计令牌、运镜与构图模板 |

## 选哪一套

- 需要一个**与工具链无关的通用流程**（换题材、换引擎都能套）→ `workbuddy-video-generator`。
- 需要一套**绑定本地 Remotion / ComfyUI 产线**的可执行流程，且接受其输入契约与闸门 → `qoder-video-generator`。
- 需要**学术计算机制动画与按完整分镜控制的 PowerPoint** → `codex-video-generator`，运行时技能名为 `academic-motion-video-ppt`。
- 需要**通用、可审批、可复现**的镜头级流程，且能套到任意引擎 → `scnet-video-generator`。
- **同一任务只选一套，不叠加多套门禁。** 各套流程的阶段划分、样稿定义与验收口径不同，混用会产生互相矛盾的判据。

## 子目录结构约定

```
<平台>-video-generator/
├── SKILL.md          ← 技能本体在平台包根目录
├── README.md         ← 安装、来源、与另一平台的差异、已知边界
├── references/       ← 按需加载的流程手册与踩坑记录
├── scripts/          ← 探针、渲染、测量、混音等脚本
├── assets/           ← 平台包专有资源（如 workbuddy 包的 sfx/）
└── docs/ films/ reference/   ← 可选：方法论、成片复盘、参考实现代码
```

技能本体在**平台包根**，不再套一层 `skills/`；拷贝安装时整目录复制即可。

### 功能层：自备音轨

```
video-generator/
├── assets/audio/                     ← 自备音轨指引 README.md + .gitignore（不含音频文件）
├── workbuddy-video-generator/        ← 平台包（自有 assets/audio/sfx/ 不共享）
└── qoder-video-generator/            ← 平台包
```

**本仓不分发任何 BGM 音频文件。** 原随仓母版因来源与授权无法确认已移除，
使用者须自备授权明确的音轨。功能层目录保留 `README.md` 与 `.gitignore`
（排除常见音频格式，防误提交），既不在 qoder 包内也不在 workbuddy 包内。

- `workbuddy-video-generator` 的流程引用自备音轨；`qoder-video-generator` 按
  「用户自备配乐、不代找不替换」口径运行。两者都不依赖仓库内置音频。
- 引用方式：脚本按 `VIBE_BGM` / `VIBE_BGM_SRC` → 技能包内 `assets/audio/` →
  功能层 `../assets/audio/` 三级解析，兼容「本地源仓根即技能包」与公开仓两级
  布局；全缺失时明确报错，不静默合成顶替。
- 授权责任见 [assets/audio/README.md](assets/audio/README.md) 与根
  [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。

## 约定

- 平台包内不写本机绝对路径；外部二进制走环境变量或运行时探测。
- 成片、素材、构建产物、压缩包不入库。
- 各包的流程真源各自独立维护；一方升级不自动改写另一方。
- 共享素材放功能层，不算「跨包依赖」；平台包对它的引用必须允许缺失并给出明确报错，不能在缺素材时静默降级。


## 换机复现与许可

各包都是规范 + 参考实现，不是开箱即用的安装器。前置条件见仓库根
[docs/从零复现.md](../docs/从零复现.md)；第三方组件与音频授权状态见
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。
