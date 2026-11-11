import React from 'react';
import {AbsoluteFill} from 'remotion';
import {theme} from '../../../assets/templates/theme';

/**
 * 静态插画：白鵜鶘骑马自転车。
 *
 * 由原版提示词的一次性产物修正而来，保留其构图与配色，只修连接点与比例：
 *   1. 囊两端锁在喙根与喙尖内侧，喙尖下钩；
 *   2. 曲柄端点 = 踏板中心 = 脚掌落点，共用同一坐标；
 *   3. 颈根移到胸前，头径约为体长 1/4；
 *   4. 翼给出体积与黑色飞羽，尾羽收成短方尾。
 */

const C = theme.illo;

const BB = {x: 560, y: 512};
const CRANK = 44;
const deg = (d: number) => (d * Math.PI) / 180;

const pedalAt = (angle: number) => ({
  x: BB.x + Math.cos(deg(angle)) * CRANK,
  y: BB.y + Math.sin(deg(angle)) * CRANK,
});

const NEAR = pedalAt(40);
const FAR = pedalAt(220);

const WheelSpokes: React.FC<{cx: number; cy: number; r: number}> = ({cx, cy, r}) => (
  <g stroke={C.bikeShade} strokeWidth={2} opacity={0.85}>
    {Array.from({length: 8}, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={cx + Math.cos(a) * 10}
          y1={cy + Math.sin(a) * 10}
          x2={cx + Math.cos(a) * (r - 6)}
          y2={cy + Math.sin(a) * (r - 6)}
        />
      );
    })}
  </g>
);

