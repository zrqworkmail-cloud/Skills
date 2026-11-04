# -*- coding: utf-8 -*-
"""Turn content into ONE duration. Length is an output, never a target.

There is no platform slot and no shot-count input here. The film lasts as long
as its words need to be readable and its story needs to be complete. Two
sources, chosen by what exists:

  read    caption-only (no voice). Every authored line must be readable at the
          chosen rate; the plan is the sum of those times plus a settle between
          lines and any time reserved for shots that carry no caption.
  voice   narration is already recorded. The plan is the measured speech plus
          a breathing tail.

A music track, if the creator supplied one, is fitted to that content duration
by rounding UP to the next whole bar (never down, never mid-bar). If the track
cannot hold the content, this tool refuses and states the shortfall - choosing
to loop, cut, or replace the creator's music is not a machine decision.

This writes spec/duration_plan.json, which every later stage reads instead of
re-deriving the number.

Usage:
  python -X utf8 scripts/plan_duration.py --mode read --text spec/narration.txt \
      [--rate 5.5] [--settle 0.5] [--min-line 1.2] [--extra-s 21.2] \
      [--fit-music build/bgm_analysis.json]
  python -X utf8 scripts/plan_duration.py --mode voice --timing audio/narration/timing.json \
      [--tail 1.0] [--fit-music build/bgm_analysis.json]

Common options: --fps 30 --out spec/duration_plan.json --bars N (minimum to use,
never less than the content needs) --bpm (human-confirmed override)
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import re
import sys

# Same unit model as caption_fit.py: a CJK glyph is 1, an ASCII letter/digit is
# 0.58, a space 0.34. Reading speed is therefore in "caption units per second",
# not raw characters.
TOKEN = re.compile(r"([0-9]+(?:\.[0-9]+)?%?|[A-Za-z][A-Za-z0-9.+&-]*|[\u4e00-\u9fff]|[\s\S])")


def load_json(path):
    return json.load(io.open(path, encoding="utf-8"))


def units_of(text: str) -> float:
    u = 0.0
    for t in TOKEN.findall(text):
        if t.isspace():
            u += 0.34 * len(t)
        elif re.match(r"^[0-9A-Za-z]", t):
            u += 0.58 * len(t)
        else:
            u += len(t)
    return u


def read_script(path):
    lines = []
    for raw in io.open(path, encoding="utf-8").read().splitlines():
        s = raw.strip()
        if not s or s.startswith("#"):
            continue
        lines.append(s)
    return lines


def fit_music(plan, analysis_path, bpm_override, bars_min):
    ana = load_json(analysis_path)
    bpm = bpm_override or float(ana["tempo_bpm"])
    bar = 60.0 / bpm * 4
    offset = float(ana["downbeats"][0]) if ana.get("downbeats") else 0.0
    track = float(ana["duration_s"])
    capacity = int((track - offset + 1e-6) // bar)
    need = int(math.ceil((plan["content_min_s"] - offset - 1e-6) / bar))
    need = max(need, 1)
    if bars_min:
        need = max(need, bars_min)
    music = {
        "source": analysis_path,
        "tempo_bpm": round(bpm, 3),
        "bar_seconds": round(bar, 4),
        "bar_offset_s": round(offset, 4),
        "track_duration_s": round(track, 3),
        "capacity_bars": capacity,
        "bars": need,
        "fits": need <= capacity,
        "shortfall_s": round(max(0.0, offset + need * bar - track), 3),
    }
    plan["music"] = music
    if need > capacity:
        plan["error"] = (
            "music too short: content needs %d bars (%.1fs) but the track holds "
            "%d bars (%.1fs); short by %.1fs. Do not cut words to fit - extend, "
            "loop, or replace the track with the creator's approval."
            % (need, offset + need * bar, capacity, offset + capacity * bar,
               music["shortfall_s"])
        )
        return False
    plan["duration_s"] = round(offset + need * bar, 3)
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["read", "voice"])
    ap.add_argument("--text", default="spec/narration.txt")
    ap.add_argument("--timing", default="audio/narration/timing.json")
    ap.add_argument("--rate", type=float, default=5.5,
                    help="caption reading speed in units/s (hard cap 7.2)")
    ap.add_argument("--settle", type=float, default=0.5,
                    help="breath between authored lines, seconds")
    ap.add_argument("--min-line", type=float, default=1.2,
                    help="shortest time a line may stay on screen, seconds")
    ap.add_argument("--extra-s", type=float, default=0.0,
                    help="time reserved for shots that carry no caption")
    ap.add_argument("--tail", type=float, default=1.0,
                    help="voice mode: breathing tail after the last word")
    ap.add_argument("--fit-music", default=None,
                    help="optional BGM analysis; rounds UP to whole bars")
    ap.add_argument("--bars", type=int, default=0,
                    help="optional minimum bars to use (never below content need)")
    ap.add_argument("--bpm", type=float, default=None,
                    help="human-confirmed BPM override for the music grid")
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--out", default="spec/duration_plan.json")
    a = ap.parse_args()

    plan = {"mode": a.mode, "fps": a.fps, "rate_ceiling": 7.2}

    if a.mode == "read":
        lines = read_script(a.text)
        if not lines:
            print(f"no lines in {a.text}", file=sys.stderr)
            return 2
        per = [max(len_units / a.rate, a.min_line)
               for len_units in (units_of(s) for s in lines)]
        text_s = sum(per) + a.settle * (len(lines) - 1)
        content = text_s + a.extra_s
        plan.update({
            "source": a.text,
            "content": {
                "lines": len(lines),
                "units": round(sum(units_of(s) for s in lines), 1),
                "raw_chars": sum(len(s) for s in lines),
                "rate": a.rate,
                "settle_s": a.settle,
                "min_line_s": a.min_line,
                "extra_s": a.extra_s,
                "text_s": round(text_s, 3),
            },
            "content_min_s": round(content, 3),
        })
    else:
        t = load_json(a.timing)
        segs = t if isinstance(t, list) else t.get("segments", t.get("lines", []))
        total = 0.0
        for s in segs:
            if "dur" in s:
                total += float(s["dur"])
            elif "duration" in s:
                total += float(s["duration"])
            elif "start" in s and "end" in s:
                total += float(s["end"]) - float(s["start"])
        plan.update({
            "source": a.timing,
            "speech_s": round(total, 3),
            "tail_s": a.tail,
            "content_min_s": round(total + a.tail + a.extra_s, 3),
        })

    ok = True
    if a.fit_music:
        ok = fit_music(plan, a.fit_music, a.bpm, a.bars)
    else:
        plan["duration_s"] = plan["content_min_s"]

    if ok:
        plan["frames"] = int(round(plan["duration_s"] * a.fps))
        plan["duration_s_actual"] = round(plan["frames"] / a.fps, 3)
    else:
        plan["frames"] = None
        plan["duration_s_actual"] = None

    if plan["mode"] == "read":
        c = plan["content"]
        print(f"read: {c['lines']} lines / {c['raw_chars']} chars "
              f"({c['units']} units) at {c['rate']} units/s + {c['settle_s']}s settle "
              f"+ {c['extra_s']}s captionless -> {plan['content_min_s']:.3f}s")
    else:
        print(f"voice: speech {plan['speech_s']:.3f}s + tail {plan['tail_s']:.2f}s "
              f"+ extra {a.extra_s:.2f}s -> {plan['content_min_s']:.3f}s")

    if a.fit_music:
        m = plan["music"]
        print(f"music: {m['bars']} bars x {m['bar_seconds']:.4f}s "
              f"+ {m['bar_offset_s']:.3f}s offset = "
              f"{m['bar_offset_s'] + m['bars'] * m['bar_seconds']:.3f}s "
              f"(track {m['track_duration_s']:.1f}s, capacity {m['capacity_bars']} bars)")

    if not ok:
        print("REFUSE " + plan["error"], file=sys.stderr)
        print(f"  (content minimum is {plan['content_min_s']:.3f}s; no plan written)",
              file=sys.stderr)
        return 2

    print(f"duration {plan['duration_s_actual']:.3f}s = {plan['frames']} frames @ {a.fps:g}fps")
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with io.open(a.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
    print(f"  -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
