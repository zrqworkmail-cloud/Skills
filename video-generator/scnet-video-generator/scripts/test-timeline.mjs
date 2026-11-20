#!/usr/bin/env node
/**
 * check-timeline.mjs 的回归测试
 *
 * 钉住「时间轴闭合」里最容易写错的两条规则，防止改校验逻辑时把拦截改没了：
 *   1. 末镜不能再接转场
 *   2. 转场重叠不能吃掉整镜
 * 另配一条正例，确保断言不是恒真（否则脚本永远 PASS）。
 *
 * 用法：node scripts/test-timeline.mjs
 * 退出码：0 全部通过；1 有用例失败；2 环境或读写错误
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const checker = join(here, 'check-timeline.mjs');

/** 基线：180 帧，一处叠化 12 帧，硬切两处 */
const base = () => ({
  fps: 30,
  durationInFrames: 180,
  shots: [
    {id: 'S01', frames: 60, transition: {type: 'fade', frames: 12}},
    {id: 'S02', frames: 72},
    {id: 'S03', frames: 48},
  ],
});

const lastShotWithTransition = () => {
  const timeline = base();
  timeline.shots[2].transition = {type: 'fade', frames: 12};
  return timeline;
};

const overlapEatsShot = () => {
  const timeline = base();
  timeline.shots[0].transition.frames = 60; // = 本镜帧数，整镜都被叠掉
  return timeline;
};

const totalMismatch = () => {
  const timeline = base();
  timeline.durationInFrames = 181;
  return timeline;
};

const cases = [
  {
    name: '正例：一处叠化 + 两处硬切',
    timeline: base(),
    expect: {
      code: 0,
      stdout: ['✓ PASS 时间轴闭合', '转场：1 处重叠共 12 帧', '成片 180 帧'],
      stderr: [],
    },
  },
  {
    name: '负例：末镜挂转场',
    timeline: lastShotWithTransition(),
    expect: {code: 1, stderr: ['最后一镜不能再接转场']},
  },
  {
    name: '负例：重叠吃掉整镜',
    timeline: overlapEatsShot(),
    expect: {code: 1, stderr: ['重叠会吃掉整镜']},
  },
  {
    name: '负例：总帧与镜头帧之和不符',
    timeline: totalMismatch(),
    expect: {code: 1, stderr: ['≠ durationInFrames']},
  },
];

let dir;
try {
  dir = mkdtempSync(join(tmpdir(), 'scnet-timeline-test-'));
} catch (error) {
  console.error(`无法创建临时目录：${error.message}`);
  process.exit(2);
}

let failed = 0;

cases.forEach((testCase, index) => {
  const label = `${index + 1}/${cases.length} ${testCase.name}`;
  const file = join(dir, `case-${index + 1}.json`);

  try {
    writeFileSync(file, `${JSON.stringify(testCase.timeline, null, 2)}\n`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${label}：写临时文件失败（${error.message}）`);
    return;
  }

  const result = spawnSync(process.execPath, [checker, file], {encoding: 'utf8'});
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const problems = [];

  if (result.error) {
    problems.push(`无法执行校验脚本：${result.error.message}`);
  } else if (result.status !== testCase.expect.code) {
    problems.push(`退出码 ${result.status}，期望 ${testCase.expect.code}`);
  }

  for (const needle of testCase.expect.stdout ?? []) {
    if (!stdout.includes(needle)) problems.push(`stdout 缺少「${needle}」`);
  }
  for (const needle of testCase.expect.stderr ?? []) {
    if (!stderr.includes(needle)) problems.push(`stderr 缺少「${needle}」`);
  }

  if (problems.length === 0) {
    console.log(`✓ ${label}（退出码 ${result.status}）`);
  } else {
    failed += 1;
    console.error(`✗ ${label}`);
    for (const problem of problems) console.error(`    - ${problem}`);
    if (result.status !== testCase.expect.code) {
      const tail = `${stderr}`.trim().split('\n').slice(-3).join('\n      ');
      if (tail) console.error(`    实际 stderr：\n      ${tail}`);
    }
  }
});

try {
  rmSync(dir, {recursive: true, force: true});
} catch {
  // 清理失败不影响结论，临时目录交给系统回收
}

if (failed > 0) {
  console.error(`\n✗ ${failed}/${cases.length} 个用例未通过`);
  process.exit(1);
}

console.log(`\n✓ PASS 时间轴校验回归（${cases.length} 例）`);
