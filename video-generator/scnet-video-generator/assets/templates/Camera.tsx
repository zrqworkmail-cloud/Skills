import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * Camera：全片唯一的运镜出口
 *
 * 场景只表达「从哪到哪」，不重复写 transform。
 * Layer 通过 depth 产生视差：depth < 1 远景（慢），> 1 前景（快）。
 */

type CameraState = {x: number; y: number};

const CameraContext = React.createContext<CameraState>({x: 0, y: 0});

export type CameraProps = {
  zoom?: number;
  x?: number;
  y?: number;
  rotate?: number;
  origin?: string;
  children: React.ReactNode;
};

export const Camera: React.FC<CameraProps> = ({
  zoom = 1,
  x = 0,
  y = 0,
  rotate = 0,
  origin = '50% 50%',
  children,
}) => (
  <CameraContext.Provider value={{x, y}}>
    <AbsoluteFill
      style={{
        transform: `translate(${x}px, ${y}px) scale(${zoom}) rotate(${rotate}deg)`,
        transformOrigin: origin,
      }}
    >
      {children}
    </AbsoluteFill>
  </CameraContext.Provider>
);

export type LayerProps = {
  /** 0.2 = 远景，1 = 主体，1.6 = 前景 */
  depth?: number;
  children: React.ReactNode;
};

export const Layer: React.FC<LayerProps> = ({depth = 1, children}) => {
  const camera = React.useContext(CameraContext);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${camera.x * (depth - 1)}px, ${camera.y * (depth - 1)}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const useCamera = () => React.useContext(CameraContext);

/**
 * 运镜预设：输入进度 p（0→1），输出 Camera 参数
 *
 * 用法：
 *   const p = easeOut(frame, 90);
 *   <Camera {...moves.push(p, 1, 1.08)}>…</Camera>
 */
export const moves = {
  static: () => ({zoom: 1, x: 0, y: 0}),

  push: (p: number, from = 1, to = 1.08) => ({
    zoom: from + (to - from) * p,
    x: 0,
    y: 0,
  }),

  pull: (p: number, from = 1.12, to = 1) => ({
    zoom: from + (to - from) * p,
    x: 0,
    y: 0,
  }),

  pan: (p: number, from = 0, to = -80) => ({
    zoom: 1,
    x: from + (to - from) * p,
    y: 0,
  }),

  tilt: (p: number, from = 0, to = -40) => ({
    zoom: 1,
    x: 0,
    y: from + (to - from) * p,
  }),

  /** 跟拍：主体位移取反，保持主体在画面中相对静止 */
  track: (subjectDelta: number) => ({zoom: 1, x: -subjectDelta, y: 0}),
};
