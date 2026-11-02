import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SlideFrame, WHITE, LIGHT, MUTED, GOLD, GOLD_L, CYAN, CN, DISPLAY } from './llama4moe/Slide';
import { NODES, GAS, LINKS, project3 } from './llama4moe/nebula';
import { easeOut, seg } from './llama/theme';

const DUR = 192;
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const TY = 830; // 时间轴 y
const TX0 = 180;
const TX1 = 1740;
const NODE_X = 460;
const YEAR_X = [NODE_X, 940, 1420];

// 面积正比：r ∝ √参数。175B → 150px，13B → 40.9px（比例 13/175 = 7.4%）
const R175 = 150;
const R13 = R175 * Math.sqrt(13 / 175);
const CX = 1400;
const CY = 560;

export const Llama4MoEShot03: React.FC = () => {
  const f = useCurrentFrame();

  const tlT = eio(seg(f, 0, 26));
  const nodeT = easeOut(seg(f, 20, 42));
  const titleT = easeOut(seg(f, 30, 44));
  const metaT = easeOut(seg(f, 42, 54));
  const sizeT = easeOut(seg(f, 50, 64));
  const tokenT = easeOut(seg(f, 60, 74));
  const capT = easeOut(seg(f, 78, 94));
  const ringT = eio(seg(f, 96, 136));
  const dotT = easeOut(seg(f, 132, 156));
  const legT = easeOut(seg(f, 138, 158));

  // 极暗星云做底纹
  // 星云全程都在动：持续旋转 + 缓慢扩张（物体在动，不是镜头在动）
  const rotY = 0.55 + 0.62 * (f / DUR);
  const nebK = 0.9 + 0.14 * (f / DUR);
  const proj = NODES.map((n) => project3(n, 2.9, rotY, 0.04, 900, 520, nebK));
  const gasProj = GAS.map((g) => project3(g, 2.9, rotY, 0.04, 900, 520, nebK));
  const gasFill = ['url(#gasBlue)', 'url(#gasTeal)', 'url(#gasPurple)'];
  const DIM = 0.46;

  return (
    <SlideFrame kicker="03 · 起点" title="2023：用更小的模型，喂更多的数据" page="03 / 18">
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
          return (
            <circle
              key={'g' + i}
              cx={a.x}
              cy={a.y}
              r={Math.min(460, g.r * a.scale * 560)}
              fill={gasFill[g.c]}
              opacity={g.o * 0.55 * DIM}
            />
          );
        })}
        {LINKS.map(([i, j], n) => {
          const a = proj[i];
          const b = proj[j];
          if (!a || !b) return null;
          return <line key={'l' + n} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CYAN} strokeWidth={0.5} opacity={0.09 * DIM} />;
        })}
        {NODES.map((nd, i) => {
          const a = proj[i];
          if (!a) return null;
          return <circle key={'n' + i} cx={a.x} cy={a.y} r={Math.min(18, nd.s * a.scale)} fill={WHITE} opacity={0.5 * DIM} />;
        })}

        <rect width={1920} height={1080} fill="url(#vignette)" />
      </svg>

      {/* 时间轴 */}
      <div style={{ position: 'absolute', left: TX0, top: TY, width: TX1 - TX0, height: 2, background: 'rgba(255,255,255,0.13)' }} />
      <div
        style={{
          position: 'absolute',
          left: TX0,
          top: TY,
          width: (TX1 - TX0) * tlT,
          height: 2,
          background: 'rgba(255,255,255,0.3)',
        }}
      />
      <div style={{ position: 'absolute', left: TX0, top: TY - 1, width: (NODE_X - TX0) * tlT, height: 4, background: GOLD, borderRadius: 2 }} />

      {/* 年份刻度 */}
      {YEAR_X.map((x, i) => {
        const on = i === 0;
        // 未来年份逐个点亮：先 2024 再 2025，给片尾一个“故事继续”的动作
        const fut = easeOut(seg(f, 156 + (i - 1) * 16, 176 + (i - 1) * 16));
        const o = on ? 1 : fut * 0.6;
        return (
          <React.Fragment key={'y' + i}>
            {!on && fut > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: x - 5,
                  top: TY - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: LIGHT,
                  opacity: 0.7 * fut,
                  transform: `scale(${fut})`,
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                left: x,
                top: TY - 7,
                width: 1,
                height: 14,
                background: on ? GOLD : 'rgba(255,255,255,0.4)',
                opacity: on ? tlT : o,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: x,
                top: TY + 22,
                transform: 'translateX(-50%)',
                fontFamily: DISPLAY,
                fontSize: 26,
                fontWeight: 700,
                color: on ? GOLD : LIGHT,
                opacity: on ? tlT : o,
                letterSpacing: 2,
              }}
            >
              {2023 + i}
            </div>
          </React.Fragment>
        );
      })}

      {/* 2023 节点 */}
      {nodeT > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: NODE_X - 9,
              top: TY - 9,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: GOLD,
              transform: `scale(${nodeT})`,
              boxShadow: `0 0 ${18 * nodeT}px rgba(245,194,107,${0.6 * nodeT})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: NODE_X - 0.5,
              top: TY - 76,
              width: 1,
              height: 76 * nodeT,
              background: `linear-gradient(180deg, rgba(245,194,107,0) 0%, rgba(245,194,107,${0.5 * nodeT}) 100%)`,
            }}
          />
        </>
      )}

      {/* 节点落地时的一圈金色扩散（起点标记） */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {(() => {
          const t = seg(f, 26, 62);
          if (t <= 0 || t >= 1) return null;
          return (
            <>
              <circle cx={NODE_X} cy={TY} r={12 + 190 * easeOut(t)} fill="none" stroke={GOLD} strokeWidth={2} opacity={0.5 * (1 - t)} />
              <circle cx={NODE_X} cy={TY} r={12 + 120 * easeOut(t)} fill="none" stroke={GOLD_L} strokeWidth={1} opacity={0.3 * (1 - t)} />
            </>
          );
        })()}
      </svg>

      {/* 左：LLaMA 1 卡片 */}
      <div style={{ position: 'absolute', left: 150, top: 300, opacity: titleT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 20, color: GOLD, letterSpacing: 5 }}>2023.02</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 84, fontWeight: 700, color: WHITE, lineHeight: 1.05, marginTop: 4 }}>
          LLaMA 1
        </div>
      </div>
      <div style={{ position: 'absolute', left: 152, top: 412, opacity: metaT, fontFamily: CN, fontSize: 22, color: LIGHT, letterSpacing: 1 }}>
        Meta 发布 · 开放权重
      </div>
      <div style={{ position: 'absolute', left: 152, top: 470, width: 430 * metaT, height: 1, background: 'rgba(255,255,255,0.18)' }} />
      <div style={{ position: 'absolute', left: 152, top: 494, opacity: sizeT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, color: WHITE, letterSpacing: 1 }}>
          7B · 13B · 33B · 65B
        </div>
        <div style={{ fontFamily: CN, fontSize: 20, color: MUTED, marginTop: 6, letterSpacing: 1 }}>四个尺寸，最小只有 70 亿</div>
      </div>
      <div style={{ position: 'absolute', left: 152, top: 598, opacity: tokenT }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 700, color: GOLD }}>1.0 – 1.4T</div>
        <div style={{ fontFamily: CN, fontSize: 18, color: LIGHT, marginTop: 4, letterSpacing: 1 }}>训练 token = 模型读过的文字量</div>
        <div style={{ fontFamily: CN, fontSize: 16, color: MUTED, marginTop: 3, letterSpacing: 1 }}>1 token ≈ 0.75 个英文词 · 约为 GPT-3 的 3–4 倍</div>
      </div>

      {/* 右：13B vs 175B 同心圆 */}
      <div style={{ position: 'absolute', left: 1040, top: 330, width: 720, opacity: capT }}>
        <div style={{ fontFamily: CN, fontSize: 28, color: LIGHT, letterSpacing: 1 }}>
          <span style={{ color: GOLD, fontWeight: 700 }}>13B</span> 在多数基准上超过 GPT-3 175B
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {ringT > 0 && (
          <circle cx={CX} cy={CY} r={R175 * ringT} fill="none" stroke={WHITE} strokeWidth={2.6} opacity={0.5 * ringT} />
        )}
        {dotT > 0 && (
          <>
            <circle cx={CX} cy={CY} r={R13 * dotT * 3.2} fill="url(#goldHalo)" opacity={0.24 * dotT} />
            <circle cx={CX} cy={CY} r={R13 * dotT} fill={GOLD} opacity={0.92 * dotT} />
          </>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: CX - 260,
          top: CY + R175 + 24,
          width: 520,
          textAlign: 'center',
          opacity: legT,
          fontFamily: CN,
          fontSize: 20,
          color: LIGHT,
          letterSpacing: 1,
        }}
      >
        <span style={{ color: GOLD }}>● LLaMA-13B</span>
        <span style={{ margin: '0 22px', color: MUTED }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>○ GPT-3 175B</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: CX - 260,
          top: CY + R175 + 58,
          width: 520,
          textAlign: 'center',
          opacity: legT,
          fontFamily: CN,
          fontSize: 16,
          color: MUTED,
          letterSpacing: 1,
        }}
      >
        圆面积 = 参数量 · 13 / 175 = 7.4%（稠密：全部参数都参与）
      </div>

    </SlideFrame>
  );
};
