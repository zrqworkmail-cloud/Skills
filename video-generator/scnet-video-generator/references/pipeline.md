# 四阶段八环节详解

> 本文是流程主文档。门禁清单见 `gates.md`，镜头方法论见 `shot-system.md`。

---

## 阶段 A｜立项

### A1 类型判定

先定片型，再定技术路线。片型决定镜头密度、信息承载方式与验收标准。

| 片型 | 特征 | 技术路线 | 平均镜头长度 |
|---|---|---|---|
| 数据解说 | 图表、数字滚动、批量模板 | 组件化 + props 驱动 | 4–6s |
| 产品片 | 真实界面、精细动效 | 截图/录屏 + 镜头配方 | 2–4s |
| 社交短视频 | 强钩子、快节奏、字幕主导 | 字幕系统 + 卡点剪辑 | 1.5–3s |
| 混剪/纪录式 | 真实素材为主 | 素材检索 + 剪辑节奏 | 3–8s |

**产物**：一页 brief（受众、平台、时长上限、KPI、交付格式）。

**失败模式**：跳过判定直接写代码，做到一半发现片型与实现方式错配。

---

### A2 文案与帧预算

1. 写一句话主张。
2. 三段式结构：钩子（≤2s）→ 主体 → 落点。
3. 逐句文案，逐句标 `[startFrame, endFrame]`。

**字数与时长参考**

| 内容 | 建议时长 |
|---|---|
| 标题停留 | ≥1.5s |
| 单句口播 | 4–5 字/秒 |
| 数据卡 | ≥2s |
| 尾帧落版 | 6–12 帧 |

**产物**：`script.md`

```
S01 [0–45]   钩子：一句提问
S02 [45–120] 主体：三个要点
S03 [120–180] 落点：结论 + CTA
```

**门禁 G1**：`Σ 句时长 + 尾帧 = durationInFrames`，全为整数。

---

### A3 声音预设计

声音是时间基准，不是后期素材。

| 轨道 | 内容 | 动作 |
|---|---|---|
| VO | 配音 | 录音/TTS → 切句 → 记录每句起止帧 |
| MUSIC | 配乐 | 选段 → 标 BPM 与卡点 → 规划 ducking |
| SFX | 音效 | 转场、点击、落点音，锚定到帧 |

自动切句：

```bash
ffmpeg -i vo.wav -af silencedetect=noise=-35dB:d=0.4 -f null -
```

用音频反推总长，而不是先定秒数再塞内容：

```tsx
calculateMetadata={async () => ({
  durationInFrames: Math.ceil((await getAudioDurationInSeconds(staticFile('audio/vo.wav')) + 0.5) * 30),
})}
```

**产物**：`public/audio/*`、`audio-manifest.json`（每段起止帧 + 卡点）。

**失败模式**：先做画面后配音 → 全片节奏重排。

---

## 阶段 B｜设计

### B1 镜头表

每镜六要素，缺一项就会在实现阶段变成返工。

| 字段 | 取值 | 作用 |
|---|---|---|
| 镜号 | S01… | 全流程唯一标识 |
| 景别 | 大远景/全景/中景/近景/特写 | 主体占比与信息密度 |
| 机位角度 | 平视/俯/仰/侧 | 情绪倾向 |
| 运镜 | 固定/推/拉/摇/移/跟 | 运动曲线 |
| 时长 | 帧 | 总帧核算 |
| 声音 | VO 编号 / 音效 / 静音 | 声画对位 |

**产物**：`shotlist.json`（结构见 `assets/templates/shotlist.example.json`）。

---

### B2 镜头配方与视觉规范

**配方卡**：把常用镜头沉淀为可复用单元，字段见 `assets/templates/shot-card.schema.json`。

```json
{
  "id": "push-in-reveal",
  "category": "camera",
  "shotSize": "medium",
  "durationRange": [36, 72],
  "entry": {"type": "spring", "damping": 200},
  "camera": {"zoom": [1.0, 1.08], "easing": "outCubic"},
  "exit": {"type": "cut"}
}
```

**视觉规范**：色板、字阶、间距、圆角、动效时长集中在一个模块（`assets/templates/theme.ts`）。

**硬规则**：场景代码里不允许出现裸色值与裸字号。

**检查**：`node scripts/check-tokens.mjs src` 应为 0 违规。

---

### B3 分镜板

把每镜静帧拼成 contact sheet，逐镜确认构图、景别、文字安全区、色彩走向。

**门禁 G2（最关键）**：分镜未签，不得进入实现。

评审要点：

