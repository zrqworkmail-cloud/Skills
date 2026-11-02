import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { easeOut, seg, rise, clamp01 } from './llama/theme';

const NAVY = '#054686';
const INK = '#1B2A4A';
const ORANGE = '#EE822F';
const WHITE = '#FFFFFF';
const LIGHT = '#A9C0D8';
const MUTED = '#6B7785';
const CN = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';
const EN = 'Arial, Helvetica, sans-serif';
const SERIF = '"Times New Roman", Times, serif';

// PPT 实际页边距：1600px 导出图上约 30px → 1920px 下约 36px
const M = 36;

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

/** V4：严格按 PPT 页网格（36px 边距）+ 深蓝数据面板，7s，零运镜 */
export const Llama4MoESampleV4: React.FC = () => {
  const f = useCurrentFrame();
  // 单位图：20×20 = 400 格，1 格 = 1B；17 格橙色 = 17B
  const cols = 20;
  const rows = 20;
  const pitch = 26;
  const cell = 20;
  const active = new Set([12, 47, 83, 105, 138, 162, 197, 214, 249, 271, 296, 318, 343, 365, 388, 22, 58]);

  const flash = Math.sin(Math.PI * clamp01((f - 80) / 24));
  const pct = (4.25 * easeOut(seg(f, 100, 130))).toFixed(2);

  return (
    <AbsoluteFill style={{ background: WHITE }}>
      {/* PPT 页眉：36px 边距 */}
      <Label x={M} y={20} text="01 · 悬念" size={20} color={NAVY} weight={700} spacing={2} />
      <Label x={M} y={48} text="400B 总参数，为什么每次只激活 17B？" size={38} color={INK} weight={800} />
      <div style={{ position: 'absolute', left: M, top: 100, width: 1920 - 2 * M, height: 3, background: NAVY }} />
      <Img src={staticFile('cai-logo.png')} style={{ position: 'absolute', right: M, top: 14, width: 276 }} />

      {/* 深蓝数据面板：保留 V1 的对比度，但嵌在 PPT 白页里 */}
      <div style={{ position: 'absolute', left: M, top: 124, width: 1920 - 2 * M, height: 736, background: NAVY, borderRadius: 10 }} />

      <div style={{ ...rise(f, 8, 20, 20) }}>
        <Label x={M + 44} y={160} text="400B" size={88} color={WHITE} weight={800} font={EN} />
        <Label x={M + 44} y={262} text="总参数 · Parameters" size={22} color={LIGHT} weight={600} />
      </div>
      <div style={{ ...rise(f, 16, 20, 20) }}>
        <Label x={1920 - M - 44} y={160} text="17B" size={88} color={ORANGE} weight={800} font={EN} anchor="end" />
        <Label x={1920 - M - 44} y={262} text="每次激活 · Active" size={22} color={ORANGE} weight={600} anchor="end" />
      </div>
      <div style={{ position: 'absolute', left: 960, top: 160, width: 2, height: 110, background: WHITE, opacity: 0.18 }} />

      {/* 单位图：20×20 = 400 格，1 格 = 1B */}
      <Label x={M + 44 + 520 + 24} y={330} text="1 格 = 1B 参数" size={20} color={LIGHT} weight={600} />
      <Label x={M + 44 + 520 + 24} y={362} text="20 × 20 = 400 格" size={20} color={LIGHT} weight={600} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const on = active.has(i);
          const e = easeOut(seg(f, 20 + col * 4, 32 + col * 4));
          const s = 0.7 + 0.3 * e;
          const cs = on ? 1 + 0.12 * flash : 1;
          const w = cell * s * cs;
          return (
            <rect
              key={i}
              x={M + 44 + col * pitch + (cell - w) / 2}
              y={320 + row * pitch + (cell - w) / 2}
              width={w}
              height={w}
              rx={3}
              fill={on ? ORANGE : WHITE}
              opacity={on ? e : e * 0.16}
            />
          );
        })}
        {/* 单位图外框 */}
        <rect
          x={M + 44 - 6}
          y={320 - 6}
          width={cols * pitch + 6}
          height={rows * pitch + 6}
          rx={6}
          fill="none"
          stroke={WHITE}
          strokeWidth={2}
          opacity={0.18}
        />
        {/* 激活格逐格环 */}
        {Array.from(active).map((i, idx) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const r = easeOut(seg(f, 80 + idx * 3, 92 + idx * 3));
          if (r <= 0) return null;
          return (
            <rect
              key={'r' + i}
              x={M + 44 + col * pitch - 3}
              y={320 + row * pitch - 3}
              width={cell + 6}
              height={cell + 6}
              rx={5}
              fill="none"
              stroke={ORANGE}
              strokeWidth={2}
              opacity={r * 0.95}
            />
          );
        })}
      </svg>

      {/* 右侧 4.3% 结论 */}
      <div style={{ position: 'absolute', left: 1240, top: 360, width: 2, height: 240, background: WHITE, opacity: 0.18 }} />
      <Label x={1280} y={380} text={`${pct}%`} size={96} color={ORANGE} weight={800} font={EN} opacity={easeOut(seg(f, 96, 116))} />
      <Label x={1280} y={496} text="的参数参与本次计算" size={22} color={LIGHT} weight={600} opacity={easeOut(seg(f, 110, 130))} />
      <Label x={1280} y={532} text="17 / 400 · 1 格 = 1B" size={18} color={LIGHT} weight={400} font={SERIF} opacity={easeOut(seg(f, 116, 136))} />

      {/* PPT 页脚：36px 边距 */}
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
