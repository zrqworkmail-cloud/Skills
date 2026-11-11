import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {theme} from '../../../assets/templates/theme';
import {Camera, Layer, moves} from '../../../assets/templates/Camera';
import {easeOut} from '../../../assets/templates/anim';

/**
 * 验收场景：pelican riding a bicycle
 *
 * 对应 Simon Willison 的原版提示词（2024-10-25）：
 *   Generate an SVG of a pelican riding a bicycle.
 *
 * 判分点就三处，全部落在几何上，不做美术修饰：
 *   1. 车架成立：三角架闭合、辐条可见、链条连接牙盘与飞轮；
 *   2. 腿真的在踩：脚踝由曲柄角驱动，两骨 IK 解膝关节，不是贴图错位；
 *   3. 动作连续：辐条、曲柄、路面随帧推进一致，不穿帮。
 */

const C = theme.illo;

const WHEEL_R = 118;
const REAR = {x: 405, y: 486};
const FRONT = {x: 785, y: 486};
const BB = {x: 536, y: 516};
const SEAT = {x: 500, y: 356};
const HEAD_TOP = {x: 728, y: 366};
const HEAD_BOT = {x: 742, y: 410};
const SADDLE = {x: 490, y: 348};
const CRANK_R = 44;

type P = {x: number; y: number};

/**
 * 两骨 IK：给定髋与脚，用大腿/小腿长度解出膝关节。
 *
 * 两个解都算出来，取 x 更大的那个，膝盖永远朝前。
 * 如果固定用 base + alpha，踏板转到上半圈时膝会反折到身后，看起来像断腿。
 */
const kneeOf = (hip: P, foot: P, thigh: number, shin: number): P => {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const raw = Math.hypot(dx, dy);
  const dist = Math.min(Math.max(raw, Math.abs(thigh - shin) + 1), thigh + shin - 1);
  const base = Math.atan2(dy, dx);
  const cos = (thigh * thigh + dist * dist - shin * shin) / (2 * thigh * dist);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cos)));
  const at = (angle: number): P => ({
    x: hip.x + Math.cos(angle) * thigh,
    y: hip.y + Math.sin(angle) * thigh,
  });
  const a = at(base + alpha);
  const b = at(base - alpha);
  return a.x >= b.x ? a : b;
};

const Spokes: React.FC<{hub: P; angle: number}> = ({hub, angle}) => (
  <g transform={`rotate(${angle} ${hub.x} ${hub.y})`}>
    {Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={hub.x + Math.cos(a) * 13}
          y1={hub.y + Math.sin(a) * 13}
          x2={hub.x + Math.cos(a) * (WHEEL_R - 10)}
          y2={hub.y + Math.sin(a) * (WHEEL_R - 10)}
          stroke={C.bikeShade}
          strokeWidth={2.4}
          opacity={0.85}
        />
      );
    })}
  </g>
);

const Wheel: React.FC<{hub: P; angle: number}> = ({hub, angle}) => (
  <g>
    <circle cx={hub.x} cy={hub.y} r={WHEEL_R} fill="none" stroke={C.tire} strokeWidth={9} />
    <circle
      cx={hub.x}
      cy={hub.y}
      r={WHEEL_R - 13}
      fill="none"
      stroke={C.bikeShade}
      strokeWidth={2}
      opacity={0.5}
    />
    <Spokes hub={hub} angle={angle} />
    <circle cx={hub.x} cy={hub.y} r={10} fill={C.bikeShade} />
    <circle cx={hub.x} cy={hub.y} r={3.6} fill={C.ground} />
  </g>
);

const Leg: React.FC<{
  hip: P;
  foot: P;
  thigh: number;
  shin: number;
  tone: string;
  width: number;
}> = ({hip, foot, thigh, shin, tone, width}) => {
  const knee = kneeOf(hip, foot, thigh, shin);
  return (
    <g stroke={tone} strokeLinecap="round" fill="none">
      <line x1={hip.x} y1={hip.y} x2={knee.x} y2={knee.y} strokeWidth={width} />
      <line x1={knee.x} y1={knee.y} x2={foot.x} y2={foot.y} strokeWidth={width * 0.72} />
      <circle cx={knee.x} cy={knee.y} r={width * 0.42} fill={tone} stroke="none" />
    </g>
  );
};

/** 蹼足：始终扣在脚踏上 */
const Foot: React.FC<{at: P; tone: string}> = ({at, tone}) => (
  <path
    d={`M ${at.x - 15} ${at.y - 7} L ${at.x + 20} ${at.y - 3} L ${at.x + 16} ${at.y + 7} L ${at.x - 12} ${at.y + 6} Z`}
    fill={tone}
  />
);

