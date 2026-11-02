import React from 'react';
import { useCurrentFrame } from 'remotion';
import { T, FONT, MONO, W, H, SAFE_BOTTOM, rise, fadeIn, easeOut, seg, clamp01 } from './theme';

/** 背景：暖白纸 + 极淡网格 + 顶部细线 */
export const Frame: React.FC<{
  children?: React.ReactNode;
  section?: string;
  index?: string;
  progress?: number; // 0..1
}> = ({ children, section, index, progress = 0 }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, background: T.bg }} />
    {/* 网格 */}
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 25 }).map((_, i) => (
        <line key={'v' + i} x1={i * 80} y1={0} x2={i * 80} y2={H} stroke={T.grid} strokeWidth={1} />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={'h' + i} x1={0} y1={i * 80} x2={W} y2={i * 80} stroke={T.grid} strokeWidth={1} />
      ))}
    </svg>
    {/* 顶部标签 */}
    {section && (
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 56,
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 3,
          color: T.red,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span style={{ width: 12, height: 12, background: T.red, borderRadius: 3, display: 'inline-block' }} />
        {section}
      </div>
    )}
    {index && (
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 52,
          fontFamily: MONO,
          fontSize: 24,
          fontWeight: 700,
          color: T.muted,
          letterSpacing: 2,
        }}
      >
        {index}
      </div>
    )}
    {/* 进度条 */}
    <div style={{ position: 'absolute', right: 120, top: 92, width: 260, height: 6, background: 'rgba(18,25,43,0.12)', borderRadius: 3 }}>
      <div style={{ width: `${clamp01(progress) * 100}%`, height: '100%', background: T.red, borderRadius: 3 }} />
    </div>
    {children}
  </>
);

