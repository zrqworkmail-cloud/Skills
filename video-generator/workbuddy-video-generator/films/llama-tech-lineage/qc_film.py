#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""成片质检：节奏冻结 + 空白帧 + 场景边界。

判据（技能 SKILL.md 阶段五）：
  最长连续冻结 ≤ 3.0s（全帧平均灰度差 < 0.002 记冻结）
  静止占比 > 45% 提示
  空白帧：方差过低且主色单一
"""
import subprocess
import sys

import numpy as np

FFMPEG = subprocess.run(
    [sys.executable, "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],
    capture_output=True, text=True).stdout.strip()

W, H = 270, 152
FPS = 24


def decode(path):
    cmd = [FFMPEG, "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray",
           "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    n = W * H
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, dtype=np.uint8).reshape(H, W).astype(np.float32) / 255.0
    p.stdout.close()
    p.wait()


def main(path):
    diffs, variances, means = [], [], []
    prev = None
    for fr in decode(path):
        variances.append(float(fr.var()))
        means.append(float(fr.mean()))
        diffs.append(0.0 if prev is None else float(np.abs(fr - prev).mean()))
        prev = fr

    total = len(diffs)
    dur = total / FPS
    d = np.array(diffs)
    frozen = d < 0.002

    # 最长连续冻结
    longest = cur = 0
    start = longest_start = 0
    for i, fz in enumerate(frozen):
        if fz:
            if cur == 0:
                start = i
            cur += 1
            if cur > longest:
                longest, longest_start = cur, start
        else:
            cur = 0

    print(f"总帧数 {total}，时长 {dur:.2f}s")
    print(f"最长连续冻结: {longest} 帧 = {longest / FPS:.2f}s   （判据 ≤3.0s → {'PASS' if longest / FPS <= 3.0 else 'FAIL'}）")
    print(f"  冻结起点: {longest_start / FPS:.2f}s")
    print(f"静止占比: {frozen.mean() * 100:.1f}%   （>45% 需检查）")

    # 空白帧：方差 < 0.0004 视为近乎纯色
    blank = [(i, variances[i], means[i]) for i in range(total) if variances[i] < 0.0004]
    print(f"近乎纯色帧: {len(blank)} 帧")
    for i, v, m in blank[:8]:
        print(f"  {i / FPS:7.2f}s  var={v:.6f} mean={m:.3f}")

    # 每 12s 抽一帧的方差，找异常低点
    print("每 12s 抽样方差（应 > 0.002）:")
    low = []
    for t in range(0, int(dur), 12):
        i = min(total - 1, t * FPS)
        if variances[i] < 0.002:
            low.append((t, variances[i]))
    print(f"  低方差样本: {len(low)}" + (f" → {low[:6]}" if low else " ✓"))


if __name__ == "__main__":
    main(sys.argv[1])
