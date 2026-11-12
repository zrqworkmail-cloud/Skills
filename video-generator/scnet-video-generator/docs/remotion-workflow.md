# Remotion 视频动画制作流程表

> 版本：v2.1（对齐流程包 v2：跨镜转场实现）
> 适用：Remotion 4.x · Node 20/22 LTS
> 用途：按阶段执行、按门禁验收的实操手册

---

## 文档说明

| 项 | 说明 |
|---|---|
| 核心模型 | 画面 = `f(frame)` 的**纯函数**，逐帧截图后由 FFmpeg 编码 |
| 使用方式 | 六个阶段顺序推进，每阶段末尾的 ✅ 验收项全部通过才进入下一阶段 |
| 版本约定 | 命令以 v4 CLI 为准（`remotion studio` / `remotion render`） |
| 参数取值 | 平台规格、耗时量级为经验值，以平台最新规范与实测为准 |

**全局铁律**：禁用 `Math.random()`、`Date.now()`、CSS `animation`、`useEffect` 驱动视觉。同一帧渲染两次必须完全一致。

### 目录

1. 总览与阶段门禁
2. 阶段一：环境与项目初始化
3. 阶段二：素材与数据准备
4. 阶段三：Composition 与参数定义
5. 阶段四：动画实现（时间轴 / 转场 / 插值 / 弹簧）
6. 阶段五：预览与调试
7. 阶段六：渲染输出
8. 附录 A：平台规格预设
9. 附录 B：帧与时间换算
10. 附录 C：交付前检查清单
11. 附录 D：修订记录

---

## 1. 总览与阶段门禁

```mermaid
flowchart LR
  A["1 环境与初始化"] --> B["2 素材与数据"]
  B --> C["3 Composition 与参数"]
  C --> D["4 动画实现"]
  D --> E["5 预览与调试"]
  E -->|"未过验收"| D
  E --> F["6 渲染输出"]
```

| 阶段 | 目标 | 关键产出 | ✅ 通过门禁 | 耗时占比 |
|---|---|---|---|---|
| 1 环境与初始化 | 跑通空白合成 | 可启动的工程 | Studio 能播放 1 个合成 | 5% |
| 2 素材与数据 | 资源确定性加载 | 资源表 + 数据 JSON | 首帧字体/图片已就位 | 15% |
| 3 Composition 与参数 | 规格与入参定稿 | `Root.tsx` + 类型 | 横竖屏都能列出、时长正确 | 10% |
| 4 动画实现 | 动效落地 | 场景组件 + 工具库 | 每段单独可播 | 45% |
| 5 预览与调试 | 问题清零 | 通过验收的时间轴 | 关键帧抽图无异常 | 15% |
| 6 渲染输出 | 正确出片 | MP4/MOV/封面 | `ffprobe` 校验通过 | 10% |

---

## 2. 阶段一：环境与项目初始化

**目标**：30 分钟内让 Studio 打开一个能播放的空白合成。

### 2.1 操作步骤

1. 安装 Node.js 20/22 LTS，确认 `node -v`、`npm -v`。
2. 创建项目：`npx create-video@latest`，选空白模板。
3. 安装基础依赖与后续要用的可选包（一次装齐，避免反复中断）：
   ```bash
   npm i
   npm i @remotion/transitions @remotion/media-utils @remotion/google-fonts @remotion/layout-utils zod
   ```
4. 启动预览：`npm run studio`（等价 `npx remotion studio`）。
5. 打开 `http://localhost:3000`，左侧出现 Composition 列表即成功。
6. 建立目录骨架：`src/scenes/`、`src/components/`、`src/lib/`、`src/data/`、`public/`。
7. 配置 `remotion.config.ts`（全局默认，CLI 可覆盖）。
8. 初始化 Git，`.gitignore` 加入 `node_modules/`、`out/`。

### 2.2 常用命令

```bash
node -v && npm -v
npx create-video@latest my-video && cd my-video && npm i
npm run studio
npx remotion studio --port=3001
npx remotion compositions src/index.ts
npx remotion browser ensure          # 预下载无头浏览器，避免首渲等待
```

