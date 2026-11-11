import {Easing, interpolate, spring} from 'remotion';

/** 所有 interpolate 的默认选项：区间外保持端点值 */
export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export type SpringConfigLike = {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
};

/** 秒 → 帧 */
export const sec = (seconds: number, fps: number) => Math.round(seconds * fps);

/** 淡入：默认 15 帧 */
export const fadeIn = (frame: number, start = 0, duration = 15) =>
  interpolate(frame, [start, start + duration], [0, 1], CLAMP);

/** 淡出：默认从第 12 帧起 12 帧 */
export const fadeOut = (frame: number, start = 0, duration = 12) =>
  interpolate(frame, [start, start + duration], [1, 0], CLAMP);

/** 缓动进度：0 → 1 */
export const easeOut = (
  frame: number,
  duration = 20,
  easing: (input: number) => number = Easing.out(Easing.cubic),
) => interpolate(frame, [0, duration], [0, 1], {...CLAMP, easing});

/** 弹簧进度：带起始延迟，负帧安全 */
export const springIn = (
  frame: number,
  fps: number,
  delay = 0,
  config: SpringConfigLike = {damping: 16},
) => spring({frame: Math.max(0, frame - delay), fps, config});

/** 进度 → 上浮入场样式 */
export const rise = (progress: number, distance = 32) => ({
  opacity: progress,
  transform: `translateY(${(1 - progress) * distance}px)`,
});

/** 进度 → 缩放入场样式 */
export const settle = (progress: number, from = 0.92) => ({
  opacity: progress,
  transform: `scale(${from + (1 - from) * progress})`,
});

/** 错峰延迟：第 index 个元素应延迟的帧数 */
export const stagger = (index: number, gap = 4) => index * gap;

/** 呼吸：返回 1 附近的缩放系数 */
export const pulse = (frame: number, fps: number, hz = 1, amplitude = 0.02) =>
  1 + Math.sin((frame / fps) * Math.PI * 2 * hz) * amplitude;

/** 循环取模，避免负帧 */
export const loop = (frame: number, period: number) => (period > 0 ? frame % period : 0);
