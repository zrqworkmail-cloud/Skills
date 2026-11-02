import React from 'react';
import { Composition } from 'remotion';
import { SixCanals } from './SixCanals';
import { PelicanBike } from './PelicanBike';
import { LaoGanMa } from './LaoGanMa';
import { Cover } from './Cover';
import { Mirror } from './Mirror';
import { MirrorCover } from './MirrorCover';
import { Chenqiao } from './Chenqiao';
import { ChenqiaoCover } from './ChenqiaoCover';
import { ChenqiaoCover43, ChenqiaoCover34 } from './ChenqiaoCovers';
import { LlamaTech, TOTAL_FRAMES as LLAMA_FRAMES } from './LlamaTech';
import { Llama4MoE, TOTAL_FRAMES as LLAMA4MOE_FRAMES } from './Llama4MoE';
import { Llama4MoECover } from './Llama4MoECover';
import { Llama4MoESample } from './Llama4MoESample';
import { Llama4MoESampleV2 } from './Llama4MoESampleV2';
import { Llama4MoESampleV3 } from './Llama4MoESampleV3';
import { Llama4MoESampleV4 } from './Llama4MoESampleV4';
import { Llama4MoESampleV5 } from './Llama4MoESampleV5';
import { Llama4MoESampleV6 } from './Llama4MoESampleV6';
import { Llama4MoESampleV7 } from './Llama4MoESampleV7';
import { Llama4MoEShot02 } from './Llama4MoEShot02';
import { FontTest } from './FontTest';

// 与管线原生规格严格一致：704×1280 / 16fps / 121 帧 = 7.5625s
// 这样渲染产物可以直接当 sN.mp4 用，build_base_uniform 无需任何改动。
export const Root: React.FC = () => (
  <>
    <Composition
      id="SixCanals"
      component={SixCanals}
      durationInFrames={121}
      fps={16}
      width={704}
      height={1280}
    />
    {/* 鹈鹕测试的动画版：纯 SVG，零视频生成 */}
    <Composition
      id="PelicanBike"
      component={PelicanBike}
      durationInFrames={120}
      fps={24}
      width={1080}
      height={1080}
    />
    {/* 老干妈 AI 裁员传闻 · 辟谣科普短：全程代码渲染，1080×1920 / 24fps / 876 帧 = 36.5s */}
    <Composition
      id="LaoGanMa"
      component={LaoGanMa}
      durationInFrames={876}
      fps={24}
      width={1080}
      height={1920}
    />
    {/* 竖版封面：同样纯代码渲染，用 remotion still 出图 */}
    <Composition
      id="LgmCover"
      component={Cover}
      durationInFrames={1}
      fps={24}
      width={1080}
      height={1920}
    />
    {/* 镜子左右之谜 · 一般性知识科普短：全程代码渲染，1080×1920 / 24fps / 876 帧 = 36.5s */}
    <Composition
      id="Mirror"
      component={Mirror}
      durationInFrames={876}
      fps={24}
      width={1080}
      height={1920}
    />
    <Composition
      id="MirrorCover"
      component={MirrorCover}
      durationInFrames={1}
      fps={24}
      width={1080}
      height={1920}
    />
    {/* 黄袍加身之前 · 历史科普短（陈桥兵变）：插画剪影风，横版 1920×1080 / 24fps / 3276 帧 = 136.5s */}
    <Composition
      id="Chenqiao"
      component={Chenqiao}
      durationInFrames={5112}
      fps={24}
      width={1920}
      height={1080}
    />
    <Composition
      id="ChenqiaoCover"
      component={ChenqiaoCover}
      durationInFrames={1}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* 抖音封面：横 4:3 / 竖 3:4 */}
    <Composition
      id="ChenqiaoCover43"
      component={ChenqiaoCover43}
      durationInFrames={1}
      fps={24}
      width={1440}
      height={1080}
    />
    <Composition
      id="ChenqiaoCover34"
      component={ChenqiaoCover34}
      durationInFrames={1}
      fps={24}
      width={1080}
      height={1440}
    />
    {/* Llama 技术流 · 课堂汇报：横版 1920×1080 / 24fps / 540s */}
    <Composition
      id="LlamaTech"
      component={LlamaTech}
      durationInFrames={LLAMA_FRAMES}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* Llama 4 MoE · 知识分享短：横版 1920×1080 / 24fps / 290s */}
    <Composition
      id="Llama4MoE"
      component={Llama4MoE}
      durationInFrames={LLAMA4MOE_FRAMES}
      fps={24}
      width={1920}
      height={1080}
    />
    <Composition
      id="Llama4MoECover"
      component={Llama4MoECover}
      durationInFrames={1}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* 样片：Shot 01，10s，固定机位，零运镜 */}
    <Composition
      id="Llama4MoESample"
      component={Llama4MoESample}
      durationInFrames={168}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* 按 SDUFE 模板重做的样片：白底深蓝，7s */}
    <Composition
      id="Llama4MoESampleV2"
      component={Llama4MoESampleV2}
      durationInFrames={168}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* V3：V1 构图/动作 + SDUFE 模板深蓝/橙/白，7s */}
    <Composition
      id="Llama4MoESampleV3"
      component={Llama4MoESampleV3}
      durationInFrames={168}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* V4：严格按 PPT 页网格（36px 边距）+ 深蓝数据面板，7s */}
    <Composition
      id="Llama4MoESampleV4"
      component={Llama4MoESampleV4}
      durationInFrames={168}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* V5：单位云图（400 节点 = 400B，17 金点 = 17B），7s */}
    <Composition
      id="Llama4MoESampleV5"
      component={Llama4MoESampleV5}
      durationInFrames={168}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* V6：A+C 3D 神经星图，12s，1→2→400B→冲出屏幕→收缩→17 金点 */}
    <Composition
      id="Llama4MoESampleV6"
      component={Llama4MoESampleV6}
      durationInFrames={288}
      fps={24}
      width={1920}
      height={1080}
    />
    {/* V7：星云状 3D 神经图，推近核心→点亮→拉远露出星云，12s */}
    <Composition
      id="Llama4MoESampleV7"
      component={Llama4MoESampleV7}
      durationInFrames={240}
      fps={24}
      width={1920}
      height={1080}
    />
    <Composition
      id="Llama4MoEShot02"
      component={Llama4MoEShot02}
      durationInFrames={240}
      fps={24}
      width={1920}
      height={1080}
    />
    <Composition
      id="FontTest"
      component={FontTest}
      durationInFrames={1}
      fps={24}
      width={1920}
      height={1080}
    />
  </>
);
