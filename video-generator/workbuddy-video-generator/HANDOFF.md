# 交接说明 · 《Llama 4 MoE》知识视频

> 给「WorkBuddy 国内版」的接手说明。读完这一份就能继续做，不需要回溯聊天记录。
> 生成时间：2026-11-02 22:20
> **v3 修订（23:20）**：分镜升到 **19 镜 / 190s**——插 Shot 06「MoE 从哪来」（1991 dense → 2017 稀疏门控）、Shot 03 加 Llama backronym 标签、片尾恢复研究问题。以 `分镜_v2_3min.md`（v3）与 `讲稿.md` 为准。

---

## 0. 项目在哪

仓库根 = 本文件所在目录（`vibe-knowledge-video/`），下面所有路径都相对它。

这是**唯一源**（纯本地，无 remote）。同一份内容另有公开镜像：
`https://github.com/zrqworkmail-cloud/Skills` 的 `video-generator/workbuddy-video-generator/`（单向快照，**不要在这里改**）。

---

## 1. 这个片子是什么

- **场景**：研究生课程《自然语言处理》课堂汇报，PPT 讲完之后播放的补充讲解视频。
- **主题**：Llama 4 的 MoE（混合专家），重点是「Llama 与其它模型 MoE 的异同」。
- **规格**：1920×1080 / 24fps / 横版 / 全片约 178s（18 镜，多数 10s，Shot 03 为 8s）。
- **数据口径**：所有时效性数据截至 **2026-11-02**。
- **旁白**：现场讲，不上 TTS；视频只有 BGM + 音效。

---

## 2. 已完成 / 未完成

| 镜号 | 内容 | 状态 | 文件 |
|---|---|---|---|
| 01 | 400B 总参数 vs 17B 激活，金波扫过 17 个金点，7.00s 到 17B | ✅ 10s | `out/sample-v7.mp4` |
| 02 | 不是压缩：MoE 字标 + 「以为是压缩 vs 实际是 MoE」比例条，星云随文字压缩/复原 | ✅ 10s | `out/shot02.mp4` |
| 03 | 2023 LLaMA 1：7B–65B、1.0–1.4T token、13B vs 175B 同心圆 | ✅ 8s | `out/shot03.mp4` |
| 04 | 2024 Llama 3.1 405B 稠密：token 逐层穿过 126 层 | ✅ 10s | `out/shot04.mp4` |
| 05–19 | 见 `films/llama4-moe/分镜_v2_3min.md`（v3 / 19 镜 / 190s；新增 Shot 06「MoE 从哪来」） | ⬜ 待做 | — |

**带音效版本**（BGM + 事件音效）在 `films/llama4-moe/out/av/shot01..04.mp4`。

下一镜是 **Shot 05：成本墙**——405B 的推理成本随参数线性上涨，撞上成本红线（分镜文档第 05 行）。

---

## 3. 视觉系统（改任何一镜都要遵守）

### 3.1 页网格（`src/llama4moe/Slide.tsx`，全片共用）

- 画布 1920×1080，边距 **36px**
- 页眉：kicker 18px / 标题 32px（y=46）/ 通栏细线 y=96
- 右上院标：`public/cai-logo.png`，`top:2, height:98, width:541`，正好填满上边缘到横线的空白（上下各留 11px）
- 页脚：y=1016 起 64px 高，grid 三栏垂直居中；日期 22px / 英文校名 19px / 页码 22px，Times New Roman

### 3.2 色板

| 用途 | 值 |
|---|---|
| 底色 | `#03050A` |
| 主白 | `#FFFFFF` |
| 次白（说明文字） | `#A9C0D8` |
| 弱化（注释） | `#6B7785` |
| 金（强调） | `#F5C26B`，浅金 `#FFE2A8` |
| 青（连线） | `#7FD4E8` |

### 3.3 字体

- 中文：微软雅黑
- 数字/英文标题：**Agency FB**（压缩体，科技感）
- 页脚英文：Times New Roman

### 3.4 星云（`src/llama4moe/nebula.ts`，全片共用同一份数据）

- 320 个节点 + 63 团气体 + 近邻连线；`project3(p, camZ, ry, rx, fx, fy, k)` 透视投影
- **切镜要接得上**：Shot 01 末帧与 Shot 02 首帧用同一机位 `camZ 2.589 / rotY 0.748 / rotX 0.033 / 中心 760,520`（`REF_CAM`）
- 金点选取：`pickGold(n)` 按**屏幕空间方位角**等距取，不要用 3D 方位角（透视会把点压向一侧）

### 3.5 动效铁律

- **零镜头晃动**：不做全局推拉/平移/扫描线
- 只做**元素级动作**：点亮、draw-on、数字滚动、条形伸缩、路径生长
- 每镜 ≤1 个主运动；不为凑质检加呼吸/漂浮/粒子
- 长时间没变化 → **先缩短镜头或改结构**，不是加特效

---

## 4. 内容口径（容易出错，务必遵守）

1. **「1 点 = 1B」只用于 MoE 的激活参数**（Shot 01/02 的 17 个金点 = 17B 激活）。
2. **稠密模型的参数量不能画成「点亮少数点」**。Shot 03 的 13B 是 LLaMA-13B 的**总参数**，全部参与计算，所以那一镜的星云**不再点亮任何点**（已修正）。
3. **Llama 1/2/3/3.1 全是稠密**，只有 Llama 4 是 MoE；「Llama 的 MoE 演进」只有一次：稠密 → MoE。
4. **Llama 4 Maverick = 400B 总 / 17B 激活 / 128 路由专家 + 1 共享专家 / top-1 路由**；Scout 是 109B/17B/16 专家。
5. **2026 年 Meta 没再发「Llama」品牌新模型**：Muse Spark（2026-04，闭源）、Muse Glimmer（2026-08，30B **稠密**开源）。Llama 4 很可能是最后一代 Llama。
6. 对比数据表见 `films/llama4-moe/架构对比_2026-11-02.md`（含同期对比 + 截至今天两张表，开源/闭源分开）。