### 2.3 关键 API / 文件

| 项 | 作用 | 要点 |
|---|---|---|
| `src/index.ts` | 入口 | 只做 `registerRoot(RemotionRoot)` |
| `registerRoot()` | 注册根组件 | 全项目仅一次 |
| `remotion.config.ts` | 全局渲染配置 | CLI 参数优先级更高 |
| `Config.setOverwriteOutput(true)` | 允许覆盖同名输出 | 否则每次重渲报文件已存在 |
| `Config.setVideoImageFormat('jpeg')` | 截图中间格式 | jpeg 更快；透明背景必须 png |
| `Config.setConcurrency(n)` | 并发页数 | 默认约核数一半 |
| `Config.setChromiumOpenGlRenderer('angle')` | GL 后端 | 异常时改 `swiftshader` |

### 2.4 产出与验收

- 产出：可运行工程、目录规范、配置文件、Git 基线。
- ✅ `npm run studio` 能播放默认合成；`npx remotion compositions` 能列出合成 id。

### 2.5 注意事项

- 不要用 Vite/Next 的开发服务器替代 `remotion studio`，帧注入会失效。
- Windows 渲染异常优先怀疑 GL 后端，而不是代码。
- Node 版本过低会在安装 `@remotion/*` 时报引擎不匹配。
- 公司网络下浏览器下载失败：设镜像源或提前执行 `npx remotion browser ensure`。

---

## 3. 阶段二：素材与数据准备

**目标**：所有外部依赖（图、字、音、视频、JSON）都能被**确定性**加载。

### 3.1 操作步骤

1. 素材按类型归位：`public/img/`、`public/audio/`、`public/video/`、`public/fonts/`。
2. 代码一律 `staticFile('img/logo.png')`，不写相对路径或外链。
3. 组件选型固定：图片 `<Img>`、视频 `<OffthreadVideo>`、音频 `<Audio>`。
   > v4.0.3xx 起另有 `@remotion/media` 提供基于 WebCodecs 的 `<Video>` / `<Audio>`，编码兼容性更好。**同一项目内二选一，不要混用**，否则 seek 行为不一致。
4. 字体：优先 `@remotion/google-fonts`（一行 `loadFont`）；本地字体用 `@remotion/fonts` 的 `loadFont({family, url, weight})`。
5. 数据：静态数据放 `src/data/*.json` 直接 import；异步数据用 `fetch` + `delayRender` / `continueRender`。
6. 建 `src/data/manifest.ts` 统一导出资源路径与时长，杜绝散落硬编码。
7. 量时长：音频用 `getAudioDurationInSeconds()`（`@remotion/media-utils`）；只取元信息用 `parseMedia()`（`@remotion/media-parser`），不整段解码。

### 3.2 常用命令

```bash
# 素材标准化（示例）
ffmpeg -i raw.mov -vf scale=1920:-2 -r 30 -c:v libx264 -crf 20 public/video/bg.mp4

# 量音频时长
ffprobe -v error -show_entries format=duration -of csv=p=0 public/audio/bgm.mp3
```

### 3.3 关键 API

| API | 用途 | 要点 |
|---|---|---|
| `staticFile(path)` | 生成 `public/` 的 URL | 仅接受 `public/` 内相对路径 |
| `<Img src>` | 图片 | 内置 `delayRender`，不会截到白图 |
| `<OffthreadVideo src>` | 视频抽帧 | `startFrom` / `endAt` 单位是**帧** |
| `<Audio src volume>` | 音频 | `volume` 可传函数做淡入淡出 |
| `delayRender(label)` / `continueRender(h)` | 阻塞渲染直到就绪 | 必须成对；失败用 `cancelRender(e)` |
| `getAudioDurationInSeconds()` | 音频秒数 | 来自 `@remotion/media-utils` |
| `parseMedia()` | 元信息探测 | 来自 `@remotion/media-parser`，不加载整段 |
| `getStaticFiles()` | 列出 public 资源 | 适合做素材池 / 轮播 |
| `loadFont()` | 加载字体 | 加载完成前不截帧 |

### 3.4 产出与验收

