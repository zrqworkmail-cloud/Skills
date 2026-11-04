# -*- coding: utf-8 -*-
"""Per-shot luma means for two yavg dumps, side by side, with the cut steps.

Used to answer "did reordering the butterfly block move the exposure?" — the
shots swap slots, so their frame ranges move, and a substrate that got brighter
or dimmer shows up here rather than in the aggregate band.
Usage: python build/shot_means_diff.py build/yavg_v27.txt build/yavg_v28.txt
"""
import json
import re
import statistics
import sys

ROOT = __file__.rsplit("/", 2)[0] if "/" in __file__ else "."
TL = "spec/beat_timeline.json"


def load(p):
    return [float(m.group(1)) for m in (re.search(r"YAVG=([\d.]+)", l) for l in open(p, errors="ignore")) if m]


def main(a_path, b_path):
    a, b = load(a_path), load(b_path)
    tl = json.load(open(TL, encoding="utf-8"))["shots"]
    print("%-20s %6s %6s %7s %8s %8s" % ("shot", "A", "B", "delta", "step in", "step out"))
    prev = None
    rows = []
    for s in tl:
        i, j = s["start"], s["start"] + s["dur"] - 1
        ma, mb = statistics.mean(a[i:j + 1]), statistics.mean(b[i:j + 1])
        rows.append((s["id"], ma, mb))
    for k, (sid, ma, mb) in enumerate(rows):
        nxt = rows[k + 1][2] if k + 1 < len(rows) else None
        step_in = "" if prev is None else "%+8.1f" % (mb - prev)
        step_out = "" if nxt is None else "%+8.1f" % (nxt - mb)
        flag = "  <==" if abs(mb - ma) >= 3 else ""
        print("%-20s %6.1f %6.1f %+7.1f %s %s%s" % (sid, ma, mb, mb - ma, step_in, step_out, flag))
        prev = mb
    worst = max(range(len(rows) - 1), key=lambda k: abs(rows[k + 1][2] - rows[k][2]))
    print("largest cut step in B: %+.1f  (%s -> %s)" % (
        rows[worst + 1][2] - rows[worst][2], rows[worst][0], rows[worst + 1][0]))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
