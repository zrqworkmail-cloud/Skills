import React from 'react';
import { T, FONT, MONO, easeOut, seg, rise, fadeIn } from '../llama/theme';
import { Headline, Kicker, Card } from '../llama/ui';

export type SceneProps = { f: number; dur: number; progress: number };
export type SceneDef = {
  id: string;
  dur: number;
  section: string;
  sub: string[];
  render: (p: SceneProps) => React.ReactNode;
};

/** 文本标签 */
const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  mono?: boolean;
  opacity?: number;
  width?: number;
}> = ({ x, y, text, size = 28, color = T.ink, weight = 800, anchor = 'start', mono = false, opacity = 1, width }) => {
  const transform = anchor === 'middle' ? 'translateX(-50%)' : anchor === 'end' ? 'translateX(-100%)' : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform,
        width,
        textAlign: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
        fontFamily: mono ? MONO : FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        opacity,
        whiteSpace: width ? 'normal' : 'nowrap',
        lineHeight: 1.25,
      }}
    >
      {text}
    </div>
  );
};

/** 带箭头的线（简单三角箭头） */
const Arrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ x1, y1, x2, y2, color = T.muted, width = 3, opacity = 0.75 }) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const s = 12;
  const p1 = `${x2},${y2}`;
  const p2 = `${x2 - s * Math.cos(ang - 0.4)},${y2 - s * Math.sin(ang - 0.4)}`;
  const p3 = `${x2 - s * Math.cos(ang + 0.4)},${y2 - s * Math.sin(ang + 0.4)}`;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} opacity={opacity} strokeLinecap="round" />
      <polygon points={`${p1} ${p2} ${p3}`} fill={color} opacity={opacity} />
    </>
  );
};

/** ---------- Scene 01：400B vs 17B ---------- */
const Scene01: React.FC<SceneProps> = ({ f }) => {
  const cols = 28;
  const rows = 10;
  const pitch = 40;
  const active = new Set([37, 55, 77, 102, 129, 166, 188, 210, 241, 255, 280, 300, 310, 330]);
  const dim = easeOut(seg(f, 120, 170));
  const pulse = 1 + 0.06 * Math.sin(f / 10);
  return (
    <>
      <Kicker f={f} text="LLAMA 4 MAVERICK · MIXTURE OF EXPERTS" />
      <Headline f={f} text="400B 总参数，为什么每次只激活 17B？" size={52} />
      <Label x={120} y={286} text="400,000,000,000" size={46} color={T.ink} mono />
      <Label x={126} y={340} text="总参数 · Parameters" size={22} color={T.muted} weight={700} />
      <Label x={1800} y={286} text="17,000,000,000" size={46} color={T.red} mono anchor="end" />
      <Label x={1800} y={340} text="每次激活 · Active" size={22} color={T.red} weight={700} anchor="end" />
      <Label x={1800} y={372} text="≈ 4.25% 的参数" size={20} color={T.muted} weight={700} anchor="end" />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const on = active.has(i);
          const e = easeOut(seg(f, i * 1.1, i * 1.1 + 12));
          const op = on ? 1 : 0.55 - 0.43 * dim;
          return (
            <rect
              key={i}
              x={120 + col * pitch}
              y={380 + row * pitch}
              width={30}
              height={30}
              rx={6}
              fill={on ? T.red : T.ink}
              opacity={e * op}
              transform={on ? `translate(${(1 - pulse) * 15} ${(1 - pulse) * 15}) scale(${pulse})` : undefined}
            />
          );
        })}
        {/* 高亮框 */}
        <rect
          x={120 + 5 * pitch - 6}
          y={380 + 1 * pitch - 6}
          width={42}
          height={42}
          rx={9}
          fill="none"
          stroke={T.red}
          strokeWidth={3}
          opacity={easeOut(seg(f, 240, 270))}
        />
      </svg>
    </>
  );
};

