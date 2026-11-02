import React from 'react';
import { AbsoluteFill } from 'remotion';
import { T, FONT, MONO, W, H } from './llama/theme';
import { Frame } from './llama/ui';

/** Llama 4 MoE 横版封面：1920×1080，纯代码渲染 */
export const Llama4MoECover: React.FC = () => {
  const cols = 28;
  const rows = 10;
  const pitch = 40;
  const active = new Set([37, 55, 77, 102, 129, 166, 188, 210, 241, 255, 280, 300, 310, 330]);
  return (
    <AbsoluteFill>
      <Frame>
        <div style={{ position: 'absolute', left: 120, top: 130, fontFamily: FONT, fontSize: 26, fontWeight: 800, color: T.red, letterSpacing: 4 }}>
          LLAMA 4 · MIXTURE OF EXPERTS
        </div>
        <div style={{ position: 'absolute', left: 118, top: 186, fontFamily: FONT, fontSize: 124, fontWeight: 900, color: T.ink, letterSpacing: -3 }}>
          Llama 4 MoE
        </div>
        <div style={{ position: 'absolute', left: 126, top: 352, fontFamily: FONT, fontSize: 44, fontWeight: 700, color: T.muted }}>
          400B 总参数，每次只激活 17B
        </div>
        <div style={{ position: 'absolute', left: 128, top: 432, width: 240, height: 8, background: T.red }} />
        <div style={{ position: 'absolute', right: 120, top: 210, textAlign: 'right' }}>
          <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 800, color: T.red, lineHeight: 1 }}>17B</div>
          <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: T.muted, marginTop: 8 }}>每次激活</div>
          <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 800, color: T.ink, marginTop: 18 }}>400B</div>
          <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: T.muted, marginTop: 4 }}>总参数</div>
        </div>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: cols * rows }).map((_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const on = active.has(i);
            return (
              <rect
                key={i}
                x={120 + col * pitch}
                y={560 + row * pitch}
                width={30}
                height={30}
                rx={6}
                fill={on ? T.red : T.ink}
                opacity={on ? 1 : 0.13}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', left: 120, top: 1000, fontFamily: MONO, fontSize: 24, fontWeight: 600, color: T.muted, letterSpacing: 2 }}>
          SCALING CAPACITY WITHOUT ACTIVATING EVERYTHING
        </div>
      </Frame>
    </AbsoluteFill>
  );
};
