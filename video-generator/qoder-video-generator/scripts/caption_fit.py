# -*- coding: utf-8 -*-
"""Two-line caption layout trial: what does each authored line become?

Mirrors the rule proposed for CaptionLayer: prefer one line at >=60 px inside
the 830 px safe box; otherwise break at the punctuation nearest the middle and
re-fit; only shrink below 60 px when even a break cannot save it.
"""
import json
import math
import os
import re

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())
tl = json.load(open(os.path.join(ROOT, "spec", "beat_timeline.json"), encoding="utf-8"))

TOKEN = re.compile(r"([0-9]+(?:\.[0-9]+)?%?|[A-Za-z][A-Za-z0-9.+&-]*|[\u4e00-\u9fff]|[\s\S])")
BREAKS = "，、：；,;:"
SAFE_W = 830
MAX_FS = 66
MIN_ONE = 60


def units_of(text):
    u = 0.0
    for t in TOKEN.findall(text):
        if t.isspace():
            u += 0.34 * len(t)
        elif re.match(r"^[0-9A-Za-z]", t):
            u += 0.58 * len(t)
        else:
            u += len(t)
    return u


def fit(units, floor=44):
    return max(floor, min(MAX_FS, math.floor(SAFE_W / max(units, 1))))


def plan(text):
    one = fit(units_of(text), 1)
    if one >= MIN_ONE:
        return [text], one, "one"
    cuts = [(abs(i + 1 - len(text) / 2), i + 1) for i, c in enumerate(text) if c in BREAKS]
    if cuts:
        _, k = min(cuts)
        parts = [text[:k], text[k:]]
        u = max(units_of(p) for p in parts)
        fs = fit(u, 1)
        if fs >= MIN_ONE:
            return parts, fs, "two"
    return [text], one, "one-shrunk"


tot = 0
for L in tl["lines"]:
    parts, fs, kind = plan(L["text"])
    widths = [fs * units_of(p) for p in parts]
    tot += 1
    print(f"{L['i']:>3} {kind:>10} fs {fs:>3}  w {max(widths):>5.0f}  " + " / ".join(parts))
print()
print("two-line lines:", sum(1 for L in tl['lines'] if plan(L['text'])[2] == 'two'), "of", tot)
print("min font size:", min(plan(L['text'])[1] for L in tl['lines']))
