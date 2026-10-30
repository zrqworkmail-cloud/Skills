# video-generator · 视频制作

视频制作领域的工作流，按平台 / 工具分子目录存放。每个子目录内部自洽（自带流程、参考实现、复盘），互不依赖。

## 收录

| 子目录 | 说明 |
|---|---|
| [workbuddy-video-generator/](./workbuddy-video-generator/) | **WorkBuddy 平台的视频制作工作流**：选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘。含技能本体、方法论、参考实现代码、各支片复盘 |

## 子目录结构约定

```
<平台>-video-generator/
├── README.md          ← 从这开始
├── skills/            ← 技能本体（按平台分，可直接装到 agent）
├── docs/              ← 方法论与决策记录
├── films/             ← 实际产出与复盘
└── reference/         ← 参考实现代码
```
