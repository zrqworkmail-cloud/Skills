import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { easeOut, seg, rise, clamp01 } from './llama/theme';

const NAVY = '#054686';
const DEEP = '#03325F';
const ORANGE = '#EE822F';
const WHITE = '#FFFFFF';
const LIGHT = '#A9C0D8';
const CN = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';
const EN = 'Arial, Helvetica, sans-serif';
const SERIF = '"Times New Roman", Times, serif';

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
}> = ({ x, y, text, size = 24, color = WHITE, weight = 700, font = CN, anchor = 'start', opacity = 1, spacing = 0, style }) => {
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

/** V3：V1 的构图/动作 + SDUFE 模板的深蓝/橙/白与字体，7s，零运镜 */
export const Llama4MoESampleV3: React.FC = () => {
  const f = useCurrentFrame();
  const cols = 28;
  const rows = 10;
  const pitch = 40;
  const active = new Set<number>();
  for (let r = 3; r <= 5; r++) for (let c = 8; c <= 11; c++) active.add(r * cols + c);

  const boxIn = easeOut(seg(f, 96, 120));
  const flash = Math.sin(Math.PI * clamp01((f - 80) / 24));
  const pct = (4.3 * easeOut(seg(f, 100, 130))).toFixed(1);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${DEEP} 100%)` }}>
      {/* 顶部细线 + 学院 logo（白） */}
      <div style={{ position: 'absolute', left: 120, top: 78, width: 1680, height: 2, background: WHITE, opacity: 0.45 }} />
      <Img
        src={staticFile('cai-logo.png')}
        style={{ position: 'absolute', right: 120, top: 26, width: 300, filter: 'brightness(0) invert(1)' }}
      />

      <Label x={120} y={110} text="01 · 悬念" size={24} color={LIGHT} weight={700} spacing={3} />
      <Label x={120} y={150} text="400B 总参数，为什么每次只激活 17B？" size={46} color={WHITE} weight={800} />

      {/* 数字对比 */}
      <div style={{ ...rise(f, 8, 20, 20) }}>
        <Label x={120} y={250} text="400B" size={96} color={WHITE} weight={800} font={EN} />
        <Label x={120} y={360} text="总参数 · Parameters" size={24} color={LIGHT} weight={600} />
      </div>
      <div style={{ ...rise(f, 16, 20, 20) }}>
        <Label x={1800} y={250} text="17B" size={96} color={ORANGE} weight={800} font={EN} anchor="end" />
        <Label x={1800} y={360} text="每次激活 · Active" size={24} color={ORANGE} weight={600} anchor="end" />
      </div>
      <div style={{ position: 'absolute', left: 960, top: 250, width: 2, height: 120, background: WHITE, opacity: 0.18 }} />

      {/* 参数阵列 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const on = active.has(i);
          const e = easeOut(seg(f, 20 + col * 3, 32 + col * 3));
          const s = 0.7 + 0.3 * e;
          const cs = on ? 1 + 0.12 * flash : 1;
          const w = 30 * s * cs;
          return (
            <rect
              key={i}
              x={120 + col * pitch + (30 - w) / 2}
              y={420 + row * pitch + (30 - w) / 2}
              width={w}
              height={w}
              rx={4}
              fill={on ? ORANGE : WHITE}
              opacity={on ? e : e * 0.16}
            />
          );
        })}
        {/* 激活簇逐格环 */}
        {Array.from(active).map((i, idx) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const r = easeOut(seg(f, 80 + idx * 3, 92 + idx * 3));
          if (r <= 0) return null;
          return (
            <rect
              key={'r' + i}
              x={120 + col * pitch - 5}
              y={420 + row * pitch - 5}
              width={40}
              height={40}
              rx={7}
              fill="none"
              stroke={ORANGE}
              strokeWidth={2.5}
              opacity={r * 0.95}
            />
          );
        })}
        {/* 激活簇框 */}
        <rect
          x={120 + 8 * pitch - 6}
          y={420 + 3 * pitch - 6}
          width={4 * pitch + 12}
          height={3 * pitch + 12}
          rx={6}
          fill="none"
          stroke={WHITE}
          strokeWidth={3}
          opacity={boxIn * 0.9}
        />
      </svg>

      {/* 右侧 4.3% 结论：计数到 4.3% */}
      <div style={{ position: 'absolute', left: 1280, top: 450, width: 2, height: 220, background: WHITE, opacity: 0.18 }} />
      <Label x={1320} y={470} text={`${pct}%`} size={100} color={ORANGE} weight={800} font={EN} opacity={easeOut(seg(f, 96, 116))} />
      <Label x={1320} y={590} text="的参数参与本次计算" size={24} color={LIGHT} weight={600} opacity={easeOut(seg(f, 110, 130))} />
      <Label x={1320} y={630} text="12 / 280" size={20} color={LIGHT} weight={400} font={SERIF} opacity={easeOut(seg(f, 116, 136))} />

      {/* 页脚 */}
      <div style={{ position: 'absolute', left: 120, top: 1008, width: 1680, height: 2, background: WHITE, opacity: 0.3 }} />
      <Label x={120} y={1030} text="2026/11/2" size={20} color={LIGHT} weight={400} font={SERIF} />
      <Label
        x={960}
        y={1030}
        text="SHANDONG UNIVERSITY OF FINANCE AND ECONOMICS"
        size={18}
        color={LIGHT}
        weight={400}
        font={SERIF}
        anchor="middle"
      />
      <Label x={1800} y={1030} text="01 / 18" size={20} color={LIGHT} weight={400} font={SERIF} anchor="end" />
    </AbsoluteFill>
  );
};