/** ---------- Scene 02：时间线 ---------- */
const Scene02: React.FC<SceneProps> = ({ f }) => {
  const nodes = [
    { x: 380, year: '2023', title: 'LLaMA', sub: '稠密 · 7B–65B' },
    { x: 900, year: '2024', title: 'Llama 3.1', sub: '稠密 · 405B' },
    { x: 1420, year: '2025', title: 'Llama 4', sub: 'MoE · 17B 激活' },
  ];
  const line = easeOut(seg(f, 20, 80));
  return (
    <>
      <Kicker f={f} text="2023 → 2025 · THREE GENERATIONS" />
      <Headline f={f} text="从稠密到 MoE：三次换挡" size={60} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <line x1={220} y1={560} x2={220 + 1480 * line} y2={560} stroke={T.line} strokeWidth={4} />
        {nodes.map((n, i) => {
          const e = easeOut(seg(f, 30 + i * 24, 60 + i * 24));
          return (
            <g key={n.year} opacity={e}>
              <circle cx={n.x} cy={560} r={12} fill={i === 2 ? T.red : T.ink} />
              <circle cx={n.x} cy={560} r={22} fill="none" stroke={i === 2 ? T.red : T.ink} strokeWidth={2} opacity={0.25} />
            </g>
          );
        })}
        {/* 2024 稠密层堆叠 */}
        {Array.from({ length: 7 }).map((_, i) => {
          const e = easeOut(seg(f, 90 + i * 8, 110 + i * 8));
          return <rect key={i} x={820} y={470 - i * 34} width={160} height={22} rx={5} fill={T.teal} opacity={e * 0.55} />;
        })}
        {/* 2025 专家分裂 */}
        {Array.from({ length: 4 }).map((_, i) => {
          const e = easeOut(seg(f, 150 + i * 10, 175 + i * 10));
          return <rect key={i} x={1330 + i * 48} y={470} width={38} height={70} rx={6} fill={T.red} opacity={e * 0.8} />;
        })}
        <text x={1410} y={430} textAnchor="middle" fontFamily={MONO} fontSize={18} fill={T.red} opacity={easeOut(seg(f, 190, 215))}>
          FFN → Experts
        </text>
      </svg>
      {nodes.map((n, i) => (
        <React.Fragment key={n.year}>
          <Label x={n.x} y={600} text={n.year} size={26} color={T.muted} mono anchor="middle" opacity={easeOut(seg(f, 30 + i * 24, 60 + i * 24))} />
          <Label x={n.x} y={640} text={n.title} size={40} color={i === 2 ? T.red : T.ink} anchor="middle" opacity={easeOut(seg(f, 36 + i * 24, 66 + i * 24))} />
          <Label x={n.x} y={692} text={n.sub} size={24} color={T.muted} weight={700} anchor="middle" opacity={easeOut(seg(f, 42 + i * 24, 72 + i * 24))} />
        </React.Fragment>
      ))}
      <Label x={960} y={800} text="参数规模在涨，但每次计算只走一小部分" size={30} color={T.ink2} anchor="middle" opacity={easeOut(seg(f, 240, 280))} />
    </>
  );
};