/** 字幕带：底部深色条 + 白字（投影下对比最强） */
export const Sub: React.FC<{ f: number; lines: string[]; note?: string; delay?: number }> = ({ f, lines, note, delay = 2 }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H - SAFE_BOTTOM + 60 }}>
    <div style={{ position: 'absolute', inset: 0, background: T.ink }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 5, background: T.red }} />
    <div style={{ position: 'absolute', left: 120, right: 120, top: 46 }}>
      {lines.map((t, i) => (
        <div
          key={i}
          style={{
            ...rise(f, delay + i * 10, 18, 26),
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.28,
            color: T.white,
            letterSpacing: 1,
          }}
        >
          {t}
        </div>
      ))}
      {note && (
        <div
          style={{
            ...fadeIn(f, delay + 22, 18),
            marginTop: 10,
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          {note}
        </div>
      )}
    </div>
  </div>
);

/** 页内大标题 */
export const Headline: React.FC<{ f: number; text: string; size?: number; delay?: number; color?: string }> = ({
  f,
  text,
  size = 84,
  delay = 4,
  color = T.ink,
}) => (
  <div
    style={{
      ...rise(f, delay, 22, 36),
      position: 'absolute',
      left: 120,
      top: 190,
      right: 120,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 900,
      lineHeight: 1.18,
      color,
      letterSpacing: -1,
    }}
  >
    {text}
  </div>
);

/** 小标签（英文/单位） */
export const Kicker: React.FC<{ f: number; text: string; delay?: number; color?: string }> = ({
  f,
  text,
  delay = 2,
  color = T.muted,
}) => (
  <div
    style={{
      ...fadeIn(f, delay, 16),
      position: 'absolute',
      left: 120,
      top: 148,
      fontFamily: MONO,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: 4,
      color,
    }}
  >
    {text}
  </div>
);

/** 白卡片 */
export const Card: React.FC<{
  children?: React.ReactNode;
  x: number;
  y: number;
  w: number;
  h: number;
  f: number;
  delay?: number;
  accent?: string;
  filled?: boolean;
}> = ({ children, x, y, w, h, f, delay = 0, accent = T.line, filled = false }) => {
  const e = easeOut(seg(f, delay, delay + 20));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        background: filled ? T.white : 'rgba(255,255,255,0.72)',
        border: `2px solid ${accent}`,
        borderRadius: 18,
        boxShadow: '0 10px 30px rgba(18,25,43,0.07)',
        opacity: e,
        transform: `translateY(${(1 - e) * 26}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** 横向数据条 */
export const Bar: React.FC<{
  x: number;
  y: number;
  w: number;
  h?: number;
  ratio: number; // 0..1
  color: string;
  f: number;
  delay?: number;
  label?: string;
  value?: string;
  labelW?: number;
}> = ({ x, y, w, h = 54, ratio, color, f, delay = 0, label, value, labelW = 210 }) => {
  const e = easeOut(seg(f, delay, delay + 26));
  return (
    <>
      {label && (
        <div
          style={{
            ...fadeIn(f, delay, 16),
            position: 'absolute',
            left: x - labelW,
            top: y + h / 2 - 22,
            width: labelW - 20,
            textAlign: 'right',
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 800,
            color: T.ink2,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: 'rgba(18,25,43,0.07)', borderRadius: h / 2 }} />
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w * ratio * e,
          height: h,
          background: color,
          borderRadius: h / 2,
        }}
      />
      {value && (
        <div
          style={{
            ...fadeIn(f, delay + 10, 16),
            position: 'absolute',
            left: x + w * ratio * e + 18,
            top: y + h / 2 - 24,
            fontFamily: MONO,
            fontSize: 34,
            fontWeight: 800,
            color: color,
          }}
        >
          {value}
        </div>
      )}
    </>
  );
};

/** 大数字 */
export const BigNum: React.FC<{
  x: number;
  y: number;
  w?: number;
  value: string;
  unit?: string;
  caption?: string;
  color?: string;
  f: number;
  delay?: number;
  size?: number;
}> = ({ x, y, w = 360, value, unit, caption, color = T.ink, f, delay = 0, size = 96 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, ...rise(f, delay, 20, 30) }}>
    <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 800, color, lineHeight: 1 }}>
      {value}
      {unit && <span style={{ fontSize: size * 0.4, marginLeft: 8, fontWeight: 700 }}>{unit}</span>}
    </div>
    {caption && (
      <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: T.muted, lineHeight: 1.4 }}>{caption}</div>
    )}
  </div>
);

/** 章节过渡页 */
export const SectionSlide: React.FC<{ f: number; no: string; title: string; sub?: string }> = ({ f, no, title, sub }) => (
  <>
    <div
      style={{
        ...rise(f, 2, 24, 40),
        position: 'absolute',
        left: 120,
        top: 300,
        fontFamily: MONO,
        fontSize: 120,
        fontWeight: 800,
        color: 'rgba(200,69,45,0.18)',
        lineHeight: 1,
      }}
    >
      {no}
    </div>
    <div
      style={{
        ...rise(f, 10, 24, 50),
        position: 'absolute',
        left: 124,
        top: 430,
        fontFamily: FONT,
        fontSize: 96,
        fontWeight: 900,
        color: T.ink,
        letterSpacing: -1,
      }}
    >
      {title}
    </div>
    <div
      style={{
        ...fadeIn(f, 22, 20),
        position: 'absolute',
        left: 128,
        top: 570,
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 700,
        color: T.muted,
      }}
    >
      {sub ?? ''}
    </div>
    <div style={{ position: 'absolute', left: 128, top: 620, width: 160 * easeOut(seg(f, 14, 40)), height: 6, background: T.red }} />
  </>
);

/** 虚线分隔 */
export const Divider: React.FC<{ x: number; y: number; w: number; f: number; delay?: number }> = ({ x, y, w, f, delay = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w * easeOut(seg(f, delay, delay + 24)),
      height: 2,
      background: T.line,
    }}
  />
);

/** 通用图标：勾 / 叉 */
export const Tick: React.FC<{ x: number; y: number; ok?: boolean; size?: number; f: number; delay?: number }> = ({
  x,
  y,
  ok = true,
  size = 40,
  f,
  delay = 0,
}) => {
  const e = easeOut(seg(f, delay, delay + 14));
  return (
    <svg width={size} height={size} style={{ position: 'absolute', left: x, top: y, opacity: e, transform: `scale(${0.6 + 0.4 * e})` }}>
      {ok ? (
        <path d={`M${size * 0.18} ${size * 0.52} L${size * 0.42} ${size * 0.76} L${size * 0.84} ${size * 0.24}`} stroke={T.teal} strokeWidth={size * 0.13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <line x1={size * 0.2} y1={size * 0.2} x2={size * 0.8} y2={size * 0.8} stroke={T.red} strokeWidth={size * 0.13} strokeLinecap="round" />
          <line x1={size * 0.8} y1={size * 0.2} x2={size * 0.2} y2={size * 0.8} stroke={T.red} strokeWidth={size * 0.13} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};