- 产出：规范化的 `public/`、`manifest.ts`、props 数据 JSON、时长清单。
- ✅ 首帧截图里字体、图片、logo 全部就位；`still` 连出三次完全一致。

### 3.5 注意事项

- **字体闪烁**是最常见问题：首帧用了 fallback 字体。必须走 `loadFont` 或 `document.fonts.ready`。
- 图片体积直接决定渲染内存，先降到实际显示尺寸的 1.2 倍。
- 视频素材转成恒定帧率（CFR），VFR 会导致抽帧错位。
- 用最长文案做排版压力测试。
- 音乐与字体需确认商用授权；Remotion 自身 License 按团队规模分级（个人/小团队免费，更大规模需公司授权）。

---

## 4. 阶段三：Composition 与参数定义

**目标**：把「画布规格 + 入参契约」一次性定死，后面只改实现不改接口。

### 4.1 操作步骤

1. 先查平台规格预设（附录 A），定分辨率、帧率、时长。
2. 算总帧数：`durationInFrames = Math.round(秒 × fps)`，只用整数帧。
3. 注册 `<Composition>`，填 `id / width / height / fps / durationInFrames / component / defaultProps`。
4. 定义 `type Props`，组件签名 `React.FC<Props>`，`defaultProps` 必须满足该类型。
5. 需要 Studio 表单调参 → 加 `schema`（Zod，需装 `zod`）。
6. 时长依赖数据/音频 → 用 `calculateMetadata` 动态返回。
7. 横竖屏、多语言注册多个 Composition，共用场景组件，用 `Folder` 分组。
8. 需要封面图时注册 `<Still>`。

### 4.2 参考骨架

```tsx
// src/Root.tsx
import {Composition, Folder, Still} from 'remotion';
import {Main} from './Main';
import {Cover} from './Cover';
import {mainSchema} from './schema';
import type {MainProps} from './types';

const defaultProps: MainProps = {
  title: '季度数据回顾',
  accent: '#4F7CFF',
  items: [{id: 'a', label: '转化率', value: 32}],
};

export const RemotionRoot = () => (
  <Folder name="成片">
    <Composition
      id="MainLandscape"
      component={Main}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={360}
      defaultProps={defaultProps}
      schema={mainSchema}
    />
    <Composition
      id="MainVertical"
      component={Main}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={360}
      defaultProps={defaultProps}
      schema={mainSchema}
      calculateMetadata={async ({props}) => ({
        durationInFrames: Math.round((8 + props.items.length * 1.2) * 30),
      })}
    />
    <Still
      id="Cover"
      component={Cover}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
    />
  </Folder>
);
```

### 4.3 常用命令

```bash
npx remotion compositions src/index.ts
npx remotion studio --props=./props.json
npx remotion still src/index.ts Cover out/cover.png
```

### 4.4 关键 API

| API | 用途 | 要点 |
|---|---|---|
| `<Composition>` | 定义一个可渲染单元 | `id` 全局唯一，渲染按 id 指定 |
| `useVideoConfig()` | 读 `fps / width / height / durationInFrames` | 组件内禁止硬编码 30 |
| `defaultProps` | Studio 与 CLI 的默认入参 | 必填，类型与组件一致 |
| `calculateMetadata` | 异步算时长/尺寸/改 props | 会被多次调用，内部不要有副作用 |
| `getInputProps()` | 运行时读取 CLI 传入参数 | 已与默认值合并后的结果 |
| `schema`（Zod） | Studio 参数表单 + 校验 | 需安装 `zod` |
| `<Still>` | 静态图（封面/缩略图） | 与 Composition 分开注册 |
| `<Folder>` | 分组 | 多版本管理 |

### 4.5 产出与验收

- 产出：稳定的 Composition 清单、`types.ts`、`defaultProps`、可覆盖的数据接口。
- ✅ `npx remotion compositions` 列出全部 id；修改 `--props` 后时长与文案随之变化。

### 4.6 注意事项

- 帧率定稿后不要中途改，弹簧手感全绑在 `fps` 上。
- `durationInFrames` 少一帧就会截掉末帧落版，尾部留 6–12 帧。
- 竖屏不要等比缩放横屏元素，要重排布局（上下各留 15% 安全区）。

