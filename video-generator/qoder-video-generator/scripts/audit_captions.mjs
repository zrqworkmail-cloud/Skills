import fs from "node:fs";

const src = fs.readFileSync(new URL("../remotion/src/data/timeline.ts", import.meta.url), "utf8");
const timing = JSON.parse(
  fs.readFileSync(new URL("../assets/audio/timing.json", import.meta.url), "utf8")
);

// Parse the generated TS data by evaluating only its literal sections.
const lines = [...src.matchAll(/\{\s*"i":\s*(\d+),\s*"text":\s*("(?:[^"\\]|\\.)*"),\s*"start":\s*(\d+),\s*"end":\s*(\d+)\s*\}/g)].map(
  (m) => ({ i: +m[1], text: JSON.parse(m[2]), start: +m[3], end: +m[4] })
);
const shots = [...src.matchAll(/\{\s*"id":\s*"([^"]+)",[\s\S]*?"start":\s*(\d+),\s*"dur":\s*(\d+),\s*"lines":\s*(\[[^\]]*\]),[\s\S]*?"tech":\s*"([^"]*)"/g)].map(
  (m) => ({ id: m[1], start: +m[2], dur: +m[3], lines: JSON.parse(m[4]), tech: m[5] })
);

const problems = [];
const shotOf = new Map();
for (const s of shots) for (const li of s.lines) shotOf.set(li, s);

if (lines.length !== timing.lines.length) {
  problems.push(`line count ${lines.length} != timing entries ${timing.lines.length}`);
}

let prevEnd = -1;
for (const [k, L] of lines.entries()) {
  const S = shotOf.get(L.i);
  if (!S) {
    problems.push(`line ${L.i} belongs to no shot`);
    continue;
  }
  const shotEnd = S.start + S.dur;
  if (!(L.start < L.end)) problems.push(`line ${L.i} bad interval`);
  if (L.start < S.start - 4 || L.end > shotEnd + 2) {
    problems.push(`line ${L.i} outside ${S.id} (${L.start}-${L.end} vs ${S.start}-${shotEnd})`);
  }
  if (L.start < prevEnd) problems.push(`line ${L.i} overlaps previous (${prevEnd} > ${L.start})`);
  prevEnd = L.end;

  const t = timing.lines[k];
  if (t && t.text !== L.text) problems.push(`line ${L.i} text drift vs timing.json`);

  // Rough caption width: CJK glyphs ~1em, ASCII ~0.55em.
  let w = 0;
  for (const ch of L.text) {
    w += /[\u3000-\u9fff]/.test(ch) ? 47 : /[0-9A-Za-z%]/.test(ch) ? 26 : /[，。：；！？、,.!?%]/.test(ch) ? 24 : 14;
  }
  if (w > 920 * 2) problems.push(`line ${L.i} too long for 2 caption lines: ${Math.round(w)}px`);
  if ((L.end - L.start) / 30 < 0.9) {
    problems.push(`line ${L.i} shown <0.9s (${((L.end - L.start) / 30).toFixed(2)}s)`);
  }
}

for (const s of shots) {
  if (!s.lines.length && s.id !== "s33_end_card") problems.push(`shot ${s.id} has no narration line`);
  if (s.dur <= 0) problems.push(`shot ${s.id} has non-positive duration`);
}

const dupe = new Map();
for (const L of lines) dupe.set(L.text, (dupe.get(L.text) ?? 0) + 1);
for (const [text, n] of dupe) if (n > 1) problems.push(`duplicate caption text x${n}: ${text}`);

console.log(`shots=${shots.length} lines=${lines.length} filmFrames=5403`);
console.log(`problems=${problems.length}`);
for (const p of problems) console.log(" -", p);
