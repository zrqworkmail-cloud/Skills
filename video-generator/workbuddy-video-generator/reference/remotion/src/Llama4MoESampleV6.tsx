import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
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
const SERIF = '"Times New Roman", Times, serif';
const M = 36;
const DUR = 288;

type N3 = { x: number; y: number; z: number; s: number };

/** 3D 斐波那契球：320 个神经元节点 */
const NODES: N3[] = (() => {
  const n = 320;
  const out: N3[] = [];
  const ga = Math.PI * (1 + Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = ga * i;
    const rad = 0.45 + 0.55 * (((i * 53) % 100) / 100);
    out.push({
      x: Math.cos(th) * r * rad * 1.12 + 0.05 * Math.sin(3 * y + 1.2),
      y: y * 0.92 * rad,
      z: Math.sin(th) * r * 0.88 * rad,
      s: 2.2 + 1.6 * (((i * 37) % 10) / 10),
    });
  }
  return out;
})();

/** 3D 近邻连线 */
const LINKS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      const dx = NODES[i].x - NODES[j].x;
      const dy = NODES[i].y - NODES[j].y;
      const dz = NODES[i].z - NODES[j].z;
      if (dx * dx + dy * dy + dz * dz < 0.125) out.push([i, j]);
    }
  }
  return out;
})();

/** 17 个金点：从前半球均匀取 */
const GOLD_IDX: number[] = (() => {
  const front = NODES.map((n, i) => ({ i, z: n.z })).filter((o) => o.z > 0.05);
  return Array.from({ length: 17 }, (_, k) => front[Math.floor((k * front.length) / 17)].i);
})();

const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const project = (n: N3, camZ: number, rotY: number, rotX: number) => {
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  const x1 = n.x * cy - n.z * sy;
  const z1 = n.x * sy + n.z * cy;
  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const y1 = n.y * cx - z1 * sx;
  const z2 = n.y * sx + z1 * cx;
  const depth = camZ - z2;
  if (depth < 0.2) return null;
  const scale = 2.2 / depth;
  return {
    x: 960 + x1 * scale * 560,
    y: 520 + y1 * scale * 560,
    r: Math.min(30, n.s * scale * 1.15),
    o: Math.min(1, 0.1 + 0.62 * (scale - 0.3)),
    scale,
  };
};

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

