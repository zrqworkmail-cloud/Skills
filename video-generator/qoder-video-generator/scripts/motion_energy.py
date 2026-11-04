# -*- coding: utf-8 -*-
"""Motion gate: measure how much the delivered film actually moves, per shot.

Why on the delivered file: a still shows composition, a scene source shows
intent, and neither shows whether the frame moved. This decodes the film once
at 1/4 width in greyscale, takes the mean absolute frame-to-frame difference,
rolls it up per shot, and judges it against the *declared* motion kind.

The judgement is type-aware on purpose. A data card that holds still for 3 s
while you read it is good editing; a "living" still that holds for 3 s is a
frozen picture; a footage bed that holds for 3 s is a wrapped clip. So each
shot declares:

    "motion": {"kind": "footage|living|anim|hold|mixed",
               "intent": "what moves and why",       # one line
               "maxHoldS": 2.0}                       # optional override

If the shotlist has no motion block (older projects), the kind is inferred from
`tech` (footage -> footage, photo -> living, sim/data -> anim) and the shot is
reported as UNDECLARED - the gate still measures, but the number is judged by
the default for that kind.

Usage:
  PROJECT=. python -X utf8 scripts/motion_energy.py <film.mp4> \
      [--timeline spec/beat_timeline.json] [--shotlist spec/shotlist.json] \
      [--width 270] [--json]
"""
from __future__ import annotations
import shutil

import argparse
import io
import json
import os
import subprocess
import sys

import numpy as np

FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = os.environ.get(
    "FFPROBE", os.path.join(os.path.dirname(FFMPEG), "ffprobe"))

FREEZE_EPS = 0.10        # mean |dY| below this counts as a held frame
DEFAULT_HOLD = {         # seconds of legitimate stillness per kind
    "footage": 0.30,
    "mixed": 0.60,
    "living": 0.60,
    "anim": 2.00,
    "hold": 4.00,
}
MIN_ENERGY = {           # below this the kind isn't doing its job
    "footage": 0.25,
    "mixed": 0.15,
    "living": 0.06,
    "anim": 0.00,
    "hold": 0.00,
}


def infer_kind(tech: str, sid: str) -> str:
    t = (tech or "").lower()
    if "footage" in t or "video" in t:
        return "footage"
    if "photo" in t or "still" in t:
        return "living"
    if "end" in sid.lower() or "endcard" in sid.lower():
        return "hold"
    return "anim"


def decode_gray(path: str, width: int):
    probe = subprocess.run(
        [FFPROBE, "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    )
    w, h = [int(x) for x in probe.stdout.strip().split(",")[:2]]
    ow = width
    oh = max(2, int(round(h / w * ow / 2.0)) * 2)
    proc = subprocess.Popen(
        [FFMPEG, "-v", "error", "-i", path, "-vf",
         f"scale={ow}:{oh},format=gray", "-f", "rawvideo", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    size = ow * oh
    assert proc.stdout is not None
    i = 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield i, np.frombuffer(buf, dtype=np.uint8).reshape(oh, ow)
        i += 1
    proc.stdout.close()
    proc.wait()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("film")
    ap.add_argument("--timeline", default="spec/beat_timeline.json")
    ap.add_argument("--shotlist", default="spec/shotlist.json")
    ap.add_argument("--width", type=int, default=270)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    tl = json.load(io.open(a.timeline, encoding="utf-8")) if os.path.exists(a.timeline) else None
    sl = json.load(io.open(a.shotlist, encoding="utf-8")) if os.path.exists(a.shotlist) else None
    declared = {}
    if sl:
        for s in sl["shots"]:
            declared[s["id"]] = (s.get("motion") or {}, s.get("tech", ""))

    per_frame = []
    prev = None
    for _, img in decode_gray(a.film, a.width):
        per_frame.append(0.0 if prev is None else float(
            np.mean(np.abs(img.astype(np.int16) - prev.astype(np.int16)))))
        prev = img
    n = len(per_frame)
    if n == 0:
        print("no frames decoded", file=sys.stderr)
        return 2

    if tl:
        bounds = [(s["id"], int(s["start"]), min(int(s["start"]) + int(s["dur"]), n))
                  for s in tl["shots"]]
        fps = float(tl["fps"])
    else:
        bounds = [("all", 0, n)]
        fps = 30.0

    rows = []
    for sid, a0, a1 in bounds:
        arr = np.asarray(per_frame[a0 + 1:a1] if a1 - a0 > 1 else [0.0], dtype=np.float64)
        m = declared.get(sid, ({}, ""))
        mov, tech = m
        kind = mov.get("kind") or infer_kind(tech, sid)
        cap = float(mov.get("maxHoldS", DEFAULT_HOLD.get(kind, 2.0)))
        run = best = 0
        for v in arr:
            run = run + 1 if v < FREEZE_EPS else 0
            best = max(best, run)
        static_s = best / fps
        energy = float(arr.mean())
        rows.append({
            "shot": sid, "kind": kind, "declared": bool(mov),
            "frames": a1 - a0, "energy": round(energy, 3),
            "static_s": round(static_s, 2), "hold_cap": cap,
            "static_share": round(float((arr < FREEZE_EPS).mean()), 2),
            "peak": round(float(arr.max()), 2),
        })

    fails, warns = [], []
    for r in rows:
        if r["static_s"] > r["hold_cap"] + 0.05:
            fails.append(f"{r['shot']}: still {r['static_s']}s > {r['kind']} cap {r['hold_cap']}s"
                         + ("" if r["declared"] else " (UNDECLARED: kind inferred from tech)"))
        if r["energy"] < MIN_ENERGY.get(r["kind"], 0.0):
            warns.append(f"{r['shot']}: energy {r['energy']} below {r['kind']} floor "
                         f"{MIN_ENERGY[r['kind']]}")
    static_share = float(np.mean(np.asarray(per_frame) < FREEZE_EPS))
    if static_share > 0.50:
        warns.append(f"film: {static_share:.0%} of frames are held still "
                     f"(>50% reads as a slideshow, not a film)")
    coverage = sum(1 for r in rows if r["declared"]) / len(rows) if rows else 0.0

    if a.json:
        print(json.dumps({
            "film": a.film, "frames": n, "fps": fps,
            "static_share": round(static_share, 2),
            "declared_coverage": round(coverage, 2),
            "shots": rows, "fail": fails, "warn": warns,
        }, ensure_ascii=False, indent=1))
    else:
        hdr = (f"{'shot':<18}{'kind':<9}{'decl':<6}{'energy':<8}{'still s':<9}"
               f"{'cap s':<7}{'still %':<9}{'peak':<7}flag")
        print(f"film: {a.film}\nframes: {n}  fps: {fps:g}  "
              f"held-still share: {static_share:.0%}  motion declared: {coverage:.0%}\n")
        print(hdr)
        print("-" * len(hdr))
        for r in rows:
            flag = ("FAIL" if any(r["shot"] in f for f in fails)
                    else "warn" if any(r["shot"] in w for w in warns) else "")
            print(f"{r['shot']:<18}{r['kind']:<9}{'yes' if r['declared'] else '-':<6}"
                  f"{r['energy']:<8}{r['static_s']:<9}{r['hold_cap']:<7}"
                  f"{r['static_share']:<9}{r['peak']:<7}{flag}")
        print()
        for f in fails:
            print("FAIL", f)
        for w in warns:
            print("warn", w)
        print(f"\n{len(rows)} shots · {len(fails)} FAIL · {len(warns)} warn")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
