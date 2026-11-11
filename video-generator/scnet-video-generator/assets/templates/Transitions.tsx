import React from 'react';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe, type WipeDirection} from '@remotion/transitions/wipe';

/**
 * 跨镜转场：把镜头卡里的 `exit` 变成可执行的 TransitionSeries 转场。
 *
 * 为什么用重叠而不是插一段：转场是两镜之间的缝，不是第三镜。
 * 插一段会让时间轴多出一笔「转场镜头」，配音和字幕都要为它让路；
 * 重叠只吃掉两镜接缝处的时间，成片总帧仍等于镜头帧之和。
 *
 * 用法（TransitionSeries 的直接子元素必须是它自己的 Sequence / Transition，
 * 所以这里导出的是元素工厂，不是包装组件）：
 *
 *   const children: React.ReactNode[] = [];
 *   shots.forEach((shot, index) => {
 *     const isLast = index === shots.length - 1;
 *     children.push(
 *       <TransitionSeries.Sequence key={shot.id} durationInFrames={sequenceFrames(shot, isLast)}>
 *         <Scene {...shot.props} />
 *       </TransitionSeries.Sequence>,
 *     );
 *     if (!isLast && shot.transition) {
 *       children.push(exitTransition(shot.transition, `${shot.id}-out`));
 *     }
 *   });
 *   return <TransitionSeries>{children}</TransitionSeries>;
 *
 * 时间账：成片帧数 = Σ(镜头帧 + 出镜转场帧) − Σ 出镜转场帧 = Σ 镜头帧。
 * 多出来的转场帧由 `sequenceFrames` 补在序列尾部，镜头内容原样保留。
 */

export type TransitionType = 'fade' | 'wipe';

export type TransitionSpec = {
  /** 出镜方式；`cut` 不写 transition 字段，直接硬切 */
  type: TransitionType;
  /** 与下一镜重叠的帧数 */
  frames: number;
  /** 擦除方向，承接上一镜的运动方向；不填默认自左向右 */
  direction?: WipeDirection;
  /** 取自哪张转场卡（assets/cards/ 里的 id），便于回查 */
  card?: string;
};

/** 叠化默认长度，约 0.4s @30fps */
export const DEFAULT_FADE_FRAMES = 12;

/** 超过这个帧数，转场本身就开始像一镜，观众会等它演完 */
export const MAX_TRANSITION_FRAMES = 24;

export const transitionFrames = (transition?: TransitionSpec): number =>
  transition ? transition.frames : 0;

/**
 * 序列实际时长：镜头自己的帧数 + 出镜转场帧。
 * 末镜没有出镜转场，原样返回。
 */
export const sequenceFrames = (
  shot: {frames: number; transition?: TransitionSpec},
  isLast: boolean,
): number => shot.frames + (isLast ? 0 : transitionFrames(shot.transition));

/**
 * 生成一条出镜转场。硬切不要调用它 —— 两张序列直接相贴即可。
 * `key` 由调用方给，因为它要和其他序列一起放进数组。
 */
export const exitTransition = (transition: TransitionSpec, key?: string): React.ReactElement => {
  const timing = linearTiming({durationInFrames: transition.frames});

  if (transition.type === 'wipe') {
    return (
      <TransitionSeries.Transition
        key={key}
        presentation={wipe({direction: transition.direction ?? 'from-left'})}
        timing={timing}
      />
    );
  }

  return <TransitionSeries.Transition key={key} presentation={fade()} timing={timing} />;
};
