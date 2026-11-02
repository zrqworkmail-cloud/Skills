import React from 'react';
import { T, FONT, MONO, easeOut, seg, rise, fadeIn, SAFE_BOTTOM } from './theme';
import { Frame, Sub, Headline, Kicker, Card, Bar, BigNum, SectionSlide, Divider, Tick } from './ui';
import {
  DecoderStack,
  BlockZoom,
  NormCompare,
  RopeViz,
  SwiGlu,
  Chinchilla,
  ContextWindow,
  Gqa,
  GhostAttention,
  Vocab,
  MoERouting,
  IRope,
  Multimodal,
  CostLinear,
  CostWall,
  DataLine,
  LogAxis,
} from './diagrams';

export type SceneProps = { f: number; dur: number; progress: number };

/** ---------- 通用版式 ---------- */

const TitleScene: React.FC<SceneProps & { title: string; sub: string; note?: string }> = ({ f, title, sub, note }) => (
  <>
    <div style={{ ...rise(f, 6, 26, 46), position: 'absolute', left: 120, top: 300, fontFamily: FONT, fontSize: 128, fontWeight: 900, color: T.ink, letterSpacing: -2 }}>
      {title}
    </div>
    <div style={{ ...rise(f, 20, 24, 36), position: 'absolute', left: 126, top: 470, fontFamily: FONT, fontSize: 44, fontWeight: 700, color: T.muted }}>
      {sub}
    </div>
    <div style={{ position: 'absolute', left: 128, top: 570, width: 220 * easeOut(seg(f, 26, 54)), height: 8, background: T.red }} />
    {note && (
      <div style={{ ...fadeIn(f, 46, 20), position: 'absolute', left: 128, top: 620, fontFamily: MONO, fontSize: 26, color: T.muted, letterSpacing: 3 }}>
        {note}
      </div>
    )}
  </>
);

const CompareScene: React.FC<SceneProps & { leftLabel: string; leftVal: string; rightLabel: string; rightVal: string; caption?: string; winner?: 'left' | 'right' }> = ({
  f,
  leftLabel,
  leftVal,
  rightLabel,
  rightVal,
  caption,
  winner = 'left',
}) => (
  <>
    <Kicker f={f} text="PARAMETERS" />
    <Headline f={f} text="十分之一的参数，怎么赢的？" size={72} />
    {[
      { x: 420, label: leftLabel, val: leftVal, w: 320, ok: winner === 'left' },
      { x: 1080, label: rightLabel, val: rightVal, w: 620, ok: winner === 'right' },
    ].map((b, i) => {
      const e = easeOut(seg(f, 20 + i * 16, 52 + i * 16));
      return (
        <React.Fragment key={b.label}>
          <div style={{ ...fadeIn(f, 18 + i * 16, 18), position: 'absolute', left: b.x, top: 380, fontFamily: FONT, fontSize: 34, fontWeight: 800, color: T.ink2 }}>
            {b.label}
          </div>
          <div style={{ position: 'absolute', left: b.x, top: 440, width: b.w * e, height: 96, background: b.ok ? T.red : 'rgba(18,25,43,0.16)', borderRadius: 12 }} />
          <div style={{ ...fadeIn(f, 30 + i * 16, 18), position: 'absolute', left: b.x + b.w * e + 20, top: 462, fontFamily: MONO, fontSize: 52, fontWeight: 800, color: b.ok ? T.red : T.muted }}>
            {b.val}
          </div>
          {b.ok && <Tick f={f} x={b.x + 10} y={560} ok delay={54} />}
        </React.Fragment>
      );
    })}
    {caption && <div style={{ ...fadeIn(f, 64, 20), position: 'absolute', left: 420, top: 620, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: T.muted }}>{caption}</div>}
  </>
);

