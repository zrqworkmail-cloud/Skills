import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { SCENES, TOTAL_FRAMES, SceneDef } from './llama4moe/scenes';
import { Frame, Sub } from './llama/ui';

const Shot: React.FC<{ scene: SceneDef; start: number; idx: number }> = ({ scene, start, idx }) => {
  const f = useCurrentFrame();
  const dur = scene.dur * 24;
  const progress = Math.min(1, (start + f) / TOTAL_FRAMES);
  // 整幅缓慢推拉 + 平移：保证任意 3s 内都有可测变化（静态图表风专用）
  const zoom = 1 + 0.035 * (1 - Math.cos(f / 36));
  const panX = 18 * Math.sin(f / 26);
  const panY = 8 * Math.cos(f / 31);
  return (
    <AbsoluteFill>
      <Frame section={scene.section} index={`${String(idx).padStart(2, '0')} / ${SCENES.length}`} progress={progress}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '50% 42%',
          }}
        >
          {scene.render({ f, dur, progress })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 240,
            top: -240 + ((f % 110) / 110) * 1320,
            background:
              'linear-gradient(180deg, rgba(200,69,45,0) 0%, rgba(200,69,45,0.06) 40%, rgba(200,69,45,0.10) 50%, rgba(200,69,45,0.06) 60%, rgba(200,69,45,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      </Frame>
      {scene.sub.length > 0 && <Sub f={f} lines={scene.sub} />}
    </AbsoluteFill>
  );
};

export const Llama4MoE: React.FC = () => {
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
