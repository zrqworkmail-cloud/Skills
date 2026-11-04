# -*- coding: utf-8 -*-
"""One review sheet for the four substrate look-devs.

The gate is "can you read this on a phone and does anything collide", and that
cannot be judged from four separate 1080x1920 files opened one at a time — the
comparison across shots (same lamp? same type size? two paper pages of the same
size and angle?) is the whole point. So: 4 columns x 3 frames on one sheet.

Usage: python scripts/make_contact.py build/ld4
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

CELL_W = 300
CELL_H = 533
GAP = 10
HEAD = 46
FOOT = 34

SHOTS = [
    ("LD-s05-plot", "s05 方格纸相图"),
    ("LD-s10-screen", "s10 同化大屏"),
    ("LD-s14-print", "s14 印刷年报图"),
    ("LD-s22-rack", "s22 机柜面板"),
]
FRAMES = [1, 2, 3]
FRAME_NOTE = ["起", "中", "收"]


def font(size):
    for p in (
        os.environ.get("CAPTION_FONT", "msyh.ttc"),
        "msyhbd.ttc",
        "simhei.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main(out_dir):
    W = len(SHOTS) * CELL_W + (len(SHOTS) - 1) * GAP
    H = len(FRAMES) * CELL_H + (len(FRAMES) - 1) * GAP + HEAD + FOOT
    sheet = Image.new("RGB", (W, H), (8, 11, 14))
    d = ImageDraw.Draw(sheet)
    f_big, f_small = font(26), font(20)

    for ci, (slug, label) in enumerate(SHOTS):
        x = ci * (CELL_W + GAP)
        d.text((x, 10), label, font=f_big, fill=(232, 236, 230))
        for ri, fr in enumerate(FRAMES):
            path = os.path.join(out_dir, "%s_%d.png" % (slug, fr))
            if not os.path.exists(path):
                d.text((x, HEAD + ri * (CELL_H + GAP)), "缺 " + path, font=f_small, fill=(216, 97, 76))
                continue
            im = Image.open(path).convert("RGB")
            im.thumbnail((CELL_W, CELL_H))
            y = HEAD + ri * (CELL_H + GAP)
            sheet.paste(im, (x + (CELL_W - im.width) // 2, y))
            d.text((x + 4, y + CELL_H - 26), "帧%s" % FRAME_NOTE[ri], font=f_small, fill=(200, 210, 214))

    d.text(
        (4, H - FOOT + 4),
        "每格是 1080x1920 成片等比缩小；满画质单帧在同目录 build/ld4/。",
        font=f_small,
        fill=(150, 162, 168),
    )
    out = os.path.join(out_dir, "ld4_contact.png")
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "build/ld4")
