# -*- coding: utf-8 -*-
"""Synthesize narration with Kokoro-82M (offline), trim silence, and build timing."""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "audio", "narration")
os.makedirs(OUT, exist_ok=True)
VOICE = "zf_xiaoxiao"
SPEED = 1.05
GAP = 0.38          # default breath between lines
SECTION_GAP = 0.85  # used at major turns
SECTIONS = {5, 10, 12, 19, 24, 32, 35, 38}  # line numbers that start a new beat
LEAD_IN = 1.2       # opening rain / title beat
TAIL = 2.6          # closing card

def trim(y, sr, thresh_db=-45.0, head=0.10, tail=0.12):
    if y.ndim > 1:
        y = y.mean(axis=1)
    env = np.abs(y)
    thr = 10 ** (thresh_db / 20.0) * max(env.max(), 1e-6)
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return y
    a, b = idx[0], idx[-1] + 1
    y = y[a:b]
    return np.concatenate([
        np.zeros(int(head * sr), dtype=np.float32),
        y.astype(np.float32),
        np.zeros(int(tail * sr), dtype=np.float32),
    ])

def main():
    lines = [l.strip() for l in open(os.path.join(ROOT, "spec", "narration_tts.txt"), encoding="utf-8") if l.strip()]
    print("lines", len(lines))
    k = Kokoro(os.path.join(ROOT, "scripts/kokoro/kokoro-v1.0.onnx"),
               os.path.join(ROOT, "scripts/kokoro/voices-v1.0.bin"))
    chunks, timing, cursor = [], [], LEAD_IN
    if LEAD_IN:
        chunks.append(np.zeros(int(LEAD_IN * 24000), dtype=np.float32))
    for i, text in enumerate(lines, 1):
        samples, sr = k.create(text, voice=VOICE, speed=SPEED, lang="cmn")
        y = trim(np.asarray(samples), sr)
        path = os.path.join(OUT, f"line_{i:02d}.wav")
        sf.write(path, y, sr)
        dur = len(y) / sr
        gap = SECTION_GAP if i in SECTIONS else GAP
        timing.append({
            "line": i, "text": open(os.path.join(ROOT, "spec", "narration.txt"), encoding="utf-8").read().strip().split("\n")[i-1].strip(),
            "tts_text": text, "start": round(cursor, 3), "dur": round(dur, 3),
            "end": round(cursor + dur, 3), "gap_after": gap,
        })
        chunks.append(y)
        chunks.append(np.zeros(int(gap * sr), dtype=np.float32))
        cursor += dur + gap
        print(f"{i:02d} {dur:5.2f}s  start {cursor-dur-gap:6.2f}  {text[:22]}")
    total = cursor + TAIL
    if TAIL:
        chunks.append(np.zeros(int(TAIL * 24000), dtype=np.float32))
    master = np.concatenate(chunks)
    sf.write(os.path.join(ROOT, "assets", "audio", "narration_raw.wav"), master, 24000)
    sf.write(os.path.join(ROOT, "assets", "audio", "narration_48k.wav"), master, 24000,
             subtype="PCM_16")  # resample separately below
    subprocess.run([
        r"ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", os.path.join(ROOT, "assets", "audio", "narration_raw.wav"),
        "-ar", "48000", "-ac", "1", os.path.join(ROOT, "assets", "audio", "narration.wav"),
    ], check=True)
    os.remove(os.path.join(ROOT, "assets", "audio", "narration_48k.wav"))
    meta = {"voice": VOICE, "speed": SPEED, "sample_rate": 48000,
            "total_duration_s": round(total, 3), "lines": timing}
    json.dump(meta, open(os.path.join(ROOT, "assets", "audio", "timing.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print("TOTAL", round(total, 2), "s")

if __name__ == "__main__":
    main()