/** ---------- Scene 03：Dense vs MoE ---------- */
const Scene03: React.FC<SceneProps> = ({ f }) => {
  const tokens = [0, 1, 2, 3];
  const tokenY = (i: number) => 390 + i * 95;
  return (
    <>
      <Kicker f={f} text="DENSE vs MIXTURE OF EXPERTS" />
      <Headline f={f} text="同一个 FFN，还是多个专家？" size={58} />
      {/* 左：Dense */}
      <Label x={220} y={300} text="Dense" size={38} color={T.teal} />
      <Label x={220} y={348} text="所有 token 走同一个 FFN" size={22} color={T.muted} weight={700} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {tokens.map((i) => (
          <React.Fragment key={'d' + i}>
            <circle cx={230} cy={tokenY(i)} r={22} fill={T.teal} opacity={easeOut(seg(f, 20 + i * 8, 45 + i * 8))} />
            <Arrow x1={255} y1={tokenY(i)} x2={480} y2={480} color={T.teal} width={2} opacity={0.45 * easeOut(seg(f, 40 + i * 8, 65 + i * 8))} />
          </React.Fragment>
        ))}
        <rect x={480} y={370} width={250} height={220} rx={16} fill="rgba(31,122,107,0.10)" stroke={T.teal} strokeWidth={3} opacity={easeOut(seg(f, 60, 90))} />
        <text x={605} y={490} textAnchor="middle" fontFamily={FONT} fontSize={32} fontWeight={800} fill={T.teal} opacity={easeOut(seg(f, 70, 100))}>
          单一 FFN
        </text>
        <Arrow x1={730} y1={480} x2={830} y2={480} color={T.teal} width={3} opacity={0.7 * easeOut(seg(f, 90, 110))} />
      </svg>
      <Label x={840} y={452} text="输出" size={26} color={T.teal} weight={700} opacity={easeOut(seg(f, 100, 120))} />

      {/* 右：MoE */}
      <Label x={1080} y={300} text="MoE" size={38} color={T.red} />
      <Label x={1080} y={348} text="每个 token 只走被选中的专家" size={22} color={T.muted} weight={700} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {tokens.map((i) => (
          <circle key={'m' + i} cx={1090} cy={tokenY(i)} r={22} fill={T.red} opacity={easeOut(seg(f, 20 + i * 8, 45 + i * 8))} />
        ))}
        <rect x={1220} y={450} width={150} height={80} rx={12} fill={T.ink} opacity={easeOut(seg(f, 60, 85))} />
        <text x={1295} y={498} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill={T.white} opacity={easeOut(seg(f, 70, 95))}>
          Router
        </text>
        {tokens.map((i) => (
          <Arrow key={'mr' + i} x1={1115} y1={tokenY(i)} x2={1220} y2={490} color={T.red} width={2} opacity={0.4 * easeOut(seg(f, 45 + i * 8, 70 + i * 8))} />
        ))}
        {tokens.map((i) => {
          const ey = 350 + i * 110;
          const e = easeOut(seg(f, 95 + i * 10, 120 + i * 10));
          return (
            <React.Fragment key={'e' + i}>
              <Arrow x1={1370} y1={490} x2={1490} y2={ey + 38} color={T.red} width={2} opacity={0.5 * e} />
              <rect x={1490} y={ey} width={210} height={76} rx={10} fill="rgba(200,69,45,0.08)" stroke={T.red} strokeWidth={2} opacity={e} />
              <text x={1595} y={ey + 48} textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={700} fill={T.red} opacity={e}>
                Expert {i + 1}
              </text>
            </React.Fragment>
          );
        })}
      </svg>
    </>
  );
};

