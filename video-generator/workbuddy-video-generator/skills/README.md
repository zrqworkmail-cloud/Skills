# skills/ · 技能

```
skills/
└── workbuddy-video-workflow/
    ├── SKILL.md             ← 主干流程，加载时只读这个
    ├── scripts/             ← 可执行脚本（qc_rhythm.py 节奏体检）
    └── references/          ← 按需加载的详细手册
```

技能名一律 **hyphen-case 小写**（`workbuddy-video-workflow`），与 SKILL.md frontmatter 的 `name` 一致——这是 skill-creator 校验的硬性要求（`^[a-z0-9-]+$`）。

## 双份机制

WorkBuddy 只认用户级目录 `~/.workbuddy-ai/skills/<name>/SKILL.md`，不认仓库路径；但仓库要管版本。所以：

```
仓库（进 Git，版本管理）                    用户级（运行时，不进 Git）
skills/                                   ~/.workbuddy-ai/skills/
└── workbuddy-video-workflow/        ──▶  └── workbuddy-video-workflow/
```

**单向同步**：永远改仓库那份，再覆盖到用户级。反向改会丢。

```bash
SRC="skills/workbuddy-video-workflow"
DST="$HOME/.workbuddy-ai/skills/workbuddy-video-workflow"
mkdir -p "$DST/references" "$DST/scripts"
cp "$SRC/SKILL.md" "$DST/SKILL.md"
cp "$SRC"/references/* "$DST/references/"
cp "$SRC"/scripts/* "$DST/scripts/"

diff -r "$SRC" "$DST"   # 无输出 = 一致
```

## 当前收录

| 技能 | 作用 | 入口 |
|---|---|---|
| `workbuddy-video-workflow` | 视频制作流程：选题 → 脚本 → 分镜 → 素材 → 剪辑合成 → 质检 → 交付 → 发布复盘 | `SKILL.md` |

## 新增一个技能

1. 在 `skills/` 下建 `<skill-name>/`（hyphen-case 小写），写 `SKILL.md`
2. `SKILL.md` 必须带 YAML frontmatter：

```yaml
---
name: <skill-name>           # 必须与目录名一致，且为小写连字符格式
description: <一句话说清"什么时候该用它">   # 决定会不会被触发，写具体场景与关键词；不能含尖括号
agent_created: true
---
```

3. 可执行代码放 `scripts/`，详细文档放 `references/`，`SKILL.md` 只留主干 + 指向（**加载时只读 SKILL.md，references 按需打开**）
4. 同步到用户级（见上）

## 写作约定

| 约定 | 理由 |
|---|---|
| **SKILL.md 只写"怎么做"，不写"这个项目怎么做的"** | 技能要跨项目复用；项目细节放 references |
| **每个阶段给「做什么 / 判据 / 常见错误」三件套** | 判据是验收线，缺了就只能靠感觉 |
| **判据给具体阈值**（如"最长冻结 ≤3s"），不写"应该够短" | 模糊标准等于没有标准 |
| **踩坑写「症状 → 根因 → 修法」**，不写"注意 XX" | 只有根因能让人在新场景里举一反三 |
| **references 单文件不超过 500 行** | 太长就拆，按主题分册 |

## 维护检查

```bash
SK="skills/workbuddy-video-workflow"

# 1. 两份是否一致
diff -r "$SK" "$HOME/.workbuddy-ai/skills/workbuddy-video-workflow"

# 2. 有没有残留项目特定路径（应该为 0）
grep -c "reference/\|remotion/\|films/" "$SK/SKILL.md"

# 3. references 里的链接是否都存在
grep -oE "references/[a-zA-Z0-9._/-]+" "$SK/SKILL.md" | sort -u | while read f; do
  [ -f "$SK/$f" ] || echo "MISS $f"
done
```