---

## 5. 阶段四：动画实现（时间轴 / 转场 / 插值 / 弹簧）

**目标**：把分镜拆成「场景 + 元素 + 时间窗」，用三种原语组合出所有运动。

### 5.1 先写工具库，再写组件

把样板收敛到 `src/lib/anim.ts`，组件里只表达「谁、在什么时间、做什么」。

```ts
// src/lib/anim.ts
import {interpolate, spring, Easing} from 'remotion';

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 秒 → 帧 */
export const sec = (s: number, fps: number) => Math.round(s * fps);

/** 淡入 */
export const fadeIn = (frame: number, start = 0, dur = 15) =>
  interpolate(frame, [start, start + dur], [0, 1], CLAMP);

/** 弹簧进度（带起始延迟） */
export const springIn = (frame: number, fps: number, delay = 0, damping = 16) =>
  spring({frame: Math.max(0, frame - delay), fps, config: {damping}});

/** 进度 → 位移 + 透明，最常用的入场样式 */
export const rise = (p: number, distance = 32) => ({
  opacity: p,
  transform: `translateY(${(1 - p) * distance}px)`,
});

/** 缓动进度 */
export const easeOut = (frame: number, dur = 20) =>
  interpolate(frame, [0, dur], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
```

```tsx
// src/scenes/Body.tsx
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {springIn, rise} from '../lib/anim';

export const Body: React.FC<{items: Item[]}> = ({items}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
      {items.map((item, i) => (
        <div key={item.id} style={rise(springIn(frame, fps, i * 4), 32)}>
          {item.label}
        </div>
      ))}
    </div>
  );
};
```

### 5.2 时间轴组织

| 需求 | 做法 |
|---|---|
| 顺序分镜 | `<Series>` + `<Series.Sequence durationInFrames>`，自动累计偏移 |
| 带转场 | `<TransitionSeries>` + `<TransitionSeries.Transition>`（`@remotion/transitions`，写法见 5.3） |
| 元素时间窗 | `<Sequence from durationInFrames>` |
| 重素材预加载 | `<Sequence premountFor={30}>`，提前 30 帧挂载 |
| 元素错峰 | `delay = i * gap`，gap 取 3–6 帧 |

```tsx
<Series>
  <Series.Sequence durationInFrames={90}><Intro /></Series.Sequence>
  <Series.Sequence durationInFrames={180}><Body items={items} /></Series.Sequence>
  <Series.Sequence durationInFrames={90}><Outro /></Series.Sequence>
</Series>

<Sequence from={30} durationInFrames={60} name="标题" premountFor={15}>
  <Title text="季度回顾" />
</Sequence>
```

> `<Sequence>` 内的 `useCurrentFrame()` **从 0 重新计时**；`layout="none"` 只重置时间、不影响布局流。

### 5.3 跨镜转场：字段与重叠核算

转场不是第三镜，是两镜之间的缝。做法：把转场写在**出镜那一侧**的时间轴字段里，渲染端用 `TransitionSeries` 让两镜重叠，不新增一段「转场镜头」。

**时间轴字段**

| 字段 | 含义 | 约束 |
|---|---|---|
| `type` | `fade` 叠化 / `wipe` 擦除 | 硬切就不写 `transition` |
| `frames` | 与下一镜重叠的帧数 | 小于相邻较短镜；超过 24 帧就不再像转场 |
| `direction` | 擦除方向（`from-left` 等 8 个方向） | 承接上一镜运动方向，反向会顶住观众 |
| `card` | 取自哪张转场卡 | 卡库 id，`frames` 取该卡 `exit.durationInFrames` |

```json
{
  "id": "S01",
  "frames": 90,
  "transition": {"type": "wipe", "frames": 16, "direction": "from-left", "card": "shape-wipe"}
}
```

**时间账（最容易算错的一步）**

| 量 | 公式 | 例 |
|---|---|---|
| 序列时长 | 镜头帧 + 出镜转场帧 | 90 + 16 = 106 |
| 成片帧数 | Σ 序列 − Σ 重叠 | 928 − 28 = 900 |

