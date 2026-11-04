# -*- coding: utf-8 -*-
"""Temporal-difference metric for one clip: is the screen flickering frame to frame?"""
import os
import shutil
import re
import statistics
import subprocess
import sys

FF = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg") or "ffmpeg"
clip = sys.argv[1]
subprocess.run([FF, "-hide_banner", "-nostats", "-i", clip, "-vf",
                "signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=build/_yd.txt",
                "-f", "null", "-"], capture_output=True)
d = [float(m.group(1)) for m in
     (re.search(r"YDIF=([\d.]+)", l) for l in open("build/_yd.txt", errors="ignore")) if m]
print("%-28s YDIF mean %.2f  p95 %.2f  max %.2f" % (
    sys.argv[2] if len(sys.argv) > 2 else clip,
    statistics.mean(d), sorted(d)[int(len(d) * 0.95)], max(d)))
