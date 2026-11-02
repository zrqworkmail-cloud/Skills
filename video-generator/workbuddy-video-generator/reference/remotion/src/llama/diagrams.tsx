import React from 'react';
import { T, FONT, MONO, easeOut, easeInOut, seg, clamp01, rise, fadeIn } from './theme';

const label = (x: number, y: number, t: string, size = 24, color = T.muted, weight = 700, anchor: 'start' | 'middle' | 'end' = 'start') => (
  <text x={x} y={y} fontFamily={FONT} fontSize={size} fontWeight={weight} fill={color} textAnchor={anchor}>
    {t}
  </text>
);

/** 1-1 解码器栈：token 从下往上，顶部吐出下一个 token */
export const DecoderStack: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const blocks = 4;
  const bx = 760;
  const bw = 400;
  const bh = 68;
  const gap = 14;
  const baseY = 600;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: blocks }).map((_, i) => {
        const e = easeOut(seg(f, delay + i * 6, delay + i * 6 + 18));
        const y = baseY - i * (bh + gap);
        return (
          <g key={i} opacity={e} transform={`translate(0 ${(1 - e) * 24})`}>
            <rect x={bx} y={y} width={bw} height={bh} rx={12} fill={T.white} stroke={T.line} strokeWidth={2} />
            {label(bx + bw / 2, y + bh / 2 + 9, i === blocks - 1 ? 'Transformer Block ×N' : 'Block', 26, T.ink2, 800, 'middle')}
          </g>
        );
      })}
      {/* 输入 token */}
      {[0, 1, 2].map((i) => {
        const e = easeOut(seg(f, delay + 6 + i * 5, delay + 24 + i * 5));
        return (
          <g key={'t' + i} opacity={e}>
            <rect x={bx + 30 + i * 120} y={680} width={100} height={50} rx={10} fill={T.bg2} stroke={T.line} strokeWidth={2} />
            {label(bx + 80 + i * 120, 712, ['词', '词', '词'][i], 24, T.ink2, 700, 'middle')}
          </g>
        );
      })}
      {label(bx + 200, 764, '已有前文', 24, T.muted, 700, 'middle')}
      {/* 输出 */}
      <g opacity={easeOut(seg(f, delay + 40, delay + 58))}>
        <rect x={bx + 130} y={236} width={140} height={56} rx={12} fill={T.red} />
        {label(bx + 200, 273, '下一个词', 26, T.white, 800, 'middle')}
        <path d={`M${bx + 200} ${baseY - blocks * (bh + gap) + 10} L${bx + 200} 300`} stroke={T.red} strokeWidth={4} markerEnd="url(#arrowRed)" />
      </g>
      <defs>
        <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={T.red} />
        </marker>
      </defs>
      {label(1280, 470, '只保留解码器', 30, T.ink2, 800)}
      {label(1280, 512, '不训练双向编码', 26, T.muted, 600)}
    </svg>
  );
};

/** 1-2 一个 block 放大，三部件依次点亮 */
export const BlockZoom: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const parts = [
    { name: 'RMSNorm', y: 250, c: T.gold },
    { name: 'Self-Attention', y: 400, c: T.red },
    { name: 'SwiGLU FFN', y: 550, c: T.teal },
  ];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <rect x={640} y={196} width={640} height={470} rx={20} fill="rgba(255,255,255,0.8)" stroke={T.line} strokeWidth={2} />
      {parts.map((p, i) => {
        const e = easeOut(seg(f, delay + 10 + i * 22, delay + 26 + i * 22));
        return (
          <g key={p.name} opacity={e}>
            <rect x={690} y={p.y} width={540} height={96} rx={14} fill={p.c} opacity={0.14} />
            <rect x={690} y={p.y} width={6} height={96} rx={3} fill={p.c} />
            {label(730, p.y + 60, p.name, 34, T.ink, 800)}
            <circle cx={1160} cy={p.y + 48} r={12} fill={p.c} opacity={0.85} />
          </g>
        );
      })}
      {[0, 1].map((i) => (
        <line key={i} x1={960} y1={346 + i * 150} x2={960} y2={400 + i * 150} stroke={T.line} strokeWidth={3} opacity={easeOut(seg(f, delay + 16 + i * 22, delay + 30 + i * 22))} />
      ))}
      {label(1330, 320, '归一化', 30, T.gold, 800)}
      {label(1330, 470, '混合信息', 30, T.red, 800)}
      {label(1330, 620, '逐位置变换', 30, T.teal, 800)}
      {label(1330, 664, '参数大头', 24, T.muted, 600)}
    </svg>
  );
};