重叠帧补在序列尾部，镜头自己的内容一帧不少，`durationInFrames` 仍等于 Σ 镜头帧。校验脚本会把这一行打出来，对不上就是算错了：

```
转场：2 处重叠共 28 帧；序列合计 928 帧 − 重叠 28 = 成片 900 帧
```

**Transitions.tsx**

流程包把两件事收进 `assets/templates/Transitions.tsx`：

| 导出 | 作用 |
|---|---|
| `exitTransition(spec, key)` | 按 `type` 生成 `TransitionSeries.Transition`：`wipe` 走 `wipe({direction})`，`fade` 走 `fade()`，时长用 `linearTiming` |
| `sequenceFrames(shot, isLast)` | 序列时长 = 镜头帧 + 出镜转场帧；末镜不加 |

有个硬约束：`<TransitionSeries>` 的直接子元素必须是它自己的 `Sequence` / `Transition`，包一层自定义组件会被判成非法子元素。所以模板导出的是**元素工厂**，按数组铺：

```tsx
const buildTrack = (shots: Shot[]) => {
  const children: React.ReactNode[] = [];
  shots.forEach((shot, index) => {
    const isLast = index === shots.length - 1;
    children.push(
      <TransitionSeries.Sequence key={shot.id} durationInFrames={sequenceFrames(shot, isLast)}>
        <Scene {...shot.props} />
      </TransitionSeries.Sequence>,
    );
    if (!isLast && shot.transition) children.push(exitTransition(shot.transition, `${shot.id}-out`));
  });
  return children;
};
```

**四条判断**

1. 转场要有动机（换场、跳时间、换视角）；没有动机就硬切。
2. 全片转场种类不超过两种，同一种方向保持一致。
3. 转场期间不交付信息：观众在看缝，没在看内容。
4. 叠化挑构图：两镜的主元素不在同一位置才能叠；两句同位置的大字叠在一起就是糊字。

---

### 5.4 插值（interpolate）

- 语法：`interpolate(frame, 输入区间数组, 输出区间数组, 选项)`。
- **必须**设 `extrapolateLeft/Right: 'clamp'`，否则区间外继续外推，元素飞出画面。
- 缓动放 `easing: Easing.*`，不用 CSS `transition`。
- 颜色过渡用 `interpolateColors()`。

```tsx
const opacity = interpolate(frame, [0, 15], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic),
});

const bg = interpolateColors(frame, [0, 60], ['#0B1020', '#1B2A5E']);
```

### 5.5 弹簧（spring）

- `spring({frame, fps, config})` 输出 0→1，天然带过冲，适合「有重量」的入场。
- 手感对照：

  | 效果 | config |
  |---|---|
  | 干脆落位、无回弹 | `{damping: 200}` |
  | 轻微弹性 | `{damping: 16}` |
  | 明显回弹 | `{damping: 8, mass: 1.2}` |

- 不知道弹簧多长 → `measureSpring({fps, config})` 量出帧数。
- 需要延后 N 帧 → `frame - delay`，并用 `Math.max(0, ...)` 防负帧。
- 弹簧只产出进度，位移/缩放再用 `interpolate` 映射，便于复用与串联。

```tsx
const enter = spring({frame: Math.max(0, frame - 6), fps, config: {damping: 16}});
const y = interpolate(enter, [0, 1], [40, 0]);
const scale = interpolate(enter, [0, 1], [0.92, 1]);
```

### 5.6 关键 API 全表

