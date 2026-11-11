# 镜头系统

> 镜头是本流程的原子单位。本文定义镜头如何被描述、复用、约束与检查。

---

## 一、镜头的六个要素

| 要素 | 取值 | 对应实现 |
|---|---|---|
| 景别 | 大远景 / 全景 / 中景 / 近景 / 特写 | `Camera.zoom`（0.6 / 0.8 / 1.0 / 1.35 / 1.7） |
| 机位角度 | 平视 / 俯 / 仰 / 侧 | `rotate` + 轻微 `perspective` |
| 运镜 | 固定 / 推 / 拉 / 摇 / 移 / 跟 | `interpolate` 到 Camera 参数 |
| 构图 | 中心 / 三分 / 负空间 | `Stage` 槽位 |
| 时长 | 帧 | 时间轴核算 |
| 声音 | VO / SFX / 静音 | 音频轨锚点 |

缺任何一项，都会在实现阶段变成返工——因为实现者被迫替导演做决定。

---

## 二、配方卡

### 为什么需要

自由创作的结果是：每条片子都从零调曲线，风格漂移，画质下限取决于当天状态。配方卡把"调过的镜头"固化下来，选卡填参即可复现。

### 类目

| 类目 | 用途 | 典型卡 |
|---|---|---|
| `opening` | 开场钩子 | 文字遮罩、拉幕、数字跳入 |
| `camera` | 运镜 | 推近揭示、横移展示、拉远收束 |
| `transition` | 转场 | 硬切、叠化、擦除、形状转场 |
| `typography` | 文字 | 逐字上浮、错峰、字距展开 |
| `ui-entrance` | 界面入场 | 卡片堆叠、面板滑入、焦点放大 |
| `interaction` | 交互演示 | 点击涟漪、状态切换、拖拽 |
| `data` | 数据 | 数字滚动、条形增长、折线绘制 |
| `outro` | 收尾 | 落版、CTA、logo 定格 |

### 卡片字段

```json
{
  "id": "push-in-reveal",
  "category": "camera",
  "shotSize": "medium",
  "durationRange": [36, 72],
  "entry": {"type": "spring", "damping": 200},
  "camera": {"zoom": [1.0, 1.08], "easing": "outCubic"},
  "exit": {"type": "cut"},
  "audio": {"sfx": ["whoosh-01"]},
  "tags": ["reveal", "calm"]
}
```

完整约束见 `assets/templates/shot-card.schema.json`。

`exit` 不只是装饰字段：它决定这一镜怎么交给下一镜（硬切 / 叠化 / 擦除），可执行写法见 §六。

卡库在 `assets/cards/`，一卡一文件、文件名等于 id。改完跑一次结构与引用校验：

```bash
node scripts/check-recipes.mjs assets/cards
node scripts/check-recipes.mjs assets/cards --shotlist shotlist.json
```

### 选卡而非造卡

先问：这个镜头要完成什么**信息动作**（揭示/对比/强调/收束）？
再按动作检索类目，最后才调参数。参数调整幅度建议不超过卡片默认值的 ±30%，否则说明你需要的是一张新卡。

---

## 三、视觉规范

### 令牌分层

| 层 | 内容 | 变化频率 |
|---|---|---|
| 基础色板 | 背景、正文、强调、弱化 | 全片固定 |
| 字阶 | display / h1 / body / caption | 全片固定 |
| 间距 | 8px 基准 | 全片固定 |
| 圆角 | sm / md / pill | 全片固定 |
| 动效 | fast / base / slow + 缓动 | 全片固定 |
| 色彩脚本 | 分段主色 | 按段落变化 |

### 硬规则

1. 场景代码禁止裸色值与裸字号。
2. 字号只能取自 `theme.type`，不得临时 `fontSize: 47`。
3. 间距使用 `theme.space(n)`，不写 `padding: 37`。
4. 动效时长取自 `theme.motion`，保证全片节奏一致。

### 检查

```bash
node scripts/check-tokens.mjs src
```

命中即失败。允许白名单：`theme.ts`、`tokens.ts`。

---

## 四、Camera：运镜与视差

