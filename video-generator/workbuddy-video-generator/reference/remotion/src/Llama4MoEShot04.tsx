import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SlideFrame, WHITE, LIGHT, MUTED, GOLD, GOLD_L, CYAN, CN, DISPLAY } from './llama4moe/Slide';
import { NODES, GAS, LINKS, project3 } from './llama4moe/nebula';
import { easeOut, seg, clamp01 } from './llama/theme';

const DUR = 240;
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const TY = 830;
const TX0 = 180;
const TX1 = 1740;
const Y23 = 460;
const Y24 = 940;
const Y25 = 1420;

const STACK_X = 680;
const STACK_W = 340;
const STACK_TOP = 300;
const BAR_H = 20;
const BAR_GAP = 12;
const LAYERS = 12;
const PITCH = BAR_H + BAR_GAP;

export const Llama4MoEShot04: React.FC = () => {
  const f = useCurrentFrame();

  const rotY = 0.7 + 0.5 * (f / DUR);
  const nebK = 0.78 + 0.1 * (f / DUR);
  const proj = NODES.map((n) => project3(n, 2.9, rotY, 0.04, 860, 520, nebK));
  const gasProj = GAS.map((g) => project3(g, 2.9, rotY, 0.04, 860, 520, nebK));
  const gasFill = ['url(#gasBlue)', 'url(#gasTeal)', 'url(#gasPurple)'];
  const DIM = 0.22;

  const tlT = eio(seg(f, 0, 24));
  const moveT = eio(seg(f, 20, 42)); // 金色从 2023 移到 2024
  const node24 = easeOut(seg(f, 28, 50));
  const titleT = easeOut(seg(f, 26, 42));
  const metaT = easeOut(seg(f, 38, 50));
  const bigT = easeOut(seg(f, 46, 64));
  const denseT = easeOut(seg(f, 58, 72));
  const barIn = (i: number) => easeOut(seg(f, 72 + i * 3, 86 + i * 3));
  const tokenT = eio(seg(f, 110, 186));
  const allT = easeOut(seg(f, 186, 206));
  const capT = easeOut(seg(f, 190, 210));
  const statT = easeOut(seg(f, 96, 116));
  const noteT = easeOut(seg(f, 200, 220));

  const tokenY = STACK_TOP - 26 + tokenT * (LAYERS * PITCH + 52);

  return (
    <SlideFrame kicker="04 · 稠密" title="2024：把稠密 Transformer 推到 4050 亿" page="04 / 18">
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="gasBlue">
            <stop offset="0%" stopColor="#2E6FA8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2E6FA8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gasTeal">
            <stop offset="0%" stopColor="#2A8C7A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2A8C7A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gasPurple">
            <stop offset="0%" stopColor="#5A3A7A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5A3A7A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="goldHalo">
            <stop offset="0%" stopColor={GOLD_L} stopOpacity="0.95" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="62%">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.78" />
          </radialGradient>
        </defs>

        {GAS.map((g, i) => {
          const a = gasProj[i];
          if (!a) return null;
          return <circle key={'g' + i} cx={a.x} cy={a.y} r={Math.min(420, g.r * a.scale * 560)} fill={gasFill[g.c]} opacity={g.o * 0.55 * DIM} />;
        })}
        {LINKS.map(([i, j], n) => {
          const a = proj[i];
          const b = proj[j];
          if (!a || !b) return null;
          return <line key={'l' + n} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CYAN} strokeWidth={0.5} opacity={0.08 * DIM} />;
        })}
        {NODES.map((nd, i) => {
          const a = proj[i];
          if (!a) return null;
          return <circle key={'n' + i} cx={a.x} cy={a.y} r={Math.min(16, nd.s * a.scale)} fill={WHITE} opacity={0.45 * DIM} />;
        })}

        <rect width={1920} height={1080} fill="url(#vignette)" />
      </svg>

      {/* 时间轴 */}
      <div style={{ position: 'absolute', left: TX0, top: TY, width: TX1 - TX0, height: 2, background: 'rgba(255,255,255,0.13)' }} />
      <div style={{ position: 'absolute', left: TX0, top: TY, width: (TX1 - TX0) * tlT, height: 2, background: 'rgba(255,255,255,0.3)' }} />
      <div style={{ position: 'absolute', left: TX0, top: TY - 1, width: (Y23 - TX0 + (Y24 - Y23) * moveT) * tlT, height: 4, background: GOLD, borderRadius: 2 }} />

      {[Y23, Y24, Y25].map((x, i) => {
        const active = i === 1 ? moveT : i === 0 ? 1 - moveT * 0.75 : 0.35;
        return (
          <React.Fragment key={'y' + i}>
            <div style={{ position: 'absolute', left: x, top: TY - 7, width: 1, height: 14, background: i === 1 ? GOLD : 'rgba(255,255,255,0.4)', opacity: active * tlT }} />
            <div
              style={{
                position: 'absolute',
                left: x,
                top: TY + 22,
                transform: 'translateX(-50%)',
                fontFamily: DISPLAY,
                fontSize: 26,
                fontWeight: 700,
                color: i === 1 ? GOLD : LIGHT,
                opacity: Math.max(0.35, active) * tlT,
                letterSpacing: 2,
              }}
            >
              {2023 + i}
            </div>
            {i === 1 && node24 > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: x - 9,
                  top: TY - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: GOLD,
                  transform: `scale(${node24})`,
                  boxShadow: `0 0 ${20 * node24}px rgba(245,194,107,${0.65 * node24})`,
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* 左：Llama 3.1 卡片 */}
      <div style={{ position: 'absolute', left: 150, top: 286, opacity: titleT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 20, color: GOLD, letterSpacing: 5 }}>2024.07</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 76, fontWeight: 700, color: WHITE, lineHeight: 1.06, marginTop: 4 }}>
          Llama 3.1
        </div>
      </div>
      <div style={{ position: 'absolute', left: 152, top: 392, opacity: metaT, fontFamily: CN, fontSize: 22, color: LIGHT, letterSpacing: 1 }}>
        Meta · 开放权重
      </div>
      <div style={{ position: 'absolute', left: 152, top: 444, width: 420 * metaT, height: 1, background: 'rgba(255,255,255,0.18)' }} />
      <div style={{ position: 'absolute', left: 152, top: 468, opacity: bigT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 96, fontWeight: 700, color: GOLD, lineHeight: 1 }}>405B</div>
        <div style={{ fontFamily: CN, fontSize: 20, color: LIGHT, marginTop: 8, letterSpacing: 1 }}>参数量，全部同时参与计算</div>
      </div>
      <div style={{ position: 'absolute', left: 152, top: 626, opacity: denseT, fontFamily: CN, fontSize: 24, color: WHITE, letterSpacing: 1 }}>
        稠密 Transformer
        <span style={{ color: MUTED, fontSize: 18, marginLeft: 10 }}>Dense</span>
      </div>

      {/* 中：层堆叠 + token 穿过 */}
      <div style={{ position: 'absolute', left: STACK_X - 64, top: STACK_TOP - 44, opacity: titleT, fontFamily: CN, fontSize: 16, color: MUTED, letterSpacing: 2 }}>
        126 层 Transformer · 图示 12 条
      </div>
      {Array.from({ length: LAYERS }).map((_, i) => {
        const e = barIn(i);
        const y = STACK_TOP + i * PITCH;
        const passed = clamp01((tokenY - (y + BAR_H / 2)) / 18);
        const lit = Math.max(passed, allT);
        return (
          <div
            key={'b' + i}
            style={{
              position: 'absolute',
              left: STACK_X,
              top: y,
              width: STACK_W * (0.55 + 0.45 * e),
              height: BAR_H,
              borderRadius: 4,
              background: `rgba(255,255,255,${0.07 + 0.5 * lit})`,
              border: `1px solid rgba(255,255,255,${0.08 + 0.16 * lit})`,
              opacity: e,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
      {/* token 光点 */}
      {tokenT > 0 && tokenT < 1 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: STACK_X + STACK_W / 2 - 40,
              top: tokenY - 40,
              width: 80,
              height: 80,
              borderRadius: 40,
              background: 'radial-gradient(circle closest-side, rgba(245,194,107,0.42) 0%, rgba(245,194,107,0) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: STACK_X + STACK_W / 2 - 7,
              top: tokenY - 7,
              width: 14,
              height: 14,
              borderRadius: 7,
              background: GOLD,
            }}
          />
        </>
      )}
      <div style={{ position: 'absolute', left: STACK_X, top: STACK_TOP + LAYERS * PITCH + 14, opacity: capT, fontFamily: CN, fontSize: 22, color: GOLD, letterSpacing: 1 }}>
        每个 token 都要过全部 126 层
      </div>

      {/* 右：两个硬指标 */}
      <div style={{ position: 'absolute', left: 1180, top: 300, opacity: statT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 58, fontWeight: 700, color: WHITE, lineHeight: 1 }}>15T</div>
        <div style={{ fontFamily: CN, fontSize: 18, color: LIGHT, marginTop: 6, letterSpacing: 1 }}>训练 token</div>
      </div>
      <div style={{ position: 'absolute', left: 1180, top: 420, opacity: statT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 58, fontWeight: 700, color: WHITE, lineHeight: 1 }}>128K</div>
        <div style={{ fontFamily: CN, fontSize: 18, color: LIGHT, marginTop: 6, letterSpacing: 1 }}>上下文窗口</div>
      </div>
      <div style={{ position: 'absolute', left: 1180, top: 556, width: 620, opacity: noteT, fontFamily: CN, fontSize: 19, color: MUTED, letterSpacing: 1, lineHeight: 1.6 }}>
        稠密的代价：参数一个不少地算一遍
        <br />
        计算量随参数量线性上涨
      </div>
    </SlideFrame>
  );
};