| API | 用途 | 关键点 |
|---|---|---|
| `useCurrentFrame()` | 当前帧（0 起） | Sequence 内会重置 |
| `useVideoConfig()` | fps / 尺寸 / 总帧 | 秒↔帧换算基准 |
| `useCurrentScale()` | 当前渲染缩放 | `--scale` 或 Studio 缩放时保护 px 值（线宽/圆角/模糊） |
| `interpolate()` | 数值/数组映射 | 必设 clamp |
| `interpolateColors()` | 颜色过渡 | 支持 hex/rgb/hsl |
| `spring()` | 物理弹簧进度 | `damping/mass/stiffness/overshootClamping/durationInFrames` |
| `measureSpring()` | 量弹簧帧长 | 用于排时间轴 |
| `Easing.*` | 缓动函数 | `bezier/in/out/inOut/elastic/back/bounce` |
| `AbsoluteFill` | 满屏容器 | 场景根节点标配 |
| `<Sequence>` | 时间窗 + 帧重置 | `from/durationInFrames/layout/premountFor` |
| `<Series>` / `<Series.Sequence>` | 顺序拼接 | `offset` 可重叠 |
| `<TransitionSeries>` | 场景转场 | `springTiming/linearTiming` + `fade/slide/wipe`；重叠帧从总长里扣，见 5.3 |
| `random(seed)` | 确定性随机 | 替代 `Math.random()` |
| `getAudioData()` | 音频波形 | 做可视化 / 卡点 |
| `<CameraMotionBlur>` | 运动模糊 | `@remotion/motion-blur`，不要手写 |

### 5.7 产出与验收

- 产出：按场景拆分的组件树 + `anim.ts`；`src/timeline.md`（元素 × 起止帧对照表）。
- ✅ 每个 `Sequence` 单独拖时间轴可独立播放；随机元素连出两次一致。

### 5.8 注意事项

- 三大抖动来源：`Math.random()`、`useState` 驱动视觉、CSS 动画残留。
- 同一属性不要叠加两个 `spring`，一个属性只留一个主驱动。
- `transform` 顺序影响视觉：团队统一「先 translate 后 scale」。
- 动 `opacity` / `transform`，不要动 `width` / `height`（触发布局重算，渲染变慢）。
- 循环动画用 `frame % period`，不要用 `setInterval`。

---

## 6. 阶段五：预览与调试

**目标**：渲染前把问题全部暴露，避免「渲 10 分钟发现错一帧」。

### 6.1 操作步骤

1. Studio 逐段拖时间轴，重点看**首帧、转场接缝、末帧**。
2. 用 Props 面板灌极端值：超长文案、空数组、0、负数。
3. 关键帧单独出图，放大看对齐与字体。
4. 小样渲染（`--frames` + `--scale=0.5`）供他人评审。
5. 浏览器 DevTools 查 404、字体加载、console 报错。
6. **确定性验证**：同一帧出两次图，比对哈希。
7. 性能排查：看单帧耗时，卡顿优先降图片分辨率、减 `blur/filter`、减少同时挂载的 DOM。

### 6.2 常用命令

```bash
npx remotion studio

npx remotion still src/index.ts MainLandscape out/check-090.png --frame=90

npx remotion render src/index.ts MainLandscape out/draft.mp4 \
  --frames=0-149 --scale=0.5 --crf=28 --log=verbose

# 确定性验证（Windows）
npx remotion still src/index.ts MainLandscape out/a.png --frame=120
npx remotion still src/index.ts MainLandscape out/b.png --frame=120
certutil -hashfile out/a.png SHA256
certutil -hashfile out/b.png SHA256

# macOS / Linux
# shasum -a 256 out/a.png out/b.png
```

> 两个哈希必须一致；不一致说明存在随机或异步依赖。

### 6.3 产出与验收

- 产出：已确认的时间轴、低分辨率草稿视频。
- ✅ 哈希一致；三个关键帧无错位/闪烁；他人评审无阻塞意见。

### 6.4 排查表

| 现象 | 最可能原因 | 处理 |
|---|---|---|
| 卡在 x% 不动 | `delayRender` 未配对 | 给每个 handle 加标签定位 |
| 画面全黑 | 无背景 / z-index / GL 后端 | 查 `AbsoluteFill` 背景与 `--gl` |
| 首帧字体跳变 | fallback 字体 | `loadFont` / `document.fonts.ready` |
| 图片空白 | 用了相对路径 | 改 `staticFile()` |
| 每帧随机变化 | `Math.random()` / `Date.now()` | 改 `random(seed)` |
| 输出已存在报错 | 未开覆盖 | `Config.setOverwriteOutput(true)` |
| 音画不同步 | `startFrom` 用了秒 | 换成帧；核对采样率 |
| 转场时字叠字、画面糊 | 两镜主元素在同一位置做叠化 | 换硬切 / 擦除，或把构图错开 |
| 只在本机正常 | 路径大小写 / 字体缺失 | 资源全部入库 |
| `Composition not found` | id 拼错 / 入口文件不对 | `npx remotion compositions` 核对 |