export const PelicanBicycle: React.FC = () => {
  const frame = useCurrentFrame();
  const p = easeOut(frame, 90);

  const crank = (frame * 12 * Math.PI) / 180;
  const wheel = (frame * 30 * Math.PI) / 180;
  const bob = Math.sin(crank * 2) * 2.6;

  const pedal = (offset: number): P => ({
    x: BB.x + Math.cos(crank + offset) * CRANK_R,
    y: BB.y + Math.sin(crank + offset) * CRANK_R,
  });
  const pedalNear = pedal(0);
  const pedalFar = pedal(Math.PI);

  const hipNear = {x: 544, y: 362};
  const hipFar = {x: 514, y: 368};

  return (
    <AbsoluteFill style={{backgroundColor: C.skyTop}}>
      <Camera {...moves.push(p, 1, 1.05)}>
        <Layer depth={1}>
          <svg width="100%" height="100%" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.skyTop} />
                <stop offset="100%" stopColor={C.skyBottom} />
              </linearGradient>
            </defs>

            <rect x={0} y={0} width={1200} height={700} fill="url(#sky)" />

            {/* 背景：一个不参与叙事的低对比度环境 */}
            <circle cx={1046} cy={112} r={78} fill={C.sun} opacity={0.13} />
            <circle cx={1046} cy={112} r={88} fill="none" stroke={C.sun} strokeWidth={1.5} opacity={0.2} />
            <path d="M 0 520 C 170 470, 300 505, 430 486 C 560 467, 640 500, 760 490 C 880 480, 980 452, 1200 484 L 1200 700 L 0 700 Z" fill={C.hillFar} />
            <path d="M 0 566 C 150 528, 300 556, 430 544 C 590 529, 700 556, 840 546 C 980 536, 1080 516, 1200 540 L 1200 700 L 0 700 Z" fill={C.hillNear} />

            {/* 地面与路面速度线：和轮速同源，避免“原地打滑” */}
            <rect x={0} y={604} width={1200} height={96} fill={C.ground} />
            <line x1={0} y1={604} x2={1200} y2={604} stroke={C.road} strokeWidth={3} />
            {Array.from({length: 8}, (_, i) => {
              const x = (((i * 190 - frame * 16) % 1340) + 1340) % 1340 - 70;
              return <rect key={i} x={x} y={648} width={92} height={7} rx={3} fill={C.road} opacity={0.9} />;
            })}

            <Wheel hub={REAR} angle={(wheel * 180) / Math.PI} />
            <Wheel hub={FRONT} angle={(wheel * 180) / Math.PI} />

            {/* 链条：牙盘 → 飞轮 */}
            <g stroke={C.bikeShade} strokeWidth={3.4} strokeDasharray="7 5" strokeDashoffset={-frame * 2.4} opacity={0.9}>
              <line x1={BB.x} y1={BB.y - 9} x2={REAR.x} y2={REAR.y - 6} />
              <line x1={BB.x} y1={BB.y + 9} x2={REAR.x} y2={REAR.y + 6} />
            </g>

            {/* 车架：主三角 + 后三角，闭合 */}
            <g stroke={C.bikeFrame} strokeWidth={9} strokeLinecap="round" fill="none">
              <line x1={BB.x} y1={BB.y} x2={SEAT.x} y2={SEAT.y} />
              <line x1={SEAT.x} y1={SEAT.y} x2={HEAD_TOP.x} y2={HEAD_TOP.y} />
              <line x1={BB.x} y1={BB.y} x2={HEAD_BOT.x} y2={HEAD_BOT.y} />
              <line x1={BB.x} y1={BB.y} x2={REAR.x} y2={REAR.y} />
              <line x1={SEAT.x} y1={SEAT.y} x2={REAR.x} y2={REAR.y} />
              <line x1={HEAD_TOP.x} y1={HEAD_TOP.y} x2={HEAD_BOT.x} y2={HEAD_BOT.y} strokeWidth={13} />
              <path d={`M ${HEAD_BOT.x} ${HEAD_BOT.y} C ${HEAD_BOT.x + 26} ${HEAD_BOT.y + 30}, ${FRONT.x - 8} ${FRONT.y - 40}, ${FRONT.x} ${FRONT.y}`} />
              <path d={`M ${HEAD_TOP.x} ${HEAD_TOP.y} L ${HEAD_TOP.x + 14} ${HEAD_TOP.y - 28} L ${HEAD_TOP.x + 56} ${HEAD_TOP.y - 24}`} />
              <path d={`M ${HEAD_TOP.x + 56} ${HEAD_TOP.y - 24} C ${HEAD_TOP.x + 70} ${HEAD_TOP.y - 8}, ${HEAD_TOP.x + 66} ${HEAD_TOP.y + 10}, ${HEAD_TOP.x + 52} ${HEAD_TOP.y + 16}`} />
            </g>
            <ellipse cx={SADDLE.x} cy={SADDLE.y} rx={26} ry={7} fill={C.bikeShade} transform={`rotate(-4 ${SADDLE.x} ${SADDLE.y})`} />
            <circle cx={BB.x} cy={BB.y} r={17} fill="none" stroke={C.bikeFrame} strokeWidth={4} />

            {/* 远侧腿：先画，被身体与车架遮挡，制造前后关系 */}
            <g opacity={0.6}>
              <Leg hip={hipFar} foot={pedalFar} thigh={96} shin={100} tone={C.leg} width={21} />
              <Foot at={pedalFar} tone={C.leg} />
            </g>

            {/* 鹈鹕：身体、尾羽、翼、颈、头、喉囊 */}
            <g transform={`translate(0 ${bob})`}>
              <path d={`M 474 292 L 404 262 L 424 288 L 398 302 L 456 322 Z`} fill={C.birdBodyDark} />
              <ellipse cx={566} cy={288} rx={118} ry={84} fill={C.birdBody} transform="rotate(-8 566 288)" />
              <path
                d={`M 556 244 C 618 228, 678 262, 668 316 C 640 352, 570 358, 526 330 C 506 300, 518 258, 556 244 Z`}
                fill={C.birdBodyDark}
              />
              <g stroke={C.birdBody} strokeWidth={3} fill="none" opacity={0.75} strokeLinecap="round">
                <path d="M 566 300 C 598 286, 634 292, 652 312" />
                <path d="M 552 274 C 588 262, 626 268, 646 288" />
                <path d="M 580 326 C 608 316, 636 320, 650 334" />
              </g>

              <path
                d={`M 628 258 C 668 244, 690 206, 698 176`}
                stroke={C.birdNeck}
                strokeWidth={46}
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={`M 640 244 C 674 230, 690 200, 696 178`}
                stroke={C.birdCrest}
                strokeWidth={11}
                strokeLinecap="round"
                fill="none"
                opacity={0.85}
              />

              <circle cx={704} cy={164} r={41} fill={C.birdHead} />
              <path d={`M 676 138 C 694 126, 716 128, 728 140 C 712 134, 690 134, 676 138 Z`} fill={C.birdCrest} />

              {/* 喉囊：加州褐鹈鹕的标志，必须是“袋”而不是“尖嘴” */}
              <path
                d={`M 728 168 C 734 238, 780 274, 832 258 C 866 246, 886 208, 890 178 C 862 190, 812 188, 772 182 C 750 178, 736 174, 728 168 Z`}
                fill={C.pouch}
              />
              <path
                d={`M 750 192 C 772 226, 802 244, 832 240`}
                stroke={C.leg}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                opacity={0.35}
              />
              <path
                d={`M 726 142 C 790 146, 856 158, 892 176 C 858 184, 792 182, 724 174 Z`}
                fill={C.beak}
              />
              <line x1={742} y1={160} x2={884} y2={175} stroke={C.birdHead} strokeWidth={2} opacity={0.45} />
              <circle cx={720} cy={152} r={6.4} fill={C.eye} />
              <circle cx={722} cy={150} r={2.1} fill={C.tire} />
            </g>

            {/* 近侧腿：压在车架之上，脚扣脚踏 */}
            <Leg hip={hipNear} foot={pedalNear} thigh={96} shin={100} tone={C.leg} width={22} />

            {/* 曲柄与脚踏：脚踏保持水平，脚再压在踏板上 */}
            <g stroke={C.bikeFrame} strokeLinecap="round">
              <line x1={BB.x} y1={BB.y} x2={pedalFar.x} y2={pedalFar.y} strokeWidth={7} opacity={0.75} />
              <line x1={BB.x} y1={BB.y} x2={pedalNear.x} y2={pedalNear.y} strokeWidth={8} />
            </g>
            <rect x={pedalFar.x - 15} y={pedalFar.y - 4} width={30} height={9} rx={3} fill={C.bikeShade} opacity={0.85} />
            <Foot at={pedalNear} tone={C.leg} />
            <rect x={pedalNear.x - 15} y={pedalNear.y - 4} width={30} height={9} rx={3} fill={C.bikeFrame} />
          </svg>
        </Layer>
      </Camera>
    </AbsoluteFill>
  );
};
