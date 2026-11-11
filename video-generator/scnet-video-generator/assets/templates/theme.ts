/**
 * 设计令牌（Design Tokens）
 *
 * 规则：场景代码只允许引用这里的值，不允许出现裸色值与裸字号。
 * 校验：node scripts/check-tokens.mjs src
 */

export const theme = {
  color: {
    bg: '#0E1626',
    surface: '#16233A',
    ink: '#FFFFFF',
    muted: 'rgba(255, 255, 255, 0.72)',
    faint: 'rgba(255, 255, 255, 0.18)',
    accent: '#F0A03C',
    accentAlt: '#4F7CFF',
    positive: '#3ECF8E',
    negative: '#F2545B',
  },

  /** 字阶：只取这几档，不要临时插值 */
  type: {
    display: 96,
    h1: 64,
    h2: 44,
    body: 30,
    caption: 21,
    micro: 16,
  },

  weight: {
    regular: 400,
    medium: 500,
    bold: 700,
    black: 800,
  },

  /** 间距基准 8px */
  space: (n: number) => n * 8,

  radius: {
    sm: 8,
    md: 16,
    lg: 28,
    pill: 999,
  },

  /** 动效时长（帧）与缓动，保证全片节奏一致 */
  motion: {
    fast: 12,
    base: 20,
    slow: 34,
    easeOut: [0.22, 1, 0.36, 1] as const,
    easeInOut: [0.65, 0, 0.35, 1] as const,
  },

  /** 安全区（px），按画幅取值 */
  safe: {
    landscape: {x: 120, top: 96, bottom: 120},
    portrait: {x: 72, top: 180, bottom: 280},
  },

  font: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
} as const;

export type Theme = typeof theme;