- 每镜至少一个**新信息**
- 主体占位合理，负空间够放文字
- 相邻镜头景别有变化，不连切同景别
- 运动方向跨镜一致

---

## 阶段 C｜制作

### C1 工程基线

| 项 | 要求 |
|---|---|
| 版本 | 框架精确锁定（不用 `^`），提交 lockfile |
| 目录 | `src/scenes` / `src/components` / `src/lib` / `src/data` / `public` |
| 配置 | 全局渲染默认值集中，CLI 只做覆盖 |
| CI | 缓存依赖与浏览器，一条命令出片 |

```bash
npx remotion compositions src/index.ts     # 确认合成注册
npx remotion still src/index.ts <id> out/f.png --frame=0
```

---

### C2 素材与数据

1. 资源走 `public/` + 统一引用函数，不写相对路径。
2. 字体显式加载完成后再截帧。
3. 异步数据用阻塞句柄包住，失败显式抛错。
4. 文案与数值全部走 props，不硬编码。

---

### C3 场景实现

**一镜一组件**，只依赖 `frame` 与 props。

统一抽象三层：

| 层 | 职责 |
|---|---|
| `Camera` | `zoom / x / y / rotate`，子元素按 `depth` 做视差 |
| `Stage` | 标题区 / 主体区 / 字幕区栅格 |
| `anim` | 入场、错峰、缓动、弹簧公共函数 |

**验收**：任意单镜可独立播放；同帧两次输出一致。

---

### C4 剪辑组装

- 顺序镜头用 `Series`；转场用 `TransitionSeries`，`transition` 写在出镜侧，两镜重叠 `frames` 帧。
- 重叠不吃掉镜头内容：渲染端把重叠帧补在序列尾部，成片总帧仍等于 Σ 镜头帧（详见 `references/shot-system.md` §六）。
- 三条剪辑规则：切点落在动作中段；转场要有动机；一镜一信息。
- 钩子 ≤2s，主体 2–4s/镜（社交 1.5–3s）。

**门禁 G3**：

```bash
node scripts/check-timeline.mjs src/data/timeline.json
```

---

## 阶段 D｜交付

### D1 调色

先定色彩脚本，再统一执行：环境光 + 轮廓光 + 暗角三层。
优先用叠加层，少用大面积模糊（显著拖慢渲染）。

### D2 混音

| 处理 | 标准 |
|---|---|
| 配乐让位人声 | 说话段压到 0.18–0.2 |
| 淡入淡出 | 首 12 帧 / 末 24 帧 |
| 响度 | 网络 −14 LUFS；广播 −23 LUFS；真峰 −1.5 dBTP |

```bash
ffmpeg -i out/main.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy out/main.norm.mp4
```

### D3 渲染与逐帧 QA

三段渲染：

| 阶段 | 分辨率 | 目的 |
|---|---|---|
| animatic | 0.4× | 只验节奏 |
| 精修预览 | 0.5–1×，低码率 | 内容评审 |
| 终版 | 全分辨率 | 交付 |

```bash
npx remotion render src/index.ts <id> out/animatic.mp4 --scale=0.4 --crf=30 --muted
npx remotion render src/index.ts <id> out/main.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p --image-format=png
```

> `--pixel-format=yuv420p` 需搭配 `--image-format=png`；JPEG 中间帧会产出 `yuvj420p`（全范围），部分播放器偏色。

**逐镜 QA**：把成片切回镜头级，每镜检查首帧、中帧、末帧。

### D4 批量与归档

- 打包一次、多次出片；变体只改 props。
- 命名：`{campaign}/{variant}-{w}x{h}-{yyyymmdd}.mp4`
- 归档：渲染参数快照 + 依赖锁定 + 源码 tag。
- 同时交付**可编辑中间产物**，不要只给黑盒 MP4。

```ts
const serveUrl = await bundle({entryPoint: 'src/index.ts'});
for (const v of variants) {
  const composition = await selectComposition({serveUrl, id: 'Main', inputProps: v});
  await renderMedia({composition, serveUrl, codec: 'h264', inputProps: v, outputLocation: `out/${v.id}.mp4`});
}
```

---

## 时间分配参考

| 阶段 | 占比 | 说明 |
|---|---|---|
| A 立项 | 10% | 决定后面 90% 的方向 |
| B 设计 | 30% | 最不该压缩 |
| C 制作 | 40% | 主要工作量 |
| D 交付 | 20% | 可脚本化 |

门禁经济学：分镜阶段发现问题成本记为 1，实现阶段是 10，渲染后是 50。