---

## 7. 阶段六：渲染输出

**目标**：按交付平台产出正确编码、正确码率、正确色彩的文件。

### 7.1 操作步骤

1. 确认分辨率、帧率、目标平台（附录 A）。
2. 默认值写进 `remotion.config.ts`，CLI 只做覆盖。
3. 完整渲染一次，记录耗时与内存峰值。
4. `ffprobe` 校验：时长、帧数、fps、`pix_fmt`、音轨。
5. 抽 2–3 帧与原 `still` 对比，确认无色偏/压缩块。
6. 需要透明 → ProRes 4444 或 VP9+alpha；需要序列帧 → `--sequence`。
7. 多版本 / 大规模 → Lambda 或 Docker 镜像并发。

### 7.2 常用命令

```bash
# 标准交付
npx remotion render src/index.ts MainLandscape out/main.mp4 \
  --codec=h264 --crf=18 --pixel-format=yuv420p \
  --audio-bitrate=320k --concurrency=8 --image-format=jpeg

# 高质量中间片（可再进剪辑软件）
npx remotion render src/index.ts MainLandscape out/master.mov \
  --codec=prores --prores-profile=4444 --image-format=png

# 透明背景
npx remotion render src/index.ts MainLandscape out/alpha.webm \
  --codec=vp9 --pixel-format=yuva420p

# 序列帧 / 封面
npx remotion render src/index.ts MainLandscape out/frames --sequence --image-format=png
npx remotion still src/index.ts Cover out/cover.png --frame=0

# 校验
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt \
  -of default=nw=1 out/main.mp4
```

### 7.3 参数全表

| 参数 | 作用 | 建议 |
|---|---|---|
| `--codec` | h264 / h265 / vp8 / vp9 / prores / gif | 交付 h264；透明 prores 或 vp9 |
| `--crf` | 质量（越小越好） | 18 高质量 / 23 常规 / 28 草稿 |
| `--pixel-format` | 像素格式 | h264 用 `yuv420p` 保兼容 |
| `--image-format` | 截图中间格式 | jpeg 更快；透明必须 png |
| `--audio-bitrate` | 音频码率 | 320k |
| `--concurrency` | 并行页数 | 默认约核数一半；OOM 就降 |
| `--scale` | 输出缩放 | 0.5 出草稿 |
| `--frames` | 帧区间 | 局部重渲，不用整片重来 |
| `--gl` | GL 后端 | `angle`（GPU）/ `swiftshader`（软件） |
| `--timeout` | 单帧 `delayRender` 超时（ms） | 慢素材调到 60000 |
| `--muted` | 丢弃音轨 | 无音频素材时提速 |
| `--env-file` | 注入环境变量 | 密钥不进代码 |
| `--log` | 日志级别 | 排查用 `verbose` |

### 7.4 耗时量级（决定是否上云）

8 核机器经验值：1080p30 约 **1.5–4× 实时**；4K 约 **6–12× 实时**。即 30 秒 1080p 成片约 1–2 分钟，4K 约 3–6 分钟。并发翻倍不等于时间减半，受内存与 IO 限制。

### 7.5 产出与验收

- 产出：成片、封面、渲染参数记录。
- ✅ `ffprobe` 数值与阶段三设定一致；抽帧无色偏；上传平台后不糊。

### 7.6 注意事项

- **首帧黑屏**：素材自带黑场，或 `startFrom` 偏了 1 帧。
- **上传后变糊**：平台二次压缩，1080p 建议给到 12–20 Mbps。
- **颜色发灰**：色彩空间不匹配，核对 Rec.709。
- **内存爆掉**：先降 `--concurrency`，再降素材尺寸。
- CI/无头 Linux 缺系统库：直接用 `ghcr.io/remotion-dev/remotion` 镜像。
- 渲染参数写进 `package.json` scripts，不要靠记忆敲。