const SizesScene: React.FC<SceneProps & { title: string; kicker: string; sizes: { n: string; s: number }[]; note?: string }> = ({ f, title, kicker, sizes, note }) => (
  <>
    <Kicker f={f} text={kicker} />
    <Headline f={f} text={title} size={76} />
    {sizes.map((s, i) => {
      const e = easeOut(seg(f, 18 + i * 10, 44 + i * 10));
      const h = 90 + s.s * 260;
      const x = 380 + i * 330;
      const y = 740 - h;
      return (
        <React.Fragment key={s.n}>
          <div style={{ position: 'absolute', left: x, top: y, width: 240, height: h, background: i === 0 ? 'rgba(200,69,45,0.14)' : 'rgba(18,25,43,0.07)', border: `3px solid ${i === 0 ? T.red : T.line}`, borderRadius: 16, opacity: e, transform: `translateY(${(1 - e) * 40}px)` }} />
          <div style={{ ...fadeIn(f, 26 + i * 10, 16), position: 'absolute', left: x, top: 760, width: 240, textAlign: 'center', fontFamily: MONO, fontSize: 38, fontWeight: 800, color: i === 0 ? T.red : T.ink2 }}>{s.n}</div>
        </React.Fragment>
      );
    })}
    {note && <div style={{ ...fadeIn(f, 60, 20), position: 'absolute', left: 380, top: 776, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.muted }}>{note}</div>}
  </>
);

const NumbersScene: React.FC<SceneProps & { kicker: string; title: string; items: { v: string; u?: string; c: string; color?: string }[]; note?: string }> = ({ f, kicker, title, items, note }) => (
  <>
    <Kicker f={f} text={kicker} />
    <Headline f={f} text={title} size={70} />
    {items.map((it, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return (
        <BigNum
          key={it.c}
          f={f}
          x={420 + col * 700}
          y={330 + row * 210}
          value={it.v}
          unit={it.u}
          caption={it.c}
          color={it.color ?? (i === 0 ? T.red : T.ink)}
          delay={20 + i * 12}
          size={92}
        />
      );
    })}
    {note && <div style={{ ...fadeIn(f, 70, 20), position: 'absolute', left: 420, top: 776, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.muted }}>{note}</div>}
  </>
);

const StepsScene: React.FC<SceneProps & { kicker: string; title: string; steps: { t: string; d: string }[]; note?: string }> = ({ f, kicker, title, steps, note }) => (
  <>
    <Kicker f={f} text={kicker} />
    <Headline f={f} text={title} size={70} />
    {steps.map((s, i) => {
      const e = easeOut(seg(f, 18 + i * 16, 44 + i * 16));
      const x = 400 + i * 400;
      return (
        <React.Fragment key={s.t}>
          <div style={{ position: 'absolute', left: x, top: 360, width: 300, height: 240, background: T.white, border: `3px solid ${i === 0 ? T.red : T.line}`, borderRadius: 18, opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
            <div style={{ position: 'absolute', left: 26, top: 24, fontFamily: MONO, fontSize: 24, fontWeight: 800, color: i === 0 ? T.red : T.muted }}>0{i + 1}</div>
            <div style={{ position: 'absolute', left: 26, top: 76, fontFamily: FONT, fontSize: 38, fontWeight: 900, color: T.ink }}>{s.t}</div>
            <div style={{ position: 'absolute', left: 26, top: 140, right: 26, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: T.muted, lineHeight: 1.5 }}>{s.d}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ ...fadeIn(f, 26 + i * 16, 16), position: 'absolute', left: x + 310, top: 470, fontFamily: MONO, fontSize: 40, color: T.red }}>→</div>
          )}
        </React.Fragment>
      );
    })}
    {note && <div style={{ ...fadeIn(f, 72, 20), position: 'absolute', left: 400, top: 660, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.muted }}>{note}</div>}
  </>
);

const StampsScene: React.FC<SceneProps & { kicker: string; title: string; items: { t: string; d: string; c: string }[] }> = ({ f, kicker, title, items }) => (
  <>
    <Kicker f={f} text={kicker} />
    <Headline f={f} text={title} size={70} />
    {items.map((it, i) => {
      const e = easeOut(seg(f, 18 + i * 12, 40 + i * 12));
      const x = 360 + (i % 4) * 380;
      return (
        <React.Fragment key={it.t}>
          <div style={{ position: 'absolute', left: x, top: 400, width: 320, height: 210, background: 'rgba(255,255,255,0.86)', border: `3px solid ${it.c}`, borderRadius: 18, opacity: e, transform: `scale(${0.9 + 0.1 * e})` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 8, height: '100%', background: it.c, borderRadius: '18px 0 0 18px' }} />
            <div style={{ position: 'absolute', left: 28, top: 40, fontFamily: MONO, fontSize: 34, fontWeight: 800, color: it.c }}>{it.t}</div>
            <div style={{ position: 'absolute', left: 28, top: 100, right: 24, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: T.muted, lineHeight: 1.5 }}>{it.d}</div>
          </div>
        </React.Fragment>
      );
    })}
  </>
);

