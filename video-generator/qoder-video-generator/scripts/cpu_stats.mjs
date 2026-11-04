import fs from "node:fs";

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
const rows = [];
for (const line of raw) {
  const m = line.match(/"([^"]+)","([\d.]+)"/);
  if (m && /^\d/.test(m[1])) rows.push({ t: m[1], v: Number(m[2]) });
}
if (!rows.length) {
  console.log("no cpu samples");
  process.exit(1);
}
const values = rows.map((r) => r.v).sort((a, b) => a - b);
const sum = values.reduce((a, b) => a + b, 0);
const mean = sum / values.length;
const p95 = values[Math.min(values.length - 1, Math.floor(values.length * 0.95))];
const max = values[values.length - 1];
const over80 = values.filter((v) => v > 80).length;
console.log(
  `samples=${values.length} window=${rows[0].t} -> ${rows[rows.length - 1].t} mean=${mean.toFixed(1)}% p95=${p95.toFixed(1)}% max=${max.toFixed(1)}% over80=${over80}`
);
