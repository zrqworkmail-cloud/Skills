# -*- coding: utf-8 -*-
"""Luma/flicker report for a delivered render, measured on the file itself.

Reads the per-frame YAVG dump produced by
    ffmpeg -i OUT -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=...

Reports, per version:
  band            p1..p99 of whole-frame mean luma, and min..max
  cut steps       |Δmean luma| between adjacent shots at every beat cut
  steps>25        how many cuts cross more than 25 luma units
  dips            events where luma falls >=25 below its local 3-second median
  single-frame    max |ΔYAVG| between consecutive frames
  opening         de-trended swing over the first 300 frames (the "breathing" test)

Usage: python build/luma_report.py build/yavg_v10.txt build/yavg_v11.txt
"""
import json
import os
import re
import statistics
import sys

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())
WIN = 45  # 1.5 s half-window for the local median


def load(path):
    y = []
    for line in open(path, errors="ignore"):
        m = re.search(r"YAVG=([\d.]+)", line)
        if m:
            y.append(float(m.group(1)))
    return y


def local_median(y, i, win=WIN):
    lo, hi = max(0, i - win), min(len(y), i + win + 1)
    return statistics.median(y[lo:hi])


def detrend(y):
    """Least-squares line removed — leaves only what breathes."""
    n = len(y)
    xs = list(range(n))
    mx, my = statistics.mean(xs), statistics.mean(y)
    num = sum((x - mx) * (v - my) for x, v in zip(xs, y))
    den = sum((x - mx) ** 2 for x in xs)
    b = num / den if den else 0.0
    a = my - b * mx
    return [v - (a + b * x) for x, v in zip(xs, y)]


def main():
    tl = json.load(open(os.path.join(ROOT, "spec", "beat_timeline.json"), encoding="utf-8"))
    starts = [s["start"] for s in tl["shots"]]
    ends = [s["start"] + s["dur"] - 1 for s in tl["shots"]]

    for path in sys.argv[1:]:
        y = load(path)
        name = os.path.basename(path)
        p = sorted(y)
        p1, p99 = p[int(len(p) * 0.01)], p[int(len(p) * 0.99)]

        shot_means = [statistics.mean(y[s:e + 1]) for s, e in zip(starts, ends)]
        steps = [(shot_means[i + 1] - shot_means[i], starts[i + 1]) for i in range(len(shot_means) - 1)]
        worst = max(steps, key=lambda t: abs(t[0]))
        over = [t for t in steps if abs(t[0]) > 25]

        dips = []
        run = 0
        for i in range(len(y)):
            if y[i] < local_median(y, i) - 25:
                run += 1
            else:
                if run >= 3:
                    dips.append(i)
                run = 0
        if run >= 3:
            dips.append(len(y) - 1)

        dif = [abs(y[i + 1] - y[i]) for i in range(len(y) - 1)]
        head = detrend(y[:300])

        print(f"--- {name}  ({len(y)} frames) ---")
        print(f"  band p1..p99      {p1:6.1f} .. {p99:6.1f}   (min {min(y):.1f} max {max(y):.1f})")
        print(f"  shot means        {min(shot_means):6.1f} .. {max(shot_means):.1f}")
        print(f"  max cut step      {worst[0]:+6.1f} luma at frame {worst[1]}")
        print(f"  cuts over 25      {len(over)}" + ("  " + ", ".join(f"{d:+.0f}@{f}" for d, f in over) if over else ""))
        print(f"  dip events        {len(dips)}" + ("  frames " + ", ".join(str(d) for d in dips[:10]) if dips else ""))
        print(f"  max 1-frame jump  {max(dif):.2f}   (mean |dY| {statistics.mean(dif):.3f})")
        print(f"  opening de-trended swing 0..300  {max(head) - min(head):.3f}")
        print(f"  first frame luma  {y[0]:.1f}")


if __name__ == "__main__":
    main()