/** ---------- Scene 04：Router Top-1 ---------- */
const Scene04: React.FC<SceneProps> = ({ f }) => {
  const scores = [
    { y: 410, v: '-0.5', label: 'E1' },
    { y: 500, v: '0', label: 'E2' },
    { y: 590, v: '-1.2', label: 'E3' },
  ];
  const cols = 16;
  const rows = 8;
  const pitch = 38;
  const chosen = 37;
  return (
    <>
      <Kicker f={f} text="ROUTER · TOP-1 ROUTING" />
      <Headline f={f} text="128 个专家，每个 token 只选 1 个" size={54} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={190} cy={520} r={34} fill={T.ink} opacity={easeOut(seg(f, 15, 40))} />
        <text x={190} y={530} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={800} fill={T.white} opacity={easeOut(seg(f, 20, 45))}>
          Token
        </text>
        <Arrow x1={225} y1={520} x2={380} y2={520} color={T.muted} width={3} opacity={0.6 * easeOut(seg(f, 30, 50))} />
        <rect x={380} y={470} width={180} height={100} rx={14} fill={T.ink} opacity={easeOut(seg(f, 35, 60))} />
        <text x={470} y={530} textAnchor="middle" fontFamily={FONT} fontSize={28} fontWeight={800} fill={T.white} opacity={easeOut(seg(f, 40, 65))}>
          Router
        </text>
        {scores.map((s, i) => {
          const e = easeOut(seg(f, 60 + i * 12, 85 + i * 12));
          const on = i === 1;
          return (
            <React.Fragment key={s.v}>
              <Arrow x1={560} y1={520} x2={640} y2={s.y + 26} color={T.muted} width={2} opacity={0.4 * e} />
              <rect x={640} y={s.y} width={190} height={52} rx={10} fill={on ? 'rgba(200,69,45,0.12)' : 'rgba(18,25,43,0.05)'} stroke={on ? T.red : T.line} strokeWidth={on ? 3 : 2} opacity={e} />
              <text x={665} y={s.y + 36} fontFamily={MONO} fontSize={26} fontWeight={800} fill={on ? T.red : T.muted} opacity={e}>
                {s.v}
              </text>
              <text x={805} y={s.y + 34} textAnchor="end" fontFamily={FONT} fontSize={20} fontWeight={700} fill={on ? T.red : T.muted} opacity={e}>
                {s.label}
              </text>
            </React.Fragment>
          );
        })}
        <Arrow x1={830} y1={526} x2={930} y2={526} color={T.red} width={4} opacity={0.8 * easeOut(seg(f, 105, 130))} />
        <rect x={930} y={478} width={220} height={96} rx={12} fill="rgba(200,69,45,0.10)" stroke={T.red} strokeWidth={3} opacity={easeOut(seg(f, 110, 140))} />
        <text x={1040} y={536} textAnchor="middle" fontFamily={FONT} fontSize={28} fontWeight={800} fill={T.red} opacity={easeOut(seg(f, 115, 145))}>
          Expert 2
        </text>
        {/* 128 专家矩阵 */}
        {Array.from({ length: cols * rows }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const on = i === chosen;
          const e = easeOut(seg(f, 150 + i * 0.8, 165 + i * 0.8));
          return (
            <rect
              key={i}
              x={1160 + col * pitch}
              y={330 + row * pitch}
              width={30}
              height={30}
              rx={6}
              fill={on ? T.red : T.ink}
              opacity={on ? e : e * 0.16}
            />
          );
        })}
        <text x={1160} y={310} fontFamily={FONT} fontSize={22} fontWeight={700} fill={T.muted} opacity={easeOut(seg(f, 170, 195))}>
          128 个路由专家
        </text>
      </svg>
    </>
  );
};

/** ---------- Scene 05：共享专家 + 路由专家 ---------- */
const Scene05: React.FC<SceneProps> = ({ f }) => {
  const p1 = easeOut(seg(f, 30, 60));
  const p2 = easeOut(seg(f, 70, 100));
  const p3 = easeOut(seg(f, 120, 150));
  return (
    <>
      <Kicker f={f} text="SHARED EXPERT + ROUTED EXPERT" />
      <Headline f={f} text="两条路径，最后相加" size={58} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={180} cy={520} r={34} fill={T.ink} opacity={easeOut(seg(f, 10, 35))} />
        <text x={180} y={530} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={800} fill={T.white} opacity={easeOut(seg(f, 15, 40))}>
          Token
        </text>
        {/* 共享路径 */}
        <Arrow x1={215} y1={500} x2={520} y2={380} color={T.teal} width={3} opacity={0.7 * p1} />
        <rect x={520} y={330} width={270} height={100} rx={14} fill="rgba(31,122,107,0.10)" stroke={T.teal} strokeWidth={3} opacity={p1} />
        <text x={655} y={390} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill={T.teal} opacity={p1}>
          共享专家 S(x)
        </text>
        <text x={655} y={420} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={600} fill={T.muted} opacity={p1}>
          always-on
        </text>
        {/* 路由路径 */}
        <Arrow x1={215} y1={540} x2={520} y2={560} color={T.red} width={3} opacity={0.7 * p2} />
        <rect x={520} y={515} width={150} height={80} rx={12} fill={T.ink} opacity={p2} />
        <text x={595} y={563} textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={800} fill={T.white} opacity={p2}>
          Router
        </text>
        <Arrow x1={670} y1={555} x2={820} y2={555} color={T.red} width={3} opacity={0.7 * p2} />
        <rect x={820} y={505} width={270} height={100} rx={14} fill="rgba(200,69,45,0.08)" stroke={T.red} strokeWidth={3} opacity={p2} />
        <text x={955} y={565} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill={T.red} opacity={p2}>
          路由专家 E_j(x)
        </text>
        <text x={955} y={595} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={600} fill={T.muted} opacity={p2}>
          Top-1
        </text>
        {/* 汇合 */}
        <Arrow x1={790} y1={380} x2={1180} y2={510} color={T.teal} width={3} opacity={0.6 * p3} />
        <Arrow x1={1090} y1={555} x2={1180} y2={530} color={T.red} width={3} opacity={0.6 * p3} />
        <rect x={1180} y={480} width={190} height={90} rx={14} fill={T.ink} opacity={p3} />
        <text x={1275} y={536} textAnchor="middle" fontFamily={FONT} fontSize={28} fontWeight={800} fill={T.white} opacity={p3}>
          输出
        </text>
      </svg>
      <Label x={960} y={630} text="MoE(x) = S(x) + g_j(x) · E_j(x)" size={42} color={T.ink} mono anchor="middle" opacity={easeOut(seg(f, 160, 190))} />
      <Label x={960} y={692} text="j = argmax_i sigmoid(W_r x)_i    g_j(x) = sigmoid(W_r x)_j" size={22} color={T.muted} mono anchor="middle" opacity={easeOut(seg(f, 185, 215))} />
      <Label x={960} y={736} text="门控系数乘在专家输出上，不是乘在输入上" size={20} color={T.red} weight={700} anchor="middle" opacity={easeOut(seg(f, 210, 240))} />
    </>
  );
};

