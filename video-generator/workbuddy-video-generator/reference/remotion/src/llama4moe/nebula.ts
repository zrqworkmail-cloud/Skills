/**
 * 全片共用的「神经星云」几何：320 个节点 + 63 团气体 + 近邻连线 + 17 个金色激活点。
 * 所有镜头都用同一份数据，保证切镜时星云形状连续。
 */
export type P3 = { x: number; y: number; z: number };
export type N3 = P3 & { s: number };
export type G3 = P3 & { r: number; c: number; o: number };

export const rnd = (i: number, s: number) => {
  const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export const NODES: N3[] = (() => {
  const out: N3[] = [];
  for (let i = 0; i < 200; i++) {
    const r = 0.12 + 0.5 * Math.pow(rnd(i, 1), 0.7);
    const th = 2 * Math.PI * rnd(i, 2);
    const ph = Math.acos(2 * rnd(i, 3) - 1);
    out.push({
      x: r * Math.sin(ph) * Math.cos(th) * 1.15,
      y: r * Math.cos(ph) * 0.85,
      z: r * Math.sin(ph) * Math.sin(th) * 0.95,
      s: 2.2 + 1.6 * rnd(i, 4),
    });
  }
  for (let i = 0; i < 90; i++) {
    const r = 0.55 + 0.5 * rnd(i + 300, 5);
    const th = 2 * Math.PI * rnd(i + 300, 6);
    const ph = Math.acos(2 * rnd(i + 300, 7) - 1);
    out.push({
      x: r * Math.sin(ph) * Math.cos(th) * 1.15,
      y: r * Math.cos(ph) * 0.85,
      z: r * Math.sin(ph) * Math.sin(th) * 0.95,
      s: 2.0 + 1.4 * rnd(i + 300, 8),
    });
  }
  for (let i = 0; i < 30; i++) {
    const k = i % 5;
    const t = 0.6 + 0.8 * rnd(i + 500, 9);
    const a = (k * 2 * Math.PI) / 5 + 0.7 * t;
    out.push({
      x: Math.cos(a) * t * 1.15,
      y: 0.25 * Math.sin(2.2 * t + k) * 0.85,
      z: Math.sin(a) * t * 0.95,
      s: 2.0 + 1.2 * rnd(i + 500, 10),
    });
  }
  return out;
})();

export const GAS: G3[] = (() => {
  const out: G3[] = [];
  for (let i = 0; i < 55; i++) {
    const r = 0.25 + 1.05 * Math.pow(rnd(i + 700, 11), 0.6);
    const th = 2 * Math.PI * rnd(i + 700, 12);
    const ph = Math.acos(2 * rnd(i + 700, 13) - 1);
    out.push({
      x: r * Math.sin(ph) * Math.cos(th) * 1.2,
      y: r * Math.cos(ph) * 0.9,
      z: r * Math.sin(ph) * Math.sin(th),
      r: 0.18 + 0.4 * rnd(i + 700, 14),
      c: i % 3,
      o: 0.07 + 0.11 * rnd(i + 700, 15),
    });
  }
  for (let i = 0; i < 8; i++) {
    const r = 1.0 + 0.5 * rnd(i + 900, 16);
    const th = 2 * Math.PI * rnd(i + 900, 17);
    const ph = Math.acos(2 * rnd(i + 900, 18) - 1);
    out.push({
      x: r * Math.sin(ph) * Math.cos(th) * 1.2,
      y: r * Math.cos(ph) * 0.9,
      z: r * Math.sin(ph) * Math.sin(th),
      r: 0.4 + 0.3 * rnd(i + 900, 19),
      c: i % 3,
      o: 0.04 + 0.03 * rnd(i + 900, 20),
    });
  }
  return out;
})();

export const LINKS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      const dx = NODES[i].x - NODES[j].x;
      const dy = NODES[i].y - NODES[j].y;
      const dz = NODES[i].z - NODES[j].z;
      if (dx * dx + dy * dy + dz * dz < 0.12) out.push([i, j]);
    }
  }
  return out;
})();

export const rot3 = (x: number, y: number, z: number, ry: number, rx: number) => {
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y1 = y * cx - z1 * sx;
  const z2 = y * sx + z1 * cx;
  return { x: x1, y: y1, z: z2 };
};

/** 透视投影：k 为整体缩放（用于「阵列退到背景」），cx/cy 为投影中心 */
export const project3 = (p: P3, camZ: number, ry: number, rx: number, fx: number, fy: number, k = 1) => {
  const r = rot3(p.x, p.y, p.z, ry, rx);
  const depth = camZ - r.z;
  if (depth < 0.16) return null;
  const scale = (2.2 / depth) * k;
  return { x: fx + r.x * scale * 560, y: fy + r.y * scale * 560, scale };
};

/** 参考机位 = Shot 01 末帧 / Shot 02 首帧（同一机位，保证切镜无缝） */
export const REF_CAM = { camZ: 2.589, ry: 0.748, rx: 0.033, fx: 760, fy: 520 };

/**
 * 17 个激活点：在**屏幕空间**按方位角等距取样（不是 3D 方位角）。
 * 3D 方位角经过透视后会被压向一侧，屏幕方位角才能保证画面上左右均匀。
 */
const GOLD_CAND: { i: number; a: number }[] = (() => {
  const cand = NODES.map((n, i) => {
    const p = project3(n, REF_CAM.camZ, REF_CAM.ry, REF_CAM.rx, REF_CAM.fx, REF_CAM.fy, 1);
    if (!p) return null;
    const dx = p.x - REF_CAM.fx;
    const dy = p.y - REF_CAM.fy;
    const rad = Math.hypot(dx, dy);
    if (rad < 80 || rad > 440) return null;
    return { i, a: Math.atan2(dy, dx) };
  }).filter((o): o is { i: number; a: number } => o !== null);
  cand.sort((x, y) => x.a - y.a);
  return cand;
})();

/** 按屏幕方位角等距取 count 个激活点（1 点 = 1B 的约定下，13 个点 = 13B） */
export const pickGold = (count: number): number[] =>
  Array.from({ length: count }, (_, k) => GOLD_CAND[Math.floor((k * GOLD_CAND.length) / count)].i);

export const GOLD_IDX: number[] = pickGold(17);