/** 1-3 pre-norm vs post-norm */
export const NormCompare: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const cols = [
    { x: 470, title: 'pre-norm', order: ['x', 'Norm', 'Attn', 'Add'], ok: true, note: '梯度稳，能堆很深' },
    { x: 1180, title: 'post-norm', order: ['x', 'Attn', 'Add', 'Norm'], ok: false, note: '深层易衰减' },
  ];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {cols.map((c, ci) => (
        <g key={c.title}>
          {label(c.x + 130, 210, c.title, 34, T.ink, 900, 'middle')}
          {c.order.map((o, i) => {
            const e = easeOut(seg(f, delay + ci * 8 + i * 7, delay + ci * 8 + i * 7 + 14));
            const y = 250 + i * 100;
            const hot = o === 'Norm';
            return (
              <g key={o} opacity={e}>
                <rect x={c.x} y={y} width={260} height={68} rx={12} fill={hot ? 'rgba(184,134,43,0.16)' : T.white} stroke={hot ? T.gold : T.line} strokeWidth={2} />
                {label(c.x + 130, y + 44, o, 28, T.ink2, 800, 'middle')}
                {i < 3 && <path d={`M${c.x + 130} ${y + 68} L${c.x + 130} ${y + 100}`} stroke={T.line} strokeWidth={3} />}
              </g>
            );
          })}
          <g opacity={easeOut(seg(f, delay + 40, delay + 58))}>
            <rect x={c.x + 20} y={670} width={220} height={54} rx={27} fill={c.ok ? 'rgba(31,122,107,0.14)' : 'rgba(200,69,45,0.12)'} />
            {label(c.x + 130, 705, c.note, 24, c.ok ? T.teal : T.red, 800, 'middle')}
          </g>
        </g>
      ))}
    </svg>
  );
};

/** 1-4 RoPE：向量旋转，相对角度不变 */
export const RopeViz: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const ang = easeInOut(seg(f, delay + 12, delay + 60)) * 55;
  const cx = 760;
  const cy = 520;
  const r = 210;
  const pts = [
    { a: -90 + ang, c: T.red, name: '位置 i' },
    { a: -20 + ang, c: T.teal, name: '位置 j' },
  ];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.line} strokeWidth={2} />
      <line x1={cx - r - 30} y1={cy} x2={cx + r + 30} y2={cy} stroke={T.line} strokeWidth={2} />
      <line x1={cx} y1={cy - r - 30} x2={cx} y2={cy + r + 30} stroke={T.line} strokeWidth={2} />
      {pts.map((p) => {
        const rad = (p.a * Math.PI) / 180;
        const x = cx + Math.cos(rad) * r;
        const y = cy + Math.sin(rad) * r;
        return (
          <g key={p.name}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={p.c} strokeWidth={7} strokeLinecap="round" />
            <circle cx={x} cy={y} r={9} fill={p.c} />
            {label(x + (x > cx ? 18 : -18), y - 12, p.name, 26, p.c, 800, x > cx ? 'start' : 'end')}
          </g>
        );
      })}
      <path d={`M${cx + 120} ${cy} A120 120 0 0 1 ${cx + Math.cos((-20 + ang) * Math.PI / 180) * 120} ${cy + Math.sin((-20 + ang) * Math.PI / 180) * 120}`} fill="none" stroke={T.ink2} strokeWidth={3} strokeDasharray="8 8" />
      {label(cx + 150, cy - 60, '相对角度不变', 28, T.ink2, 800)}
      {label(1180, 400, '按位置旋转向量', 32, T.ink, 800)}
      {label(1180, 446, '两个词的距离 = 夹角差', 26, T.muted, 600)}
      {label(1180, 520, '不需要绝对编号', 26, T.muted, 600)}
    </svg>
  );
};