---

## 附录 A：平台规格预设

> 经验值，以平台最新规范为准。

| 用途 | 分辨率 | fps | 时长 | 编码 / 码率 |
|---|---|---|---|---|
| 抖音 / 视频号 竖屏 | 1080×1920 | 30 | 15–60s | h264 / 8–12 Mbps |
| B站 / YouTube 横屏 | 1920×1080 | 30 或 60 | 按需 | h264 / 12–20 Mbps |
| 官网 / H5 内嵌 | 1280×720 | 30 | 5–15s | h264 + webm / 4–6 Mbps |
| 朋友圈 | 1080×1080 或 1080×1920 | 30 | ≤30s | h264 / 8 Mbps |
| 展会大屏循环 | 3840×2160 | 30/60 | 循环播放 | h265 或 prores |

---

## 附录 B：帧与时间换算（fps = 30）

| 时长 | 帧数 | 典型用途 |
|---|---|---|
| 0.3s | 9 | 元素入场 |
| 0.5s | 15 | 淡入 |
| 0.8s | 24 | 弹簧落位 |
| 1s | 30 | 一句文案停留 |
| 3s | 90 | 单个镜头 |
| 10s | 300 | 短视频 |
| 30s | 900 | 宣传片 |

换算公式：`帧数 = 时长 × fps`；`时长 = 帧号 / fps`。

---

## 附录 C：交付前检查清单

- [ ] 总帧数 = 时长 × fps，且尾部留 6–12 帧落版
- [ ] 首帧、每个转场接缝、末帧已单独出图确认
- [ ] 转场写在出镜侧的 `transition` 里，`frames` 小于相邻较短镜，末镜无转场
- [ ] 转场重叠已补偿：成片帧 = Σ 镜头帧
- [ ] 所有文案走 props，无硬编码
- [ ] 字体、图片、音频全部走 `staticFile` + 对应专用组件
- [ ] 无 `Math.random()` / CSS animation / `useEffect` 驱动视觉
- [ ] 极端数据（空数组、超长文案、0 值）已测过
- [ ] 同帧两次渲染哈希一致
- [ ] `ffprobe` 校验分辨率、帧率、像素格式、音轨
- [ ] 目标平台安全区已留白，字幕不压边
- [ ] 渲染参数已写入 `package.json` scripts

---

## 附录 D：修订记录

### v2.1 （对齐流程包 v2 的转场实现）

| 类型 | 内容 |
|---|---|
| 对齐 | 新增 §5.3 跨镜转场：`transition` 字段（`type` / `frames` / `direction` / `card`）与重叠核算（成片帧 = Σ 镜头帧） |
| 新增 | `Transitions.tsx` 的 `exitTransition()` / `sequenceFrames()`，以及 `<TransitionSeries>` 直接子元素必须是自身 `Sequence` / `Transition` 的约束 |
| 补全 | API 表 `TransitionSeries` 行补 `linearTiming` 与重叠口径；排查表补「叠化糊字」；交付清单补转场两项 |
| 结构 | 原 5.3–5.7 顺延为 5.4–5.8 |

### v2（审查优化版）相对 v1 的变更

| 类型 | 内容 |
|---|---|
| 纠错 | `--gl` 首选 `angle`，软件回退改为 `swiftshader`；补 `@remotion/transitions` 等依赖安装命令 |
| 补全 | `useCurrentScale`、`premountFor`、`parseMedia`、`--image-format`、`--audio-bitrate`、`--timeout`、`--env-file`、`--log` |
| 新增 | 每阶段验收门禁、`lib/anim.ts` 工具库、平台规格预设、确定性哈希验证、耗时量级 |
| 结构 | 「注意事项」与「报错速查」合并为一张排查表；每阶段统一为「操作 / 命令 / API / 产出与验收 / 注意事项」五段式 |

### 已知边界

- 平台码率与耗时均为经验值，需按实测与平台规范微调。
- 未覆盖：`@remotion/player` 网页嵌入、`@remotion/lambda` 云端渲染、`@remotion/three` 3D 场景、字幕与 TTS 流程，如需可另立分册。
