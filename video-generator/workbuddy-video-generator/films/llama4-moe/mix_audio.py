#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""给每个镜头混音：BGM（按全片时间轴取段）+ 事件音效（与画面同一份时间轴）。

用法：python films/llama4-moe/mix_audio.py
输出：films/llama4-moe/out/av/shotNN.mp4
"""
import os
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SFX_DIR = os.path.join(ROOT, "assets", "audio", "sfx")
BGM = os.path.join(ROOT, "assets", "audio", "VibeKnowledgeBGM_20min.m4a")
REMOTION_OUT = os.path.join(ROOT, "reference", "remotion", "out")
OUT_DIR = os.path.join(ROOT, "films", "llama4-moe", "out", "av")
SR = 48000

FF = subprocess.run(
    [sys.executable, "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],
    capture_output=True, text=True,
).stdout.strip()

# (文件, 时长秒, BGM 起点秒, 音效表[(秒, 名称, 增益dB)])
SHOTS = [
    ("shot01", "sample-v7f.mp4", 10.0, 0.0, [
        (0.50, "whoosh", -17),
        (2.25, "riser", -15),
        (2.32, "whoosh", -18),
        (5.55, "shimmer", -16),
        (6.75, "impact", -10),
        (7.00, "ding", -11),
        (7.06, "pop", -18),
    ]),
    ("shot02", "shot02.mp4", 10.0, 10.0, [
        (0.30, "whoosh", -18),
        (0.95, "pop", -16),
        (1.80, "whoosh", -19),
        (2.40, "pop", -16),
        (2.90, "whoosh", -19),
        (3.10, "sink", -15),
        (4.35, "tick", -19),
        (5.00, "tick", -19),
        (6.40, "pop", -15),
        (6.55, "riser", -17),
        (8.30, "ding", -12),
        (8.95, "whoosh", -19),
    ]),
    ("shot03", "shot03.mp4", 8.0, 20.0, [
        (0.20, "whoosh", -18),
        (0.85, "pop", -16),
        (1.05, "ding", -12),
        (1.30, "whoosh", -19),
        (2.60, "pop", -16),
        (3.00, "tick", -19),
        (4.00, "whoosh", -19),
        (5.60, "pop", -15),
        (6.00, "ding", -13),
    ]),
    ("shot04", "shot04.mp4", 10.0, 28.0, [
        (0.20, "whoosh", -18),
        (0.90, "pop", -16),
        (1.15, "ding", -13),
        (1.40, "whoosh", -19),
        (2.00, "pop", -15),
        (3.00, "whoosh", -19),
        *[(4.84 + 0.2324 * i, "tick", -20) for i in range(12)],
        (7.80, "impact", -10),
        (8.10, "ding", -12),
    ]),
]


def load_wav(path):
    with wave.open(path, "rb") as w:
        n = w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float64) / 32768.0
        if w.getnchannels() == 2:
            data = data.reshape(-1, 2).mean(axis=1)
    return data


def build_sfx(cues, dur):
    total = int((dur + 2.0) * SR)
    track = np.zeros(total)
    cache = {}
    for t, name, gain_db in cues:
        if name not in cache:
            cache[name] = load_wav(os.path.join(SFX_DIR, name + ".wav"))
        s = cache[name] * (10 ** (gain_db / 20.0))
        st = int(t * SR)
        end = min(total, st + len(s))
        if st >= total:
            continue
        track[st:end] += s[: end - st]
    return track


def write_wav(path, x):
    st = np.stack([x, x], axis=1)
    pcm = np.clip(st * 32767, -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        raise SystemExit(f"ffmpeg failed: {' '.join(cmd[:6])}...")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for sid, src, dur, off, cues in SHOTS:
        src_path = os.path.join(REMOTION_OUT, src)
        if not os.path.exists(src_path):
            print(f"skip {sid}: {src} not found")
            continue
        sfx = build_sfx(cues, dur)
        sfx_path = os.path.join(OUT_DIR, f"{sid}_sfx.wav")
        write_wav(sfx_path, sfx)

        out = os.path.join(OUT_DIR, f"{sid}.mp4")
        fc = (
            f"[1:a]atrim=start={off}:duration={dur},asetpts=PTS-STARTPTS,volume=-1dB[bg];"
            f"[2:a]atrim=0:{dur},asetpts=PTS-STARTPTS,volume=-2.5dB[fx];"
            f"[bg][fx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
        )
        run([FF, "-y", "-v", "error", "-i", src_path, "-i", BGM, "-i", sfx_path,
             "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(dur), out])

        probe = subprocess.run([FF, "-hide_banner", "-i", out, "-af", "volumedetect", "-f", "null", "-"],
                               capture_output=True, text=True).stderr
        mean = [l for l in probe.splitlines() if "mean_volume" in l]
        peak = [l for l in probe.splitlines() if "max_volume" in l]
        print(f"{sid}: {mean[0].split(':')[-1].strip() if mean else '?'} / {peak[0].split(':')[-1].strip() if peak else '?'}  -> {out}")


if __name__ == "__main__":
    main()