/** 1-5 SwiGLU 门控 */
export const SwiGlu: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p1 = easeOut(seg(f, delay + 10, delay + 34));
  const p2 = easeOut(seg(f, delay + 30, delay + 54));
  const p3 = easeOut(seg(f, delay + 50, delay + 74));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <rect x={420} y={430} width={150} height={80} rx={14} fill={T.white} stroke={T.line} strokeWidth={2} />
      {label(495, 480, 'x', 34, T.ink, 800, 'middle')}
      {/* 上支路 */}
      <path d={`M570 460 C660 460 660 330 760 330`} stroke={T.teal} strokeWidth={5} fill="none" opacity={p1} />
      <g opacity={p1}>
        <rect x={760} y={292} width={200} height={76} rx={14} fill="rgba(31,122,107,0.14)" stroke={T.teal} strokeWidth={2} />
        {label(860, 340, 'Swish', 30, T.teal, 800, 'middle')}
      </g>
      {/* 下支路 */}
      <path d={`M570 490 C660 490 660 620 760 620`} stroke={T.gold} strokeWidth={5} fill="none" opacity={p2} />
      <g opacity={p2}>
        <rect x={760} y={582} width={200} height={76} rx={14} fill="rgba(184,134,43,0.14)" stroke={T.gold} strokeWidth={2} />
        {label(860, 630, '门控', 30, T.gold, 800, 'middle')}
      </g>
      {/* 相乘 */}
      <g opacity={p3}>
        <circle cx={1080} cy={475} r={54} fill={T.red} />
        {label(1080, 488, '×', 44, T.white, 800, 'middle')}
        <path d="M960 330 L1030 440" stroke={T.teal} strokeWidth={4} opacity={p3} />
        <path d="M960 620 L1030 512" stroke={T.gold} strokeWidth={4} opacity={p3} />
        <path d="M1134 475 L1240 475" stroke={T.red} strokeWidth={5} markerEnd="url(#arrowR2)" />
        <rect x={1244} y={430} width={190} height={90} rx={14} fill={T.white} stroke={T.red} strokeWidth={3} />
        {label(1339, 486, '输出', 30, T.red, 800, 'middle')}
      </g>
      <defs>
        <marker id="arrowR2" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={T.red} />
        </marker>
      </defs>
      {label(1460, 420, '选择性放行', 30, T.ink, 800)}
      {label(1460, 466, 'FFN 占参数约 2/3', 26, T.muted, 600)}
    </svg>
  );
};

/** 2-5 Chinchilla 等算力曲线 */
export const Chinchilla: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p = easeOut(seg(f, delay + 8, delay + 56));
  const x0 = 420;
  const y0 = 700;
  const w = 900;
  const h = 380;
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = x0 + t * w;
    const y = y0 - (Math.pow(t - 0.42, 2) * 2.1 + 0.1) * h;
    pts.push(`${x},${y}`);
  }
  const d = `M${pts.join(' L')}`;
  const dash = 2600;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={x0} y1={y0} x2={x0 + w + 30} y2={y0} stroke={T.line} strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 - h - 20} stroke={T.line} strokeWidth={2} />
      <path d={d} fill="none" stroke={T.red} strokeWidth={6} strokeDasharray={dash} strokeDashoffset={dash * (1 - p)} strokeLinecap="round" />
      {p > 0.95 && (
        <g opacity={easeOut(seg(f, delay + 50, delay + 66))}>
          <circle cx={x0 + 0.42 * w} cy={y0 - 0.1 * h} r={13} fill={T.red} />
          <line x1={x0 + 0.42 * w} y1={y0 - 0.1 * h} x2={x0 + 0.42 * w} y2={y0} stroke={T.red} strokeWidth={2} strokeDasharray="6 6" />
          {label(x0 + 0.42 * w, y0 + 44, '最优点', 26, T.red, 800, 'middle')}
        </g>
      )}
      {label(x0 + w / 2, y0 + 56, '参数量 →', 28, T.muted, 700, 'middle')}
      {label(x0 - 26, y0 - h / 2, '损失', 28, T.muted, 700, 'end')}
      {label(1420, 380, '算力固定', 34, T.ink, 900)}
      {label(1420, 428, '参数和数据要一起涨', 28, T.muted, 600)}
      {label(1420, 500, '之前：参数太大、数据太少', 26, T.ink2, 600)}
    </svg>
  );
};