/** ---------- Scene 06：容量与代价 ---------- */
const Scene06: React.FC<SceneProps> = ({ f }) => {
  const cols = 16;
  const rows = 10;
  const pitch = 38;
  const active = new Set([17, 33, 49, 66, 82, 99, 115, 131, 148, 155, 160, 78]);
  const mods = [
    { y: 300, t: 'Memory', s: '专家权重仍需存储' },
    { y: 410, t: 'Communication', s: '跨 GPU 专家通信' },
    { y: 520, t: 'Load Balance', s: '专家负载不均' },
    { y: 630, t: 'Token Dispatch', s: 'Token 调度开销' },
  ];
  return (
    <>
      <Kicker f={f} text="CAPACITY vs COST" />
      <Headline f={f} text="17B 激活 ≠ 17B 存储" size={60} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const on = active.has(i);
          const e = easeOut(seg(f, 20 + i * 1.2, 35 + i * 1.2));
          return (
            <rect
              key={i}
              x={120 + col * pitch}
              y={330 + row * pitch}
              width={30}
              height={30}
              rx={6}
              fill={on ? T.red : T.ink}
              opacity={on ? e : e * 0.14}
            />
          );
        })}
      </svg>
      <Label x={120} y={730} text="400B 参数池" size={28} color={T.ink} />
      <Label x={120} y={772} text="17B 本次激活（红色）" size={22} color={T.red} weight={700} />
      {mods.map((m, i) => {
        const e = easeOut(seg(f, 80 + i * 20, 110 + i * 20));
        return (
          <React.Fragment key={m.t}>
            <div
              style={{
                position: 'absolute',
                left: 1050,
                top: m.y,
                width: 480,
                height: 88,
                background: 'rgba(255,255,255,0.78)',
                border: `2px solid ${i === 0 ? T.teal : T.line}`,
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(18,25,43,0.06)',
                opacity: e,
                transform: `translateY(${(1 - e) * 20}px)`,
              }}
            >
              <div style={{ position: 'absolute', left: 24, top: 14, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: i === 0 ? T.teal : T.ink }}>{m.t}</div>
              <div style={{ position: 'absolute', left: 24, top: 50, fontFamily: FONT, fontSize: 20, fontWeight: 600, color: T.muted }}>{m.s}</div>
            </div>
          </React.Fragment>
        );
      })}
      <Label x={960} y={750} text="Capacity  ↔  Compute  ↔  Memory  ↔  Communication" size={30} color={T.ink2} mono anchor="middle" opacity={easeOut(seg(f, 190, 220))} />
    </>
  );
};

