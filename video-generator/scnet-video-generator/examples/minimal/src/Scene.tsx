import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera, Layer, moves} from '../../../assets/templates/Camera';
import {Stage} from '../../../assets/templates/Stage';
import {theme} from '../../../assets/templates/theme';
import {easeOut, fadeIn, rise, springIn} from '../../../assets/templates/anim';

/**
 * 最小场景：同时用到 theme / anim / Camera / Stage 四个模板。
 * 目的不是好看，而是证明它们能在一个真实工程里编译并渲染。
 */
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cameraProgress = easeOut(frame, 60);
  const cardEnter = springIn(frame, fps, 6, {damping: 18});
  const captionIn = fadeIn(frame, 24, 20);

  return (
    <AbsoluteFill style={{background: theme.color.bg}}>
      <Camera {...moves.push(cameraProgress, 1, 1.06)}>
        <Layer depth={0.4}>
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at 30% 20%, ${theme.color.surface}, ${theme.color.bg})`,
            }}
          />
        </Layer>

        <Layer depth={1}>
          <Stage
            title={
              <div
                style={{
                  color: theme.color.muted,
                  fontSize: theme.type.caption,
                  letterSpacing: 8,
                  fontFamily: theme.font,
                }}
              >
                TEMPLATE CHECK
              </div>
            }
            subject={
              <div
                style={{
                  ...rise(cardEnter, 40),
                  width: 520,
                  padding: theme.space(4),
                  borderRadius: theme.radius.lg,
                  background: theme.color.surface,
                  color: theme.color.ink,
                  fontSize: theme.type.h2,
                  fontFamily: theme.font,
                  textAlign: 'center',
                }}
              >
                镜头驱动的模板验证
              </div>
            }
            caption={
              <div
                style={{
                  opacity: captionIn,
                  color: theme.color.accent,
                  fontSize: theme.type.body,
                  fontFamily: theme.font,
                }}
              >
                Camera · Stage · anim · theme
              </div>
            }
          />
        </Layer>
      </Camera>
    </AbsoluteFill>
  );
};
