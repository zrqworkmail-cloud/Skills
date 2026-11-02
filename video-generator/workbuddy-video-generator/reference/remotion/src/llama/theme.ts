/**
 * 主题：浅色「技术报告」排版
 * 用途：课堂汇报（投影环境，浅底深字更易读）
 * 规格：1920×1080 / 24fps
 */
export const T = {
  bg: '#F6F4EF',
  bg2: '#EDEAE2',
  ink: '#12192B',
  ink2: '#2A3348',
  muted: '#5A6478',
  line: 'rgba(18,25,43,0.14)',
  grid: 'rgba(18,25,43,0.055)',
  red: '#C8452D',
  redL: '#E2643F',
  teal: '#1F7A6B',
  tealL: '#2E9C88',
  gold: '#B8862B',
  white: '#FFFFFF',
  paper: '#FBF9F4',
};

export const FONT =
  '"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Source Han Sans SC","Noto Sans CJK SC",sans-serif';
export const MONO = '"JetBrains Mono","Cascadia Mono","Consolas","Menlo",monospace';

export const W = 1920;
export const H = 1080;

/** 内容安全区：字幕带从 y=880 开始，正文一律 y < 860 */
export const SAFE_BOTTOM = 860;

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 时间片进度：frame 在 [a,b] 内的 0→1 */
export const seg = (f: number, a: number, b: number) => clamp01((f - a) / Math.max(1, b - a));

/** 上浮淡入 */
export const rise = (f: number, delay = 0, dur = 20, dist = 40) => {
  const e = easeOut(seg(f, delay, delay + dur));
  return { opacity: e, transform: `translateY(${(1 - e) * dist}px)` };
};

/** 纯淡入 */
export const fadeIn = (f: number, delay = 0, dur = 16) => ({ opacity: easeOut(seg(f, delay, delay + dur)) });

/** 从左划入 */
export const slideX = (f: number, delay = 0, dur = 20, dist = 60) => {
  const e = easeOut(seg(f, delay, delay + dur));
  return { opacity: e, transform: `translateX(${(1 - e) * dist}px)` };
};