export const PelicanStill: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.skyTop}}>
    <svg viewBox="0 0 1200 700" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      {/* 环境 */}
      <rect x={0} y={0} width={1200} height={700} fill={C.skyBottom} />
      <circle cx={988} cy={148} r={72} fill={C.sun} opacity={0.12} />
      <path d="M 0 540 C 180 508, 330 528, 470 516 C 620 504, 760 528, 900 518 C 1020 510, 1110 500, 1200 512 L 1200 700 L 0 700 Z" fill={C.hillFar} />
      <rect x={0} y={598} width={1200} height={102} fill={C.ground} />
      <line x1={0} y1={598} x2={1200} y2={598} stroke={C.road} strokeWidth={2.5} />

      {/* 后轮 / 前轮 */}
      <circle cx={440} cy={480} r={118} fill="none" stroke={C.tire} strokeWidth={8} />
      <WheelSpokes cx={440} cy={480} r={118} />
      <circle cx={440} cy={480} r={9} fill={C.bikeShade} />
      <circle cx={780} cy={480} r={118} fill="none" stroke={C.tire} strokeWidth={8} />
      <WheelSpokes cx={780} cy={480} r={118} />
      <circle cx={780} cy={480} r={9} fill={C.bikeShade} />

      {/* 远侧腿与脚踏：在车架之后，制造前后关系 */}
      <g opacity={0.8}>
        <g stroke={C.pouch} strokeLinecap="round" fill="none">
          <line x1={528} y1={358} x2={556} y2={424} strokeWidth={12} />
          <line x1={556} y1={424} x2={FAR.x} y2={FAR.y} strokeWidth={9} />
        </g>
        <rect x={FAR.x - 15} y={FAR.y - 4} width={30} height={8} rx={3} fill={C.bikeShade} />
        <line x1={BB.x} y1={BB.y} x2={FAR.x} y2={FAR.y} stroke={C.bikeShade} strokeWidth={7} strokeLinecap="round" />
        <path
          d={`M ${FAR.x - 12} ${FAR.y - 8} L ${FAR.x + 20} ${FAR.y - 6} L ${FAR.x + 16} ${FAR.y + 2} L ${FAR.x - 10} ${FAR.y + 1} Z`}
          fill={C.pouch}
        />
      </g>

      {/* 链条 */}
      <g stroke={C.bikeShade} strokeWidth={3} strokeDasharray="6 4">
        <line x1={560} y1={503} x2={440} y2={472} />
        <line x1={560} y1={521} x2={440} y2={488} />
      </g>

      {/* 车架 */}
      <g stroke={C.bikeFrame} strokeWidth={8} strokeLinecap="round" fill="none">
        <line x1={560} y1={512} x2={532} y2={352} />
        <line x1={532} y1={352} x2={726} y2={364} />
        <line x1={560} y1={512} x2={740} y2={410} />
        <line x1={560} y1={512} x2={440} y2={480} />
        <line x1={532} y1={352} x2={440} y2={480} />
        <line x1={726} y1={364} x2={740} y2={410} strokeWidth={12} />
        <path d="M 740 410 C 758 438, 772 462, 780 480" />
        <path d="M 726 364 L 736 338 L 780 344" />
        <path d="M 780 344 C 792 360, 788 376, 776 380" />
      </g>
      <ellipse cx={524} cy={344} rx={24} ry={6} fill={C.bikeShade} />
      <circle cx={560} cy={512} r={15} fill="none" stroke={C.bikeFrame} strokeWidth={4} />

      {/* 尾羽：短方尾，与身体齐平 */}
      <path d="M 476 294 L 450 298 L 448 320 L 478 320 Z" fill={C.tire} />

      {/* 身体 */}
      <ellipse cx={572} cy={282} rx={106} ry={72} fill={C.tire} transform="rotate(-12 572 282)" />

      {/* 翼：覆羽给出体积，黑色飞羽独立露在体侧后缘 */}
      <path
        d="M 522 260 C 568 242, 624 260, 644 298 C 622 330, 570 336, 534 316 C 514 300, 510 276, 522 260 Z"
        fill={C.bikeShade}
        opacity={0.28}
      />
      <g stroke={C.bikeShade} strokeWidth={2} fill="none" opacity={0.6} strokeLinecap="round">
        <path d="M 540 292 C 566 280, 600 284, 620 300" />
        <path d="M 536 308 C 562 298, 594 302, 612 316" />
      </g>
      <g stroke={C.bikeShade} strokeWidth={2.4} fill="none" opacity={0.55} strokeLinecap="round">
        <path d="M 524 262 C 570 246, 616 260, 640 294" />
      </g>
      <path d="M 492 300 C 508 296, 522 302, 530 312 L 520 320 C 510 312, 498 310, 490 312 Z" fill={C.eye} />

      {/* 颈：从胸前起，收进头底 */}
      <path d="M 652 268 C 686 252, 694 216, 696 192" stroke={C.tire} strokeWidth={26} strokeLinecap="round" fill="none" />

      {/* 头 */}
      <circle cx={698} cy={172} r={28} fill={C.tire} />
      <path d="M 672 152 C 686 140, 708 140, 718 150 C 704 144, 684 146, 672 152 Z" fill={C.birdHead} />
      <circle cx={710} cy={164} r={4.4} fill={C.eye} />
      <circle cx={711} cy={162.6} r={1.4} fill={C.tire} />

      {/* 喉囊：两端锁在喙根与喙尖内侧 */}
      <path
        d="M 718 168 C 724 214, 758 246, 798 244 C 832 242, 854 214, 858 190 C 838 202, 804 206, 776 198 C 752 191, 730 178, 718 168 Z"
        fill={C.pouch}
      />
      {/* 上喙：尖端下钩 */}
      <path
        d="M 718 158 C 770 162, 828 172, 866 182 C 872 185, 870 194, 860 191 C 824 186, 768 178, 716 170 Z"
        fill={C.beak}
      />
      <path d="M 726 166 C 762 170, 800 176, 838 183" stroke={C.pouch} strokeWidth={2} opacity={0.55} fill="none" />

      {/* 近侧腿：髋 → 膝 → 踏，脚踏中心即脚掌落点 */}
      <g stroke={C.beak} strokeLinecap="round" fill="none">
        <line x1={548} y1={352} x2={612} y2={446} strokeWidth={13} />
        <line x1={612} y1={446} x2={NEAR.x} y2={NEAR.y} strokeWidth={10} />
      </g>

      {/* 近侧曲柄与脚踏 */}
      <line x1={560} y1={512} x2={NEAR.x} y2={NEAR.y} stroke={C.bikeFrame} strokeWidth={7} strokeLinecap="round" />
      <rect x={NEAR.x - 15} y={NEAR.y - 4} width={30} height={8} rx={3} fill={C.bikeFrame} />
      <path
        d={`M ${NEAR.x - 11} ${NEAR.y - 7} L ${NEAR.x + 20} ${NEAR.y - 6} L ${NEAR.x + 16} ${NEAR.y + 1} L ${NEAR.x - 10} ${NEAR.y} Z`}
        fill={C.beak}
      />
    </svg>
  </AbsoluteFill>
);
