import React from 'react';
import {AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../../../../assets/templates/theme';
import {Camera, moves} from '../../../../assets/templates/Camera';
import {CLAMP, easeOut, rise, springIn, stagger} from '../../../../assets/templates/anim';
import timeline from './timeline.json';

/**
 * 30 秒样片：用 assets/cards/ 里的六张卡拼一条完整片子。
 *
 * 帧数不写死，全部取自 timeline.json —— 门禁校验的与实际渲染的是同一份数据。
 */

type SpotShot = {
  id: string;
  frames: number;
  props: {headline: string; sub?: string};
};

const shots = timeline.shots as SpotShot[];

const S01Title: React.FC<{headline: string; sub?: string}> = ({headline, sub}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const wipe = easeOut(frame, 22);
  const title = springIn(frame, fps, 2, {damping: 18});
  const line = springIn(frame, fps, 14, {damping: 22});

  return (
    <AbsoluteFill style={{backgroundColor: theme.color.bg, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          ...rise(title, 44),
          color: theme.color.ink,
          fontSize: theme.type.display,
          fontWeight: theme.weight.black,
          letterSpacing: -1.5,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          ...rise(line, 20),
          marginTop: theme.space(3),
          color: theme.color.muted,
          fontSize: theme.type.body,
        }}
      >
        {sub}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.color.accentAlt,
          transform: `translateX(${wipe * 100}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const ROWS = [
  {id: 'S01', size: 'wide', frames: 60, recipe: 'title-mask-reveal'},
  {id: 'S02', size: 'medium', frames: 72, recipe: 'push-in-reveal'},
  {id: 'S03', size: 'close', frames: 48, recipe: 'end-card-lockup'},
];

const S02ShotTable: React.FC<{headline: string}> = ({headline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const push = easeOut(frame, 180);

  return (
    <AbsoluteFill style={{backgroundColor: theme.color.bg}}>
      <Camera {...moves.push(push, 1, 1.08)}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{width: 1120}}>
            <div
              style={{
                ...rise(springIn(frame, fps, 0, {damping: 20}), 24),
                color: theme.color.ink,
                fontSize: theme.type.h1,
                fontWeight: theme.weight.bold,
                marginBottom: theme.space(5),
              }}
            >
              {headline}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 180px 140px 1fr',
                rowGap: theme.space(2),
                fontFamily: theme.font,
              }}
            >
              {['镜头', '景别', '帧数', '配方卡'].map((label) => (
                <div key={label} style={{color: theme.color.muted, fontSize: theme.type.caption}}>
                  {label}
                </div>
              ))}
              {ROWS.map((row, index) => {
                const enter = springIn(frame, fps, 10 + stagger(index, 5), {damping: 20});
                return (
                  <React.Fragment key={row.id}>
                    {[row.id, row.size, String(row.frames), row.recipe].map((cell, column) => (
                      <div
                        key={column}
                        style={{
                          ...rise(enter, 16),
                          color: column === 3 ? theme.color.accent : theme.color.ink,
                          fontSize: theme.type.body,
                          fontWeight: column === 0 ? theme.weight.bold : theme.weight.regular,
                          paddingBottom: theme.space(2),
                          borderBottom: `1px solid ${theme.color.faint}`,
                        }}
                      >
                        {cell}
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};

const GATES = [
  {tag: 'G1', title: '时长闭合', desc: 'Σ 镜头帧 = 总帧'},
  {tag: 'G2', title: '分镜审批', desc: '六要素齐全'},
  {tag: 'G3', title: '时间轴闭合', desc: '无空洞、无重叠'},
];

const S03Gates: React.FC<{headline: string}> = ({headline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = springIn(frame, fps, 0, {damping: 22});

  return (
    <AbsoluteFill style={{backgroundColor: theme.color.bg, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          ...rise(title, 20),
          position: 'absolute',
          top: theme.safe.landscape.top,
          left: theme.safe.landscape.x,
          color: theme.color.ink,
          fontSize: theme.type.h2,
          fontWeight: theme.weight.bold,
        }}
      >
        {headline}
      </div>
      {GATES.map((gate, index) => {
        const enter = springIn(frame, fps, 8 + stagger(index, 6), {damping: 18});
        const offset = (index - 1) * 400;
        return (
          <div
            key={gate.tag}
            style={{
              position: 'absolute',
              width: 480,
              height: 230,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.surface,
              border: `1px solid ${theme.color.faint}`,
              transform: `translate(${offset}px, ${(index - 1) * 20}px) rotate(${(index - 1) * 2}deg) scale(${0.94 + enter * 0.06})`,
              opacity: enter,
              padding: theme.space(4),
              zIndex: index,
            }}
          >
            <div style={{color: theme.color.accent, fontSize: theme.type.h2, fontWeight: theme.weight.black}}>
              {gate.tag}
            </div>
            <div style={{color: theme.color.ink, fontSize: theme.type.h2, marginTop: theme.space(1)}}>{gate.title}</div>
            <div style={{color: theme.color.muted, fontSize: theme.type.caption, marginTop: theme.space(1)}}>
              {gate.desc}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const BARS = [
  {label: '分镜', value: 46},
  {label: '实现', value: 31},
  {label: '交付', value: 12},
];

const S04Bars: React.FC<{headline: string}> = ({headline}) => {
  const frame = useCurrentFrame();
  const title = springIn(frame, 30, 0, {damping: 22});

  return (
    <AbsoluteFill style={{backgroundColor: theme.color.bg, justifyContent: 'center'}}>
      <div style={{paddingLeft: theme.safe.landscape.x, width: '100%'}}>
        <div
          style={{
            ...rise(title, 20),
            color: theme.color.ink,
            fontSize: theme.type.h1,
            fontWeight: theme.weight.bold,
            marginBottom: theme.space(6),
          }}
        >
          {headline}
        </div>
        <div style={{width: 1180}}>
          {BARS.map((bar, index) => {
            const progress = easeOut(Math.max(0, frame - 12 - stagger(index, 10)), 30);
            const width = interpolate(progress, [0, 1], [0, bar.value], CLAMP);
            return (
              <div
                key={bar.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr 120px',
                  alignItems: 'center',
                  marginBottom: theme.space(3),
                }}
              >
                <div style={{color: theme.color.muted, fontSize: theme.type.body}}>{bar.label}</div>
                <div style={{height: 28, backgroundColor: theme.color.surface, borderRadius: theme.radius.pill}}>
                  <div
                    style={{
                      width: `${width}%`,
                      height: '100%',
                      backgroundColor: index === 0 ? theme.color.accent : theme.color.accentAlt,
                      borderRadius: theme.radius.pill,
                    }}
                  />
                </div>
                <div
                  style={{
                    color: theme.color.ink,
                    fontSize: theme.type.body,
                    fontWeight: theme.weight.bold,
                    textAlign: 'right',
                  }}
                >
                  {Math.round(width)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S05Words: React.FC<{headline: string}> = ({headline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: theme.color.bg, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{display: 'flex', color: theme.color.ink, fontSize: theme.type.display, fontWeight: theme.weight.black}}>
        {[...headline].map((char, index) => {
          const enter = springIn(frame, fps, stagger(index, 2), {damping: 16});
          return (
            <span
              key={index}
              style={{
                display: 'inline-block',
                whiteSpace: 'pre',
                transform: `translateY(${(1 - enter) * 40}px)`,
                opacity: enter,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const S06End: React.FC<{headline: string; sub?: string}> = ({headline, sub}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = springIn(frame, fps, 0, {damping: 24});
  const rule = easeOut(frame, 24);
  const caption = springIn(frame, fps, 16, {damping: 22});

  return (
    <AbsoluteFill style={{backgroundColor: theme.color.bg, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          ...rise(title, 28),
          color: theme.color.ink,
          fontSize: theme.type.display,
          fontWeight: theme.weight.black,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          width: 520 * rule,
          height: 4,
          marginTop: theme.space(4),
          backgroundColor: theme.color.accent,
          borderRadius: theme.radius.pill,
        }}
      />
      <div
        style={{
          ...rise(caption, 16),
          marginTop: theme.space(3),
          color: theme.color.muted,
          fontSize: theme.type.body,
        }}
      >
        {sub}
      </div>
    </AbsoluteFill>
  );
};

const SCENES: Record<string, React.FC<{headline: string; sub?: string}>> = {
  S01: S01Title,
  S02: S02ShotTable,
  S03: S03Gates,
  S04: S04Bars,
  S05: S05Words,
  S06: S06End,
};

export const Spot30: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.color.bg}}>
    <Series>
      {shots.map((shot) => {
        const Scene = SCENES[shot.id];
        return (
          <Series.Sequence key={shot.id} durationInFrames={shot.frames}>
            <Scene {...shot.props} />
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
