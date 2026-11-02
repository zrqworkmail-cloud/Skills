import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SlideFrame } from './llama4moe/Slide';
import { NODES, GAS, LINKS, GOLD_IDX, project3 } from './llama4moe/nebula';
import { easeOut, seg, clamp01 } from './llama/theme';

const BLACK = '#03050A';
const WHITE = '#FFFFFF';
const LIGHT = '#A9C0D8';
const MUTED = '#6B7785';
const CYAN = '#7FD4E8';
const GOLD = '#F5C26B';
const GOLD_L = '#FFE2A8';
const CN = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';
const EN = 'Arial, Helvetica, sans-serif';
const DISPLAY = '"Agency FB", "Agency", sans-serif';
const SERIF = '"Times New Roman", Times, serif';
const M = 36;
const DUR = 240;
const FX = 760;
const FY = 520;

const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const camZAt = (fr: number) => {
  if (fr < 24) return 3.6 - 0.2 * (fr / 24);
  if (fr < 54) return 3.4 - 2.7 * eio((fr - 24) / 30);
  if (fr < 174) return 0.7 + 2.5 * ((fr - 54) / 120);
  return 3.2 - 0.62 * ((fr - 174) / (DUR - 174));
};

/** 标定帧：0:07（24fps → frame 168），此帧激活数必须正好 17B，金波恰好扫到最后一个金点 */
const CAL_FRAME = 168;
const R_MAX = (() => {
  const cz = camZAt(CAL_FRAME);
  const ry = 0.16 * Math.sin(CAL_FRAME / 70) + 0.3 * (CAL_FRAME / DUR);
  const rx = 0.07 * Math.sin(CAL_FRAME / 90);
  const ds = GOLD_IDX.map((i) => {
    const a = project3(NODES[i], cz, ry, rx, FX, FY);
    return a ? Math.hypot(a.x - FX, a.y - FY) : 0;
  });
  // +16：让最远那个点在 sweepT=1（第 168 帧）时 lit 正好到 1，与 17B 同帧完全点亮
  return Math.max(10, ...ds) + 16;
})();

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
}> = ({ x, y, text, size = 24, color = WHITE, weight = 700, font = CN, anchor = 'start', opacity = 1, spacing = 0 }) => {
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
      }}
    >
      {text}
    </div>
  );
};

