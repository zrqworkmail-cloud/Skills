import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {theme} from './theme';

/**
 * Stage：全片唯一的构图栅格
 *
 * 三个槽位固定职责，场景不再各自摆放：
 *   title   → 左上（横屏）/ 上部（竖屏），最多两行
 *   subject → 画面中心，占 1/3–1/2
 *   caption → 左下 / 底部安全区上方，单行
 */

export type StageProps = {
  title?: React.ReactNode;
  subject?: React.ReactNode;
  caption?: React.ReactNode;
  /** 显示安全区与三分线；交付前关掉 */
  debug?: boolean;
};

export const Stage: React.FC<StageProps> = ({title, subject, caption, debug = false}) => {
  const {width, height} = useVideoConfig();
  const portrait = height > width;
  const safe = portrait ? theme.safe.portrait : theme.safe.landscape;

  return (
    <AbsoluteFill style={{fontFamily: theme.font}}>
      {title ? (
        <div style={{position: 'absolute', left: safe.x, right: safe.x, top: safe.top}}>{title}</div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: safe.x,
          right: safe.x,
          top: safe.top,
          bottom: safe.bottom,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {subject}
      </div>

      {caption ? (
        <div style={{position: 'absolute', left: safe.x, right: safe.x, bottom: safe.bottom}}>
          {caption}
        </div>
      ) : null}

      {debug ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: safe.x,
              right: safe.x,
              top: safe.top,
              bottom: safe.bottom,
              border: '1px dashed rgba(255,255,255,0.28)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: width / 3,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(255,255,255,0.14)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: (width * 2) / 3,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(255,255,255,0.14)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: height / 3,
              left: 0,
              right: 0,
              height: 1,
              background: 'rgba(255,255,255,0.14)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: (height * 2) / 3,
              left: 0,
              right: 0,
              height: 1,
              background: 'rgba(255,255,255,0.14)',
            }}
          />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
