import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { T, FONT, MONO, W, H, easeOut, seg, clamp01 } from './llama/theme';
import { Frame, Sub, Headline, Kicker } from './llama/ui';

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
}> = ({ x, y, text, size = 28, color = T.ink, weight = 800, anchor = 'start', mono = false, opacity = 1 }) => {
  const transform = anchor === 'middle' ? 'translateX(-50%)' : anchor === 'end' ? 'translateX(-100%)' : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform,
        fontFamily: mono ? MONO : FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        opacity,
        whiteSpace: 'nowrap',
        lineHeight: 1.25,
      }}
    >
      {text}
    </div>
  );
};

const fmt = (n: number) => n.toLocaleString('en-US');

/** Shot 01 样片：400B vs 17B，10s，固定机位，零运镜 */
export const Llama4MoESample: React.FC = () => {
  const f = useCurrentFrame();
  const cols = 28;
  const rows = 10;
  const pitch = 40;
  const active = new Set([37, 55, 77, 102, 129, 166, 188, 210, 241, 255, 280, 300, 310, 330]);

  const dim = easeOut(seg(f, 80, 120));
  const pulse = 1 + 0.06 * Math.sin(Math.PI * clamp01((f - 80) / 30));
  const n400 = Math.round(400_000_000_000 * easeOut(seg(f, 20, 60)));
  const n17 = Math.round(17_000_000_000 * easeOut(seg(f, 120, 160)));
  const boxIn = easeOut(seg(f, 136, 156));
  // 两次柔光晕脉冲：17B 出现时一次、高亮框出现时一次（一次性强调，不改格子大小）
  const glow = Math.min(1, Math.sin(Math.PI * clamp01((f - 132) / 24)) + Math.sin(Math.PI * clamp01((f - 196) / 24)));

  return (
    <AbsoluteFill>
      <Frame section="01 · 悬念" index="01 / 18" progress={f / 168}>
        <Kicker f={f} text="LLAMA 4 MAVERICK · MIXTURE OF EXPERTS" />
        <Headline f={f} text="400B 总参数，为什么每次只激活 17B？" size={52} />
        <Label x={120} y={286} text={fmt(n400)} size={46} color={T.ink} mono />
        <Label x={126} y={340} text="总参数 · Parameters" size={22} color={T.muted} weight={700} />
        <Label x={1800} y={286} text={fmt(n17)} size={46} color={T.red} mono anchor="end" opacity={easeOut(seg(f, 120, 140))} />
        <Label x={1800} y={340} text="每次激活 · Active" size={22} color={T.red} weight={700} anchor="end" opacity={easeOut(seg(f, 128, 148))} />
        <Label x={1800} y={372} text="≈ 4.25% 的参数" size={20} color={T.muted} weight={700} anchor="end" opacity={easeOut(seg(f, 140, 160))} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {/* 柔光晕：在格子后面，只围绕激活格，不改变格子大小 */}
          {Array.from({ length: cols * rows }).map((_, i) => {
            if (!active.has(i)) return null;
            const col = i % cols;
            const row = Math.floor(i / cols);
            return (
              <rect
                key={'g' + i}
                x={120 + col * pitch - 8}
                y={380 + row * pitch - 8}
                width={46}
                height={46}
                rx={11}
                fill={T.red}
                opacity={0.24 * glow}
              />
            );
          })}
          {Array.from({ length: cols * rows }).map((_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const on = active.has(i);
            const e = easeOut(seg(f, 20 + (col + row) * 2, 32 + (col + row) * 2));
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
                transform={on ? `translate(${(1 - pulse) * 9} ${(1 - pulse) * 9}) scale(${pulse})` : undefined}
              />
            );
          })}
          <rect
            x={120 + 9 * pitch - 6}
            y={380 + 1 * pitch - 6}
            width={42}
            height={42}
            rx={9}
            fill="none"
            stroke={T.red}
            strokeWidth={3}
            opacity={boxIn}
          />
        </svg>
        <Label x={1268} y={700} text="红色 = 本次激活" size={22} color={T.red} weight={700} opacity={easeOut(seg(f, 136, 156))} />
      </Frame>
      <Sub f={f} lines={['400B 总参数，为什么每次只激活 17B？']} />
    </AbsoluteFill>
  );
};