/** ---------- Scene 07：评价与总结 ---------- */
const Scene07: React.FC<SceneProps> = ({ f }) => {
  const points = [
    { no: '01', t: '参数可以很多', s: '但不必全部激活' },
    { no: '02', t: 'Router 决定路径', s: '每个 Token 走哪条专家' },
    { no: '03', t: '共享 + 路由', s: '共同完成特征变换' },
  ];
  const showClose = easeOut(seg(f, 900, 960));
  return (
    <>
      <Kicker f={f} text="2025 → 2026 · WHAT REMAINS" />
      <Headline f={f} text="从 Llama 4 到 Muse，问题没变" size={54} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <line x1={300} y1={330} x2={1620} y2={330} stroke={T.line} strokeWidth={3} />
        <circle cx={420} cy={330} r={11} fill={T.red} />
        <circle cx={1420} cy={330} r={11} fill={T.teal} />
        <text x={420} y={300} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={T.red}>2025</text>
        <text x={420} y={370} textAnchor="middle" fontFamily={FONT} fontSize={28} fontWeight={800} fill={T.ink}>Llama 4</text>
        <text x={1420} y={300} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={T.teal}>2026</text>
        <text x={1420} y={370} textAnchor="middle" fontFamily={FONT} fontSize={28} fontWeight={800} fill={T.ink}>Muse</text>
        <text x={920} y={340} textAnchor="middle" fontFamily={FONT} fontSize={22} fill={T.muted}>模型系列变了，问题没变</text>
      </svg>
      {points.map((p, i) => {
        const e = easeOut(seg(f, 120 + i * 40, 160 + i * 40));
        return (
          <div
            key={p.no}
            style={{
              position: 'absolute',
              left: 140 + i * 560,
              top: 440,
              width: 480,
              height: 190,
              background: 'rgba(255,255,255,0.78)',
              border: `2px solid ${i === 2 ? T.red : T.line}`,
              borderRadius: 18,
              boxShadow: '0 10px 30px rgba(18,25,43,0.07)',
              opacity: e,
              transform: `translateY(${(1 - e) * 26}px)`,
            }}
          >
            <div style={{ position: 'absolute', left: 24, top: 18, fontFamily: MONO, fontSize: 26, fontWeight: 800, color: T.red }}>{p.no}</div>
            <div style={{ position: 'absolute', left: 24, top: 60, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: T.ink }}>{p.t}</div>
            <div style={{ position: 'absolute', left: 24, top: 112, fontFamily: FONT, fontSize: 21, fontWeight: 600, color: T.muted }}>{p.s}</div>
          </div>
        );
      })}
      <Label x={960} y={610} text="How to Scale Model Capacity Efficiently?" size={38} color={T.red} mono anchor="middle" opacity={easeOut(seg(f, 360, 400))} />
      <Label x={960} y={668} text="增加多少专家 · 每次激活几个 · 如何安排专家层" size={24} color={T.muted} anchor="middle" opacity={easeOut(seg(f, 400, 440))} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 706, textAlign: 'center', opacity: showClose }}>
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: T.ink }}>Llama 4 MoE</div>
        <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: T.muted, marginTop: 6 }}>Scaling Capacity Without Activating Everything</div>
      </div>
    </>
  );
};

export const SCENES: SceneDef[] = [
  { id: '01', dur: 20, section: '01 · 悬念', sub: ['400B 总参数，为什么每次只激活 17B？'], render: (p) => <Scene01 {...p} /> },
  { id: '02', dur: 30, section: '02 · 背景', sub: ['2023 → 2025：从稠密到 MoE'], render: (p) => <Scene02 {...p} /> },
  { id: '03', dur: 40, section: '03 · 机制', sub: ['Dense：所有 token 走同一个 FFN', 'MoE：每个 token 走被选中的专家'], render: (p) => <Scene03 {...p} /> },
  { id: '04', dur: 45, section: '04 · Router', sub: ['Router：给 128 个专家打分，Top-1 选中一个'], render: (p) => <Scene04 {...p} /> },
  { id: '05', dur: 50, section: '05 · 共享 + 路由', sub: ['共享专家 + 路由专家：两条路径相加'], render: (p) => <Scene05 {...p} /> },
  { id: '06', dur: 45, section: '06 · 代价', sub: ['17B 激活 ≠ 17B 存储'], render: (p) => <Scene06 {...p} /> },
  { id: '07', dur: 60, section: '07 · 总结', sub: ['参数可以很多，但不必全部激活'], render: (p) => <Scene07 {...p} /> },
];

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.dur * 24, 0);
