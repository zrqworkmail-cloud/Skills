import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { easeOut, seg, rise } from './llama/theme';

const NAVY = '#054686';
const INK = '#1B2A4A';
const ORANGE = '#EE822F';
const GOLD = '#F5C26B';
const WHITE = '#FFFFFF';
const LIGHT = '#A9C0D8';
const MUTED = '#6B7785';
const CN = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';
const EN = 'Arial, Helvetica, sans-serif';
const SERIF = '"Times New Roman", Times, serif';
const M = 36;

type Node = { x: number; y: number; r: number; o: number };

/** 400 个节点：左右两个脑叶 + 脑干；1 节点 = 1B */
const NODES: Node[] = (() => {
  const out: Node[] = [];
  const golden = 2.399963229728653;
  const lobe = (cx: number, cy: number, rx: number, ry: number, n: number, seed: number) => {
    for (let k = 0; k < n; k++) {
      const r = Math.sqrt((k + 0.5) / n);
      const th = k * golden + seed;
      const jx = 4 * Math.sin(k * 12.9898 + seed);
      const jy = 4 * Math.cos(k * 78.233 + seed);
      out.push({
        x: cx + rx * r * Math.cos(th) + jx,
        y: cy + ry * r * Math.sin(th) + jy,
        r: 2.4 + 1.6 * (((k * 37) % 10) / 10),
        o: 0.22 + 0.38 * (((k * 53) % 10) / 10),
      });
    }
  };
  lobe(620, 470, 170, 200, 190, 0.3);
  lobe(800, 470, 170, 200, 190, 1.7);
  lobe(710, 735, 45, 55, 20, 2.9);
  return out;
})();

/** 近邻连线，形成神经网络质感 */
const LINES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < NODES.length; i++) {
    for (const d of [1, 7, 19]) {
      const j = i + d;
      if (j >= NODES.length) continue;
      const dx = NODES[i].x - NODES[j].x;
      const dy = NODES[i].y - NODES[j].y;
      if (Math.hypot(dx, dy) < 46) out.push([i, j]);
    }
  }
  return out;
})();

const GOLD_IDX = [12, 37, 58, 83, 105, 128, 152, 177, 201, 226, 248, 273, 297, 321, 346, 368, 391];

