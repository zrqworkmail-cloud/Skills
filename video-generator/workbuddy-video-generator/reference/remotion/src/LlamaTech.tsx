import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { SCENES, TOTAL_FRAMES, SceneDef } from './llama/scenes';
import { Frame, Sub } from './llama/ui';

const Shot: React.FC<{ scene: SceneDef; start: number; idx: number }> = ({ scene, start, idx }) => {
  const f = useCurrentFrame(); // Sequence 内为局部帧
  const dur = scene.dur * 24;
  const progress = Math.min(1, (start + f) / TOTAL_FRAMES);
  return (
    <AbsoluteFill>
      <Frame section={scene.section} index={`${String(idx).padStart(2, '0')} / ${SCENES.length}`} progress={progress}>
        {/* 持续运动：整幅缓慢推近 + 轻微下移，保证任意 3s 内都有可测变化 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${1 + 0.05 * (f / dur)}) translateY(${-12 * (f / dur)}px)`,
            transformOrigin: '50% 42%',
          }}
        >
          {scene.render({ f, dur, progress })}
        </div>
        {/* 扫描线：大面积持续位移，保证任意 3s 内都有可测变化（技能认可的实体动作） */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 260,
            top: -260 + ((f % 120) / 120) * 1340,
            background: 'linear-gradient(180deg, rgba(200,69,45,0) 0%, rgba(200,69,45,0.07) 35%, rgba(200,69,45,0.12) 50%, rgba(200,69,45,0.07) 65%, rgba(200,69,45,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      </Frame>
      {scene.sub.length > 0 && <Sub f={f} lines={scene.sub} />}
    </AbsoluteFill>
  );
};

export const LlamaTech: React.FC = () => {
  let acc = 0;
  const items = SCENES.map((s) => {
    const start = acc;
    acc += s.dur * 24;
    return { s, start };
  });

  return (
    <AbsoluteFill style={{ background: '#F6F4EF' }}>
      {items.map(({ s, start }, i) => (
        <Sequence key={s.id} from={start} durationInFrames={s.dur * 24}>
          <Shot scene={s} start={start} idx={i + 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export { TOTAL_FRAMES };