/** 3-2 上下文窗口 2K→4K */
export const ContextWindow: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const g = easeOut(seg(f, delay + 16, delay + 46));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <g opacity={easeOut(seg(f, delay, delay + 18))}>
        <rect x={420} y={280} width={400} height={300} rx={14} fill="rgba(255,255,255,0.8)" stroke={T.line} strokeWidth={3} />
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={444} y={306 + i * 44} width={340 - (i % 3) * 40} height={16} rx={8} fill="rgba(18,25,43,0.16)" />
        ))}
        {label(620, 640, '2K', 46, T.muted, 900, 'middle')}
      </g>
      <g opacity={g}>
        <rect x={980} y={220} width={400} height={420} rx={14} fill="rgba(255,255,255,0.9)" stroke={T.red} strokeWidth={3} />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={1004} y={246 + i * 44} width={340 - (i % 4) * 30} height={16} rx={8} fill="rgba(200,69,45,0.28)" />
        ))}
        {label(1180, 700, '4K', 46, T.red, 900, 'middle')}
      </g>
      <g opacity={easeOut(seg(f, delay + 40, delay + 58))}>
        <path d="M840 430 L960 430" stroke={T.red} strokeWidth={5} markerEnd="url(#arrowR3)" />
        <defs>
          <marker id="arrowR3" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={T.red} />
          </marker>
        </defs>
        {label(1500, 400, '一次能读更长的材料', 30, T.ink2, 800)}
        {label(1500, 446, '代价：注意力计算量随长度平方增长', 24, T.muted, 600)}
      </g>
    </svg>
  );
};

/** 3-3 GQA：32 查询头 → 8 组 KV */
export const Gqa: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p = easeOut(seg(f, delay + 10, delay + 50));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 32 }).map((_, i) => {
        const group = Math.floor(i / 4);
        const e = easeOut(seg(f, delay + i * 1.2, delay + i * 1.2 + 12));
        const col = i % 8;
        const row = Math.floor(i / 8);
        return (
          <circle
            key={i}
            cx={470 + col * 56}
            cy={280 + row * 56}
            r={18}
            fill={['#C8452D', '#B8862B', '#1F7A6B', '#2A3348'][group % 4]}
            opacity={e * 0.85}
          />
        );
      })}
      {label(470, 240, '32 个查询头', 28, T.ink, 800)}
      {/* 分组框 */}
      {Array.from({ length: 8 }).map((_, g) => {
        const col = g % 8;
        const e = easeOut(seg(f, delay + 30 + g * 3, delay + 46 + g * 3));
        return (
          <rect key={g} x={470 + col * 56 - 26} y={254} width={52} height={180} rx={10} fill="none" stroke={T.ink2} strokeWidth={2} strokeDasharray="6 5" opacity={e * 0.5} />
        );
      })}
      {/* KV 组 */}
      <g opacity={p}>
        {Array.from({ length: 8 }).map((_, g) => (
          <rect key={g} x={1030} y={250 + g * 40} width={110} height={30} rx={8} fill="rgba(31,122,107,0.2)" stroke={T.teal} strokeWidth={2} />
        ))}
        {label(1085, 232, '8 组 KV', 26, T.teal, 800, 'middle')}
      </g>
      {/* cache 对比 */}
      <g opacity={easeOut(seg(f, delay + 52, delay + 70))}>
        <rect x={1300} y={300} width={200} height={200} rx={12} fill="rgba(200,69,45,0.12)" stroke={T.red} strokeWidth={2} />
        {label(1400, 540, '原来：32 份', 26, T.red, 800, 'middle')}
        <rect x={1560} y={390} width={110} height={110} rx={10} fill="rgba(31,122,107,0.16)" stroke={T.teal} strokeWidth={2} />
        {label(1615, 540, 'GQA：8 份', 26, T.teal, 800, 'middle')}
        {label(1400, 600, 'KV cache ≈ 1/4', 30, T.ink, 900, 'middle')}
      </g>
      {label(470, 500, '推理时不用重复存 KV', 28, T.muted, 600)}
    </svg>
  );
};