/** A+C 样片：3D 神经星图，12s，开场 1→2→400B→冲出屏幕→收缩→17 金点 */
export const Llama4MoESampleV6: React.FC = () => {
  const f = useCurrentFrame();

  const camZ = (() => {
    if (f < 60) return 3.4 - 0.2 * (f / 60);
    if (f < 120) return 3.2 - 0.6 * ((f - 60) / 60);
    if (f < 150) return 2.6 - 1.7 * eio((f - 120) / 30);
    if (f < 174) return 0.9 + 2.7 * eio((f - 150) / 24);
    return 3.4 - 0.6 * eio((f - 174) / (DUR - 174));
  })();

  const rotY =
    0.16 * Math.sin(f / 70) +
    (f > 120 && f < 174 ? 0.5 * ((f - 120) / 54) : 0) +
    (f >= 174 ? 0.36 * ((f - 174) / (DUR - 174)) : 0);
  const rotX = 0.07 * Math.sin(f / 90);

  const fieldOp = seg(f, 50, 95);
  const seedOp = 1 - seg(f, 50, 70);
  const countT = easeOut(seg(f, 55, 120));
  const count = Math.round(2 + 399999999998 * countT);
  const flash = Math.sin(Math.PI * clamp01((f - 140) / 14)) * 0.9;

  const proj = NODES.map((n) => project(n, camZ, rotY, rotX));

  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="goldHalo">
            <stop offset="0%" stopColor={GOLD_L} stopOpacity="0.95" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="62%">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.72" />
          </radialGradient>
          <radialGradient id="flash" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 3D 神经星图 */}
        <g opacity={fieldOp}>
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
                opacity={0.07 + 0.16 * Math.min(a.o, b.o)}
              />
            );
          })}
          {NODES.map((n, i) => {
            const a = proj[i];
            if (!a) return null;
            return <circle key={'n' + i} cx={a.x} cy={a.y} r={a.r} fill={WHITE} opacity={a.o} />;
          })}
          {/* Router 金色波纹：扫过网络 */}
          {(() => {
            const t = seg(f, 185, 255);
            if (t <= 0 || t >= 1) return null;
            return (
              <circle
                cx={960}
                cy={520}
                r={10 + 560 * easeOut(t)}
                fill="none"
                stroke={GOLD}
                strokeWidth={14}
                opacity={0.24 * (1 - t)}
              />
            );
          })()}
          {/* Router 到 17 金点的选择线 */}
          {GOLD_IDX.map((idx, k) => {
            const a = proj[idx];
            if (!a) return null;
            const t = seg(f, 210 + k * 4, 226 + k * 4);
            return (
              <line
                key={'gl' + k}
                x1={960}
                y1={520}
                x2={a.x}
                y2={a.y}
                stroke={GOLD}
                strokeWidth={0.9}
                opacity={0.2 * t}
              />
            );
          })}
          {/* 17 金点：光晕 + 常亮 */}
          {GOLD_IDX.map((idx, k) => {
            const a = proj[idx];
            if (!a) return null;
            const t = seg(f, 210 + k * 4, 226 + k * 4);
            const halo = 5 + 22 * easeOut(t);
            const haloO = (1 - t) * 0.9;
            const dotO = seg(f, 210 + k * 4, 218 + k * 4);
            return (
              <React.Fragment key={'g' + k}>
                <circle cx={a.x} cy={a.y} r={halo} fill="url(#goldHalo)" opacity={haloO} />
                <circle cx={a.x} cy={a.y} r={5} fill={GOLD} opacity={dotO} />
              </React.Fragment>
            );
          })}
          {/* Router 中心 */}
          <circle cx={960} cy={520} r={14} fill="none" stroke={GOLD} strokeWidth={1.4} opacity={0.55} />
          <circle cx={960} cy={520} r={5.5} fill={WHITE} />
          <text x={960} y={552} textAnchor="middle" fontFamily={EN} fontSize={13} fontWeight={700} fill={LIGHT} opacity={0.85}>
            Router
          </text>
        </g>

        {/* 开场种子：1 个 → 2 个 */}
        <g opacity={seedOp}>
          <circle cx={960} cy={520} r={26} fill="none" stroke={WHITE} strokeWidth={1} opacity={0.35} />
          <circle cx={960} cy={520} r={9} fill={WHITE} />
          <circle cx={960} cy={520} r={4} fill={WHITE} />
          {f > 30 && (
            <>
              <line x1={960} y1={520} x2={1070} y2={520} stroke={CYAN} strokeWidth={1} opacity={0.5} />
              <circle cx={1070} cy={520} r={7} fill={WHITE} opacity={0.9} />
            </>
          )}
        </g>

        {/* 冲出屏幕白闪 */}
        <rect width={1920} height={1080} fill="url(#flash)" opacity={flash} />
        <rect width={1920} height={1080} fill="url(#vignette)" />
      </svg>

      {/* 页眉：PPT 页网格 */}
      <Label x={M} y={20} text="01 · 开场" size={18} color={LIGHT} weight={600} spacing={2} />
      <Label x={M} y={46} text="从 1 个神经元，到 400B 个" size={32} color={WHITE} weight={800} />
      <div style={{ position: 'absolute', left: M, top: 96, width: 1920 - 2 * M, height: 2, background: WHITE, opacity: 0.28 }} />
      <Img
        src={staticFile('cai-logo.png')}
        style={{ position: 'absolute', right: M, top: 14, width: 276, filter: 'brightness(0) invert(1)' }}
      />

      {/* 种子文字 */}
      <Label x={960} y={590} text="1 个神经元" size={22} color={LIGHT} weight={600} anchor="middle" opacity={seg(f, 4, 16) * (1 - seg(f, 30, 40))} />
      <Label x={1015} y={590} text="2 个" size={22} color={LIGHT} weight={600} anchor="middle" opacity={seg(f, 32, 42) * (1 - seg(f, 52, 62))} />

      {/* 400B 计数器 */}
      <div
        style={{
          position: 'absolute',
          right: M,
          top: 118,
          padding: '10px 16px',
          background: 'rgba(3,5,10,0.72)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          opacity: seg(f, 50, 62),
        }}
      >
        <div style={{ fontFamily: CN, fontSize: 16, color: LIGHT, textAlign: 'right' }}>参数总量</div>
        <div style={{ fontFamily: EN, fontSize: 52, fontWeight: 800, color: WHITE, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {count.toLocaleString('en-US')}
        </div>
      </div>

      {/* 结尾：17 金点说明 */}
      <Label
        x={1920 - M}
        y={900}
        text="1 节点 = 1B · 400 节点 = 400B · 17 金点 = 17B 激活"
        size={22}
        color={GOLD}
        weight={700}
        anchor="end"
        opacity={seg(f, 250, 270)}
      />

      {/* 页脚 */}
      <div style={{ position: 'absolute', left: M, top: 1014, width: 1920 - 2 * M, height: 2, background: WHITE, opacity: 0.2 }} />
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
