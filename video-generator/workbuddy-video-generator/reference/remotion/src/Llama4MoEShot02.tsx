import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SlideFrame, WHITE, LIGHT, MUTED, GOLD, GOLD_L, CYAN, CN, DISPLAY } from './llama4moe/Slide';
import { NODES, GAS, LINKS, GOLD_IDX, project3 } from './llama4moe/nebula';
import { easeOut, seg, clamp01 } from './llama/theme';

const DUR = 240;

/** 与 Shot 01 结尾完全一致：camZ 2.589 / rotY 0.748 / rotX 0.033 / 中心 (760,520) */
const CAM0 = 2.589;
const ROT0 = 0.748;
const ROTX0 = 0.033;

const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 金色 → 灰暗（t=1 全金，t=0 全灰） */
const mixGold = (t: number) => {
  const c = [110 + 135 * t, 122 + 72 * t, 136 - 29 * t];
  return `rgb(${c.map((v) => Math.round(v)).join(',')})`;
};

const NX = 1000; // 右栏起点
const BW = 620; // 条形总长 = 400B（1B = 1.55px）
const SEG = (BW * 17) / 400; // 17B ≈ 26.4px

export const Llama4MoEShot02: React.FC = () => {
  const f = useCurrentFrame();

  // 星云退到背景：整体缩小、左移、压暗（物体在动，不是镜头在动）
  const recede = seg(f, 0, 44);
  // 以为是压缩：云图被压成一团；实际是 MoE：恢复原尺寸
  const compT = eio(seg(f, 72, 116));
  const restT = eio(seg(f, 152, 198));
  const squeeze = Math.max(0.3, 1 - 0.62 * compT + 0.62 * restT);
  const k = (1 - 0.1 * easeOut(recede)) * squeeze;
  const cx = 760 - 60 * easeOut(recede);
  const dim = 1 - 0.48 * easeOut(recede);
  const rotY = ROT0 + 0.2 * (f / DUR);
  // 金点亮度：开场金 → 压缩期间变灰 → MoE 出现后再次点亮
  const relight = seg(f, 152, 198);
  const goldT = clamp01(1 - seg(f, 10, 44) + relight);
  const pop = Math.sin(Math.PI * clamp01((relight - 0.55) / 0.45));
  const coreO = 1 - seg(f, 0, 26);

  const proj = NODES.map((n) => project3(n, CAM0, rotY, ROTX0, cx, 520, k));
  const gasProj = GAS.map((g) => project3(g, CAM0, rotY, ROTX0, cx, 520, k));
  // 与 Shot 01 完全一致的景深归一化，保证切镜时金点大小无缝
  const gScales = GOLD_IDX.map((i) => proj[i]?.scale ?? 0);
  const gMin = Math.min(...gScales);
  const gMax = Math.max(...gScales);
  const depOf = (sc: number) => (gMax - gMin < 1e-3 ? 0.5 : (sc - gMin) / (gMax - gMin));
  const gasFill = ['url(#gasBlue)', 'url(#gasTeal)', 'url(#gasPurple)'];

  // 左：MoE 字标
  const moeIn = easeOut(seg(f, 8, 32));
  const subIn = easeOut(seg(f, 32, 50));
  const cnIn = easeOut(seg(f, 44, 62));

  // 右：两行对比
  const rowAIn = easeOut(seg(f, 64, 84));
  const shrink = eio(seg(f, 84, 128));
  const dimT = easeOut(seg(f, 96, 124)); // 读完 → 变灰 + 划线
  const glow = easeOut(seg(f, 198, 224)); // MoE 组完全出现后发亮
  const rowBIn = easeOut(seg(f, 150, 170));
  const fillB = eio(seg(f, 170, 200));
  const segIn = easeOut(seg(f, 200, 216));

  const barAW = BW - (BW - SEG) * shrink;
  const barBW = BW * fillB;

  return (
    <SlideFrame kicker="02 · 概念" title="不是压缩，是换一种用法" page="02 / 18">
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
        </defs>

        {/* 星云（背景） */}
        {GAS.map((g, i) => {
          const a = gasProj[i];
          if (!a) return null;
          const rad = Math.min(520, g.r * a.scale * 560);
          return (
            <circle
              key={'g' + i}
              cx={a.x}
              cy={a.y}
              r={rad}
              fill={gasFill[g.c]}
              opacity={g.o * Math.min(1, 0.35 + a.scale * 0.5) * (0.35 + 0.65 * dim)}
            />
          );
        })}
        {LINKS.map(([i, j], n) => {
          const a = proj[i];
          const b = proj[j];
          if (!a || !b) return null;
          return (
            <line
              key={'l' + n}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CYAN}
              strokeWidth={0.55}
              opacity={(0.05 + 0.14 * Math.min(1, 0.4 + a.scale * 0.3)) * (0.3 + 0.7 * dim)}
            />
          );
        })}
        {NODES.map((nd, i) => {
          const a = proj[i];
          if (!a) return null;
          const r = Math.min(26, nd.s * a.scale * 1.1);
          const o = Math.min(0.9, 0.1 + 0.55 * (a.scale - 0.3)) * dim;
          return <circle key={'n' + i} cx={a.x} cy={a.y} r={r} fill={WHITE} opacity={o} />;
        })}
        {/* 17 个金点：开场仍亮，随星云一起退场 */}
        {GOLD_IDX.map((idx, i) => {
          const a = proj[idx];
          if (!a) return null;
          const dep = depOf(a.scale);
          const rr = 3.0 + 4.0 * dep;
          const haloO = (0.22 + 0.3 * dep) * (0.35 + 0.65 * goldT) * (1 + 0.5 * pop);
          return (
            <React.Fragment key={'gd' + i}>
              <circle cx={a.x} cy={a.y} r={10 + 16 * dep + 14 * pop} fill="url(#goldHalo)" opacity={Math.min(1, haloO)} />
              <circle
                cx={a.x}
                cy={a.y}
                r={rr + 1.6 * pop}
                fill={mixGold(goldT)}
                opacity={(0.75 + 0.25 * dep) * (0.55 + 0.45 * goldT)}
              />
            </React.Fragment>
          );
        })}

        {/* 承接 Shot 01 结尾的“激活核心”，随开场淡出，保证切镜无缝 */}
        {coreO > 0 && (
          <>
            <circle cx={cx} cy={520} r={30.6} fill="url(#coreGlow)" opacity={0.7 * coreO} />
            <circle cx={cx} cy={520} r={4.6} fill={WHITE} opacity={0.95 * coreO} />
            <text
              x={cx}
              y={529}
              textAnchor="middle"
              fontFamily={CN}
              fontSize={13}
              fontWeight={700}
              fill={LIGHT}
              opacity={0.85 * coreO}
            >
              激活
            </text>
          </>
        )}

        <rect width={1920} height={1080} fill="url(#vignette)" />
      </svg>

      {/* 左：MoE 字标 */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 324 + 18 * (1 - moeIn),
          opacity: moeIn,
          fontFamily: DISPLAY,
          fontSize: 300,
          fontWeight: 700,
          color: WHITE,
          lineHeight: 0.9,
          letterSpacing: 4,
        }}
      >
        MoE
      </div>
      <div
        style={{
          position: 'absolute',
          left: 126,
          top: 632,
          opacity: subIn,
          fontFamily: DISPLAY,
          fontSize: 30,
          color: LIGHT,
          letterSpacing: 10,
        }}
      >
        MIXTURE OF EXPERTS
      </div>
      <div
        style={{
          position: 'absolute',
          left: 126,
          top: 676,
          opacity: cnIn,
          fontFamily: CN,
          fontSize: 46,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: 6,
        }}
      >
        混合专家
      </div>

      {/* 右：以为是压缩（先白，读完变灰，同时划线） */}
      <div style={{ position: 'absolute', left: NX, top: 344, opacity: rowAIn * (1 - 0.58 * dimT) }}>
        <div style={{ fontFamily: CN, fontSize: 32, fontWeight: 700, color: WHITE, letterSpacing: 2 }}>以为是压缩</div>
        <div style={{ position: 'absolute', left: -2, top: 19, width: 172 * dimT, height: 2, background: MUTED, opacity: 0.95 }} />
      </div>
      <div style={{ position: 'absolute', left: NX, top: 400, opacity: rowAIn }}>
        <div style={{ width: BW, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.10)' }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: barAW,
            height: 16,
            borderRadius: 8,
            background: `rgba(255,255,255,${0.72 - 0.34 * dimT})`,
          }}
        />
      </div>
      <div style={{ position: 'absolute', left: NX + BW + 12, top: 394, opacity: rowAIn * (1 - 0.35 * dimT), fontFamily: DISPLAY, fontSize: 18, color: MUTED }}>400B</div>
      <div style={{ position: 'absolute', left: NX, top: 428, opacity: rowAIn * (1 - 0.5 * dimT), fontFamily: CN, fontSize: 22, color: LIGHT }}>
        把 400B 压成 17B —— 模型本身变小
      </div>

      {/* 右：实际是 MoE（完全出现后发亮） */}
      <div
        style={{
          position: 'absolute',
          left: NX,
          top: 536,
          opacity: rowBIn,
          fontFamily: CN,
          fontSize: 32,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: 2,
          textShadow: `0 0 ${13 * glow}px rgba(245,194,107,${0.5 * glow})`,
        }}
      >
        实际是 MoE
      </div>
      <div style={{ position: 'absolute', left: NX, top: 592, opacity: rowBIn }}>
        <div style={{ width: BW, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.10)' }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: barBW,
            height: 16,
            borderRadius: 8,
            background: `rgba(255,255,255,${0.32 + 0.16 * glow})`,
          }}
        />
        {/* 17B 金段：与总长的比例严格 17/400 */}
        {segIn > 0 && (
          <>
            <div
              style={{
                position: 'absolute',
                left: -4,
                top: -4,
                width: Math.max(SEG * segIn, 2) + 8,
                height: 24,
                borderRadius: 12,
                background: GOLD,
                opacity: (0.2 + 0.16 * glow) * segIn,
                filter: `blur(${2 + 2 * glow}px)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: Math.max(SEG * segIn, 2),
                height: 16,
                borderRadius: 8,
                background: GOLD,
              }}
            />
          </>
        )}
      </div>
      <div style={{ position: 'absolute', left: NX + BW + 12, top: 586, opacity: rowBIn, fontFamily: DISPLAY, fontSize: 18, color: MUTED }}>400B</div>
      <div
        style={{
          position: 'absolute',
          left: NX,
          top: 620,
          opacity: rowBIn,
          fontFamily: CN,
          fontSize: 22,
          color: GOLD,
          textShadow: `0 0 ${10 * glow}px rgba(245,194,107,${0.35 * glow})`,
        }}
      >
        400B 一个没少 —— 每次只算 17B（4.25%）
      </div>
      {/* 底部结论 */}
      <div style={{ position: 'absolute', left: 120, top: 846, width: 4, height: 34, background: GOLD, opacity: easeOut(seg(f, 214, 232)) }} />
      <div
        style={{
          position: 'absolute',
          left: 142,
          top: 842,
          opacity: easeOut(seg(f, 214, 232)),
          fontFamily: CN,
          fontSize: 26,
          color: LIGHT,
          letterSpacing: 1,
        }}
      >
        参数总量不变，改变的是「每次用多少」
      </div>
    </SlideFrame>
  );
};