const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  font?: string;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  spacing?: number;
  style?: React.CSSProperties;
}> = ({ x, y, text, size = 24, color = INK, weight = 700, font = CN, anchor = 'start', opacity = 1, spacing = 0, style }) => {
  const transform = anchor === 'middle' ? 'translateX(-50%)' : anchor === 'end' ? 'translateX(-100%)' : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform,
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        color,
        opacity,
        letterSpacing: spacing,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** V5：单位云图，400 节点 = 400B，17 金点 = 17B，7s，零运镜 */
export const Llama4MoESampleV5: React.FC = () => {
  const f = useCurrentFrame();
  const pct = (4.25 * easeOut(seg(f, 100, 130))).toFixed(2);
  const rot = 2.5 * Math.sin(f / 60);
  const flash = Math.sin(Math.PI * Math.min(1, Math.max(0, (f - 80) / 60)));

  return (
    <AbsoluteFill style={{ background: WHITE }}>
      <Label x={M} y={20} text="01 · 悬念" size={20} color={NAVY} weight={700} spacing={2} />
      <Label x={M} y={48} text="400B 总参数，为什么每次只激活 17B？" size={38} color={INK} weight={800} />
      <div style={{ position: 'absolute', left: M, top: 100, width: 1920 - 2 * M, height: 3, background: NAVY }} />
      <Img src={staticFile('cai-logo.png')} style={{ position: 'absolute', right: M, top: 14, width: 276 }} />

      <div style={{ position: 'absolute', left: M, top: 124, width: 1920 - 2 * M, height: 736, background: NAVY, borderRadius: 10 }} />

      <div style={{ ...rise(f, 8, 20, 20) }}>
        <Label x={M + 44} y={160} text="400B" size={88} color={WHITE} weight={800} font={EN} />
        <Label x={M + 44} y={262} text="总参数 · Parameters" size={22} color={LIGHT} weight={600} />
      </div>
      <div style={{ ...rise(f, 16, 20, 20) }}>
        <Label x={1920 - M - 44} y={160} text="17B" size={88} color={ORANGE} weight={800} font={EN} anchor="end" />
        <Label x={1920 - M - 44} y={262} text="每次激活 · Active" size={22} color={ORANGE} weight={600} anchor="end" />
      </div>

      {/* 单位云图 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="goldGlow">
            <stop offset="0%" stopColor="#FFE2A8" stopOpacity="1" />
            <stop offset="100%" stopColor="#F5C26B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula">
            <stop offset="0%" stopColor="#2E6FA8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#054686" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={710} cy={500} r={390} fill="url(#nebula)" />
        <g transform={`rotate(${rot} 710 470)`}>
          {/* 神经网络连线 */}
          {LINES.map(([i, j], k) => (
            <line
              key={'l' + k}
              x1={NODES[i].x}
              y1={NODES[i].y}
              x2={NODES[j].x}
              y2={NODES[j].y}
              stroke={WHITE}
              strokeWidth={0.6}
              opacity={0.08}
            />
          ))}
          {/* 400 个节点 */}
          {NODES.map((n, i) => (
            <circle key={'n' + i} cx={n.x} cy={n.y} r={n.r} fill={WHITE} opacity={n.o} />
          ))}
          {/* Router 到 17 个金点的选择线 */}
          {GOLD_IDX.map((idx, k) => {
            const t = easeOut(seg(f, 80 + k * 4, 96 + k * 4));
            const n = NODES[idx];
            return (
              <line
                key={'gl' + k}
                x1={710}
                y1={470}
                x2={n.x}
                y2={n.y}
                stroke={GOLD}
                strokeWidth={1}
                opacity={0.16 * t}
              />
            );
          })}
          {/* 17 个金点：光晕 + 常亮 */}
          {GOLD_IDX.map((idx, k) => {
            const n = NODES[idx];
            const t = seg(f, 80 + k * 4, 96 + k * 4);
            const halo = 4 + 18 * easeOut(t);
            const haloO = (1 - t) * 0.85;
            const dotO = seg(f, 80 + k * 4, 88 + k * 4);
            return (
              <React.Fragment key={'g' + k}>
                <circle cx={n.x} cy={n.y} r={halo} fill="url(#goldGlow)" opacity={haloO} />
                <circle cx={n.x} cy={n.y} r={4.2 * (1 + 0.15 * flash)} fill={GOLD} opacity={dotO} />
              </React.Fragment>
            );
          })}
          {/* Router 中心 */}
          <circle cx={710} cy={470} r={14} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.5} />
          <circle cx={710} cy={470} r={7} fill={WHITE} />
          <text x={710} y={505} textAnchor="middle" fontFamily={EN} fontSize={17} fontWeight={700} fill={WHITE} opacity={0.9}>
            Router
          </text>
        </g>
      </svg>

      {/* 单位说明 */}
      <Label x={M + 44} y={800} text="1 节点 = 1B 参数 · 400 节点 = 400B · 17 金点 = 17B" size={20} color={LIGHT} weight={600} />

      {/* 右侧 4.25% 结论 */}
      <div style={{ position: 'absolute', left: 1240, top: 360, width: 2, height: 240, background: WHITE, opacity: 0.18 }} />
      <Label x={1280} y={380} text={`${pct}%`} size={96} color={ORANGE} weight={800} font={EN} opacity={easeOut(seg(f, 96, 116))} />
      <Label x={1280} y={496} text="的参数参与本次计算" size={22} color={LIGHT} weight={600} opacity={easeOut(seg(f, 110, 130))} />
      <Label x={1280} y={532} text="17 / 400 · 1 节点 = 1B" size={18} color={LIGHT} weight={400} font={SERIF} opacity={easeOut(seg(f, 116, 136))} />

      {/* 页脚 */}
      <div style={{ position: 'absolute', left: M, top: 1014, width: 1920 - 2 * M, height: 2, background: NAVY, opacity: 0.45 }} />
      <Label x={M} y={1030} text="2026/11/2" size={18} color={MUTED} weight={400} font={SERIF} />
      <Label
        x={960}
        y={1030}
        text="SHANDONG UNIVERSITY OF FINANCE AND ECONOMICS"
        size={16}
        color={MUTED}
        weight={400}
        font={SERIF}
        anchor="middle"
      />
      <Label x={1920 - M} y={1030} text="01 / 18" size={18} color={MUTED} weight={400} font={SERIF} anchor="end" />
    </AbsoluteFill>
  );
};