/** V8：金波先出现→扫过时金点逐个点亮并保留光晕；计数器移到右上；星云左移 */
export const Llama4MoESampleV7: React.FC = () => {
  const f = useCurrentFrame();

  const camZ = camZAt(f);

  const rotY =
    0.16 * Math.sin(f / 70) +
    0.3 * (f / DUR) +
    (f >= 174 ? 0.5 * ((f - 174) / (DUR - 174)) : 0);
  const rotX = 0.07 * Math.sin(f / 90);

  const proj = NODES.map((n) => project3(n, camZ, rotY, rotX, FX, FY));
  const gasProj = GAS.map((g) => project3(g, camZ, rotY, rotX, FX, FY));
  // 17 个金点的景深逐帧归一化，保证“最近最大、最远最小”始终拉满对比
  const gScales = GOLD_IDX.map((i) => proj[i]?.scale ?? 0);
  const gMin = Math.min(...gScales);
  const gMax = Math.max(...gScales);
  const depOf = (sc: number) => (gMax - gMin < 1e-3 ? 0.5 : (sc - gMin) / (gMax - gMin));

  // 标定：0:07（frame 168）金波扫到最后一个金点，同一帧激活数正好到 17B
  const sweepT = seg(f, 54, CAL_FRAME);
  const waveR = 10 + R_MAX * sweepT;
  const afterT = seg(f, CAL_FRAME, DUR);
  const ringR = waveR + 320 * afterT;
  const ringT = seg(f, 54, DUR);
  const waveFade = Math.pow(Math.max(0, 1 - ringT), 1.6);
  const actT = sweepT;
  const act = Math.round(17_000_000_000 * actT);
  const gasFill = ['url(#gasBlue)', 'url(#gasTeal)', 'url(#gasPurple)'];
  const coreScale = Math.min(160, 12 * (2.2 / Math.max(0.35, camZ)));

  return (
    <SlideFrame kicker="01 · 开场" title="400B 参数，只激活 17B" page="01 / 18">
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
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#FFE2A8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F5C26B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="62%">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
          </radialGradient>
          <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#03050A" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#03050A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#03050A" stopOpacity="0" />
            <stop offset="100%" stopColor="#03050A" stopOpacity="0.92" />
          </linearGradient>
        </defs>

        {GAS.map((g, i) => {
          const a = gasProj[i];
          if (!a) return null;
          const rad = Math.min(520, g.r * a.scale * 560);
          return <circle key={'gas' + i} cx={a.x} cy={a.y} r={rad} fill={gasFill[g.c]} opacity={g.o * Math.min(1, 0.35 + a.scale * 0.5)} />;
        })}

        {LINKS.map(([i, j], k) => {
          const a = proj[i];
          const b = proj[j];
          if (!a || !b) return null;
          return (
            <line
              key={'l' + k}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CYAN}
              strokeWidth={0.55}
              opacity={0.05 + 0.14 * Math.min(1, 0.4 + a.scale * 0.3)}
            />
          );
        })}

        {NODES.map((n, i) => {
          const a = proj[i];
          if (!a) return null;
          const r = Math.min(26, n.s * a.scale * 1.1);
          const o = Math.min(0.9, 0.1 + 0.55 * (a.scale - 0.3));
          return <circle key={'n' + i} cx={a.x} cy={a.y} r={r} fill={WHITE} opacity={o} />;
        })}

        {/* 核心 */}
        <circle cx={FX} cy={FY} r={coreScale * 3} fill="url(#coreGlow)" opacity={0.7} />
        <circle cx={FX} cy={FY} r={Math.min(18, coreScale * 0.45)} fill={WHITE} opacity={0.95} />
        <text x={FX} y={FY + Math.min(40, coreScale * 0.9)} textAnchor="middle" fontFamily={CN} fontSize={13} fontWeight={700} fill={LIGHT} opacity={0.85}>
          激活
        </text>

        {/* 金色波：先出现，扩大过程中逐渐变淡，到最大时消失 */}
        {ringT > 0 && ringT < 1 && (
          <>
            <circle cx={FX} cy={FY} r={ringR} fill="none" stroke={GOLD} strokeWidth={30} opacity={0.06 * waveFade} />
            <circle cx={FX} cy={FY} r={ringR} fill="none" stroke={GOLD} strokeWidth={9} opacity={0.22 * waveFade} />
            <circle cx={FX} cy={FY} r={Math.max(1, ringR - 10)} fill="none" stroke={GOLD_L} strokeWidth={3} opacity={0.16 * waveFade} />
          </>
        )}

        {/* 17 金点：波扫过时点亮，之后保留光晕 */}
        {GOLD_IDX.map((idx, k) => {
          const a = proj[idx];
          if (!a) return null;
          const dist = Math.hypot(a.x - FX, a.y - FY);
          const lit = clamp01((waveR - dist) / 26);
          const fp = clamp01((waveR - dist) / 70);
          if (lit <= 0) return null;
          // 近大远小：景深逐帧归一化，最近 7px / 最远 3px
          const dep = depOf(a.scale);
          const rr = 3.0 + 4.0 * dep;
          return (
            <React.Fragment key={'g' + k}>
              <circle cx={a.x} cy={a.y} r={10 + 16 * dep} fill="url(#goldHalo)" opacity={(0.22 + 0.3 * dep) * lit} />
              <circle cx={a.x} cy={a.y} r={rr + 26 * easeOut(fp)} fill="url(#goldHalo)" opacity={(1 - fp) * 0.85} />
              <circle cx={a.x} cy={a.y} r={rr} fill={GOLD} opacity={lit * (0.75 + 0.25 * dep)} />
            </React.Fragment>
          );
        })}

        {/* 激活完成：核心金色辉光，与 0:07 计数到位同一刻 */}
        {(() => {
          const t = seg(f, 162, 196);
          if (t <= 0 || t >= 1) return null;
          return <circle cx={FX} cy={FY} r={20 + 420 * easeOut(t)} fill="url(#coreGlow)" opacity={0.45 * (1 - t)} />;
        })()}

        <rect width={1920} height={1080} fill="url(#vignette)" />
        <rect x={0} y={0} width={1920} height={150} fill="url(#topFade)" />
        <rect x={0} y={920} width={1920} height={160} fill="url(#bottomFade)" />
      </svg>


      {/* 右上：总参数 + 激活参数（无边框，直接压黑底） */}
      <div
        style={{
          position: 'absolute',
          right: M,
          top: 118,
          width: 660,
          textAlign: 'right',
          opacity: seg(f, 12, 28),
        }}
      >
        <div style={{ fontFamily: CN, fontSize: 16, color: LIGHT }}>总参数</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 72, fontWeight: 700, color: WHITE, fontVariantNumeric: 'tabular-nums' }}>400,000,000,000</div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', margin: '12px 0' }} />
        <div style={{ fontFamily: CN, fontSize: 16, color: GOLD }}>激活参数</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 54, fontWeight: 700, color: GOLD, fontVariantNumeric: 'tabular-nums' }}>
          {act.toLocaleString('en-US')}
        </div>
        <div style={{ fontFamily: CN, fontSize: 13, color: LIGHT, marginTop: 10, opacity: seg(f, 172, 190) }}>1 节点 = 1B 参数 · 17 个金点 = 17B 激活</div>
      </div>

      {/* 右侧中下：超大 4.25%，作为全片最强调的数字 */}
      <div
        style={{
          position: 'absolute',
          right: M,
          top: 596,
          textAlign: 'right',
          opacity: seg(f, 166, 184),
          transform: `translateY(${8 * (1 - seg(f, 166, 184))}px)`,
        }}
      >
        <div style={{ fontFamily: CN, fontSize: 18, color: LIGHT, letterSpacing: 4 }}>激活占比</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 172, fontWeight: 700, color: GOLD, lineHeight: 1.02, fontVariantNumeric: 'tabular-nums' }}>
          4.25%
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, color: LIGHT, marginTop: 6, letterSpacing: 1 }}>17B / 400B</div>
      </div>

    </SlideFrame>
  );
};
