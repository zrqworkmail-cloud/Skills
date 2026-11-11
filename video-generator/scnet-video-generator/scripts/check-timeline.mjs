#!/usr/bin/env node
/**
 * 时间轴闭合校验（门禁 G3）
 *
 * 用法：node scripts/check-timeline.mjs <timeline.json>
 * 退出码：0 通过；1 校验失败；2 参数或读取错误
 *
 * 转场账：镜头自带 transition 时，渲染端把转场帧补在序列尾部，两镜重叠，
 * 所以 成片帧数 = Σ(镜头帧 + 出镜转场帧) − Σ 出镜转场帧 = Σ 镜头帧。
 * 硬切不写 transition 字段，等价于 0 帧重叠。
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const MAX_TRANSITION_FRAMES = 24;
const TRANSITION_TYPES = new Set(['fade', 'wipe']);
const WIPE_DIRECTIONS = new Set([
  'from-left',
  'from-top-left',
  'from-top',
  'from-top-right',
  'from-right',
  'from-bottom-right',
  'from-bottom',
  'from-bottom-left',
]);
const CARD_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const file = process.argv[2];
if (!file) {
  console.error('用法: node scripts/check-timeline.mjs <timeline.json>');
  process.exit(2);
}

let timeline;
try {
  // 去掉 Windows 编辑器可能写入的 BOM
  timeline = JSON.parse(readFileSync(resolve(file), 'utf8').replace(/^\uFEFF/, ''));
} catch (err) {
  console.error(`无法解析 ${file}: ${err.message}`);
  process.exit(2);
}

const errors = [];
const warnings = [];
const {fps, durationInFrames, shots} = timeline;
const list = Array.isArray(shots) ? shots : [];

if (!Number.isInteger(fps) || fps <= 0) errors.push('fps 必须是正整数');
if (!Number.isInteger(durationInFrames) || durationInFrames <= 0) {
  errors.push('durationInFrames 必须是正整数');
}
if (list.length === 0) errors.push('shots 不能为空数组');

let cursor = 0;
let overlapFrames = 0;
let transitionCount = 0;
const seen = new Set();

for (const [i, shot] of list.entries()) {
  const label = `shots[${i}]${shot?.id ? `(${shot.id})` : ''}`;
  const next = list[i + 1];

  if (!shot?.id) errors.push(`${label}: 缺少 id`);
  else if (seen.has(shot.id)) errors.push(`${label}: id 重复`);
  else seen.add(shot.id);

  if (!Number.isInteger(shot?.frames) || shot.frames <= 0) {
    errors.push(`${label}: frames 必须是正整数`);
    continue;
  }

  if (shot.from !== undefined) {
    if (!Number.isInteger(shot.from)) errors.push(`${label}: from 必须是整数`);
    else if (shot.from !== cursor) errors.push(`${label}: from=${shot.from}，应为 ${cursor}`);
  }

  if (shot.transition !== undefined) {
    const transition = shot.transition;
    if (next === undefined) {
      errors.push(`${label}: 最后一镜不能再接转场，删掉 transition`);
    } else if (typeof transition !== 'object' || transition === null || Array.isArray(transition)) {
      errors.push(`${label}: transition 必须是对象`);
    } else {
      if (!TRANSITION_TYPES.has(transition.type)) {
        errors.push(`${label}: transition.type 只能是 fade / wipe；硬切请直接不写 transition`);
      }
      if (transition.direction !== undefined && !WIPE_DIRECTIONS.has(transition.direction)) {
        errors.push(`${label}: transition.direction 取值为 ${[...WIPE_DIRECTIONS].join(' / ')}`);
      }
      if (transition.card !== undefined && !CARD_ID.test(String(transition.card))) {
        errors.push(`${label}: transition.card 必须是卡片 id（小写短横线）`);
      }

      if (!Number.isInteger(transition.frames) || transition.frames <= 0) {
        errors.push(`${label}: transition.frames 必须是正整数`);
      } else {
        const frames = transition.frames;
        if (frames > MAX_TRANSITION_FRAMES) {
          warnings.push(`${label}: 转场 ${frames} 帧超过 ${MAX_TRANSITION_FRAMES} 帧，观众会等它演完`);
        }
        if (Number.isInteger(next?.frames) && next.frames > 0) {
          const bound = Math.min(shot.frames, next.frames);
          if (frames >= bound) {
            errors.push(`${label}: 转场 ${frames} 帧 ≥ 相邻较短镜 ${bound} 帧，重叠会吃掉整镜`);
          }
        }
        overlapFrames += frames;
        transitionCount += 1;
      }
    }
  }

  cursor += shot.frames;
}

if (Number.isInteger(durationInFrames) && cursor !== durationInFrames) {
  errors.push(
    `镜头总帧 ${cursor} ≠ durationInFrames ${durationInFrames}（转场靠重叠，不从总帧里另扣）`,
  );
}

const visibleFrames = Math.max(0, cursor - overlapFrames);
const asl = list.length > 0 && fps > 0 ? visibleFrames / list.length / fps : 0;
if (asl > 0 && asl < 1.2) warnings.push(`平均镜头长度 ${asl.toFixed(2)}s 偏快，确认字幕能读完`);
if (asl > 6) warnings.push(`平均镜头长度 ${asl.toFixed(2)}s 偏慢，确认信息密度`);

console.table(
  list.map((shot, i) => ({
    '#': String(i + 1).padStart(2, '0'),
    id: shot?.id ?? '-',
    size: shot?.size ?? '-',
    move: shot?.move ?? '-',
    frames: shot?.frames ?? '-',
    out: shot?.transition
      ? `${shot.transition.type} ${shot.transition.frames ?? '?'}`
      : 'cut',
    sec: Number.isInteger(shot?.frames) && fps > 0 ? (shot.frames / fps).toFixed(2) : '-',
  })),
);

console.log(
  `\n镜头数 ${list.length}｜成片 ${cursor} 帧｜时长 ${
    fps > 0 ? (cursor / fps).toFixed(2) : '-'
  }s｜平均镜头长度 ${asl.toFixed(2)}s`,
);
console.log(
  `  转场：${transitionCount} 处重叠共 ${overlapFrames} 帧；序列合计 ${
    cursor + overlapFrames
  } 帧 − 重叠 ${overlapFrames} = 成片 ${cursor} 帧`,
);

for (const warning of warnings) console.warn(`⚠ ${warning}`);

if (errors.length > 0) {
  console.error('\n✗ 校验失败：');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('\n✓ PASS 时间轴闭合');