const SummaryScene: React.FC<SceneProps & { kicker: string; title: string; left: string; right: string; note: string }> = ({ f, kicker, title, left, right, note }) => {
  const e = easeOut(seg(f, 30, 70));
  return (
    <>
      <Kicker f={f} text={kicker} />
      <Headline f={f} text={title} size={70} />
      <div style={{ position: 'absolute', left: 420, top: 420, width: 300, height: 160, background: 'rgba(18,25,43,0.06)', border: `3px solid ${T.line}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 40, fontWeight: 900, color: T.ink2, opacity: e }}>{left}</div>
      <div style={{ position: 'absolute', left: 760, top: 470, width: 240 * e, height: 8, background: T.red }} />
      <div style={{ position: 'absolute', left: 760 + 240 * e - 4, top: 452, width: 0, height: 0, borderTop: '22px solid transparent', borderBottom: '22px solid transparent', borderLeft: `30px solid ${T.red}`, opacity: e }} />
      <div style={{ position: 'absolute', left: 1050, top: 420, width: 300, height: 160, background: 'rgba(200,69,45,0.12)', border: `3px solid ${T.red}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 40, fontWeight: 900, color: T.red, opacity: e }}>{right}</div>
      <div style={{ ...fadeIn(f, 66, 20), position: 'absolute', left: 420, top: 650, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: T.muted }}>{note}</div>
    </>
  );
};

const RefsScene: React.FC<SceneProps> = ({ f }) => {
  const refs = [
    'Touvron et al. LLaMA: Open and Efficient Foundation Language Models. 2023.',
    'Touvron et al. Llama 2: Open Foundation and Fine-Tuned Chat Models. 2023.',
    'Grattafiori et al. The Llama 3 Herd of Models. 2024.',
    'Meta AI. The Llama 3.1 Model Card / Technical Report. 2024.',
    'Meta AI. Llama 4 Official Blog & Model Cards. 2025.',
  ];
  return (
    <>
      <Kicker f={f} text="REFERENCES" />
      <Headline f={f} text="数据来源" size={70} />
      {refs.map((r, i) => (
        <div key={i} style={{ ...rise(f, 18 + i * 8, 18, 24), position: 'absolute', left: 420, top: 320 + i * 82, width: 1080, fontFamily: FONT, fontSize: 26, fontWeight: 600, color: T.ink2, lineHeight: 1.4 }}>
          <span style={{ fontFamily: MONO, color: T.red, marginRight: 18 }}>{`[${i + 1}]`}</span>
          {r}
        </div>
      ))}
      <div style={{ ...fadeIn(f, 70, 20), position: 'absolute', left: 420, top: 760, fontFamily: FONT, fontSize: 24, color: T.muted }}>以上均为公开发布的论文、技术报告或官方博客，可在线核对。</div>
    </>
  );
};

const EndScene: React.FC<SceneProps> = ({ f }) => (
  <>
    <div style={{ ...rise(f, 4, 22, 30), position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontFamily: FONT, fontSize: 96, fontWeight: 900, color: T.ink }}>谢谢</div>
    <div style={{ ...fadeIn(f, 18, 20), position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 700, color: T.muted }}>Llama 技术流 · 课堂汇报</div>
    <div style={{ position: 'absolute', left: 860, top: 600, width: 200 * easeOut(seg(f, 22, 50)), height: 6, background: T.red }} />
  </>
);

const SectionScene: React.FC<SceneProps & { no: string; title: string; sub?: string }> = ({ f, no, title, sub }) => <SectionSlide f={f} no={no} title={title} sub={sub} />;

/** ---------- 48 镜 ---------- */

export type SceneDef = {
  id: string;
  dur: number; // seconds
  section: string;
  index: string;
  sub: string[];
  render: (p: SceneProps) => React.ReactNode;
};

