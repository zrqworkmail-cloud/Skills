# -*- coding: utf-8 -*-
"""Measure per-frame mean luma of a clip and write spec/clip_luma/<name>.json.

I2V footage breathes: the opening rain clip swings 12.6 luma of whole-frame mean
inside 73 frames (autocorrelation period ~12 frames = 2 Hz at 24 fps). Remotion
can't temporal-filter a video, but it can scale each frame's brightness by the
inverse of a measured curve, which flattens exactly that artifact.
"""
import shutil
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg") or "ffmpeg"
OUT_DIR = os.path.join(ROOT, "spec", "clip_luma")


def main():
    clip = sys.argv[1]
    name = os.path.splitext(os.path.basename(clip))[0]
    os.makedirs(OUT_DIR, exist_ok=True)
    # the ffmpeg filter parser eats Windows backslashes, so hand it forward slashes
    tmp_rel = f"spec/clip_luma/_{name}.txt"
    subprocess.run([FF, "-hide_banner", "-nostats", "-i", clip, "-vf",
                    f"signalstats,metadata=print:key=lavfi.signalstats.YAVG:file={tmp_rel}",
                    "-f", "null", "-"], capture_output=True, check=True, cwd=ROOT)
    vals = []
    for line in open(os.path.join(ROOT, tmp_rel), encoding="utf-8", errors="ignore"):
        m = re.search(r"YAVG=([\d.]+)", line)
        if m:
            vals.append(round(float(m.group(1)), 3))
    os.remove(os.path.join(OUT_DIR, f"_{name}.txt"))
    med = sorted(vals)[len(vals) // 2]
    doc = {"frames": len(vals), "median": round(med, 3), "luma": vals,
           "swing": round(max(vals) - min(vals), 2)}
    json.dump(doc, open(os.path.join(OUT_DIR, f"{name}.json"), "w", encoding="utf-8"))
    print(f"{name}: {len(vals)} frames, median {med:.1f}, swing {doc['swing']} luma")


if __name__ == "__main__":
    main()