---

## 5. 怎么继续做

### 5.1 环境

| 依赖 | 路径 / 说明 |
|---|---|
| Node + Remotion | `reference/remotion/`，已装 `node_modules` |
| Chromium | 用环境变量 `CHROME_EXECUTABLE_PATH` 指向本机 Playwright 的 chromium（**不写死绝对路径**，换机器就失效） |
| Python | 本机 WorkBuddy 托管的 Python 3.13（numpy / imageio-ffmpeg 可用），用 `sys.executable` 取，不用写死路径 |
| ffmpeg | 用 `imageio_ffmpeg.get_ffmpeg_exe()`，系统无 ffmpeg |
| BGM | `assets/audio/VibeKnowledgeBGM_20min.m4a`（20:00，44.1kHz） |
| 音效 | `assets/audio/sfx/*.wav`（8 个，纯 numpy 合成，无版权问题） |

### 5.2 渲染一镜

```bash
cd reference/remotion
export CHROME_EXECUTABLE_PATH="<本机 Playwright chromium 可执行文件路径>"
export CHROME_HEADLESS=true
./node_modules/.bin/remotion render Llama4MoEShot05 out/shot05.mp4 --concurrency=4
```

新镜头要：
1. 在 `src/Llama4MoEShot05.tsx` 写组件，用 `<SlideFrame kicker title page>` 包住
2. 在 `src/Root.tsx` 注册 `<Composition id="Llama4MoEShot05" durationInFrames={240} fps={24} width={1920} height={1080} />`

### 5.3 混音（BGM 按全片时间轴取段 + 事件音效）

编辑 `films/llama4-moe/mix_audio.py` 的 `SHOTS` 表，加一行：

```python
("shot05", "shot05.mp4", 10.0, 38.0, [
    (0.20, "whoosh", -18),
    (1.20, "impact", -12),
]),
```

- 第 3 个参数是时长，第 4 个是 **BGM 起点 = 该镜在全片的起始秒**（Shot 01–04 分别是 0 / 10 / 20 / 28；**05 起见分镜 §6 起点表**，新插的 Shot 06 使 05 之后整体 +10s）
- 音效名：`tick` `pop` `whoosh` `sink` `riser` `ding` `impact` `shimmer`
- 跑 `python films/llama4-moe/mix_audio.py`，输出到 `out/av/shotNN.mp4`

### 5.4 质检

```bash
python films/llama-tech-lineage/qc_film.py <成片>
```

⚠️ **已知问题**：这个脚本的「全帧平均灰度差 < 0.002 记冻结」判据**只适合有大面积运动的镜头**。文字/时间轴型镜头永远过不了（Shot 03/04 逐帧最大差异只有 0.0005–0.0013，但人眼有节奏）。

建议改用**元素活动度**（480×270，24×24 块均值 >2 灰度）：
- Shot 01：95% 帧有活动 / 最长静止 0.50s
- Shot 02：49% / 1.96s
- Shot 03：38% / 1.71s
- Shot 04：36% / 1.96s

判据建议：**最长无活动 ≤3s，有活动帧 ≥30%**。脚本还没固化，接手后可以补 `scripts/qc_elements.py`。

---

## 6. 已踩过的坑（别再踩）

| 坑 | 现象 | 解法 |
|---|---|---|
| `radial-gradient` 默认 farthest-corner | 光晕 div 边缘 alpha 不为 0，露出**矩形/竖线边界** | 写 `closest-side`，或干脆别用 div 画光晕，改用 text-shadow |
| 3D 方位角取金点 | 透视把点压向一侧 | 按**屏幕空间**方位角等距取（`pickGold`） |
| 金点尺寸按固定系数映射 | 归一化区间没覆盖实际 range，全部饱和成同一尺寸 | 逐帧对 17 个点的 `scale` 做 min-max 归一化 |
| 切镜对不上 | Shot 02 首帧比 Shot 01 末帧亮/少一个激活核心 | 首帧补 `coreGlow`，金点公式两镜统一 |
| 光斑/闪光残留 | 按波半径算衰减，片尾永远衰减不完 | 改成「点亮后 N 帧」时间衰减 |
| SVG `<g>` 包 HTML `<div>` | 浏览器不渲染 | 用 `React.Fragment` |
| Remotion CLI 入口 | `node @remotion/cli/dist/index.js` 静默退出 0 | 用 `./node_modules/.bin/remotion` |

---

## 7. 交接步骤（国内版）

1. 用国内版 WorkBuddy **打开仓库根目录**（就是本文件所在目录）
2. 让它先读这份 `HANDOFF.md`，再读 `films/llama4-moe/分镜_v2_3min.md`。
3. 需要的技能（如果国内版没有，装到 `~/.workbuddy-ai/skills/`）：
   - `workbuddy-video-workflow`（本地已有副本：`~/.workbuddy-ai/skills/workbuddy-video-workflow`）
4. 直接说「继续做 Shot 05」即可，上下文都在这份文档里。

> 注意：用户级记忆（`~/.workbuddy-ai/user-.../MEMORY.md`、`SOUL.md`）属于当前客户端，国内版不一定读得到。**所有关键约定都已经写进本文件**，不依赖记忆。
