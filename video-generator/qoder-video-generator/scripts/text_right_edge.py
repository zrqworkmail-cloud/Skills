# -*- coding: utf-8 -*-
"""Where does on-screen *text* end horizontally, estimated from the source.

The Douyin action rail covers roughly x>935 on a 9:16 render, so any string
that has to be read must finish before x=920. Captions are handled by
build/safezone_check.py against the actual pixels; this catches the *substrate
chrome* (ScreenPanel label/status, PaperSheet title/sub/right), which is laid
out left-anchored and grows with its copy — the v23 render had "1992.12 业务化"
running to x=1021 and the rail ate "务化".

Estimate only: CJK = 1em, Latin/digit = 0.58em, plus the declared letter-spacing.
It cannot see dynamic strings, so treat a clean report as "nothing found",
not as proof. The authoritative check is the rail-strip scan on the render.

Usage: python scripts/text_right_edge.py
"""
import os
import re
import sys

SRC = os.path.join(os.path.abspath(os.environ.get("PROJECT") or os.getcwd()), "remotion", "src")
LIMIT = 920
# Anchors are *absolute* frame pixels. components/PaperSheet and the look-dev
# sheets draw their header at 46 px inside the sheet, and ScreenPanel draws its
# label at (panel left - 34 bezel + 26 padding). So the anchor is only known once
# the call site's own x / left is read — hard-coding 46 silently under-reported
# every title by the sheet's offset (60-66 px), which is exactly the margin the
# rail cares about.
KIND = {
    # kind: (font size, offset from the enclosing substrate's x/left)
    "title": (46, 46),
    "sub": (30, 46),
    "right": (30, None),   # right-anchored: needs the sheet width, skipped
    "label": (30, -8),
    "status": (30, -8),
}
SPACING = {"label": 0.18, "status": 0.14, "title": 0.04, "sub": 0.08, "right": 0.08}
PAT = re.compile(r'(label|status|title|sub|right)\s*=\s*"([^"]+)"')
# JSX props (x={66} / left={64}) and the object literals some sheets take their
# geometry from (x: 96). A non-numeric prop like x={SHEET.x} matches nothing, so
# the guess falls back to the component default and the row is flagged "?".
XPAT = re.compile(r'\b(?:x|left)\s*=?\s*[{:]?\s*(\d+)')
# defaults of the two shared substrates when the call site passes no geometry
DEFAULT_X = {"title": 60, "sub": 60, "label": 70, "status": 70, "right": 60}


def anchor_of(body, pos, kind):
    """The nearest x=/left= before the call site, plus this kind's own offset."""
    m = None
    for cand in XPAT.finditer(body, 0, pos):
        m = cand
    guessed = m is None
    base = int(m.group(1)) if m else DEFAULT_X[kind]
    return base + KIND[kind][1], guessed


def width(text, font_size, spacing):
    total = 0.0
    for ch in text:
        total += font_size * (1.0 if ord(ch) > 0x2E80 else 0.58) + font_size * spacing
    return total


def main():
    bad = 0
    for root, _, files in os.walk(os.path.join(SRC, "scenes")):
        for fn in sorted(files):
            path = os.path.join(root, fn)
            body = open(path, encoding="utf-8").read()
            for m in PAT.finditer(body):
                kind, text = m.group(1), m.group(2)
                size, _off = KIND[kind]
                if _off is None:
                    continue
                x0, guessed = anchor_of(body, m.start(), kind)
                end = x0 + width(text, size, SPACING[kind])
                line = body[: m.start()].count("\n") + 1
                mark = "  <<< past x=%d" % LIMIT if end > LIMIT else ("  ?anchor guessed" if guessed else "")
                bad += end > LIMIT
                print("%-28s:%-4d %-6s ends x=%4d  %s%s" % (fn, line, kind, round(end), text, mark))
    print("\n%d offender(s)" % bad)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
