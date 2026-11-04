# -*- coding: utf-8 -*-
"""Where does on-screen text actually land, measured on the delivered file.

Douyin's 9:16 chrome covers the bottom of the frame (caption / like comment
share) and a rail down the right edge. Anything that has to be read must stay
out of both. This script takes a mid-point frame of every caption line, finds
the bounding box of near-white pixels in the lower half of the frame, and
reports the closest approach to each forbidden band.

Usage: python build/safezone_check.py outputs/....mp4
"""
import shutil
import json
import os
import statistics
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())
FF = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg") or "ffmpeg"
FP = os.environ.get("FFPROBE_PATH") or shutil.which("ffprobe") or "ffprobe"
# The chrome is a 9:16-screen measurement, so for a 16:9 film shown letterboxed
# full-width in the same feed the keep-outs are the same fractions of the
# screen: right rail 12.5 % of 1920 -> content ends at 1680; bottom strip
# 100 px of 1080 -> content ends at 980. Both are fractions of the picture, so
# a 4K master gets the same cut: 3360 / 1960 instead of 1680 / 980.
def keepouts(mp4):
    out = subprocess.run([FP, "-v", "error", "-select_streams", "v:0",
                          "-show_entries", "stream=width,height",
                          "-of", "csv=p=0:s=x", mp4],
                         capture_output=True, text=True, check=True).stdout.strip()
    # ffprobe appends the item separator to the last field ("1920x1080x"),
    # so drop empties before unpacking.
    w, h = [int(x) for x in out.split("x") if x.strip()][:2]
    if h > w:            # 9:16: bottom caption strip 300/1920, rail 135/1080
        return w, h, round(h * (1 - 300 / 1920)), round(w * (1 - 135 / 1080)), h // 2
    # 16:9: the same screen fractions applied to the picture
    return w, h, round(h * (1 - 100 / 1080)), round(w * (1 - 240 / 1920)), h // 2



def grab(mp4, frames, outdir):
    """One decode pass, emitting exactly the requested frames."""
    expr = "+".join(f"eq(n\\,{f})" for f in frames)
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", mp4,
                    "-vf", f"select='{expr}'", "-fps_mode", "passthrough", "-an",
                    os.path.join(outdir, "g%03d.png")], check=True)
    return sorted(os.listdir(outdir))


def main():
    mp4 = sys.argv[1]
    global W, H, BOTTOM_KEEPOUT, RIGHT_KEEPOUT, HALF
    W, H, BOTTOM_Y, RIGHT_X, HALF = keepouts(mp4)
    BOTTOM_KEEPOUT = H - BOTTOM_Y
    RIGHT_KEEPOUT = W - RIGHT_X
    tl = json.load(open(os.path.join(ROOT, "spec", "beat_timeline.json"), encoding="utf-8"))
    tmp = tempfile.mkdtemp()
    picks = [(L["i"], (L["start"] + L["end"]) // 2) for L in tl["lines"]]
    grab(mp4, [f for _, f in picks], tmp)
    files = sorted(os.listdir(tmp))
    rows = []
    for (i, f), name in zip(picks, files):
        a = np.asarray(Image.open(os.path.join(tmp, name)).convert("L"), dtype=np.int16)
        # near-white glyphs on the dark bed: strict, so graphics don't count
        m = a > 232
        m[:HALF, :] = False
        if not m.any():
            rows.append((i, f, None))
            continue
        ys, xs = np.nonzero(m)
        rows.append((i, f, (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()))))

    worst_bottom = worst_right = None
    print("line frame   bbox(x0,x1,y0,y1)          from-bottom  from-right")
    for i, f, bb in rows:
        if bb is None:
            print(f"{i:>4} {f:>5}   no bright pixels found")
            continue
        x0, x1, y0, y1 = bb
        fb, fr = H - y1, W - x1
        print(f"{i:>4} {f:>5}   {x0:>4} {x1:>4} {y0:>4} {y1:>4}      {fb:>5}      {fr:>5}")
        if worst_bottom is None or fb < worst_bottom[0]:
            worst_bottom = (fb, i)
        if worst_right is None or fr < worst_right[0]:
            worst_right = (fr, i)
    print()
    print(f"closest to bottom UI band : {worst_bottom[0]} px (line {worst_bottom[1]}), keep-out {BOTTOM_KEEPOUT}")
    print(f"closest to right rail     : {worst_right[0]} px (line {worst_right[1]}), keep-out {RIGHT_KEEPOUT}")
    bad = [i for i, f, bb in rows if bb and (H - bb[3] < BOTTOM_KEEPOUT or W - bb[1] < RIGHT_KEEPOUT)]
    print("intruders:", bad if bad else "none")


if __name__ == "__main__":
    main()
