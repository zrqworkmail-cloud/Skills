# -*- coding: utf-8 -*-
"""Text-zone check on still frames: caption band + Douyin action rail.

This is the method that caught what the pixel threshold in
build/safezone_check.py could not see: a 30 px muted-grey label is nowhere near
232 luma, so "越界 0" from that script was not evidence about dim substrate
chrome. Here the rail test is an *edge density* test on a >90 luma band, which
finds grey type as well as white type.

Usage: python scripts/text_zone_check.py build/ld4/*.png
"""
import sys

import numpy as np
from PIL import Image

CAPTION_TOP = 1412  # 1920 - 360 - 148, the two-line caption box (9:16)
RAIL_X = 935        # measured on the delivered render (9:16)

# A 16:9 film shown in the same feed is letterboxed full-width: the rail is the
# same 12.5 % of the screen (x >= 1680 of 1920) and the caption has to stay above
# the 980 line. The band that counts as "the film's own caption" is y >= 850.
H_CAPTION_TOP = 850
H_RAIL_X = 1680


def luma(path):
    im = Image.open(path).convert("RGB")
    # Every threshold in this file (rail x, caption top, glyph-row heights) was
    # calibrated on the 1920-long-side grid. A 4K master carries the same picture
    # at 2x, so normalise the long side back to 1920 before measuring: keep-out
    # fractions and glyph geometry are scale-invariant, the numbers are not.
    long_side = max(im.size)
    if long_side > 1920:
        k = 1920 / long_side
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    a = np.asarray(im).astype(np.int32)
    return a[:, :, 0] * 0.299 + a[:, :, 1] * 0.587 + a[:, :, 2] * 0.114


def check(path):
    y = luma(path)
    h, w = y.shape
    if h > w:
        cap_top, rail_x, scan_top = CAPTION_TOP, RAIL_X, 1200
    else:
        cap_top, rail_x, scan_top = H_CAPTION_TOP, H_RAIL_X, h // 2
    # --- the film's own caption band: near-white type in the lower half
    cap = y[scan_top:, :] > 232
    rows = np.flatnonzero(cap.any(axis=1))
    if len(rows):
        cols = np.flatnonzero(cap[rows.min():, :].any(axis=0))
        top = scan_top + rows.min()
        bottom = scan_top + rows.max()
        right = cols.max()
        cap_msg = "字幕 y %d..%d 右边缘 x%d（离底 %d）" % (top, bottom, right, h - bottom)
    else:
        cap_msg = "无字幕像素"

    # --- non-caption text that has to be read: anything bright enough to be
    #     type, sitting under the action rail
    strip = y[:, rail_x:]
    edge = (strip > 90) & (np.roll(strip, 1, axis=1) < 60)
    er = np.flatnonzero(edge.sum(axis=1) >= 2)
    if len(er):
        rail_msg = "轨道内疑似文字 行 %d..%d (%d 行, 峰值 %d 边/行)" % (
            er.min(), er.max(), len(er), edge.sum(axis=1).max())
    else:
        rail_msg = "轨道内无文字"

    # --- scene type colliding with the caption box (y >= CAPTION_TOP, not white)
    # Two traps here. The caption's own anti-aliased rim passes through 90..200
    # luma, so a plain band test reports the subtitle as collision (58 rows on a
    # clean frame). And a row that holds both caption and chrome is a real
    # collision. So: a row counts only if it carries dim strokes *and* contains
    # no near-white pixel anywhere — a pure caption row is always excluded.
    body = y[cap_top:, :rail_x]
    bright = (body > 90) & (body < 200)
    ink = bright & (np.roll(body, 1, axis=1) < 60)
    counts = ink.sum(axis=1)
    white = (body > 220).any(axis=1)
    # the caption's own topmost rim row has no >220 pixel in it (the glyph body
    # starts one row lower), so exclude everything within 4 rows of a caption row
    # 16:9 captions carry a dim English line ~35 rows under the Chinese one, so
    # the "same caption block" halo is wider there; 9:16 keeps the 9-row halo.
    k = 81 if h < w else 9
    near = np.convolve((body > 220).any(axis=1).astype(int), np.ones(k), mode="same") > 0
    flagged = (counts >= 2) & ~white & ~near
    # …and a caption caught in its exit fade has no >220 pixel anywhere, so the
    # rules above cannot see that it IS the caption. Its glyph height (60-66 px)
    # can: a dim-stroke cluster taller than 45 rows is subtitle-sized, chrome in
    # this film is capped at 38 px. Report those separately rather than as clean.
    rows = np.flatnonzero(flagged)
    clusters, start, prev = [], None, None
    for r in rows:
        if prev is None or r - prev > 6:
            if start is not None:
                clusters.append((start, prev))
            start = r
        prev = r
    if start is not None:
        clusters.append((start, prev))
    caption_like = [c for c in clusters if c[1] - c[0] + 1 >= 45]
    keep = flagged.copy()
    for a, b in caption_like:
        keep[a:b + 1] = False
    ink_rows = np.flatnonzero(keep)
    collide = "字幕带内干净" if not len(ink_rows) else "字幕带内有场景文字 %d 行" % len(ink_rows)
    if caption_like and not len(ink_rows):
        collide += "（另有 %d 行是淡出中的字幕，已排除）" % sum(b - a + 1 for a, b in caption_like)
    print("%-34s %-30s | %-28s | %s" % (path.split("/")[-1][-26:], cap_msg, rail_msg, collide))


if __name__ == "__main__":
    for p in sys.argv[1:]:
        check(p)
