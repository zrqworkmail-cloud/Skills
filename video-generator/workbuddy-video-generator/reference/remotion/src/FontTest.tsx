import React from 'react';
import { AbsoluteFill } from 'remotion';

const rows = [
  { name: 'Bahnschrift · DIN 风', font: '"Bahnschrift", "DIN Alternate", sans-serif', weight: 700 },
  { name: 'Agency FB · 工业科幻', font: '"Agency FB", "Agency", sans-serif', weight: 700 },
  { name: 'Cascadia Mono · 终端感', font: '"Cascadia Mono", "Consolas", monospace', weight: 700 },
  { name: 'Consolas · 代码感', font: '"Consolas", monospace', weight: 700 },
  { name: 'OCR A Extended · 仪表感', font: '"OCR A Extended", monospace', weight: 400 },
  { name: 'Arial · 当前', font: 'Arial, sans-serif', weight: 800 },
];

export const FontTest: React.FC = () => (
  <AbsoluteFill style={{ background: '#03050A', padding: '44px 80px' }}>
    <div style={{ fontFamily: '"Microsoft YaHei", sans-serif', fontSize: 26, fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
      数字字体对比 · 400B / 17B
    </div>
    <div style={{ fontFamily: '"Microsoft YaHei", sans-serif', fontSize: 15, color: '#A9C0D8', marginBottom: 26 }}>
      同一字号下的字形、字宽与可读性对比；重点看 0/O、1/l、逗号间距。
    </div>
    {rows.map((r) => (
      <div key={r.name} style={{ display: 'flex', alignItems: 'baseline', gap: 36, marginBottom: 22 }}>
        <div style={{ width: 300, fontFamily: '"Microsoft YaHei", sans-serif', fontSize: 17, color: '#A9C0D8' }}>{r.name}</div>
        <div style={{ fontFamily: r.font, fontWeight: r.weight, fontSize: 52, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          400,000,000,000
        </div>
        <div style={{ fontFamily: r.font, fontWeight: r.weight, fontSize: 34, color: '#F5C26B', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          17,000,000,000
        </div>
      </div>
    ))}
  </AbsoluteFill>
);