/** 3-5 Ghost Attention：话题被拉回 */
export const GhostAttention: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p = easeOut(seg(f, delay + 10, delay + 60));
  const w = 1100;
  const x0 = 420;
  const y0 = 470;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke={T.line} strokeWidth={3} strokeDasharray="10 8" />
      {label(x0 + w / 2, y0 - 24, '系统提示：始终按这个身份回答', 24, T.muted, 700, 'middle')}
      <path
        d={`M${x0} ${y0} C${x0 + 180} ${y0} ${x0 + 200} ${y0 - 150} ${x0 + 330} ${y0 - 150}
           C${x0 + 430} ${y0 - 150} ${x0 + 450} ${y0} ${x0 + 560} ${y0}
           C${x0 + 700} ${y0} ${x0 + 720} ${y0 + 140} ${x0 + 850} ${y0 + 140}
           C${x0 + 950} ${y0 + 140} ${x0 + 960} ${y0} ${x0 + w} ${y0}`}
        fill="none"
        stroke={T.red}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={2600}
        strokeDashoffset={2600 * (1 - p)}
      />
      {label(x0 + 330, y0 - 180, '第 2 轮跑偏', 24, T.red, 800, 'middle')}
      {label(x0 + 850, y0 + 180, '第 5 轮又跑偏', 24, T.red, 800, 'middle')}
      <g opacity={easeOut(seg(f, delay + 56, delay + 72))}>
        {[330, 850].map((dx) => (
          <g key={dx}>
            <line x1={x0 + dx} y1={y0 + (dx === 330 ? -150 : 140)} x2={x0 + dx} y2={y0} stroke={T.teal} strokeWidth={4} strokeDasharray="7 6" />
            <circle cx={x0 + dx} cy={y0} r={9} fill={T.teal} />
          </g>
        ))}
        {label(1600, 380, '每轮把系统提示重新注入', 30, T.ink, 900)}
        {label(1600, 426, '话题被拽回主线', 26, T.muted, 600)}
      </g>
    </svg>
  );
};

/** 4-3 词表：32K 碎片 vs 128K 整块 */
export const Vocab: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const frag = ['技', '术', '流', '的', '本', '质', '是', '换', '算', '力'];
  const whole = ['技术流', '的本质', '是', '换算力'];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {label(420, 250, '32K 词表', 30, T.muted, 800)}
      {frag.map((t, i) => {
        const e = easeOut(seg(f, delay + i * 2, delay + 14 + i * 2));
        return (
          <g key={i} opacity={e}>
            <rect x={420 + i * 92} y={286} width={80} height={80} rx={10} fill={T.white} stroke={T.line} strokeWidth={2} />
            {label(460 + i * 92, 340, t, 30, T.ink2, 700, 'middle')}
          </g>
        );
      })}
      {label(420 + 10 * 92 + 20, 340, '10 个 token', 26, T.red, 800)}

      {label(420, 470, '128K 词表', 30, T.teal, 800)}
      {whole.map((t, i) => {
        const e = easeOut(seg(f, delay + 30 + i * 6, delay + 44 + i * 6));
        const w = 92 * t.length;
        const x = 420 + whole.slice(0, i).reduce((a, s) => a + 92 * s.length, 0);
        return (
          <g key={i} opacity={e}>
            <rect x={x} y={506} width={w - 8} height={80} rx={10} fill="rgba(31,122,107,0.14)" stroke={T.teal} strokeWidth={2} />
            {label(x + (w - 8) / 2, 560, t, 30, T.teal, 800, 'middle')}
          </g>
        );
      })}
      {label(420 + 10 * 92 + 20, 560, '4 个 token', 26, T.teal, 800)}
      {label(420, 700, '同样一段话：token 少 → 同上下文装更多 → 训练与推理都更省', 30, T.ink2, 800)}
    </svg>
  );
};

/** 6-4 MoE 路由：128 专家中选 1 + 共享专家 */
export const MoERouting: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const chosen = [37];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 128 }).map((_, i) => {
        const col = i % 16;
        const row = Math.floor(i / 16);
        const on = chosen.includes(i);
        const e = easeOut(seg(f, delay + i * 0.5, delay + 12 + i * 0.5));
        return (
          <rect
            key={i}
            x={700 + col * 56}
            y={250 + row * 56}
            width={44}
            height={44}
            rx={8}
            fill={on ? T.red : 'rgba(18,25,43,0.14)'}
            opacity={on ? e : e * 0.5}
          />
        );
      })}
      {label(700, 226, '128 个专家', 26, T.ink, 800)}
      {/* 路由 */}
      <g opacity={easeOut(seg(f, delay + 30, delay + 48))}>
        <rect x={380} y={420} width={150} height={80} rx={14} fill={T.ink} />
        {label(455, 470, '路由', 30, T.white, 800, 'middle')}
        {chosen.map((c) => {
          const col = c % 16;
          const row = Math.floor(c / 16);
          return <line key={c} x1={530} y1={460} x2={700 + col * 56} y2={250 + row * 56 + 22} stroke={T.red} strokeWidth={3} opacity={0.6} />;
        })}
        {label(455, 540, '只算 1 个路由专家', 24, T.red, 800, 'middle')}
        {/* 共享专家：始终在线 */}
        <line x1={410} y1={500} x2={410} y2={590} stroke={T.teal} strokeWidth={3} opacity={0.7} />
        <rect x={380} y={590} width={150} height={80} rx={12} fill={T.teal} />
        {label(455, 624, '共享专家', 24, T.white, 800, 'middle')}
        {label(455, 652, 'always-on', 18, 'rgba(255,255,255,0.75)', 600, 'middle')}
      </g>
      {label(700, 742, '总容量可以很大，单次计算量却不大', 30, T.ink2, 800)}
    </svg>
  );
};