运镜统一收敛到一个组件，场景只表达"从哪到哪"，不重复写 transform。

```tsx
<Camera zoom={zoom} x={pan} rotate={tilt}>
  <Layer depth={0.2}>{/* 远景，移动慢 */}</Layer>
  <Layer depth={1.0}>{/* 主体 */}</Layer>
  <Layer depth={1.6}>{/* 前景，移动快 */}</Layer>
</Camera>
```

`depth` 会乘到相机位移上，三层即可产生空间感，成本接近零。

| 运镜 | 写法 |
|---|---|
| 推 | `zoom: 1.0 → 1.08`，缓出 |
| 拉 | `zoom: 1.12 → 1.0`，缓出 |
| 摇 | `x: 0 → -80` |
| 跟 | `x` 绑定主体运动，取反 |
| 呼吸 | `zoom: 1 ± 0.004` 正弦 |

---

## 五、Stage：构图栅格

全片共用一套栅格，避免每镜各摆各的。

```tsx
<Stage title={<Title />} subject={<Scene />} caption={<Caption />} />
```

| 槽位 | 位置 | 约束 |
|---|---|---|
| title | 左上（横屏）/ 上部（竖屏） | 不超过两行 |
| subject | 画面中心 | 占画面 1/3–1/2 |
| caption | 左下 / 底部安全区上方 | 单行，≤14 字 |

三条可检查的画面规则：

1. 一个镜头只有一个视觉重心，其余元素降饱和或缩小。
2. 主体运动方向跨镜一致，不突然反向。
3. 文字与主体不争抢：负空间是给文字的，不是剩下的。

---

## 六、跨镜转场

转场不是第三镜，而是两镜之间的缝。时间轴上把它写在**出镜那一侧**：

```json
{
  "id": "S01",
  "frames": 90,
  "transition": {"type": "wipe", "frames": 16, "direction": "from-left", "card": "shape-wipe"}
}
```

| 字段 | 含义 | 约束 |
|---|---|---|
| `type` | `fade` 叠化 / `wipe` 擦除 | 硬切就不写 `transition` |
| `frames` | 与下一镜重叠的帧数 | 小于相邻较短镜；超过 24 帧就不再像转场 |
| `direction` | 擦除方向 | 承接上一镜运动方向，反向会顶住观众 |
| `card` | 取自哪张转场卡 | `assets/cards/` 的 id，`frames` 取自该卡 `exit.durationInFrames` |

渲染端用 `assets/templates/Transitions.tsx`：`sequenceFrames()` 把重叠帧补在序列尾部，`exitTransition()` 生成 `TransitionSeries.Transition`。因此成片帧数 = Σ 镜头帧，门禁 G3 的口径不变；
`node scripts/check-timeline.mjs` 会把「序列合计 − 重叠 = 成片」打出来，便于核对。

三条判断：

1. 转场要有动机（换场、跳时间、换视角）；没有动机就硬切。
2. 全片转场种类不超过两种，同一种方向保持一致。
3. 转场期间不交付信息：观众在看缝，没在看内容。
4. 叠化挑构图：两镜的主元素不在同一位置才能叠；两句同位置的大字叠在一起就是糊字。

---

## 七、节奏参考

| 场景 | 平均镜头长度 |
|---|---|
| 开场钩子 | ≤2s |
| 社交短视频整体 | 1.5–3s |
| 产品演示 | 2–4s |
| 数据解说 | 4–6s |
| 收尾落版 | 2–3s |

判断标准不是"够不够快"，而是**信息是否能被读完**。字幕每行停留 ≥1.2s，否则观众读不完。

---

## 八、跨镜连续性检查

| 检查项 | 问题表现 |
|---|---|
| 景别是否有变化 | 连续三镜同景别 → 画面平 |
| 运动方向是否一致 | 上一镜左进、下一镜左出 → 观众迷失 |
| 色彩是否跳变 | 同段落内主色跨度过大 → 廉价感 |
| 字号是否跳变 | 标题每镜不同大小 → 无体系 |
| 声音是否连续 | 每镜都换 BGM 段落 → 断裂 |
