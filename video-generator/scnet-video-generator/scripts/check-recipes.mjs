#!/usr/bin/env node
/**
 * 镜头卡校验（配方门禁）
 *
 * 用法：
 *   node scripts/check-recipes.mjs [目录] [--shotlist <时间轴或镜头表>]
 *   默认目录 assets/cards
 *
 * 校验三层：
 *   1. 结构：按 assets/templates/shot-card.schema.json 校验类型、枚举、必填、多余字段；
 *   2. 语义：时长区间、入场/出场时长、camera 卡必须有运镜参数、tags 不重复、文件名等于 id；
 *   3. 引用：给 --shotlist 时，检查镜头表里的 recipe 是否都存在于卡库。
 *
 * 退出码：0 通过；1 存在违规；2 目录或参数错误
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const schemaPath = join(root, 'assets', 'templates', 'shot-card.schema.json');

const argv = process.argv.slice(2);
let target = 'assets/cards';
let shotlistPath = null;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--shotlist') {
    shotlistPath = argv[i + 1];
    if (!shotlistPath) {
      console.error('--shotlist 需要一个文件路径');
      process.exit(2);
    }
    i += 1;
  } else {
    target = argv[i];
  }
}

const errors = [];
const fail = (file, path, message) => errors.push({file, path, message});

const kindOf = (value) =>
  Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

const validate = (value, rule, path, file) => {
  if (!rule || typeof rule !== 'object') return;

  if (rule.type) {
    const actual = kindOf(value);
    const ok =
      rule.type === 'integer'
        ? actual === 'number' && Number.isInteger(value)
        : rule.type === 'number'
          ? actual === 'number' && Number.isFinite(value)
          : actual === rule.type;
    if (!ok) {
      fail(file, path, `应为 ${rule.type}，实为 ${actual}`);
      return;
    }
  }

  if (rule.enum && !rule.enum.includes(value)) {
    fail(file, path, `取值 ${JSON.stringify(value)} 不在枚举内：${rule.enum.join(' | ')}`);
  }

  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      fail(file, path, `长度不足 ${rule.minLength}`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      fail(file, path, `长度 ${value.length} 超过上限 ${rule.maxLength}`);
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
      fail(file, path, `不符合格式 ${rule.pattern}`);
    }
  }

  if (typeof value === 'number') {
    if (rule.minimum !== undefined && value < rule.minimum) {
      fail(file, path, `${value} 小于下限 ${rule.minimum}`);
    }
    if (rule.maximum !== undefined && value > rule.maximum) {
      fail(file, path, `${value} 大于上限 ${rule.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) {
      fail(file, path, `元素数 ${value.length} 少于 ${rule.minItems}`);
    }
    if (rule.maxItems !== undefined && value.length > rule.maxItems) {
      fail(file, path, `元素数 ${value.length} 多于 ${rule.maxItems}`);
    }
    if (rule.items) {
      value.forEach((item, index) => validate(item, rule.items, `${path}[${index}]`, file));
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required ?? []) {
      if (!(key in value)) fail(file, path, `缺少必填字段 ${key}`);
    }
    for (const [key, child] of Object.entries(value)) {
      const sub = rule.properties?.[key];
      const childPath = path ? `${path}.${key}` : key;
      if (sub) validate(child, sub, childPath, file);
      else if (rule.additionalProperties === false) fail(file, childPath, '不允许的字段');
    }
  }
};

let schema;
try {
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
} catch (error) {
  console.error(`读不到 schema：${schemaPath}`);
  process.exit(2);
}

let files;
try {
  if (!statSync(target).isDirectory()) throw new Error('不是目录');
  files = readdirSync(target).filter((name) => extname(name) === '.json');
} catch {
  console.error(`目录不存在：${target}`);
  process.exit(2);
}

if (files.length === 0) {
  console.error(`目录里没有卡片：${target}`);
  process.exit(2);
}

const ids = new Map();
const byCategory = new Map();

for (const name of files.sort()) {
  const path = join(target, name);
  let card;
  try {
    card = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(name, '$', `JSON 解析失败：${error.message}`);
    continue;
  }

  validate(card, schema, '', name);
  if (!card || typeof card !== 'object' || Array.isArray(card)) continue;

  // 语义层：结构合法不等于卡可用
  const [min, max] = Array.isArray(card.durationRange) ? card.durationRange : [];
  if (typeof min === 'number' && typeof max === 'number') {
    if (max < min) fail(name, 'durationRange', `区间需递增，当前 [${min}, ${max}]`);
    if (max > 600) fail(name, 'durationRange', `单镜 ${max} 帧超过 20s，应拆镜`);
    if (card.entry?.durationInFrames && card.entry.durationInFrames >= min) {
      fail(name, 'entry.durationInFrames', `入场 ${card.entry.durationInFrames} 帧吃掉整镜（最短 ${min}）`);
    }
    if (card.exit?.durationInFrames && card.exit.durationInFrames >= min) {
      fail(name, 'exit.durationInFrames', `出场 ${card.exit.durationInFrames} 帧吃掉整镜（最短 ${min}）`);
    }
  }

  if (card.category === 'camera') {
    const camera = card.camera;
    if (!camera) {
      fail(name, 'camera', '类目为 camera 的卡必须给 camera 参数');
    } else if (camera.zoom === undefined && camera.x === undefined && camera.y === undefined) {
      fail(name, 'camera', '没有任何运动参数，等同固定镜头');
    }
  }

  if (Array.isArray(card.tags) && new Set(card.tags).size !== card.tags.length) {
    fail(name, 'tags', 'tags 存在重复项');
  }

  if (card.id && basename(name, '.json') !== card.id) {
    fail(name, 'id', `id 为 ${card.id}，与文件名不一致`);
  }

  if (card.id) {
    if (ids.has(card.id)) fail(name, 'id', `id 与 ${ids.get(card.id)} 重复`);
    else ids.set(card.id, name);
  }
  if (card.category) byCategory.set(card.category, (byCategory.get(card.category) ?? 0) + 1);
}

if (shotlistPath) {
  let list;
  try {
    list = JSON.parse(readFileSync(shotlistPath, 'utf8'));
  } catch (error) {
    console.error(`读不到镜头表：${shotlistPath}`);
    process.exit(2);
  }
  const shots = Array.isArray(list) ? list : (list.shots ?? []);
  for (const shot of shots) {
    if (shot?.recipe && !ids.has(shot.recipe)) {
      fail(basename(shotlistPath), `shots.${shot.id ?? '?'}.recipe`, `引用了不存在的卡 ${shot.recipe}`);
    }
  }
}

if (errors.length === 0) {
  const coverage = [...byCategory.entries()].map(([k, v]) => `${k} ${v}`).join(' / ');
  console.log(`✓ PASS ${target} ${files.length} 张卡片，id 唯一，引用完整`);
  console.log(`  分类覆盖：${coverage}`);
  if (shotlistPath) console.log(`  镜头表引用：${basename(shotlistPath)} 全部命中`);
  process.exit(0);
}

console.error(`✗ 发现 ${errors.length} 处违规：\n`);
const grouped = new Map();
for (const item of errors) {
  if (!grouped.has(item.file)) grouped.set(item.file, []);
  grouped.get(item.file).push(item);
}
for (const [file, items] of grouped) {
  console.error(`  ${file}`);
  for (const item of items.slice(0, 8)) {
    console.error(`    ${item.path || '$'}  ${item.message}`);
  }
  if (items.length > 8) console.error(`    … 另有 ${items.length - 8} 处`);
}
console.error('\n只改字段不够：先确认这张卡要完成的信息动作，再决定参数。');
process.exit(1);
