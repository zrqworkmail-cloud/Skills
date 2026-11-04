# -*- coding: utf-8 -*-
"""Flatten the luminance breathing baked into the I2V clips.

Wan2.2 output swings 12-40 luma of whole-frame mean inside its own 73 frames
(autocorrelation period ~12 frames = 2 Hz), and on a phone that reads as the
screen flickering. Remotion can't temporal-filter a video, and modelling which
source frame it will show at which output frame proved unreliable, so the fix is
offline: scale each frame by the inverse of its measured mean and re-encode.
"""
import json
import os
import shutil
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg") or "ffmpeg"
WAN = os.path.join(ROOT, "remotion", "public", "wan")
TMP = os.path.join(ROOT, "build", "_steady_frames")
LUMA = os.path.join(ROOT, "spec", "clip_luma")


def measure(path):
    txt = os.path.join(ROOT, "build", "_m.txt")
    subprocess.run([FF, "-hide_banner", "-nostats", "-i", path, "-vf",
                    "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=build/_m.txt",
                    "-f", "null", "-"], cwd=ROOT, capture_output=True, check=True)
    import re
    out = []
    for line in open(txt, encoding="utf-8", errors="ignore"):
        m = re.search(r"YAVG=([\d.]+)", line)
        if m:
            out.append(float(m.group(1)))
    os.remove(txt)
    return out


def main():
    names = sys.argv[1:] or sorted(f[:-4] for f in os.listdir(WAN) if f.endswith(".mp4"))
    for name in names:
        src = os.path.join(WAN, name + ".mp4")
        curve = json.load(open(os.path.join(LUMA, name + ".json"), encoding="utf-8"))["luma"]
        target = sorted(curve)[len(curve) // 2]
        os.makedirs(TMP, exist_ok=True)
        for f in os.listdir(TMP):
            os.remove(os.path.join(TMP, f))
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", src,
                        os.path.join(TMP, "%04d.png")], check=True)
        frames = sorted(os.listdir(TMP))
        for i, fn in enumerate(frames):
            k = min(1.8, max(0.55, target / curve[min(i, len(curve) - 1)]))
            p = os.path.join(TMP, fn)
            im = Image.open(p)
            im.point(lambda x, k=k: min(255, int(x * k))).save(p)
        out = os.path.join(TMP, "..", f"_steady_{name}.mp4")
        subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", "24",
                        "-i", os.path.join(TMP, "%04d.png"), "-c:v", "libx264",
                        "-pix_fmt", "yuv420p", "-crf", "16", out], check=True)
        after = measure(out)
        before = measure(src)
        print(f"{name}: swing {max(before)-min(before):5.1f} -> {max(after)-min(after):5.1f} luma"
              f"  (median {target:.1f})")
        # Windows refuses to replace a file another process still has open, so
        # copy over the top and keep the untouched original under assets/wan_original
        final = os.path.join(WAN, name + ".mp4")
        orig = os.path.join(ROOT, "assets", "wan_original", name + ".mp4")
        os.makedirs(os.path.dirname(orig), exist_ok=True)
        if not os.path.exists(orig):
            shutil.copy2(final, orig)
        shutil.copyfile(out, final)
        os.remove(out)
        print(f"   wrote {os.path.relpath(final, ROOT)}")


if __name__ == "__main__":
    main()
