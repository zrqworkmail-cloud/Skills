#!/usr/bin/env node
/**
 * 时间轴闭合校验（门禁 G3）
 *
 * 用法：node scripts/check-timeline.mjs <timeline.json>
 * 退出码：0 通过；1 校验失败；2 参数或读取错误
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

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
const seen = new Set();

for (const [i, shot] of list.entries()) {
  const label = `shots[${i}]${shot?.id ? `(${shot.id})` : ''}`;

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

  cursor += shot.frames;
}

if (Number.isInteger(durationInFrames) && cursor !== durationInFrames) {
  errors.push(`镜头总帧 ${cursor} ≠ durationInFrames ${durationInFrames}`);
}

const asl = list.length > 0 && fps > 0 ? cursor / list.length / fps : 0;
if (asl > 0 && asl < 1.2) warnings.push(`平均镜头长度 ${asl.toFixed(2)}s 偏快，确认字幕能读完`);
if (asl > 6) warnings.push(`平均镜头长度 ${asl.toFixed(2)}s 偏慢，确认信息密度`);

console.table(
  list.map((shot, i) => ({
    '#': String(i + 1).padStart(2, '0'),
    id: shot?.id ?? '-',
    size: shot?.size ?? '-',
    move: shot?.move ?? '-',
    frames: shot?.frames ?? '-',
    sec: Number.isInteger(shot?.frames) && fps > 0 ? (shot.frames / fps).toFixed(2) : '-',
  })),
);

console.log(
  `\n镜头数 ${list.length}｜总帧 ${cursor}｜时长 ${
    fps > 0 ? (cursor / fps).toFixed(2) : '-'
  }s｜平均镜头长度 ${asl.toFixed(2)}s`,
);

for (const warning of warnings) console.warn(`⚠ ${warning}`);

if (errors.length > 0) {
  console.error('\n✗ 校验失败：');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('\n✓ PASS 时间轴闭合');
