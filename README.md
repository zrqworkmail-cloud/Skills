# Skills

用于存放 AI agent 学习过程中想用的、用过的、好用的各种领域 skill，便于一键搭建机器工作流。

每个子目录是一个独立领域，内部自洽（自带流程文档、参考实现、踩坑记录），互不依赖。

## 收录

| 子目录 | 领域 | 说明 |
|---|---|---|
| [slide-generator/](./slide-generator/) | 科研演示 | 模板继承、样页审核、可编辑 PPTX 与图片式演示 |
| [video-generator/](./video-generator/) | 视频制作 | 领域入口，按平台分子目录 |
| └ [workbuddy-video-generator/](./video-generator/workbuddy-video-generator/) | 视频制作 · WorkBuddy | 从选题到成片提交的完整流程：选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘。含技能本体、方法论、参考实现代码、各支片复盘 |

## 每个子目录的结构

```
<领域>/
└── <平台>-<领域>/
    ├── README.md          ← 从这开始
    ├── skills/            ← 技能本体（按平台分，可直接装到 agent）
    ├── docs/              ← 方法论与决策记录
    ├── films/ 或 output/  ← 实际产出与复盘
    └── reference/         ← 参考实现代码
```

## 用法

各子目录的 README 里写了具体怎么用。技能类子目录通常只需把 `SKILL.md` 与 `references/` 拷到对应 agent 的技能目录。

## 约定

- **不写本地路径**：脚本用相对路径、环境变量或运行时探测（`sys.executable`、`os.tmpdir()`）
- **产物不入库**：成片、素材、依赖包、排障日志都由各子目录的 `.gitignore` 挡住
- **踩坑写根因**：不写"注意 XX"，写"症状 → 根因 → 修法"
