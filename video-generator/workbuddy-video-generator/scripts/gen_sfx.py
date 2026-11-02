#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""合成知识类视频常用的 7 个事件音效（纯 numpy，无版权素材）。

对齐 skill：references/branch-A-code-render.md「事件音效可以纯代码合成」。
输出：assets/audio/sfx/*.wav（48kHz / 16bit / 立体声）
"""
import os
import struct
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "audio", "sfx")


def env(n, a=0.005, d=0.25, curve=2.0):
    """快速起音 + 指数衰减包络"""
    t = np.arange(n) / SR
    atk = np.clip(t / max(a, 1e-4), 0, 1)
    dec = np.exp(-t / max(d, 1e-4) * curve)
    return atk * dec


def onepole_lp(x, fc):
    """时变一阶低通；fc 可以是标量或逐样本数组"""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape)
    a = 1.0 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def onepole_hp(x, fc):
    return x - onepole_lp(x, fc)


def noise(n, seed=0):
    return np.random.default_rng(seed).normal(0, 1, n)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


# ---------------- 音效 ----------------

def tick():
    n = int(0.045 * SR)
    e = env(n, 0.001, 0.012, 3.0)
    body = np.sin(2 * np.pi * 3800 * np.arange(n) / SR) * 0.6
    click = onepole_hp(noise(n, 1), 2500) * 0.5
    return norm((body + click) * e, 0.55)


def pop():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 260 * np.exp(-t * 9) + 90  # 音高快速下滑
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * env(n, 0.002, 0.06, 2.4)
    click = onepole_hp(noise(n, 2), 3000) * env(n, 0.001, 0.01, 3) * 0.35
    return norm(body + click, 0.7)


def whoosh(dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / n
    src = noise(n, 3)
    fc = 350 + 2600 * t ** 1.6
    body = onepole_lp(src, fc)
    e = np.sin(np.pi * t) ** 1.6
    return norm(body * e, 0.75)


def sink(dur=0.55):
    """压缩/下沉：whoosh 的反向 + 低通下扫"""
    w = whoosh(dur)
    return norm(w[::-1], 0.75)


def riser(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / n
    src = noise(n, 4)
    fc = 300 + 4200 * t ** 2
    body = onepole_lp(src, fc)
    e = t ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(180 + 620 * t ** 2) / SR) * 0.25
    return norm(body * e + tone * e, 0.8)


def ding():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f, amp, dec in [(880, 1.0, 0.45), (1320, 0.55, 0.3), (1760, 0.3, 0.22), (2640, 0.15, 0.15)]:
        out += np.sin(2 * np.pi * f * t) * amp * np.exp(-t / dec)
    out *= np.clip(t / 0.003, 0, 1)
    return norm(out, 0.8)


def impact():
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    low = np.sin(2 * np.pi * (58 * np.exp(-t * 3) + 38) * t) * np.exp(-t / 0.22)
    body = onepole_lp(noise(n, 5), 900) * np.exp(-t / 0.12) * 0.6
    return norm(low + body, 0.85)


def shimmer(dur=0.75):
    n = int(dur * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(6)
    for k in range(14):
        st = int(rng.uniform(0, dur * 0.55) * SR)
        ln = min(int(0.16 * SR), n - st)
        if ln <= 0:
            continue
        tt = np.arange(ln) / SR
        f = rng.uniform(2200, 5200)
        out[st:st + ln] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.05) * 0.35
    return norm(out, 0.6)


def write_wav(path, x):
    st = np.stack([x, x], axis=1)
    pcm = np.clip(st * 32767, -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    lib = {
        "tick": tick(),
        "pop": pop(),
        "whoosh": whoosh(),
        "sink": sink(),
        "riser": riser(),
        "ding": ding(),
        "impact": impact(),
        "shimmer": shimmer(),
    }
    for name, x in lib.items():
        p = os.path.join(OUT, name + ".wav")
        write_wav(p, x)
        print(f"{name:8s} {len(x)/SR:5.2f}s  peak {np.max(np.abs(x)):.2f}")


if __name__ == "__main__":
    main()
