#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Does the footage bed actually keep moving to the end of the shot?

plate_gate.py predicts, from Remotion's slice maths, how many source frames a
LoopingVideo slice consumes. When a slice needs more than the plate holds,
Remotion does not warn - it either wraps the clip back to the start or pins the
last frame, and both are visible, just in different ways (a wrap is a luma jump,
a pin is a dead still). This measures the delivered file instead of theorising:
mean |frame-to-frame difference| over the shot, binned, with the caption band
cropped out so the captions cannot fake motion.

Usage: python build/bed_motion.py <mp4> <start_frame> <dur_frames> [bin]
"""
import os
import shutil
import subprocess
import sys

import numpy as np

FF = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg") or "ffmpeg"
W = 180


def main():
    mp4, start, dur = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    nb = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    vf = (
        f"trim=start_frame={start}:end_frame={start + dur},"
        f"setpts=N/FRAME_RATE/TB,crop=in_w:1400:0:0,scale={W}:-1,format=gray"
    )
    p = subprocess.run(
        [
            FF, "-v", "error", "-i", mp4, "-vf", vf,
            "-fps_mode", "passthrough", "-f", "rawvideo", "-",
        ],
        capture_output=True,
    )
    if p.returncode:
        print("ffmpeg failed:", p.stderr.decode("utf-8", "replace")[:400])
        return 1
    h = int(1400 * W / 1080)
    frame = W * h
    buf = np.frombuffer(p.stdout, dtype=np.uint8)
    n = len(buf) // frame
    if n < 2:
        print("no frames decoded")
        return 1
    a = buf[: n * frame].reshape(n, h, W).astype(np.int16)
    d = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))
    bins = [round(float(np.mean(x)), 2) for x in np.array_split(d, nb)]
    print(f"shot frames {start}..{start+dur-1}  decoded {n}  bins of ~{len(d)//nb+1}")
    print("  " + " ".join(f"{b:5.2f}" for b in bins))
    print(f"  first-half mean {d[:len(d)//2].mean():.3f}   second-half mean {d[len(d)//2:].mean():.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
