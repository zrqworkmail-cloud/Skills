#!/usr/bin/env node
/**
 * 裸色值 / 裸字号扫描（视觉规范门禁）
 *
 * 用法：node scripts/check-tokens.mjs <目录>
 * 退出码：0 无违规；1 存在违规；2 目录不存在
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, extname, join} from 'node:path';

const target = process.argv[2] ?? 'src';
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const SKIP_FILES = new Set(['theme.ts', 'theme.tsx', 'tokens.ts', 'tokens.tsx']);
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', 'build', '.git', 'public']);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FONT_SIZE = /fontSize\s*:\s*(\d+)/g;

const findings = [];

const isComment = (line) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};

const scan = (file) => {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isComment(line)) return;
    for (const match of line.matchAll(HEX)) {
      findings.push({file, line: index + 1, kind: 'hex', value: match[0]});
    }
    for (const match of line.matchAll(FONT_SIZE)) {
      findings.push({file, line: index + 1, kind: 'fontSize', value: match[0]});
    }
  });
};

const walk = (dir) => {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path);
      continue;
    }
    if (!EXTS.has(extname(entry.name))) continue;
    if (SKIP_FILES.has(basename(path))) continue;
    scan(path);
  }
};

try {
  if (!statSync(target).isDirectory()) throw new Error('不是目录');
} catch {
  console.error(`目录不存在: ${target}`);
  process.exit(2);
}

walk(target);

if (findings.length === 0) {
  console.log(`✓ PASS ${target} 无裸色值与裸字号`);
  process.exit(0);
}

const byFile = new Map();
for (const item of findings) {
  if (!byFile.has(item.file)) byFile.set(item.file, []);
  byFile.get(item.file).push(item);
}

console.error(`✗ 发现 ${findings.length} 处违规：\n`);
for (const [file, items] of byFile) {
  console.error(`  ${file}`);
  for (const item of items.slice(0, 8)) {
    console.error(`    L${item.line}  ${item.kind}  ${item.value}`);
  }
  if (items.length > 8) console.error(`    … 另有 ${items.length - 8} 处`);
}

console.error('\n改用 theme.color / theme.type 中的令牌。');
process.exit(1);