/** 6-5 iRoPE 交错层 */
export const IRope: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: 10 }).map((_, i) => {
      const e = easeOut(seg(f, delay + i * 5, delay + 16 + i * 5));
      const rope = i % 2 === 0;
      return (
        <g key={i} opacity={e}>
          <rect x={420} y={240 + i * 52} width={900} height={40} rx={8} fill={rope ? 'rgba(200,69,45,0.16)' : 'rgba(18,25,43,0.10)'} stroke={rope ? T.red : T.line} strokeWidth={2} />
          {label(450, 268 + i * 52, rope ? 'RoPE 注意力层' : '无位置编码层', 22, rope ? T.red : T.muted, 700)}
        </g>
      );
    })}
    {label(1380, 330, '交错排列', 32, T.ink, 900)}
    {label(1380, 376, '训练长度之外还能外推', 26, T.muted, 600)}
    {label(1380, 440, 'Scout：1000 万上下文', 26, T.red, 800)}
  </svg>
);

/** 6-6 原生多模态 */
export const Multimodal: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p = easeOut(seg(f, delay + 14, delay + 48));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <g opacity={p}>
        <rect x={420} y={300} width={300} height={200} rx={14} fill={T.white} stroke={T.teal} strokeWidth={3} />
        {label(570, 420, '图像', 34, T.teal, 800, 'middle')}
        <rect x={420} y={560} width={300} height={160} rx={14} fill={T.white} stroke={T.red} strokeWidth={3} />
        {label(570, 656, '文本', 34, T.red, 800, 'middle')}
        <path d="M720 400 C860 400 860 510 980 510" stroke={T.teal} strokeWidth={5} fill="none" />
        <path d="M720 640 C860 640 860 530 980 530" stroke={T.red} strokeWidth={5} fill="none" />
        <rect x={984} y={450} width={280} height={140} rx={14} fill={T.ink} />
        {label(1124, 512, '同一个编码器', 26, T.white, 800, 'middle')}
        {label(1124, 552, 'early fusion', 22, 'rgba(255,255,255,0.7)', 600, 'middle')}
      </g>
      {label(1330, 470, '不是"先看图再转文字"', 30, T.ink2, 800)}
      {label(1330, 516, '而是从输入层就融合', 26, T.muted, 600)}
    </svg>
  );
};

/** 5-5 稠密成本：线性上涨 */
export const CostLinear: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p = easeOut(seg(f, delay + 8, delay + 50));
  const x0 = 460;
  const y0 = 700;
  const w = 780;
  const h = 360;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={x0} y1={y0} x2={x0 + w + 20} y2={y0} stroke={T.line} strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 - h - 20} stroke={T.line} strokeWidth={2} />
      <line x1={x0} y1={y0} x2={x0 + w * p} y2={y0 - h * p} stroke={T.red} strokeWidth={7} strokeLinecap="round" />
      {[[0.25, '8B'], [0.45, '70B'], [0.95, '405B']].map(([r, name], i) => {
        const e = easeOut(seg(f, delay + 20 + i * 10, delay + 34 + i * 10));
        const x = x0 + w * (r as number);
        const y = y0 - h * (r as number);
        return (
          <g key={name as string} opacity={e}>
            <circle cx={x} cy={y} r={11} fill={T.red} />
            {label(x, y - 22, name as string, 26, T.red, 800, 'middle')}
          </g>
        );
      })}
      {label(x0 + w / 2, y0 + 54, '参数量 →', 26, T.muted, 700, 'middle')}
      {label(x0 - 22, y0 - h / 2, '推理成本', 26, T.muted, 700, 'end')}
      {label(1330, 380, '每个 token 都要过全部参数', 30, T.ink, 900)}
      {label(1330, 426, '显存、延迟随参数线性上涨', 26, T.muted, 600)}
      {label(1330, 500, '405B：部署门槛极高', 26, T.red, 800)}
    </svg>
  );
};

