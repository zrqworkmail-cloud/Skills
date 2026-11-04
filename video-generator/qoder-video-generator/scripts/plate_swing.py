# -*- coding: utf-8 -*-
"""Did any I2V plate wrap inside its own shot?

The plate rate has to satisfy rate * outputFrames <= sourceFrames. When it does
not, LoopingVideo starts a second slice and cross-fades back to frame 0 in the
middle of the shot — which is a pose jump, and shows up as a large single-frame
luma delta *inside* the shot rather than at a cut. This is the failure that bit
FlapScene once (16-luma internal swing, 13-luma one-frame jumps).

Reports, per footage-backed shot: internal swing, worst single-frame jump and
where it is (as a fraction of the shot, so a mid-shot jump is distinguishable
from the cut itself).
Usage: python build/plate_swing.py build/yavg_v28.txt
"""
import json
import re
import sys

TL = "spec/beat_timeline.json"

# shots whose picture is an I2V clip under a wash (src/scenes/*Scene.tsx)
PLATES = {
    "s05a_flap": ("kf_butterfly_beat", 49),
    "s05b_advect": ("kf_wake_entrain", 49),
    "s09_observation": ("s09_observation", None),
    "s17_archive": ("s17_archive_wall", None),
    "s22_models_off": ("s22_supercomputer", None),
    "s26_today_map": ("s26_today_map", None),
}
# a mid-shot jump above this is a wrap; cuts are excluded by position
JUMP_WARN = 4.0


def main(path):
    y = [float(m.group(1)) for m in (re.search(r"YAVG=([\d.]+)", l) for l in open(path, errors="ignore")) if m]
    tl = json.load(open(TL, encoding="utf-8"))["shots"]
    print("%-18s %5s %5s %8s %9s %10s" % ("shot", "dur", "src", "swing", "max|dY|", "at"))
    for s in tl:
        if s["id"] not in PLATES:
            continue
        i, j = s["start"], s["start"] + s["dur"] - 1
        seg = y[i:j + 1]
        d = [(abs(seg[k + 1] - seg[k]), (k + 1) / (len(seg) - 1)) for k in range(len(seg) - 1)]
        worst, frac = max(d)
        src = PLATES[s["id"]][1]
        flag = ""
        if worst > JUMP_WARN and 0.12 < frac < 0.9:
            flag = "   <== 镜内大跳，疑似 plate 回卷"
        print("%-18s %5d %5s %8.1f %9.2f %7.0f%%%s" % (
            s["id"], s["dur"], src if src else "-", max(seg) - min(seg), worst, frac * 100, flag))


if __name__ == "__main__":
    main(sys.argv[1])