export const SCENES: SceneDef[] = [
  // 段 0
  { id: '0-1', dur: 12, section: 'LLAMA · 技术流', index: '00 / 48', sub: ['Llama 技术流'], render: (p) => <TitleScene {...p} title="Llama 技术流" sub="用数据换参数：2023 → 2025 的五次换挡" note="CLASS REPORT · 2026.11" /> },
  { id: '0-2', dur: 12, section: 'LLAMA · 技术流', index: '00 / 48', sub: ['十分之一的参数，怎么赢的？'], render: (p) => <CompareScene {...p} leftLabel="Llama 13B" leftVal="13B" rightLabel="GPT-3" rightVal="175B" caption="参数只有 1/13，多数基准反超" winner="left" /> },

  // 段 1
  { id: '1-1', dur: 12, section: '01 · 起点', index: '01 / 48', sub: ['只做一件事：预测下一个词'], render: (p) => <DecoderStack f={p.f} /> },
  { id: '1-2', dur: 12, section: '01 · 起点', index: '02 / 48', sub: ['三个选择，五代没换'], render: (p) => <BlockZoom f={p.f} /> },
  { id: '1-3', dur: 12, section: '01 · 起点', index: '03 / 48', sub: ['归一化放在前面'], render: (p) => <NormCompare f={p.f} /> },
  { id: '1-4', dur: 12, section: '01 · 起点', index: '04 / 48', sub: ['用旋转表示位置'], render: (p) => <RopeViz f={p.f} /> },
  { id: '1-5', dur: 12, section: '01 · 起点', index: '05 / 48', sub: ['门控让信息选择性通过'], render: (p) => <SwiGlu f={p.f} /> },

  // 段 2
  { id: '2-1', dur: 12, section: '02 · Llama 1', index: '06 / 48', sub: ['四个尺寸，最小 7B'], render: (p) => <SizesScene {...p} kicker="2023.02 · LLAMA 1" title="四个尺寸，只发给研究机构" sizes={[{ n: '7B', s: 0 }, { n: '13B', s: 0.22 }, { n: '33B', s: 0.55 }, { n: '65B', s: 1 }]} note="参数不是这一代的重点" /> },
  { id: '2-2', dur: 12, section: '02 · Llama 1', index: '07 / 48', sub: ['1 万亿到 1.4 万亿 token'], render: (p) => (
    <>
      <Kicker f={p.f} text="TRAINING TOKENS" />
      <Headline f={p.f} text="数据比参数更狠" size={76} />
      <Bar f={p.f} x={520} y={380} w={900} ratio={0.72} color={T.red} label="7B / 13B" value="1.0T" delay={18} />
      <Bar f={p.f} x={520} y={510} w={900} ratio={1} color={T.gold} label="33B / 65B" value="1.4T" delay={32} />
      <div style={{ ...fadeIn(p.f, 60, 20), position: 'absolute', left: 520, top: 650, fontFamily: FONT, fontSize: 28, fontWeight: 700, color: T.muted }}>同期同规模模型普遍在千亿级 token</div>
    </>
  ) },
  { id: '2-3', dur: 12, section: '02 · Llama 1', index: '08 / 48', sub: ['13B 在多数基准超过 GPT-3 175B'], render: (p) => <CompareScene {...p} leftLabel="Llama 13B" leftVal="13B" rightLabel="GPT-3" rightVal="175B" caption="这不是魔法，是数据密度" winner="left" /> },
  { id: '2-4', dur: 12, section: '02 · Llama 1', index: '09 / 48', sub: ['四处改动，全是效率'], render: (p) => <StampsScene {...p} kicker="ARCHITECTURE" title="四处改动，全是效率" items={[{ t: 'RMSNorm', d: '少一次均值计算', c: T.gold }, { t: 'SwiGLU', d: '门控前馈，效果更好', c: T.teal }, { t: 'RoPE', d: '旋转位置，支持外推', c: T.red }, { t: 'No bias', d: '去掉偏置，参数更省', c: T.ink2 }]} /> },
  { id: '2-5', dur: 12, section: '02 · Llama 1', index: '10 / 48', sub: ['算力固定时，参数和数据要一起涨'], render: (p) => <Chinchilla f={p.f} /> },
  { id: '2-6', dur: 12, section: '02 · Llama 1', index: '11 / 48', sub: ['把预算从参数挪到数据'], render: (p) => <SummaryScene {...p} kicker="DECISION" title="第一代的核心选择" left="参数" right="数据" note="用更小的模型，吃更多的文本" /> },
  { id: '2-7', dur: 6, section: '02 · Llama 1', index: '12 / 48', sub: [], render: (p) => <SectionScene {...p} no="03" title="Llama 2：从能用，到好用" sub="2023.07 · 对齐与推理效率" /> },

  // 段 3
  { id: '3-1', dur: 12, section: '03 · Llama 2', index: '13 / 48', sub: ['2 万亿 token，比上一代多 40%'], render: (p) => <SizesScene {...p} kicker="2023.07 · LLAMA 2" title="数据翻倍，尺寸收敛" sizes={[{ n: '7B', s: 0 }, { n: '13B', s: 0.24 }, { n: '70B', s: 1 }]} note="2T tokens · 比上一代 +40%" /> },
  { id: '3-2', dur: 12, section: '03 · Llama 2', index: '14 / 48', sub: ['上下文从 2K 到 4K'], render: (p) => <ContextWindow f={p.f} /> },
  { id: '3-3', dur: 12, section: '03 · Llama 2', index: '15 / 48', sub: ['GQA：KV cache 缩到 1/4'], render: (p) => <Gqa f={p.f} /> },
  { id: '3-4', dur: 12, section: '03 · Llama 2', index: '16 / 48', sub: ['先教，再挑，再调'], render: (p) => <StepsScene {...p} kicker="POST-TRAINING" title="后训练三步" steps={[{ t: 'SFT', d: '人工写的回答，监督微调' }, { t: '拒绝采样', d: '生成多个答案，人来挑' }, { t: 'PPO', d: '按人类偏好做强化学习' }]} note="目标是「有用且安全」" /> },
  { id: '3-5', dur: 12, section: '03 · Llama 2', index: '17 / 48', sub: ['Ghost Attention：多轮不跑题'], render: (p) => <GhostAttention f={p.f} /> },
  { id: '3-6', dur: 12, section: '03 · Llama 2', index: '18 / 48', sub: ['可商用，但有 7 亿月活门槛'], render: (p) => (
    <>
      <Kicker f={p.f} text="LICENSE" />
      <Headline f={p.f} text="开放权重，不等于无限制" size={70} />
      <Card f={p.f} x={420} y={340} w={720} h={300} delay={16} filled>
        <div style={{ position: 'absolute', left: 40, top: 36, fontFamily: FONT, fontSize: 32, fontWeight: 900, color: T.ink }}>Llama 2 Community License</div>
        <div style={{ position: 'absolute', left: 40, top: 96, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Tick f={p.f} x={0} y={0} ok delay={30} size={32} />
          <span style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.teal }}>允许商业使用</span>
        </div>
        <div style={{ position: 'absolute', left: 40, top: 156, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Tick f={p.f} x={0} y={0} ok={false} delay={40} size={32} />
          <span style={{ position: 'absolute', left: 46, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.red, whiteSpace: 'nowrap' }}>月活超 7 亿需单独授权</span>
        </div>
        <div style={{ position: 'absolute', left: 40, top: 222, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: T.muted }}>另有可接受使用政策</div>
      </Card>
      <div style={{ ...fadeIn(p.f, 60, 20), position: 'absolute', left: 1220, top: 420, fontFamily: FONT, fontSize: 28, fontWeight: 700, color: T.muted, width: 520, lineHeight: 1.6 }}>这是条款本身，不做评价；<br />它决定了"开放"的边界。</div>
    </>
  ) },
  { id: '3-7', dur: 6, section: '03 · Llama 2', index: '19 / 48', sub: [], render: (p) => <SectionScene {...p} no="04" title="Llama 3：双重扩容" sub="2024.04 · 数据与词表" /> },

  // 段 4
  { id: '4-1', dur: 12, section: '04 · Llama 3', index: '20 / 48', sub: ['8B 与 70B，砍掉中间尺寸'], render: (p) => <SizesScene {...p} kicker="2024.04 · LLAMA 3" title="产品线收敛到两个尺寸" sizes={[{ n: '8B', s: 0 }, { n: '70B', s: 1 }]} note="架构不变，继续放大" /> },
  { id: '4-2', dur: 12, section: '04 · Llama 3', index: '21 / 48', sub: ['15 万亿 token，约上一代 7.5 倍'], render: (p) => (
    <>
      <Kicker f={p.f} text="TRAINING TOKENS" />
      <Headline f={p.f} text="数据量跳了一个量级" size={76} />
      <Bar f={p.f} x={560} y={400} w={300} ratio={0.13} color={T.muted} label="Llama 2" value="2T" delay={18} />
      <Bar f={p.f} x={560} y={540} w={980} ratio={1} color={T.red} label="Llama 3" value="15T+" delay={32} />
      <div style={{ ...fadeIn(p.f, 58, 20), position: 'absolute', left: 560, top: 680, fontFamily: MONO, fontSize: 44, fontWeight: 800, color: T.red }}>× 7.5</div>
    </>
  ) },
  { id: '4-3', dur: 12, section: '04 · Llama 3', index: '22 / 48', sub: ['词表 32K → 128K，同样的话更少 token'], render: (p) => <Vocab f={p.f} /> },
  { id: '4-4', dur: 12, section: '04 · Llama 3', index: '23 / 48', sub: ['8K 上下文，GQA 保留'], render: (p) => (
    <>
      <Kicker f={p.f} text="CONTEXT & ATTENTION" />
      <Headline f={p.f} text="结构没换，参数在放大" size={76} />
      <NumbersScene {...p} kicker="" title="" items={[{ v: '8K', c: '上下文长度', color: T.red }, { v: '8', u: '组', c: 'GQA 的 KV 分组' }, { v: '128K', c: '词表大小' }, { v: '15T+', c: '预训练 token' }]} />
    </>
  ) },
  { id: '4-5', dur: 12, section: '04 · Llama 3', index: '24 / 48', sub: ['数据质量比数量更难'], render: (p) => <StepsScene {...p} kicker="DATA PIPELINE" title="15 万亿 token 怎么洗干净" steps={[{ t: '去重', d: '近似重复内容剔除' }, { t: '质量过滤', d: '分类器打分，低质丢弃' }, { t: '配比', d: '代码 / 多语言 / 网页 调比例' }]} note="工程量大头在数据，不在模型" /> },
  { id: '4-6', dur: 12, section: '04 · Llama 3', index: '25 / 48', sub: ['双重扩容：数据 + 词表'], render: (p) => (
    <>
      <Kicker f={p.f} text="SUMMARY" />
      <Headline f={p.f} text="双重扩容" size={76} />
      {[{ t: '数据', v: '× 7.5', c: T.red, y: 380 }, { t: '词表', v: '× 4', c: T.teal, y: 540 }].map((it, i) => (
        <React.Fragment key={it.t}>
          <div style={{ ...rise(p.f, 20 + i * 16, 20, 30), position: 'absolute', left: 440, top: it.y, fontFamily: FONT, fontSize: 40, fontWeight: 900, color: T.ink2 }}>{it.t}</div>
          <div style={{ position: 'absolute', left: 620, top: it.y + 8, width: 520 * easeOut(seg(p.f, 26 + i * 16, 60 + i * 16)), height: 56, background: it.c, borderRadius: 10, opacity: 0.85 }} />
          <div style={{ ...fadeIn(p.f, 52 + i * 16, 18), position: 'absolute', left: 1160, top: it.y + 4, fontFamily: MONO, fontSize: 46, fontWeight: 800, color: it.c }}>{it.v}</div>
        </React.Fragment>
      ))}
    </>
  ) },
  { id: '4-7', dur: 6, section: '04 · Llama 3', index: '26 / 48', sub: [], render: (p) => <SectionScene {...p} no="05" title="Llama 3.1：稠密的天花板" sub="2024.07 · 405B" /> },

  // 段 5
  { id: '5-1', dur: 12, section: '05 · Llama 3.1', index: '27 / 48', sub: ['405B 稠密模型'], render: (p) => (
    <>
      <Kicker f={p.f} text="2024.07 · LLAMA 3.1" />
      <Headline f={p.f} text="一个 4050 亿参数的稠密模型" size={72} />
      <div style={{ position: 'absolute', left: 420, top: 330, width: 1080 * easeOut(seg(p.f, 20, 56)), height: 300, background: 'rgba(200,69,45,0.14)', border: `4px solid ${T.red}`, borderRadius: 20 }} />
      <div style={{ ...fadeIn(p.f, 50, 18), position: 'absolute', left: 440, top: 380, fontFamily: MONO, fontSize: 120, fontWeight: 800, color: T.red }}>405B</div>
      <div style={{ ...fadeIn(p.f, 64, 18), position: 'absolute', left: 440, top: 540, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: T.ink2 }}>稠密：每个 token 都要过全部参数</div>
    </>
  ) },
  { id: '5-2', dur: 12, section: '05 · Llama 3.1', index: '28 / 48', sub: ['算力约上一代 70B 的 50 倍'], render: (p) => <NumbersScene {...p} kicker="TRAINING" title="训练量：一个数量级的跨越" items={[{ v: '15.6T', c: '预训练 token', color: T.red }, { v: '3.8e25', c: 'FLOPs' }, { v: '50×', c: '≈ Llama 2 70B 的算力' }, { v: '6', u: '段', c: '上下文扩展阶段' }]} note="数字来自 Llama 3 技术报告" /> },
  { id: '5-3', dur: 12, section: '05 · Llama 3.1', index: '29 / 48', sub: ['上下文分六段扩到 128K'], render: (p) => (
    <>
      <Kicker f={p.f} text="CONTEXT EXTENSION" />
      <Headline f={p.f} text="8K → 128K：分六段走" size={72} />
      {['8K', '16K', '32K', '64K', '96K', '128K'].map((t, i) => {
        const e = easeOut(seg(p.f, 18 + i * 8, 40 + i * 8));
        const x = 400 + i * 230;
        const h = 90 + i * 62;
        return (
          <React.Fragment key={t}>
            <div style={{ position: 'absolute', left: x, top: 700 - h, width: 180, height: h, background: i === 5 ? 'rgba(200,69,45,0.16)' : 'rgba(18,25,43,0.07)', border: `3px solid ${i === 5 ? T.red : T.line}`, borderRadius: 12, opacity: e }} />
            <div style={{ ...fadeIn(p.f, 30 + i * 8, 14), position: 'absolute', left: x, top: 720, width: 180, textAlign: 'center', fontFamily: MONO, fontSize: 28, fontWeight: 800, color: i === 5 ? T.red : T.muted }}>{t}</div>
          </React.Fragment>
        );
      })}
      <div style={{ ...fadeIn(p.f, 70, 20), position: 'absolute', left: 400, top: 772, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.muted }}>一次性拉长会让训练不稳，分段扩是让模型逐步适应</div>
    </>
  ) },
  { id: '5-4', dur: 12, section: '05 · Llama 3.1', index: '30 / 48', sub: ['长上下文靠数据，也靠位置编码'], render: (p) => (
    <>
      <Kicker f={p.f} text="LONG CONTEXT" />
      <Headline f={p.f} text="两件事，缺一不可" size={76} />
      {[{ t: '长文本数据配比', d: '训练里要有足够长的文档', c: T.teal, x: 420 }, { t: '位置编码调整', d: '让旋转角适应更长距离', c: T.gold, x: 1080 }].map((it, i) => (
        <Card key={it.t} f={p.f} x={it.x} y={380} w={420} h={240} delay={18 + i * 16} accent={it.c} filled>
          <div style={{ position: 'absolute', left: 34, top: 44, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: it.c }}>{it.t}</div>
          <div style={{ position: 'absolute', left: 34, top: 110, right: 30, fontFamily: FONT, fontSize: 25, fontWeight: 600, color: T.muted, lineHeight: 1.5 }}>{it.d}</div>
        </Card>
      ))}
    </>
  ) },
  { id: '5-5', dur: 12, section: '05 · Llama 3.1', index: '31 / 48', sub: ['稠密模型：成本随参数线性涨'], render: (p) => <CostLinear f={p.f} /> },
  { id: '5-6', dur: 12, section: '05 · Llama 3.1', index: '32 / 48', sub: ['稠密路线，撞上成本墙'], render: (p) => <CostWall f={p.f} /> },
  { id: '5-7', dur: 6, section: '05 · Llama 3.1', index: '33 / 48', sub: [], render: (p) => <SectionScene {...p} no="06" title="Llama 4：换发动机" sub="2025.04 · 混合专家" /> },

  // 段 6
  { id: '6-1', dur: 12, section: '06 · Llama 4', index: '34 / 48', sub: ['第一次换成混合专家'], render: (p) => (
    <>
      <Kicker f={p.f} text="2025.04 · LLAMA 4" />
      <Headline f={p.f} text="架构换了：MoE" size={86} />
      <div style={{ ...fadeIn(p.f, 30, 24), position: 'absolute', left: 420, top: 400, fontFamily: MONO, fontSize: 200, fontWeight: 800, color: 'rgba(200,69,45,0.16)', letterSpacing: -6 }}>MoE</div>
      <div style={{ ...fadeIn(p.f, 48, 20), position: 'absolute', left: 440, top: 650, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: T.ink2 }}>混合专家：总参数变大，单次计算量不变</div>
    </>
  ) },
  { id: '6-2', dur: 12, section: '06 · Llama 4', index: '35 / 48', sub: ['Scout：17B 激活，10M 上下文'], render: (p) => <NumbersScene {...p} kicker="LLAMA 4 SCOUT" title="能塞进一张 H100" items={[{ v: '17B', c: '激活参数', color: T.red }, { v: '109B', c: '总参数' }, { v: '16', u: '个', c: '专家数' }, { v: '10M', c: '上下文 token' }]} /> },
  { id: '6-3', dur: 12, section: '06 · Llama 4', index: '36 / 48', sub: ['Maverick：17B 激活，400B 总参数'], render: (p) => <NumbersScene {...p} kicker="LLAMA 4 MAVERICK" title="同样的激活，更大的容量" items={[{ v: '17B', c: '激活参数', color: T.red }, { v: '400B', c: '总参数' }, { v: '128', u: '个', c: '专家数' }, { v: '1M', c: '上下文 token' }]} /> },
  { id: '6-4', dur: 12, section: '06 · Llama 4', index: '37 / 48', sub: ['每个 token 只走 1 个路由专家'], render: (p) => <MoERouting f={p.f} /> },
  { id: '6-5', dur: 12, section: '06 · Llama 4', index: '38 / 48', sub: ['iRoPE：交错位置编码，为长上下文'], render: (p) => <IRope f={p.f} /> },
  { id: '6-6', dur: 12, section: '06 · Llama 4', index: '39 / 48', sub: ['文本与图像，同一入口'], render: (p) => <Multimodal f={p.f} /> },
  { id: '6-7', dur: 6, section: '06 · Llama 4', index: '40 / 48', sub: [], render: (p) => <SectionScene {...p} no="07" title="三条曲线，一个方向" sub="总结" /> },

  // 段 7
  { id: '7-1', dur: 12, section: '07 · 总结', index: '41 / 48', sub: ['数据：五年涨了 15 倍'], render: (p) => <DataLine f={p.f} /> },
  { id: '7-2', dur: 12, section: '07 · 总结', index: '42 / 48', sub: ['效率：从堆参数到省参数'], render: (p) => <StepsScene {...p} kicker="EFFICIENCY" title="同样算力，办更多事" steps={[{ t: '稠密', d: '全部参数都参与计算' }, { t: 'GQA', d: '共享 KV，省显存' }, { t: 'MoE', d: '只激活少数专家，省计算' }]} /> },
  { id: '7-3', dur: 12, section: '07 · 总结', index: '43 / 48', sub: ['上下文：从 2K 到 1000 万'], render: (p) => <LogAxis f={p.f} /> },
  { id: '7-4', dur: 12, section: '07 · 总结', index: '44 / 48', sub: ['本质：单位算力换更多有效信息'], render: (p) => (
    <>
      <div style={{ ...rise(p.f, 8, 26, 30), position: 'absolute', left: 160, right: 160, top: 380, textAlign: 'center', fontFamily: FONT, fontSize: 76, fontWeight: 900, color: T.ink, lineHeight: 1.35 }}>
        这条技术流的本质，<br />不是参数变大，<br /><span style={{ color: T.red }}>是单位算力换到多少有效信息。</span>
      </div>
      <div style={{ position: 'absolute', left: 860, top: 700, width: 200 * easeOut(seg(p.f, 40, 76)), height: 6, background: T.red }} />
    </>
  ) },

  // 段 8
  { id: '8-1', dur: 12, section: '07 · 总结', index: '45 / 48', sub: ['参考：Llama 1/2/3/3.1 论文、Llama 4 博客'], render: (p) => <RefsScene {...p} /> },
  { id: '8-2', dur: 6, section: '07 · 总结', index: '46 / 48', sub: [], render: (p) => <EndScene {...p} /> },
];

export const TOTAL_SECONDS = SCENES.reduce((a, s) => a + s.dur, 0);
export const TOTAL_FRAMES = TOTAL_SECONDS * 24;