/** 5-6 撞墙 */
export const CostWall: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const p = easeOut(seg(f, delay + 6, delay + 40));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <rect x={1240} y={220} width={54} height={440} rx={6} fill="rgba(18,25,43,0.12)" stroke={T.line} strokeWidth={2} />
      {label(1267, 200, '成本墙', 26, T.muted, 800, 'middle')}
      <line x1={420} y1={560} x2={420 + 800 * p} y2={560} stroke={T.red} strokeWidth={9} strokeLinecap="round" markerEnd="url(#arrowWall)" />
      <defs>
        <marker id="arrowWall" markerWidth="12" markerHeight="12" refX="7" refY="6" orient="auto">
          <path d="M0,0 L12,6 L0,12 z" fill={T.red} />
        </marker>
      </defs>
      {p > 0.92 && (
        <g opacity={easeOut(seg(f, delay + 40, delay + 54))}>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={1236} y1={480 + i * 30} x2={1236 - 40 - i * 14} y2={430 + i * 46} stroke={T.red} strokeWidth={4} opacity={0.7} />
          ))}
          {label(900, 640, '稠密路线走到 405B，成本压不住了', 30, T.ink2, 800, 'middle')}
        </g>
      )}
    </svg>
  );
};

/** 7-1 数据增长折线 */
export const DataLine: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const data = [
    { x: 460, y: 640, v: '1T', t: 'Llama 1' },
    { x: 760, y: 560, v: '2T', t: 'Llama 2' },
    { x: 1120, y: 360, v: '15T', t: 'Llama 3' },
    { x: 1460, y: 330, v: '15.6T', t: 'Llama 3.1' },
  ];
  const p = easeOut(seg(f, delay + 10, delay + 56));
  const d = `M${data.map((p2) => `${p2.x},${p2.y}`).join(' L')}`;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={420} y1={700} x2={1720} y2={700} stroke={T.line} strokeWidth={2} />
      <path d={d} fill="none" stroke={T.red} strokeWidth={6} strokeLinecap="round" strokeDasharray={1800} strokeDashoffset={1800 * (1 - p)} />
      {data.map((p2, i) => {
        const e = easeOut(seg(f, delay + 16 + i * 12, delay + 30 + i * 12));
        return (
          <g key={p2.t} opacity={e}>
            <circle cx={p2.x} cy={p2.y} r={10} fill={T.red} />
            {label(p2.x, p2.y - 26, p2.v, 32, T.red, 800, 'middle')}
            {label(p2.x, 740, p2.t, 24, T.muted, 700, 'middle')}
          </g>
        );
      })}
      {label(420, 780, '预训练 token 数', 24, T.muted, 600)}
    </svg>
  );
};

/** 7-3 上下文对数轴 */
export const LogAxis: React.FC<{ f: number; delay?: number }> = ({ f, delay = 0 }) => {
  const marks = [
    { v: '2K', p: 0 },
    { v: '4K', p: 0.15 },
    { v: '8K', p: 0.3 },
    { v: '128K', p: 0.62 },
    { v: '1M', p: 0.83 },
    { v: '10M', p: 1 },
  ];
  const x0 = 420;
  const w = 1200;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={x0} y1={470} x2={x0 + w} y2={470} stroke={T.ink2} strokeWidth={3} />
      {marks.map((m, i) => {
        const e = easeOut(seg(f, delay + 8 + i * 10, delay + 22 + i * 10));
        const x = x0 + w * m.p;
        return (
          <g key={m.v} opacity={e}>
            <line x1={x} y1={450} x2={x} y2={490} stroke={T.ink2} strokeWidth={3} />
            {label(x, 530, m.v, 28, i === marks.length - 1 ? T.red : T.ink2, 800, 'middle')}
          </g>
        );
      })}
      {label(x0 + w / 2, 400, '对数轴：每一格是十倍', 26, T.muted, 700, 'middle')}
      {label(x0, 600, '从 2K 到 1000 万：约 5000 倍', 34, T.ink, 900)}
    </svg>
  );
};
