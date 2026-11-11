---
name: shot-driven-video-production
description: 以镜头为原子单位的代码化视频制作流程：剧本与帧预算 → 分镜与镜头配方 → 摄影与构图抽象 → Remotion 场景实现 → 卡点剪辑 → 逐帧质检 → 批量交付归档，含四道门禁与三个零依赖校验脚本。适用于需要可审批、可复现、可批量出片的视频项目，不用于纯实拍剪辑、纯配音或静态幻灯片。
---

# 镜头驱动的视频制作

画面应当在渲染前被设计并审批，而不是在代码里试出来。本文给出四阶段、八环节、四道门禁的执行路径；细节按需加载 `references/`。

## 何时使用

- 要制作或规划一支代码化视频（解说、产品片、社交短视频）
- 需要把文案拆成分镜，或评估现有分镜是否可执行
- 需要为 Remotion 工程建立目录、令牌、运镜与构图抽象
- 需要时间轴校验、交付前质检、批量出片

## 六条不可妥协

1. **镜头是原子单位**：每镜唯一 id（S01…），脚本、分镜、代码、质检共用同一编号。
2. **分镜是门禁**：G2 未通过，不得进入实现。
3. **配方化**：从调校过的镜头卡选型填参，不每次从零调曲线。
4. **声音先行**：配音、配乐、音效三轨先定，再定总帧数。
5. **一镜一组件**：每镜一个组件，只依赖 `frame` 与 props。
6. **确定性**：禁用 `Math.random()`、`Date.now()`、CSS 动画，以及用 `useEffect` 驱动视觉。

## 流程

| 阶段 | 环节 | 产物 | 门禁 |
|---|---|---|---|
| A 立项 | A1 类型判定 | 片型 + 技术路线 | — |
| | A2 文案与帧预算 | `script.md`（逐句帧号） | G1 时长闭合 |
| | A3 声音预设计 | 三轨音频 + 卡点表 | G1 |
| B 设计 | B1 镜头表 | `shotlist.json` | — |
| | B2 配方卡 + 视觉规范 | 镜头卡 + `theme.ts` | — |
| | B3 分镜板 | 逐镜静帧 contact sheet | G2 分镜审批 |
| C 制作 | C1 工程基线 | 版本锁定 + 目录 | — |
| | C2 素材与数据 | 资源清单 + props 契约 | — |
| | C3 场景实现 | 每镜一个组件 | — |
| | C4 剪辑组装 | 时间轴 + 转场 | G3 时间轴闭合 |
| D 交付 | D1 调色 / D2 混音 | 统一色彩 + −14 LUFS | — |
| | D3 渲染 + 逐帧 QA | 成片 | G4 交付验收 |
| | D4 批量 / 归档 | 多版本 + 参数快照 | G4 |

## 四道门禁

**G1 时长闭合**：`Σ 镜头帧 = durationInFrames`（整数）；每句有帧预算；尾帧留 6–12 帧；配音总长与总帧一致。

**G2 分镜审批**：每镜有静帧；六要素齐全；每镜至少一个新信息；文字在安全区内；缩到 320px 宽标题仍可读。

**G3 时间轴闭合**：`node scripts/check-timeline.mjs <timeline.json>` 退出码为 0；无空洞、无重叠；转场帧计入总长。

**G4 交付验收**：`ffprobe` 规格一致且为 `yuv420p`；同帧两次渲染哈希一致；响度 −14 LUFS（网络）或 −23 LUFS（广播）；逐镜检查首帧、中帧、末帧。

## 文件导航

| 需要做什么 | 读哪个文件 |
|---|---|
| 规划整条流水线 | `references/pipeline.md` |
| 写镜头表、选配方卡、定视觉规范 | `references/shot-system.md` |
| 过门禁、记录签署、查失败模式 | `references/gates.md` |
| 取设计令牌 | `assets/templates/theme.ts` |
| 取动画函数 | `assets/templates/anim.ts` |
| 做运镜与视差 | `assets/templates/Camera.tsx` |
| 做统一构图 | `assets/templates/Stage.tsx` |
| 看镜头表 / 时间轴样例 | `assets/templates/shotlist.example.json`、`timeline.example.json` |
| 选镜头卡（按信息动作检索） | `assets/cards/`（15 张，文件名即 id） |
| 看可跑示例 / 验收场景 | `examples/minimal/src/Scene.tsx`、`PelicanBicycle.tsx` |
| 校验时间轴 / 扫描裸色值 | `scripts/check-timeline.mjs`、`scripts/check-tokens.mjs` |

## 常用命令

```bash
node scripts/check-timeline.mjs assets/templates/timeline.example.json
node scripts/check-tokens.mjs src
node scripts/check-recipes.mjs assets/cards
npx remotion compositions src/index.ts
npx remotion still src/index.ts <id> out/frame.png --frame=90
npx remotion render src/index.ts <id> out/draft.mp4 --scale=0.5 --crf=28 --muted
npx remotion render src/index.ts <id> out/main.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p --image-format=png
```

> 若要 `yuv420p`，中间帧必须用 png；`--image-format=jpeg` 会产出全范围的 `yuvj420p`，部分播放器偏色。

> 包根另带最小示例：`npm i && npm run typecheck` 可验证 `assets/templates/` 真能编译，`npm run render` 渲染 `Example`。冠名机无外网时，Remotion 下不到 Chrome，需追加 `--browser-executable="<本机 Chrome 路径>"`。

## 交付前最后三问

1. 这一镜被单独截屏，能说清它在讲什么吗？
2. 关掉声音节奏还成立吗？关掉画面声音还成立吗？
3. 客户要改一个字，需要重做多少？答案应当只有「改 props」。
