import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SlideFrame, WHITE, LIGHT, MUTED, GOLD, GOLD_L, CN, DISPLAY } from './llama4moe/Slide';
import { easeOut, seg, clamp01 } from './llama/theme';

const DUR = 240;

// 成本曲线（线性上涨）：从 (220,800) 升到 (1450,280)
const X0 = 220;
const X1 = 1450;
const Y0 = 800;
const Y1 = 280;
const yAt = (x: number) => Y0 + (Y1 - Y0) * ((x - X0) / (X1 - X0));

const WALL_X = 1450;
const WALL_TOP = 150;
const WALL_BOT = 850;
const BASE_Y = Y0; // 堆叠基线对齐 X 轴（成本=0）

// 参数堆叠：36 根，随曲线长高，临近红墙转红、出裂纹
const BARS = 36;
const BAR_X0 = 220;
const BAR_X1 = 1420;
const BAR_W = 22;

const RED = '#E5484D';

export const Llama4MoEShot05: React.FC = () => {
  const f = useCurrentFrame();

  const curveT = easeOut(seg(f, 10, 150));
  const wallT = easeOut(seg(f, 95, 155));
  const stackT = easeOut(seg(f, 30, 175));
  const crackT = easeOut(seg(f, 150, 205));
  const titleT = easeOut(seg(f, 6, 24));
  const labelT = easeOut(seg(f, 60, 110));
  const conclT = easeOut(seg(f, 175, 215));

  // 曲线归一化长度用于 draw-on
  const curveLen = Math.hypot(X1 - X0, Y1 - Y0);

  const bars = Array.from({ length: BARS }).map((_, i) => {
    const x = BAR_X0 + (BAR_X1 - BAR_X0) * (i / (BARS - 1));
    const frac = i / (BARS - 1);
    const cost = 1 - (yAt(x) - Y1) / (Y0 - Y1); // 0→1 随成本上升
    const h = cost * 500 * stackT;
    const near = frac > 0.82; // 临近红墙
    const col = near ? RED : GOLD;
    return { x, h, col, near };
  });

  return (
    <SlideFrame kicker="05 · 成本" title="成本墙：参数越大，代价越高" page="05 / 18">
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity="0.0" />
            <stop offset="18%" stopColor={RED} stopOpacity="0.85" />
            <stop offset="100%" stopColor={RED} stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* 坐标轴 */}
        <line x1={X0} y1={Y0} x2={X1 + 40} y2={Y0} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} opacity={labelT} />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1 - 60} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} opacity={labelT} />

        {/* 参数堆叠（随成本长高，临近红墙转红） */}
        {bars.map((b, i) => (
          <rect
            key={'bar' + i}
            x={b.x - BAR_W / 2}
            y={BASE_Y - b.h}
            width={BAR_W}
            height={b.h}
            rx={3}
            fill={b.col}
            opacity={0.55 + 0.4 * (b.near ? 1 : clamp01(b.h / 200))}
          />
        ))}

        {/* 裂纹（撞墙处） */}
        {[
          'M1380 470 l24 -34 l-10 40 l26 -20',
          'M1410 560 l-18 30 l22 18 l-14 36',
          'M1370 660 l28 22 l-12 30 l24 16',
        ].map((d, i) => (
          <path key={'c' + i} d={d} stroke={RED} strokeWidth={2.5} fill="none" opacity={crackT * 0.95} />
        ))}

        {/* 成本曲线 draw-on（线性上涨） */}
        <path
          d={`M${X0} ${Y0} L${X1} ${Y1}`}
          stroke={GOLD_L}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          pathLength={curveLen}
          strokeDasharray={curveLen}
          strokeDashoffset={curveLen * (1 - curveT)}
        />

        {/* 红墙落下 */}
        <rect
          x={WALL_X}
          y={WALL_TOP}
          width={26}
          height={WALL_BOT - WALL_TOP}
          fill="url(#wallGrad)"
          style={{ transform: `scaleY(${wallT})`, transformOrigin: `${WALL_X + 13}px ${WALL_TOP}px` }}
        />

        {/* 405B 标注 */}
        <text x={X1 - 6} y={Y1 - 14} textAnchor="end" fontFamily={DISPLAY} fontSize={30} fontWeight={700} fill={GOLD} opacity={curveT}>
          405B
        </text>
      </svg>

      {/* 轴标签 */}
      <div style={{ position: 'absolute', left: X0, top: Y0 + 18, opacity: labelT, fontFamily: CN, fontSize: 20, color: MUTED, letterSpacing: 1 }}>
        参数量 →
      </div>
      <div style={{ position: 'absolute', left: X0 - 40, top: Y1 - 70, opacity: labelT, fontFamily: CN, fontSize: 20, color: MUTED, letterSpacing: 1 }}>
        推理成本 ↑
      </div>
      <div style={{ position: 'absolute', left: WALL_X - 36, top: WALL_TOP + 10, opacity: wallT, fontFamily: CN, fontSize: 22, fontWeight: 700, color: RED, letterSpacing: 2 }}>
        成本墙
      </div>

      {/* 结论 */}
      <div style={{ position: 'absolute', left: 150, top: 360, opacity: conclT }}>
        <div style={{ fontFamily: CN, fontSize: 30, fontWeight: 700, color: WHITE, letterSpacing: 1, lineHeight: 1.5 }}>
          模型越大，计算和部署成本越高
        </div>
        <div style={{ fontFamily: CN, fontSize: 24, color: LIGHT, marginTop: 12, letterSpacing: 1, lineHeight: 1.5 }}>
          405B 的推理成本随参数<span style={{ color: RED }}>线性上涨</span>
          <br />
          很快撞上成本墙
        </div>
      </div>
    </SlideFrame>
  );
};
