# video-generator · 视频制作

视频制作领域的技能包，按 agent 平台分子目录存放。每个子目录内部自洽（自带流程、参考实现、复盘），互不依赖。

## 收录

| 子目录 | 平台 | 说明 |
|---|---|---|
| [workbuddy-video-generator/](./workbuddy-video-generator/) | WorkBuddy | 与项目、工具、素材来源无关的八阶段主干：选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘。含技能本体、方法论、Remotion 参考实现与各支片复盘 |
| [qoder-video-generator/](./qoder-video-generator/) | Qoder / Codex | 本地知识短片产线 v9.2：S0–S11、视觉实验／连续演示、brief/frame/shotlist 输入契约、关键机制样片确认、交付 MP4 逐项复验。含流程手册、模板与 35 个工具脚本 |

## 选哪一套

- 需要一个**与工具链无关的通用流程**（换题材、换引擎都能套）→ `workbuddy-video-generator`。
- 需要一套**绑定本地 Remotion / ComfyUI 产线**的可执行流程，且接受其输入契约与闸门 → `qoder-video-generator`。
- **同一任务只选一套，不叠加两套门禁。** 两套流程的阶段划分、样稿定义与验收口径不同，混用会产生互相矛盾的判据。

## 子目录结构约定

```
<平台>-video-generator/
├── SKILL.md          ← 技能本体在平台包根目录
├── README.md         ← 安装、来源、与另一平台的差异、已知边界
├── references/       ← 按需加载的流程手册与踩坑记录
├── scripts/          ← 探针、渲染、测量、混音等脚本
├── assets/           ← 模板、音源等输出用资源
└── docs/ films/ reference/   ← 可选：方法论、成片复盘、参考实现代码
```

技能本体在**平台包根**，不再套一层 `skills/`；拷贝安装时整目录复制即可。

## 约定

- 平台包内不写本机绝对路径；外部二进制走环境变量或运行时探测。
- 成片、素材、构建产物、压缩包不入库。
- 两套包的流程真源各自独立维护；一方升级不自动改写另一方。
